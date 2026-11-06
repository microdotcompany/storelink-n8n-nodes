import { couponDescription } from './resources/coupon';
import { customerDescription } from './resources/customer';
import { orderDescription } from './resources/order';
import { productDescription } from './resources/product';
import { searchProducts } from './shared/productLocator';
import { API_BASE_URL, dropBlanks, throwApiError } from './shared/transport';
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

export class Storelink implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Storelink',
		name: 'storelink',
		icon: { light: 'file:../../icons/storelink.svg', dark: 'file:../../icons/storelink.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with orders, customers, products and coupons in Storelink',
		defaults: {
			name: 'Storelink',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'storelinkApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			// So throwApiError sees each error's body. An OAuth2 credential would need 401s left to
			// n8n ({ ignore: true, except: [401] }), which refreshes the token only on a thrown 401.
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Coupon',
						value: 'coupon',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'Product',
						value: 'product',
					},
				],
				default: 'order',
				// Every request has a resource, so every request passes through these.
				routing: {
					send: { preSend: [dropBlanks] },
					output: { postReceive: [throwApiError] },
				},
			},
			...orderDescription,
			...customerDescription,
			...productDescription,
			...couponDescription,
		],
	};

	methods = {
		listSearch: {
			searchProducts,
		},
	};
}
