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
    let response = await fetch(targetUrl, fetchOptions);
    let text = await response.text();

    // Fallback: nếu Supabase trả về >= 400 do Token Auth của trình duyệt hết hạn/không hợp lệ, thử lại với anonKey chuẩn
    if (response.status >= 400 && headers["Authorization"] !== `Bearer ${anonKey}`) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${anonKey}` };
      const retryOptions = { ...fetchOptions, headers: retryHeaders };
      const retryRes = await fetch(targetUrl, retryOptions);
      const retryText = await retryRes.text();
      if (retryRes.status < 400) {
        console.log(`[Supabase Proxy] Fixed ${response.status} -> ${retryRes.status} via anonKey fallback!`);
        response = retryRes;
        text = retryText;
      }
    }

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
    if (req.method === "GET" || req.method === "HEAD") {
      res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify([]));
    } else {
      res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify({ ok: false, error: err.message }));
    }
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
      return res.json({
        ok: true,
        localOnly: true,
        description: "Chưa cấu hình OneSignal REST API Key. Thông báo đã được hiển thị trên giao diện Web & Trình duyệt local."
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
    const isOaAccessToken = cleanToken.length > 50 || cleanToken.includes("ey");
    const endpoint = isOaAccessToken
      ? `https://openapi.zalo.me/v3.0/oa/message/cs`
      : `https://bot-api.zaloplatforms.com/bot${cleanToken}/sendMessage`;

    const headersConfig: Record<string, string> = { "Content-Type": "application/json" };
    if (isOaAccessToken) {
      headersConfig["access_token"] = cleanToken;
    } else {
      headersConfig["X-Bot-Api-Secret-Token"] = cleanToken;
    }

    const payloadBody = isOaAccessToken
      ? {
          recipient: { user_id: String(chatId) },
          message: { text: String(text) }
        }
      : {
          chat_id: String(chatId),
          text: String(text),
          parse_mode: parseMode || "markdown",
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: headersConfig,
      body: JSON.stringify(payloadBody),
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

// API: Proxy Test Kết Nối Zalo Official Account (OA) API
app.post("/api/zalo/test-connection", async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken || !String(accessToken).trim()) {
      return res.status(400).json({ ok: false, description: "Thiếu Zalo OA Access Token để kiểm tra kết nối API" });
    }

    const cleanToken = String(accessToken).replace(/^\//, "").trim();

    const response = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      method: "GET",
      headers: {
        "access_token": cleanToken,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.error === 0) {
        return res.json({
          ok: true,
          description: "Kết nối Zalo Official Account (OA) API thành công!",
          oaInfo: data.data || {},
          raw: data,
        });
      } else {
        return res.json({
          ok: false,
          error_code: data.error,
          description: data.message || `Zalo OA API lỗi (Mã ${data.error})`,
          raw: data,
        });
      }
    } else {
      const rawText = await response.text();
      return res.json({ ok: false, description: `Zalo API phản hồi lỗi: ${rawText.slice(0, 200)}` });
    }
  } catch (err: any) {
    console.error("[Zalo Test Connection Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi kiểm tra kết nối Zalo OA API",
    });
  }
});

// API: Proxy Liên kết Zalo User ID (UID) với hồ sơ CTV trong Supabase
app.post("/api/zalo/link-ctv", async (req, res) => {
  try {
    const { phone, ctvCode, zaloChatId } = req.body;

    if (!zaloChatId || !String(zaloChatId).trim()) {
      return res.status(400).json({ ok: false, description: "Thiếu Zalo User ID (zaloChatId) để liên kết" });
    }

    const cleanZaloId = String(zaloChatId).trim();
    const cleanPhone = phone ? String(phone).replace(/\D/g, "") : "";
    const cleanCtvCode = ctvCode ? String(ctvCode).trim().toUpperCase() : "";

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseKey) {
      let queryFilter = "";
      if (cleanPhone) {
        const shortPhone = cleanPhone.slice(-9);
        queryFilter = `phone=ilike.%25${shortPhone}%25`;
      } else if (cleanCtvCode) {
        queryFilter = `ctv_code=eq.${cleanCtvCode}`;
      }

      if (queryFilter) {
        const updateRes = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?${queryFilter}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=representation",
            },
            body: JSON.stringify({
              zalo_chat_id: cleanZaloId,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (updateRes.ok) {
          const updatedUsers = await updateRes.json();
          return res.json({
            ok: true,
            description: `Đã liên kết Zalo User ID (${cleanZaloId}) với hồ sơ CTV thành công!`,
            updatedUsers,
          });
        }
      }
    }

    return res.json({
      ok: true,
      description: `Đã tiếp nhận Zalo User ID (${cleanZaloId}) để liên kết cho CTV!`,
      zaloChatId: cleanZaloId,
    });
  } catch (err: any) {
    console.error("[Zalo Link CTV Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi liên kết Zalo User ID cho CTV",
    });
  }
});

// API: Proxy Tra Cứu Thông Tin Profile Zalo User ID (UID) từ Zalo OA API
app.post("/api/zalo/fetch-user-profile", async (req, res) => {
  try {
    const { accessToken, zaloUserId } = req.body;

    if (!accessToken || !String(accessToken).trim()) {
      return res.status(400).json({ ok: false, description: "Thiếu Zalo OA Access Token để tra cứu" });
    }
    if (!zaloUserId || !String(zaloUserId).trim()) {
      return res.status(400).json({ ok: false, description: "Thiếu Zalo User ID (zaloUserId) để tra cứu" });
    }

    const cleanToken = String(accessToken).replace(/^\//, "").trim();
    const cleanUserId = String(zaloUserId).trim();

    const getProfileUrl = `https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(
      JSON.stringify({ user_id: cleanUserId })
    )}`;

    const zaloResponse = await fetch(getProfileUrl, {
      method: "GET",
      headers: { access_token: cleanToken },
    });

    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      if (data.error === 0) {
        return res.json({
          ok: true,
          description: `Tra cứu Zalo User ID (${cleanUserId}) thành công!`,
          profile: data.data || {},
          raw: data,
        });
      } else {
        return res.json({
          ok: false,
          error_code: data.error,
          description: data.message || `Lỗi Zalo OA (Mã ${data.error})`,
          raw: data,
        });
      }
    } else {
      const rawText = await zaloResponse.text();
      return res.json({ ok: false, description: `Zalo API phản hồi lỗi: ${rawText.slice(0, 200)}` });
    }
  } catch (err: any) {
    console.error("[Zalo Fetch User Profile Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi tra cứu thông tin Zalo UID",
    });
  }
});

// API: Proxy Lấy Danh Sách Người Dùng Zalo OA (/v3.0/oa/user/getlist)
app.post("/api/zalo/fetch-followers", async (req, res) => {
  try {
    const {
      accessToken,
      offset = 0,
      count = 50,
      tagName,
      lastInteractionPeriod,
      isFollower = "true"
    } = req.body;

    if (!accessToken || !String(accessToken).trim()) {
      return res.status(400).json({ ok: false, description: "Thiếu Zalo OA Access Token để lấy danh sách người dùng" });
    }

    const cleanToken = String(accessToken).replace(/^\//, "").trim();
    const limitCount = Math.min(Number(count) || 50, 50);
    const startOffset = Math.min(Number(offset) || 0, 9951);

    // 1. Zalo OpenAPI v3.0: /v3.0/oa/user/getlist
    const v3QueryData: any = {
      offset: startOffset,
      count: limitCount,
      is_follower: String(isFollower)
    };
    if (tagName && String(tagName).trim()) {
      v3QueryData.tag_name = String(tagName).trim();
    }
    if (lastInteractionPeriod && String(lastInteractionPeriod).trim()) {
      v3QueryData.last_interaction_period = String(lastInteractionPeriod).trim();
    }

    const getListV3Url = `https://openapi.zalo.me/v3.0/oa/user/getlist?data=${encodeURIComponent(
      JSON.stringify(v3QueryData)
    )}`;

    try {
      const v3Res = await fetch(getListV3Url, {
        method: "GET",
        headers: { access_token: cleanToken },
      });

      const contentType = v3Res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await v3Res.json();
        if (data.error === 0) {
          const userList = data.data?.users || data.data?.followers || [];
          return res.json({
            ok: true,
            description: `Lấy danh sách người dùng Zalo OA v3.0 (${userList.length}/${data.data?.total || userList.length}) thành công!`,
            total: data.data?.total || userList.length,
            count: data.data?.count || userList.length,
            offset: data.data?.offset || startOffset,
            followers: userList,
            users: userList,
            apiVersion: "v3.0",
            raw: data,
          });
        }
      }
    } catch (v3Err) {
      console.warn("[Zalo v3.0 user/getlist Warning]:", v3Err);
    }

    // 2. Fallback sang v2.0 /v2.0/oa/getfollowers
    const v2QueryData: any = {
      offset: startOffset,
      count: limitCount,
    };
    if (tagName && String(tagName).trim()) {
      v2QueryData.tag_name = String(tagName).trim();
    }

    const getFollowersUrl = `https://openapi.zalo.me/v2.0/oa/getfollowers?data=${encodeURIComponent(
      JSON.stringify(v2QueryData)
    )}`;

    const zaloResponse = await fetch(getFollowersUrl, {
      method: "GET",
      headers: { access_token: cleanToken },
    });

    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      const userList = data.data?.followers || data.data?.users || [];
      if (data.error === 0) {
        return res.json({
          ok: true,
          description: `Lấy danh sách người quan tâm OA v2.0 (${userList.length}/${data.data?.total || userList.length}) thành công!`,
          total: data.data?.total || userList.length,
          followers: userList,
          users: userList,
          apiVersion: "v2.0",
          raw: data,
        });
      } else {
        return res.json({
          ok: false,
          error_code: data.error,
          description: data.message || `Lỗi Zalo OA (Mã ${data.error})`,
          raw: data,
        });
      }
    } else {
      const rawText = await zaloResponse.text();
      return res.json({ ok: false, description: `Zalo API phản hồi lỗi: ${rawText.slice(0, 200)}` });
    }
  } catch (err: any) {
    console.error("[Zalo Fetch Users Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi lấy danh sách người dùng Zalo OA",
    });
  }
});

// API: Proxy Tạo Mã Định Danh Liên Kết Duy Nhất (LINK_XXXXXX) Cho CTV
app.post("/api/zalo/create-link-code", async (req, res) => {
  try {
    const { userId, ctvCode, phone } = req.body;

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const code = `LINK_${randomDigits}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/zalo_linking_codes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            code,
            user_id: userId || null,
            ctv_code: ctvCode || null,
            phone: phone || null,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
          })
        });
      } catch (dbErr) {
        console.warn("[Create Link Code DB Warning]:", dbErr);
      }
    }

    const zaloOaId = "2715919749071666693";
    const deepLink = `https://zalo.me/${zaloOaId}`;

    return res.json({
      ok: true,
      code,
      expiresAt,
      zaloOaId,
      deepLink,
      description: `Đã tạo Mã Định Danh Liên Kết (${code}). Gửi cú pháp này tới Zalo OA để gắn Zalo UID tự động 100%!`,
    });
  } catch (err: any) {
    console.error("[Create Link Code Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi tạo mã định danh Zalo UID",
    });
  }
});

// API: Proxy Đăng Nhập Bằng Zalo (Zalo Social Login) & Tự Động Tạo Tài Khoản CTV
app.post("/api/zalo/login", async (req, res) => {
  try {
    const { zaloUserId, phone, name, avatar, accessToken } = req.body;

    const cleanUid = String(zaloUserId || "").trim();
    let cleanPhone = String(phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("84")) {
      cleanPhone = "0" + cleanPhone.slice(2);
    }

    if (!cleanUid && !cleanPhone && !accessToken) {
      return res.status(400).json({
        ok: false,
        description: "Vui lòng cung cấp Zalo User ID (UID), Số điện thoại hoặc Zalo Access Token!",
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    let userProfile: any = null;
    let isNewUser = false;

    if (supabaseUrl && supabaseKey) {
      try {
        if (cleanUid) {
          const uidRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?zalo_chat_id=eq.${cleanUid}&select=*`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
          });
          const uidData = await uidRes.json();
          if (Array.isArray(uidData) && uidData.length > 0) {
            userProfile = uidData[0];
          }
        }

        if (!userProfile && cleanPhone) {
          const shortPhone = cleanPhone.slice(-9);
          const phoneRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?phone=ilike.%25${shortPhone}%25&select=*`, {
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
          });
          const phoneData = await phoneRes.json();
          if (Array.isArray(phoneData) && phoneData.length > 0) {
            userProfile = phoneData[0];
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

    return res.json({
      ok: true,
      userProfile: formattedProfile,
      isNewUser,
      description: isNewUser
        ? `✨ Đã tự động tạo tài khoản CTV mới cho Zalo ID ${cleanUid}!`
        : `🎉 Đăng nhập tài khoản CTV bằng Zalo thành công!`,
    });
  } catch (err: any) {
    console.error("[Zalo Login Server Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi đăng nhập bằng Zalo",
    });
  }
});

// API: Proxy Zalo OA Refresh Access Token từ Refresh Token sau 24h
app.post("/api/zalo/refresh-token", async (req, res) => {
  try {
    const { appId, secretKey, refreshToken } = req.body;

    if (!appId || !secretKey || !refreshToken) {
      return res.status(400).json({ ok: false, description: "Thiếu appId, secretKey hoặc refreshToken Zalo OA" });
    }

    const params = new URLSearchParams();
    params.append("refresh_token", String(refreshToken).trim());
    params.append("app_id", String(appId).trim());
    params.append("grant_type", "refresh_token");

    const response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "secret_key": String(secretKey).trim(),
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (data.access_token) {
      return res.json({
        ok: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in || 86400,
      });
    } else {
      return res.status(400).json({
        ok: false,
        description: data.error_name || data.message || "Không thể làm mới Access Token từ Refresh Token Zalo OA"
      });
    }
  } catch (err: any) {
    console.error("[Zalo Refresh Token Proxy Error]:", err);
    return res.status(500).json({
      ok: false,
      description: err.message || "Lỗi server khi làm mới Access Token Zalo OA",
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

// API: Zalo Official Account (OA) Webhook Endpoint (Phục vụ Zalo Platform Webhook Verification)
app.options(["/api/zalo-oa/webhook", "/api/zalo/webhook"], (req, res) => {
  return res.status(200).json({ ok: true, status: 200, message: "OK" });
});

app.get(["/api/zalo-oa/webhook", "/api/zalo/webhook"], (req, res) => {
  const challenge = req.query.challenge || req.query["hub.challenge"] || req.query.hub_challenge;
  if (challenge) {
    return res.status(200).send(String(challenge));
  }
  return res.status(200).json({ ok: true, status: 200, message: "Zalo Official Account (OA) Webhook Active" });
});

app.post("/api/zalo-oa/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("[Zalo OA Webhook Received Event]:", JSON.stringify(body));

    const challenge = body.challenge || body.hub_challenge || body.token;
    if (challenge) {
      console.log("[Zalo OA Webhook Challenge]:", challenge);
    }

    return res.status(200).json({ ok: true, status: 200, message: "OK", event: body.event_name || "webhook_received" });
  } catch (err: any) {
    console.error("[Zalo OA Webhook Error]:", err);
    return res.status(200).json({ ok: true, status: 200, message: "OK" });
  }
});

app.post("/api/zalo/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("RECEIVED ZALO BOT WEBHOOK EVENT:", JSON.stringify(body));

    // Phân giải linh hoạt cấu trúc Webhook Payload từ Zalo Platform
    const message = body.message || body.data;
    const chatId =
      body.sender?.id ||
      message?.chat?.id ||
      message?.from?.id ||
      body.chat_id ||
      body.chatId ||
      body.from?.id;

    const senderName =
      body.sender?.display_name ||
      body.sender?.name ||
      message?.from?.display_name ||
      message?.from?.first_name ||
      message?.from?.name ||
      "Người dùng Zalo";

    const text = (typeof message === "string" ? message : message?.text || body.message?.text || body.text || "").trim();

    if (chatId) {
      console.log(`[Zalo Webhook] Message from ${senderName} (Chat ID: ${chatId}): "${text}"`);

      // Lấy Bot Token từ env hoặc fallback sang Token chính thức hệ thống
      const botToken =
        (req.query.token as string) ||
        process.env.ZALO_BOT_TOKEN ||
        process.env.VITE_ZALO_BOT_TOKEN ||
        "2870914868496435874:qKdbvBQIjBfWFbyRVDqPmYbtxQEbruiPirFbxncIDHgaXrJPyRXlnXKBFDPHoRgr";

      const cleanToken = String(botToken).replace(/^\//, "").replace(/^bot/i, "").trim();

      if (cleanToken) {
        const replyText =
          `🤖 *THÔNG TIN CHAT ID ZALO CỦA BẠN - KOREAN STAR*\n\n` +
          `👤 Người dùng: *${senderName}*\n` +
          `🔑 Zalo Chat ID: \`${chatId}\`\n\n` +
          `💡 Hãy sao chép chuỗi mã Chat ID trên (\`${chatId}\`) và dán vào ô **Zalo Chat ID** trong Hồ Sơ Cá Nhân trên web saohan.vn để nhận thông báo Lịch Hẹn tự động!`;

        // Tự động phản hồi trực tiếp cho người dùng qua Zalo Bot API sendMessage
        try {
          const zaloRes = await fetch(`https://bot-api.zaloplatforms.com/bot${cleanToken}/sendMessage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bot-Api-Secret-Token": cleanToken
            },
            body: JSON.stringify({
              chat_id: String(chatId),
              text: replyText,
              parse_mode: "markdown"
            })
          });
          console.log(`[Zalo Webhook] Auto-replied Chat ID ${chatId} status: ${zaloRes.status}`);
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
