import { describe, expect, it } from "vitest";
import type { PaperCommerceEvent } from "@/lib/analytics/catalog";
import { projectGa4 } from "./ga4";

describe("projectGa4", () => {
	it("maps commerce moments onto recommended names", () => {
		expect(projectGa4({ name: "product_added_to_cart", channel: "us", value: 49, currency: "USD" })).toEqual({
			name: "add_to_cart",
			params: { currency: "USD", value: 49 },
		});

		expect(projectGa4({ name: "checkout_started", channel: "us", value: 49, currency: "USD" })).toEqual({
			name: "begin_checkout",
			params: { currency: "USD", value: 49 },
		});

		expect(projectGa4({ name: "checkout_step_viewed", channel: "us", step: "shipping" })).toEqual({
			name: "add_shipping_info",
			params: {},
		});
		expect(projectGa4({ name: "checkout_step_viewed", channel: "us", step: "payment" })).toEqual({
			name: "add_payment_info",
			params: {},
		});

		expect(
			projectGa4({
				name: "checkout_completed",
				channel: "us",
				value: 59,
				currency: "USD",
				transactionId: "T3JkZXI6MQ==",
			}),
		).toEqual({
			name: "purchase",
			params: { transaction_id: "T3JkZXI6MQ==", currency: "USD", value: 59 },
		});
	});

	it("maps product_viewed to view_item and preserves items[]", () => {
		const item = {
			item_id: "prod_1",
			item_name: "T-Shirt",
			price: 25,
			quantity: 1,
			item_category: "Apparel",
			item_variant: "Large",
		};
		expect(
			projectGa4({
				name: "product_viewed",
				channel: "us",
				value: 25,
				currency: "USD",
				items: [item],
			}),
		).toEqual({
			name: "view_item",
			params: {
				currency: "USD",
				value: 25,
				items: [item],
			},
		});

		expect(
			projectGa4({
				name: "product_viewed",
				channel: "us",
				value: 25,
				currency: "",
			}),
		).toBeNull();
	});

	it("preserves items[] on add_to_cart, begin_checkout, and purchase", () => {
		const item = {
			item_id: "prod_1",
			item_name: "T-Shirt",
			price: 25,
			quantity: 2,
		};

		expect(
			projectGa4({
				name: "product_added_to_cart",
				channel: "us",
				value: 50,
				currency: "USD",
				items: [item],
			}),
		).toEqual({
			name: "add_to_cart",
			params: { currency: "USD", value: 50, items: [item] },
		});

		expect(
			projectGa4({
				name: "checkout_started",
				channel: "us",
				value: 50,
				currency: "USD",
				items: [item],
			}),
		).toEqual({
			name: "begin_checkout",
			params: { currency: "USD", value: 50, items: [item] },
		});

		expect(
			projectGa4({
				name: "checkout_completed",
				channel: "us",
				value: 50,
				currency: "USD",
				transactionId: "ord_1",
				items: [item],
			}),
		).toEqual({
			name: "purchase",
			params: { transaction_id: "ord_1", currency: "USD", value: 50, items: [item] },
		});
	});

	it("skips the contact step — GA has no recommended equivalent", () => {
		expect(projectGa4({ name: "checkout_step_viewed", channel: "us", step: "contact" })).toBeNull();
	});

	it("sends search without the query text", () => {
		const event: PaperCommerceEvent = { name: "search_submitted", channel: "us", zero: true };
		expect(projectGa4(event)).toEqual({ name: "search", params: {} });
		expect(JSON.stringify(projectGa4(event))).not.toMatch(/zero|query|search_term/i);
	});

	it("drops a purchase that is missing currency or transaction id", () => {
		expect(
			projectGa4({
				name: "checkout_completed",
				channel: "us",
				value: 10,
				currency: "",
				transactionId: "x",
			}),
		).toBeNull();
	});
});
