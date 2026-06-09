# Canvar — Canva Clone

Ứng dụng thiết kế đồ họa trên nền web, clone từ Canva. Tích hợp AI chat (Gemini), xác thực OAuth, upload ảnh, và lưu trữ dự án trên database.

---

## Tính năng

- Editor canvas kéo thả (Fabric.js)
- Shapes, text, image, filter, draw, opacity
- AI Chat (Gemini) — tạo thiết kế từ prompt
- Đăng nhập GitHub / Google
- Upload ảnh (UploadThing)
- Lưu / tải project tự động (NeonDB)
- Export PNG, JPG, SVG, JSON
- Undo / Redo, Zoom, Copy/Paste

---

## Yêu cầu

- Node.js 18+
- npm hoặc bun
- Docker Desktop (nếu chạy bằng Docker)

---

## Cài đặt

```bash
git clone https://github.com/fuongzz/CanvarMini
cd CanvarMini/canva-clone

# Dùng npm
npm install

# Hoặc dùng Bun
bun install
```

---

## Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục `canva-clone/`:

```bash
cp .env.example .env.local
```

Sau đó điền các giá trị theo hướng dẫn bên dưới.

---

## Hướng dẫn đăng ký từng dịch vụ

### 1. AUTH_SECRET — Tự tạo (bắt buộc)

```bash
npx auth secret
```

Dán kết quả vào:
```
AUTH_SECRET=<kết quả ở trên>
```

---

### 2. NeonDB — Database PostgreSQL (bắt buộc)

1. Vào [neon.tech](https://neon.tech) → Sign up → **Create Project**
2. Đặt tên project bất kỳ, chọn region gần nhất (Singapore cho VN)
3. Vào **Dashboard → Connection string** → copy chuỗi dạng:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```
4. Dán vào `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```
5. Chạy migration:
   ```bash
   npm run db:migrate
   ```

---

### 3. GitHub OAuth (bắt buộc để login)

1. Vào [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Điền:
   - **Application name**: Canvar (hoặc bất kỳ)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Nhấn **Register application**
4. Copy **Client ID** và tạo **Client Secret** → dán vào:
   ```
   AUTH_GITHUB_ID=...
   AUTH_GITHUB_SECRET=...
   ```

---

### 4. Google OAuth (bắt buộc để login)

1. Vào [console.cloud.google.com](https://console.cloud.google.com) → tạo project mới
2. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Thêm **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Copy **Client ID** và **Client Secret** → dán vào:
   ```
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   ```

> Nếu thấy lỗi "OAuth consent screen", vào **OAuth consent screen** → chọn External → điền App name, email → Save.

---

### SMTP Email (bắt buộc cho Forgot Password OTP)

Chức năng `Forgot Password` sẽ gửi mã OTP qua email bằng SMTP.

1. Chuẩn bị tài khoản SMTP:
   - Gmail: dùng `smtp.gmail.com`, port `587`, và **App Password** (không dùng mật khẩu thường)
   - Outlook/Hotmail: dùng `smtp.office365.com`, port `587`
   - Mailtrap/SendGrid SMTP: dùng thông số SMTP trong dashboard

2. Điền các biến sau vào `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=SlideRaku <your-email@gmail.com>
   ```

#### Cách tạo App Password (Gmail)

1. Truy cập trang [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. Nếu Google yêu cầu, bật **2-Step Verification** cho tài khoản trước.
3. Nhập tên ứng dụng (ví dụ `SlideRaku Local`) rồi nhấn **Create/Generate**.
4. Copy chuỗi 16 ký tự Google cung cấp.
5. Dán chuỗi đó vào `SMTP_PASS` trong `.env.local`.

> Lưu ý: `SMTP_PASS` phải là App Password, không phải mật khẩu đăng nhập Gmail thông thường.

3. Restart dev server sau khi đổi biến môi trường.

> Nếu thiếu một trong các biến SMTP, API forgot password sẽ trả lỗi gửi OTP.

---

### 5. Gemini AI (bắt buộc cho AI Chat)

1. Vào [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → **Create API key**
2. Dán vào:
   ```
   GEMINI_API_KEY=...
   ```

> Free tier: ~1,500 request/ngày. Không cần thẻ tín dụng.

---

### 6. UploadThing — Upload ảnh (bắt buộc cho Image tab)

1. Vào [uploadthing.com](https://uploadthing.com) → Sign in → **Create App**
2. Đặt tên app → vào **API Keys**
3. Copy **Secret Key** và **App ID** → dán vào:
   ```
   UPLOADTHING_SECRET=sk_live_...
   UPLOADTHING_APP_ID=...
   ```

> Free tier: 2GB storage + 2GB bandwidth/tháng.

---

### 7. Unsplash — Ảnh stock miễn phí (tùy chọn)

1. Vào [unsplash.com/developers](https://unsplash.com/developers) → **New Application**
2. Điền thông tin → copy **Access Key** → dán vào:
   ```
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
   ```

> Nếu bỏ trống, tab Images sẽ không hiển thị ảnh stock.

---

### 8. Replicate — AI generate image & remove background (tùy chọn)

1. Vào [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) → **Create token**
2. Dán vào:
   ```
   REPLICATE_API_TOKEN=r8_...
   ```

> Tính phí theo lần dùng (~$0.001–0.05/request). Nếu bỏ trống, tính năng AI image generation và remove background sẽ báo lỗi, các tính năng khác vẫn hoạt động bình thường.

---

### 9. Stripe — Subscription / thanh toán (tùy chọn)

1. Vào [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copy **Secret key** (bắt đầu bằng `sk_test_`) → dán vào `STRIPE_SECRET_KEY`
3. Tạo Product và Price trong Stripe → copy **Price ID** → dán vào `STRIPE_PRICE_ID`
4. Webhook secret lấy qua Stripe CLI hoặc Dashboard → `STRIPE_WEBHOOK_SECRET`

> Nếu bỏ trống, nút Upgrade/Subscribe sẽ không hoạt động, toàn bộ tính năng miễn phí vẫn dùng được.

---

## File .env.local hoàn chỉnh

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
AUTH_SECRET=<chạy: npx auth secret>
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database
DATABASE_URL=postgresql://...

# Forgot Password OTP Email (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Gemini AI Chat
GEMINI_API_KEY=

# UploadThing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Unsplash (tùy chọn)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=

# Replicate (tùy chọn)
REPLICATE_API_TOKEN=

# Stripe (tùy chọn)
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

---

## Chạy dự án

```bash
# Chạy migration database (chỉ cần làm 1 lần)
npm run db:migrate

# Khởi động dev server
npm run dev
```

Hoặc nếu dùng Bun:

```bash
# Chạy migration database (chỉ cần làm 1 lần)
bun run db:migrate

# Khởi động dev server
bun dev
```

Build production:

```bash
npm run build
npm run start
```

Mở [http://localhost:3000](http://localhost:3000) — đăng nhập bằng GitHub hoặc Google.

---

## Chạy bằng Docker (không cần cài Node/Bun)

```bash
# 1) Clone source
git clone https://github.com/fuongzz/CanvarMini
cd CanvarMini/canva-clone

# 2) Tạo file môi trường
cp .env.example .env.local
# Sau đó điền đầy đủ biến môi trường vào .env.local

# 3) Build và chạy container
docker compose up -d --build
```

Sau khi container chạy xong, mở [http://localhost:3000](http://localhost:3000).

Chạy migrate database (khi cần):

```bash
docker compose exec app npm run db:migrate
```

Dừng container:

```bash
docker compose down
```

---

## Lưu ý quan trọng

- **OAuth callback URL phải khớp với port đang chạy.** Mặc định là `3000`. Nếu port bị chiếm và app chạy ở `3001`, login sẽ thất bại — hãy tắt process khác đang dùng port 3000 rồi chạy lại.
- **Không commit `.env.local`** — file này đã có trong `.gitignore`, API keys của bạn sẽ không bị đẩy lên GitHub.
- **Sau khi thay đổi `.env.local`**, phải restart dev server để Next.js đọc lại biến môi trường.

---

## Tech Stack

| Công nghệ | Dùng cho |
|-----------|----------|
| Next.js 14 | Framework |
| React 18 | UI library |
| TypeScript | Type-safe development |
| Fabric.js 5 | Canvas editor |
| Drizzle ORM | Database ORM |
| NeonDB | PostgreSQL serverless |
| NextAuth v5 | Authentication |
| Hono | API router |
| UploadThing | File upload |
| Gemini API | AI Chat |
| Replicate | AI image gen |
| Stripe | Payments |
| TanStack Query | Data fetching |
| Zustand | Client state management |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| Nodemailer | SMTP email (OTP) |

---

## TL;DR
1. Cài sẵn 2 thứ: Git + Docker Desktop (bật Docker Engine)
2. Clone repo và vào thư mục dự án
```bash
git clone https://github.com/fuongzz/CanvarMini
cd CanvarMini/canva-clone
```
3. Tạo file môi trường:
Copy từ mẫu: .env.example thành .env.local
Điền đầy đủ biến bắt buộc:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET
AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
DATABASE_URL
GEMINI_API_KEY
UPLOADTHING_SECRET, UPLOADTHING_APP_ID
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
(tùy chọn) UNSPLASH, REPLICATE, STRIPE
```
4. Build và chạy web bằng Docker
```bash
docker compose up -d --build
```
Chạy migrate database (làm 1 lần hoặc khi đổi schema)
```bash
docker compose exec app npm run db:migrate
```
Mở web
```bash
http://localhost:3000
```
Dừng hệ thống khi không dùng
```bash
docker compose down
```
Lưu ý: Không cần cài Node/Bun trên máy mới nếu chạy theo cách Docker.