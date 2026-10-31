import { h, Fragment, icon, mount } from "./dom.js";
const ArrowUpLeft = icon("ArrowUpLeft"),
  ArrowUpRight = icon("ArrowUpRight"),
  Check = icon("Check"),
  ChevronDown = icon("ChevronDown"),
  Copy = icon("Copy"),
  FileText = icon("FileText"),
  Globe = icon("Globe"),
  GraduationCap = icon("GraduationCap"),
  Heart = icon("Heart"),
  Link = icon("Link"),
  Mail = icon("Mail"),
  MapPin = icon("MapPin"),
  Share2 = icon("Share2"),
  ShieldCheck = icon("ShieldCheck"),
  Wallet = icon("Wallet"),
  X = icon("X"),
  ExternalLink = icon("ExternalLink"),
  BookOpen = icon("BookOpen"),
  Clock = icon("Clock"),
  Code2 = icon("Code2"),
  ArrowLeft = icon("ArrowLeft"),
  ArrowRight = icon("ArrowRight"),
  LogOut = icon("LogOut"),
  Plus = icon("Plus"),
  Save = icon("Save"),
  Trash2 = icon("Trash2"),
  Upload = icon("Upload"),
  CheckCircle2 = icon("CheckCircle2"),
  RefreshCw = icon("RefreshCw"),
  AlertCircle = icon("AlertCircle");
function Admin() {
  const {
    authorized,
    configured,
    loading,
    password,
    tab,
    config,
    updates,
    donations,
    total,
    notice,
    error,
    busy,
    post,
    publicConsent,
    uploadKind,
  } = view.state;
  async function api(path, options = {}) {
    const r = await fetch(path, options);
    const d = await r.json();
    if (!r.ok) {
      if (r.status === 401) setAuthorized(false);
      throw Error(d.error || "تعذّر تنفيذ العملية");
    }
    return d;
  }
  async function load() {
    setError("");
    try {
      const s = await api("/api/admin/session");
      setAuthorized(s.admin);
      setConfigured(s.configured);
      if (s.admin) {
        const c = await api("/api/campaign");
        setConfig(c.config);
        setTotal(c.total);
        setUpdates(c.updates);
        const d = await api("/api/admin/donations");
        setDonations(d.donations);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  function change(key, value) {
    setConfig((c) => ({ ...c, [key]: value }));
  }
  async function action(fn) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const opts = (method, b) => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
  async function save() {
    await action(async () => {
      const r = await api("/api/admin/config", opts("PUT", config));
      setConfig(r.config);
      setNotice("تم حفظ التغييرات. تظهر مباشرة على صفحة الحملة.");
    });
  }
  function list(key, extra) {
    change(key, [...config[key], extra]);
  }
  function editRow(key, i, field, value) {
    change(
      key,
      config[key].map((x, n) => (n === i ? { ...x, [field]: value } : x)),
    );
  }
  const alert = /* @__PURE__ */ h(
    Fragment,
    null,
    error &&
      /* @__PURE__ */ h("p", { className: "error", role: "alert" }, error),
    notice &&
      /* @__PURE__ */ h(
        "div",
        { className: "notice", role: "status" },
        /* @__PURE__ */ h(Check, { size: 15 }),
        " ",
        notice,
      ),
  );
  if (!view.initialized) {
    view.initialized = true;
    queueMicrotask(load);
  }
  if (loading || (authorized && !config))
    return /* @__PURE__ */ h(
      "main",
      { className: "admin-wrap" },
      /* @__PURE__ */ h("p", null, "جاري تحميل لوحة الإدارة…"),
    );
  if (!authorized)
    return /* @__PURE__ */ h(
      "main",
      { className: "admin-wrap" },
      /* @__PURE__ */ h(
        "a",
        { className: "brand", href: "/" },
        /* @__PURE__ */ h(
          "span",
          { className: "brand-mark" },
          /* @__PURE__ */ h(GraduationCap, null),
        ),
        "حملة فؤاد",
      ),
      /* @__PURE__ */ h(
        "section",
        { className: "admin-card login-box" },
        /* @__PURE__ */ h(
          "span",
          { className: "section-kicker" },
          "إدارة الحملة",
        ),
        /* @__PURE__ */ h("h1", null, "أهلًا فؤاد 👋"),
        /* @__PURE__ */ h(
          "p",
          { className: "muted" },
          "سجّل الدخول لإدارة قصتك وتحديثاتك وإعدادات الدعم.",
        ),
        alert,
        !configured &&
          /* @__PURE__ */ h(
            "div",
            { className: "notice" },
            "الدخول غير مفعّل حتى الآن. أضف متغير السيرفر ",
            /* @__PURE__ */ h("code", { dir: "ltr" }, "ADMIN_PASSWORD"),
            " بكلمة مرور قوية لا تقل عن 16 محرفًا. لا تُكتب كلمة المرور في الكود أو داخل GitHub.",
          ),
        /* @__PURE__ */ h(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              action(async () => {
                await api("/api/admin/session", opts("POST", { password }));
                setPassword("");
                await load();
              });
            },
          },
          /* @__PURE__ */ h(
            "label",
            { htmlFor: "password" },
            "كلمة مرور الإدارة",
          ),
          /* @__PURE__ */ h("input", {
            className: "admin-input",
            id: "password",
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            autoComplete: "current-password",
            required: true,
            minLength: 16,
          }),
          /* @__PURE__ */ h(
            "button",
            {
              className: "button primary",
              style: { width: "100%", marginTop: 18 },
              disabled: busy || !configured,
            },
            "دخول آمن",
          ),
        ),
        /* @__PURE__ */ h(
          "a",
          { className: "share-instead", href: "/" },
          "العودة إلى الحملة ",
          /* @__PURE__ */ h(ArrowRight, { size: 15 }),
        ),
      ),
    );
  return /* @__PURE__ */ h(
    "main",
    { className: "admin-wrap" },
    /* @__PURE__ */ h(
      "div",
      { className: "admin-top" },
      /* @__PURE__ */ h(
        "div",
        null,
        /* @__PURE__ */ h(
          "span",
          { className: "section-kicker" },
          "لوحة التحكم",
        ),
        /* @__PURE__ */ h("h1", null, "حملتك، خطوة بخطوة."),
      ),
      /* @__PURE__ */ h(
        "div",
        { className: "admin-actions" },
        /* @__PURE__ */ h(
          "a",
          { className: "button outline small", href: "/", target: "_blank" },
          "عرض الحملة ",
          /* @__PURE__ */ h(ExternalLink, { size: 15 }),
        ),
        /* @__PURE__ */ h(
          "button",
          {
            className: "icon-button",
            "aria-label": "تسجيل الخروج",
            onClick: () =>
              action(async () => {
                await api("/api/admin/session", { method: "DELETE" });
                setAuthorized(false);
              }),
          },
          /* @__PURE__ */ h(LogOut, { size: 17 }),
        ),
      ),
    ),
    /* @__PURE__ */ h(
      "div",
      { className: "admin-metrics" },
      /* @__PURE__ */ h(
        "div",
        null,
        /* @__PURE__ */ h("small", null, "المساهمات المؤكدة الحقيقية"),
        /* @__PURE__ */ h("strong", null, "$", (total.amount / 100).toFixed(2)),
      ),
      /* @__PURE__ */ h(
        "div",
        null,
        /* @__PURE__ */ h("small", null, "عدد المساهمات الحقيقية"),
        /* @__PURE__ */ h("strong", null, total.count),
      ),
      /* @__PURE__ */ h(
        "div",
        null,
        /* @__PURE__ */ h("small", null, "الساعات المتبقية"),
        /* @__PURE__ */ h("strong", null, config.remainingHours),
      ),
    ),
    /* @__PURE__ */ h(
      "div",
      { className: "admin-tabs" },
      [
        ["content", "القصة والهوية"],
        ["support", "الدعم والميزانية"],
        ["files", "المستندات والمشاريع"],
        ["updates", "التحديثات"],
        ["donations", "سجل الدفع"],
      ].map(([id, label]) =>
        /* @__PURE__ */ h(
          "button",
          {
            className: tab === id ? "active" : "",
            onClick: () => setTab(id),
            key: id,
          },
          label,
        ),
      ),
    ),
    alert,
    tab === "content" &&
      /* @__PURE__ */ h(
        "section",
        { className: "admin-card" },
        /* @__PURE__ */ h("h2", null, "القصة والهوية"),
        /* @__PURE__ */ h(
          "div",
          { className: "admin-grid" },
          [
            ["titleAr", "عنوان الحملة بالعربي"],
            ["titleEn", "عنوان الحملة بالإنجليزي"],
            ["introAr", "نبذة قصيرة بالعربي"],
            ["introEn", "نبذة قصيرة بالإنجليزي"],
            ["storyAr", "القصة بالعربي"],
            ["storyEn", "القصة بالإنجليزي"],
          ].map(([key, label]) =>
            /* @__PURE__ */ h(
              "div",
              { className: "field", key },
              /* @__PURE__ */ h("label", { htmlFor: key }, label),
              key.startsWith("story") || key.startsWith("intro")
                ? /* @__PURE__ */ h("textarea", {
                    id: key,
                    className: "admin-input",
                    dir: key.endsWith("En") ? "ltr" : "rtl",
                    value: config[key],
                    onChange: (e) => change(key, e.target.value),
                  })
                : /* @__PURE__ */ h("input", {
                    id: key,
                    className: "admin-input",
                    dir: key.endsWith("En") ? "ltr" : "rtl",
                    value: config[key],
                    onChange: (e) => change(key, e.target.value),
                  }),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "field" },
            /* @__PURE__ */ h(
              "label",
              { htmlFor: "hours" },
              "الساعات الدراسية المتبقية",
            ),
            /* @__PURE__ */ h("input", {
              id: "hours",
              className: "admin-input",
              type: "number",
              min: 0,
              max: 300,
              value: config.remainingHours,
              onChange: (e) => change("remainingHours", Number(e.target.value)),
            }),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "field" },
            /* @__PURE__ */ h(
              "label",
              { htmlFor: "email" },
              "بريد التواصل المنشور (اختياري)",
            ),
            /* @__PURE__ */ h("input", {
              id: "email",
              className: "admin-input",
              type: "email",
              dir: "ltr",
              value: config.contactEmail,
              onChange: (e) => change("contactEmail", e.target.value),
            }),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "wide field" },
            /* @__PURE__ */ h(
              "label",
              { htmlFor: "image" },
              "رابط صورة الحملة",
            ),
            /* @__PURE__ */ h("input", {
              id: "image",
              className: "admin-input",
              dir: "ltr",
              value: config.image,
              onChange: (e) => change("image", e.target.value),
            }),
            /* @__PURE__ */ h(
              "label",
              { className: "checkbox" },
              /* @__PURE__ */ h("input", {
                type: "checkbox",
                checked: config.imageIsPersonal,
                onChange: (e) => change("imageIsPersonal", e.target.checked),
              }),
              "هذه صورة حقيقية لي، وليست صورة توضيحية",
            ),
            /* @__PURE__ */ h("img", {
              src: config.image,
              alt: "معاينة صورة الحملة",
              style: { height: 160, borderRadius: 10, objectFit: "cover" },
            }),
          ),
        ),
      ),
    tab === "support" &&
      /* @__PURE__ */ h(
        "section",
        { className: "admin-card" },
        /* @__PURE__ */ h("h2", null, "الدعم والميزانية"),
        /* @__PURE__ */ h(
          "div",
          { className: "notice" },
          "مفاتيح Payunit تُضاف كمتغيرات سرّية في السيرفر، ولا تُحفظ في هذه اللوحة. الوضع الافتراضي test، ومساهماته لا تدخل إجمالي الحملة. تفعيل الدفع الحقيقي يحتاج مفاتيح live وإشعار Webhook صالح.",
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "field" },
          /* @__PURE__ */ h(
            "label",
            { htmlFor: "goal" },
            "الهدف المالي بالدولار",
          ),
          /* @__PURE__ */ h("input", {
            className: "admin-input",
            id: "goal",
            type: "number",
            min: 0,
            step: "0.01",
            value: config.goalCents / 100,
            onChange: (e) =>
              change("goalCents", Math.round(Number(e.target.value) * 100)),
          }),
        ),
        /* @__PURE__ */ h(
          "label",
          { className: "checkbox" },
          /* @__PURE__ */ h("input", {
            type: "checkbox",
            checked: config.acceptingDonations,
            onChange: (e) => change("acceptingDonations", e.target.checked),
          }),
          "فتح استقبال الدعم بعد توثيق الرسوم وتجهيز وسيلة الدفع",
        ),
        /* @__PURE__ */ h("h3", null, "تفصيل الاحتياجات"),
        config.budgets.map((x, i) =>
          /* @__PURE__ */ h(
            "div",
            { className: "admin-card", key: i },
            /* @__PURE__ */ h(
              "div",
              { className: "admin-grid" },
              /* @__PURE__ */ h(
                "div",
                null,
                /* @__PURE__ */ h("label", null, "البند بالعربي"),
                /* @__PURE__ */ h("input", {
                  className: "admin-input",
                  value: x.titleAr,
                  onChange: (e) =>
                    editRow("budgets", i, "titleAr", e.target.value),
                }),
              ),
              /* @__PURE__ */ h(
                "div",
                null,
                /* @__PURE__ */ h("label", null, "البند بالإنجليزي"),
                /* @__PURE__ */ h("input", {
                  className: "admin-input",
                  dir: "ltr",
                  value: x.titleEn,
                  onChange: (e) =>
                    editRow("budgets", i, "titleEn", e.target.value),
                }),
              ),
              /* @__PURE__ */ h(
                "div",
                null,
                /* @__PURE__ */ h("label", null, "القيمة بالدولار"),
                /* @__PURE__ */ h("input", {
                  type: "number",
                  min: 0,
                  step: "0.01",
                  className: "admin-input",
                  value: x.amountCents / 100,
                  onChange: (e) =>
                    editRow(
                      "budgets",
                      i,
                      "amountCents",
                      Math.round(Number(e.target.value) * 100),
                    ),
                }),
              ),
              /* @__PURE__ */ h(
                "button",
                {
                  className: "text-button remove",
                  onClick: () =>
                    change(
                      "budgets",
                      config.budgets.filter((_, n) => n !== i),
                    ),
                },
                "حذف البند",
              ),
            ),
          ),
        ),
        /* @__PURE__ */ h(
          "button",
          {
            className: "button outline small",
            onClick: () =>
              list("budgets", { titleAr: "", titleEn: "", amountCents: 0 }),
          },
          /* @__PURE__ */ h(Plus, { size: 15 }),
          "إضافة بند",
        ),
        config.budgets.length > 0 &&
          /* @__PURE__ */ h(
            "button",
            {
              className: "text-button",
              style: { marginTop: 15, color: "var(--green)" },
              onClick: () =>
                change(
                  "goalCents",
                  config.budgets.reduce((n, x) => n + x.amountCents, 0),
                ),
            },
            "اعتماد مجموع البنود كهدف الحملة",
          ),
        /* @__PURE__ */ h("h3", null, "محافظ العملات الرقمية"),
        /* @__PURE__ */ h(
          "p",
          { className: "muted" },
          "التفعيل اختياري. تأكد من العنوان والشبكة خارج الموقع قبل الحفظ. لا تضع عبارة الاسترداد أو المفتاح الخاص. التحويلات لا تدخل إجمالي Payunit تلقائيًا.",
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "field" },
          /* @__PURE__ */ h("label", null, "عنوان استقبال Bitcoin"),
          /* @__PURE__ */ h("input", {
            className: "admin-input",
            dir: "ltr",
            value: config.btcAddress,
            onChange: (e) => change("btcAddress", e.target.value),
          }),
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "field" },
          /* @__PURE__ */ h("label", null, "شبكة USDT"),
          /* @__PURE__ */ h(
            "select",
            {
              className: "admin-input",
              value: config.usdtNetwork,
              onChange: (e) => change("usdtNetwork", e.target.value),
            },
            /* @__PURE__ */ h("option", null, "TRC20"),
            /* @__PURE__ */ h("option", null, "ERC20"),
          ),
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "field" },
          /* @__PURE__ */ h("label", null, "عنوان استقبال USDT"),
          /* @__PURE__ */ h("input", {
            className: "admin-input",
            dir: "ltr",
            value: config.usdtAddress,
            onChange: (e) => change("usdtAddress", e.target.value),
          }),
        ),
      ),
    tab === "files" &&
      /* @__PURE__ */ h(
        "section",
        { className: "admin-card" },
        /* @__PURE__ */ h("h2", null, "المستندات والمشاريع"),
        /* @__PURE__ */ h(
          "div",
          { className: "upload-row" },
          /* @__PURE__ */ h(
            "h3",
            { style: { marginTop: 0 } },
            "رفع صورة أو مستند",
          ),
          /* @__PURE__ */ h(
            "p",
            { className: "muted" },
            "JPEG أو PNG أو PDF، بحد أقصى 5 MB. الملفات التي ترفعها هنا متاحة عبر رابط عام؛ احذف أرقام الهوية والعناوين وأي معلومات حساسة من الملف أولًا.",
          ),
          /* @__PURE__ */ h(
            "label",
            { htmlFor: "upload-kind" },
            "استخدام الملف",
          ),
          /* @__PURE__ */ h(
            "select",
            {
              id: "upload-kind",
              className: "admin-input",
              value: uploadKind,
              onChange: (e) => setUploadKind(e.target.value),
            },
            /* @__PURE__ */ h(
              "option",
              { value: "image" },
              "الصورة الرئيسية للحملة",
            ),
            /* @__PURE__ */ h(
              "option",
              { value: "document" },
              "مستند دراسي منشور",
            ),
          ),
          /* @__PURE__ */ h(
            "label",
            { className: "checkbox" },
            /* @__PURE__ */ h("input", {
              type: "checkbox",
              checked: publicConsent,
              onChange: (e) => setPublicConsent(e.target.checked),
            }),
            "راجعت الملف، وهو مناسب للنشر العام وخالٍ من البيانات الحساسة",
          ),
          /* @__PURE__ */ h("input", {
            "aria-label": "اختيار الملف",
            type: "file",
            accept: "image/jpeg,image/png,application/pdf",
            disabled: !publicConsent || busy,
            onChange: (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (uploadKind === "image" && f.type === "application/pdf") {
                setError("اختر صورة للصورة الرئيسية، وليس PDF.");
                return;
              }
              action(async () => {
                const form = new FormData();
                form.append("file", f);
                form.append("publish", "yes");
                const d = await api("/api/admin/upload", {
                  method: "POST",
                  body: form,
                });
                if (uploadKind === "image") {
                  change("image", d.url);
                  change("imageIsPersonal", true);
                } else
                  list("documents", {
                    titleAr: "مستند دراسي",
                    titleEn: "Educational document",
                    url: d.url,
                  });
                setNotice("تم الرفع. راجع العنوان واضغط حفظ التغييرات للنشر.");
                setPublicConsent(false);
              });
            },
          }),
        ),
        [
          ["documents", "المستندات الدراسية"],
          ["projects", "روابط المشاريع"],
        ].map(([key, label]) =>
          /* @__PURE__ */ h(
            "div",
            { key },
            /* @__PURE__ */ h("h3", null, label),
            config[key].map((x, i) =>
              /* @__PURE__ */ h(
                "div",
                { className: "admin-card", key: i },
                /* @__PURE__ */ h(
                  "div",
                  { className: "admin-grid" },
                  /* @__PURE__ */ h(
                    "div",
                    null,
                    /* @__PURE__ */ h("label", null, "العنوان بالعربي"),
                    /* @__PURE__ */ h("input", {
                      className: "admin-input",
                      value: x.titleAr,
                      onChange: (e) =>
                        editRow(key, i, "titleAr", e.target.value),
                    }),
                  ),
                  /* @__PURE__ */ h(
                    "div",
                    null,
                    /* @__PURE__ */ h("label", null, "العنوان بالإنجليزي"),
                    /* @__PURE__ */ h("input", {
                      className: "admin-input",
                      dir: "ltr",
                      value: x.titleEn,
                      onChange: (e) =>
                        editRow(key, i, "titleEn", e.target.value),
                    }),
                  ),
                  /* @__PURE__ */ h(
                    "div",
                    { className: "wide" },
                    /* @__PURE__ */ h("label", null, "الرابط"),
                    /* @__PURE__ */ h("input", {
                      className: "admin-input",
                      dir: "ltr",
                      value: x.url,
                      onChange: (e) => editRow(key, i, "url", e.target.value),
                    }),
                  ),
                ),
                /* @__PURE__ */ h(
                  "button",
                  {
                    className: "text-button remove",
                    onClick: () =>
                      change(
                        key,
                        config[key].filter((_, n) => n !== i),
                      ),
                  },
                  "حذف الرابط",
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "button",
              {
                className: "button outline small",
                onClick: () => list(key, { titleAr: "", titleEn: "", url: "" }),
              },
              /* @__PURE__ */ h(Plus, { size: 15 }),
              "إضافة رابط",
            ),
          ),
        ),
      ),
    tab === "updates" &&
      /* @__PURE__ */ h(
        Fragment,
        null,
        /* @__PURE__ */ h(
          "section",
          { className: "admin-card" },
          /* @__PURE__ */ h("h2", null, "تحديث جديد"),
          /* @__PURE__ */ h(
            "div",
            { className: "admin-grid" },
            [
              ["titleAr", "العنوان بالعربي"],
              ["titleEn", "العنوان بالإنجليزي"],
              ["bodyAr", "التحديث بالعربي"],
              ["bodyEn", "التحديث بالإنجليزي"],
            ].map(([key, label]) =>
              /* @__PURE__ */ h(
                "div",
                { className: "field", key },
                /* @__PURE__ */ h("label", { htmlFor: "post-" + key }, label),
                key.startsWith("body")
                  ? /* @__PURE__ */ h("textarea", {
                      className: "admin-input",
                      id: "post-" + key,
                      dir: key.endsWith("En") ? "ltr" : "rtl",
                      value: post[key],
                      onChange: (e) =>
                        setPost({ ...post, [key]: e.target.value }),
                    })
                  : /* @__PURE__ */ h("input", {
                      className: "admin-input",
                      id: "post-" + key,
                      dir: key.endsWith("En") ? "ltr" : "rtl",
                      value: post[key],
                      onChange: (e) =>
                        setPost({ ...post, [key]: e.target.value }),
                    }),
              ),
            ),
          ),
          /* @__PURE__ */ h(
            "button",
            {
              className: "button primary",
              disabled: busy,
              onClick: () =>
                action(async () => {
                  await api("/api/admin/updates", opts("POST", post));
                  setPost({ titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" });
                  await load();
                  setNotice("تم نشر التحديث باللغتين.");
                }),
            },
            /* @__PURE__ */ h(Plus, { size: 17 }),
            "نشر التحديث",
          ),
        ),
        /* @__PURE__ */ h(
          "section",
          { className: "admin-card" },
          /* @__PURE__ */ h("h3", null, "التحديثات المنشورة"),
          updates.length
            ? updates.map((u) =>
                /* @__PURE__ */ h(
                  "article",
                  { className: "update", key: u.id },
                  /* @__PURE__ */ h("h3", null, u.title_ar),
                  /* @__PURE__ */ h("p", null, u.body_ar),
                  /* @__PURE__ */ h(
                    "button",
                    {
                      className: "remove text-button",
                      onClick: () => {
                        if (confirm("حذف هذا التحديث نهائيًا؟"))
                          action(async () => {
                            await api("/api/admin/updates/" + u.id, {
                              method: "DELETE",
                            });
                            await load();
                          });
                      },
                    },
                    "حذف التحديث",
                  ),
                ),
              )
            : /* @__PURE__ */ h(
                "p",
                { className: "muted" },
                "لم تُنشر تحديثات بعد.",
              ),
        ),
      ),
    tab === "donations" &&
      /* @__PURE__ */ h(
        "section",
        { className: "admin-card" },
        /* @__PURE__ */ h("h2", null, "آخر 100 محاولة دفع"),
        /* @__PURE__ */ h(
          "p",
          { className: "muted" },
          "يُحتسب فقط الدفع الحقيقي المؤكد بحالة paid. وضع test والاسترداد لا يدخلان الإجمالي. لا يمكن تغيير الحالة يدويًا.",
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "table-wrap" },
          /* @__PURE__ */ h(
            "table",
            null,
            /* @__PURE__ */ h(
              "thead",
              null,
              /* @__PURE__ */ h(
                "tr",
                null,
                /* @__PURE__ */ h("th", null, "المرجع"),
                /* @__PURE__ */ h("th", null, "المبلغ USD"),
                /* @__PURE__ */ h("th", null, "الوضع"),
                /* @__PURE__ */ h("th", null, "الحالة"),
                /* @__PURE__ */ h("th", null, "التاريخ"),
              ),
            ),
            /* @__PURE__ */ h(
              "tbody",
              null,
              donations.map((d) =>
                /* @__PURE__ */ h(
                  "tr",
                  { key: d.id },
                  /* @__PURE__ */ h("td", { dir: "ltr" }, d.id.slice(0, 8)),
                  /* @__PURE__ */ h(
                    "td",
                    null,
                    "$",
                    (d.amount / 100).toFixed(2),
                  ),
                  /* @__PURE__ */ h("td", null, d.mode),
                  /* @__PURE__ */ h("td", null, d.status),
                  /* @__PURE__ */ h(
                    "td",
                    null,
                    new Date(d.created_at).toLocaleDateString("ar"),
                  ),
                ),
              ),
            ),
          ),
          !donations.length &&
            /* @__PURE__ */ h(
              "p",
              { className: "muted" },
              "لا توجد محاولات دفع بعد.",
            ),
        ),
      ),
    ["content", "support", "files"].includes(tab) &&
      /* @__PURE__ */ h(
        "button",
        { className: "button primary", disabled: busy, onClick: save },
        /* @__PURE__ */ h(Save, { size: 18 }),
        busy ? "جاري الحفظ…" : "حفظ التغييرات",
      ),
  );
}

const view = mount(
  document.getElementById("app"),
  {
    authorized: false,
    configured: true,
    loading: true,
    password: "",
    tab: "content",
    config: null,
    updates: [],
    donations: [],
    total: { amount: 0, count: 0 },
    notice: "",
    error: "",
    busy: false,
    post: { titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" },
    publicConsent: false,
    uploadKind: "image",
  },
  Admin,
  () => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  },
);
const setAuthorized = (value) => view.set("authorized", value);
const setConfigured = (value) => view.set("configured", value);
const setLoading = (value) => view.set("loading", value);
const setPassword = (value) => view.set("password", value);
const setTab = (value) => view.set("tab", value);
const setConfig = (value) => view.set("config", value);
const setUpdates = (value) => view.set("updates", value);
const setDonations = (value) => view.set("donations", value);
const setTotal = (value) => view.set("total", value);
const setNotice = (value) => view.set("notice", value);
const setError = (value) => view.set("error", value);
const setBusy = (value) => view.set("busy", value);
const setPost = (value) => view.set("post", value);
const setPublicConsent = (value) => view.set("publicConsent", value);
const setUploadKind = (value) => view.set("uploadKind", value);
view.render();
