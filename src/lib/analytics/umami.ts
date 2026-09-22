/**
 * Helper kiểm tra và trích xuất cấu hình Umami Analytics.
 * Hoạt động an toàn: Nếu chưa cấu hình ID thì tự động vô hiệu hóa.
 */

export function umamiWebsiteId(raw = process?.env?.NEXT_PUBLIC_UMAMI_WEBSITE_ID): string | undefined {
	const value = raw?.trim();
	if (!value) return undefined;
	return value;
}

export function umamiHostUrl(raw = process.env.NEXT_PUBLIC_UMAMI_HOST_URL): string {
	const value = raw?.trim();
	if (!value) return "http://localhost:3005";
	// Bỏ dấu slash cuối nếu có
	return value.replace(/\/+$/, "");
}

export function umamiEnabled(raw = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID): boolean {
	return Boolean(umamiWebsiteId(raw));
}
