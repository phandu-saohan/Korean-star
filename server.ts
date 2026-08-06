import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Proxy Supabase REST API (giải quyết lỗi CORS trình duyệt)
// Mọi request /api/supabase-proxy/* sẽ được chuyển tiếp tới Supabase server
app.all("/api/supabase-proxy/*", async (req, res) => {
  const getCleanEnv = (key: string, fallback: string): string => {
    const val = process.env[key];
    if (!val || typeof val !== "string" || !val.trim()) return fallback;
    return val.trim().replace(/^["']|["']$/g, "");
  };

  const rawSupabaseUrl = getCleanEnv("VITE_SUPABASE_URL", "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io");
  const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, "");

  const anonKey = getCleanEnv(
    "VITE_SUPABASE_ANON_KEY",
    getCleanEnv(
      "SUPABASE_ANON_KEY",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
    )
  );

  // Parse path chính xác bằng req.originalUrl hoặc req.url (giữ nguyên query params)
  const fullReqUrl = req.originalUrl || req.url || "";
  const proxySubPath = fullReqUrl.replace(/^.*?\/api\/supabase-proxy/, "").replace(/^\/+/, "");
  const targetUrl = `${supabaseUrl}/${proxySubPath}`;

  // Kiểm tra Authorization header: fallback sang anonKey nếu client gửi token rỗng/hỏng
  let authHeader = req.headers.authorization as string | undefined;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.includes("undefined") || authHeader.includes("null") || authHeader.length < 20) {
    authHeader = `Bearer ${anonKey}`;
  }

  try {
    const headers: Record<string, string> = {
      "apikey": anonKey,
      "Authorization": authHeader,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }

    if (req.headers.accept) headers["Accept"] = req.headers.accept as string;
    if (req.headers.prefer) headers["Prefer"] = req.headers.prefer as string;
    if (req.headers.range) headers["Range"] = req.headers.range as string;
    if (req.headers["x-client-info"]) headers["X-Client-Info"] = req.headers["x-client-info"] as string;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    console.log(`[Supabase Proxy] ${req.method} ${targetUrl}`);
    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    if (response.status >= 400) {
      console.warn(`[Supabase Proxy Warning ${response.status}] ${req.method} ${targetUrl} ->`, text.substring(0, 300));
    }

    res.status(response.status);
    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range")!);
    }
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err: any) {
    console.error("[Supabase Proxy Error]:", err.message);
    res.status(502).json({ error: "Proxy error", message: err.message });
  }
});

// API: Proxy OneSignal send-notification (tránh lỗi CORS & 401 khi gọi từ trình duyệt)
app.post("/api/onesignal/send-notification", async (req, res) => {
  try {
    const { appId, apiKey, title, message, filters, data, url } = req.body || {};

    const targetAppId = appId || process.env.ONESIGNAL_APP_ID || "f1f45c7b-fe36-4640-b117-a64cc8fab436";
    const rawKey = (apiKey && typeof apiKey === "string" && apiKey.trim() && !apiKey.includes("demo"))
      ? apiKey.trim()
      : (process.env.ONESIGNAL_REST_API_KEY || "");
    const targetApiKey = rawKey.replace(/^Basic\s+/i, "").trim();

    if (!targetAppId || !title || !message) {
      return res.status(400).json({ ok: false, description: "Thiếu appId, title hoặc message" });
    }

    if (!targetApiKey) {
      return res.status(400).json({
        ok: false,
        description: "Thiếu OneSignal REST API Key. Vui lòng cấu hình biến môi trường ONESIGNAL_REST_API_KEY."
      });
    }

    const payload: any = {
      app_id: targetAppId,
      headings: { en: title, vi: title },
      contents: { en: message, vi: message },
      data: data || {},
      url: url || process.env.SITE_URL || "https://saohan.vn"
    };

    if (Array.isArray(filters) && filters.length > 0) {
      payload.filters = filters;
    } else {
      payload.included_segments = ["All"];
    }

    // OneSignal v2 key (os_v2_app_...) dùng Bearer, v1 key dùng Basic
    const authPrefix = targetApiKey.startsWith("os_v2_") ? "Bearer" : "Basic";
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `${authPrefix} ${targetApiKey}`
    };

    console.log(`[OneSignal Proxy Push] AppID: ${targetAppId}`);
    console.log(`[OneSignal Proxy] Auth: ${authPrefix} | KeyFrom: ${apiKey ? "client" : "env"} | KeyStart: ${targetApiKey.substring(0, 20)}...`);

    let osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    let responseData: any = await osResponse.json();

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

    if (
      Array.isArray(responseData?.errors) &&
      responseData.errors.some((e: string) => typeof e === "string" && e.includes("All included players are not subscribed"))
    ) {
      return res.json({
        ok: true,
        noSubscribers: true,
        description: "Chưa có thiết bị trình duyệt nào nhấn BẬT THÔNG BÁO (Allow Notifications) trên ứng dụng OneSignal này."
      });
    }

    return res.status(osResponse.status || 200).json(responseData);
  } catch (err: any) {
    console.error("[OneSignal Proxy Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi gửi OneSignal Notification",
    });
  }
});

// API: Proxy Zalo Bot sendMessage (tránh lỗi CORS khi gọi từ trình duyệt)
app.post("/api/zalo/send-message", async (req, res) => {
  try {
    const { botToken, chatId, text, parseMode } = req.body;

    if (!botToken || !chatId || !text) {
      return res.status(400).json({ ok: false, description: "Thiếu botToken, chatId hoặc text" });
    }

    const cleanToken = String(botToken).replace(/^\//, "").replace(/^bot/i, "").trim();
    const endpoint = `https://bot-api.zaloplatforms.com/bot${cleanToken}/sendMessage`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Api-Secret-Token": cleanToken
      },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: String(text),
        parse_mode: parseMode || "markdown",
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    } else {
      const rawText = await response.text();
      return res.json({ ok: false, description: `Zalo API lỗi: ${rawText.slice(0, 300)}` });
    }
  } catch (err: any) {
    console.error("[Zalo sendMessage Proxy Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi gọi Zalo Bot API sendMessage",
    });
  }
});

// API: Proxy Zalo Bot setWebhook (tránh lỗi CORS khi gọi từ trình duyệt)
app.post("/api/zalo/set-webhook", async (req, res) => {
  try {
    const { botToken, webhookUrl, secretToken } = req.body;

    if (!botToken || !webhookUrl) {
      return res.status(400).json({ ok: false, description: "Thiếu botToken hoặc webhookUrl" });
    }

    const cleanToken = String(botToken).replace(/^\//, "").replace(/^bot/i, "").trim();
    if (!cleanToken) {
      return res.status(400).json({ ok: false, description: "Bot Token không hợp lệ" });
    }

    const endpoint = `https://bot-api.zaloplatforms.com/bot${cleanToken}/setWebhook`;
    const payload: any = { url: webhookUrl };
    if (secretToken && String(secretToken).trim().length >= 8) {
      payload.secret_token = String(secretToken).trim();
    }

    console.log(`[Zalo setWebhook Dokploy] Calling: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Api-Secret-Token": cleanToken
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.status;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.ok === true || data.result !== undefined) {
        return res.json({ ok: true, result: data.result || data, description: "Kích hoạt Webhook Zalo Bot thành công!" });
      } else {
        const errMsg = data.description || data.error || data.message || JSON.stringify(data);
        return res.json({
          ok: false,
          description: `Zalo Bot API lỗi: ${errMsg}`,
          httpStatus: statusCode,
          debug: { token_preview: `${cleanToken.slice(0, 10)}...`, endpoint, webhookUrl }
        });
      }
    } else {
      const text = await response.text();
      let userFriendlyError = "Lỗi không xác định từ Zalo Bot API";
      if (statusCode === 401 || text.toLowerCase().includes("unauthorized")) {
        userFriendlyError = "Zalo Bot Token không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại Bot Token trên Zalo Developer.";
      } else if (statusCode === 403 || text.toLowerCase().includes("forbidden")) {
        userFriendlyError = "Token không có quyền truy cập. Đảm bảo Bot đã được kích hoạt trên Zalo Platform.";
      } else if (text.trim()) {
        userFriendlyError = text.slice(0, 300);
      }
      return res.json({
        ok: false,
        description: userFriendlyError,
        httpStatus: statusCode,
        debug: { token_preview: `${cleanToken.slice(0, 10)}...`, endpoint, webhookUrl }
      });
    }
  } catch (err: any) {
    console.error("[Zalo setWebhook Proxy Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi kết nối server khi gọi Zalo Bot API setWebhook",
    });
  }
});

// API: AI Skin Analysis (Phân tích da AI thông minh & Đề xuất phác đồ điều trị)
app.post("/api/skin-analysis", async (req, res) => {
  try {
    const { imageBase64, imageMimeType, skinNotes, skinTypeInput } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback mock AI response if GEMINI_API_KEY is not set
      return res.json({
        success: true,
        source: "fallback",
        analysis: {
          skinType: skinTypeInput || "Hỗn hợp thiên dầu (Combination-Oily)",
          overallScore: 76,
          scores: {
            pore: 68,
            pigmentation: 72,
            moisture: 80,
            wrinkle: 85,
            elasticity: 75,
            acne: 70
          },
          summary: "Làn da có dấu hiệu tăng sắc tố nhẹ ở vùng má, lỗ chân lông hơi giãn nở vùng chữ T. Độ ẩm bề mặt đạt mức trung bình tốt.",
          keyConcerns: [
            "Tàn nhang và đốm nâu nhẹ vùng gò má",
            "Lỗ chân lông to vùng cánh mũi",
            "Thiếu hụt độ ẩm tầng sâu"
          ],
          treatmentPlan: [
            {
              step: 1,
              name: "Liệu trình Laser Pico Toning 4K",
              frequency: "3 buổi (khoảng cách 2 tuần/lần)",
              purpose: "Phá vỡ sắc tố hắc tố melanin, làm sáng đều màu da và thu nhỏ lỗ chân lông",
              estimatedCost: "4.500.000 VNĐ"
            },
            {
              step: 2,
              name: "Tiêm Vi Điểm Profhilo Trẻ Hóa Tế Bào",
              frequency: "2 buổi (khoảng cách 1 tháng/lần)",
              purpose: "Cung cấp HA nồng độ cao tinh khiết giúp săn chắc da & căng bóng tầng sâu",
              estimatedCost: "12.000.000 VNĐ"
            },
            {
              step: 3,
              name: "Chăm sóc da chuyên sâu Hydro-Facial Detox",
              frequency: "1 buổi/tuần",
              purpose: "Làm sạch sâu lỗ chân lông, cấp nước cấp ẩm tự nhiên",
              estimatedCost: "1.200.000 VNĐ"
            }
          ],
          homecareRoutine: [
            "Tẩy trang dạng dầu dịu nhẹ & Sữa rửa mặt pH 5.5",
            "Serum Niacinamide 10% + Zinc 1% buổi sáng",
            "Serum Vitamin C Tinh khiết 15% chống oxy hóa",
            "Kem chống nắng Phổ rộng SPF 50+ PA++++ (thoa lại sau 4h)"
          ]
        }
      });
    }

    const systemInstruction = `Bạn là Chuyên gia Da liễu & Thẩm mỹ hàng đầu tại KOREAN STAR Bệnh Viện Thẩm Mỹ Quốc Tế.
Hãy phân tích hình ảnh/mô tả da của khách hàng và đưa ra kết quả phân tích chỉ số chi tiết, đánh giá tình trạng da và đề xuất phác đồ điều trị chuyên biệt.
Kết quả phải trả về bằng tiếng Việt chuẩn y khoa thẩm mỹ, dễ hiểu, chuyên nghiệp và có giá trị tư vấn cao.`;

    const promptText = `Phân tích tình trạng da dựa trên dữ liệu khách hàng cung cấp.
Ghi chú bổ sung từ khách hàng: ${skinNotes || "Không có"}
Loại da khách hàng tự đánh giá: ${skinTypeInput || "Chưa xác định"}

Hãy trả về định dạng JSON với các thông tin:
- skinType (string): Loại da (ví dụ: "Da hỗn hợp thiên dầu", "Da khô thiếu nước", "Da nhạy cảm lão hóa", ...)
- overallScore (number 1-100): Điểm tổng thể sức khỏe da
- scores (object):
   + pore (number 1-100): Điểm độ mịn lỗ chân lông
   + pigmentation (number 1-100): Điểm độ đồng đều màu da / hắc tố
   + moisture (number 1-100): Điểm độ ẩm
   + wrinkle (number 1-100): Điểm độ đàn hồi / nếp nhăn
   + elasticity (number 1-100): Điểm săn chắc
   + acne (number 1-100): Điểm sạch mụn
- summary (string): Đánh giá tổng quan 2-3 câu ngắn gọn sắc sảo
- keyConcerns (array of string): Top 3 vấn đề da cần khắc phục
- treatmentPlan (array of object: step, name, frequency, purpose, estimatedCost): Phác đồ trị liệu đề xuất tại KOREAN STAR
- homecareRoutine (array of string): Hướng dẫn chăm sóc da tại nhà`;

    let parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: cleanBase64
        }
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skinType: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            scores: {
              type: Type.OBJECT,
              properties: {
                pore: { type: Type.NUMBER },
                pigmentation: { type: Type.NUMBER },
                moisture: { type: Type.NUMBER },
                wrinkle: { type: Type.NUMBER },
                elasticity: { type: Type.NUMBER },
                acne: { type: Type.NUMBER }
              },
              required: ["pore", "pigmentation", "moisture", "wrinkle", "elasticity", "acne"]
            },
            summary: { type: Type.STRING },
            keyConcerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            treatmentPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.NUMBER },
                  name: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  estimatedCost: { type: Type.STRING }
                },
                required: ["step", "name", "frequency", "purpose", "estimatedCost"]
              }
            },
            homecareRoutine: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["skinType", "overallScore", "scores", "summary", "keyConcerns", "treatmentPlan", "homecareRoutine"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    return res.json({
      success: true,
      source: "gemini",
      analysis: result
    });
  } catch (error: any) {
    console.error("Error in AI skin analysis:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Lỗi xử lý phân tích da AI"
    });
  }
});

// API: AI Implant Size Recommendation Advisor
app.post("/api/ai-breast-advisor", async (req, res) => {
  try {
    const { height, weight, currentBust, shoulderWidth, desiredLook } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Calculate standard recommendation mathematically
      const h = Number(height) || 160;
      const w = Number(weight) || 50;
      let recommendedCc = 285;
      if (h >= 165 && w >= 55) recommendedCc = 335;
      else if (h <= 155 && w <= 47) recommendedCc = 255;
      if (desiredLook === "dramatic") recommendedCc += 40;

      return res.json({
        success: true,
        recommendation: {
          recommendedCc,
          recommendedProfile: recommendedCc > 300 ? "High Profile (Nhô Cao)" : "Moderate Plus (Trung Bình Cao)",
          recommendedShape: "Ergonomix (Hình Giọt Nước Linh Hoạt)",
          reasoning: `Dựa trên chiều cao ${h}cm, cân nặng ${w}kg và khung vai ${shoulderWidth || 38}cm, size ${recommendedCc}cc tạo đường nét khe ngực Y-Line tự nhiên, vừa vặn không gây gánh nặng cho sống lưng.`,
          idealRange: `${recommendedCc - 20}cc - ${recommendedCc + 20}cc`
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Khách hàng thẩm mỹ nâng ngực có chỉ số:
- Chiều cao: ${height} cm
- Cân nặng: ${weight} kg
- Vòng 1 hiện tại: ${currentBust} cm
- Bề rộng vai: ${shoulderWidth} cm
- Phong cách mong muốn: ${desiredLook === 'natural' ? 'Tự nhiên mềm mại' : 'Gợi cảm căng tròn quyến rũ'}

Hãy tư vấn chọn size túi ngực (cc), độ nhô (profile) và hình dáng phù hợp nhất chuẩn tỷ lệ vàng cơ thể. Trả về định dạng JSON:
{
  "recommendedCc": number,
  "recommendedProfile": string,
  "recommendedShape": string,
  "reasoning": string,
  "idealRange": string
}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({ success: true, recommendation: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API: Zalo Bot Webhook Endpoint (Tự động nhận sự kiện nhắn tin & Phản hồi Chat ID)
app.post("/api/zalo/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("RECEIVED ZALO BOT WEBHOOK EVENT:", JSON.stringify(body));

    // Structure check for Zalo Bot API Webhook payload
    const message = body.message || body.data;
    const chatId = message?.chat?.id || message?.from?.id || body.chat_id || body.chatId;
    const senderName = message?.from?.display_name || message?.from?.first_name || message?.from?.name || "Khách hàng Zalo";
    const text = (message?.text || body.text || "").trim();

    if (chatId) {
      console.log(`[Zalo Webhook] Message from ${senderName} (Chat ID: ${chatId}): "${text}"`);

      // Determine bot token from env
      const botToken = process.env.ZALO_BOT_TOKEN || process.env.VITE_ZALO_BOT_TOKEN || "";

      if (botToken) {
        const replyText =
          `🤖 *XIN CHÀO! THÔNG TIN CHAT ID ZALO CỦA BẠN*\n\n` +
          `👤 Tên Zalo: *${senderName}*\n` +
          `🔑 Zalo Chat ID: \`${chatId}\`\n\n` +
          `💡 Hãy sao chép chuỗi số Chat ID ở trên và nhập vào ô **Zalo Chat ID** trong Hồ Sơ Cá Nhân trên ứng dụng KOREAN STAR để nhận thông báo Lịch Hẹn & Hoa Hồng tự động!`;

        // Auto-reply back to user via Zalo Bot API sendMessage endpoint
        try {
          await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: String(chatId),
              text: replyText,
              parse_mode: "markdown"
            })
          });
          console.log(`[Zalo Webhook] Replied automatically to Chat ID ${chatId}`);
        } catch (fetchErr) {
          console.error("[Zalo Webhook] Error sending reply:", fetchErr);
        }
      }
    }

    return res.status(200).json({ ok: true, status: "webhook_received" });
  } catch (err: any) {
    console.error("[Zalo Webhook Error]:", err);
    return res.status(200).json({ ok: true });
  }
});

// Setup Vite Development Middleware or Static Serve for Prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = http.createServer({ maxHeaderSize: 128 * 1024 }, app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`KOREAN STAR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
