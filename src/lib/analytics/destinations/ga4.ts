import type { CommerceItem, PaperCommerceEvent } from "@/lib/analytics/catalog";

export type Ga4Item = CommerceItem;

export type Ga4Params = Record<string, string | number | boolean | undefined | Ga4Item[]>;

/** Recommended tag event + params with enhanced e-commerce items[] support. */
export type Ga4Event = {
	name: string;
	params: Ga4Params;
};

/**
 * Project a Paper event onto recommended tag names. Search text is never a
 * param. Contact is not a checkout-step event — skip it. Server delivery
 * is not shipped; this function is payload-only.
 */
export function projectGa4(event: PaperCommerceEvent): Ga4Event | null {
	switch (event.name) {
		case "product_viewed":
			if (!event.currency) return null;
			return {
				name: "view_item",
				params: {
					currency: event.currency,
					value: event.value,
					...(event.items && event.items.length > 0 ? { items: event.items } : {}),
				},
			};
		case "product_added_to_cart":
			if (!event.currency) return null;
			return {
				name: "add_to_cart",
				params: {
					currency: event.currency,
					value: event.value,
					...(event.items && event.items.length > 0 ? { items: event.items } : {}),
				},
			};
		case "checkout_started":
			if (!event.currency) return null;
			return {
				name: "begin_checkout",
				params: {
					currency: event.currency,
					value: event.value,
					...(event.items && event.items.length > 0 ? { items: event.items } : {}),
				},
			};
		case "checkout_step_viewed":
			if (event.step === "shipping") return { name: "add_shipping_info", params: {} };
			if (event.step === "payment") return { name: "add_payment_info", params: {} };
			return null;
		case "checkout_completed":
			if (!event.currency || !event.transactionId) return null;
			return {
				name: "purchase",
				params: {
					transaction_id: event.transactionId,
					currency: event.currency,
					value: event.value,
					...(event.items && event.items.length > 0 ? { items: event.items } : {}),
				},
			};
		case "search_submitted":
			return { name: "search", params: {} };
	}
}
