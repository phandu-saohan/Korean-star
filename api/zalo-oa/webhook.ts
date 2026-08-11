import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  // CORS & Security Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, X-Zalo-Secret-Token, X-Bot-Api-Secret-Token, X-Zalo-Signature"
  );

  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, status: 200 }));
    return;
  }

  // Handle Zalo GET verification check
  if (req.method === "GET" || req.method === "HEAD") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        status: 200,
        message: "Zalo Official Account (OA) Webhook Endpoint Active",
        timestamp: new Date().toISOString()
      })
    );
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

    console.log("[Zalo OA Webhook Received Event]:", JSON.stringify(body));

    // Extract Zalo User ID from Event payload
    const eventName = body.event_name || body.event_id || "";
    const zaloUserId =
      body.follower?.id ||
      body.sender?.id ||
      body.user_id_by_app ||
      body.user_id ||
      body.source?.user_id;

    if (zaloUserId) {
      console.log(`[Zalo OA Webhook] Event "${eventName}" from Zalo User ID: ${zaloUserId}`);

      // Handle user_interested_oa (Quan tâm OA) or follow / user_send_text
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://burmybxmzighthlusixg.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

      if (supabaseUrl && supabaseKey) {
        try {
          // 1. Fetch Zalo OA Access Token from Supabase cms_settings
          const cmsRes = await fetch(`${supabaseUrl}/rest/v1/cms_settings?id=eq.1&select=zalo_oa_access_token,zalo_bot_token`, {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`
            }
          });
          const cmsData = await cmsRes.json();
          const token = cmsData?.[0]?.zalo_oa_access_token || cmsData?.[0]?.zalo_bot_token || "";

          let matchedPhone = "";

          // 2. Query Zalo OpenAPI /oa/getprofile to get user's phone number if token is available
          if (token && String(token).length > 50) {
            try {
              const profileRes = await fetch(
                `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: String(zaloUserId) }))}`,
                {
                  headers: { "access_token": token }
                }
              );
              const profileData = await profileRes.json();
              console.log("[Zalo OA Webhook getprofile]:", profileData);

              const rawPhone = profileData?.data?.shared_info?.phone || profileData?.data?.phone || "";
              if (rawPhone) {
                matchedPhone = String(rawPhone).replace(/\D/g, "");
                if (matchedPhone.startsWith("84")) {
                  matchedPhone = "0" + matchedPhone.slice(2);
                }
              }
            } catch (pErr) {
              console.warn("[Zalo OA Webhook getprofile warning]:", pErr);
            }
          }

          // 3. Update Supabase public.user_profiles setting zalo_chat_id
          if (matchedPhone) {
            const shortPhone = matchedPhone.slice(-9);
            const updateRes = await fetch(
              `${supabaseUrl}/rest/v1/user_profiles?phone=ilike.%25${shortPhone}%25`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseKey,
                  "Authorization": `Bearer ${supabaseKey}`,
                  "Prefer": "return=representation"
                },
                body: JSON.stringify({
                  zalo_chat_id: String(zaloUserId),
                  updated_at: new Date().toISOString()
                })
              }
            );
            const updated = await updateRes.json();
            console.log(`[Zalo OA Webhook Auto Sync] Updated zalo_chat_id = ${zaloUserId} for CTV phone ${matchedPhone}:`, updated);
          }
        } catch (syncErr) {
          console.error("[Zalo OA Webhook Auto Sync Error]:", syncErr);
        }
      }
    }

    // Always respond immediately with HTTP Code 200 OK for Zalo OA Platform Verification
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        status: 200,
        message: "OK",
        event: eventName || "webhook_received",
        zaloUserId: zaloUserId || null
      })
    );
  } catch (err: any) {
    console.error("[Zalo OA Webhook Handler Error]:", err);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        status: 200,
        message: "OK"
      })
    );
  }
}
