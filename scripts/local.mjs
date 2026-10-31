// Local Worker-compatible preview. Uses only built-in Node.js modules.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const values = Object.fromEntries(
  [
    "ADMIN_PASSWORD",
    "PAYUNIT_MODE",
    "PAYUNIT_API_KEY",
    "PAYUNIT_WEBHOOK_SECRET",
  ].map((k) => [k, process.env[k] || ""]),
);
try {
  const text = await fs.readFile(path.join(root, ".dev.vars"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        throw new Error("Invalid quoted value for " + match[1]);
      }
    } else if (value.startsWith("'")) value = value.slice(1, -1);
    values[match[1]] = value;
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const state = process.env.LOCAL_DATA_DIRECTORY || path.join(root, ".local");
await fs.mkdir(state, { recursive: true });
const sqlite = new DatabaseSync(path.join(state, "campaign.sqlite"));
sqlite.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY);",
);
for (const name of (await fs.readdir(path.join(root, "migrations")))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  if (
    !sqlite.prepare("SELECT name FROM local_migrations WHERE name=?").get(name)
  ) {
    sqlite.exec("BEGIN");
    try {
      sqlite.exec(
        await fs.readFile(path.join(root, "migrations", name), "utf8"),
      );
      sqlite
        .prepare("INSERT INTO local_migrations (name) VALUES (?)")
        .run(name);
      sqlite.exec("COMMIT");
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  }
}
const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        const stmt = sqlite.prepare(sql);
        return {
          async first() {
            return stmt.get(...args) || null;
          },
          async all() {
            return { results: stmt.all(...args) };
          },
          async run() {
            return stmt.run(...args);
          },
        };
      },
      async first() {
        return sqlite.prepare(sql).get() || null;
      },
      async all() {
        return { results: sqlite.prepare(sql).all() };
      },
    };
  },
};
const uploads = path.join(state, "uploads");
await fs.mkdir(uploads, { recursive: true });
const BUCKET = {
  async put(id, bytes, options = {}) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("Invalid upload key");
    await fs.writeFile(path.join(uploads, id), Buffer.from(bytes));
    await fs.writeFile(
      path.join(uploads, id + ".json"),
      JSON.stringify(options.httpMetadata || {}),
    );
  },
  async get(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;
    try {
      return {
        body: await fs.readFile(path.join(uploads, id)),
        httpMetadata: JSON.parse(
          await fs.readFile(path.join(uploads, id + ".json"), "utf8"),
        ),
      };
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  },
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};
const publicRoot = path.join(root, "public");
const ASSETS = {
  async fetch(request) {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405 });
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const aliases = {
      "/": "index.html",
      "/admin": "admin.html",
      "/admin/": "admin.html",
      "/payment": "payment.html",
      "/payment/": "payment.html",
    };
    const name = aliases[pathname] || pathname.replace(/^\//, "");
    const file = path.resolve(publicRoot, name);
    if (!file.startsWith(publicRoot + path.sep))
      return new Response("Forbidden", { status: 403 });
    try {
      const bytes = await fs.readFile(file);
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-cache",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};
const env = { ...values, DB, BUCKET, ASSETS };
const args = process.argv;
const suppliedPort = args.indexOf("--port");
const suppliedHost = args.indexOf("--host");
const port = Number(
  suppliedPort >= 0 ? args[suppliedPort + 1] : process.env.PORT || 5173,
);
const host = suppliedHost >= 0 ? args[suppliedHost + 1] : "127.0.0.1";
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 6 * 1024 * 1024) {
        res.writeHead(413);
        res.end("Request too large");
        return;
      }
      chunks.push(chunk);
    }
    const origin = "http://" + (req.headers.host || "localhost:" + port);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) for (const v of value) headers.append(key, v);
      else if (value !== undefined) headers.set(key, value);
    }
    headers.set("cf-connecting-ip", req.socket.remoteAddress || "local");
    const request = new Request(new URL(req.url, origin), {
      method: req.method,
      headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await worker.fetch(request, env);
    const outputHeaders = Object.fromEntries(response.headers);
    const hostname = new URL(request.url).hostname;
    if (
      ["localhost", "127.0.0.1", "[::1]"].includes(hostname) &&
      outputHeaders["set-cookie"]
    )
      outputHeaders["set-cookie"] = outputHeaders["set-cookie"].replace(
        /; Secure/g,
        "",
      );
    res.writeHead(response.status, outputHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error("Local request failed:", e.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Local server error. Check the terminal." }),
    );
  }
});
server.listen(port, host, () =>
  console.log(
    "Campaign ready: http://localhost:" +
      server.address().port +
      " — no install or build required.",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      sqlite.close();
      process.exit(0);
    }),
  );
