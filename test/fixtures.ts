// Shapes that storelink-dashboard's server/src/modules/apps-api/apps-api.contract.test.js pins for
// /apps/v1. When a v1 response gains a field, add it here too. signing-vectors.json is a copy of
// that repo's common/integrations/contract/signing-vectors.json.

import signingVectors from './signing-vectors.json';

const vector = (name: string) => signingVectors.vectors.find((v) => v.name === name)!;

export const ORDER = {
	order_id: '6724a1f0c2b5e8a1d4f3b2c1',
	number: 10001,
	date: '2026-11-01T10:15:00.000Z',
	status: 'pending',
	customer: 'Ann',
	total: 57.2,
	currency: 'USD',
	item_count: 2,
	payment_method: 'cash',
	customer_details: {
		date: '2026-11-01T10:15:00.000Z',
		referenceNo: '',
		shipping: 'Standard',
		coupon: 'SAVE10',
		address: '1 Main St',
		zipCode: '10001',
		name: 'Ann',
		email: 'ann@x.com',
		number: '+15551234567',
	},
	items: [
		{ name: 'Tee', variant: 'Size - M', qty: 2, price: 18, total: 36 },
		{ name: 'Tee', variant: 'Size - L', qty: 1, price: 22, total: 22 },
	],
	subtotal: 58,
	shipping: 5,
	discount: 5.8,
	coupon_code: 'save10',
	shipping_method: 'Standard',
	timeline: [
		{ title: 'Packed', note: 'Gift wrapped', status: 'pending', date: '2026-11-01T10:20:00.000Z' },
		{ title: 'Order Pending', status: 'pending', date: '2026-11-01T10:15:00.000Z' },
	],
};

export const PRODUCT = {
	slug: 'tee',
	url: 'https://acme.store.link/product/tee',
	name: 'Tee',
	categories: ['Shirts'],
	hidden: false,
	variant_count: 2,
	price_range: [18, 22],
	currency: 'USD',
	variants: [
		{
			key: 'm',
			options: { size: 'M' },
			price: 20,
			discounted_price: 18,
			stock: 10,
			availability: 'Show',
			hidden: false,
			images: ['https://img.test/tee-m.png'],
			description: 'Soft cotton',
			properties: { tags: 'summer, cotton' },
		},
		{
			key: 'l',
			options: { size: 'L' },
			price: 22,
			discounted_price: null,
			stock: 0,
			hidden: false,
			properties: {},
		},
	],
};

export const WEBHOOK_URL =
	'https://n8n.example.com/webhook/7d1f2c3b-4a5e-6f70-8192-a3b4c5d6e7f8/webhook';

export const HOOK = {
	id: 'hook_9a8b7c6d5e4f30211203f4e5d6c7b8a9',
	event: 'order.created',
	target_url: WEBHOOK_URL,
};

/** A Storelink delivery of `order.status_changed`. */
export const SIGNED_DELIVERY = vector('hook-order-status-changed');

/** The vector the Standard Webhooks spec publishes. */
export const REFERENCE_DELIVERY = vector('standard-webhooks-reference');

export const HOOK_SECRET = SIGNED_DELIVERY.secret;
