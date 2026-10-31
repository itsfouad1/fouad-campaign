import { defaults, validateConfig, cents } from "./campaign.mjs";
import {
  adminSession,
  createSession,
  digest,
  verifyWebhook,
} from "./security.mjs";
import {
  paymentMode,
  paymentReady,
  callPayunit,
  validateInvoice,
  reconcile,
} from "./payunit.mjs";
const response = (data, status = 200, extra = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();
export async function getConfig(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE id=?")
    .bind("campaign")
    .first();
  return row ? { ...defaults, ...JSON.parse(row.value) } : { ...defaults };
}
async function limit(req, env, kind, max) {
  const bucket = Math.floor(Date.now() / 60000);
  const hash = await digest(req.headers.get("cf-connecting-ip") || "local");
  const id = kind + ":" + bucket + ":" + hash;
  await env.DB.prepare(
    "INSERT INTO rate_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1",
  )
    .bind(id, Date.now() + 120000)
    .run();
  const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE id=?")
    .bind(id)
    .first();
  if (row.count > max)
    throw fail("Too many requests. Please wait a minute.", 429);
  if (Math.random() < 0.02)
    await env.DB.prepare("DELETE FROM rate_limits WHERE expires<?")
      .bind(Date.now())
      .run();
}
async function body(req) {
  const raw = await req.text();
  if (raw.length > 100000) throw fail("Request too large", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw fail("Invalid JSON");
  }
}
export async function handleApi(req, env) {
  const url = new URL(req.url),
    p = url.pathname;
  try {
    if (!env.DB) throw fail("Database is not available yet.", 503);
    if (p === "/api/webhooks/payunit") {
      if (req.method !== "POST") throw fail("Method not allowed", 405);
      const raw = await req.text();
      if (raw.length > 100000) throw fail("Too large", 413);
      if (
        !(await verifyWebhook(
          env.PAYUNIT_WEBHOOK_SECRET,
          raw,
          req.headers.get("Payunit-Timestamp"),
          req.headers.get("Payunit-Signature"),
        ))
      )
        throw fail("Invalid signature", 401);
      const event = JSON.parse(raw),
        hash = await digest(raw),
        eventId = paymentMode(env) + ":" + hash;
      if (
        !["invoice.paid", "payment.failed", "payment.refunded"].includes(
          event.event,
        )
      )
        return response({ ok: true, ignored: true });
      if (
        await env.DB.prepare("SELECT id FROM payment_events WHERE id=?")
          .bind(eventId)
          .first()
      )
        return response({ ok: true });
      const data = event.data || {},
        ref = data.external_ref,
        invoice = data.invoice_id || data.id;
      const d = ref
        ? await env.DB.prepare("SELECT * FROM donations WHERE id=?")
            .bind(ref)
            .first()
        : await env.DB.prepare("SELECT * FROM donations WHERE invoice_id=?")
            .bind(invoice || "")
            .first();
      if (!d?.invoice_id) throw fail("Invoice not saved yet. Retry.", 503);
      if (
        d.mode !== paymentMode(env) ||
        (ref && ref !== d.id) ||
        (invoice && invoice !== d.invoice_id)
      )
        throw fail("Invoice mismatch", 409);
      await reconcile(env, d);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO payment_events (id,created_at) VALUES (?,?)",
      )
        .bind(eventId, now())
        .run();
      return response({ ok: true });
    }
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers.get("origin") !== url.origin
    )
      throw fail("Invalid request origin", 403);
    const admin = await adminSession(req, env);
    if (p === "/api/campaign" && req.method === "GET") {
      const config = await getConfig(env);
      const total = await env.DB.prepare(
        "SELECT COALESCE(SUM(amount),0) AS amount,COUNT(*) AS count FROM donations WHERE status='paid' AND mode='live'",
      ).first();
      const updates = (
        await env.DB.prepare(
          "SELECT * FROM updates ORDER BY created_at DESC",
        ).all()
      ).results;
      return response({
        config,
        total,
        updates,
        payunitReady:
          config.acceptingDonations &&
          paymentReady(env) &&
          (paymentMode(env) === "live" || admin),
        mode: paymentMode(env),
        admin,
      });
    }
    if (p === "/api/admin/session") {
      if (req.method === "GET")
        return response({
          admin,
          configured: Boolean(env.ADMIN_PASSWORD?.length >= 16),
        });
      if (req.method === "DELETE")
        return response({ ok: true }, 200, {
          "Set-Cookie":
            "campaign_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        });
      if (req.method !== "POST") throw fail("Method not allowed", 405);
      await limit(req, env, "login", 5);
      if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16)
        throw fail(
          "Set ADMIN_PASSWORD (at least 16 characters) in the server environment first.",
          503,
        );
      const b = await body(req);
      if (
        typeof b.password !== "string" ||
        (await digest(b.password)) !== (await digest(env.ADMIN_PASSWORD))
      )
        throw fail("Incorrect password", 401);
      return response({ ok: true }, 200, {
        "Set-Cookie":
          "campaign_admin=" +
          (await createSession(env.ADMIN_PASSWORD)) +
          "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800",
      });
    }
    if (p.startsWith("/api/admin/")) {
      if (!admin) throw fail("Sign in to continue.", 401);
      if (p === "/api/admin/config" && req.method === "PUT") {
        const config = validateConfig(await body(req));
        await env.DB.prepare(
          "INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
        )
          .bind("campaign", JSON.stringify(config))
          .run();
        return response({ config });
      }
      if (p === "/api/admin/updates" && req.method === "POST") {
        const b = await body(req);
        for (const k of ["titleAr", "titleEn", "bodyAr", "bodyEn"])
          if (typeof b[k] !== "string" || !b[k].trim() || b[k].length > 10000)
            throw fail("Fill both languages.");
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO updates (id,title_ar,title_en,body_ar,body_en,created_at) VALUES (?,?,?,?,?,?)",
        )
          .bind(id, b.titleAr, b.titleEn, b.bodyAr, b.bodyEn, now())
          .run();
        return response({ id }, 201);
      }
      if (p.startsWith("/api/admin/updates/") && req.method === "DELETE") {
        await env.DB.prepare("DELETE FROM updates WHERE id=?")
          .bind(p.split("/").pop())
          .run();
        return response({ ok: true });
      }
      if (p === "/api/admin/donations" && req.method === "GET")
        return response({
          donations: (
            await env.DB.prepare(
              "SELECT id,amount,mode,status,created_at FROM donations ORDER BY created_at DESC LIMIT 100",
            ).all()
          ).results,
        });
      if (p === "/api/admin/upload" && req.method === "POST") {
        if (!env.BUCKET) throw fail("File storage is unavailable", 503);
        const form = await req.formData(),
          file = form.get("file");
        if (
          !(file instanceof File) ||
          file.size > 5 * 1024 * 1024 ||
          file.size === 0
        )
          throw fail("Choose a file up to 5 MB.");
        const bytes = await file.arrayBuffer(),
          x = new Uint8Array(bytes);
        const type =
          x[0] === 0xff && x[1] === 0xd8
            ? "image/jpeg"
            : x[0] === 0x89 && x[1] === 0x50 && x[2] === 0x4e && x[3] === 0x47
              ? "image/png"
              : String.fromCharCode(...x.slice(0, 5)) === "%PDF-"
                ? "application/pdf"
                : null;
        if (!type) throw fail("Only JPEG, PNG and PDF are supported.");
        if (form.get("publish") !== "yes")
          throw fail("Confirm that this file is safe for public viewing.");
        const id = crypto.randomUUID();
        await env.BUCKET.put(id, bytes, {
          httpMetadata: { contentType: type },
        });
        return response({ url: "/media/" + id, type }, 201);
      }
    }
    if (p === "/api/donations" && req.method === "POST") {
      await limit(req, env, "invoice", 8);
      const c = await getConfig(env);
      if (!c.acceptingDonations || !paymentReady(env))
        throw fail("Donations are not open yet.", 503);
      if (paymentMode(env) !== "live" && !admin)
        throw fail(
          "Test checkout is only available to the campaign administrator.",
          403,
        );
      const b = await body(req),
        amount = cents(b.amount);
      if (!/^[a-f0-9-]{36}$/.test(b.requestId || ""))
        throw fail("Invalid request ID");
      const id = b.requestId,
        mode = paymentMode(env),
        t = now();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO donations (id,amount,mode,status,created_at,updated_at) VALUES (?,?,?,'creating',?,?)",
      )
        .bind(id, amount, mode, t, t)
        .run();
      let d = await env.DB.prepare("SELECT * FROM donations WHERE id=?")
        .bind(id)
        .first();
      if (d.amount !== amount || d.mode !== mode)
        throw fail(
          "This payment attempt has a different amount. Start a new attempt.",
          409,
        );
      if (d.invoice_id) {
        if (!["pending", "processing"].includes(d.status))
          return response({ id, status: d.status });
        return response({ id, status: d.status, checkoutUrl: d.checkout_url });
      }
      const invoice = validateInvoice(
        await callPayunit(
          env,
          "/invoices",
          {
            amount: (amount / 100).toFixed(2),
            currency: "USD",
            external_ref: id,
            description: "Support Fouad university education",
            success_url: url.origin + "/payment?id=" + id,
            cancel_url: url.origin + "/payment?id=" + id + "&cancelled=1",
            metadata: { campaign: "fouad-education" },
          },
          "fouad-" + mode + "-" + id,
        ),
        d,
        true,
      );
      await env.DB.prepare(
        "UPDATE donations SET invoice_id=?,checkout_url=?,status='pending',updated_at=? WHERE id=? AND invoice_id IS NULL",
      )
        .bind(invoice.id, invoice.checkout_url, now(), id)
        .run();
      d = await env.DB.prepare("SELECT * FROM donations WHERE id=?")
        .bind(id)
        .first();
      if (invoice.status !== "pending") await reconcile(env, d);
      return response(
        { id, checkoutUrl: d.checkout_url, status: d.status },
        201,
      );
    }
    if (p.startsWith("/api/donations/") && req.method === "GET") {
      const id = p.split("/").pop();
      if (!/^[a-f0-9-]{36}$/.test(id)) throw fail("Invalid reference");
      let d = await env.DB.prepare("SELECT * FROM donations WHERE id=?")
        .bind(id)
        .first();
      if (!d) throw fail("Payment not found", 404);
      if (url.searchParams.get("refresh") === "1" && d.invoice_id) {
        await limit(req, env, "refresh", 20);
        if (d.mode !== paymentMode(env))
          throw fail("Payment environment has changed", 409);
        await reconcile(env, d);
        d = await env.DB.prepare("SELECT * FROM donations WHERE id=?")
          .bind(id)
          .first();
      }
      return response({
        id: d.id,
        amount: d.amount,
        status: d.status,
        mode: d.mode,
      });
    }
    throw fail("Not found", 404);
  } catch (e) {
    return response(
      { error: e.message || "Something went wrong." },
      e.status || 400,
    );
  }
}
