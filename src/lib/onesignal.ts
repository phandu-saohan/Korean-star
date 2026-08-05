import { AuthUserProfile } from "./supabase";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export interface OneSignalConfig {
  appId: string;
  apiKey?: string;
  enabled: boolean;
}

export const DEFAULT_ONESIGNAL_CONFIG: OneSignalConfig = {
  appId: "6eeb3025-71f7-44af-9a85-f6c52a6da92b",
  apiKey: "",
  enabled: true
};

/**
 * Fetch OneSignal Config from localStorage / CMS settings
 */
export const getOneSignalConfig = (): OneSignalConfig => {
  const savedCms = localStorage.getItem("saohan_cms_settings");
  if (savedCms) {
    try {
      const parsed = JSON.parse(savedCms);
      if (parsed.oneSignalAppId) {
        return {
          appId: parsed.oneSignalAppId,
          apiKey: parsed.oneSignalApiKey || "",
          enabled: parsed.oneSignalEnabled !== false
        };
      }
    } catch (e) {}
  }
  return DEFAULT_ONESIGNAL_CONFIG;
};

/**
 * Initialize OneSignal Web SDK dynamically
 */
export const initOneSignal = (config?: OneSignalConfig) => {
  if (typeof window === "undefined") return;

  const cfg = config || getOneSignalConfig();
  if (!cfg.enabled || !cfg.appId || cfg.appId.includes("demo")) return;

  // 1. Inject OneSignal Web SDK Script if not already loaded
  if (!document.getElementById("onesignal-sdk")) {
    const script = document.createElement("script");
    script.id = "onesignal-sdk";
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);
  }

  // 2. Initialize OneSignal via Deferred Queue
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      if (OneSignal && OneSignal.init) {
        await OneSignal.init({
          appId: cfg.appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
          safari_web_id: "web.onesignal.auto.koreanstar",
          notifyButton: {
            enable: true,
            position: "bottom-right",
            text: {
              "tip.state.unsubscribed": "Đăng ký nhận thông báo Lịch hẹn & Hoa hồng Realtime",
              "tip.state.subscribed": "Đã bật thông báo Realtime Korean Star",
              "tip.state.blocked": "Bạn đã chặn thông báo",
              "message.action.subscribed": "Cảm ơn bạn đã đăng ký nhận thông báo!",
              "message.action.resubscribed": "Đã bật lại thông báo thành công",
              "dialog.main.title": "Nhận Thông Báo Realtime Korean Star",
              "dialog.main.button.subscribe": "BẬT THÔNG BÁO",
              "dialog.main.button.unsubscribe": "TẮT THÔNG BÁO"
            }
          },
          allowLocalhostAsSecureOrigin: true
        });
        console.log("OneSignal Web Push SDK Initialized successfully:", cfg.appId);
      }
    } catch (err) {
      // Quiet warning for custom or invalid app ID
    }
  });

  // Request browser Notification permission if supported
  if ("Notification" in window && Notification.permission === "default") {
    try {
      Notification.requestPermission();
    } catch (e) {}
  }
};

// Session key để tránh gọi login + addTags nhiều lần
const SESSION_KEY = "_os_user_init";

/**
 * Set OneSignal External User ID and Role Tags
 * CHỈ chạy MỘT LẦN mỗi session cho mỗi user ID.
 * - User gets tagged with their user_id, role, ctv_code
 * - Admin & Accountant get role: "admin" / "accountant" to receive ALL system changes
 */
export const setOneSignalUser = (user: AuthUserProfile) => {
  if (typeof window === "undefined" || !user) return;
  const cfg = getOneSignalConfig();
  if (!cfg.enabled || !cfg.appId || cfg.appId.includes("demo")) return;

  const externalId = user.id || user.ctvCode || user.email;
  if (!externalId) return;

  // Guard: nếu đã init cho user này trong session này → bỏ qua
  // Tránh việc useEffect gọi lại nhiều lần gây PATCH race condition → 409
  const sessionKey = `${SESSION_KEY}_${externalId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      if (!OneSignal || !OneSignal.User) return;

      // 1. Login External ID TRƯỚC để xác lập định danh thiết bị
      //    409 = đã được linked trước đó → bỏ qua bình thường
      if (typeof OneSignal.login === "function") {
        try {
          await OneSignal.login(externalId);
        } catch (loginErr: any) {
          const status = loginErr?.status || loginErr?.statusCode || 0;
          if (status !== 409) {
            console.warn("[OneSignal] login error:", loginErr?.message || loginErr);
          }
          // 409: device đã linked → tiếp tục gán tags, không throw
        }
      }

      // 2. Chờ SDK settle sau login (tránh PATCH race condition → 409 trên addTags)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 3. Gán Role Tags
      if (typeof OneSignal.User.addTags === "function") {
        try {
          await OneSignal.User.addTags({
            user_id: user.id || "",
            role: user.role || "ctv",
            ctv_code: user.ctvCode || "",
            email: user.email || "",
            full_name: user.fullName || ""
          });
          console.log(`[OneSignal] Tags set: ${user.fullName} (${user.role})`);
        } catch (tagErr: any) {
          // SDK nội bộ có thể log 409 — đây là expected, không cần xử lý thêm
        }
      }
    } catch (err) {
      // General quiet catch
    }
  });
};

/**
 * Logout OneSignal User on Sign out
 * Xóa session guard để lần đăng nhập tiếp theo có thể init lại
 */
export const logoutOneSignal = () => {
  if (typeof window === "undefined") return;

  // Xóa tất cả session guards liên quan đến OneSignal
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(SESSION_KEY))
    .forEach((k) => sessionStorage.removeItem(k));

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      if (OneSignal.logout) {
        await OneSignal.logout();
      }
    } catch (err) {}
  });
};

export interface SendPushNotificationParams {
  title: string;
  message: string;
  targetUserId?: string; // CTV User ID for target push
  targetRoles?: ("admin" | "accountant" | "ctv" | "editor")[]; // Roles to notify (Admin, Accountant receive ALL)
  url?: string;
  data?: Record<string, any>;
}

/**
 * Core Function: Send Realtime Push Notification via OneSignal REST API / Browser Web Push
 * Rules enforced:
 * 1. Specific User receives their own appointment & payout updates (targetUserId)
 * 2. Admin and Accountant receive ALL updates (roles: admin, accountant)
 */
export const sendOneSignalNotification = async (params: SendPushNotificationParams) => {
  const { title, message, targetUserId, targetRoles = ["admin", "accountant"], url, data } = params;

  const cfg = getOneSignalConfig();
  console.log(`[OneSignal Push] Sending: '${title}' - Target User: ${targetUserId || "ALL"} - Roles: ${targetRoles.join(", ")}`);

  // 1. Send via Browser Native Notification API for immediate local feedback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        data: data
      });
    } catch (e) {}
  }

  // 2. Build OneSignal Filters:
  // Target specific User ID OR (role = admin OR role = accountant)
  const filters: any[] = [];

  if (targetUserId) {
    filters.push({ field: "tag", key: "user_id", relation: "=", value: targetUserId });
  }

  // Admin and Accountant ALWAYS receive all notifications
  const rolesToNotify = Array.from(new Set([...targetRoles, "admin", "accountant"]));
  rolesToNotify.forEach((role) => {
    if (filters.length > 0) {
      filters.push({ operator: "OR" });
    }
    filters.push({ field: "tag", key: "role", relation: "=", value: role });
  });

  // 3. Send via Proxy Serverless Function (/api/onesignal/send-notification) to avoid CORS & 401
  if (cfg.enabled && cfg.appId) {
    try {
      const proxyEndpoint = "/api/onesignal/send-notification";
      const res = await fetch(proxyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: cfg.appId,
          apiKey: cfg.apiKey,
          title,
          message,
          filters,
          data: data || {},
          url: url || window.location.origin
        })
      });

      const responseData = await res.json();
      // Log chi tiết lỗi nếu có
      if (responseData?.errors?.length) {
        console.warn("[OneSignal Notification Error]:", JSON.stringify(responseData.errors));
      } else {
        console.log("[OneSignal Notification Response]:", responseData);
      }
      return responseData;
    } catch (err) {
      console.warn("OneSignal Notification Proxy call error:", err);
    }
  }

  return { success: true, localOnly: true };
};

/**
 * Event Helper 1: Notify New Appointment Created
 * Enforces rule: Pushes to CTV who booked it + Admin + Accountant
 */
export const notifyAppointmentCreated = (appointment: any) => {
  const ctvId = appointment.ctvId || appointment.userId;
  const ctvName = appointment.ctvName || "Cộng tác viên";
  const typeText = appointment.appointmentType || "Lịch hẹn";
  const service = appointment.serviceName || "Dịch vụ Thẩm mỹ";

  sendOneSignalNotification({
    title: `📅 ${typeText} Mới: ${appointment.customerName}`,
    message: `Khách hàng đặt ${service} vào ${appointment.appointmentDate || "hôm nay"}. CTV: ${ctvName}.`,
    targetUserId: ctvId,
    targetRoles: ["admin", "accountant"],
    data: { appointmentId: appointment.id, type: "NEW_APPOINTMENT" }
  });
};

/**
 * Event Helper 2: Notify Appointment Status Change
 * Enforces rule: Pushes status change to assigned CTV + Admin + Accountant
 */
export const notifyAppointmentStatusChanged = (appointment: any, newStatus: string) => {
  const ctvId = appointment.ctvId || appointment.userId;
  const customerName = appointment.customerName || "Khách hàng";

  sendOneSignalNotification({
    title: `🔄 Cập Nhật Lịch Hẹn: ${customerName}`,
    message: `Lịch hẹn khám bệnh của ${customerName} đã chuyển sang trạng thái: '${newStatus}'.`,
    targetUserId: ctvId,
    targetRoles: ["admin", "accountant"],
    data: { appointmentId: appointment.id, newStatus, type: "APPOINTMENT_STATUS" }
  });
};

/**
 * Event Helper 3: Notify Payout / Commission Withdrawal Request
 * Enforces rule: Pushes to requesting CTV + Admin + Accountant
 */
export const notifyPayoutRequested = (payoutData: {
  ctvUserId: string;
  ctvName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
}) => {
  sendOneSignalNotification({
    title: `💰 Yêu Cầu Rút Hoa Hồng Mới`,
    message: `CTV ${payoutData.ctvName} gửi yêu cầu rút ${payoutData.amount.toLocaleString()} VNĐ về ${payoutData.bankName} (${payoutData.accountNumber}).`,
    targetUserId: payoutData.ctvUserId,
    targetRoles: ["admin", "accountant"],
    data: { type: "PAYOUT_REQUEST", amount: payoutData.amount }
  });
};

/**
 * Event Helper 4: Notify Payout Processed / Completed
 * Enforces rule: Pushes completion result to CTV + Admin + Accountant
 */
export const notifyPayoutCompleted = (payoutData: {
  ctvUserId: string;
  ctvName: string;
  amount: number;
  status: string;
}) => {
  sendOneSignalNotification({
    title: `✅ Giải Ngân Hoa Hồng ${payoutData.status}`,
    message: `Yêu cầu rút ${payoutData.amount.toLocaleString()} VNĐ của ${payoutData.ctvName} đã được ${payoutData.status.toLowerCase()} qua VietQR!`,
    targetUserId: payoutData.ctvUserId,
    targetRoles: ["admin", "accountant"],
    data: { type: "PAYOUT_COMPLETED", status: payoutData.status }
  });
};

/**
 * Event Helper 5: Notify New CTV / User Registration to Admin
 */
export const notifyUserSignedUp = (user: { fullName: string; email: string; phone?: string; role?: string }) => {
  sendOneSignalNotification({
    title: `👤 Thành Viên Mới Đăng Ký`,
    message: `Tài khoản ${user.fullName} (${user.email || user.phone}) vừa đăng ký tham gia hệ thống với vai trò ${user.role || "CTV"}.`,
    targetRoles: ["admin"],
    data: { type: "NEW_USER_SIGNUP", email: user.email }
  });
};

/**
 * Event Helper 6: Notify Post-Op Checkin Submitted to Admin & Doctors
 */
export const notifyPostOpCheckin = (checkin: { customerName?: string; serviceName: string; dayPostOp: number; aiHealthStatus: string }) => {
  sendOneSignalNotification({
    title: `🏥 Check-in Hậu Phẫu Ngày ${checkin.dayPostOp}`,
    message: `Khách hàng ${checkin.customerName || "Bệnh nhân"} vừa gửi check-in ${checkin.serviceName}. Chỉ số AI: ${checkin.aiHealthStatus}.`,
    targetRoles: ["admin", "accountant"],
    data: { type: "POST_OP_CHECKIN", status: checkin.aiHealthStatus }
  });
};

/**
 * Event Helper 7: Notify New Customer Feedback Submitted to Admin
 */
export const notifyFeedbackSubmitted = (feedback: { customerName: string; serviceName: string; rating: number }) => {
  sendOneSignalNotification({
    title: `⭐ Feedback Mới: ${feedback.rating} Sao`,
    message: `Khách hàng ${feedback.customerName} vừa gửi đánh giá cho dịch vụ ${feedback.serviceName}.`,
    targetRoles: ["admin", "editor"],
    data: { type: "NEW_FEEDBACK", rating: feedback.rating }
  });
};
