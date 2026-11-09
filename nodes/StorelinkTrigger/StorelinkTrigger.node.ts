import { storelinkApiRequest } from '../Storelink/shared/transport';
import { verifySignature } from './signature';
import {
	NodeConnectionTypes,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

type Hook = { id: string; event: string; target_url: string };

type HookData = { hookId?: string; secret?: string };

export class StorelinkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Storelink Trigger',
		name: 'storelinkTrigger',
		icon: { light: 'file:../../icons/storelink.svg', dark: 'file:../../icons/storelink.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when an order or customer event happens in Storelink',
		defaults: {
			name: 'Storelink Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'storelinkApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'New Customer',
						value: 'customer.created',
						description: 'Triggers when a new customer is added',
					},
					{
						name: 'New Order',
						value: 'order.created',
						description: 'Triggers when a new order is placed',
					},
					{
						name: 'Order Status Changed',
						value: 'order.status_changed',
						description: "Triggers when an order's status changes",
					},
				],
				default: 'order.created',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const hookData = this.getWorkflowStaticData('node') as HookData;
				if (hookData.hookId === undefined) return false;

				const path = `/hooks/${hookData.hookId}`;
				const hook = (await storelinkApiRequest.call(this, 'GET', path, {
					allowNotFound: true,
				})) as Hook | null;
				if (
					hook &&
					hook.target_url === this.getNodeWebhookUrl('default') &&
					hook.event === this.getNodeParameter('event')
				) {
					return true;
				}
				// The event or the webhook URL changed since the hook was created.
				if (hook) await storelinkApiRequest.call(this, 'DELETE', path, { allowNotFound: true });
				delete hookData.hookId;
				delete hookData.secret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				// Subscribing the same event and URL again answers with the same hook, so an id lost
				// between these two calls is recovered on the next activation.
				const hook = (await storelinkApiRequest.call(this, 'POST', '/hooks', {
					body: {
						event: this.getNodeParameter('event') as string,
						target_url: this.getNodeWebhookUrl('default') as string,
					},
				})) as Hook;
				const { secret } = (await storelinkApiRequest.call(
					this,
					'POST',
					`/hooks/${hook.id}/secret`,
				)) as { secret: string };
				Object.assign(this.getWorkflowStaticData('node'), { hookId: hook.id, secret });
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const hookData = this.getWorkflowStaticData('node') as HookData;
				if (hookData.hookId !== undefined) {
					await storelinkApiRequest.call(this, 'DELETE', `/hooks/${hookData.hookId}`, {
						allowNotFound: true,
					});
				}
				delete hookData.hookId;
				delete hookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { secret } = this.getWorkflowStaticData('node') as HookData;
		const request = this.getRequestObject();
		if (!verifySignature(secret, request.headers, request.rawBody)) {
			this.getResponseObject().status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}
		return { workflowData: [[{ json: this.getBodyData() }]] };
	}
}
