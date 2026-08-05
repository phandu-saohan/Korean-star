import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Bot-Api-Secret-Token, x-zalo-secret-token"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Health check endpoint for GET
  if (req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, status: 200, message: "Zalo Bot Webhook API Ready" }));
    return;
  }

  try {
    let body: any = req.body;

    // Parse stream buffer if needed
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

    console.log("RECEIVED OFFICIAL ZALO BOT WEBHOOK EVENT:", JSON.stringify(body));

    // 1. Validate Zalo Official Header: X-Bot-Api-Secret-Token
    const incomingSecretToken =
      (req.headers["x-bot-api-secret-token"] as string) ||
      (req.headers["x-zalo-secret-token"] as string) ||
      "";

    const host = req.headers.host || "korean-star.vercel.app";
    const fullUrl = new URL(req.url || "", `https://${host}`);
    const expectedSecretToken =
      fullUrl.searchParams.get("secret_token") ||
      process.env.ZALO_WEBHOOK_SECRET_TOKEN ||
      "";

    if (expectedSecretToken && incomingSecretToken && incomingSecretToken !== expectedSecretToken) {
      console.warn(`[Zalo Webhook Security] Invalid Secret Token. Received: ${incomingSecretToken}`);
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return;
    }

    // 2. Parse Zalo Official Payload Structure (June 2026 Docs)
    // Structure: { "ok": true, "result": { "event_name": "...", "message": { "from": { "id": "...", "display_name": "..." }, "chat": { "id": "..." }, "text": "..." } } }
    const resultObj = body.result || {};
    const eventName = (resultObj.event_name || body.event_name || "message.text.received") as string;
    const messageObj = resultObj.message || body.message || body.data || body;

    const chatId =
      messageObj?.chat?.id ||
      messageObj?.from?.id ||
      resultObj?.chat?.id ||
      body.chat_id ||
      body.chatId;

    const senderName =
      messageObj?.from?.display_name ||
      messageObj?.from?.first_name ||
      messageObj?.from?.name ||
      "Khách hàng Zalo";

    // Content types
    const textContent = (messageObj?.text || body.text || "").trim();
    const photoUrl = messageObj?.photo;
    const captionText = messageObj?.caption;
    const stickerUrl = messageObj?.url || messageObj?.sticker;
    const voiceUrl = messageObj?.voice_url;

    // 3. Extract Bot Token
    const queryToken = fullUrl.searchParams.get("token");
    const botToken =
      queryToken ||
      process.env.ZALO_BOT_TOKEN ||
      process.env.VITE_ZALO_BOT_TOKEN ||
      "";

    if (chatId && botToken) {
      console.log(`[Zalo Webhook Official] Message from ${senderName} (Chat ID: ${chatId}) [Event: ${eventName}]`);

      let eventSummary = "";
      switch (eventName) {
        case "message.image.received":
          eventSummary = `📷 Hình ảnh ${captionText ? `("${captionText}")` : ""}`;
          break;
        case "message.sticker.received":
          eventSummary = `🎨 Nhãn dán / Sticker`;
          break;
        case "message.voice.received":
          eventSummary = `🎙️ Tin nhắn thoại`;
          break;
        case "message.unsupported.received":
          eventSummary = `⚠️ Đã gửi tin nhắn loại chưa hỗ trợ`;
          break;
        case "message.text.received":
        default:
          eventSummary = textContent ? `💬 "${textContent}"` : "💬 Tin nhắn văn bản";
          break;
      }

      const replyText =
        `🤖 *XIN CHÀO ${senderName.toUpperCase()}!*\n` +
        `Cảm ơn bạn đã tương tác với Zalo Bot của **KOREAN STAR**!\n\n` +
        `👤 Người gửi: *${senderName}*\n` +
        `🔑 Zalo Chat ID: \`${chatId}\`\n` +
        `📌 Loại sự kiện: ${eventSummary}\n\n` +
        `💡 *HƯỚNG DẪN:* Hãy sao chép chuỗi số **Zalo Chat ID** (\`${chatId}\`) ở trên và dán vào ô **Zalo Chat ID** trong Hồ Sơ Cá Nhân trên ứng dụng KOREAN STAR để nhận thông báo Lịch Hẹn & Hoa Hồng tự động!`;

      try {
        const zaloRes = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: String(chatId),
            text: replyText,
            parse_mode: "markdown"
          })
        });
        const zaloData = await zaloRes.json();
        console.log("[Zalo Webhook Official] Send message response:", zaloData);
      } catch (fetchErr) {
        console.error("[Zalo Webhook Official] Fetch error:", fetchErr);
      }
    } else {
      console.warn(
        `[Zalo Webhook Warning] Missing parameters. ChatID: ${chatId || "MISSING"}, BotToken: ${
          botToken ? "OK" : "MISSING"
        }`
      );
    }

    // 4. Return standard Zalo official response
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Success", ok: true, receivedChatId: chatId || null }));
  } catch (err: any) {
    console.error("[Zalo Webhook Exception]:", err);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Success", ok: true }));
  }
}
