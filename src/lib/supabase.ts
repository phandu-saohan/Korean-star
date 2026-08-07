import { createClient } from "@supabase/supabase-js";

const SUPABASE_REAL_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";

const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

// Tự động kiểm tra và lọc chỉ nhận key dạng JWT (bắt đầu bằng eyJ...)
// Nếu env chứa key sai format (như sb_publishable_...), tự động fallback về JWT chuẩn.
const getValidSupabaseKey = (): string => {
  const envAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envAnon && typeof envAnon === "string" && envAnon.trim().startsWith("eyJ")) {
    return envAnon.trim();
  }

  const envPub = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (envPub && typeof envPub === "string" && envPub.trim().startsWith("eyJ")) {
    return envPub.trim();
  }

  return DEFAULT_ANON_KEY;
};

const SUPABASE_ANON_KEY = getValidSupabaseKey();

// Dùng proxy nội bộ của Express server để tránh lỗi CORS trình duyệt khi gọi REST API
const SUPABASE_PROXY_URL = (typeof window !== "undefined" ? window.location.origin : SUPABASE_REAL_URL) + "/api/supabase-proxy";

// SUPABASE_URL: dùng proxy URL trong trình duyệt, real URL giữ lại cho reference
export const SUPABASE_URL = SUPABASE_REAL_URL;
export const supabase = createClient(SUPABASE_PROXY_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  },
});

// Client Supabase Realtime (chỉ kết nối WebSocket wss:// khi môi trường bật VITE_ENABLE_REALTIME="true")
const isRealtimeEnabled = (import.meta as any).env?.VITE_ENABLE_REALTIME === "true";
export const realtimeSupabase = isRealtimeEnabled
  ? createClient(SUPABASE_REAL_URL, SUPABASE_ANON_KEY)
  : (supabase as any);

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "ctv" | "admin" | "editor" | "accountant";
  ctvCode: string;
  tier: "Bạc" | "Vàng" | "Bạch Kim" | "Kim Cương";
  availableBalance: number;
  pendingBalance: number;
  totalRevenue: number;
  totalCommission: number;
  avatarUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  idCardNumber?: string;
  facilityName?: string;
  zaloChatId?: string;
}

// 1. Sign Up (Tạo tài khoản CTV thật trên Supabase Auth & CSDL user_profiles)
export const signUpUser = async ({
  email,
  password,
  fullName,
  phone,
  role = "ctv",
  avatarUrl,
  bankName,
  bankAccount,
  idCardNumber,
  facilityName
}: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role?: "ctv" | "admin" | "editor" | "accountant";
  avatarUrl?: string;
  bankName?: string;
  bankAccount?: string;
  idCardNumber?: string;
  facilityName?: string;
}) => {
  const cleanPhone = phone.replace(/\D/g, "");
  const generatedCtvCode = `SAOHAN-${fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase()}${cleanPhone.slice(-4) || "2026"}`;

  // Call Supabase Auth signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        role: role,
        ctv_code: generatedCtvCode,
        avatar_url: avatarUrl,
        bank_name: bankName,
        account_number: bankAccount,
        id_card_number: idCardNumber,
        facility_name: facilityName
      }
    }
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      throw new Error("Email này đã được đăng ký tài khoản trên hệ thống!");
    }
    throw error;
  }

  // Insert profile record into public.user_profiles if user object exists
  const userId = data.user?.id || `user-${Date.now()}`;
  const profilePayload = {
    id: userId,
    email,
    full_name: fullName,
    phone,
    role,
    ctv_code: generatedCtvCode,
    tier: "Bạc",
    available_balance: 0,
    pending_balance: 0,
    total_revenue: 0,
    total_commission: 0,
    avatar_url: avatarUrl || "",
    bank_name: bankName || "",
    account_number: bankAccount || "",
    account_holder: fullName.toUpperCase(),
    id_card_number: idCardNumber || "",
    facility_name: facilityName || "",
    updated_at: new Date().toISOString()
  };

  await supabase.from("user_profiles").upsert(profilePayload);

  const authProfile: AuthUserProfile = {
    id: userId,
    email,
    fullName,
    phone,
    role: role as any,
    ctvCode: generatedCtvCode,
    tier: "Bạc",
    availableBalance: 0,
    pendingBalance: 0,
    totalRevenue: 0,
    totalCommission: 0,
    avatarUrl,
    bankName,
    accountNumber: bankAccount,
    accountHolder: fullName.toUpperCase(),
    idCardNumber,
    facilityName
  };
  saveRegisteredUserToLocalStorage(authProfile);

  return { user: data.user, session: data.session, profilePayload };
};

// Helper: Sync registered user to localStorage for offline/real-time user list
export const saveRegisteredUserToLocalStorage = (user: AuthUserProfile) => {
  try {
    const existingStr = localStorage.getItem("saohan_registered_users");
    const existingUsers: AuthUserProfile[] = existingStr ? JSON.parse(existingStr) : [];
    const index = existingUsers.findIndex(
      (u) => (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) || u.id === user.id
    );
    if (index >= 0) {
      existingUsers[index] = { ...existingUsers[index], ...user };
    } else {
      existingUsers.unshift(user);
    }
    localStorage.setItem("saohan_registered_users", JSON.stringify(existingUsers));

    // Sync to saohan_all_user_profiles cache as well
    const allStr = localStorage.getItem("saohan_all_user_profiles");
    const allUsers: AuthUserProfile[] = allStr ? JSON.parse(allStr) : [];
    const idx = allUsers.findIndex(
      (u) => (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) || u.id === user.id
    );
    if (idx >= 0) {
      allUsers[idx] = { ...allUsers[idx], ...user };
    } else {
      allUsers.unshift(user);
    }
    localStorage.setItem("saohan_all_user_profiles", JSON.stringify(allUsers));

    // Invalidate profile cache so next fetch gets fresh profiles
    _lastProfilesFetchTime = 0;
    _cachedProfiles = null;
  } catch (e) {
    console.error("Error saving user to localStorage:", e);
  }
};

// 2. Sign In (Đăng nhập thật bằng Email hoặc Số điện thoại qua Supabase Auth)
export const signInUser = async (emailOrPhone: string, password: string) => {
  let targetEmail = emailOrPhone.trim();

  // If user entered a Phone number instead of an Email, query Supabase for matching Email
  if (!targetEmail.includes("@")) {
    const { data: foundProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("phone", targetEmail)
      .maybeSingle();

    if (foundProfile && foundProfile.email) {
      targetEmail = foundProfile.email;
    } else {
      // Fallback domain if registered via phone shortcut
      targetEmail = `${targetEmail.replace(/\D/g, "")}@koreanstar.vn`;
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Sai Email / Số điện thoại hoặc Mật khẩu. Vui lòng kiểm tra lại!");
    } else if (error.message.includes("Email not confirmed")) {
      throw new Error("Tài khoản chưa được xác thực Email. Vui lòng kiểm tra hộp thư!");
    }
    throw error;
  }

  // Fetch full user profile from Supabase Database
  let profile: AuthUserProfile | null = null;
  if (data.user) {
    profile = await fetchUserProfile(data.user.id);
  }

  return { user: data.user, session: data.session, profile };
};

// 3. Sign Out (Đăng xuất khỏi Supabase Session)
export const signOutUser = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("[Supabase SignOut Warning]:", error);
  }
};

// 4. Reset Password (Quên mật khẩu)
export const resetUserPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw error;
  return data;
};

// 5. Fetch User Profile from Supabase DB Table (user_profiles)
export const fetchUserProfile = async (userId: string): Promise<AuthUserProfile | null> => {
  if (!userId) return null;
  try {
    let data: any = null;
    let error: any = null;

    // 1. Thử lấy dữ liệu từ bảng user_profiles
    const res1 = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    data = res1.data;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email || "",
      fullName: data.full_name || "",
      phone: data.phone || "",
      role: data.role || "ctv",
      ctvCode: data.ctv_code || "SAOHAN-CTV",
      tier: data.tier || "Bạc",
      availableBalance: Number(data.available_balance) || 0,
      pendingBalance: Number(data.pending_balance) || 0,
      totalRevenue: Number(data.total_revenue) || 0,
      totalCommission: Number(data.total_commission) || 0,
      avatarUrl: data.avatar_url,
      bankName: data.bank_name,
      accountNumber: data.account_number,
      accountHolder: data.account_holder,
      idCardNumber: data.id_card_number,
      facilityName: data.facility_name,
      zaloChatId: data.zalo_chat_id
    };
  } catch {
    return null;
  }
};

// Memory Cache Variables to prevent repetitive network spam on 520 / CORS errors
let _cachedProfiles: AuthUserProfile[] | null = null;
let _lastProfilesFetchTime = 0;

let _cachedCmsSettings: any = null;
let _lastCmsFetchTime = 0;

const FETCH_COOLDOWN_MS = 30000; // 30 seconds TTL cache

// 5b. Fetch All User Profiles from Supabase DB Table (user_profiles)
export const fetchAllUserProfilesFromSupabase = async (forceRefresh = false): Promise<AuthUserProfile[]> => {
  const now = Date.now();
  if (!forceRefresh && (now - _lastProfilesFetchTime < FETCH_COOLDOWN_MS)) {
    return _cachedProfiles || [];
  }

  _lastProfilesFetchTime = now; // Lock network requests for 30s

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && Array.isArray(data) && data.length > 0) {
      const mappedProfiles: AuthUserProfile[] = data.map((d: any) => ({
        id: d.id,
        email: d.email || "",
        fullName: d.full_name || "",
        phone: d.phone || "",
        role: d.role || "ctv",
        ctvCode: d.ctv_code || "SAOHAN-CTV",
        tier: d.tier || "Bạc",
        availableBalance: Number(d.available_balance) || 0,
        pendingBalance: Number(d.pending_balance) || 0,
        totalRevenue: Number(d.total_revenue) || 0,
        totalCommission: Number(d.total_commission) || 0,
        avatarUrl: d.avatar_url,
        bankName: d.bank_name,
        accountNumber: d.account_number,
        accountHolder: d.account_holder,
        idCardNumber: d.id_card_number,
        facilityName: d.facility_name,
        zaloChatId: d.zalo_chat_id
      }));

      _cachedProfiles = mappedProfiles;

      // Cache to localStorage
      try {
        localStorage.setItem("saohan_all_user_profiles", JSON.stringify(mappedProfiles));
      } catch (e) {}

      return mappedProfiles;
    }
  } catch (err) {
    // Network / CORS / HTTP 520 / Paused Supabase Project Error
  }

  // Local Storage Fallback when Supabase is unreachable/paused or returning 520
  try {
    const saved = localStorage.getItem("saohan_all_user_profiles");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _cachedProfiles = parsed;
        return parsed;
      }
    }

    const savedAuth = localStorage.getItem("saohan_auth_user");
    if (savedAuth) {
      const parsedAuth = JSON.parse(savedAuth);
      if (parsedAuth && parsedAuth.id) {
        _cachedProfiles = [parsedAuth];
        return [parsedAuth];
      }
    }
  } catch (e) {}

  if (!_cachedProfiles) _cachedProfiles = [];
  return _cachedProfiles;
};

// 6. Update User Profile on Supabase DB Table (user_profiles)
export const updateUserProfile = async (
  userId: string,
  updates: Partial<AuthUserProfile>
) => {
  const payload: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
  if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
  if (updates.accountHolder !== undefined) payload.account_holder = updates.accountHolder;
  if (updates.idCardNumber !== undefined) payload.id_card_number = updates.idCardNumber;
  if (updates.facilityName !== undefined) payload.facility_name = updates.facilityName;
  if (updates.zaloChatId !== undefined) payload.zalo_chat_id = updates.zaloChatId;

  await supabase.from("user_profiles").update(payload).eq("id", userId);

  // Xóa cache để lượt truy vấn tiếp theo lấy trực tiếp zaloChatId mới từ Supabase
  _lastProfilesFetchTime = 0;
  _cachedProfiles = null;
};

// 7. Delete User Profile from Supabase DB (user_profiles)
export const deleteUserProfileFromSupabase = async (userId: string) => {
  await supabase.from("user_profiles").delete().eq("id", userId);
};

// 8. Fetch Role Permissions Matrix from Supabase DB
export const fetchRolePermissionsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*");

    if (error || !data || data.length === 0) return null;

    return data.map((d: any) => ({
      id: `role-${d.role_key}`,
      roleKey: d.role_key,
      roleName: d.role_name,
      description: d.description || "",
      isSystem: Boolean(d.is_system),
      badgeColor: d.badge_color || "bg-[#0B192C] text-white",
      permissions: typeof d.permissions === "string" ? JSON.parse(d.permissions) : d.permissions || {}
    }));
  } catch (err) {
    return null;
  }
};

// 9. Save/Upsert Role Permissions Matrix to Supabase DB (with RLS error handling)
export const saveRolePermissionsToSupabase = async (roles: any[]) => {
  try {
    const payload = roles.map((r) => ({
      role_key: r.roleKey,
      role_name: r.roleName,
      description: r.description,
      is_system: r.isSystem,
      badge_color: r.badgeColor,
      permissions: r.permissions,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("role_permissions")
      .upsert(payload, { onConflict: "role_key" });

    if (error) {
      return false;
    }
    return true;
  } catch (err: any) {
    return false;
  }
};

// 10. Delete Custom Role Permission from Supabase DB
export const deleteRolePermissionFromSupabase = async (roleKey: string) => {
  const { error } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_key", roleKey);

  if (error) {
    console.error("Error deleting role permission from Supabase:", error.message);
    throw error;
  }
};

// 11. Fetch CMS Brand Settings from Supabase DB
export const fetchCmsSettingsFromSupabase = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && (now - _lastCmsFetchTime < FETCH_COOLDOWN_MS)) {
    return _cachedCmsSettings || {
      hospitalName: "KOREAN STAR",
      logoUrl: "",
      tagline: "Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7",
      hotline: "1900 8888 - 0901 888 999",
      address: "Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội",
      baseCommissionRate: 15,
      autoPayoutThreshold: 50000000,
      systemCurrency: "VNĐ",
      oneSignalAppId: "f1f45c7b-fe36-4640-b117-a64cc8fab436",
      oneSignalApiKey: "",
      oneSignalEnabled: true,
      zaloBotToken: "",
      zaloDefaultChatId: "",
      zaloWebhookSecret: "",
      ctvTiers: null
    };
  }

  _lastCmsFetchTime = now; // Lock network requests for 30s

  try {
    const { data, error } = await supabase
      .from("cms_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (data) {
      const settings = {
        hospitalName: data.hospital_name || "KOREAN STAR",
        logoUrl: data.logo_url || "",
        tagline: data.tagline || "",
        hotline: data.hotline || "",
        address: data.address || "",
        baseCommissionRate: Number(data.base_commission_rate) || 15,
        autoPayoutThreshold: Number(data.auto_payout_threshold) || 50000000,
        systemCurrency: data.system_currency || "VNĐ",
        oneSignalAppId: data.one_signal_app_id || "",
        oneSignalApiKey: data.one_signal_api_key || "",
        oneSignalEnabled: data.one_signal_enabled !== false,
        zaloBotToken: data.zalo_bot_token || "",
        zaloDefaultChatId: data.zalo_default_chat_id || "",
        zaloWebhookSecret: data.zalo_webhook_secret || "",
        ctvTiers: data.ctv_tiers || null
      };

      _cachedCmsSettings = settings;

      try {
        localStorage.setItem("saohan_cms_settings", JSON.stringify(settings));
      } catch (e) {}

      return settings;
    }
  } catch (err) {
    // Network / CORS / HTTP 520 / Paused Supabase Project Error
  }

  // Fallback to localStorage when Supabase is unreachable/paused or CORS blocked
  try {
    const saved = localStorage.getItem("saohan_cms_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      _cachedCmsSettings = parsed;
      return parsed;
    }
  } catch (e) {}

  if (!_cachedCmsSettings) {
    _cachedCmsSettings = {
      hospitalName: "KOREAN STAR",
      logoUrl: "",
      tagline: "Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7",
      hotline: "1900 8888 - 0901 888 999",
      address: "Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội",
      baseCommissionRate: 15,
      autoPayoutThreshold: 50000000,
      systemCurrency: "VNĐ",
      oneSignalAppId: "f1f45c7b-fe36-4640-b117-a64cc8fab436",
      oneSignalApiKey: "",
      oneSignalEnabled: true,
      zaloBotToken: "",
      zaloDefaultChatId: "",
      zaloWebhookSecret: "",
      ctvTiers: null
    };
  }

  return _cachedCmsSettings;
};

// 12. Save CMS Brand Settings to Supabase DB
export const saveCmsSettingsToSupabase = async (settings: any) => {
  const payload: any = {
    id: 1,
    hospital_name: settings.hospitalName,
    logo_url: settings.logoUrl,
    tagline: settings.tagline,
    hotline: settings.hotline,
    address: settings.address,
    base_commission_rate: settings.baseCommissionRate,
    auto_payout_threshold: settings.autoPayoutThreshold,
    system_currency: settings.systemCurrency || "VNĐ",
    one_signal_app_id: settings.oneSignalAppId || "",
    one_signal_api_key: settings.oneSignalApiKey || "",
    one_signal_enabled: settings.oneSignalEnabled !== false,
    zalo_bot_token: settings.zaloBotToken || "",
    zalo_default_chat_id: settings.zaloDefaultChatId || "",
    zalo_webhook_secret: settings.zaloWebhookSecret || "",
    updated_at: new Date().toISOString()
  };

  if (settings.ctvTiers) {
    payload.ctv_tiers = settings.ctvTiers;
  }

  try {
    const { error } = await supabase
      .from("cms_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("Supabase upsert notice (fallback to local):", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase upsert exception (fallback to local):", err);
  }
};

// 13. Fetch Services from Supabase DB Table (services)
export const fetchServicesFromSupabase = async (): Promise<any[] | null> => {
  try {
    const { data, error } = await supabase.from("services").select("*");
    if (error || !data || data.length === 0) return null;

    return data.map((d: any) => ({
      id: d.id,
      name: d.name || "",
      category: d.category || "phau-thuat",
      categoryName: d.category_name || "Phẫu Thuật Thẩm Mỹ",
      price: Number(d.price) || 0,
      originalPrice: Number(d.original_price) || 0,
      commissionRate: Number(d.commission_rate) || 15,
      commissionAmount: Number(d.commission_amount) || 0,
      duration: d.duration || "90 phút",
      recoveryTime: d.recovery_time || "7 ngày",
      description: d.description || "",
      image: d.image || "",
      beforeAfter: typeof d.before_after === "string" ? JSON.parse(d.before_after) : d.before_after || {
        before: "",
        after: "",
        customerAge: "",
        treatmentDetails: ""
      },
      features: Array.isArray(d.features) ? d.features : typeof d.features === "string" ? JSON.parse(d.features) : [],
      isPopular: Boolean(d.is_popular)
    }));
  } catch (err) {
    console.error("[Supabase] Lỗi fetch services:", err);
    return null;
  }
};



// 14. Save/Upsert Service to Supabase DB Table (services)
export const saveServiceToSupabase = async (service: any) => {
  try {
    const payload = {
      id: service.id,
      name: service.name,
      category: service.category,
      category_name: service.categoryName,
      price: service.price,
      original_price: service.originalPrice,
      commission_rate: service.commissionRate,
      commission_amount: service.commissionAmount,
      duration: service.duration,
      recovery_time: service.recoveryTime,
      description: service.description,
      image: service.image,
      before_after: service.beforeAfter,
      features: service.features,
      is_popular: service.isPopular || false,
      updated_at: new Date().toISOString()
    };

    await supabase.from("services").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.error("Error saving service to Supabase:", err);
  }
};

// 15. Delete Service from Supabase DB Table (services)
export const deleteServiceFromSupabase = async (serviceId: string) => {
  try {
    await supabase.from("services").delete().eq("id", serviceId);
  } catch (err) {
    console.error("Error deleting service from Supabase:", err);
  }
};

// 16. Fetch Feedbacks from Supabase DB Table (service_feedbacks)
export const fetchFeedbacksFromSupabase = async (): Promise<any[] | null> => {
  try {
    const { data, error } = await supabase.from("service_feedbacks").select("*");
    if (error || !data || data.length === 0) return null;

    return data.map((d: any) => ({
      id: d.id,
      serviceId: d.service_id || "srv-1",
      serviceName: d.service_name || "Dịch Vụ KOREAN STAR",
      customerName: d.customer_name || "Khách Hàng",
      customerAge: d.customer_age || "25-35 tuổi",
      doctorName: d.doctor_name || "ThS.BS Chuyên Khoa I",
      rating: Number(d.rating) || 5,
      beforeImage: d.before_image || "",
      afterImage: d.after_image || "",
      reviewText: d.review_text || "",
      treatmentDetails: d.treatment_details || "",
      recoveryDays: d.recovery_days || "3-5 ngày",
      date: d.date || "Vừa xong",
      images: Array.isArray(d.images) ? d.images : typeof d.images === "string" ? JSON.parse(d.images) : []
    }));
  } catch (err) {
    console.error("[Supabase] Lỗi ngoại lệ khi fetch feedbacks:", err);
    return null;
  }
};

// 17. Save/Upsert Feedback to Supabase DB Table (service_feedbacks)
export const saveFeedbackToSupabase = async (feedback: any) => {
  try {
    const payload = {
      id: feedback.id,
      service_id: feedback.serviceId,
      service_name: feedback.serviceName,
      customer_name: feedback.customerName,
      customer_age: feedback.customerAge,
      doctor_name: feedback.doctorName,
      rating: feedback.rating,
      before_image: feedback.beforeImage,
      after_image: feedback.afterImage,
      review_text: feedback.reviewText,
      treatment_details: feedback.treatmentDetails,
      recovery_days: feedback.recoveryDays,
      date: feedback.date,
      images: feedback.images || [],
      updated_at: new Date().toISOString()
    };

    await supabase.from("service_feedbacks").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.error("Error saving feedback to Supabase:", err);
  }
};

// 18. Delete Feedback from Supabase DB Table (service_feedbacks)
export const deleteFeedbackFromSupabase = async (feedbackId: string) => {
  try {
    await supabase.from("service_feedbacks").delete().eq("id", feedbackId);
  } catch (err) {
    console.error("Error deleting feedback from Supabase:", err);
  }
};

// 19. Fetch All Appointments from Supabase DB Table (appointment_bookings)
export const fetchAppointmentsFromSupabase = async (): Promise<any[] | null> => {
  try {
    let { data, error } = await supabase
      .from("appointment_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    // Fallback nếu CSDL Supabase chưa có cột created_at hoặc đang reload schema cache
    if (error) {
      const res = await supabase.from("appointment_bookings").select("*");
      data = res.data;
      error = res.error;
    }

    if (error || !data) {
      return null;
    }

    return data.map((d: any) => ({
      id: d.id,
      customerName: d.customer_name || "",
      customerPhone: d.customer_phone || "",
      serviceName: d.service_name || "",
      doctorName: d.doctor_assigned || "",
      date: d.appointment_date || "",
      time: d.time || "09:00 AM",
      status: d.status || "Chờ xác nhận",
      appointmentType: d.appointment_type || "Lịch tư vấn",
      notes: d.notes || "",
      ctvCode: d.ctv_code || "",
      ctvName: d.ctv_name || "",
      ctvPhone: d.ctv_phone || "",
      ctvId: d.ctv_user_id || "",
      customerMedia: d.customer_media || "",
      customerMediaType: d.customer_media_type || "image"
    }));
  } catch (err) {
    return null;
  }
};

// 20. Save/Upsert Appointment to Supabase DB Table (appointment_bookings)
export const saveAppointmentToSupabase = async (apt: any) => {
  try {
    const ctvUserId = apt.ctvId || apt.userId || null;

    // Tự động bảo đảm profile của CTV đã tồn tại trên Supabase để không vi phạm Foreign Key Constraint (23503)
    if (ctvUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctvUserId)) {
      try {
        await supabase.from("user_profiles").upsert(
          {
            id: ctvUserId,
            full_name: apt.ctvName || "CTV",
            phone: apt.ctvPhone || "",
            ctv_code: apt.ctvCode || "SAOHAN-CTV",
            role: "ctv"
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
      } catch (e) {
        // Ignored
      }
    }

    // Rút gọn base64 media quá lớn để tránh lỗi 400/413 từ PostgREST
    let mediaUrl = apt.customerMedia || "";
    if (mediaUrl.length > 200000) {
      mediaUrl = mediaUrl.startsWith("data:") ? mediaUrl.slice(0, 100) + "..." : mediaUrl;
    }

    // 1. Full Payload: chứa đầy đủ thông tin CTV (bao gồm ctv_user_id UUID & updated_at)
    const fullPayload: any = {
      id: apt.id,
      customer_name: apt.customerName,
      customer_phone: apt.customerPhone,
      service_name: apt.serviceName,
      doctor_assigned: apt.doctorName,
      appointment_date: apt.date,
      status: apt.status,
      appointment_type: apt.appointmentType || "Lịch tư vấn",
      notes: apt.notes || "",
      time: apt.time || "",
      ctv_code: apt.ctvCode || "",
      ctv_name: apt.ctvName || "",
      ctv_phone: apt.ctvPhone || "",
      customer_media: mediaUrl,
      customer_media_type: apt.customerMediaType || "image",
      updated_at: new Date().toISOString()
    };

    if (ctvUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctvUserId)) {
      fullPayload.ctv_user_id = ctvUserId;
    }

    let { error } = await supabase
      .from("appointment_bookings")
      .upsert(fullPayload, { onConflict: "id" });

    // 2. Fallback Mid Payload: nếu CSDL chưa có ctv_user_id hoặc FK thất bại, lưu đầy đủ dạng string
    if (error) {
      console.warn("[Supabase] Retry saving appointment with mid payload (without ctv_user_id/updated_at):", error.message);
      const midPayload: any = {
        id: apt.id,
        customer_name: apt.customerName,
        customer_phone: apt.customerPhone,
        service_name: apt.serviceName,
        doctor_assigned: apt.doctorName,
        appointment_date: apt.date,
        status: apt.status,
        appointment_type: apt.appointmentType || "Lịch tư vấn",
        notes: apt.notes || "",
        time: apt.time || "",
        ctv_code: apt.ctvCode || "",
        ctv_name: apt.ctvName || "",
        ctv_phone: apt.ctvPhone || ""
      };

      const resMid = await supabase.from("appointment_bookings").upsert(midPayload, { onConflict: "id" });
      
      // 3. Fallback Core Payload: nếu CSDL là bản rất cũ, lưu các trường cơ bản nhất
      if (resMid.error) {
        console.warn("[Supabase] Retry saving appointment with core payload:", resMid.error.message);
        const corePayload: any = {
          id: apt.id,
          customer_name: apt.customerName,
          customer_phone: apt.customerPhone,
          service_name: apt.serviceName,
          doctor_assigned: apt.doctorName,
          appointment_date: apt.date,
          status: apt.status,
          notes: apt.notes || "",
          ctv_code: apt.ctvCode || "",
          ctv_name: apt.ctvName || "",
          ctv_phone: apt.ctvPhone || ""
        };

        const resCore = await supabase.from("appointment_bookings").upsert(corePayload, { onConflict: "id" });

        // 4. Fallback Minimal Payload: chỉ lưu thông tin bắt buộc
        if (resCore.error) {
          console.warn("[Supabase] Retry saving appointment with minimal payload:", resCore.error.message);
          const minPayload = {
            id: apt.id,
            customer_name: apt.customerName,
            customer_phone: apt.customerPhone
          };
          const resMin = await supabase.from("appointment_bookings").upsert(minPayload, { onConflict: "id" });
          if (resMin.error) {
            console.error("[Supabase] Lỗi lưu appointment minimal payload:", resMin.error.message);
          } else {
            console.log(`[Supabase] Đã lưu appointment ${apt.id} thành công! (minimal payload)`);
          }
        } else {
          console.log(`[Supabase] Đã lưu appointment ${apt.id} kèm Mã/Tên CTV ${apt.ctvCode} thành công! (core payload)`);
        }
      } else {
        console.log(`[Supabase] Đã lưu appointment ${apt.id} kèm Mã/Tên CTV ${apt.ctvCode} thành công! (mid payload)`);
      }
    } else {
      console.log(`[Supabase] Đã lưu appointment ${apt.id} kèm ctv_user_id thành công! (full payload)`);
    }
  } catch (err) {
    console.error("[Supabase] Lỗi lưu appointment:", err);
  }
};

// 21. Update Appointment Status in Supabase DB Table (appointment_bookings)
export const updateAppointmentStatusInSupabase = async (id: string, status: string) => {
  if (!id) return;
  try {
    const { error } = await supabase
      .from("appointment_bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("[Supabase] Retry update status without updated_at:", error.message);
      await supabase.from("appointment_bookings").update({ status }).eq("id", id);
    } else {
      console.log(`[Supabase] Cập nhật trạng thái appointment ${id} → ${status} thành công`);
    }
  } catch (err) {
    console.error("[Supabase] Lỗi cập nhật trạng thái appointment:", err);
  }
};

// 22. Delete Appointment from Supabase DB Table (appointment_bookings)
export const deleteAppointmentFromSupabase = async (id: string) => {
  if (!id) return;
  try {
    const { error } = await supabase
      .from("appointment_bookings")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("[Supabase] Lỗi khi xóa appointment:", error.message);
    } else {
      console.log(`[Supabase] Đã xóa lịch hẹn ${id} thành công!`);
    }
  } catch (err) {
    console.error("[Supabase] Lỗi ngoại lệ khi xóa appointment:", err);
  }
};


