// src/services/zaloService.ts

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
 * Gửi tin nhắn Zalo thông qua proxy server (tránh lỗi CORS khi gọi trực tiếp từ trình duyệt)
 */
export async function sendZaloMessage(
  payload: SendMessagePayload,
  botToken: string
): Promise<ZaloApiResponse> {
  // Gọi qua endpoint proxy server-side để tránh CORS
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
  // Gọi qua endpoint proxy server-side để tránh CORS
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

  let botToken = "";
  const savedSettings = localStorage.getItem("saohan_cms_settings");
  if (savedSettings) {
    try {
      botToken = JSON.parse(savedSettings).zaloBotToken || "";
    } catch (e) {}
  }

  if (!botToken) {
    botToken =
      (import.meta as any).env?.VITE_ZALO_BOT_TOKEN ||
      (process as any).env?.REACT_APP_ZALO_BOT_TOKEN ||
      "";
  }

  if (!botToken) {
    console.warn("[Zalo Bot] Chưa cấu hình Zalo Bot Token để tự động gửi tin nhắn.");
    return null;
  }

  console.log(`[Zalo Bot Auto Push] Gửi tin nhắn đến Chat ID: ${chatId}`);
  return await sendZaloMessage({ chatId: chatId.trim(), text, parseMode: "markdown" }, botToken);
}

import { fetchAllUserProfilesFromSupabase } from "../lib/supabase";

/**
 * Tự động gửi Zalo khi có Lịch Hẹn Mới
 * Gửi tin nhắn Zalo cho CẢ Admin VÀ CTV tạo lịch hẹn
 */
export async function notifyZaloAppointmentCreated(appointment: any, extraZaloChatId?: string) {
  const msg = `📅 *THÔNG BÁO LỊCH HẸN MỚI - KOREAN STAR*\n\n` +
    `👤 Khách hàng: *${appointment.customerName}*\n` +
    `📞 Số điện thoại: ${appointment.customerPhone}\n` +
    `🏥 Dịch vụ: *${appointment.serviceName}*\n` +
    `👨‍⚕️ Bác sĩ phụ trách: ${appointment.doctorName}\n` +
    `⏰ Thời gian: ${appointment.date} - ${appointment.time}\n` +
    `⏳ Trạng thái: *${appointment.status || "Chờ xác nhận"}*\n\n` +
    `Vui lòng truy cập hệ thống để xem thông tin chi tiết!`;

  const chatIdsToNotify = new Set<string>();

  if (extraZaloChatId && extraZaloChatId.trim()) {
    chatIdsToNotify.add(extraZaloChatId.trim());
  }

  try {
    const allProfiles = await fetchAllUserProfilesFromSupabase();
    if (allProfiles && allProfiles.length > 0) {
      // 1. Gửi cho tất cả Admin có zaloChatId
      const admins = allProfiles.filter((u) => u.role === "admin" && u.zaloChatId && u.zaloChatId.trim());
      admins.forEach((a) => {
        chatIdsToNotify.add(a.zaloChatId!.trim());
      });

      // 2. Gửi cho CTV tạo lịch hẹn
      const targetCtv = allProfiles.find(
        (u) =>
          (appointment.ctvCode && u.ctvCode === appointment.ctvCode) ||
          (appointment.ctvPhone && u.phone === appointment.ctvPhone) ||
          (appointment.ctvId && u.id === appointment.ctvId)
      );
      if (targetCtv?.zaloChatId && targetCtv.zaloChatId.trim()) {
        chatIdsToNotify.add(targetCtv.zaloChatId.trim());
      }
    }
  } catch (e) {
    console.warn("[Zalo Bot New Appointment] Lỗi fetch user profiles:", e);
  }

  for (const chatId of chatIdsToNotify) {
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
    `⏰ Thời gian hẹn: ${appointment.date} - ${appointment.time || ""}\n\n` +
    `Hệ thống Korean Star đã ghi nhận cập nhật!`;

  const chatIdsToNotify = new Set<string>();

  // 1. Thêm Chat ID truyền vào trực tiếp (nếu có)
  if (extraZaloChatId && extraZaloChatId.trim()) {
    chatIdsToNotify.add(extraZaloChatId.trim());
  }

  // 2. Tìm tất cả user profiles từ Supabase để lấy Zalo Chat ID của Admin và CTV tạo lịch hẹn
  try {
    const allProfiles = await fetchAllUserProfilesFromSupabase();
    if (allProfiles && allProfiles.length > 0) {
      // 2a. Gửi cho tất cả tài khoản Admin có Zalo Chat ID
      const admins = allProfiles.filter((u) => u.role === "admin" && u.zaloChatId && u.zaloChatId.trim());
      admins.forEach((a) => {
        chatIdsToNotify.add(a.zaloChatId!.trim());
      });

      // 2b. Gửi cho CTV tạo lịch hẹn (tìm theo ctvCode, ctvPhone hoặc ctvId)
      const targetCtv = allProfiles.find(
        (u) =>
          (appointment.ctvCode && u.ctvCode === appointment.ctvCode) ||
          (appointment.ctvPhone && u.phone === appointment.ctvPhone) ||
          (appointment.ctvId && u.id === appointment.ctvId)
      );
      if (targetCtv?.zaloChatId && targetCtv.zaloChatId.trim()) {
        chatIdsToNotify.add(targetCtv.zaloChatId.trim());
      }
    }
  } catch (e) {
    console.warn("[Zalo Bot Status Change] Lỗi fetch user profiles:", e);
  }

  // 3. Gửi tin nhắn Zalo tới từng Chat ID
  for (const chatId of chatIdsToNotify) {
    console.log(`[Zalo Bot Status Change] Sending notification to Chat ID: ${chatId}`);
    await sendZaloAutoNotification(chatId, msg);
  }
}

/**
 * Tự động gửi Zalo khi có Yêu Cầu Rút Tiền / Giải Ngân Hoa Hồng
 */
export async function notifyZaloPayoutRequested(payoutData: any, extraZaloChatId?: string) {
  const msg = `💰 *THÔNG BÁO GIẢI NGÂN HOA HỒNG*\n\n` +
    `👤 Người nhận: *${payoutData.ctvName}*\n` +
    `💵 Số tiền: *${payoutData.amount?.toLocaleString()} VNĐ*\n` +
    `🏦 Ngân hàng: ${payoutData.bankName} (${payoutData.accountNumber})\n` +
    `✅ Trạng thái: *${payoutData.status || "Yêu cầu mới"}*\n\n` +
    `Cảm ơn bạn đã đồng hành cùng Bệnh viện Thẩm mỹ Quốc tế Korean Star!`;

  const chatIdsToNotify = new Set<string>();
  if (extraZaloChatId && extraZaloChatId.trim()) {
    chatIdsToNotify.add(extraZaloChatId.trim());
  }

  try {
    const allProfiles = await fetchAllUserProfilesFromSupabase();
    if (allProfiles && allProfiles.length > 0) {
      // Gửi cho Admin & Accountant
      const admins = allProfiles.filter(
        (u) => (u.role === "admin" || u.role === "accountant") && u.zaloChatId && u.zaloChatId.trim()
      );
      admins.forEach((a) => {
        chatIdsToNotify.add(a.zaloChatId!.trim());
      });
      // Gửi cho CTV nhận hoa hồng
      const targetCtv = allProfiles.find(
        (u) =>
          (payoutData.ctvCode && u.ctvCode === payoutData.ctvCode) ||
          (payoutData.ctvId && u.id === payoutData.ctvId)
      );
      if (targetCtv?.zaloChatId && targetCtv.zaloChatId.trim()) {
        chatIdsToNotify.add(targetCtv.zaloChatId.trim());
      }
    }
  } catch (e) {}

  for (const chatId of chatIdsToNotify) {
    await sendZaloAutoNotification(chatId, msg);
  }
}


