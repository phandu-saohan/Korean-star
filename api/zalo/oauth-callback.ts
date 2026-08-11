import type { IncomingMessage, ServerResponse } from "http";

/**
 * Zalo OAuth v4 Callback Handler (/api/zalo/oauth-callback)
 * https://developers.zalo.me/docs/social-api/tham-khao/user-access-token-v4
 */
export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  try {
    const urlObj = new URL(req.url || "", `https://${req.headers.host || "saohan.vn"}`);
    const code = urlObj.searchParams.get("code") || "";
    const state = urlObj.searchParams.get("state") || "";

    if (!code) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Lỗi Zalo OAuth</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>❌ Không nhận được Authorization Code từ Zalo</h2>
          <p>Vui lòng đóng cửa sổ này và thử đăng nhập lại.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #0068ff; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Đóng Cửa Sổ</button>
        </body>
        </html>
      `);
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    // 1. Fetch Zalo App ID & Secret Key from Supabase cms_settings
    let appId = process.env.VITE_ZALO_APP_ID || "";
    let secretKey = process.env.VITE_ZALO_SECRET_KEY || "";

    if (supabaseUrl && supabaseKey) {
      try {
        const cmsRes = await fetch(`${supabaseUrl}/rest/v1/cms_settings?id=eq.1&select=zalo_oa_app_id,zalo_oa_secret_key`, {
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
        });
        const cmsData = await cmsRes.json();
        if (cmsData?.[0]?.zalo_oa_app_id) appId = cmsData[0].zalo_oa_app_id;
        if (cmsData?.[0]?.zalo_oa_secret_key) secretKey = cmsData[0].zalo_oa_secret_key;
      } catch (cmsErr) {
        console.warn("[Zalo OAuth Callback CMS settings warn]:", cmsErr);
      }
    }

    let accessToken = "";
    let zaloUid = "";
    let zaloName = "";
    let zaloAvatar = "";

    // 2. Exchange code for access_token v4 if appId and secretKey are present
    if (appId && secretKey) {
      try {
        const tokenRes = await fetch("https://oauth.zaloapp.com/v4/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "secret_key": secretKey
          },
          body: new URLSearchParams({
            code: code,
            app_id: appId,
            grant_type: "authorization_code"
          }).toString()
        });

        const tokenData = await tokenRes.json();
        console.log("[Zalo OAuth v4 Token Exchange]:", tokenData);
        if (tokenData?.access_token) {
          accessToken = tokenData.access_token;
        }
      } catch (tokenErr) {
        console.error("[Zalo OAuth Token Error]:", tokenErr);
      }
    }

    // 3. Fetch User Profile from Zalo Graph API v2.0 (/me)
    if (accessToken) {
      try {
        const graphRes = await fetch(`https://graph.zalo.me/v2.0/me?access_token=${accessToken}&fields=id,name,picture`);
        const graphData = await graphRes.json();
        console.log("[Zalo Graph API /me Profile]:", graphData);

        if (graphData?.id) {
          zaloUid = graphData.id;
          zaloName = graphData.name || "";
          zaloAvatar = graphData.picture?.data?.url || "";
        }
      } catch (graphErr) {
        console.error("[Zalo Graph API Error]:", graphErr);
      }
    }

    // Redirect to main site with Zalo Login payload
    const redirectTarget = `https://saohan.vn/?zalo_oauth_success=true&zalo_uid=${encodeURIComponent(zaloUid || code)}&zalo_name=${encodeURIComponent(zaloName)}`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Đăng Nhập Zalo Thành Công</title>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: "ZALO_OAUTH_SUCCESS",
              code: "${code}",
              zaloUid: "${zaloUid}",
              zaloName: "${zaloName}",
              zaloAvatar: "${zaloAvatar}"
            }, "*");
            window.close();
          } else {
            window.location.href = "${redirectTarget}";
          }
        </script>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>🎉 Đăng nhập Zalo thành công!</h2>
        <p>Hệ thống đang chuyển hướng bạn quay lại trang chủ Korean Star...</p>
        <a href="${redirectTarget}" style="color: #0068ff; font-weight: bold;">Nhấp vào đây nếu không tự chuyển hướng</a>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[Zalo OAuth Callback Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<h3>Lỗi xử lý Zalo OAuth Callback: ${err.message}</h3>`);
  }
}
