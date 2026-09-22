import { describe, expect, it } from "vitest";
import { projectUmami } from "./umami";

describe("projectUmami", () => {
	it("maps product_viewed to view_item with product details", () => {
		expect(
			projectUmami({
				name: "product_viewed",
				channel: "channel-pl",
				currency: "PLN",
				value: 120,
				items: [{ item_id: "prod_1", item_name: "T-Shirt" }],
			}),
		).toEqual({
			name: "view_item",
			data: {
				channel: "channel-pl",
				currency: "PLN",
				value: 120,
				item_id: "prod_1",
				item_name: "T-Shirt",
			},
		});
	});

	it("maps product_added_to_cart to add_to_cart", () => {
		expect(
			projectUmami({
				name: "product_added_to_cart",
				channel: "channel-pl",
				currency: "PLN",
				value: 50,
				items: [{ item_id: "var_1", item_name: "Sneakers" }],
			}),
		).toEqual({
			name: "add_to_cart",
			data: {
				channel: "channel-pl",
				currency: "PLN",
				value: 50,
				item_id: "var_1",
				item_name: "Sneakers",
			},
		});
	});

	it("maps checkout_completed to purchase", () => {
		expect(
			projectUmami({
				name: "checkout_completed",
				channel: "channel-pl",
				currency: "PLN",
				value: 200,
				transactionId: "ORD-999",
			}),
		).toEqual({
			name: "purchase",
			data: {
				channel: "channel-pl",
				currency: "PLN",
				value: 200,
				transaction_id: "ORD-999",
			},
		});
	});
});
