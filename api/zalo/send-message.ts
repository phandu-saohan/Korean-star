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

    const { botToken, chatId, text, parseMode } = body;

    if (!botToken || !chatId || !text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu botToken, chatId hoặc text",
        })
      );
      return;
    }

    // Hỗ trợ cả Zalo Official Account OpenAPI (openapi.zalo.me) và Zalo Bot API
    const cleanToken = String(botToken).replace(/^\//, "").trim();
    const isOaAccessToken = cleanToken.length > 50 || cleanToken.includes("ey"); // JWT Access Token format
    const endpoint = isOaAccessToken 
      ? `https://openapi.zalo.me/v3.0/oa/message/cs`
      : `https://bot-api.zaloplatforms.com/bot${cleanToken}/sendMessage`;

    console.log(`[Zalo sendMessage Proxy] Sending via ${isOaAccessToken ? "Zalo OA OpenAPI" : "Zalo Bot Platform"} to Chat ID: ${chatId}`);

    const headersConfig: Record<string, string> = { "Content-Type": "application/json" };
    if (isOaAccessToken) {
      headersConfig["access_token"] = cleanToken;
    }

    const payloadBody = isOaAccessToken
      ? {
          recipient: { user_id: String(chatId) },
          message: { text: String(text) }
        }
      : {
          chat_id: String(chatId),
          text: String(text),
          parse_mode: parseMode || "markdown",
        };

    const zaloResponse = await fetch(endpoint, {
      method: "POST",
      headers: headersConfig,
      body: JSON.stringify(payloadBody),
    });

    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      console.log("[Zalo sendMessage Proxy] Response:", data);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    } else {
      const text2 = await zaloResponse.text();
      console.error("[Zalo sendMessage Proxy] Non-JSON response:", text2);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: `Zalo API lỗi: ${text2.slice(0, 300)}`,
        })
      );
    }
  } catch (err: any) {
    console.error("[Zalo sendMessage Proxy Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi gọi Zalo Bot API sendMessage",
      })
    );
  }
}
