# Umami Standalone Helm Chart

Helm Chart độc lập (Standalone), chuẩn production dành cho **Umami Analytics** trên Kubernetes và **AWS EKS**.

---

## 🌟 Tính Năng Nổi Bật

- **Độc lập hoàn toàn (Standalone):** Không phụ thuộc vào cụm ứng dụng khác; dễ dàng quản lý vòng đời (Lifecycle), nâng cấp phiên bản riêng biệt qua ArgoCD, FluxCD hoặc Helm CLI.
- **Tối ưu hóa cho AWS EKS:**
  - Hỗ trợ **AWS Load Balancer Controller (ALB)** với cấu hình `target-type: ip` và SSL Redirect qua ACM.
  - Hỗ trợ **AWS Secrets Store CSI Driver** (tự động đồng bộ credentials từ AWS Secrets Manager).
  - Hỗ trợ **IAM Roles for Service Accounts (IRSA)**.
- **Bảo mật chuẩn Ngân hàng / Doanh nghiệp:**
  - Container chạy dưới quyền **Non-root user** (`UID: 1000`).
  - Drop toàn bộ Linux Capabilities (`drop: [ALL]`), `allowPrivilegeEscalation: false`.
- **Độ tin cậy & Khả năng mở rộng (High Availability):**
  - **Horizontal Pod Autoscaler (HPA v2)** tự động scale theo tải CPU/Memory.
  - **Pod Disruption Budget (PDB)** đảm bảo dịch vụ không gián đoạn khi bảo trì/drain node EKS.
  - **Pod Anti-Affinity** phân tán pod đều qua các Availability Zone (Multi-AZ).
  - Health check chính xác qua endpoint `/api/heartbeat`.
- **Chống chặn Ad-Blocker:** Hỗ trợ cấu hình `TRACKER_SCRIPT_NAME` và `COLLECT_API_ENDPOINT` để đổi tên script theo dõi và endpoint gửi event.

---

## 📋 Yêu Cầu Trước Khi Cài Đặt (Prerequisites)

1. **Kubernetes Cluster:** v1.25 trở lên (Amazon EKS, GKE, hoặc Minikube).
2. **Helm:** v3.8+ hoặc v4+.
3. **Database:** Cụm PostgreSQL 14/15/16 (khuyến nghị **Amazon RDS PostgreSQL** hoặc **Aurora Serverless v2**).
4. **Ingress Controller:** **AWS Load Balancer Controller** (nếu chạy trên EKS) hoặc `ingress-nginx`.

---

## 🚀 Cài Đặt Nhanh (Quick Start)

### 1. Cài đặt trực tiếp từ thư mục local:

```bash
# Tạo namespace riêng biệt
kubectl create namespace analytics

# Cài đặt chart với thông số cơ bản
helm install umami ./helm \
  --namespace analytics \
  --set database.url="postgresql://umami:your_password@your-rds-host:5432/umami?sslmode=require&connection_limit=5" \
  --set database.appSecret="a-very-long-random-salt-string-min-32-chars" \
  --set ingress.hosts[0].host="analytics.yourdomain.com"
```

---

## 🛠️ Cấu Hình Môi Trường Production (`values-production.yaml`)

Tạo file `values-production.yaml` cho môi trường thực tế:

```yaml
replicaCount: 2

image:
  repository: ghcr.io/umami-software/umami
  tag: "postgresql-v2.14.0"
  pullPolicy: IfNotPresent

# Sử dụng Secret K8s đã tạo sẵn hoặc từ CI/CD
database:
  existingSecret: "umami-db-credentials"
  secretKeys:
    databaseUrl: "DATABASE_URL"
    appSecret: "APP_SECRET"

# Cấu hình Ingress ALB của AWS EKS
ingress:
  enabled: true
  className: "alb"
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing # Hoặc 'internal' nếu trong VPN ngân hàng
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-southeast-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    alb.ingress.kubernetes.io/healthcheck-path: /api/heartbeat
  hosts:
    - host: analytics.vpbank.com.vn
      paths:
        - path: /
          pathType: Prefix

# Tùy biến chống chặn Ad-blocker
env:
  CLIENT_IP_HEADER: "x-forwarded-for"
  DISABLE_TELEMETRY: "1"
  TRACKER_SCRIPT_NAME: "telemetry.js"
  COLLECT_API_ENDPOINT: "api/telemetry"

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1024Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

Chạy lệnh triển khai:

```bash
helm upgrade --install umami ./helm \
  --namespace analytics \
  --create-namespace \
  -f values-production.yaml
```

---

## 🔒 Tích Hợp AWS Secrets Manager qua CSI Driver (Tùy chọn)

Nếu bạn muốn quản lý mật khẩu hoàn toàn trên AWS Secrets Manager:

1. Thiết lập trong `values.yaml`:
   ```yaml
   awsSecretsManager:
     enabled: true
     awsSecretName: "vpbank/production/umami"
     secretProviderClassName: "umami-aws-secrets"
     region: "ap-southeast-1"
   ```
2. Gán IAM Role qua ServiceAccount:
   ```yaml
   serviceAccount:
     create: true
     annotations:
       eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/UmamiSecretsManagerRole
   ```

---

## ⚙️ Bảng Tham Số Cấu Hình (Configuration Values)

| Tham Số                        | Mô Tả                                          | Mặc Định                       |
| ------------------------------ | ---------------------------------------------- | ------------------------------ |
| `replicaCount`                 | Số lượng Pod khởi tạo (khi HPA tắt)            | `2`                            |
| `image.repository`             | Docker image của Umami                         | `ghcr.io/umami-software/umami` |
| `image.tag`                    | Phiên bản tag image                            | `postgresql-v2.14.0`           |
| `podSecurityContext.runAsUser` | UID chạy process trong container               | `1000` (Non-root)              |
| `database.existingSecret`      | Tên Secret Kubernetes chứa DB config có sẵn    | `""`                           |
| `database.url`                 | PostgreSQL Connection string                   | `postgresql://...`             |
| `database.appSecret`           | Salt ngẫu nhiên bảo mật của Umami (>=32 ký tự) | `""`                           |
| `env.CLIENT_IP_HEADER`         | Header nhận diện IP thật sau Load Balancer     | `x-forwarded-for`              |
| `env.TRACKER_SCRIPT_NAME`      | Đổi tên file script tracking                   | `telemetry.js`                 |
| `env.COLLECT_API_ENDPOINT`     | Đổi tên API endpoint nhận event                | `api/telemetry`                |
| `ingress.enabled`              | Bật/tắt Ingress                                | `true`                         |
| `ingress.className`            | Ingress class (`alb`, `nginx`, ...)            | `alb`                          |
| `autoscaling.enabled`          | Bật Horizontal Pod Autoscaler                  | `true`                         |
| `autoscaling.minReplicas`      | Số Pod tối thiểu                               | `2`                            |
| `autoscaling.maxReplicas`      | Số Pod tối đa khi tải cao                      | `10`                           |
| `podDisruptionBudget.enabled`  | Bật chính sách PDB khi bảo trì Node            | `true`                         |
| `probes.liveness.httpGet.path` | Endpoint kiểm tra sức khỏe của Umami           | `/api/heartbeat`               |

---

## 🧪 Đóng Gói và Kiểm Tra (Testing & Packaging)

```bash
# 1. Kiểm tra cú pháp (Lint)
helm lint ./helm

# 2. Xem trước tài nguyên Kubernetes được render
helm template my-umami ./helm -f values-production.yaml

# 3. Đóng gói thành file archive .tgz để lưu trữ trên OCI Registry / ChartMuseum:
helm package ./helm
```

---

## 🔗 Kết Nối Với Next.js Storefront

Sau khi triển khai xong, lấy thông tin URL từ Ingress và tạo Website trên Dashboard Umami, sau đó thêm vào `.env.production` của storefront:

```env
NEXT_PUBLIC_UMAMI_HOST_URL=https://analytics.yourdomain.com
NEXT_PUBLIC_UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
