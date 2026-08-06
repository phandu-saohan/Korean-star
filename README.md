# 🏥 Korean Star — Hệ Thống Quản Lý CTV & Dịch Vụ Thẩm Mỹ

> **Bệnh Viện Thẩm Mỹ Quốc Tế Korean Star** — Nền tảng toàn diện quản lý cộng tác viên (CTV), lịch hẹn CRM, thông báo realtime qua **OneSignal Push** & **Zalo Bot**, tích hợp AI phân tích da và mô phỏng 3D.

---

## ✨ Tính Năng Chính

### 👥 1. Quản Lý Cộng Tác Viên (CTV Hub)
- Dashboard hoa hồng realtime: doanh số, ví khả dụng, tỷ lệ chuyển đổi
- Mã giới thiệu cá nhân (referral code) tự động sinh
- Phân cấp CTV: Bạc → Vàng → Bạch Kim → Kim Cương
- Lịch sử leads & trạng thái từng khách hàng

### 📅 2. CRM Đặt Lịch Hẹn (Smart Booking)
- CTV đặt lịch tư vấn / tái khám cho khách hàng
- Gắn ảnh / video hiện tại của khách hàng khi đặt lịch
- Admin xem **toàn bộ** lịch hẹn hệ thống
- CTV chỉ thấy **lịch hẹn của chính mình**
- Đổi trạng thái CRM: Chờ xác nhận → Đã xác nhận → Đang điều trị → Hoàn thành / Đã hủy
- Đồng bộ realtime qua **Supabase** (auto-sync mỗi 30 giây)

### 🔔 3. Thông Báo Realtime (OneSignal + Zalo Bot)
| Sự kiện | OneSignal Push | Zalo Bot |
|---|---|---|
| CTV đặt lịch mới | ✅ CTV + Admin/Kế toán | ✅ CTV + Admin |
| Admin đổi trạng thái lịch | ✅ CTV + Admin | ✅ CTV + Admin |
| Yêu cầu rút hoa hồng | ✅ CTV + Admin/Kế toán | ✅ CTV + Admin |
| Giải ngân hoa hồng hoàn tất | ✅ CTV + Admin | ✅ CTV + Admin |
| Thành viên mới đăng ký | ✅ Admin | ✅ Admin |
| Check-in hậu phẫu | ✅ Admin | ✅ Admin |

### 💰 4. Giải Ngân Hoa Hồng (VietQR Flow 5 Bước)
- CTV gửi yêu cầu rút tiền → Kế toán kiểm tra → Admin phê duyệt → VietQR tự động
- Audit log đầy đủ từng bước phê duyệt
- Thông báo push tự động mỗi bước thay đổi

### 🤖 5. AI Phân Tích Da (Gemini AI)
- Upload ảnh da → AI phân tích 6 chỉ số (lỗ chân lông, sắc tố, độ ẩm, nếp nhăn, độ đàn hồi, mụn)
- Đề xuất phác đồ điều trị cá nhân hóa
- Hướng dẫn chăm sóc da tại nhà

### 🧊 6. Mô Phỏng Chọn Size Túi Ngực 3D
- Tương tác 3D xoay 360°, thu phóng, chọn size (cc), độ nhô, hình dáng
- AI tư vấn size phù hợp dựa trên chỉ số cơ thể

### 🏥 7. Chăm Sóc Hậu Phẫu 24/7
- Check-in ngày hậu phẫu, ghi nhận triệu chứng
- AI đánh giá trạng thái phục hồi: An toàn / Cần theo dõi / Cảnh báo bác sĩ

### 📋 8. Quản Lý Nội Dung (Editor Dashboard)
- Bảng giá dịch vụ CRUD (thêm/sửa/xóa)
- Thư viện ảnh Trước/Sau lâm sàng
- Video hướng dẫn tư vấn
- Chương trình ưu đãi & Flash Sale

---

## 🛠️ Công Nghệ

| Layer | Công nghệ |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **UI Components** | Lucide Icons, Recharts |
| **3D** | Three.js |
| **AI** | Google GenAI (`gemini-3.6-flash`) |
| **Backend** | Node.js, Express, `tsx` |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Push Notification** | OneSignal Web Push SDK v16 |
| **Zalo Bot** | Zalo Bot API (Zalo Platform) |
| **Deploy** | Vercel / Docker / Nixpacks |

---

## 🚀 Cài Đặt & Chạy

### Yêu cầu
- **Node.js** ≥ 18 hoặc **Bun**
- Tài khoản **Supabase**, **OneSignal**, **Zalo Bot**

### 1. Cài dependencies
```bash
npm install
```

### 2. Cấu hình môi trường
```bash
cp .env.example .env
```

Điền các biến môi trường trong `.env`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# OneSignal Web Push (server-side)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key

# Zalo Bot
ZALO_BOT_TOKEN=your_zalo_bot_token
VITE_ZALO_BOT_TOKEN=your_zalo_bot_token
```

### 3. Chạy Development Server
```bash
npm run dev
```
Ứng dụng chạy tại: `http://localhost:3000`

### 4. Build Production
```bash
npm run build
npm start
```

---

## ⚙️ Cấu Hình Trong App (CMS Settings)

Sau khi đăng nhập bằng tài khoản **Admin**, vào tab **Admin → Cài Đặt Hệ Thống**:

| Mục | Thông tin cần điền |
|---|---|
| OneSignal App ID | Lấy tại [app.onesignal.com](https://app.onesignal.com) → App Settings → Keys & IDs |
| OneSignal REST API Key | Lấy cùng trang trên |
| Zalo Bot Token | Lấy tại [developers.zalo.me](https://developers.zalo.me) |
| Zalo Default Admin Chat ID | Chat ID Zalo của Admin (xem hướng dẫn bên dưới) |

### Lấy Zalo Chat ID
1. Cấu hình Webhook URL trong Zalo Bot: `https://your-domain.com/api/zalo/webhook`
2. Gửi bất kỳ tin nhắn nào đến bot Zalo của bạn
3. Bot sẽ tự động reply với Chat ID của bạn
4. Sao chép Chat ID → Dán vào Hồ Sơ Cá Nhân (CTV) hoặc CMS Settings (Admin)

---

## 🔐 Phân Quyền Hệ Thống

| Role | Quyền truy cập |
|---|---|
| `admin` | Toàn quyền: CRM, giải ngân, cài đặt, phân quyền |
| `accountant` | Duyệt giải ngân VietQR, xem lịch hẹn |
| `editor` | Quản lý nội dung: dịch vụ, ảnh, video, ưu đãi |
| `ctv` | Dashboard hoa hồng, đặt lịch, xem lịch của mình |

---

## 📁 Cấu Trúc Thư Mục

```
├── api/
│   ├── onesignal/send-notification.ts   # Proxy OneSignal (Vercel Serverless)
│   └── zalo/
│       ├── send-message.ts              # Proxy Zalo Bot sendMessage
│       ├── set-webhook.ts               # Proxy Zalo setWebhook
│       └── webhook.ts                   # Zalo webhook handler
├── src/
│   ├── components/
│   │   ├── CRMAppointment.tsx           # Đặt lịch hẹn + thông báo
│   │   ├── AdminDashboard.tsx           # Dashboard Admin
│   │   ├── CTVHub.tsx                   # Dashboard CTV
│   │   ├── SystemSettingsModule.tsx     # Cài đặt OneSignal, Zalo, Supabase
│   │   └── ...
│   ├── lib/
│   │   ├── onesignal.ts                 # OneSignal SDK + notification helpers
│   │   └── supabase.ts                  # Supabase client + CRUD functions
│   └── services/
│       └── zaloService.ts               # Zalo Bot notification helpers
├── server.ts                            # Express server (dev + production)
├── schema.sql                           # Supabase database schema
└── .env.example                         # Template biến môi trường
```

---

## 🗄️ Database Schema (Supabase)

Khởi tạo database bằng file [`schema.sql`](./schema.sql):

```bash
# Chạy trong Supabase SQL Editor hoặc CLI
psql -h your-db-host -U postgres -f schema.sql
```

Các bảng chính:
- `user_profiles` — Tài khoản CTV, Admin, Zalo Chat ID
- `appointments` — Lịch hẹn khám (đồng bộ realtime)
- `services` — Danh mục dịch vụ thẩm mỹ
- `feedbacks` — Ảnh trước/sau lâm sàng
- `cms_settings` — Cấu hình hệ thống (OneSignal, Zalo)

---

## 📄 Giấy Phép

© 2025 **Bệnh Viện Thẩm Mỹ Quốc Tế Korean Star** — All rights reserved.
