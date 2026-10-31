const enc = new TextEncoder();
export async function digest(value) {
  return [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function verify(secret, value, signature) {
  if (!secret || !/^([a-f0-9]{64})$/i.test(signature || "")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(signature.match(/../g), (x) => parseInt(x, 16)),
    enc.encode(value),
  );
}
export async function verifyWebhook(
  secret,
  raw,
  timestamp,
  signature,
  now = Date.now(),
) {
  return (
    /^v1=[a-f0-9]{64}$/i.test(signature || "") &&
    /^\d{10}$/.test(timestamp || "") &&
    Math.abs(now / 1000 - Number(timestamp)) <= 300 &&
    (await verify(
      secret,
      timestamp + "." + raw,
      (signature || "").replace(/^v1=/, ""),
    ))
  );
}
export async function adminSession(req, env) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) return false;
  const token = (req.headers.get("cookie") || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("campaign_admin="))
    ?.slice(15);
  if (!token) return false;
  const [exp, sig] = token.split(".");
  return (
    /^\d+$/.test(exp) &&
    Number(exp) > Date.now() &&
    (await verify(env.ADMIN_PASSWORD, "admin:" + exp, sig))
  );
}
export async function createSession(secret) {
  const exp = String(Date.now() + 8 * 60 * 60 * 1000);
  return exp + "." + (await sign(secret, "admin:" + exp));
}
