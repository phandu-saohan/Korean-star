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



-- 2. BẢNG CMS_SETTINGS (Cấu hình thương hiệu, Logo PWA, Hotline, Địa chỉ & Tỷ lệ hoa hồng)
CREATE TABLE IF NOT EXISTS public.cms_settings (
  id INT PRIMARY KEY DEFAULT 1,
  hospital_name TEXT DEFAULT 'KOREAN STAR',
  logo_url TEXT,
  pwa_logo_url TEXT,
  pwa_app_name TEXT DEFAULT 'KOREAN STAR - Hệ Thống CTV & Thẩm Mỹ',
  pwa_short_name TEXT DEFAULT 'KOREAN STAR',
  pwa_theme_color TEXT DEFAULT '#F59E0B',
  pwa_bg_color TEXT DEFAULT '#0B192C',
  pwa_description TEXT DEFAULT 'Hệ thống quản lý Cộng tác viên & Đặt lịch dịch vụ thẩm mỹ KOREAN STAR 24/7',
  pwa_enable_install_prompt BOOLEAN DEFAULT TRUE,
  tagline TEXT DEFAULT 'Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7',
  hotline TEXT DEFAULT '1900 8888 - 0901 888 999',
  zalo_support TEXT DEFAULT '0901 888 999',
  email_support TEXT DEFAULT 'cskh@koreanstar.vn',
  address TEXT DEFAULT 'Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
  base_commission_rate NUMERIC DEFAULT 15,
  min_payout_amount NUMERIC DEFAULT 100000,
  max_single_payout NUMERIC DEFAULT 100000000,
  auto_payout_threshold NUMERIC DEFAULT 50000000,
  payout_ref_prefix TEXT DEFAULT 'KS-PAY-',
  system_currency TEXT DEFAULT 'VNĐ',
  one_signal_app_id TEXT,
  one_signal_api_key TEXT,
  zalo_bot_token TEXT,
  zalo_default_chat_id TEXT,
  zalo_webhook_secret TEXT,
  ctv_tiers JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm các cột PWA và Tài chính nếu chưa có trong public.cms_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_logo_url') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_app_name') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_app_name TEXT DEFAULT 'KOREAN STAR - Hệ Thống CTV & Thẩm Mỹ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_short_name') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_short_name TEXT DEFAULT 'KOREAN STAR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_theme_color') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_theme_color TEXT DEFAULT '#F59E0B';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_bg_color') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_bg_color TEXT DEFAULT '#0B192C';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_description') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_description TEXT DEFAULT 'Hệ thống quản lý Cộng tác viên & Đặt lịch dịch vụ thẩm mỹ KOREAN STAR 24/7';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'pwa_enable_install_prompt') THEN
        ALTER TABLE public.cms_settings ADD COLUMN pwa_enable_install_prompt BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'min_payout_amount') THEN
        ALTER TABLE public.cms_settings ADD COLUMN min_payout_amount NUMERIC DEFAULT 100000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'max_single_payout') THEN
        ALTER TABLE public.cms_settings ADD COLUMN max_single_payout NUMERIC DEFAULT 100000000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'payout_ref_prefix') THEN
        ALTER TABLE public.cms_settings ADD COLUMN payout_ref_prefix TEXT DEFAULT 'KS-PAY-';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'zalo_support') THEN
        ALTER TABLE public.cms_settings ADD COLUMN zalo_support TEXT DEFAULT '0901 888 999';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'email_support') THEN
        ALTER TABLE public.cms_settings ADD COLUMN email_support TEXT DEFAULT 'cskh@koreanstar.vn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'zalo_oa_app_id') THEN
        ALTER TABLE public.cms_settings ADD COLUMN zalo_oa_app_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'zalo_oa_secret_key') THEN
        ALTER TABLE public.cms_settings ADD COLUMN zalo_oa_secret_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'zalo_oa_access_token') THEN
        ALTER TABLE public.cms_settings ADD COLUMN zalo_oa_access_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cms_settings' AND column_name = 'zalo_oa_refresh_token') THEN
        ALTER TABLE public.cms_settings ADD COLUMN zalo_oa_refresh_token TEXT;
    END IF;
END $$;

ALTER TABLE public.cms_settings DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- BẢNG LƯU MÃ ĐỊNH DANH LIÊN KẾT ZALO OA (zalo_linking_codes)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zalo_linking_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    ctv_code TEXT,
    phone TEXT,
    code TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.zalo_linking_codes DISABLE ROW LEVEL SECURITY;

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
  proof_image TEXT,
  rejected_reason TEXT,
  requested_at TEXT,
  verified_by_accountant_at TEXT,
  approved_by_admin_at TEXT,
  disbursed_at TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm các cột bổ sung nếu chưa có cho bảng payout_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'proof_image') THEN
        ALTER TABLE public.payout_requests ADD COLUMN proof_image TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'rejected_reason') THEN
        ALTER TABLE public.payout_requests ADD COLUMN rejected_reason TEXT;
    END IF;
END $$;

-- Index cho bảng payout_requests
CREATE INDEX IF NOT EXISTS idx_payout_requests_ctv_code ON public.payout_requests(ctv_code);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- Bật Realtime cho bảng Payout Requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payout_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
  END IF;
END $$;

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


-- ====================================================================
-- MIGRATION v2.1 — THÊM VAI TRÒ TRƯỞNG NHÓM CTV (team_leader)
-- Ngày: 2026-08-08
-- Mô tả: Bổ sung cấu trúc nhóm CTV, phân quyền Trưởng nhóm và bảng
--        quản lý yêu cầu chuyển doanh số từ CTV lên Trưởng nhóm.
-- ====================================================================

-- M1. Thêm cột nhóm vào bảng user_profiles (idempotent)
DO $$
BEGIN
    -- team_leader_id: Mã ctv_code của Trưởng nhóm quản lý CTV này
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'team_leader_id'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN team_leader_id TEXT;
        COMMENT ON COLUMN public.user_profiles.team_leader_id
          IS 'Mã CTV (ctv_code) của Trưởng nhóm quản lý CTV này. NULL = chưa thuộc nhóm.';
    END IF;

    -- team_name: Tên nhóm CTV
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'team_name'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN team_name TEXT;
        COMMENT ON COLUMN public.user_profiles.team_name
          IS 'Tên nhóm CTV mà user này thuộc về (lưu cho tiện hiển thị).';
    END IF;
END $$;

-- M2. Index tìm kiếm nhóm nhanh
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_leader_id
  ON public.user_profiles(team_leader_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON public.user_profiles(role);

-- M3. Thêm vai trò team_leader vào bảng role_permissions
INSERT INTO public.role_permissions (role_key, role_name, description, is_system, badge_color, permissions)
VALUES (
  'team_leader',
  'Trưởng Nhóm CTV',
  'Quản lý nhóm CTV trực thuộc, xem doanh số nhóm và duyệt chuyển doanh số từ CTV thành viên',
  TRUE,
  'bg-blue-700 text-white',
  '{
    "services":         {"create":false,"read":true, "update":false,"delete":false},
    "crm_appointments": {"create":true, "read":true, "update":false,"delete":false},
    "payouts":          {"create":true, "read":true, "update":false,"delete":false},
    "content":          {"create":false,"read":true, "update":false,"delete":false},
    "ctv_management":   {"create":false,"read":true, "update":false,"delete":false},
    "ai_tools":         {"create":true, "read":true, "update":false,"delete":false},
    "system_settings":  {"create":false,"read":false,"update":false,"delete":false},
    "team_management":  {"create":true, "read":true, "update":true, "delete":false}
  }'::jsonb
)
ON CONFLICT (role_key) DO UPDATE SET
  role_name   = EXCLUDED.role_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at  = NOW();

-- M4. Bảng TEAM_REVENUE_TRANSFERS (Yêu cầu chuyển doanh số từ CTV lên Trưởng nhóm)
CREATE TABLE IF NOT EXISTS public.team_revenue_transfers (
  id                TEXT        PRIMARY KEY,
  from_ctv_code     TEXT        NOT NULL,
  from_ctv_name     TEXT        NOT NULL,
  to_leader_code    TEXT        NOT NULL,
  to_leader_name    TEXT,
  amount            NUMERIC     NOT NULL DEFAULT 0,
  commission        NUMERIC     NOT NULL DEFAULT 0,
  service_name      TEXT        NOT NULL,
  note              TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending',
  transferred_at    TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.team_revenue_transfers IS
  'Yêu cầu CTV thành viên chuyển doanh số/hoa hồng lên Trưởng nhóm để tổng hợp doanh số nhóm.';

-- Index bảng transfers
CREATE INDEX IF NOT EXISTS idx_team_transfers_to_leader
  ON public.team_revenue_transfers(to_leader_code);

CREATE INDEX IF NOT EXISTS idx_team_transfers_from_ctv
  ON public.team_revenue_transfers(from_ctv_code);

CREATE INDEX IF NOT EXISTS idx_team_transfers_status
  ON public.team_revenue_transfers(status);

-- Bật Realtime cho bảng team_revenue_transfers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
    AND   schemaname = 'public'
    AND   tablename  = 'team_revenue_transfers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_revenue_transfers;
  END IF;
END $$;

ALTER TABLE public.team_revenue_transfers DISABLE ROW LEVEL SECURITY;

-- M5. View tổng hợp doanh số nhóm theo Trưởng nhóm
CREATE OR REPLACE VIEW public.v_team_stats AS
SELECT
  leader.ctv_code                             AS leader_code,
  leader.full_name                            AS leader_name,
  leader.team_name,
  COUNT(member.id)                            AS member_count,
  COALESCE(SUM(member.total_revenue), 0)      AS team_total_revenue,
  COALESCE(SUM(member.total_commission), 0)   AS team_total_commission,
  COALESCE(SUM(member.available_balance), 0)  AS team_available_balance
FROM public.user_profiles leader
LEFT JOIN public.user_profiles member
  ON member.team_leader_id = leader.ctv_code
WHERE leader.role = 'team_leader'
GROUP BY leader.ctv_code, leader.full_name, leader.team_name;

COMMENT ON VIEW public.v_team_stats IS
  'Tổng hợp doanh số, hoa hồng và số thành viên theo từng Trưởng nhóm CTV.';

-- M6. View danh sách yêu cầu chuyển doanh số đang chờ duyệt
CREATE OR REPLACE VIEW public.v_pending_transfers AS
SELECT
  t.*,
  leader.full_name AS leader_full_name,
  leader.phone     AS leader_phone
FROM public.team_revenue_transfers t
JOIN public.user_profiles leader
  ON leader.ctv_code = t.to_leader_code
WHERE t.status = 'pending'
ORDER BY t.created_at DESC;

COMMENT ON VIEW public.v_pending_transfers IS
  'Danh sách yêu cầu chuyển doanh số đang chờ Trưởng nhóm duyệt.';
