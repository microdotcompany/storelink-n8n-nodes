import { paginateByCursor } from '../nodes/Storelink/shared/getMany';
import { ORDER } from './fixtures';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
} from 'n8n-workflow';
import { describe, expect, test, vi } from 'vitest';

const orders = (count: number, from = 0) =>
	Array.from({ length: count }, (_, i) => ({ ...ORDER, number: 10001 + from + i }));

/** Answers each request with the next page, as `/apps/v1` returns them. */
const paginate = async (
	parameters: { returnAll?: boolean; limit?: number },
	pages: Array<{ data: IDataObject[]; next_cursor: string | null }>,
) => {
	const makeRoutingRequest = vi.fn(async () => [{ json: pages.shift() as unknown as IDataObject }]);
	const context = {
		getNodeParameter: (name: string, fallback: unknown) =>
			(parameters as Record<string, unknown>)[name] ?? fallback,
		makeRoutingRequest,
	} as unknown as IExecutePaginationFunctions;
	const requestData = {
		options: { method: 'GET', url: '/orders', qs: { status: 'pending' } },
		preSend: [],
		postReceive: [],
		requestOperations: {},
	} as unknown as DeclarativeRestApiSettings.ResultOptions;

	const items = await paginateByCursor.call(context, requestData);
	const queries = makeRoutingRequest.mock.calls.map(
		(call) => (call as unknown[] as [DeclarativeRestApiSettings.ResultOptions])[0].options.qs,
	);
	return { items, queries };
};

describe('paginateByCursor', () => {
	test('with Return All, follows next_cursor 50 at a time until it runs out', async () => {
		const { items, queries } = await paginate({ returnAll: true }, [
			{ data: orders(50), next_cursor: 'c1' },
			{ data: orders(50, 50), next_cursor: 'c2' },
			{ data: orders(3, 100), next_cursor: null },
		]);

		expect(items.map(({ json }) => json.number)).toEqual(orders(103).map(({ number }) => number));
		expect(queries).toEqual([
			{ status: 'pending', limit: 50 },
			{ status: 'pending', limit: 50, cursor: 'c1' },
			{ status: 'pending', limit: 50, cursor: 'c2' },
		]);
	});

	test('asks for only what Limit still needs, and stops at it', async () => {
		const { items, queries } = await paginate({ returnAll: false, limit: 70 }, [
			{ data: orders(50), next_cursor: 'c1' },
			{ data: orders(20, 50), next_cursor: 'c2' },
		]);

		expect(items).toHaveLength(70);
		expect(queries).toEqual([
			{ status: 'pending', limit: 50 },
			{ status: 'pending', limit: 20, cursor: 'c1' },
		]);
	});

	test('makes one request when Limit fits in a page', async () => {
		const { items, queries } = await paginate({ limit: 5 }, [
			{ data: orders(5), next_cursor: 'c1' },
		]);

		expect(items).toHaveLength(5);
		expect(queries).toEqual([{ status: 'pending', limit: 5 }]);
	});

	test('stops at the last page before reaching Limit', async () => {
		const { items, queries } = await paginate({ limit: 50 }, [
			{ data: orders(2), next_cursor: null },
		]);

		expect(items.map(({ json }) => json)).toEqual(orders(2));
		expect(queries).toHaveLength(1);
	});
});
