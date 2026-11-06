import { StorelinkTrigger } from '../nodes/StorelinkTrigger/StorelinkTrigger.node';
import { HOOK, HOOK_SECRET, REFERENCE_DELIVERY, SIGNED_DELIVERY, WEBHOOK_URL } from './fixtures';
import { credentialsContext, fakeApi } from './helpers';
import { NodeApiError, type IHookFunctions, type IWebhookFunctions } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { checkExists, create, delete: deleteHook } = new StorelinkTrigger().webhookMethods.default;

const hookContext = (
	api: ReturnType<typeof fakeApi>,
	{ staticData = {}, event = 'order.created' }: { staticData?: object; event?: string } = {},
) =>
	({
		...credentialsContext(api),
		getWorkflowStaticData: () => staticData,
		getNodeWebhookUrl: () => WEBHOOK_URL,
		getNodeParameter: (name: string) => ({ event })[name],
	}) as unknown as IHookFunctions;

const HOOK_PATH = `/hooks/${HOOK.id}`;

describe('checkExists', () => {
	test('is false without a stored hook, and asks nothing', async () => {
		const api = fakeApi({});
		expect(await checkExists.call(hookContext(api))).toBe(false);
		expect(api.calls).toEqual([]);
	});

	test('is true when the stored hook has this webhook URL and event', async () => {
		const api = fakeApi({ [`GET ${HOOK_PATH}`]: { statusCode: 200, body: HOOK } });
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		expect(await checkExists.call(hookContext(api, { staticData }))).toBe(true);
		expect(staticData).toEqual({ hookId: HOOK.id, secret: HOOK_SECRET });
	});

	test.each([
		['the event', { event: 'customer.created' }, HOOK],
		['the webhook URL', {}, { ...HOOK, target_url: 'https://old.example.com/webhook/x' }],
	])('deletes the hook and forgets it when %s changed', async (_, options, stored) => {
		const api = fakeApi({
			[`GET ${HOOK_PATH}`]: { statusCode: 200, body: stored },
			[`DELETE ${HOOK_PATH}`]: { statusCode: 204 },
		});
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		expect(await checkExists.call(hookContext(api, { ...options, staticData }))).toBe(false);
		expect(api.calls.map(({ route }) => route)).toEqual([
			`GET ${HOOK_PATH}`,
			`DELETE ${HOOK_PATH}`,
		]);
		expect(staticData).toEqual({});
	});

	test('forgets a hook the server no longer has', async () => {
		const api = fakeApi({
			[`GET ${HOOK_PATH}`]: {
				statusCode: 404,
				body: { code: 'not_found', message: 'No such hook' },
			},
		});
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		expect(await checkExists.call(hookContext(api, { staticData }))).toBe(false);
		expect(api.calls).toHaveLength(1);
		expect(staticData).toEqual({});
	});

	test("shows the server's message when the key no longer works", async () => {
		const message =
			"This API key isn't valid. It may have been regenerated or revoked. Create a new one on the store's Settings > Integrations page in Storelink.";
		const api = fakeApi({
			[`GET ${HOOK_PATH}`]: { statusCode: 401, body: { code: 'unauthorized', message } },
		});
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		const error = await checkExists.call(hookContext(api, { staticData })).catch((e) => e);
		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message, description: 'unauthorized', httpCode: '401' });
		expect(staticData).toEqual({ hookId: HOOK.id, secret: HOOK_SECRET });
	});
});

describe('create', () => {
	test('subscribes the webhook URL to the event, then stores the hook and its secret', async () => {
		const api = fakeApi({
			'POST /hooks': { statusCode: 201, body: HOOK },
			[`POST ${HOOK_PATH}/secret`]: { statusCode: 200, body: { secret: HOOK_SECRET } },
		});
		const staticData = {};

		expect(await create.call(hookContext(api, { staticData }))).toBe(true);
		expect(api.calls).toEqual([
			{ route: 'POST /hooks', body: { event: 'order.created', target_url: WEBHOOK_URL } },
			{ route: `POST ${HOOK_PATH}/secret` },
		]);
		expect(staticData).toEqual({ hookId: HOOK.id, secret: HOOK_SECRET });
	});

	test("fails activation with the server's message and stores nothing", async () => {
		const message = 'target_url must be a public https URL';
		const api = fakeApi({
			'POST /hooks': { statusCode: 400, body: { code: 'invalid_input', message } },
		});
		const staticData = {};

		await expect(create.call(hookContext(api, { staticData }))).rejects.toMatchObject({
			message,
			httpCode: '400',
		});
		expect(staticData).toEqual({});
	});
});

describe('delete', () => {
	test('unsubscribes the stored hook and forgets it', async () => {
		const api = fakeApi({ [`DELETE ${HOOK_PATH}`]: { statusCode: 204 } });
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		expect(await deleteHook.call(hookContext(api, { staticData }))).toBe(true);
		expect(api.calls.map(({ route }) => route)).toEqual([`DELETE ${HOOK_PATH}`]);
		expect(staticData).toEqual({});
	});

	test('tolerates a hook that is already gone', async () => {
		const api = fakeApi({
			[`DELETE ${HOOK_PATH}`]: {
				statusCode: 404,
				body: { code: 'not_found', message: 'Not found' },
			},
		});
		const staticData = { hookId: HOOK.id, secret: HOOK_SECRET };

		expect(await deleteHook.call(hookContext(api, { staticData }))).toBe(true);
		expect(staticData).toEqual({});
	});

	test('asks nothing without a stored hook', async () => {
		const api = fakeApi({});
		expect(await deleteHook.call(hookContext(api))).toBe(true);
		expect(api.calls).toEqual([]);
	});
});

describe('webhook', () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: SIGNED_DELIVERY.timestamp * 1000 });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	const deliver = async ({
		staticData = { hookId: HOOK.id, secret: HOOK_SECRET } as object,
		body = SIGNED_DELIVERY.body,
	} = {}) => {
		const response = { status: vi.fn(), send: vi.fn(), end: vi.fn() };
		response.status.mockReturnValue(response);
		response.send.mockReturnValue(response);
		const context = {
			getWorkflowStaticData: () => staticData,
			getRequestObject: () => ({
				headers: SIGNED_DELIVERY.headers,
				rawBody: Buffer.from(body),
			}),
			getResponseObject: () => response,
			getBodyData: () => JSON.parse(body),
		} as unknown as IWebhookFunctions;
		return { result: await new StorelinkTrigger().webhook.call(context), response };
	};

	test('starts the workflow with the envelope, unchanged', async () => {
		const { result, response } = await deliver();
		expect(result).toEqual({ workflowData: [[{ json: JSON.parse(SIGNED_DELIVERY.body) }]] });
		expect(response.status).not.toHaveBeenCalled();
	});

	test.each([
		['a tampered body', { body: SIGNED_DELIVERY.body.replace('59.5', '0.5') }],
		['another secret', { staticData: { hookId: HOOK.id, secret: REFERENCE_DELIVERY.secret } }],
		['no stored secret', { staticData: { hookId: HOOK.id } }],
	])('answers 401 and starts nothing for %s', async (_, options) => {
		const { result, response } = await deliver(options);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(401);
		expect(response.end).toHaveBeenCalled();
	});

	test('answers 401 for a delivery signed more than 5 minutes ago', async () => {
		vi.setSystemTime((SIGNED_DELIVERY.timestamp + 5 * 60 + 1) * 1000);
		const { result, response } = await deliver();
		expect(result).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(401);
	});
});
