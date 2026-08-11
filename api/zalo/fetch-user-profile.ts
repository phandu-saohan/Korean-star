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

    const { accessToken, zaloUserId } = body;

    if (!accessToken || !String(accessToken).trim()) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu Zalo OA Access Token để tra cứu thông tin Zalo UID",
        })
      );
      return;
    }

    if (!zaloUserId || !String(zaloUserId).trim()) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu Zalo User ID (zaloUserId) để tra cứu",
        })
      );
      return;
    }

    const cleanToken = String(accessToken).replace(/^\//, "").trim();
    const cleanUserId = String(zaloUserId).trim();

    // Call Zalo Official Account OpenAPI /oa/getprofile
    const getProfileUrl = `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(
      JSON.stringify({ user_id: cleanUserId })
    )}`;

    const zaloResponse = await fetch(getProfileUrl, {
      method: "GET",
      headers: {
        access_token: cleanToken,
      },
    });

    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      console.log("[Zalo Fetch User Profile Response]:", data);

      if (data.error === 0) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            description: `Tra cứu Zalo User ID (${cleanUserId}) từ Zalo OA API thành công!`,
            profile: data.data || {},
            raw: data,
          })
        );
      } else {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: false,
            error_code: data.error,
            description: data.message || `Lỗi Zalo OA (Mã ${data.error})`,
            raw: data,
          })
        );
      }
    } else {
      const rawText = await zaloResponse.text();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: `Zalo API phản hồi lỗi: ${rawText.slice(0, 200)}`,
        })
      );
    }
  } catch (err: any) {
    console.error("[Zalo Fetch User Profile Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi tra cứu Zalo User ID",
      })
    );
  }
}
