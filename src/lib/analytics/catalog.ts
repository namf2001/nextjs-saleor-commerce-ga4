/**
 * Paper commerce event catalog.
 *
 * Call sites emit one of these. Destinations project: Web Analytics gets two
 * flat props; the merchant tag gets recommended names (client + consent;
 * server delivery later). Never put track / tag / pixel calls in components.
 */
export const PAPER_COMMERCE_EVENT_VERSION = 1 as const;

export type CheckoutStepSlug = "contact" | "shipping" | "payment";

export type CommerceItem = {
	item_id: string;
	item_name: string;
	price?: number;
	quantity?: number;
	item_category?: string;
	item_variant?: string;
	item_brand?: string;
};

export type PaperCommerceEvent =
	| {
			name: "product_viewed";
			channel: string;
			value: number;
			currency: string;
			items?: CommerceItem[];
	  }
	| {
			name: "product_added_to_cart";
			channel: string;
			value: number;
			currency: string;
			items?: CommerceItem[];
	  }
	| {
			name: "checkout_started";
			channel: string;
			value: number;
			currency: string;
			items?: CommerceItem[];
	  }
	| {
			name: "checkout_step_viewed";
			channel: string;
			step: CheckoutStepSlug;
	  }
	| {
			name: "checkout_completed";
			channel: string;
			value: number;
			currency: string;
			/** Saleor order id — GA transaction_id later; never a Vercel property. */
			transactionId: string;
			items?: CommerceItem[];
	  }
	| {
			name: "search_submitted";
			channel: string;
			/** True when the result set is empty. Search text never leaves the browser. */
			zero: boolean;
	  };
