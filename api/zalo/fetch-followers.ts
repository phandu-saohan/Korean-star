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

    const {
      accessToken,
      offset = 0,
      count = 50,
      tagName,
      lastInteractionPeriod,
      isFollower = "true",
      apiVersion = "v3.0"
    } = body;

    if (!accessToken || !String(accessToken).trim()) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          description: "Thiếu Zalo OA Access Token để lấy danh sách người dùng",
        })
      );
      return;
    }

    const cleanToken = String(accessToken).replace(/^\//, "").trim();
    const limitCount = Math.min(Number(count) || 50, 50);
    const startOffset = Math.min(Number(offset) || 0, 9951);

    // 1. Zalo OpenAPI v3.0 URL: /v3.0/oa/user/getlist
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

    console.log("[Zalo Fetch Users v3.0 Request]:", getListV3Url);

    try {
      const v3Res = await fetch(getListV3Url, {
        method: "GET",
        headers: { access_token: cleanToken },
      });

      const contentType = v3Res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await v3Res.json();
        console.log("[Zalo Fetch Users v3.0 Response]:", data);

        if (data.error === 0) {
          const userList = data.data?.users || data.data?.followers || [];
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              description: `Lấy danh sách người dùng Zalo OA v3.0 (${userList.length}/${data.data?.total || userList.length}) thành công!`,
              total: data.data?.total || userList.length,
              count: data.data?.count || userList.length,
              offset: data.data?.offset || startOffset,
              followers: userList,
              users: userList,
              apiVersion: "v3.0",
              raw: data,
            })
          );
          return;
        }
      }
    } catch (v3Err) {
      console.warn("[Zalo Fetch Users v3.0 Warning]:", v3Err);
    }

    // 2. Fallback sang Zalo OpenAPI v2.0: /v2.0/oa/getfollowers
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

    console.log("[Zalo Fetch Followers v2.0 Fallback Request]:", getFollowersUrl);

    const zaloResponse = await fetch(getFollowersUrl, {
      method: "GET",
      headers: { access_token: cleanToken },
    });

    const contentType = zaloResponse.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await zaloResponse.json();
      const userList = data.data?.followers || data.data?.users || [];
      if (data.error === 0) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            description: `Lấy danh sách người quan tâm OA v2.0 (${userList.length}/${data.data?.total || userList.length}) thành công!`,
            total: data.data?.total || userList.length,
            followers: userList,
            users: userList,
            apiVersion: "v2.0",
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
    console.error("[Zalo Fetch Users Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        description: err.message || "Lỗi server khi lấy danh sách người dùng Zalo OA",
      })
    );
  }
}
