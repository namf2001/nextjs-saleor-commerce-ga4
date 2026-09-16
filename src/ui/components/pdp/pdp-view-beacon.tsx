"use client";

import { useEffect, useRef } from "react";
import { emitCommerceEvent } from "@/lib/analytics/emit.client";

export interface PdpViewBeaconProps {
	id: string;
	name: string;
	channel: string;
	currency?: string;
	price?: number;
	category?: string;
}

/**
 * Emits GA4 view_item event once per PDP mount.
 * Guards against React Strict Mode remount double-firing.
 */
export function PdpViewBeacon({ id, name, channel, currency, price, category }: PdpViewBeaconProps) {
	const sent = useRef(false);

	useEffect(() => {
		if (sent.current || !currency) return;
		sent.current = true;

		emitCommerceEvent({
			name: "product_viewed",
			channel,
			currency,
			value: price ?? 0,
			items: [
				{
					item_id: id,
					item_name: name,
					price: price ?? 0,
					quantity: 1,
					item_category: category,
				},
			],
		});
	}, [id, name, channel, currency, price, category]);

	return null;
}
