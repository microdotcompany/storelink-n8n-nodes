import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { vi } from 'vitest';

export const SERVER_URL = 'https://dashboard.store.link';

export const NODE = {
	id: 'node-1',
	name: 'Storelink',
	type: 'n8n-nodes-storelink.storelink',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
};

type Reply = { statusCode: number; body?: unknown };

/**
 * Stands in for `/apps/v1` behind `httpRequestWithAuthentication`. Each route is
 * `'<METHOD> <path>'`, and a call to a route it doesn't know fails the test.
 */
export const fakeApi = (routes: Record<string, Reply>) => {
	const calls: Array<{ route: string; body?: IDataObject; qs?: IDataObject }> = [];
	const httpRequestWithAuthentication = vi.fn(
		async (credentialType: string, options: IHttpRequestOptions) => {
			if (credentialType !== 'storelinkApi') throw new Error(`credential ${credentialType}`);
			const route = `${options.method} ${options.url.replace(`${SERVER_URL}/apps/v1`, '')}`;
			calls.push({
				route,
				body: options.body as IDataObject | undefined,
				qs: options.qs as IDataObject | undefined,
			});
			const reply = routes[route];
			if (!reply) throw new Error(`unexpected request ${route}`);
			return { statusCode: reply.statusCode, body: reply.body ?? '', headers: {} };
		},
	);
	return { calls, httpRequestWithAuthentication };
};

export const credentialsContext = (api: ReturnType<typeof fakeApi>) => ({
	getNode: () => NODE,
	getCredentials: async () => ({ apiKey: 'sl_key_test', serverUrl: `${SERVER_URL}/` }),
	helpers: { httpRequestWithAuthentication: api.httpRequestWithAuthentication },
});
