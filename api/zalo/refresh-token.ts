import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
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
      try {
        body = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
      } catch (e) {
        body = {};
      }
    }

    const { appId, secretKey, refreshToken } = body;

    if (!appId || !secretKey || !refreshToken) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu appId, secretKey hoặc refreshToken Zalo OA",
        })
      );
      return;
    }

    // Zalo OAuth v4 Refresh Access Token API Format
    const params = new URLSearchParams();
    params.append("refresh_token", String(refreshToken).trim());
    params.append("app_id", String(appId).trim());
    params.append("grant_type", "refresh_token");

    console.log(`[Zalo Refresh Token Proxy] Refreshing token for App ID: ${appId}`);

    const zaloResponse = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "secret_key": String(secretKey).trim(),
      },
      body: params.toString(),
    });

    const data = await zaloResponse.json();
    console.log("[Zalo Refresh Token Proxy] Response:", data);

    if (data.access_token) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          expiresIn: data.expires_in || 86400, // 24 hours default
        })
      );
    } else {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          description:
            data.error_name ||
            data.message ||
            data.error_description ||
            "Không thể làm mới Access Token từ Refresh Token Zalo OA. Vui lòng kiểm tra lại Secret Key & Refresh Token.",
        })
      );
    }
  } catch (err: any) {
    console.error("[Zalo Refresh Token Proxy Error]:", err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi làm mới Access Token Zalo OA",
      })
    );
  }
}
