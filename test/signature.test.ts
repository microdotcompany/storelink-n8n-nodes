import { verifySignature } from '../nodes/StorelinkTrigger/signature';
import { REFERENCE_DELIVERY, SIGNED_DELIVERY } from './fixtures';
import { afterEach, describe, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.useRealTimers();
});

const verify = (
	delivery: typeof SIGNED_DELIVERY,
	{
		secret = delivery.secret,
		headers = {},
		body = delivery.body,
		now = delivery.timestamp,
	}: { secret?: string; headers?: Record<string, string>; body?: string; now?: number } = {},
) => {
	vi.useFakeTimers({ now: now * 1000 });
	return verifySignature(secret, { ...delivery.headers, ...headers }, Buffer.from(body));
};

describe('verifySignature', () => {
	test.each([
		['a Storelink delivery', SIGNED_DELIVERY],
		["the Standard Webhooks spec's vector", REFERENCE_DELIVERY],
	])('accepts %s', (_, delivery) => {
		expect(verify(delivery)).toBe(true);
	});

	test('accepts a matching signature among several', () => {
		const signature = SIGNED_DELIVERY.headers['webhook-signature'];
		const headers = { 'webhook-signature': `v1,c29tZXRoaW5nIGVsc2U= ${signature}` };
		expect(verify(SIGNED_DELIVERY, { headers })).toBe(true);
	});

	test('accepts a timestamp within 5 minutes either way', () => {
		const { timestamp } = SIGNED_DELIVERY;
		expect(verify(SIGNED_DELIVERY, { now: timestamp + 5 * 60 })).toBe(true);
		expect(verify(SIGNED_DELIVERY, { now: timestamp - 5 * 60 })).toBe(true);
	});

	test.each([
		['a tampered body', { body: SIGNED_DELIVERY.body.replace('shipped', 'cancelled') }],
		['a tampered webhook-id', { headers: { 'webhook-id': 'evt_other_hook_other' } }],
		['another secret', { secret: REFERENCE_DELIVERY.secret }],
		['a stale timestamp', { now: SIGNED_DELIVERY.timestamp + 5 * 60 + 1 }],
		['a timestamp from the future', { now: SIGNED_DELIVERY.timestamp - 5 * 60 - 1 }],
		[
			'a signature of another version',
			{ headers: { 'webhook-signature': 'v2,sXFMAy4mPTL3PgW7KRFQ9YhLv7AtRrvS79ACS3ogBxI=' } },
		],
		['a truncated signature', { headers: { 'webhook-signature': 'v1,sXFMAy4mPTL3PgW7' } }],
		['an empty secret', { secret: '' }],
	])('rejects %s', (_, options) => {
		expect(verify(SIGNED_DELIVERY, options)).toBe(false);
	});

	test('rejects a delivery without the signing headers', () => {
		expect(verifySignature(SIGNED_DELIVERY.secret, {}, Buffer.from(SIGNED_DELIVERY.body))).toBe(
			false,
		);
	});
});
