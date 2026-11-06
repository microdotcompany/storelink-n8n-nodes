import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IN8nHttpFullResponse,
	type INode,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

export const CREDENTIAL_TYPE = 'storelinkApi';

export const API_BASE_URL = '={{$credentials.serverUrl.replace(/\\/$/, "")}}/apps/v1';

export type ListPage<T = IDataObject> = { data: T[]; next_cursor: string | null };

const isObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `/apps/v1` answers an error with `{ code, message }`, and the message is written for the
 * merchant, so it becomes the error's message instead of n8n's wording for the status.
 */
export function apiError(node: INode, statusCode: number, body: unknown): NodeApiError {
	const error = isObject(body) ? body : {};
	const { code, message } = error;
	return new NodeApiError(node, error as JsonObject, {
		httpCode: String(statusCode),
		message: typeof message === 'string' ? message : undefined,
		description: typeof code === 'string' ? code : undefined,
	});
}

export async function throwApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode >= 400)
		throw apiError(this.getNode(), response.statusCode, response.body);
	return items;
}

const isBlank = (value: unknown) =>
	value === '' ||
	value === null ||
	value === undefined ||
	(typeof value === 'object' && Object.keys(value).length === 0);

/** The API rejects `""` for an optional field at any depth, and an unset n8n field is `""`. */
export function withoutBlanks<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map(withoutBlanks).filter((item) => !isBlank(item)) as T;
	}
	if (!isObject(value)) return value;
	return Object.fromEntries(
		Object.entries(value)
			.map(([key, field]) => [key, withoutBlanks(field)])
			.filter(([, field]) => !isBlank(field)),
	) as T;
}

export async function dropBlanks(
	this: IExecuteSingleFunctions,
	options: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return { ...options, body: withoutBlanks(options.body), qs: withoutBlanks(options.qs) };
}

/** For code that calls `/apps/v1` outside the declarative routing: the trigger and list searches. */
export async function storelinkApiRequest(
	this: IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	{
		body,
		qs,
		allowNotFound = false,
	}: { body?: IDataObject; qs?: IDataObject; allowNotFound?: boolean } = {},
): Promise<unknown> {
	const { serverUrl } = await this.getCredentials<{ serverUrl: string }>(CREDENTIAL_TYPE);
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_TYPE, {
		method,
		url: `${serverUrl.replace(/\/$/, '')}/apps/v1${path}`,
		body,
		qs,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as IN8nHttpFullResponse;

	if (response.statusCode === 404 && allowNotFound) return null;
	if (response.statusCode >= 400)
		throw apiError(this.getNode(), response.statusCode, response.body);
	return response.body;
}
