import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, X-Requested-With, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, description: "Method Not Allowed" }));
    return;
  }

  try {
    let body: any = req.body;
    if (!body || typeof body === "string") {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const dataStr = Buffer.concat(buffers).toString("utf-8");
      try {
        body = JSON.parse(dataStr);
      } catch (e) {
        body = {};
      }
    }

    const { appId, apiKey, title, message, filters, data, url } = body;

    const targetAppId = appId || process.env.ONESIGNAL_APP_ID || "6eeb3025-71f7-44af-9a85-f6c52a6da92b";
    // API Key: ưu tiên từ body, sau đó từ env variable
    const rawKey = apiKey || process.env.ONESIGNAL_REST_API_KEY || "";
    const targetApiKey = rawKey.replace(/^Basic\s+/i, "").trim();

    if (!targetAppId || !title || !message) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu appId, title hoặc message",
        })
      );
      return;
    }

    // Guard: nếu không có REST API Key → OneSignal sẽ trả 401 → báo lỗi ngay
    if (!targetApiKey) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description:
            "Thiếu OneSignal REST API Key. Vui lòng cấu hình biến môi trường ONESIGNAL_REST_API_KEY trên Vercel, hoặc nhập API Key trong Phần Cài Đặt Hệ Thống.",
        })
      );
      return;
    }

    const payload: any = {
      app_id: targetAppId,
      headings: { en: title, vi: title },
      contents: { en: message, vi: message },
      data: data || {},
      url: url || "https://korean-star-q9xy.vercel.app"
    };

    if (Array.isArray(filters) && filters.length > 0) {
      payload.filters = filters;
    } else {
      payload.included_segments = ["All"];
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${targetApiKey}`
    };

    console.log(`[OneSignal Proxy Push] AppID: ${targetAppId} - Title: ${title}`);

    let osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    let responseData = await osResponse.json();

    // Tự động Fallback sang segment 'All' (Tất cả người dùng)
    // Nếu filter theo tag (ví dụ ctv-001 hoặc admin) không tìm thấy thiết bị nào đang đăng ký
    if (
      Array.isArray(responseData?.errors) &&
      responseData.errors.some((e: string) => typeof e === "string" && e.includes("All included players are not subscribed")) &&
      payload.filters
    ) {
      console.log("[OneSignal Proxy] No filter matches found. Retrying with 'All' segment...");
      delete payload.filters;
      payload.included_segments = ["All"];

      osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      responseData = await osResponse.json();
    }

    // Nếu cả segment 'All' cũng chưa có thiết bị nào đăng ký Push Notification -> Trả về thông báo nhẹ nhàng
    if (
      Array.isArray(responseData?.errors) &&
      responseData.errors.some((e: string) => typeof e === "string" && e.includes("All included players are not subscribed"))
    ) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          noSubscribers: true,
          description: "Chưa có thiết bị trình duyệt nào nhấn BẬT THÔNG BÁO (Allow Notifications) trên ứng dụng OneSignal này."
        })
      );
      return;
    }

    console.log("[OneSignal Proxy Response]:", responseData);

    res.statusCode = osResponse.status || 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(responseData));
  } catch (err: any) {
    console.error("[OneSignal Proxy Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi gửi OneSignal Notification",
      })
    );
  }
}
