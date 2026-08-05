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
    const targetApiKey = apiKey || process.env.ONESIGNAL_REST_API_KEY || "";

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
      "Content-Type": "application/json; charset=utf-8"
    };

    if (targetApiKey) {
      headers["Authorization"] = `Basic ${targetApiKey.replace(/^Basic\s+/i, "")}`;
    }

    console.log(`[OneSignal Proxy Push] AppID: ${targetAppId} - Title: ${title}`);

    const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const responseData = await osResponse.json();
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
