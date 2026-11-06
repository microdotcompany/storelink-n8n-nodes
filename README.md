# n8n-nodes-storelink

This is an n8n community node. It lets you use Storelink in your n8n workflows.

[Storelink](https://store.link) runs online stores whose products live in a Google Sheet.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-storelink`.

## Operations

**Storelink Trigger** starts a workflow when one of these happens in a store:

- New Order
- Order Status Changed
- New Customer

Each run gets one item: the event as Storelink sends it. `data` is the order or customer. `previous` holds the earlier status for Order Status Changed and is `null` for the other events. `source` says what caused the event, such as `storefront`, `dashboard`, or `n8n` for a change an n8n workflow made.

```json
{
	"id": "evt_01JC8V5Q6T2Z3M4N5P6R7S8T9V",
	"type": "order.status_changed",
	"created_at": "2026-11-01T10:15:00.000Z",
	"store_id": "6403015fb9de96fc86f364ad",
	"source": "dashboard",
	"data": {
		"order_id": "6724a1f0c2b5e8a1d4f3b2c1",
		"number": 10001,
		"status": "shipped",
		"...": "..."
	},
	"previous": { "status": "pending" }
}
```

**Storelink** works with a store's records:

| Resource | Operations                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------- |
| Order    | Create, Get, Get Many (filter by order number, customer email, or status), Update Status, Add Note |
| Customer | Create, Get Many (filter by email and phone)                                                       |
| Product  | Get Many (search by name)                                                                          |
| Coupon   | Create, for the whole order or for specific products                                               |

## Credentials

You need a Storelink store on a plan that includes integrations.

1. In Storelink, open the store's **Settings > Integrations** page and click **Create API key** on the n8n card.
2. Copy the key. It starts with `sl_key_`, and Storelink shows it only once.
3. In n8n, create a **Storelink API** credential and paste the key into **API Key**. Leave **Server URL** as it is.

A key serves one store. For several stores, create one key and one credential for each store.

The key can do what the team member who created it can do in the store. If that member's role changes, create a new key as a store owner or manager.

**Regenerate key** on the same card replaces the key. Every credential that holds the old key stops working until you paste in the new one. Active triggers keep their subscriptions, so no events are lost while you do. **Disconnect** revokes the key and ends the triggers' subscriptions.

## Compatibility

Built with `@n8n/node-cli` 0.55.5 against n8n 2.x.

## Usage

- **Triggers need n8n at a public https URL.** n8n Cloud works as it is. A self-hosted n8n needs a public https webhook URL (n8n's `N8N_WEBHOOK_URL` setting, or `WEBHOOK_URL` before n8n 2.35). Storelink refuses `localhost` and private addresses, so a trigger on `http://localhost:5678` fails to activate and n8n shows Storelink's message. The Storelink node works from any n8n.
- **To test a trigger,** click **Listen for test event**, then place an order, change an order's status, or add a customer in Storelink.
- **Deliveries are signed.** The trigger checks each delivery's signature and rejects anything Storelink didn't send.
- **Customer Get Many filters are ANDed.** A customer must match every filter you set, so map either the email or the phone, not both. To try the other one when the first finds no one, add a second Get Many behind an If node.
- **Get Many** outputs one item per record, newest first for orders and customers. Turn on **Return All** for every record, or set **Limit**.
- **Create Order's Reference** makes a retry safe. Map a unique ID from an earlier step, such as a form response ID. A run with a reference Storelink has seen returns the first order instead of creating another.
- **Line items** take a product from the list or by its slug. A product with several variants also needs a **Variant Key**, which Get Many Products returns under `variants`.
- **Errors** show Storelink's own message. If a workflow sends too many requests, turn on **Retry On Fail** in the node's settings.
- **Create Coupon** makes a coupon for the whole order or for specific products. Buy X Get Y coupons can't be created here.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Storelink](https://store.link)

## Version history

### 0.1.0

The first release: Storelink Trigger, and the Storelink node with orders, customers, products, and coupons.
