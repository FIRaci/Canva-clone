# Hướng Dẫn Deploy Canva Clone (Render Edition)

Tài liệu này cung cấp hướng dẫn từng bước vô cùng chi tiết để đưa dự án Next.js (Canva Clone) lên máy chủ **Render** - Nền tảng hỗ trợ Node.js Web Service ổn định 24/7.

Do đặc thù dự án nằm trong thư mục con `canva-clone` của kho chứa (repository), chúng ta **BẮT BUỘC** phải chỉ định đúng Root Directory thì hệ thống mới có thể tìm thấy file `package.json` để tiến hành cài đặt.

---

## BƯỚC 1: KHỞI TẠO WEB SERVICE TRÊN RENDER

1. Truy cập [Render Dashboard](https://dashboard.render.com/) và đăng nhập thông qua tài khoản GitHub.
2. Bấm vào nút **New** (góc trên bên phải) > Chọn **Web Service**.
3. Chọn tùy chọn **Build and deploy from a Git repository** > **Next**.
4. Tìm đến kho chứa `FIRaci/Canva-clone` của bạn và bấm **Connect**.

---

## BƯỚC 2: ĐIỀN THÔNG SỐ CẤU HÌNH CỐT LÕI

Bạn cần điền chính xác các mục dưới đây vào form cấu hình của Render:

- **Name**: `canva-clone` (Tên dự án, tùy ý bạn chọn).
- **Region**: Nên chọn `Singapore` hoặc `Frankfurt` để cho tốc độ truy cập từ VN tốt nhất.
- **Branch**: `main`
- **Root Directory**: `canva-clone` 
  > ⚠️ **ĐẶC BIỆT QUAN TRỌNG:** Phải gõ chữ `canva-clone` vào đây. Nếu để trống, Render sẽ tìm ở thư mục ngoài cùng và lập tức báo lỗi *Cannot find package.json*.
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

---

## BƯỚC 3: CÀI ĐẶT BIẾN MÔI TRƯỜNG (ENVIRONMENT) BẰNG SECRET FILE

Kéo xuống phần **Environment Variables**, đừng nhập từng dòng bằng tay.

1. Bấm vào tùy chọn **Add Secret File**.
2. Ở ô *Filename*, bạn nhập tên file là: `.env`
3. Ở khung soạn thảo nội dung to nhất bên phải, copy toàn bộ nội dung khối code dưới đây và dán vào:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=YOUR_UNSPLASH_KEY

UPLOADTHING_SECRET=YOUR_UPLOADTHING_SECRET
UPLOADTHING_APP_ID=YOUR_UPLOADTHING_APP_ID

REPLICATE_API_TOKEN=YOUR_REPLICATE_TOKEN

AUTH_GITHUB_ID=YOUR_GITHUB_ID
AUTH_GITHUB_SECRET=YOUR_GITHUB_SECRET

AUTH_GOOGLE_ID=YOUR_GOOGLE_ID
AUTH_GOOGLE_SECRET=YOUR_GOOGLE_SECRET
AUTH_SECRET=YOUR_AUTH_SECRET

STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET
STRIPE_PRICE_ID=YOUR_STRIPE_PRICE
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK

DATABASE_URL=YOUR_DATABASE_URL

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_SMTP_USER
SMTP_PASS=YOUR_SMTP_PASS
SMTP_FROM=SlideRaku <lvnhvn12112005@gmail.com>
```

4. Sau khi dán xong, kéo xuống dưới cùng màn hình và nhấn nút **Create Web Service**.
5. Render sẽ bắt đầu build ứng dụng, quá trình diễn ra khoảng 3-5 phút. Khi thấy chữ `Build Successful` là xong.

---

## BƯỚC 4: THAY ĐỔI DOMAIN THẬT VÀ OAUTH

Sau khi ứng dụng chạy thành công, Render cấp cho bạn một domain thật (VD: `https://canva-clone-abcd.onrender.com`).

**1. Cập nhật lại vào Render:**
Trở lại mục **Environment** của Web Service > Sửa Secret File `.env` > Sửa dòng đầu tiên thành URL thật:
`NEXT_PUBLIC_APP_URL=https://canva-clone-abcd.onrender.com`
Lưu lại, hệ thống sẽ khởi động lại dịch vụ.

**2. Cập nhật GitHub & Google OAuth:**
Nếu bỏ qua bước này, chức năng Đăng Nhập bằng mạng xã hội sẽ bị Lỗi 400.
- **GitHub:** Truy cập [Developer Settings](https://github.com/settings/developers) > Sửa `Authorization callback URL` thành `https://[DOMAIN_CỦA_BẠN]/api/auth/callback/github`.
- **Google:** Truy cập [Cloud Console](https://console.cloud.google.com/) > Credentials > Thêm `Authorized redirect URIs` là `https://[DOMAIN_CỦA_BẠN]/api/auth/callback/google`.

**3. Cập nhật Stripe Webhook:**
- **Stripe Dashboard:** Thêm Endpoint mới với URL `https://[DOMAIN_CỦA_BẠN]/api/webhook/stripe`. Lấy Secret mới thay vào biến `STRIPE_WEBHOOK_SECRET` trên Render.

Thực hiện chuẩn chỉ các bước này, trang web của bạn sẽ hoạt động hoàn hảo 100%!
