import { searchProducts } from '../nodes/Storelink/shared/productLocator';
import { dropBlanks, throwApiError } from '../nodes/Storelink/shared/transport';
import { ORDER, PRODUCT } from './fixtures';
import { credentialsContext, fakeApi, NODE } from './helpers';
import {
	NodeApiError,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IN8nHttpFullResponse,
} from 'n8n-workflow';
import { describe, expect, test } from 'vitest';

const singleContext = { getNode: () => NODE } as unknown as IExecuteSingleFunctions;

describe('throwApiError', () => {
	const respond = (statusCode: number, body: unknown) =>
		throwApiError.call(singleContext, [{ json: {} }], {
			statusCode,
			body,
			headers: {},
		} as IN8nHttpFullResponse);

	test('passes a success through', async () => {
		expect(await respond(200, ORDER)).toEqual([{ json: {} }]);
	});

	test.each([
		[
			403,
			'plan_upgrade_required',
			'Coupons need the Lite plan or higher. Upgrade the store to use this.',
		],
		[
			401,
			'unauthorized',
			"This API key no longer works. Create a new one on the store's Settings > Integrations page in Storelink.",
		],
		[429, 'rate_limited', 'Too many requests. Try again in a minute.'],
	])("makes a %i the server's message, with its code", async (statusCode, code, message) => {
		const error = await respond(statusCode, { code, message }).catch((e) => e);
		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message, description: code, httpCode: String(statusCode) });
	});

	test("falls back to n8n's wording for a body that isn't an /apps/v1 error", async () => {
		const error = await respond(502, '<html>Bad gateway</html>').catch((e) => e);
		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.httpCode).toBe('502');
		expect(error.message).toMatch(/bad gateway/i);
	});
});

describe('dropBlanks', () => {
	test('leaves out empty optional fields at any depth and keeps false and 0', async () => {
		const options = await dropBlanks.call(singleContext, {
			url: '/orders',
			body: {
				items: [
					{ slug: 'tee', variant_key: '', qty: 2 },
					{ slug: 'mug', variant_key: 'mug', qty: 1 },
				],
				customer: { name: 'Ann', email: '', phone: '' },
				coupon_code: '',
				notify_customer: false,
				discountAmount: 0,
			},
			qs: { email: '', status: 'pending' },
		} as IHttpRequestOptions);

		expect(options.body).toEqual({
			items: [
				{ slug: 'tee', qty: 2 },
				{ slug: 'mug', variant_key: 'mug', qty: 1 },
			],
			customer: { name: 'Ann' },
			notify_customer: false,
			discountAmount: 0,
		});
		expect(options.qs).toEqual({ status: 'pending' });
	});
});

describe('searchProducts', () => {
	test('lists products by slug and pages with next_cursor', async () => {
		const api = fakeApi({
			'GET /products': { statusCode: 200, body: { data: [PRODUCT], next_cursor: 'c1' } },
		});
		const context = credentialsContext(api) as unknown as ILoadOptionsFunctions;

		expect(await searchProducts.call(context, 'tee', 'c0')).toEqual({
			results: [{ name: 'Tee', value: 'tee', url: 'https://acme.store.link/product/tee' }],
			paginationToken: 'c1',
		});
		expect(api.calls).toEqual([
			{ route: 'GET /products', qs: { search: 'tee', cursor: 'c0', limit: 50 } },
		]);
	});
});
