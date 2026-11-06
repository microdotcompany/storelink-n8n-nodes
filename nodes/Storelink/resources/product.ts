import { getManyFields, paginateByCursor } from '../shared/getMany';
import type { INodeProperties } from 'n8n-workflow';

export const productDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'Get many products',
				routing: {
					request: { method: 'GET', url: '/products' },
					send: { paginate: true },
					operations: { pagination: paginateByCursor },
				},
			},
		],
		default: 'getAll',
	},

	...getManyFields('product'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['product'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Matches products by name',
				routing: { send: { type: 'query', property: 'search' } },
			},
		],
	},
];
