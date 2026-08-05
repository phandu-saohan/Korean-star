import express from "express";
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

// API: Proxy Zalo Bot sendMessage (tránh lỗi CORS khi gọi từ trình duyệt)
app.post("/api/zalo/send-message", async (req, res) => {
  try {
    const { botToken, chatId, text, parseMode } = req.body;

    if (!botToken || !chatId || !text) {
      return res.status(400).json({ ok: false, description: "Thiếu botToken, chatId hoặc text" });
    }

    const endpoint = `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    const endpoint = `https://bot-api.zaloplatforms.com/bot${botToken}/setWebhook`;
    const payload: any = { url: webhookUrl };
    if (secretToken && secretToken.trim()) {
      payload.secret_token = secretToken.trim();
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Zalo API có thể trả về non-JSON nếu token sai
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      return res.json({ ok: false, description: `Zalo API trả về lỗi không hợp lệ: ${text.slice(0, 200)}` });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KOREAN STAR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
