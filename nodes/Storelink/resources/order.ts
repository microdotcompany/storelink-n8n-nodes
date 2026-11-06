import { getManyFields, paginateByCursor } from '../shared/getMany';
import { productLocator } from '../shared/productLocator';
import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['order'], operation } });

const ORDER_URL = '=/orders/{{ encodeURIComponent($parameter.orderId) }}';

const STATUSES = [
	{ name: 'Cancelled', value: 'cancelled' },
	{ name: 'Completed', value: 'completed' },
	{ name: 'Pending', value: 'pending' },
	{ name: 'Shipped', value: 'shipped' },
];

export const orderDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['order'] } },
		options: [
			{
				name: 'Add Note',
				value: 'addNote',
				action: 'Add a note to an order',
				description: "Add a note to an order's timeline",
				routing: { request: { method: 'POST', url: `${ORDER_URL}/notes` } },
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create an order',
				description: 'Create an order',
				routing: { request: { method: 'POST', url: '/orders' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an order',
				description: 'Get an order',
				routing: { request: { method: 'GET', url: ORDER_URL } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many orders',
				description: 'Get many orders, newest first',
				routing: {
					request: { method: 'GET', url: '/orders' },
					send: { paginate: true },
					operations: { pagination: paginateByCursor },
				},
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				action: 'Update the status of an order',
				description: "Change an order's status",
				routing: { request: { method: 'POST', url: `${ORDER_URL}/status` } },
			},
		],
		default: 'create',
	},

	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		default: '',
		description: 'The Order ID from a Storelink Trigger or an earlier Storelink step',
		displayOptions: show(['addNote', 'get', 'updateStatus']),
	},

	{
		displayName: 'Line Items',
		name: 'lineItems',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Line Item',
		required: true,
		default: {},
		displayOptions: show(['create']),
		options: [
			{
				displayName: 'Line Item',
				name: 'lineItem',
				values: [
					productLocator('=items[{{$index}}].slug'),
					{
						displayName: 'Variant Key',
						name: 'variantKey',
						type: 'string',
						default: '',
						description:
							"The variant's key, from Get Many Products. Leave empty for a product with one variant.",
						routing: { send: { type: 'body', property: '=items[{{$index}}].variant_key' } },
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						routing: { send: { type: 'body', property: '=items[{{$index}}].qty' } },
					},
				],
			},
		],
	},
	{
		displayName: 'Customer Name',
		name: 'customerName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'customer.name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'address' } },
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'coupon_code' } },
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'customer.email' } },
			},
			{
				displayName: 'Customer Phone',
				name: 'customerPhone',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'customer.phone' } },
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description:
					"Map a unique ID from an earlier step, such as a form response ID, so a retried run doesn't create a second order",
				routing: { send: { type: 'body', property: 'reference' } },
			},
			{
				displayName: 'Shipping Method',
				name: 'shippingMethod',
				type: 'string',
				default: '',
				description: "The shipping method's name as checkout shows it",
				routing: { send: { type: 'body', property: 'shipping_method' } },
			},
			{
				displayName: 'Zip Code',
				name: 'zipCode',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'zip_code' } },
			},
		],
	},

	...getManyFields('order'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{
				displayName: 'Customer Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Matches the whole address',
				routing: { send: { type: 'query', property: 'email' } },
			},
			{
				displayName: 'Order Number',
				name: 'number',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'number' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: STATUSES,
				default: 'pending',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},

	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		options: STATUSES,
		default: 'shipped',
		displayOptions: show(['updateStatus']),
		routing: { send: { type: 'body', property: 'status' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['updateStatus']),
		options: [
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: "Added to the order's timeline with the status change",
				routing: { send: { type: 'body', property: 'note' } },
			},
		],
	},

	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: show(['addNote']),
		routing: { send: { type: 'body', property: 'note' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['addNote']),
		options: [
			{
				displayName: 'Notify Customer',
				name: 'notifyCustomer',
				type: 'boolean',
				default: false,
				description: 'Whether to email the note to the customer',
				routing: { send: { type: 'body', property: 'notify_customer' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'title' } },
			},
		],
	},
];
