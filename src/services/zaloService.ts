// src/services/zaloService.ts
import { fetchAllUserProfilesFromSupabase, fetchCmsSettingsFromSupabase } from "../lib/supabase";

export interface SendMessagePayload {
  chatId: string;
  text: string;
  parseMode?: 'markdown' | 'html';
}

export interface ZaloApiResponse {
  ok: boolean;
  result?: {
    message_id: string;
    date: number;
  };
  description?: string;
  error_code?: number;
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
        botToken = parsed.zaloBotToken || "";
        defaultChatId = parsed.zaloDefaultChatId || "";
      } catch (e) {}
    }
  }

  // 2. Fallback sang Supabase cms_settings nếu chưa lưu ở local
  if (!botToken || !defaultChatId) {
    try {
      const cms = await fetchCmsSettingsFromSupabase();
      if (cms) {
        if (!botToken && cms.zaloBotToken) botToken = cms.zaloBotToken;
        if (!defaultChatId && cms.zaloDefaultChatId) defaultChatId = cms.zaloDefaultChatId;
      }
    } catch (e) {}
  }

  // 3. Fallback sang Environment variables
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

    const data: ZaloApiResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      error_code: 500,
      description: err.message || 'Lỗi kết nối đến server proxy khi gọi Zalo Bot API sendMessage'
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
 * - Thêm zaloChatId của CTV liên quan (khớp ctvCode / ctvPhone / ctvId)
 */
export async function getZaloRecipientChatIds(options?: {
  extraChatId?: string;
  ctvCode?: string;
  ctvPhone?: string;
  ctvId?: string;
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

      // 3b. Lấy Chat ID của CTV tạo lịch / nhận hoa hồng
      const targetCode = options?.ctvCode?.trim().toLowerCase();
      const targetPhone = options?.ctvPhone?.trim();
      const targetId = options?.ctvId?.trim();

      if (targetCode || targetPhone || targetId) {
        const targetCtv = allProfiles.find(
          (u) =>
            (targetCode && u.ctvCode?.trim().toLowerCase() === targetCode) ||
            (targetPhone && u.phone?.trim() === targetPhone) ||
            (targetId && u.id === targetId)
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



