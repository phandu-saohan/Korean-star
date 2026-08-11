import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  // Dynamic CORS Headers to prevent net::ERR_FAILED browser preflight blocks
  const reqOrigin = (req.headers.origin as string) || (req.headers.Origin as string) || "";
  if (reqOrigin) {
    res.setHeader("Access-Control-Allow-Origin", reqOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, prefer, range, x-client-info"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

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

  // Extract path from req.url: /api/supabase-proxy/...
  const reqUrl = req.url || "";
  const proxySubPath = reqUrl.replace(/^.*?\/api\/supabase-proxy/, "").replace(/^\/+/, "");
  const targetUrl = `${supabaseUrl}/${proxySubPath}`;

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

    // If Supabase server returns 500/502/503 for GET queries, fallback gracefully to HTTP 200 JSON []
    if (response.status >= 500 && (req.method === "GET" || req.method === "HEAD")) {
      console.warn(`[Supabase Proxy 500 Fallback] Intercepted ${response.status} from Supabase, returning 200 []`);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify([]));
      return;
    }

    res.statusCode = response.status;
    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range")!);
    }
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (err: any) {
    console.error("[Supabase Vercel Proxy Error]:", err.message);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET" || req.method === "HEAD") {
      res.end(JSON.stringify([]));
    } else {
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }
}
