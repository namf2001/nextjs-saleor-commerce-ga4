import type { PaperCommerceEvent } from "@/lib/analytics/catalog";

export type UmamiEventData = Record<string, string | number | boolean | null | undefined | Date>;

export type UmamiCustomEvent = {
	name: string;
	data?: UmamiEventData;
};

/**
 * Chuyển đổi sự kiện nội bộ PaperCommerceEvent sang định dạng sự kiện tùy chỉnh của Umami.
 */
export function projectUmami(event: PaperCommerceEvent): UmamiCustomEvent | null {
	switch (event.name) {
		case "product_viewed": {
			const item = event.items?.[0];
			return {
				name: "view_item",
				data: {
					channel: event.channel,
					currency: event.currency,
					value: event.value,
					...(item ? { item_id: item.item_id, item_name: item.item_name } : {}),
				},
			};
		}
		case "product_added_to_cart": {
			const item = event.items?.[0];
			return {
				name: "add_to_cart",
				data: {
					channel: event.channel,
					currency: event.currency,
					value: event.value,
					...(item ? { item_id: item.item_id, item_name: item.item_name } : {}),
				},
			};
		}
		case "checkout_started":
			return {
				name: "begin_checkout",
				data: {
					channel: event.channel,
					currency: event.currency,
					value: event.value,
				},
			};
		case "checkout_step_viewed":
			return {
				name: "checkout_step",
				data: {
					channel: event.channel,
					step: event.step,
				},
			};
		case "checkout_completed":
			return {
				name: "purchase",
				data: {
					channel: event.channel,
					currency: event.currency,
					value: event.value,
					transaction_id: event.transactionId,
				},
			};
		case "search_submitted":
			return {
				name: "search",
				data: {
					channel: event.channel,
					zero: event.zero,
				},
			};
		default:
			return null;
	}
}
