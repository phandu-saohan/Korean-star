-- ====================================================================
-- SQL SCHEMA ĐẦY ĐỦ CHO HỆ THỐNG KOREAN STAR ON SUPABASE
-- Project Reference: burmybxmzighthlusixg
-- URL: https://burmybxmzighthlusixg.supabase.co
-- ====================================================================

-- 1. BẢNG USER_PROFILES (Thông tin cá nhân & Tài khoản CTV / Admin / Kế toán / Biên tập viên)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'ctv',
  ctv_code TEXT,
  tier TEXT DEFAULT 'Bạc',
  available_balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  avatar_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  id_card_number TEXT,
  facility_name TEXT,
  zalo_chat_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm cột zalo_chat_id nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'zalo_chat_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN zalo_chat_id TEXT;
    END IF;
END $$;

-- Bật RLS & Phân quyền công khai an toàn
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read User Profiles" ON public.user_profiles;
CREATE POLICY "Public Read User Profiles" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert User Profiles" ON public.user_profiles;
CREATE POLICY "Public Insert User Profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update User Profiles" ON public.user_profiles;
CREATE POLICY "Public Update User Profiles" ON public.user_profiles FOR UPDATE USING (true);



-- 2. BẢNG CMS_SETTINGS (Cấu hình thương hiệu, Logo, Hotline, Địa chỉ & Tỷ lệ hoa hồng)
CREATE TABLE IF NOT EXISTS public.cms_settings (
  id INT PRIMARY KEY DEFAULT 1,
  hospital_name TEXT DEFAULT 'KOREAN STAR',
  logo_url TEXT,
  tagline TEXT DEFAULT 'Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7',
  hotline TEXT DEFAULT '1900 8888 - 0901 888 999',
  address TEXT DEFAULT 'Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
  base_commission_rate NUMERIC DEFAULT 15,
  auto_payout_threshold NUMERIC DEFAULT 50000000,
  system_currency TEXT DEFAULT 'VNĐ',
  one_signal_app_id TEXT,
  one_signal_api_key TEXT,
  zalo_bot_token TEXT,
  zalo_default_chat_id TEXT,
  zalo_webhook_secret TEXT,
  ctv_tiers JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_settings DISABLE ROW LEVEL SECURITY;

-- Chèn dữ liệu cấu hình mặc định nếu chưa có
INSERT INTO public.cms_settings (id, hospital_name, tagline, hotline, address, base_commission_rate, auto_payout_threshold)
VALUES (1, 'KOREAN STAR', 'Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7', '1900 8888 - 0901 888 999', 'Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội', 15, 50000000)
ON CONFLICT (id) DO NOTHING;

-- 3. BẢNG ROLE_PERMISSIONS (Ma trận vai trò & Phân quyền CRUD chi tiết cho từng vai trò)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_key TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  badge_color TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Chèn dữ liệu vai trò mặc định (Admin, CTV, Editor, Accountant)
INSERT INTO public.role_permissions (role_key, role_name, description, is_system, badge_color, permissions)
VALUES 
(
  'admin', 
  'Ban Quản Trị (Admin)', 
  'Toàn quyền quản trị hệ thống, duyệt hoa hồng và quản lý phân quyền', 
  TRUE, 
  'bg-red-500 text-white',
  '{"services":{"create":true,"read":true,"update":true,"delete":true},"crm_appointments":{"create":true,"read":true,"update":true,"delete":true},"payouts":{"create":true,"read":true,"update":true,"delete":true},"content":{"create":true,"read":true,"update":true,"delete":true},"ctv_management":{"create":true,"read":true,"update":true,"delete":true},"ai_tools":{"create":true,"read":true,"update":true,"delete":true},"system_settings":{"create":true,"read":true,"update":true,"delete":true}}'::jsonb
),
(
  'ctv', 
  'Cộng Tác Viên (CTV)', 
  'Giới thiệu khách hàng, tạo lịch hẹn CRM, xem doanh số & rút ví hoa hồng', 
  TRUE, 
  'bg-amber-500 text-slate-900 font-extrabold',
  '{"services":{"create":false,"read":true,"update":false,"delete":false},"crm_appointments":{"create":true,"read":true,"update":false,"delete":false},"payouts":{"create":true,"read":true,"update":false,"delete":false},"content":{"create":false,"read":true,"update":false,"delete":false},"ctv_management":{"create":false,"read":true,"update":false,"delete":false},"ai_tools":{"create":true,"read":true,"update":false,"delete":false},"system_settings":{"create":false,"read":false,"update":false,"delete":false}}'::jsonb
),
(
  'editor', 
  'Biên Tập Viên (Editor)', 
  'Quản lý bài viết y khoa, kho ảnh Before/After 3D & dịch vụ niêm yết', 
  TRUE, 
  'bg-purple-600 text-white',
  '{"services":{"create":true,"read":true,"update":true,"delete":false},"crm_appointments":{"create":false,"read":true,"update":false,"delete":false},"payouts":{"create":false,"read":false,"update":false,"delete":false},"content":{"create":true,"read":true,"update":true,"delete":true},"ctv_management":{"create":false,"read":true,"update":false,"delete":false},"ai_tools":{"create":true,"read":true,"update":true,"delete":false},"system_settings":{"create":false,"read":false,"update":false,"delete":false}}'::jsonb
),
(
  'accountant', 
  'Bộ Phận Kế Toán (Accountant)', 
  'Kiểm tra số dư, xác minh tài khoản ngân hàng & giải ngân VietQR 24/7', 
  TRUE, 
  'bg-emerald-600 text-white',
  '{"services":{"create":false,"read":true,"update":false,"delete":false},"crm_appointments":{"create":false,"read":true,"update":true,"delete":false},"payouts":{"create":true,"read":true,"update":true,"delete":true},"content":{"create":false,"read":true,"update":false,"delete":false},"ctv_management":{"create":false,"read":true,"update":true,"delete":false},"ai_tools":{"create":false,"read":true,"update":false,"delete":false},"system_settings":{"create":false,"read":false,"update":false,"delete":false}}'::jsonb
)
ON CONFLICT (role_key) DO NOTHING;

-- 4. BẢNG REFERRAL_LEADS (Quản lý Khách hàng do CTV giới thiệu)
CREATE TABLE IF NOT EXISTS public.referral_leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id TEXT,
  service_name TEXT,
  service_price NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  ctv_code TEXT,
  ctv_name TEXT,
  status TEXT DEFAULT 'Mới tiếp nhận',
  doctor_assigned TEXT,
  appointment_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referral_leads DISABLE ROW LEVEL SECURITY;

-- 5. BẢNG PAYOUT_REQUESTS (Quản lý Yêu cầu rút tiền & Giải ngân VietQR)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id TEXT PRIMARY KEY,
  ctv_code TEXT NOT NULL,
  ctv_name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  status TEXT DEFAULT 'Chờ kế toán kiểm tra',
  transaction_ref TEXT,
  requested_at TEXT,
  verified_by_accountant_at TEXT,
  approved_by_admin_at TEXT,
  disbursed_at TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payout_requests DISABLE ROW LEVEL SECURITY;

-- 6. BẢNG APPOINTMENT_BOOKINGS (Đặt lịch khám & phẫu thuật CRM)
CREATE TABLE IF NOT EXISTS public.appointment_bookings (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT,
  doctor_assigned TEXT,
  appointment_date TEXT,
  status TEXT DEFAULT 'Chờ xác nhận',
  notes TEXT,
  appointment_type TEXT DEFAULT 'Lịch tư vấn',
  time TEXT,
  ctv_code TEXT,
  ctv_name TEXT,
  ctv_phone TEXT,
  ctv_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  customer_media TEXT,
  customer_media_type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tìm kiếm nhanh theo ctv_user_id và status
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_ctv_user_id ON public.appointment_bookings(ctv_user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_status ON public.appointment_bookings(status);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_ctv_code ON public.appointment_bookings(ctv_code);

ALTER TABLE public.appointment_bookings DISABLE ROW LEVEL SECURITY;

-- Cập nhật cột mới cho bảng appointment_bookings nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'appointment_type') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN appointment_type TEXT DEFAULT 'Lịch tư vấn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'time') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN time TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'ctv_code') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN ctv_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'ctv_name') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN ctv_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'ctv_phone') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN ctv_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'ctv_user_id') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN ctv_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'customer_media') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN customer_media TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'customer_media_type') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN customer_media_type TEXT DEFAULT 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointment_bookings' AND column_name = 'updated_at') THEN
        ALTER TABLE public.appointment_bookings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 7. KHỞI TẠO TÀI KHOẢN ADMIN MẪU (admin@saohan.vn / Saohan@123)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  phone,
  role,
  ctv_code,
  tier,
  available_balance,
  pending_balance,
  total_revenue,
  total_commission,
  avatar_url,
  bank_name,
  account_number,
  account_holder,
  id_card_number,
  facility_name
) VALUES (
  '56496f7b-5b74-4282-83dc-eeb8f1df3dab',
  'admin@saohan.vn',
  'Nguyễn Thị B',
  '0901888999',
  'admin',
  'SAOHAN-ADMIN',
  'Kim Cương',
  0,
  0,
  0,
  0,
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'Vietcombank',
  '999988889999',
  'NGUYỄN THỊ B',
  '038099009999',
  'Bệnh Viện KOREAN STAR'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- 8. BẢNG SERVICE_FEEDBACKS (Feedback & Hình ảnh Trước/Sau Phẫu Thuật)
CREATE TABLE IF NOT EXISTS public.service_feedbacks (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  service_name TEXT,
  customer_name TEXT NOT NULL,
  customer_age TEXT,
  doctor_name TEXT,
  rating INT DEFAULT 5,
  before_image TEXT,
  after_image TEXT,
  review_text TEXT,
  treatment_details TEXT,
  recovery_days TEXT, -- Trường phục hồi (Ví dụ: 3 - 5 ngày, 5 - 7 ngày, Không nghỉ dưỡng)
  date TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_feedbacks DISABLE ROW LEVEL SECURITY;

-- Thêm cột recovery_days vào bảng service_feedbacks nếu đã tồn tại từ trước
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'service_feedbacks' 
        AND column_name = 'recovery_days'
    ) THEN
        ALTER TABLE public.service_feedbacks ADD COLUMN recovery_days TEXT;
    END IF;
END $$;

-- 9. BẢNG SERVICES (Danh mục Dịch vụ Thẩm Mỹ & Niêm Yết)
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_name TEXT,
  price NUMERIC DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 15,
  commission_amount NUMERIC DEFAULT 0,
  duration TEXT,
  recovery_time TEXT,
  description TEXT,
  image TEXT,
  before_after JSONB DEFAULT '{}'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- 10. BẢNG PROMOTIONS (Mã Ưu Đãi & Chương Trình Khuyến Mãi)
CREATE TABLE IF NOT EXISTS public.promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  discount TEXT,
  valid_until TEXT,
  service_id TEXT,
  banner_image TEXT,
  description TEXT,
  ctv_bonus_commission NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;

-- 11. BẢNG VIDEO_GUIDES (Cẩm Nang & Video Đào Tạo CTV)
CREATE TABLE IF NOT EXISTS public.video_guides (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  duration TEXT,
  thumbnail TEXT,
  video_url TEXT,
  target_audience TEXT,
  script_highlights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.video_guides DISABLE ROW LEVEL SECURITY;

-- 12. KHỞI TẠO DỮ LIỆU FEEDBACK MẪU (Bao gồm Trường Phục Hồi recovery_days)
INSERT INTO public.service_feedbacks (
  id,
  service_id,
  service_name,
  customer_name,
  customer_age,
  doctor_name,
  rating,
  before_image,
  after_image,
  review_text,
  treatment_details,
  recovery_days,
  date,
  images
) VALUES 
(
  'fb-01',
  'srv-nang-nguc-3d',
  'Nâng Ngực Nội Soi Ergonomix Nano 6D',
  'Chị Thanh Vân',
  '29 tuổi (Hà Nội)',
  'Bs. CKII Nguyễn Văn Hùng',
  5,
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  'Kết quả nâng ngực Ergonomix quá tuyệt vời, túi mềm mại tự nhiên như thật, phẫu thuật đường chân ngực giấu sẹo 99%, phục hồi cực kỳ nhanh!',
  'Nâng ngực Ergonomix 315cc, đường chân ngực giấu sẹo 99%',
  '3 - 5 ngày',
  '2026-07-28',
  '["https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80"]'::jsonb
),
(
  'fb-02',
  'srv-nang-mui-nanoform',
  'Nâng Mũi Bán Cấu Trúc NanoForm S-Line',
  'Chị Ngọc Trinh',
  '26 tuổi (TPHCM)',
  'Bs. CKI Trần Thị Mai',
  5,
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80',
  'Dáng mũi S-line mềm mại thanh thoát chuẩn tỷ lệ vàng Đông Á. Chiếu Plasma giúp vết thương khô siêu nhanh không bầm đỏ.',
  'Nâng mũi S-line sụn NanoForm kết hợp bọc đệm Megaderm',
  '5 - 7 ngày',
  '2026-07-30',
  '["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  recovery_days = EXCLUDED.recovery_days,
  treatment_details = EXCLUDED.treatment_details,
  updated_at = NOW();

-- 13. BẢNG APPOINTMENT_INVOICES (Quản Lý Doanh Thu & Hóa Đơn Phẫu Thuật)
CREATE TABLE IF NOT EXISTS public.appointment_invoices (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 15,
  commission_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Chờ cọc',
  ctv_code TEXT,
  ctv_name TEXT,
  deposit_paid_at TEXT,
  final_paid_at TEXT,
  payment_method TEXT DEFAULT 'VietQR / Chuyển khoản',
  notes TEXT,
  transfer_proof_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm cột transfer_proof_image nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_invoices' 
        AND column_name = 'transfer_proof_image'
    ) THEN
        ALTER TABLE public.appointment_invoices ADD COLUMN transfer_proof_image TEXT;
    END IF;
END $$;

ALTER TABLE public.appointment_invoices DISABLE ROW LEVEL SECURITY;

-- Index hỗ trợ tìm kiếm nhanh theo mã hóa đơn, SĐT và CTV
CREATE INDEX IF NOT EXISTS idx_appointment_invoices_customer_phone ON public.appointment_invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointment_invoices_ctv_code ON public.appointment_invoices(ctv_code);
CREATE INDEX IF NOT EXISTS idx_appointment_invoices_payment_status ON public.appointment_invoices(payment_status);

-- Bật Realtime cho bảng Hóa đơn an toàn (Idempotent safe check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'appointment_invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_invoices;
  END IF;
END $$;


