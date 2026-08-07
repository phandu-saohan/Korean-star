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
  appId: "f1f45c7b-fe36-4640-b117-a64cc8fab436",
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

  // Pre-register OneSignal Service Worker to prevent [WM] No SW registration for postMessage warning
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" }).catch(() => {});
    } catch (e) {}
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

        // Auto trigger Slidedown permission prompt if available
        try {
          if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === "function") {
            await OneSignal.Slidedown.promptPush();
          }
        } catch (e) {}

        // Listen to OneSignal foreground push notifications and dispatch event to header bell icon
        try {
          if (OneSignal.Notifications && typeof OneSignal.Notifications.addEventListener === "function") {
            OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
              const notification = event?.notification || {};
              const title = notification.title || "Thông Báo KOREAN STAR";
              const message = notification.body || "";
              const data = notification.additionalData || {};

              window.dispatchEvent(
                new CustomEvent("onesignal-notification-toast", {
                  detail: { title, message, data }
                })
              );
            });
          }
        } catch (e) {}
      }
    } catch (err) {
      // Quiet warning for custom or invalid app ID
    }
  });
};

/**
 * Manually request Notification permission on user interaction (button click)
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  try {
    const permission = await Notification.requestPermission();
    console.log("[OneSignal] Browser Notification Permission status:", permission);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (OneSignal?.Notifications?.requestPermission) {
          await OneSignal.Notifications.requestPermission();
        }
        if (permission === "granted" && OneSignal?.User?.PushSubscription?.optIn) {
          await OneSignal.User.PushSubscription.optIn();
          console.log("[OneSignal] Push subscription opted in successfully");
        }
      } catch (e) {
        console.warn("[OneSignal] Permission request error:", e);
      }
    });

    return permission;
  } catch (e) {
    return "denied";
  }
};

// Session key để tránh gọi login + addTags nhiều lần
const SESSION_KEY = "_os_user_init";

/**
 * Clear stale OneSignal IndexedDB databases to resolve 409 Conflict
 * caused by orphaned operation queues from previous sessions.
 */
const clearOneSignalIndexedDB = async (): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  try {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      const osDBs = dbs.filter((db) => db.name && db.name.toLowerCase().includes("onesignal"));
      await Promise.all(
        osDBs.map(
          (db) =>
            new Promise<void>((resolve) => {
              if (!db.name) return resolve();
              const req = indexedDB.deleteDatabase(db.name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            })
        )
      );
    }
  } catch (e) {
    // Absorbed — IndexedDB cleanup is best-effort
  }
};

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
  const sessionKey = `${SESSION_KEY}_${externalId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      if (!OneSignal || !OneSignal.User) return;

      // 1. Chỉ login với external ID nếu chưa login với ID này
      const currentExternalId = OneSignal.User?.externalId || OneSignal.User?.id;
      if (typeof OneSignal.login === "function" && externalId && currentExternalId !== externalId) {
        try {
          await OneSignal.login(externalId);
        } catch (loginErr) {
          // Ignore conflict during login
        }
      }

      const tagsPayload = {
        user_id: user.id || "",
        role: user.role || "ctv",
        ctv_code: user.ctvCode || "",
        email: user.email || "",
        full_name: user.fullName || ""
      };

      // 2. Gán Role Tags trực tiếp lên OneSignal.User
      if (typeof OneSignal.User.addTags === "function") {
        try {
          await OneSignal.User.addTags(tagsPayload);
          console.log(`[OneSignal] Dynamic Tags set successfully: ${user.fullName} (${user.role}) - ID: ${user.id}`);
        } catch (tagErr: any) {
          // If 409 Conflict occurs (anonymous session merged/conflicted), silent catch as push notification still works via segment filters
        }
      }
    } catch (err) {
      // Quiet catch
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

  // Dispatch Custom Event để hiển thị Floating Corner Toast trực tiếp trên màn hình web
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("onesignal-notification-toast", {
        detail: { title, message, url, data }
      })
    );
  }

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
    filters.push({ operator: "OR" });
    filters.push({ field: "tag", key: "ctv_code", relation: "=", value: targetUserId });
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
      if (responseData?.noSubscribers) {
        console.info("[OneSignal Push]:", responseData.description);
      } else if (responseData?.errors?.length) {
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
  const serviceName = appointment.serviceName || appointment.service_name || "Dịch vụ Thẩm mỹ";
  const dateStr = appointment.appointmentDate || appointment.date || "hôm nay";

  let statusEmoji = "🔄";
  let statusDetail = `chuyển sang trạng thái: '${newStatus}'`;

  if (newStatus === "Đã xác nhận") {
    statusEmoji = "✅";
    statusDetail = `đã được XÁC NHẬN lịch khám vào ${dateStr}`;
  } else if (newStatus === "Đang điều trị") {
    statusEmoji = "🏥";
    statusDetail = `đang trong quá trình ĐIỀU TRỊ / PHẪU THUẬT`;
  } else if (newStatus === "Hoàn thành") {
    statusEmoji = "🎉";
    statusDetail = `đã HOÀN THÀNH thành công! Hoa hồng đã được ghi nhận`;
  } else if (newStatus === "Đã hủy") {
    statusEmoji = "❌";
    statusDetail = `đã bị HỦY lịch khám`;
  }

  sendOneSignalNotification({
    title: `${statusEmoji} Lịch Hẹn [${newStatus.toUpperCase()}]: ${customerName}`,
    message: `Khách hàng ${customerName} (${serviceName}) ${statusDetail}.`,
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
