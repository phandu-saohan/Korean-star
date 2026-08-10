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

    // Handle Zalo Challenge / Verification Ping if present
    const challenge = body.challenge || body.hub_challenge || body.token;
    if (challenge) {
      console.log("[Zalo OA Webhook Challenge]:", challenge);
    }

    // Always respond immediately with HTTP Code 200 OK for Zalo OA Platform Verification
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        status: 200,
        message: "OK",
        event: body.event_name || body.event_id || "webhook_received"
      })
    );
  } catch (err: any) {
    console.error("[Zalo OA Webhook Handler Error]:", err);
    // Return HTTP 200 OK even on parse warning so Zalo verification passes
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
