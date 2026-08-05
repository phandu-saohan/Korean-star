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
 * Gửi tin nhắn Zalo thông qua API Zalo Bot Platform
 */
export async function sendZaloMessage(
  payload: SendMessagePayload,
  botToken: string
): Promise<ZaloApiResponse> {
  const endpoint = `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: payload.chatId,
        text: payload.text,
        parse_mode: payload.parseMode || 'markdown',
      }),
    });

    const data: ZaloApiResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      error_code: 500,
      description: err.message || 'Lỗi kết nối mạng khi gọi Zalo Bot API'
    };
  }
}

/**
 * Đăng ký Webhook URL trực tiếp với Zalo Bot API (setWebhook API)
 */
export async function registerZaloWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<ZaloApiResponse> {
  const endpoint = `https://bot-api.zaloplatforms.com/bot${botToken}/setWebhook`;

  try {
    const payload: any = { url: webhookUrl };
    if (secretToken && secretToken.trim()) {
      payload.secret_token = secretToken.trim();
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: ZaloApiResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      error_code: 500,
      description: err.message || "Lỗi kết nối mạng khi gọi Zalo Bot API setWebhook",
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

/**
 * Tự động gửi Zalo khi có Lịch Hẹn Mới
 */
export function notifyZaloAppointmentCreated(appointment: any, userZaloChatId?: string) {
  if (!userZaloChatId) return;

  const msg = `📅 *THÔNG BÁO LỊCH HẸN MỚI - KOREAN STAR*\n\n` +
    `👤 Khách hàng: *${appointment.customerName}*\n` +
    `📞 Số điện thoại: ${appointment.customerPhone}\n` +
    `🏥 Dịch vụ: *${appointment.serviceName}*\n` +
    `👨‍⚕️ Bác sĩ phụ trách: ${appointment.doctorName}\n` +
    `⏰ Thời gian: ${appointment.date} - ${appointment.time}\n` +
    `⏳ Trạng thái: *${appointment.status || "Chờ xác nhận"}*\n\n` +
    `Vui lòng truy cập hệ thống để xem thông tin chi tiết!`;

  sendZaloAutoNotification(userZaloChatId, msg);
}

/**
 * Tự động gửi Zalo khi Trạng Thái Lịch Hẹn Thay Đổi
 */
export function notifyZaloAppointmentStatusChanged(appointment: any, newStatus: string, userZaloChatId?: string) {
  if (!userZaloChatId) return;

  const msg = `🔄 *CẬP NHẬT TRẠNG THÁI LỊCH HẸN*\n\n` +
    `👤 Khách hàng: *${appointment.customerName}*\n` +
    `🏥 Dịch vụ: ${appointment.serviceName}\n` +
    `✨ Trạng thái mới: *${newStatus}*\n` +
    `⏰ Thời gian hẹn: ${appointment.date} - ${appointment.time}\n\n` +
    `Hệ thống Korean Star đã ghi nhận cập nhật!`;

  sendZaloAutoNotification(userZaloChatId, msg);
}

/**
 * Tự động gửi Zalo khi có Yêu Cầu Rút Tiền / Giải Ngân Hoa Hồng
 */
export function notifyZaloPayoutRequested(payoutData: any, userZaloChatId?: string) {
  if (!userZaloChatId) return;

  const msg = `💰 *THÔNG BÁO GIẢI NGÂN HOA HỒNG*\n\n` +
    `👤 Người nhận: *${payoutData.ctvName}*\n` +
    `💵 Số tiền: *${payoutData.amount?.toLocaleString()} VNĐ*\n` +
    `🏦 Ngân hàng: ${payoutData.bankName} (${payoutData.accountNumber})\n` +
    `✅ Trạng thái: *${payoutData.status || "Yêu cầu mới"}*\n\n` +
    `Cảm ơn bạn đã đồng hành cùng Bệnh viện Thẩm mỹ Quốc tế Korean Star!`;

  sendZaloAutoNotification(userZaloChatId, msg);
}

