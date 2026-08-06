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

    // Chuẩn hóa token: loại bỏ khoảng trắng, dấu / đầu, prefix "bot"
    const cleanToken = String(botToken)
      .replace(/^\//, "")
      .replace(/^bot/i, "")
      .trim();

    if (!cleanToken) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, description: "Bot Token không hợp lệ" }));
      return;
    }

    // Zalo Bot API endpoint: /bot{TOKEN}/setWebhook
    const endpoint = `https://bot-api.zaloplatforms.com/bot${cleanToken}/setWebhook`;
    const payload: any = { url: webhookUrl };

    // Thêm secret_token nếu được cung cấp (dùng để Zalo xác thực khi gọi webhook về server)
    const cleanSecretToken = secretToken ? String(secretToken).trim() : "";
    if (cleanSecretToken && cleanSecretToken.length >= 8) {
      payload.secret_token = cleanSecretToken;
    }

    console.log(`[Zalo setWebhook] Calling: ${endpoint}`);
    console.log(`[Zalo setWebhook] Webhook URL: ${webhookUrl}`);
    console.log(`[Zalo setWebhook] Payload:`, JSON.stringify(payload));

    const zaloResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Zalo Bot API yêu cầu token trong header (theo tài liệu mới nhất)
        "X-Bot-Api-Secret-Token": cleanToken,
      },
      body: JSON.stringify(payload),
    });

    const statusCode = zaloResponse.status;
    const contentType = zaloResponse.headers.get("content-type") || "";

    console.log(`[Zalo setWebhook] HTTP Status: ${statusCode}`);

    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      console.log("[Zalo setWebhook] Response JSON:", data);

      // Zalo trả về { ok: true } hoặc { ok: false, description: "..." }
      if (data.ok === true || data.result !== undefined) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, result: data.result || data, description: "Webhook đã kích hoạt thành công!" }));
      } else {
        const errMsg = data.description || data.error || data.message || JSON.stringify(data);
        console.error(`[Zalo setWebhook] API Error: ${errMsg}`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          ok: false,
          description: `Zalo Bot API lỗi: ${errMsg}`,
          httpStatus: statusCode,
          debug: {
            token_preview: `${cleanToken.slice(0, 10)}...`,
            endpoint,
            webhookUrl
          }
        }));
      }
    } else {
      const text = await zaloResponse.text();
      console.error(`[Zalo setWebhook] Non-JSON response (HTTP ${statusCode}):`, text);

      // Phân tích thông báo lỗi cụ thể
      let userFriendlyError = "Lỗi không xác định từ Zalo Bot API";
      if (statusCode === 401 || text.toLowerCase().includes("unauthorized")) {
        userFriendlyError = "Zalo Bot Token không hợp lệ hoặc đã hết hạn. Vui lòng lấy token mới từ Zalo Bot Management.";
      } else if (statusCode === 403 || text.toLowerCase().includes("forbidden")) {
        userFriendlyError = "Token không có quyền truy cập. Đảm bảo bot đã được duyệt trên Zalo Platform.";
      } else if (statusCode === 404) {
        userFriendlyError = "Endpoint Zalo Bot API không tìm thấy. Token có thể sai format.";
      } else if (text.trim()) {
        userFriendlyError = text.slice(0, 300);
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        ok: false,
        description: userFriendlyError,
        httpStatus: statusCode,
        debug: {
          token_preview: `${cleanToken.slice(0, 10)}...`,
          endpoint,
          webhookUrl,
          rawResponse: text.slice(0, 200)
        }
      }));
    }
  } catch (err: any) {
    console.error("[Zalo setWebhook Error]:", err);
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
