import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { cents, defaults, validateConfig } from "../src/lib/campaign.mjs";
import {
  sign,
  verifyWebhook,
  adminSession,
  createSession,
} from "../src/lib/security.mjs";
import { validateInvoice, callPayunit } from "../src/lib/payunit.mjs";
import { handleApi } from "../src/lib/api.mjs";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../migrations/0001_campaign.sql", import.meta.url),
      "utf8",
    ),
  );
  return {
    prepare(sql) {
      return {
        bind(...args) {
          const s = sqlite.prepare(sql);
          return {
            async first() {
              return s.get(...args) || null;
            },
            async all() {
              return { results: s.all(...args) };
            },
            async run() {
              return s.run(...args);
            },
          };
        },
        async all() {
          return { results: sqlite.prepare(sql).all() };
        },
        async first() {
          return sqlite.prepare(sql).get();
        },
      };
    },
  };
}
const origin = "https://campaign.test";
function request(path, method = "GET", body, headers = {}) {
  return new Request(origin + path, {
    method,
    headers: { origin, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function setup() {
  const env = {
    DB: database(),
    ADMIN_PASSWORD: "admin_password_for_tests_only",
    PAYUNIT_MODE: "test",
    PAYUNIT_API_KEY: "pay_test_only_mock_key_1234",
    PAYUNIT_WEBHOOK_SECRET: "webhook_test_only_secret",
  };
  return env;
}
function invoice(d, extra = {}) {
  return {
    id: "inv_mock123",
    amount: (d.amount / 100).toFixed(2),
    currency: "USD",
    environment: d.mode,
    external_ref: d.id,
    status: "pending",
    checkout_url: "https://payunit.co/pay/mock",
    ...extra,
  };
}
test("amounts use exact cents and reject negative, oversized, fractional and nonnumeric inputs", () => {
  assert.equal(cents("12.34"), 1234);
  assert.equal(cents("1"), 100);
  for (const x of [
    "0",
    "-1",
    "0.99",
    "1.001",
    "1e3",
    "5001",
    "abc",
    "Infinity",
  ])
    assert.throws(() => cents(x));
});
test("invoice verifies amount, currency, environment, reference, ID and checkout host", () => {
  const d = { id: crypto.randomUUID(), amount: 2500, mode: "test" };
  assert.equal(validateInvoice(invoice(d), d, true).id, "inv_mock123");
  for (const bad of [
    { amount: "24.99" },
    { currency: "ILS" },
    { environment: "live" },
    { external_ref: "wrong" },
    { checkout_url: "https://evil.test" },
    { checkout_url: "https://payunit.co.evil.test" },
    { status: "unknown" },
    { id: "fake" },
  ])
    assert.throws(() => validateInvoice(invoice(d, bad), d, true));
  assert.throws(() =>
    validateInvoice(invoice(d), { ...d, invoice_id: "inv_other" }),
  );
});
test("webhook rejects stale, tampered and invalid signatures", async () => {
  const secret = "webhook_test",
    raw = '{"event":"invoice.paid"}',
    ts = String(Math.floor(Date.now() / 1000));
  const sig = "v1=" + (await sign(secret, ts + "." + raw));
  assert.equal(await verifyWebhook(secret, raw, ts, sig), true);
  assert.equal(await verifyWebhook(secret, raw + "x", ts, sig), false);
  assert.equal(
    await verifyWebhook(secret, raw, String(Number(ts) - 900), sig),
    false,
  );
  assert.equal(await verifyWebhook(secret, raw, ts, "v1=abc"), false);
  assert.equal(await verifyWebhook(secret, raw, ts, sig.slice(3)), false);
});
test("admin sessions require a configured secret and reject tampering", async () => {
  const env = setup(),
    token = await createSession(env.ADMIN_PASSWORD);
  assert.equal(
    await adminSession(
      new Request(origin, { headers: { cookie: "campaign_admin=" + token } }),
      env,
    ),
    true,
  );
  assert.equal(
    await adminSession(
      new Request(origin, {
        headers: { cookie: "campaign_admin=" + token + "a" },
      }),
      env,
    ),
    false,
  );
  assert.equal(
    await adminSession(
      new Request(origin, { headers: { cookie: "campaign_admin=" + token } }),
      {},
    ),
    false,
  );
});
test("configuration rejects unsafe URLs, malformed wallet networks and opening without goal", () => {
  assert.deepEqual(validateConfig(defaults), defaults);
  for (const bad of [
    { image: "javascript:alert(1)" },
    { projects: [{ titleAr: "ع", titleEn: "x", url: "javascript:alert(1)" }] },
    { acceptingDonations: true },
    { usdtAddress: "0x" + "a".repeat(40), usdtNetwork: "TRC20" },
    { goalCents: -1 },
  ])
    assert.throws(() => validateConfig({ ...defaults, ...bad }));
});
test("server rejects anonymous writes, CSRF, oversized bodies and login brute force", async () => {
  const env = setup();
  assert.equal(
    (
      await handleApi(
        request("/api/admin/session", "POST", { password: "x".repeat(100001) }),
        env,
      )
    ).status,
    413,
  );
  assert.equal(
    (await handleApi(request("/api/admin/config", "PUT", defaults), env))
      .status,
    401,
  );
  assert.equal(
    (
      await handleApi(
        request(
          "/api/admin/session",
          "POST",
          { password: env.ADMIN_PASSWORD },
          { origin: "https://evil.test" },
        ),
        env,
      )
    ).status,
    403,
  );
  for (let i = 0; i < 4; i++)
    assert.equal(
      (
        await handleApi(
          request("/api/admin/session", "POST", { password: "bad" }),
          env,
        )
      ).status,
      401,
    );
  assert.equal(
    (
      await handleApi(
        request("/api/admin/session", "POST", { password: env.ADMIN_PASSWORD }),
        env,
      )
    ).status,
    429,
  );
});
test("campaign is readable with zero totals, payments disabled, and empty docs; admin edits persist", async () => {
  const env = setup();
  const initial = await (await handleApi(request("/api/campaign"), env)).json();
  assert.equal(initial.total.amount, 0);
  assert.equal(initial.payunitReady, false);
  assert.equal(initial.config.goalCents, 0);
  assert.equal(initial.config.documents.length, 0);
  assert.equal(
    (
      await handleApi(
        request("/api/donations", "POST", {
          amount: "25",
          requestId: crypto.randomUUID(),
        }),
        env,
      )
    ).status,
    503,
  );
  const login = await handleApi(
    request("/api/admin/session", "POST", { password: env.ADMIN_PASSWORD }),
    env,
  );
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const config = { ...defaults, goalCents: 100000, acceptingDonations: true };
  assert.equal(
    (
      await handleApi(
        request("/api/admin/config", "PUT", config, { cookie }),
        env,
      )
    ).status,
    200,
  );
  const saved = await (
    await handleApi(request("/api/campaign", "GET", undefined, { cookie }), env)
  ).json();
  assert.equal(saved.config.goalCents, 100000);
  assert.equal(saved.payunitReady, true);
  assert.equal(
    (
      await handleApi(
        request("/api/donations", "POST", {
          amount: "25",
          requestId: crypto.randomUUID(),
        }),
        env,
      )
    ).status,
    403,
  );
});
test("full payment lifecycle: stable idempotency, authoritative reconciliation, signed webhook, duplicate delivery, refund and test exclusion", async () => {
  const env = setup();
  env.PAYUNIT_MODE = "live";
  env.PAYUNIT_API_KEY = "pay_live_only_mock_key_1234";
  const config = { ...defaults, acceptingDonations: true, goalCents: 100000 };
  await env.DB.prepare("INSERT INTO settings (id,value) VALUES (?,?)")
    .bind("campaign", JSON.stringify(config))
    .run();
  const id = crypto.randomUUID();
  const originalFetch = globalThis.fetch;
  let creates = 0,
    status = "pending",
    savedBody,
    idem;
  globalThis.fetch = async (url, options) => {
    if (options.method === "POST") {
      creates++;
      savedBody = JSON.parse(options.body);
      idem = options.headers["Idempotency-Key"];
      return Response.json(invoice({ id, amount: 2500, mode: "live" }));
    }
    return Response.json(
      invoice({ id, amount: 2500, mode: "live" }, { status }),
    );
  };
  try {
    const create = await handleApi(
      request("/api/donations", "POST", { amount: "25", requestId: id }),
      env,
    );
    assert.equal(create.status, 201);
    assert.equal(
      (await create.json()).checkoutUrl,
      "https://payunit.co/pay/mock",
    );
    assert.equal(idem, "fouad-live-" + id);
    assert.equal(savedBody.success_url, origin + "/payment?id=" + id);
    const again = await handleApi(
      request("/api/donations", "POST", { amount: "25", requestId: id }),
      env,
    );
    assert.equal(again.status, 200);
    assert.equal(creates, 1);
    assert.equal(
      (
        await handleApi(
          request("/api/donations", "POST", { amount: "30", requestId: id }),
          env,
        )
      ).status,
      409,
    );
    let summary = await (await handleApi(request("/api/campaign"), env)).json();
    assert.equal(summary.total.amount, 0);
    status = "paid";
    const data = {
        event: "invoice.paid",
        data: { id: "inv_mock123", external_ref: id },
      },
      raw = JSON.stringify(data),
      ts = String(Math.floor(Date.now() / 1000));
    const signed = {
      "Payunit-Timestamp": ts,
      "Payunit-Signature":
        "v1=" + (await sign(env.PAYUNIT_WEBHOOK_SECRET, ts + "." + raw)),
    };
    let hook = await handleApi(
      request("/api/webhooks/payunit", "POST", data, signed),
      env,
    );
    assert.equal(hook.status, 200);
    assert.equal(
      (
        await handleApi(
          request("/api/webhooks/payunit", "POST", data, signed),
          env,
        )
      ).status,
      200,
    );
    summary = await (await handleApi(request("/api/campaign"), env)).json();
    assert.equal(summary.total.amount, 2500);
    assert.equal(summary.total.count, 1);
    status = "refunded";
    const refreshed = await handleApi(
      request("/api/donations/" + id + "?refresh=1"),
      env,
    );
    assert.equal((await refreshed.json()).status, "refunded");
    summary = await (await handleApi(request("/api/campaign"), env)).json();
    assert.equal(summary.total.amount, 0);
    await env.DB.prepare(
      "UPDATE donations SET mode='test',status='paid' WHERE id=?",
    )
      .bind(id)
      .run();
    summary = await (await handleApi(request("/api/campaign"), env)).json();
    assert.equal(summary.total.count, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("a success-page visit cannot mark an invoice paid, and forged webhooks fail", async () => {
  const env = setup(),
    id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO donations (id,amount,mode,status,created_at,updated_at) VALUES (?,?,?,'pending',?,?)",
  )
    .bind(id, 100, "test", "now", "now")
    .run();
  const state = await (
    await handleApi(request("/api/donations/" + id + "?success=1"), env)
  ).json();
  assert.equal(state.status, "pending");
  assert.equal(
    (
      await handleApi(
        request("/api/webhooks/payunit", "POST", {
          event: "invoice.paid",
          data: { external_ref: id },
        }),
        env,
      )
    ).status,
    401,
  );
});
