import { cents } from "./campaign.mjs";
export const paymentMode = (env) =>
  env.PAYUNIT_MODE === "live" ? "live" : "test";
export const paymentReady = (env) =>
  Boolean(
    env.PAYUNIT_API_KEY?.startsWith("pay_" + paymentMode(env) + "_") &&
    env.PAYUNIT_WEBHOOK_SECRET?.length >= 12,
  );
export async function callPayunit(env, path, body, key, fetcher = fetch) {
  if (!paymentReady(env)) throw new Error("Payunit is not configured.");
  const response = await fetcher("https://payunit.co/api/v1" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + env.PAYUNIT_API_KEY,
      Accept: "application/json",
      ...(body
        ? { "Content-Type": "application/json", "Idempotency-Key": key }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      "Payment provider is temporarily unavailable. Please retry.",
    );
  return response.json();
}
export function validateInvoice(invoice, donation, creation = false) {
  if (
    !invoice ||
    typeof invoice !== "object" ||
    cents(invoice.amount) !== donation.amount ||
    invoice.currency !== "USD" ||
    invoice.environment !== donation.mode ||
    invoice.external_ref !== donation.id
  )
    throw new Error(
      "Invoice amount, currency, environment or reference does not match.",
    );
  if (
    !/^inv_[A-Za-z0-9_-]{1,140}$/.test(invoice.id) ||
    (donation.invoice_id && invoice.id !== donation.invoice_id)
  )
    throw new Error("Invalid invoice ID.");
  if (
    ![
      "pending",
      "processing",
      "paid",
      "expired",
      "cancelled",
      "refunded",
      "partially_refunded",
    ].includes(invoice.status)
  )
    throw new Error("Invalid payment status.");
  if (creation) {
    const u = new URL(invoice.checkout_url);
    if (u.origin !== "https://payunit.co" || u.username || u.password)
      throw new Error("Invalid checkout URL.");
  }
  return invoice;
}
export async function reconcile(env, d, fetcher = fetch) {
  const invoice = validateInvoice(
    await callPayunit(
      env,
      "/invoices/" + encodeURIComponent(d.invoice_id),
      undefined,
      undefined,
      fetcher,
    ),
    d,
  );
  await env.DB.prepare("UPDATE donations SET status=?,updated_at=? WHERE id=?")
    .bind(invoice.status, new Date().toISOString(), d.id)
    .run();
  return invoice.status;
}
