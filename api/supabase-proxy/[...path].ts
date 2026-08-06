import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, prefer, range"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL
    || "https://korean-star-pre0225supabase-40349c-72-61-123-73.sslip.io";
  const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, "");

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

  // Extract path from req.url: /api/supabase-proxy/...
  const reqUrl = req.url || "";
  const match = reqUrl.match(/\/api\/supabase-proxy\/(.*)/);
  const subPathWithQuery = match ? match[1] : "";
  const targetUrl = `${supabaseUrl}/${subPathWithQuery.replace(/^\/+/, "")}`;

  // Authorization header: fallback sang anonKey nếu client không gửi hoặc rỗng
  let authHeader = (req.headers.authorization as string) || (req.headers.Authorization as string) || "";
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.includes("undefined") || authHeader.includes("null") || authHeader.length < 20) {
    authHeader = `Bearer ${anonKey}`;
  }

  try {
    const headers: Record<string, string> = {
      "apikey": anonKey,
      "Authorization": authHeader,
    };

    // Chỉ đính kèm Content-Type cho các phương thức có body (POST, PUT, PATCH, DELETE)
    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }

    if (req.headers.accept) headers["Accept"] = req.headers.accept as string;
    if (req.headers.prefer) headers["Prefer"] = req.headers.prefer as string;
    if (req.headers.range) headers["Range"] = req.headers.range as string;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      let bodyData: any = req.body;
      if (!bodyData || typeof bodyData === "string") {
        const buffers: Buffer[] = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const dataStr = Buffer.concat(buffers).toString("utf-8");
        if (dataStr && dataStr.trim()) {
          fetchOptions.body = dataStr;
        }
      } else if (Object.keys(bodyData).length > 0) {
        fetchOptions.body = JSON.stringify(bodyData);
      }
    }

    console.log(`[Supabase Vercel Proxy] ${req.method} -> ${targetUrl}`);
    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    res.statusCode = response.status;
    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range")!);
    }
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (err: any) {
    console.error("[Supabase Vercel Proxy Error]:", err.message);
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
  }
}
