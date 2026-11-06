import { storelinkApiRequest, type ListPage } from './transport';
import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

type Product = { slug: string; name: string; url: string };

export async function searchProducts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = (await storelinkApiRequest.call(this, 'GET', '/products', {
		qs: { search: filter || undefined, cursor: paginationToken, limit: 50 },
	})) as ListPage<Product>;
	return {
		results: page.data.map(({ name, slug, url }) => ({ name, value: slug, url })),
		paginationToken: page.next_cursor ?? undefined,
	};
}

/**
 * A product by its slug, as `/apps/v1` keys products: a Product Sheet sync replaces product ids.
 * `bodyProperty` is where the slug goes in the request body.
 */
export const productLocator = (bodyProperty: string): INodeProperties => ({
	displayName: 'Product',
	name: 'product',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchProducts', searchable: true },
		},
		{
			displayName: 'By Slug',
			name: 'slug',
			type: 'string',
			placeholder: 'e.g. classic-tee',
		},
	],
	routing: { send: { type: 'body', property: bodyProperty } },
});
