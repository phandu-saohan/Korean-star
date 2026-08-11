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

    const { zaloUserId, phone, name, avatar, accessToken } = body;

    const cleanUid = String(zaloUserId || "").trim();
    let cleanPhone = String(phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("84")) {
      cleanPhone = "0" + cleanPhone.slice(2);
    }

    if (!cleanUid && !cleanPhone && !accessToken) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Vui lòng cung cấp Zalo User ID (UID), Số điện thoại hoặc Zalo Access Token!",
        })
      );
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    let userProfile: any = null;
    let isNewUser = false;

    if (supabaseUrl && supabaseKey) {
      try {
        // 1. Check if user exists by zalo_chat_id
        if (cleanUid) {
          const uidRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?zalo_chat_id=eq.${cleanUid}&select=*`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
          });
          const uidData = await uidRes.json();
          if (Array.isArray(uidData) && uidData.length > 0) {
            userProfile = uidData[0];
          }
        }

        // 2. Check if user exists by phone
        if (!userProfile && cleanPhone) {
          const shortPhone = cleanPhone.slice(-9);
          const phoneRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?phone=ilike.%25${shortPhone}%25&select=*`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
          });
          const phoneData = await phoneRes.json();
          if (Array.isArray(phoneData) && phoneData.length > 0) {
            userProfile = phoneData[0];
            // Link zalo_chat_id to profile
            if (cleanUid && !userProfile.zalo_chat_id) {
              await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userProfile.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseKey,
                  "Authorization": `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                  zalo_chat_id: cleanUid,
                  updated_at: new Date().toISOString()
                })
              });
              userProfile.zalo_chat_id = cleanUid;
            }
          }
        }

        // 3. If user does not exist, auto-create new CTV account with Zalo profile
        if (!userProfile) {
          isNewUser = true;
          const randomDigits = Math.floor(100000 + Math.random() * 900000);
          const ctvCode = `CTV-ZALO-${randomDigits}`;
          const newUserId = `zalo-${cleanUid || Date.now()}`;
          const finalPhone = cleanPhone || `09${Math.floor(10000000 + Math.random() * 90000000)}`;
          const email = `zalo.${cleanUid || randomDigits}@koreanstar.vn`;
          const fullName = name && String(name).trim() ? String(name).trim() : `CTV Zalo #${randomDigits}`;

          const insertRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              id: newUserId,
              full_name: fullName,
              phone: finalPhone,
              email: email,
              role: "ctv",
              ctv_code: ctvCode,
              zalo_chat_id: cleanUid || null,
              avatar_url: avatar || null,
              tier: "Đồng",
              available_balance: 0,
              pending_balance: 0,
              total_revenue: 0,
              total_commission: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          });

          const insertedData = await insertRes.json();
          if (Array.isArray(insertedData) && insertedData.length > 0) {
            userProfile = insertedData[0];
          } else {
            // Fallback object if Supabase table has different constraints
            userProfile = {
              id: newUserId,
              full_name: fullName,
              phone: finalPhone,
              email: email,
              role: "ctv",
              ctv_code: ctvCode,
              zalo_chat_id: cleanUid,
              avatar_url: avatar || null,
              tier: "Đồng",
              available_balance: 0,
              pending_balance: 0,
              total_revenue: 0,
              total_commission: 0
            };
          }
        }
      } catch (dbErr) {
        console.error("[Zalo Login DB Error]:", dbErr);
      }
    }

    // Format final AuthUserProfile object for React client
    const formattedProfile = {
      id: userProfile?.id || `zalo-${cleanUid || Date.now()}`,
      fullName: userProfile?.full_name || userProfile?.fullName || name || "Thành Viên Zalo",
      email: userProfile?.email || `zalo.${cleanUid || "user"}@koreanstar.vn`,
      phone: userProfile?.phone || cleanPhone || "",
      role: userProfile?.role || "ctv",
      ctvCode: userProfile?.ctv_code || userProfile?.ctvCode || `CTV-ZALO-${cleanUid.slice(-6)}`,
      zaloChatId: cleanUid || userProfile?.zalo_chat_id || userProfile?.zaloChatId || "",
      avatarUrl: avatar || userProfile?.avatar_url || userProfile?.avatarUrl || "",
      tier: userProfile?.tier || "Đồng",
      availableBalance: Number(userProfile?.available_balance || userProfile?.availableBalance || 0),
      pendingBalance: Number(userProfile?.pending_balance || userProfile?.pendingBalance || 0),
      totalRevenue: Number(userProfile?.total_revenue || userProfile?.totalRevenue || 0),
      totalCommission: Number(userProfile?.total_commission || userProfile?.totalCommission || 0)
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        userProfile: formattedProfile,
        isNewUser,
        description: isNewUser
          ? `✨ Đã tự động tạo tài khoản CTV mới cho Zalo ID ${cleanUid}!`
          : `🎉 Đăng nhập tài khoản CTV bằng Zalo thành công!`,
      })
    );
  } catch (err: any) {
    console.error("[Zalo Login Server Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi đăng nhập bằng Zalo",
      })
    );
  }
}
