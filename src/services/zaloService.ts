// src/services/zaloService.ts
import { fetchAllUserProfilesFromSupabase, fetchCmsSettingsFromSupabase } from "../lib/supabase";

export interface SendMessagePayload {
  chatId: string;
  text: string;
  parseMode?: 'markdown' | 'html';
}

export interface ZaloApiResponse {
  ok: boolean;
  error?: number;
  message?: string;
  result?: {
    message_id: string;
    date: number;
  };
  data?: any;
  description?: string;
  error_code?: number;
  raw?: any;
}

/**
 * Lấy Zalo Bot Token & Default Admin Chat ID từ LocalStorage / Supabase / Env
 */
export async function getZaloBotConfig(): Promise<{ botToken: string; defaultChatId: string }> {
  let botToken = "";
  let defaultChatId = "";

  // 1. Kiểm tra localStorage saohan_cms_settings
  if (typeof window !== "undefined") {
    const savedSettings = localStorage.getItem("saohan_cms_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        botToken = parsed.zaloOaAccessToken || parsed.zaloBotToken || "";
        defaultChatId = parsed.zaloDefaultChatId || "";
      } catch (e) {}
    }
  }

  // 2. Fallback sang Supabase cms_settings nếu chưa lưu ở local
  if (!botToken || !defaultChatId) {
    try {
      const cms = await fetchCmsSettingsFromSupabase();
      if (cms) {
        if (!botToken) botToken = cms.zalo_oa_access_token || cms.zaloOaAccessToken || cms.zaloBotToken || "";
        if (!defaultChatId) defaultChatId = cms.zaloDefaultChatId || "";
      }
    } catch (e) {}
  }

  // 3. Nếu vẫn chưa có Token, thử tự động gọi Refresh Token từ Refresh Token Zalo OA
  if (!botToken) {
    try {
      const refreshed = await refreshZaloOaAccessToken();
      if (refreshed.ok && refreshed.accessToken) {
        botToken = refreshed.accessToken;
      }
    } catch (e) {}
  }

  // 4. Fallback sang Environment variables
  if (!botToken) {
    botToken =
      (import.meta as any).env?.VITE_ZALO_BOT_TOKEN ||
      (process as any).env?.REACT_APP_ZALO_BOT_TOKEN ||
      (process as any).env?.ZALO_BOT_TOKEN ||
      "";
  }

  return { botToken: botToken.trim(), defaultChatId: defaultChatId.trim() };
}

/**
 * Lấy Zalo App ID (Mã Ứng dụng Zalo) dùng cho Zalo Social Login / OAuth
 */
export async function getZaloAppId(): Promise<string> {
  let appId = (import.meta as any).env?.VITE_ZALO_APP_ID || "";

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("saohan_cms_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.zaloOaAppId && parsed.zaloOaAppId !== "2715919749071666693") {
          appId = parsed.zaloOaAppId;
        }
      } catch (e) {}
    }
  }

  if (!appId || appId === "2715919749071666693") {
    try {
      const cms = await fetchCmsSettingsFromSupabase();
      if (cms?.zaloOaAppId && cms.zaloOaAppId !== "2715919749071666693") {
        appId = cms.zaloOaAppId;
      }
    } catch (e) {}
  }

  return (appId || "").trim();
}

/**
 * Gửi tin nhắn Zalo thông qua proxy server (tránh lỗi CORS khi gọi trực tiếp từ trình duyệt)
 */
export async function sendZaloMessage(
  payload: SendMessagePayload,
  botToken: string
): Promise<ZaloApiResponse> {
  const proxyEndpoint = `/api/zalo/send-message`;

  try {
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botToken,
        chatId: payload.chatId,
        text: payload.text,
        parseMode: payload.parseMode || 'markdown',
      }),
    });

    const rawData: any = await response.json();
    const isSuccess = rawData.ok === true || rawData.error === 0;
    const description = rawData.description || rawData.message || (isSuccess ? "Thành công" : `Lỗi Zalo (Mã: ${rawData.error ?? rawData.error_code})`);

    return {
      ok: isSuccess,
      error: rawData.error,
      error_code: rawData.error_code ?? rawData.error,
      message: rawData.message,
      description,
      data: rawData.data,
      result: rawData.result,
      raw: rawData,
    };
  } catch (err: any) {
    return {
      ok: false,
      error_code: 500,
      description: err.message || 'Lỗi kết nối đến server proxy khi gọi Zalo API sendMessage'
    };
  }
}

/**
 * Tự động gọi API lấy Access Token mới từ Refresh Token sau 24h (Zalo OA OAuth v4)
 */
export async function refreshZaloOaAccessToken(credentials?: {
  appId?: string;
  secretKey?: string;
  refreshToken?: string;
}): Promise<{ ok: boolean; accessToken?: string; refreshToken?: string; description?: string }> {
  let appId = credentials?.appId || "";
  let secretKey = credentials?.secretKey || "";
  let refreshToken = credentials?.refreshToken || "";

  // 1. Lấy từ LocalStorage saohan_cms_settings
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("saohan_cms_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!appId) appId = parsed.zaloOaAppId || parsed.zaloBotToken || "";
        if (!secretKey) secretKey = parsed.zaloOaSecretKey || parsed.zaloWebhookSecret || "";
        if (!refreshToken) refreshToken = parsed.zaloOaRefreshToken || "";
      } catch (e) {}
    }
  }

  // 2. Lấy từ Supabase CSDL nếu chưa có
  if (!appId || !secretKey || !refreshToken) {
    try {
      const cms = await fetchCmsSettingsFromSupabase();
      if (cms) {
        if (!appId) appId = cms.zaloOaAppId || cms.zaloBotToken || "";
        if (!secretKey) secretKey = cms.zaloOaSecretKey || cms.zaloWebhookSecret || "";
        if (!refreshToken) refreshToken = cms.zaloOaRefreshToken || "";
      }
    } catch (e) {}
  }

  if (!appId || !secretKey || !refreshToken) {
    return {
      ok: false,
      description: "Thiếu Zalo OA App ID, Secret Key hoặc Refresh Token để cấp lại Access Token!"
    };
  }

  try {
    const response = await fetch("/api/zalo/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, secretKey, refreshToken })
    });

    const data = await response.json();
    if (data.ok && data.accessToken) {
      const expiresAt = Date.now() + (data.expiresIn || 86400) * 1000;

      // Cập nhật LocalStorage
      try {
        const saved = localStorage.getItem("saohan_cms_settings");
        const obj = saved ? JSON.parse(saved) : {};
        obj.zaloOaAccessToken = data.accessToken;
        obj.zaloBotToken = data.accessToken; // fallback compatible
        if (data.refreshToken) obj.zaloOaRefreshToken = data.refreshToken;
        obj.zaloOaTokenExpiresAt = expiresAt;
        localStorage.setItem("saohan_cms_settings", JSON.stringify(obj));
      } catch (e) {}

      return {
        ok: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || refreshToken
      };
    } else {
      return {
        ok: false,
        description: data.description || "Lỗi lấy Access Token từ Refresh Token Zalo OA"
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi gọi làm mới Access Token Zalo OA"
    };
  }
}

/**
 * Đăng ký Webhook URL thông qua proxy server (tránh lỗi CORS khi gọi trực tiếp từ trình duyệt)
 */
export async function registerZaloWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<ZaloApiResponse> {
  const proxyEndpoint = `/api/zalo/set-webhook`;

  try {
    const response = await fetch(proxyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        botToken,
        webhookUrl,
        secretToken: secretToken?.trim() || undefined,
      }),
    });

    const data: ZaloApiResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      error_code: 500,
      description: err.message || "Lỗi kết nối đến server proxy khi gọi Zalo Bot API setWebhook",
    };
  }
}

/**
 * Tự động gửi tin nhắn Zalo cho một Chat ID cụ thể
 */
export async function sendZaloAutoNotification(
  chatId: string,
  text: string
): Promise<ZaloApiResponse | null> {
  if (!chatId || !chatId.trim()) return null;

  const { botToken } = await getZaloBotConfig();

  if (!botToken) {
    console.warn("[Zalo Bot] Chưa cấu hình Zalo Bot Token để tự động gửi tin nhắn.");
    return null;
  }

  console.log(`[Zalo Bot Auto Push] Gửi tin nhắn đến Chat ID: ${chatId}`);
  return await sendZaloMessage({ chatId: chatId.trim(), text, parseMode: "markdown" }, botToken);
}

/**
 * Tổng hợp danh sách tất cả Chat ID cần nhận tin nhắn cho một sự kiện
 * - Thêm extraChatId truyền vào
 * - Thêm Default Admin Chat ID trong CMS Settings
 * - Thêm zaloChatId của Admin & Accountant từ Supabase
 * - Thêm zaloChatId của CTV liên quan (khớp ctvCode / ctvPhone / ctvId / ctvName)
 */
export async function getZaloRecipientChatIds(options?: {
  extraChatId?: string;
  ctvCode?: string;
  ctvPhone?: string;
  ctvId?: string;
  ctvName?: string;
  notifyAdmins?: boolean;
}): Promise<string[]> {
  const chatIds = new Set<string>();

  // 1. Thêm Chat ID truyền trực tiếp
  if (options?.extraChatId && options.extraChatId.trim()) {
    chatIds.add(options.extraChatId.trim());
  }

  // 2. Thêm Default Admin Chat ID từ Cấu hình Hệ thống (CMS Settings)
  const { defaultChatId } = await getZaloBotConfig();
  if (defaultChatId) {
    chatIds.add(defaultChatId);
  }

  // 3. Lấy tất cả user profiles từ Supabase để quét Chat ID của Admin và CTV
  try {
    const allProfiles = await fetchAllUserProfilesFromSupabase(true);
    if (allProfiles && allProfiles.length > 0) {
      // 3a. Lấy Chat ID của tất cả Admin & Accountant
      if (options?.notifyAdmins !== false) {
        const admins = allProfiles.filter(
          (u) => (u.role === "admin" || u.role === "accountant") && u.zaloChatId && u.zaloChatId.trim()
        );
        admins.forEach((a) => chatIds.add(a.zaloChatId!.trim()));
      }

      // 3b. Lấy Chat ID của CTV tạo lịch / nhận hoa hồng (tìm qua ctvCode, ctvPhone, ctvId, ctvName)
      const targetCode = options?.ctvCode?.trim().toLowerCase();
      const targetPhone = options?.ctvPhone?.trim();
      const targetId = options?.ctvId?.trim();
      const targetName = options?.ctvName?.trim().toLowerCase();

      if (targetCode || targetPhone || targetId || targetName) {
        const targetCtv = allProfiles.find(
          (u) =>
            (targetCode && u.ctvCode?.trim().toLowerCase() === targetCode) ||
            (targetPhone && u.phone?.trim() === targetPhone) ||
            (targetId && u.id === targetId) ||
            (targetName && u.fullName?.trim().toLowerCase() === targetName)
        );
        if (targetCtv?.zaloChatId && targetCtv.zaloChatId.trim()) {
          chatIds.add(targetCtv.zaloChatId.trim());
        }
      }
    }
  } catch (e) {
    console.warn("[Zalo Bot Recipient Resolution] Lỗi fetch user profiles:", e);
  }

  return Array.from(chatIds);
}

/**
 * Tự động gửi Zalo khi có Lịch Hẹn Mới
 * Gửi tin nhắn Zalo cho CẢ Admin VÀ CTV tạo lịch hẹn
 */
export async function notifyZaloAppointmentCreated(appointment: any, extraZaloChatId?: string) {
  const msg = `📅 *THÔNG BÁO LỊCH HẸN MỚI - KOREAN STAR*\n\n` +
    `👤 Khách hàng: *${appointment.customerName}*\n` +
    `📞 Số điện thoại: ${appointment.customerPhone}\n` +
    `🏥 Dịch vụ: *${appointment.serviceName}*\n` +
    `👨‍⚕️ Bác sĩ phụ trách: ${appointment.doctorName || "Bs. CKII Nguyễn Văn Hùng"}\n` +
    `⏰ Thời gian: ${appointment.date} - ${appointment.time || "09:00 AM"}\n` +
    `🏷️ CTV phụ trách: *${appointment.ctvName || "CTV"}* (${appointment.ctvCode || "Hệ thống"})\n` +
    `⏳ Trạng thái: *${appointment.status || "Chờ xác nhận"}*\n\n` +
    `Vui lòng truy cập hệ thống để xem thông tin chi tiết!`;

  const recipients = await getZaloRecipientChatIds({
    extraChatId: extraZaloChatId,
    ctvCode: appointment.ctvCode,
    ctvPhone: appointment.ctvPhone,
    ctvId: appointment.ctvId || appointment.userId
  });

  for (const chatId of recipients) {
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi Trạng Thái Lịch Hẹn Thay Đổi
 * Gửi tin nhắn Zalo cho CẢ Admin VÀ CTV tạo lịch hẹn
 */
export async function notifyZaloAppointmentStatusChanged(
  appointment: any,
  newStatus: string,
  extraZaloChatId?: string
) {
  const msg = `🔄 *CẬP NHẬT TRẠNG THÁI LỊCH HẸN - KOREAN STAR*\n\n` +
    `👤 Khách hàng: *${appointment.customerName}*\n` +
    `🏥 Dịch vụ: ${appointment.serviceName}\n` +
    `✨ Trạng thái mới: *${newStatus}*\n` +
    `⏰ Thời gian hẹn: ${appointment.date} - ${appointment.time || ""}\n` +
    `🏷️ CTV: ${appointment.ctvName || "CTV"} (${appointment.ctvCode || ""})\n\n` +
    `Hệ thống Korean Star đã ghi nhận cập nhật!`;

  const recipients = await getZaloRecipientChatIds({
    extraChatId: extraZaloChatId,
    ctvCode: appointment.ctvCode,
    ctvPhone: appointment.ctvPhone,
    ctvId: appointment.ctvId || appointment.userId
  });

  for (const chatId of recipients) {
    console.log(`[Zalo Bot Status Change] Sending notification to Chat ID: ${chatId}`);
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi có Yêu Cầu Rút Tiền / Giải Ngân Hoa Hồng
 */
export async function notifyZaloPayoutRequested(payoutData: {
  ctvUserId?: string;
  ctvCode?: string;
  ctvName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status?: string;
}, extraZaloChatId?: string) {
  const msg = `💰 *YÊU CẦU RÚT HOA HỒNG MỚI*\n\n` +
    `👤 CTV yêu cầu: *${payoutData.ctvName}*\n` +
    `💵 Số tiền: *${payoutData.amount?.toLocaleString("vi-VN")} VNĐ*\n` +
    `🏦 Ngân hàng: ${payoutData.bankName} (${payoutData.accountNumber})\n` +
    `⏳ Trạng thái: *${payoutData.status || "Chờ kế toán duyệt"}*\n\n` +
    `Kế toán vui lòng truy cập hệ thống để kiểm tra và duyệt giải ngân qua VietQR!`;

  const recipients = await getZaloRecipientChatIds({
    extraChatId: extraZaloChatId,
    ctvCode: payoutData.ctvCode,
    ctvId: payoutData.ctvUserId
  });

  for (const chatId of recipients) {
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi Giải Ngân Hoa Hồng Thành Công / Hoàn Tất
 */
export async function notifyZaloPayoutCompleted(payoutData: {
  ctvUserId?: string;
  ctvCode?: string;
  ctvName: string;
  amount: number;
  status: string;
}, extraZaloChatId?: string) {
  const msg = `✅ *GIẢI NGÂN HOA HỒNG ${payoutData.status.toUpperCase()}*\n\n` +
    `👤 Người nhận: *${payoutData.ctvName}*\n` +
    `💵 Số tiền: *${payoutData.amount?.toLocaleString("vi-VN")} VNĐ*\n` +
    `📌 Trạng thái: *${payoutData.status}*\n\n` +
    `Cảm ơn bạn đã đồng hành cùng Bệnh viện Thẩm mỹ Quốc tế Korean Star!`;

  const recipients = await getZaloRecipientChatIds({
    extraChatId: extraZaloChatId,
    ctvCode: payoutData.ctvCode,
    ctvId: payoutData.ctvUserId
  });

  for (const chatId of recipients) {
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi có Thành viên mới Đăng Ký
 */
export async function notifyZaloUserSignedUp(user: { fullName: string; email: string; phone?: string; role?: string }) {
  const msg = `👤 *THÀNH VIÊN MỚI ĐĂNG KÝ HỆ THỐNG*\n\n` +
    `Họ tên: *${user.fullName}*\n` +
    `Email/SĐT: ${user.email || user.phone}\n` +
    `Vai trò: *${user.role || "CTV"}*\n\n` +
    `Chào mừng thành viên mới tham gia mạng lưới Korean Star!`;

  const recipients = await getZaloRecipientChatIds({ notifyAdmins: true });
  for (const chatId of recipients) {
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi có Check-in Hậu Phẫu
 */
export async function notifyZaloPostOpCheckin(checkin: { customerName?: string; serviceName: string; dayPostOp: number; aiHealthStatus: string }) {
  const msg = `🏥 *CHECK-IN HẬU PHẪU NGÀY ${checkin.dayPostOp}*\n\n` +
    `👤 Khách hàng: *${checkin.customerName || "Bệnh nhân"}*\n` +
    `🏥 Dịch vụ: ${checkin.serviceName}\n` +
    `🤖 Đánh giá AI: *${checkin.aiHealthStatus}*\n\n` +
    `Bác sĩ & Điều dưỡng vui lòng theo dõi phác đồ điều trị của bệnh nhân.`;

  const recipients = await getZaloRecipientChatIds({ notifyAdmins: true });
  for (const chatId of recipients) {
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Gửi Báo Cáo Thống Kê Doanh Số & Hệ Thống Qua Zalo OA
 */
export async function sendZaloAdminStatsReport(statsData: {
  periodText: string;
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  totalCommissionPaid: number;
  totalPendingPayout: number;
  totalUsers: number;
  activeUsers: number;
}, extraZaloChatId?: string): Promise<{ success: boolean; count: number; error?: string }> {
  const msg = `📊 *BÁO CÁO THỐNG KÊ DOANH SỐ & HỆ THỐNG KOREAN STAR*\n` +
    `🗓 Kỳ báo cáo: *${statsData.periodText}*\n\n` +
    `💵 Tổng doanh số: *${statsData.totalRevenue.toLocaleString("vi-VN")} VNĐ*\n` +
    `📅 Tổng lịch hẹn: *${statsData.totalAppointments} ca* (*${statsData.completedAppointments}* hoàn thành)\n` +
    `🎉 Hoa hồng đã chi trả: *${statsData.totalCommissionPaid.toLocaleString("vi-VN")} VNĐ*\n` +
    `⏳ Chờ giải ngân ví: *${statsData.totalPendingPayout.toLocaleString("vi-VN")} VNĐ*\n` +
    `👥 Số CTV hoạt động: *${statsData.activeUsers}/${statsData.totalUsers} CTV*\n\n` +
    `⚡ Báo cáo tự động từ Bệnh viện Thẩm mỹ Quốc tế Korean Star`;

  const recipients = await getZaloRecipientChatIds({
    extraChatId: extraZaloChatId,
    notifyAdmins: true
  });

  if (recipients.length === 0) {
    return { success: false, count: 0, error: "Chưa cấu hình Zalo OA Chat ID nhận báo cáo." };
  }

  let sentCount = 0;
  let lastError = "";
  for (const chatId of recipients) {
    const res = await sendZaloAutoNotification(chatId, msg);
    if (res && res.ok) {
      sentCount++;
    } else if (res && (res.description || res.error_code)) {
      lastError = res.description || `Zalo API Error Code: ${res.error_code}`;
    }
  }

  return {
    success: sentCount > 0,
    count: sentCount,
    error: sentCount > 0 ? undefined : (lastError || "Chưa nhập Zalo OA Access Token hoặc Zalo Chat ID / Phone không chính xác.")
  };
}

/**
 * Kiểm tra kết nối Zalo OA API (gọi thông tin getoa)
 */
export async function testZaloOaConnection(
  accessTokenInput?: string
): Promise<{ ok: boolean; description: string; oaInfo?: any; error_code?: number }> {
  let token = accessTokenInput?.trim() || "";

  if (!token) {
    const { botToken } = await getZaloBotConfig();
    token = botToken;
  }

  if (!token) {
    return {
      ok: false,
      description: "Chưa nhập Zalo OA Access Token để kiểm tra kết nối API!",
    };
  }

  try {
    const response = await fetch("/api/zalo/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối đến proxy server kiểm tra kết nối Zalo OA",
    };
  }
}

/**
 * Tự động liên kết Zalo UID của CTV vào Supabase user_profiles & LocalStorage
 */
export async function linkZaloUidToCtvProfile(options: {
  phone?: string;
  ctvCode?: string;
  zaloChatId: string;
}): Promise<{ ok: boolean; description: string }> {
  if (!options.zaloChatId || !options.zaloChatId.trim()) {
    return { ok: false, description: "Chưa nhập Zalo User ID (UID)!" };
  }

  const cleanZaloId = options.zaloChatId.trim();

  // 1. Gọi Proxy API /api/zalo/link-ctv
  try {
    const response = await fetch("/api/zalo/link-ctv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: options.phone,
        ctvCode: options.ctvCode,
        zaloChatId: cleanZaloId
      })
    });
    const data = await response.json();

    // 2. Cập nhật LocalStorage profiles cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("saohan_all_user_profiles");
        if (raw) {
          const profiles = JSON.parse(raw);
          const idx = profiles.findIndex(
            (p: any) =>
              (options.ctvCode && p.ctvCode === options.ctvCode) ||
              (options.phone && p.phone === options.phone)
          );
          if (idx >= 0) {
            profiles[idx].zaloChatId = cleanZaloId;
            localStorage.setItem("saohan_all_user_profiles", JSON.stringify(profiles));
          }
        }
      } catch (e) {}
    }

    return {
      ok: data.ok !== false,
      description: data.description || `Đã cập nhật Zalo User ID (${cleanZaloId}) cho CTV!`
    };
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi liên kết Zalo User ID!"
    };
  }
}

/**
 * Tra cứu thông tin hồ sơ Zalo User ID (UID) từ Zalo OA API
 */
export async function fetchZaloUserProfileByUid(
  zaloUserId: string,
  accessTokenInput?: string
): Promise<{ ok: boolean; description: string; profile?: any; raw?: any }> {
  if (!zaloUserId || !zaloUserId.trim()) {
    return { ok: false, description: "Chưa nhập Zalo User ID (UID) để tra cứu!" };
  }

  let token = accessTokenInput?.trim() || "";
  if (!token) {
    const { botToken } = await getZaloBotConfig();
    token = botToken;
  }

  if (!token) {
    return { ok: false, description: "Chưa cấu hình Zalo OA Access Token để tra cứu thông tin Zalo UID!" };
  }

  try {
    const response = await fetch("/api/zalo/fetch-user-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: token,
        zaloUserId: zaloUserId.trim()
      })
    });
    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi tra cứu Zalo User ID!"
    };
  }
}

/**
 * Lấy danh sách người dùng Zalo OA qua API v3.0 /v3.0/oa/user/getlist (và v2.0 fallback /v2.0/oa/getfollowers)
 */
export async function fetchZaloOaFollowers(options?: {
  offset?: number;
  count?: number;
  tagName?: string;
  lastInteractionPeriod?: string;
  isFollower?: boolean | string;
  accessTokenInput?: string;
}): Promise<{ ok: boolean; description: string; total?: number; followers?: Array<{ user_id: string }>; users?: Array<{ user_id: string }>; apiVersion?: string; raw?: any }> {
  let token = options?.accessTokenInput?.trim() || "";
  if (!token) {
    const { botToken } = await getZaloBotConfig();
    token = botToken;
  }

  if (!token) {
    return { ok: false, description: "Chưa cấu hình Zalo OA Access Token để quét danh sách người dùng Zalo OA!" };
  }

  try {
    const response = await fetch("/api/zalo/fetch-followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: token,
        offset: options?.offset || 0,
        count: options?.count || 50,
        tagName: options?.tagName || "",
        lastInteractionPeriod: options?.lastInteractionPeriod || "",
        isFollower: options?.isFollower !== undefined ? String(options.isFollower) : "true"
      })
    });
    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi quét danh sách người dùng Zalo OA!"
    };
  }
}

/**
 * Tạo mã định danh duy nhất (LINK_XXXXXX) để liên kết Zalo OA chính xác 100%
 */
export async function generateZaloLinkCode(options: {
  userId?: string;
  ctvCode?: string;
  phone?: string;
}): Promise<{ ok: boolean; code?: string; expiresAt?: string; zaloOaId?: string; deepLink?: string; description: string }> {
  try {
    const response = await fetch("/api/zalo/create-link-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options)
    });
    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi tạo mã định danh Zalo UID!"
    };
  }
}

/**
 * Đăng nhập bằng Zalo (Zalo Social Login) & tự động tạo tài khoản CTV
 */
export async function loginWithZalo(payload: {
  zaloUserId?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
}): Promise<{ ok: boolean; userProfile?: any; isNewUser?: boolean; description: string }> {
  try {
    const response = await fetch("/api/zalo/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      description: err.message || "Lỗi kết nối khi đăng nhập bằng Zalo!"
    };
  }
}









