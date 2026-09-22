# Hướng dẫn Kỹ thuật: Tự host Umami bằng Docker & Tích hợp vào Next.js Storefront

Tài liệu này cung cấp kế hoạch và hướng dẫn triển khai từng bước chi tiết để bạn có thể tự lập trình tích hợp **Umami Self-hosted** vào dự án `nextjs-saleor-commerce-ga4`.

---

## 1. Tổng quan Kiến trúc

- **Hạ tầng Self-hosted:** Umami + PostgreSQL chạy độc lập thông qua Docker Compose trên cổng `3005` (tránh xung đột cổng `3000`/`3001` của Next.js và `8085` của Keycloak).
- **Phía Frontend (Next.js 16 App Router):**
  - Nhúng script `script.js` qua `next/script` với chiến lược `afterInteractive`.
  - Mở rộng tầng **Multi-destination Event Bus** (`src/lib/analytics/`): các sự kiện thương mại điện tử (`PaperCommerceEvent`) như xem sản phẩm, thêm vào giỏ, checkout, mua hàng sẽ tự động được chuyển tiếp tới Umami song song với GA4 và Vercel Analytics mà không cần chỉnh sửa UI component.
  - Tự động bảo mật: bảo vệ URL khỏi rò rỉ token OAuth, query param nhạy cảm.

---

## 2. Bước 1: Tạo file Docker Compose cho Umami

Tạo file `docker-compose.umami.yml` tại thư mục gốc của dự án:

```yaml
version: "3.8"

services:
  umami-db:
    image: postgres:15-alpine
    container_name: umami-postgres
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami_password_123
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - umami-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami -d umami"]
      interval: 5s
      timeout: 5s
      retries: 5

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami-app
    ports:
      - "3005:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami_password_123@umami-db:5432/umami
      APP_SECRET: vpbank_umami_secret_salt_2026
    depends_on:
      umami-db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - umami-net

volumes:
  umami-db-data:

networks:
  umami-net:
    driver: bridge
```

### Cách khởi chạy và lấy Website ID:

1. Chạy lệnh:
   ```bash
   docker compose -f docker-compose.umami.yml up -d
   ```
2. Mở trình duyệt vào `http://localhost:3005`:
   - Đăng nhập với tài khoản mặc định:
     - **Username:** `admin`
     - **Password:** `umami`
   - Đổi mật khẩu trong phần **Settings > Profile**.
3. Thêm Website mới trong **Settings > Websites > Add Website**:
   - **Name:** `Saleor Storefront`
   - **Domain:** `localhost:3001`
4. Sau khi tạo, bấm vào **Edit** website và sao chép **Website ID** (chuỗi UUID có dạng: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

---

## 3. Bước 2: Cấu hình biến môi trường

Thêm vào file `.env` và `.env.example`:

```env
# Umami Analytics (Self-hosted)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_UMAMI_HOST_URL=http://localhost:3005
```

---

## 4. Bước 3: Tạo Module Helper Kiểm tra Cấu hình

Tạo file mới: `src/lib/analytics/umami.ts`

```typescript
/**
 * Helper kiểm tra và trích xuất cấu hình Umami Analytics.
 * Hoạt động an toàn: Nếu chưa cấu hình ID thì tự động vô hiệu hóa.
 */

export function umamiWebsiteId(raw = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID): string | null {
	const value = raw?.trim();
	if (!value) return null;
	return value;
}

export function umamiHostUrl(raw = process.env.NEXT_PUBLIC_UMAMI_HOST_URL): string {
	const value = raw?.trim();
	if (!value) return "http://localhost:3005";
	// Bỏ dấu slash cuối nếu có
	return value.replace(/\/+$/, "");
}

export function umamiEnabled(raw = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID): boolean {
	return umamiWebsiteId(raw) !== null;
}
```

---

## 5. Bước 4: Tạo Destination Adapter chuyển đổi sự kiện

Tạo file mới: `src/lib/analytics/destinations/umami.ts`

```typescript
import type { PaperCommerceEvent } from "@/lib/analytics/catalog";

export type UmamiCustomEvent = {
	name: string;
	data?: Record<string, string | number | boolean>;
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
```

---

## 6. Bước 5: Cập nhật Runtime Dispatcher (`browser.ts`)

Mở file: `src/lib/analytics/browser.ts`

1. Bổ sung type cho `window.umami`:

```typescript
declare global {
	interface Window {
		paperAnalytics?: PaperAnalyticsApi;
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
		umami?: {
			track: (eventName: string, eventData?: Record<string, string | number | boolean>) => void;
		};
	}
}
```

2. Thêm hàm gửi sự kiện Umami:

```typescript
import { umamiEnabled } from "@/lib/analytics/umami";

export function sendUmamiEvent(name: string, data?: Record<string, string | number | boolean>): void {
	if (!umamiEnabled()) return;
	if (typeof window === "undefined" || !window.umami) return;
	try {
		window.umami.track(name, data);
	} catch (err) {
		console.warn("[analytics] umami track failed", err);
	}
}
```

---

## 7. Bước 6: Tạo UI Component nhúng Script Umami

Tạo file mới: `src/ui/components/umami-analytics.tsx`

```tsx
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
```

Sau đó, mở `src/ui/components/analytics-mount.tsx` và mount component này:

```tsx
import { umamiEnabled, umamiHostUrl, umamiWebsiteId } from "@/lib/analytics/umami";
import { UmamiAnalytics } from "@/ui/components/umami-analytics";

export function AnalyticsMount() {
	const measurementId = gaMeasurementId();
	const umamiId = umamiWebsiteId();

	return (
		<>
			{measurementId ? (
				<GoogleAnalytics measurementId={measurementId} consentMode={analyticsConsentMode()} />
			) : null}
			{umamiId ? <UmamiAnalytics websiteId={umamiId} hostUrl={umamiHostUrl()} /> : null}
			<AnalyticsRuntime />
			<Suspense fallback={null}>
				<AnalyticsPathnameViews />
			</Suspense>
		</>
	);
}
```

---

## 8. Bước 7: Đăng ký Umami vào Client Event Bus

Mở file `src/lib/analytics/emit.client.ts`:

1. Import các hàm từ `destinations/umami` và `browser`:

```typescript
import { projectUmami } from "@/lib/analytics/destinations/umami";
import { sendUmamiEvent } from "@/lib/analytics/browser";
```

2. Trong hàm `emitCommerceEvent(event)`:

```typescript
export function emitCommerceEvent(event: PaperCommerceEvent): void {
	try {
		const vercel = projectVercel(event);
		if (vercel) {
			track(vercel.name, vercel.props);
		}
		const ga4 = projectGa4(event);
		if (ga4) {
			sendGa4Event(ga4);
		}
		const umami = projectUmami(event);
		if (umami) {
			sendUmamiEvent(umami.name, umami.data);
		}
		if (process.env.NODE_ENV === "development") {
			projectConsole(event);
		}
	} catch (error) {
		console.warn("[analytics] destination failed", error);
	}
}
```

---

## 9. Bước 8: Viết Unit Test cho Umami Adapter

Tạo file mới: `src/lib/analytics/destinations/umami.test.ts`

```typescript
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
```

---

## 10. Bước 9: Kiểm tra & Nghiệm thu (Verification)

1. **Chạy Unit Test:**
   ```bash
   pnpm vitest run src/lib/analytics/destinations/umami.test.ts
   ```
2. **Kiểm tra Type và Lint toàn bộ dự án:**
   ```bash
   pnpm run verify
   ```
3. **Kiểm tra thực tế:**
   - Đảm bảo Umami Docker đang chạy: `docker compose -f docker-compose.umami.yml ps`
   - Khởi động dev server: `pnpm dev` (hoặc đang chạy tại port `3001`).
   - Vào `http://localhost:3001`, mở DevTools Network tab, kiểm tra request tới `http://localhost:3005/script.js` và `http://localhost:3005/api/send`.
   - Vào `http://localhost:3005` (Umami Dashboard) ➔ Kiểm tra lượt xem trang (Realtime) và các sự kiện custom `add_to_cart`, `view_item` hiển thị trực tiếp.
