import Script from "next/script";

export function UmamiAnalytics({ websiteId, hostUrl }: { websiteId: string; hostUrl: string }) {
	return (
		<Script
			id="umami-analytics"
			src={`${hostUrl}/script.js`}
			data-website-id={websiteId}
			data-auto-track="true"
			strategy="afterInteractive"
		/>
	);
}
