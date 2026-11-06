import { productLocator } from '../shared/productLocator';
import type { INodeProperties } from 'n8n-workflow';

const show = (extra: Record<string, string[]> = {}) => ({
	show: { resource: ['coupon'], operation: ['create'], ...extra },
});

// A date picker value has no offset, and the API wants one; this reads it in the workflow's time zone.
const WITH_OFFSET = '={{ DateTime.fromISO($value).toISO() ?? $value }}';

export const couponDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['coupon'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a coupon',
				description: 'Create a coupon for the whole order or for specific products',
				routing: { request: { method: 'POST', url: '/coupons' } },
			},
		],
		default: 'create',
	},

	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(),
		routing: { send: { type: 'body', property: 'code' } },
	},
	{
		displayName: 'Applies To',
		name: 'appliesTo',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Specific Products',
				value: 'products',
				routing: { request: { body: { type: 'amountOffProduct', appliesTo: 'products' } } },
			},
			{
				name: 'The Whole Order',
				value: 'order',
				routing: { request: { body: { type: 'amountOffOrder' } } },
			},
		],
		default: 'order',
		displayOptions: show(),
	},
	{
		displayName: 'Products',
		name: 'products',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Product',
		required: true,
		default: {},
		displayOptions: show({ appliesTo: ['products'] }),
		options: [
			{
				displayName: 'Product',
				name: 'product',
				values: [productLocator('=targets[{{$index}}].slug')],
			},
		],
	},
	{
		displayName: 'Discount Type',
		name: 'discountType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Flat Amount', value: 'flat' },
			{ name: 'Percentage', value: 'percentage' },
		],
		default: 'percentage',
		displayOptions: show(),
		routing: { send: { type: 'body', property: 'discountType' } },
	},
	{
		displayName: 'Discount Amount',
		name: 'discountAmount',
		type: 'number',
		required: true,
		typeOptions: { minValue: 0 },
		default: 0,
		displayOptions: show(),
		routing: { send: { type: 'body', property: 'discountAmount' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(),
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether customers can use the coupon',
				routing: { send: { type: 'body', property: 'enabled' } },
			},
			{
				displayName: 'Maximum Discount Amount',
				name: 'maxDiscountAmount',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				routing: { send: { type: 'body', property: 'maxDiscountAmount' } },
			},
			{
				displayName: 'Minimum Order Amount',
				name: 'minOrderAmount',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				routing: { send: { type: 'body', property: 'minOrderAmount' } },
			},
			{
				displayName: 'Uses Per Customer',
				name: 'usePerCustomer',
				type: 'options',
				options: [
					{ name: 'Once', value: 'once' },
					{ name: 'Unlimited', value: 'unlimited' },
				],
				default: 'once',
				routing: { send: { type: 'body', property: 'usePerCustomer' } },
			},
			{
				displayName: 'Valid From',
				name: 'validFrom',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'body', property: 'validFrom', value: WITH_OFFSET } },
			},
			{
				displayName: 'Valid Till',
				name: 'validTill',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'body', property: 'validTill', value: WITH_OFFSET } },
			},
		],
	},
];
