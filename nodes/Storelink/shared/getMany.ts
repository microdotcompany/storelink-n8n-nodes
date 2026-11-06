import type { ListPage } from './transport';
import type {
	DeclarativeRestApiSettings,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

const PAGE_SIZE = 50;

/** Every Get Many paginates through here, so Limit can exceed one page of `/apps/v1`. */
export async function paginateByCursor(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', 50) as number);
	// Products page by number, with the offset taken from the page size, so the size can't change
	// between pages. The last page may overshoot Limit, and the surplus is dropped.
	const pageSize = Math.min(PAGE_SIZE, limit);
	const items: INodeExecutionData[] = [];
	let cursor: string | null = null;

	do {
		const [{ json }] = await this.makeRoutingRequest({
			...requestData,
			options: {
				...requestData.options,
				qs: { ...requestData.options.qs, limit: pageSize, ...(cursor && { cursor }) },
			},
		});
		const page = json as unknown as ListPage;
		items.push(...page.data.map((row) => ({ json: row })));
		cursor = page.next_cursor;
	} while (cursor && items.length < limit);

	return items.slice(0, limit);
}

export const getManyFields = (resource: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: [resource], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: [resource], operation: ['getAll'], returnAll: [false] } },
	},
];
