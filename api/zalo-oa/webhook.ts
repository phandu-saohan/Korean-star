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

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, status: 200 }));
    return;
  }

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

    const eventName = body.event_name || body.event_id || "";
    const zaloUserId =
      body.follower?.id ||
      body.sender?.id ||
      body.user_id_by_app ||
      body.user_id ||
      body.source?.user_id;

    const messageText = (
      body.message?.text ||
      body.content ||
      body.text ||
      ""
    ).trim();

    if (zaloUserId) {
      console.log(`[Zalo OA Webhook] Event "${eventName}" from Zalo User ID: ${zaloUserId}, Msg: "${messageText}"`);

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

      if (supabaseUrl && supabaseKey) {
        try {
          const cmsRes = await fetch(`${supabaseUrl}/rest/v1/cms_settings?id=eq.1&select=zalo_oa_access_token,zalo_bot_token`, {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`
            }
          });
          const cmsData = await cmsRes.json();
          const token = cmsData?.[0]?.zalo_oa_access_token || cmsData?.[0]?.zalo_bot_token || "";

          // ----------------------------------------------------
          // PHƯƠNG PHÁP 1: KIỂM TRA MÃ ĐỊNH DANH (LINK_XXXXXX)
          // ----------------------------------------------------
          const normalizedMsg = messageText.toUpperCase().replace(/\s+/g, "_");
          if (normalizedMsg.includes("LINK_") || normalizedMsg.startsWith("LINK")) {
            const match = normalizedMsg.match(/LINK[_\s]*\d+/);
            if (match) {
              const rawCode = match[0].replace(/\s+/g, "_");
              const linkCode = rawCode.startsWith("LINK_") ? rawCode : rawCode.replace(/^LINK/, "LINK_");
              console.log(`[Zalo OA Webhook Code Match] Searching code "${linkCode}" for Zalo User ID: ${zaloUserId}`);

              const codeRes = await fetch(`${supabaseUrl}/rest/v1/zalo_linking_codes?code=eq.${linkCode}&select=*`, {
                headers: {
                  "apikey": supabaseKey,
                  "Authorization": `Bearer ${supabaseKey}`
                }
              });
              const codeRows = await codeRes.json();

              if (Array.isArray(codeRows) && codeRows.length > 0) {
                const linkData = codeRows[0];
                const updatePayload = {
                  zalo_chat_id: String(zaloUserId),
                  updated_at: new Date().toISOString()
                };

                let updatedCount = 0;

                // Update by user_id
                if (linkData.user_id) {
                  const uRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${linkData.user_id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": supabaseKey,
                      "Authorization": `Bearer ${supabaseKey}`,
                      "Prefer": "return=representation"
                    },
                    body: JSON.stringify(updatePayload)
                  });
                  const uData = await uRes.json();
                  if (Array.isArray(uData) && uData.length > 0) updatedCount += uData.length;
                }

                // Update by ctv_code
                if (linkData.ctv_code && updatedCount === 0) {
                  const cRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?ctv_code=eq.${linkData.ctv_code}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": supabaseKey,
                      "Authorization": `Bearer ${supabaseKey}`,
                      "Prefer": "return=representation"
                    },
                    body: JSON.stringify(updatePayload)
                  });
                  const cData = await cRes.json();
                  if (Array.isArray(cData) && cData.length > 0) updatedCount += cData.length;
                }

                // Update by phone
                if (linkData.phone && updatedCount === 0) {
                  const pRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?phone=ilike.%25${String(linkData.phone).slice(-9)}%25`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": supabaseKey,
                      "Authorization": `Bearer ${supabaseKey}`,
                      "Prefer": "return=representation"
                    },
                    body: JSON.stringify(updatePayload)
                  });
                  const pData = await pRes.json();
                  if (Array.isArray(pData) && pData.length > 0) updatedCount += pData.length;
                }

                console.log(`[Zalo OA Webhook Code Match SUCCESS] Linked Zalo UID ${zaloUserId} to ${updatedCount} CTV profiles!`);

                // Also upsert into public.zalo_users table if user_id present
                if (linkData.user_id) {
                  try {
                    await fetch(`${supabaseUrl}/rest/v1/zalo_users`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`,
                        "Prefer": "resolution=merge-duplicates"
                      },
                      body: JSON.stringify({
                        user_id: linkData.user_id,
                        zalo_uid: String(zaloUserId),
                        created_at: new Date().toISOString()
                      })
                    });
                  } catch (zErr) {}
                }

                // Send confirmation reply message via Zalo OA OpenAPI
                if (token && String(token).length > 50) {
                  try {
                    await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "access_token": token
                      },
                      body: JSON.stringify({
                        recipient: { user_id: String(zaloUserId) },
                        message: {
                          text: `🎉 Chúc mừng! Bạn đã liên kết thành công tài khoản CTV với Zalo OA Bệnh viện Thẩm mỹ Korean Star qua mã ${linkCode}. Từ bây giờ bạn sẽ tự động nhận thông báo Lịch hẹn và Hoa hồng tức thì.`
                        }
                      })
                    });
                  } catch (replyErr) {
                    console.warn("[Zalo OA Confirmation Reply Error]:", replyErr);
                  }
                }

                // Delete used linking code
                await fetch(`${supabaseUrl}/rest/v1/zalo_linking_codes?code=eq.${linkCode}`, {
                  method: "DELETE",
                  headers: {
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`
                  }
                });
              }
            }
          }

          // ----------------------------------------------------
          // PHƯƠNG PHÁP QUY TRÌNH PHỤ: TRA CỨU SĐT QUA /oa/getprofile
          // ----------------------------------------------------
          let matchedPhone = "";
          if (token && String(token).length > 50) {
            try {
              const profileRes = await fetch(
                `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: String(zaloUserId) }))}`,
                {
                  headers: { "access_token": token }
                }
              );
              const profileData = await profileRes.json();

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

          if (matchedPhone) {
            const shortPhone = matchedPhone.slice(-9);
            await fetch(
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
          }
        } catch (syncErr) {
          console.error("[Zalo OA Webhook Auto Sync Error]:", syncErr);
        }
      }
    }

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
