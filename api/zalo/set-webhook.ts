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
    "Content-Type, Accept, X-Requested-With"
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
    // Parse body
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

    const { botToken, webhookUrl, secretToken } = body;

    if (!botToken || !webhookUrl) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ ok: false, description: "Thiếu botToken hoặc webhookUrl" })
      );
      return;
    }

    // Zalo Bot API format: /bot{TOKEN}/setWebhook (no slash between bot and token)
    const cleanToken = String(botToken).replace(/^\//, "").trim();
    const endpoint = `https://bot-api.zaloplatforms.com/bot${cleanToken}/setWebhook`;
    const payload: any = { url: webhookUrl };
    if (secretToken && String(secretToken).trim()) {
      payload.secret_token = String(secretToken).trim();
    }

    console.log(`[Zalo setWebhook Proxy] Calling: ${endpoint}`);
    console.log(`[Zalo setWebhook Proxy] Webhook URL: ${webhookUrl}`);

    const zaloResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Zalo API trả về non-JSON nếu token sai
    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      console.log("[Zalo setWebhook Proxy] Response:", data);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    } else {
      const text = await zaloResponse.text();
      console.error("[Zalo setWebhook Proxy] Non-JSON response:", text);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: `Zalo API trả về lỗi: ${text.slice(0, 300)}`,
        })
      );
    }
  } catch (err: any) {
    console.error("[Zalo setWebhook Proxy Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi gọi Zalo Bot API setWebhook",
      })
    );
  }
}
