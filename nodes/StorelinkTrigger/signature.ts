import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 5 * 60;

/** Standard Webhooks v1, as Storelink signs each delivery: https://www.standardwebhooks.com */
export function verifySignature(
	secret: string | undefined,
	headers: Record<string, string | string[] | undefined>,
	rawBody: Buffer | undefined,
): boolean {
	const id = headers['webhook-id'];
	const timestamp = headers['webhook-timestamp'];
	const signatures = headers['webhook-signature'];
	if (
		!secret ||
		!rawBody ||
		typeof id !== 'string' ||
		typeof timestamp !== 'string' ||
		typeof signatures !== 'string'
	) {
		return false;
	}

	const sentAt = Number(timestamp);
	if (!Number.isInteger(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > TOLERANCE_SECONDS) {
		return false;
	}

	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(rawBody).digest();

	return signatures.split(' ').some((entry) => {
		const [version, signature] = entry.split(',');
		if (version !== 'v1' || !signature) return false;
		const given = Buffer.from(signature, 'base64');
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
}
