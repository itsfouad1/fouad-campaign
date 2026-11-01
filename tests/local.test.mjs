import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
const root = fileURLToPath(new URL("../", import.meta.url));
test("zero-install local server: assets, migrations, auth, persistence, updates and public uploads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fouad-campaign-test-"));
  const pass = "local_qa_fixture_not_a_user_secret";
  const server = spawn(
    process.execPath,
    ["--experimental-sqlite", "scripts/local.mjs", "--port", "0"],
    {
      cwd: root,
      env: {
        ...process.env,
        ADMIN_PASSWORD: pass,
        LOCAL_DATA_DIRECTORY: directory,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let origin;
  try {
    const url = await new Promise((resolve, reject) => {
      let text = "";
      const timer = setTimeout(
        () => reject(new Error("Server startup timeout")),
        12000,
      );
      server.stdout.on("data", (chunk) => {
        text += chunk;
        const m = text.match(/http:\/\/localhost:(\d+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[0]);
        }
      });
      server.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      server.once("exit", (code) => {
        if (!text.includes("Campaign ready")) {
          clearTimeout(timer);
          reject(new Error("Server exited with " + code));
        }
      });
    });
    origin = url;
    const request = (route, method = "GET", body, cookie) =>
      fetch(url + route, {
        method,
        headers: {
          Origin: url,
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body:
          body instanceof FormData
            ? body
            : body === undefined
              ? undefined
              : JSON.stringify(body),
      });
    for (const route of [
      "/",
      "/admin",
      "/payment",
      "/js/campaign.js",
      "/styles.css",
      "/fonts/fonts.css",
      "/images/study.jpg",
    ])
      assert.equal((await request(route)).status, 200, route);
    const initial = await (await request("/api/campaign")).json();
    assert.equal(initial.total.count, 0);
    assert.equal(initial.config.goalCents, 0);
    const login = await request("/api/admin/session", "POST", {
      password: pass,
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal(initial.paymentSetup, undefined, 'gateway setup details are only returned to admins');
    const dashboard=await (await request('/api/campaign','GET',undefined,cookie)).json();
    assert.deepEqual(dashboard.paymentSetup,{configured:false,mode:'test'});

    assert.equal(
      (await request("/api/admin/config", "PUT", initial.config)).status,
      401,
    );
    const config = {
      ...initial.config,
      titleAr: "حملة اختبار محلية",
      titleEn: "Local test campaign",
      goalCents: 250000,
    };
    assert.equal(
      (await request("/api/admin/config", "PUT", config, cookie)).status,
      200,
    );
    assert.equal(
      (await (await request("/api/campaign")).json()).config.goalCents,
      250000,
    );
    const update = await request(
      "/api/admin/updates",
      "POST",
      {
        titleAr: "تحديث تجريبي",
        titleEn: "Test update",
        bodyAr: "اختبار حفظ التحديث",
        bodyEn: "Testing update persistence",
      },
      cookie,
    );
    assert.equal(update.status, 201);
    assert.equal(
      (await (await request("/api/campaign")).json()).updates.length,
      1,
    );
    const form = new FormData();
    form.set(
      "file",
      new File(
        [await readFile(path.join(root, "public/images/study.jpg"))],
        "study.jpg",
        { type: "image/jpeg" },
      ),
    );
    form.set("publish", "yes");
    const upload = await request("/api/admin/upload", "POST", form, cookie);
    assert.equal(upload.status, 201);
    const asset = (await upload.json()).url;
    const photo = await request(asset);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get("content-type"), "image/jpeg");
    assert.equal(
      (
        await request("/api/donations", "POST", {
          amount: "25",
          requestId: crypto.randomUUID(),
        })
      ).status,
      503,
    );
  } finally {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    await rm(directory, { recursive: true, force: true });
  }
});
