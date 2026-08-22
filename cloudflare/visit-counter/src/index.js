import { DurableObject } from "cloudflare:workers";

const ALLOWED_ORIGINS = new Set([
  "https://chen6xin.github.io",
  "http://127.0.0.1:4000",
  "http://localhost:4000"
]);
const COUNTER_NAME = "global-site-counter";

function originFromReferer(request) {
  const referer = request.headers.get("Referer") || "";
  if (!referer) return "";

  try {
    return new URL(referer).origin;
  } catch (err) {
    return "";
  }
}

function allowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  if (ALLOWED_ORIGINS.has(origin)) return origin;

  const refererOrigin = originFromReferer(request);
  if (ALLOWED_ORIGINS.has(refererOrigin)) return refererOrigin;

  return "";
}

function corsHeaders(request) {
  const origin = allowedOrigin(request) || "https://chen6xin.github.io";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : todayIso();
}

function nonNegativeInt(value) {
  const number = parseInt(String(value == null ? "" : value).replace(/,/g, ""), 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (err) {
    return {};
  }
}

function isTrustedWrite(request) {
  return Boolean(allowedOrigin(request));
}

function getCounterStub(env) {
  if (env.VISIT_COUNTER.getByName) {
    return env.VISIT_COUNTER.getByName(COUNTER_NAME);
  }

  const id = env.VISIT_COUNTER.idFromName(COUNTER_NAME);
  return env.VISIT_COUNTER.get(id);
}

export class VisitCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async hit(payload = {}) {
    const date = normalizeDate(payload.date);
    const dayKey = `day:${date}`;
    const dayInitializedKey = `day_initialized:${date}`;

    let initialized = await this.ctx.storage.get("initialized");
    if (!initialized) {
      await this.ctx.storage.put("total", nonNegativeInt(payload.base_total));
      await this.ctx.storage.put("initialized", true);
      initialized = true;
    }

    let dayInitialized = await this.ctx.storage.get(dayInitializedKey);
    if (!dayInitialized) {
      await this.ctx.storage.put(dayKey, nonNegativeInt(payload.base_today_count));
      await this.ctx.storage.put(dayInitializedKey, true);
      dayInitialized = true;
    }

    const total = nonNegativeInt(await this.ctx.storage.get("total")) + 1;
    const todayCount = nonNegativeInt(await this.ctx.storage.get(dayKey)) + 1;

    await this.ctx.storage.put("total", total);
    await this.ctx.storage.put(dayKey, todayCount);
    await this.ctx.storage.put("last_hit_at", new Date().toISOString());

    return {
      total,
      today: date,
      today_count: todayCount
    };
  }

  async stats(dateValue) {
    const date = normalizeDate(dateValue);
    const total = nonNegativeInt(await this.ctx.storage.get("total"));
    const todayCount = nonNegativeInt(await this.ctx.storage.get(`day:${date}`));

    return {
      total,
      today: date,
      today_count: todayCount
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin(request)) {
        return json(request, { error: "Forbidden" }, 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const stub = getCounterStub(env);

    if (url.pathname === "/hit" && request.method === "POST") {
      if (!isTrustedWrite(request)) {
        return json(request, { error: "Forbidden" }, 403);
      }

      const payload = await readJson(request);
      const result = await stub.hit(payload);
      return json(request, result);
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const result = await stub.stats(url.searchParams.get("date"));
      return json(request, result);
    }

    return json(request, { error: "Not found" }, 404);
  }
};
