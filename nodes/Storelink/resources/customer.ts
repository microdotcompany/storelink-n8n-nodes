import { getManyFields, paginateByCursor } from '../shared/getMany';
import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['customer'], operation } });

const BOTH_MUST_MATCH = 'Matches customers whose email and phone both match. Map one of the two.';

export const customerDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customer'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a customer',
				description: 'Create a customer',
				routing: { request: { method: 'POST', url: '/customers' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many customers',
				description: 'Get many customers, newest first',
				routing: {
					request: { method: 'GET', url: '/customers' },
					send: { paginate: true },
					operations: { pagination: paginateByCursor },
				},
			},
		],
		default: 'create',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		displayOptions: show(['create']),
		routing: { send: { type: 'body', property: 'phone' } },
	},

	...getManyFields('customer'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: BOTH_MUST_MATCH,
				routing: { send: { type: 'query', property: 'email' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: BOTH_MUST_MATCH,
				routing: { send: { type: 'query', property: 'phone' } },
			},
		],
	},
];
