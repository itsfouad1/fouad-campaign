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
import { defaults } from "./config.js";
function Campaign() {
  const {
    lang,
    config,
    updates,
    total,
    tab,
    ready,
    mode,
    loaded,
    loadError,
    amount,
    method,
    modal,
    busy,
    error,
    toast,
    consent,
    qr,
  } = view.state;
  const dialog = view.refs.dialog,
    lastFocus = view.refs.lastFocus,
    requestRef = view.refs.requestRef;
  const ar = lang === "ar",
    t = (a, b) => (ar ? a : b),
    money = (n) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n / 100);
  function notify(s) {
    setToast(s);
    setTimeout(() => setToast(""), 3500);
  }
  async function load() {
    try {
      setLoadError(false);
      const r = await fetch("/api/campaign");
      if (!r.ok) throw Error();
      const d = await r.json();
      setConfig(d.config);
      setUpdates(d.updates);
      setTotal(d.total);
      setReady(d.payunitReady);
      setMode(d.mode);
      setLoaded(true);
    } catch {
      setLoadError(true);
    }
  }
  async function share() {
    const url = location.origin + "/";
    try {
      if (navigator.share)
        await navigator.share({
          title: ar ? config.titleAr : config.titleEn,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        notify(t("تم نسخ رابط الحملة", "Campaign link copied"));
      }
    } catch {}
  }
  function openSupport() {
    setModal(true);
    setError("");
  }
  async function checkout() {
    setError("");
    if (!consent) {
      setError(
        t(
          "راجع المبلغ وطريقة الدعم وأكّد الموافقة أولًا.",
          "Please review your contribution and confirm first.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      let attempt = requestRef.current;
      if (!attempt || attempt.amount !== amount) {
        attempt = { amount, id: crypto.randomUUID() };
        requestRef.current = attempt;
        sessionStorage.setItem("campaign-attempt", JSON.stringify(attempt));
      }
      const r = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, requestId: attempt.id }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (d.checkoutUrl) {
        const u = new URL(d.checkoutUrl);
        if (u.origin !== "https://payunit.co")
          throw Error("Invalid checkout URL");
        sessionStorage.setItem("campaign-payment", d.id);
        location.assign(u.href);
      } else location.assign("/payment?id=" + d.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const progress = config.goalCents
    ? Math.min(100, (total.amount / config.goalCents) * 100)
    : 0;
  const wallet = method === "btc" ? config.btcAddress : config.usdtAddress;
  const tabs = [
    ["story", t("القصة", "Story")],
    ["updates", t("التحديثات", "Updates")],
    ["documents", t("المستندات", "Documents")],
  ];
  if (!view.initialized) {
    view.initialized = true;
    queueMicrotask(load);
  }
  return /* @__PURE__ */ h(
    Fragment,
    null,
    /* @__PURE__ */ h(
      "header",
      { className: "site-header" },
      /* @__PURE__ */ h(
        "div",
        { className: "nav wrap" },
        /* @__PURE__ */ h(
          "a",
          {
            className: "brand",
            href: "/",
            "aria-label": t("حملة فؤاد — الرئيسية", "Fouad’s campaign — Home"),
          },
          /* @__PURE__ */ h(
            "span",
            { className: "brand-mark" },
            /* @__PURE__ */ h(GraduationCap, { size: 23 }),
          ),
          /* @__PURE__ */ h(
            "span",
            null,
            t("حملة فؤاد", "For Fouad"),
            /* @__PURE__ */ h(
              "small",
              null,
              t("خطوة نحو التخرّج", "A step toward graduation"),
            ),
          ),
        ),
        /* @__PURE__ */ h(
          "nav",
          { "aria-label": t("التنقل الرئيسي", "Main navigation") },
          /* @__PURE__ */ h(
            "a",
            { href: "#story", onClick: () => setTab("story") },
            t("عن الحملة", "The campaign"),
          ),
          /* @__PURE__ */ h(
            "a",
            { href: "#story", onClick: () => setTab("updates") },
            t("آخر التحديثات", "Updates"),
          ),
          /* @__PURE__ */ h(
            "a",
            { href: "#contact" },
            t("تواصل معي", "Get in touch"),
          ),
        ),
        /* @__PURE__ */ h(
          "div",
          { className: "nav-actions" },
          /* @__PURE__ */ h(
            "button",
            { className: "language", onClick: () => setLang(ar ? "en" : "ar") },
            /* @__PURE__ */ h(Globe, { size: 16 }),
            ar ? "English" : "العربية",
          ),
          /* @__PURE__ */ h(
            "button",
            {
              className: "icon-button",
              "aria-label": t("مشاركة الحملة", "Share campaign"),
              onClick: share,
            },
            /* @__PURE__ */ h(Share2, { size: 18 }),
          ),
        ),
      ),
    ),
    /* @__PURE__ */ h(
      "main",
      { className: "wrap campaign-main" },
      /* @__PURE__ */ h(
        "div",
        { className: "breadcrumb" },
        /* @__PURE__ */ h("span", null, t("حملة شخصية", "Personal fundraiser")),
        /* @__PURE__ */ h("span", null, "/"),
        /* @__PURE__ */ h("span", null, t("التعليم", "Education")),
        /* @__PURE__ */ h("span", null, "/"),
        /* @__PURE__ */ h(
          "span",
          null,
          /* @__PURE__ */ h(MapPin, { size: 13 }),
          t("غزة، فلسطين", "Gaza, Palestine"),
        ),
      ),
      /* @__PURE__ */ h(
        "div",
        { className: "heading" },
        /* @__PURE__ */ h(
          "div",
          null,
          /* @__PURE__ */ h(
            "div",
            { className: "eyebrow" },
            /* @__PURE__ */ h("span", null),
            t("لأنّ التعليم يستحق فرصة", "Because education deserves a chance"),
          ),
          /* @__PURE__ */ h("h1", null, ar ? config.titleAr : config.titleEn),
          /* @__PURE__ */ h("p", null, ar ? config.introAr : config.introEn),
        ),
        /* @__PURE__ */ h(
          "button",
          { className: "text-share", onClick: share },
          /* @__PURE__ */ h(Share2, { size: 16 }),
          t("شارك الأمل", "Share some hope"),
        ),
      ),
      loadError &&
        /* @__PURE__ */ h(
          "div",
          { className: "notice" },
          t(
            "تعذّر تحميل آخر بيانات الحملة. المعروض محتوى مبدئي.",
            "Latest campaign data could not be loaded. Showing draft content.",
          ),
          " ",
          /* @__PURE__ */ h(
            "button",
            { onClick: load },
            t("إعادة المحاولة", "Retry"),
          ),
        ),
      /* @__PURE__ */ h(
        "div",
        { className: "campaign-grid" },
        /* @__PURE__ */ h(
          "section",
          { className: "story-column" },
          /* @__PURE__ */ h(
            "div",
            { className: "cover" },
            /* @__PURE__ */ h("img", {
              src: config.image,
              alt: config.imageIsPersonal
                ? t(
                    "صورة فؤاد وحملته الدراسية",
                    "Fouad and his education campaign",
                  )
                : t(
                    "مساحة دراسة وبرمجة — صورة توضيحية",
                    "Study and programming workspace — illustrative image",
                  ),
            }),
            /* @__PURE__ */ h(
              "span",
              { className: "cover-label" },
              /* @__PURE__ */ h(BookOpen, { size: 13 }),
              t("رحلة تعليم، من غزة", "An education journey, from Gaza"),
            ),
            !config.imageIsPersonal &&
              /* @__PURE__ */ h(
                "span",
                { className: "image-note" },
                t(
                  "صورة توضيحية لحين إضافة صورتي",
                  "Illustrative image · personal photo coming soon",
                ),
              ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "organizer" },
            /* @__PURE__ */ h("span", { className: "avatar" }, "F"),
            /* @__PURE__ */ h(
              "div",
              null,
              /* @__PURE__ */ h(
                "strong",
                null,
                t("فؤاد", "Fouad"),
                " ",
                /* @__PURE__ */ h(
                  "span",
                  { className: "owner-tag" },
                  t("صاحب الحملة", "Campaign organizer"),
                ),
              ),
              /* @__PURE__ */ h(
                "p",
                null,
                t(
                  "طالب هندسة أنظمة حاسوب ومبرمج",
                  "Computer systems engineering student & programmer",
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "span",
              { className: "location" },
              /* @__PURE__ */ h(MapPin, { size: 14 }),
              t("غزة، فلسطين", "Gaza, Palestine"),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "fact-strip" },
            /* @__PURE__ */ h(
              "div",
              null,
              /* @__PURE__ */ h(GraduationCap, null),
              /* @__PURE__ */ h(
                "span",
                null,
                /* @__PURE__ */ h(
                  "strong",
                  null,
                  config.remainingHours,
                  " ",
                  t("ساعة دراسية", "credit hours"),
                ),
                /* @__PURE__ */ h(
                  "small",
                  null,
                  t("متبقية لإكمال دراستي", "remaining in my degree"),
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "div",
              null,
              /* @__PURE__ */ h(Code2, null),
              /* @__PURE__ */ h(
                "span",
                null,
                /* @__PURE__ */ h(
                  "strong",
                  null,
                  t("أواصل التعلّم والبناء", "Still learning. Still building."),
                ),
                /* @__PURE__ */ h(
                  "small",
                  null,
                  t(
                    "شغف بالبرمجة، رغم التحديات",
                    "A passion for programming, through challenges",
                  ),
                ),
              ),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "story-anchor", id: "story" },
            /* @__PURE__ */ h(
              "div",
              {
                className: "tabs",
                role: "tablist",
                "aria-label": t("تفاصيل الحملة", "Campaign details"),
              },
              tabs.map(([id, label], i) =>
                /* @__PURE__ */ h(
                  "button",
                  {
                    key: id,
                    id: "tab-" + id,
                    role: "tab",
                    "aria-selected": tab === id,
                    "aria-controls": "panel-" + id,
                    tabIndex: tab === id ? 0 : -1,
                    onKeyDown: (e) => {
                      if (
                        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const n =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 2
                              : (i +
                                  (e.key === "ArrowRight"
                                    ? ar
                                      ? -1
                                      : 1
                                    : ar
                                      ? 1
                                      : -1) +
                                  3) %
                                3;
                        setTab(tabs[n][0]);
                        document.getElementById("tab-" + tabs[n][0])?.focus();
                      }
                    },
                    onClick: () => setTab(id),
                  },
                  label,
                  id === "updates" &&
                    /* @__PURE__ */ h("span", null, updates.length),
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "div",
              {
                className: "tab-content",
                id: "panel-" + tab,
                role: "tabpanel",
                "aria-labelledby": "tab-" + tab,
              },
              tab === "story" &&
                /* @__PURE__ */ h(
                  Fragment,
                  null,
                  /* @__PURE__ */ h(
                    "span",
                    { className: "section-kicker" },
                    t("حكايتي", "MY STORY"),
                  ),
                  /* @__PURE__ */ h(
                    "h2",
                    null,
                    t(
                      "فرصة لإكمال ما بدأتُه",
                      "A chance to finish what I started",
                    ),
                  ),
                  /* @__PURE__ */ h(
                    "div",
                    { className: "story-text" },
                    (ar ? config.storyAr : config.storyEn)
                      .split("\n")
                      .filter(Boolean)
                      .map((s, i) => /* @__PURE__ */ h("p", { key: i }, s)),
                  ),
                  /* @__PURE__ */ h(
                    "div",
                    { className: "quote" },
                    /* @__PURE__ */ h(Heart, { size: 21 }),
                    /* @__PURE__ */ h(
                      "p",
                      null,
                      t(
                        "كل مساهمة، وكل مشاركة، بتقرّبني خطوة من قاعة الدراسة.",
                        "Every contribution and every share brings me a little closer to the classroom.",
                      ),
                    ),
                  ),
                  /* @__PURE__ */ h(
                    "h3",
                    null,
                    t("كيف سأستخدم الدعم؟", "How your support will be used"),
                  ),
                  config.budgets.length
                    ? /* @__PURE__ */ h(
                        "div",
                        { className: "budget-list" },
                        config.budgets.map((b, i) =>
                          /* @__PURE__ */ h(
                            "div",
                            { key: i },
                            /* @__PURE__ */ h(
                              "span",
                              null,
                              ar ? b.titleAr : b.titleEn,
                            ),
                            /* @__PURE__ */ h(
                              "strong",
                              null,
                              money(b.amountCents),
                            ),
                          ),
                        ),
                      )
                    : /* @__PURE__ */ h(
                        "div",
                        { className: "budget-empty" },
                        /* @__PURE__ */ h(BookOpen, { size: 23 }),
                        /* @__PURE__ */ h(
                          "div",
                          null,
                          /* @__PURE__ */ h(
                            "strong",
                            null,
                            t(
                              "الرسوم الجامعية أولًا",
                              "University tuition comes first",
                            ),
                          ),
                          /* @__PURE__ */ h(
                            "p",
                            null,
                            t(
                              "سأضيف تفصيلًا بالمبالغ والمستندات قبل فتح استقبال الدعم.",
                              "An itemized budget and supporting documents will be added before contributions open.",
                            ),
                          ),
                        ),
                      ),
                  config.projects.length > 0 &&
                    /* @__PURE__ */ h(
                      Fragment,
                      null,
                      /* @__PURE__ */ h(
                        "h3",
                        null,
                        t(
                          "من المشاريع التي أعمل عليها",
                          "Projects I’m working on",
                        ),
                      ),
                      /* @__PURE__ */ h(
                        "div",
                        { className: "project-list" },
                        config.projects.map((x, i) =>
                          /* @__PURE__ */ h(
                            "a",
                            {
                              key: i,
                              href: x.url,
                              target: "_blank",
                              rel: "noreferrer",
                            },
                            /* @__PURE__ */ h(Code2, { size: 19 }),
                            ar ? x.titleAr : x.titleEn,
                            /* @__PURE__ */ h(ExternalLink, { size: 15 }),
                          ),
                        ),
                      ),
                    ),
                ),
              tab === "updates" &&
                /* @__PURE__ */ h(
                  Fragment,
                  null,
                  /* @__PURE__ */ h(
                    "span",
                    { className: "section-kicker" },
                    t("خطوة بخطوة", "STEP BY STEP"),
                  ),
                  /* @__PURE__ */ h(
                    "h2",
                    null,
                    t(
                      "أخبار رحلتي الدراسية",
                      "Updates from my education journey",
                    ),
                  ),
                  updates.length
                    ? updates.map((u) =>
                        /* @__PURE__ */ h(
                          "article",
                          { className: "update", key: u.id },
                          /* @__PURE__ */ h(
                            "time",
                            null,
                            new Intl.DateTimeFormat(ar ? "ar" : "en", {
                              dateStyle: "medium",
                            }).format(new Date(u.created_at)),
                          ),
                          /* @__PURE__ */ h(
                            "h3",
                            null,
                            ar ? u.title_ar : u.title_en,
                          ),
                          /* @__PURE__ */ h(
                            "p",
                            null,
                            ar ? u.body_ar : u.body_en,
                          ),
                        ),
                      )
                    : /* @__PURE__ */ h(
                        "div",
                        { className: "empty" },
                        /* @__PURE__ */ h(Clock, null),
                        /* @__PURE__ */ h(
                          "strong",
                          null,
                          t(
                            "التحديث الأول قريبًا",
                            "The first update is coming soon",
                          ),
                        ),
                        /* @__PURE__ */ h(
                          "p",
                          null,
                          t(
                            "سأشارك هنا مستجدّات الدراسة والحملة واستخدام المساهمات.",
                            "I’ll share study progress, campaign news and how contributions are used here.",
                          ),
                        ),
                      ),
                ),
              tab === "documents" &&
                /* @__PURE__ */ h(
                  Fragment,
                  null,
                  /* @__PURE__ */ h(
                    "span",
                    { className: "section-kicker" },
                    t("بوضوح وشفافية", "WITH TRANSPARENCY"),
                  ),
                  /* @__PURE__ */ h(
                    "h2",
                    null,
                    t("المستندات الدراسية", "Educational documents"),
                  ),
                  /* @__PURE__ */ h(
                    "p",
                    { className: "muted" },
                    t(
                      "تُنشر المستندات بعد إخفاء البيانات الشخصية الحساسة.",
                      "Documents are published after sensitive personal information has been removed.",
                    ),
                  ),
                  config.documents.length
                    ? /* @__PURE__ */ h(
                        "div",
                        { className: "document-list" },
                        config.documents.map((x, i) =>
                          /* @__PURE__ */ h(
                            "a",
                            {
                              href: x.url,
                              key: i,
                              target: "_blank",
                              rel: "noreferrer",
                            },
                            /* @__PURE__ */ h(FileText, null),
                            /* @__PURE__ */ h(
                              "span",
                              null,
                              ar ? x.titleAr : x.titleEn,
                            ),
                            /* @__PURE__ */ h(ExternalLink, { size: 17 }),
                          ),
                        ),
                      )
                    : /* @__PURE__ */ h(
                        "div",
                        { className: "empty" },
                        /* @__PURE__ */ h(FileText, null),
                        /* @__PURE__ */ h(
                          "strong",
                          null,
                          t(
                            "المستندات قيد التجهيز",
                            "Documents are being prepared",
                          ),
                        ),
                        /* @__PURE__ */ h(
                          "p",
                          null,
                          t(
                            "ستظهر هنا إثباتات الدراسة وتفاصيل الرسوم عند تجهيزها.",
                            "Enrollment evidence and tuition details will appear here when ready.",
                          ),
                        ),
                      ),
                ),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "closing" },
            /* @__PURE__ */ h(Heart, { size: 20 }),
            /* @__PURE__ */ h(
              "div",
              null,
              /* @__PURE__ */ h(
                "strong",
                null,
                t("مش كل الدعم لازم يكون مادي", "Support comes in many forms"),
              ),
              /* @__PURE__ */ h(
                "p",
                null,
                t(
                  "مشاركة الرابط مع شخص واحد ممكن تفتح فرصة جديدة.",
                  "Sharing this link with one person could open a new door.",
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "button",
              { className: "button outline small", onClick: share },
              t("شارك الحملة", "Share campaign"),
              /* @__PURE__ */ h(Share2, { size: 15 }),
            ),
          ),
        ),
        /* @__PURE__ */ h(
          "aside",
          { className: "sidebar" },
          /* @__PURE__ */ h(
            "div",
            { className: "support-card" },
            /* @__PURE__ */ h(
              "div",
              { className: "card-top" },
              /* @__PURE__ */ h(
                "span",
                {
                  className:
                    "status " + (config.acceptingDonations ? "active" : ""),
                },
                /* @__PURE__ */ h("span", null),
                config.acceptingDonations
                  ? t("الحملة مفتوحة", "Campaign open")
                  : t("قريبًا، نبدأ الرحلة", "Getting ready to begin"),
              ),
              /* @__PURE__ */ h(Heart, { size: 19 }),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "raised" },
              /* @__PURE__ */ h("b", null, money(total.amount)),
              /* @__PURE__ */ h("span", null, t("تم جمعها", "raised so far")),
            ),
            /* @__PURE__ */ h(
              "p",
              { className: "goal" },
              config.goalCents
                ? /* @__PURE__ */ h(
                    Fragment,
                    null,
                    t("من هدف قدره", "of a"),
                    " ",
                    /* @__PURE__ */ h("strong", null, money(config.goalCents)),
                    " ",
                    t("", "goal"),
                  )
                : t(
                    "الهدف المالي يُحدّد بعد توثيق الرسوم",
                    "Goal to be set after tuition costs are documented",
                  ),
            ),
            /* @__PURE__ */ h(
              "div",
              {
                className: "progress",
                role: "progressbar",
                "aria-label": t("تقدم الحملة", "Campaign progress"),
                "aria-valuenow": Math.round(progress),
                "aria-valuemin": 0,
                "aria-valuemax": 100,
              },
              /* @__PURE__ */ h("span", { style: { width: progress + "%" } }),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "progress-label" },
              /* @__PURE__ */ h(
                "span",
                null,
                total.count,
                " ",
                t("مساهمة", "contributions"),
              ),
              /* @__PURE__ */ h("span", null, Math.round(progress), "%"),
            ),
            /* @__PURE__ */ h(
              "button",
              {
                className: "button primary support-main",
                onClick: openSupport,
              },
              /* @__PURE__ */ h(Heart, { size: 18 }),
              t("ساند دراستي", "Support my education"),
              ar
                ? /* @__PURE__ */ h(ArrowUpLeft, { size: 19 })
                : /* @__PURE__ */ h(ArrowUpRight, { size: 19 }),
            ),
            /* @__PURE__ */ h(
              "button",
              { className: "button outline", onClick: share },
              /* @__PURE__ */ h(Share2, { size: 16 }),
              t("شارك الحملة", "Share this campaign"),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "payment-label" },
              /* @__PURE__ */ h("span", null),
              t("خيارات الدعم", "Ways to support"),
              /* @__PURE__ */ h("span", null),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "method-icons" },
              /* @__PURE__ */ h(
                "span",
                null,
                /* @__PURE__ */ h(Wallet, { size: 16 }),
                t("دفع محلي", "Local payment"),
              ),
              /* @__PURE__ */ h(
                "span",
                null,
                /* @__PURE__ */ h("b", { className: "coin usdt" }, "₮"),
                "USDT",
              ),
              /* @__PURE__ */ h(
                "span",
                null,
                /* @__PURE__ */ h("b", { className: "coin btc" }, "₿"),
                "Bitcoin",
              ),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "payment-note" },
              /* @__PURE__ */ h(ShieldCheck, { size: 15 }),
              /* @__PURE__ */ h(
                "span",
                null,
                loaded && ready
                  ? t(
                      "يتم الدفع عبر صفحة Payunit المستضافة.",
                      "Checkout is hosted securely by Payunit.",
                    )
                  : t(
                      "استقبال الأموال غير مفعّل حاليًا.",
                      "Contributions are not enabled yet.",
                    ),
              ),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "help-card" },
            /* @__PURE__ */ h(
              "span",
              { className: "mini-icon" },
              /* @__PURE__ */ h(Heart, { size: 18 }),
            ),
            /* @__PURE__ */ h(
              "h3",
              null,
              t("مساهمتك إلها معنى", "Your kindness matters"),
            ),
            /* @__PURE__ */ h(
              "p",
              null,
              t(
                "فرصة لطالب يكمل تعليمه، ويحوّل ما تعلّمه إلى أثر في مجتمعه.",
                "A chance for a student to finish his education and turn learning into a contribution to his community.",
              ),
            ),
          ),
          /* @__PURE__ */ h(
            "div",
            { className: "faq" },
            /* @__PURE__ */ h(
              "h3",
              null,
              t("قبل ما تساهم", "Before you contribute"),
            ),
            [
              [
                t("كيف يصلني الدعم؟", "How does support reach you?"),
                t(
                  "سأوضح وسيلة الاستلام والرسوم المرتبطة بها قبل فتح الدفع. دفع Payunit يُراجع من السيرفر، والتحويلات الرقمية تُراجع بشكل منفصل.",
                  "I will explain how funds are received and any fees before opening payments. Payunit payments are verified server-side; crypto transfers are reviewed separately.",
                ),
              ],
              [
                t("هل أقدر أتابع الحملة؟", "Can I follow the campaign?"),
                t(
                  "نعم، عبر قسم التحديثات في هذه الصفحة.",
                  "Yes. Follow the Updates tab on this page.",
                ),
              ],
              [
                t("هل المشاركة بتساعد؟", "Does sharing help?"),
                t(
                  "أكيد. مشاركة قصتي بتساعدها توصل لأشخاص قادرين على المساندة.",
                  "Absolutely. Sharing my story helps it reach people who may be able to support it.",
                ),
              ],
            ].map(([q, a]) =>
              /* @__PURE__ */ h(
                "details",
                { key: q },
                /* @__PURE__ */ h(
                  "summary",
                  null,
                  q,
                  /* @__PURE__ */ h(ChevronDown, { size: 15 }),
                ),
                /* @__PURE__ */ h("p", null, a),
              ),
            ),
          ),
        ),
      ),
      /* @__PURE__ */ h(
        "section",
        { className: "contact", id: "contact" },
        /* @__PURE__ */ h(
          "div",
          null,
          /* @__PURE__ */ h(
            "span",
            { className: "section-kicker" },
            t("خلّينا على تواصل", "LET’S KEEP IN TOUCH"),
          ),
          /* @__PURE__ */ h(
            "h2",
            null,
            t("عندك سؤال عن الحملة؟", "A question about the campaign?"),
          ),
          /* @__PURE__ */ h(
            "p",
            null,
            t(
              "يسعدني أوضّح تفاصيل دراستي واحتياجاتي.",
              "I’m happy to explain my educational situation and needs.",
            ),
          ),
        ),
        config.contactEmail
          ? /* @__PURE__ */ h(
              "a",
              {
                className: "button outline",
                href: "mailto:" + config.contactEmail,
              },
              /* @__PURE__ */ h(Mail, { size: 18 }),
              t("راسلني", "Email me"),
            )
          : /* @__PURE__ */ h(
              "span",
              { className: "contact-soon" },
              t("وسيلة التواصل تُضاف قريبًا", "Contact details coming soon"),
            ),
      ),
    ),
    /* @__PURE__ */ h(
      "footer",
      { className: "wrap footer" },
      /* @__PURE__ */ h(
        "a",
        { href: "/", className: "footer-brand" },
        /* @__PURE__ */ h(GraduationCap, { size: 20 }),
        t("حملة فؤاد", "For Fouad"),
      ),
      /* @__PURE__ */ h(
        "span",
        null,
        t(
          "من غزة، نحو فرصة لإكمال التعليم.",
          "From Gaza, toward a chance to finish my education.",
        ),
      ),
      /* @__PURE__ */ h(
        "a",
        { href: "/admin" },
        t("إدارة الحملة", "Campaign admin"),
      ),
    ),
    /* @__PURE__ */ h(
      "div",
      { className: "mobile-support" },
      /* @__PURE__ */ h(
        "div",
        null,
        /* @__PURE__ */ h("b", null, money(total.amount)),
        /* @__PURE__ */ h(
          "small",
          null,
          t("لدعم رحلتي الدراسية", "for my education journey"),
        ),
      ),
      /* @__PURE__ */ h(
        "button",
        { className: "button primary", onClick: openSupport },
        /* @__PURE__ */ h(Heart, { size: 17 }),
        t("ساند دراستي", "Support Fouad"),
      ),
    ),
    /* @__PURE__ */ h(
      "dialog",
      {
        ref: dialog,
        onCancel: () => setModal(false),
        onClick: (e) => {
          if (e.target === dialog.current) setModal(false);
        },
        className: "support-dialog",
        "aria-labelledby": "donate-title",
      },
      /* @__PURE__ */ h(
        "div",
        { className: "modal-head" },
        /* @__PURE__ */ h(
          "span",
          { className: "mini-icon" },
          /* @__PURE__ */ h(Heart, { size: 23 }),
        ),
        /* @__PURE__ */ h(
          "button",
          {
            className: "icon-button",
            onClick: () => setModal(false),
            "aria-label": t("إغلاق", "Close"),
          },
          /* @__PURE__ */ h(X, { size: 20 }),
        ),
      ),
      /* @__PURE__ */ h(
        "h2",
        { id: "donate-title" },
        t(
          "خطوة صغيرة منك، فرق كبير إلي",
          "A small step for you. A big difference for me.",
        ),
      ),
      /* @__PURE__ */ h(
        "p",
        { className: "muted" },
        t(
          "اختر طريقة المساندة المناسبة إلك.",
          "Choose how you would like to support my education.",
        ),
      ),
      /* @__PURE__ */ h(
        "div",
        { className: "payment-tabs" },
        [
          ["gateway", t("Payunit", "Payunit")],
          ["usdt", "USDT"],
          ["btc", "Bitcoin"],
        ].map(([id, label]) =>
          /* @__PURE__ */ h(
            "button",
            {
              key: id,
              onClick: () => {
                setMethod(id);
                setError("");
              },
              className: method === id ? "selected" : "",
            },
            label,
          ),
        ),
      ),
      method === "gateway"
        ? /* @__PURE__ */ h(
            Fragment,
            null,
            mode === "test" &&
              ready &&
              /* @__PURE__ */ h(
                "div",
                { className: "notice" },
                t(
                  "وضع اختبار — لا يُحتسب ضمن الحملة.",
                  "Test mode — excluded from campaign totals.",
                ),
              ),
            /* @__PURE__ */ h(
              "label",
              { className: "field-label", htmlFor: "amount" },
              t("مبلغ المساهمة بالدولار", "Contribution in USD"),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "amounts" },
              ["10", "25", "50", "100"].map((n) =>
                /* @__PURE__ */ h(
                  "button",
                  {
                    key: n,
                    onClick: () => setAmount(n),
                    className: amount === n ? "selected" : "",
                  },
                  "$",
                  n,
                ),
              ),
            ),
            /* @__PURE__ */ h(
              "div",
              { className: "amount-input" },
              /* @__PURE__ */ h("span", null, "USD"),
              /* @__PURE__ */ h("input", {
                id: "amount",
                type: "number",
                min: "1",
                max: "5000",
                step: "0.01",
                value: amount,
                onChange: (e) => setAmount(e.target.value),
                inputMode: "decimal",
              }),
            ),
            ready
              ? /* @__PURE__ */ h(
                  Fragment,
                  null,
                  /* @__PURE__ */ h(
                    "label",
                    { className: "checkbox" },
                    /* @__PURE__ */ h("input", {
                      type: "checkbox",
                      checked: consent,
                      onChange: (e) => setConsent(e.target.checked),
                    }),
                    /* @__PURE__ */ h(
                      "span",
                      null,
                      t(
                        "راجعت المبلغ بالدولار، وأفهم أن الدفع يتم لدى Payunit.",
                        "I have reviewed the USD amount and understand that checkout takes place on Payunit.",
                      ),
                    ),
                  ),
                  /* @__PURE__ */ h(
                    "button",
                    {
                      className: "button primary",
                      disabled: busy || !loaded,
                      onClick: checkout,
                    },
                    busy
                      ? t("جاري تجهيز الدفع…", "Preparing checkout…")
                      : t("المتابعة إلى Payunit", "Continue to Payunit"),
                    /* @__PURE__ */ h(ArrowUpLeft, { size: 18 }),
                  ),
                )
              : /* @__PURE__ */ h(
                  "div",
                  { className: "notice" },
                  t(
                    "الدفع لم يُفعّل بعد. تقدر تدعمني بمشاركة الحملة حاليًا.",
                    "Payments are not enabled yet. You can support me by sharing the campaign for now.",
                  ),
                ),
          )
        : wallet && config.acceptingDonations
          ? /* @__PURE__ */ h(
              Fragment,
              null,
              /* @__PURE__ */ h(
                "div",
                { className: "notice" },
                t(
                  "استخدم الشبكة المحددة فقط. التحويلات تُراجع يدويًا ولا تُضاف تلقائيًا إلى إجمالي Payunit.",
                  "Use only the specified network. Transfers are reviewed manually and are not automatically added to the Payunit total.",
                ),
              ),
              /* @__PURE__ */ h(
                "p",
                null,
                /* @__PURE__ */ h(
                  "strong",
                  null,
                  t("الشبكة: ", "Network: "),
                  method === "btc" ? "Bitcoin" : config.usdtNetwork,
                ),
              ),
              qr &&
                /* @__PURE__ */ h("img", {
                  src: qr,
                  alt: t("رمز عنوان الاستقبال", "Receiving address QR code"),
                  width: 180,
                  height: 180,
                  style: { margin: "15px auto" },
                }),
              /* @__PURE__ */ h(
                "code",
                { className: "wallet-address" },
                wallet,
              ),
              /* @__PURE__ */ h(
                "button",
                {
                  className: "button outline",
                  onClick: async () => {
                    try {
                      await navigator.clipboard.writeText(wallet);
                      notify(t("تم نسخ العنوان", "Address copied"));
                    } catch {
                      setError(
                        t(
                          "تعذّر النسخ، انسخ العنوان يدويًا.",
                          "Unable to copy. Please copy the address manually.",
                        ),
                      );
                    }
                  },
                },
                /* @__PURE__ */ h(Copy, { size: 16 }),
                t("نسخ العنوان", "Copy address"),
              ),
            )
          : /* @__PURE__ */ h(
              "div",
              { className: "notice" },
              t(
                "هذا الخيار غير مفعّل بعد. سيظهر العنوان والشبكة هنا بعد تجهيزهما.",
                "This option is not enabled yet. The address and network will appear here once configured.",
              ),
            ),
      error &&
        /* @__PURE__ */ h("p", { role: "alert", className: "error" }, error),
      /* @__PURE__ */ h(
        "button",
        { className: "text-button share-instead", onClick: share },
        /* @__PURE__ */ h(Share2, { size: 16 }),
        t("أو ساعدني بمشاركة الحملة", "Or help by sharing my campaign"),
      ),
    ),
    toast &&
      /* @__PURE__ */ h(
        "div",
        { className: "toast", role: "status" },
        /* @__PURE__ */ h(Check, { size: 17 }),
        toast,
      ),
  );
}

const storedLang = localStorage.getItem("campaign-lang");
let savedAttempt = null;
try {
  savedAttempt = JSON.parse(
    sessionStorage.getItem("campaign-attempt") || "null",
  );
} catch {}
const view = mount(
  document.getElementById("app"),
  {
    lang: storedLang === "en" ? "en" : "ar",
    config: defaults,
    updates: [],
    total: { amount: 0, count: 0 },
    tab: "story",
    ready: false,
    mode: "test",
    loaded: false,
    loadError: false,
    amount: "25",
    method: "gateway",
    modal: false,
    busy: false,
    error: "",
    toast: "",
    consent: false,
    qr: "",
  },
  Campaign,
  afterRender,
);
view.refs = {
  dialog: { current: null },
  lastFocus: { current: null },
  requestRef: { current: savedAttempt },
};
const setLang = (value) => view.set("lang", value);
const setConfig = (value) => view.set("config", value);
const setUpdates = (value) => view.set("updates", value);
const setTotal = (value) => view.set("total", value);
const setTab = (value) => view.set("tab", value);
const setReady = (value) => view.set("ready", value);
const setMode = (value) => view.set("mode", value);
const setLoaded = (value) => view.set("loaded", value);
const setLoadError = (value) => view.set("loadError", value);
const setAmount = (value) => view.set("amount", value);
const setMethod = (value) => view.set("method", value);
const setModal = (value) => view.set("modal", value);
const setBusy = (value) => view.set("busy", value);
const setError = (value) => view.set("error", value);
const setToast = (value) => view.set("toast", value);
const setConsent = (value) => view.set("consent", value);
const setQr = (value) => view.set("qr", value);
let wasModal = false,
  qrKey = "";
function afterRender() {
  const s = view.state;
  document.documentElement.lang = s.lang;
  document.documentElement.dir = s.lang === "ar" ? "rtl" : "ltr";
  localStorage.setItem("campaign-lang", s.lang);
  document.body.style.overflow = s.modal ? "hidden" : "";
  if (s.modal) {
    const dialog = view.refs.dialog.current;
    if (dialog && !dialog.open) dialog.showModal();
    if (!wasModal) {
      view.refs.lastFocus.current = view.lastActiveElement;
      dialog?.querySelector("button")?.focus();
    }
  } else if (wasModal) {
    view.refs.lastFocus.current?.focus();
  }
  wasModal = s.modal;
  const wallet =
    s.method === "btc" ? s.config.btcAddress : s.config.usdtAddress;
  const key =
    s.modal && s.method !== "gateway" && s.config.acceptingDonations && wallet
      ? s.method + ":" + wallet
      : "";
  if (key !== qrKey) {
    qrKey = key;
    if (s.qr) setQr("");
    if (key)
      import("./qr.js")
        .then((q) =>
          q.toDataURL(s.method === "btc" ? "bitcoin:" + wallet : wallet, {
            width: 200,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
        )
        .then((url) => {
          if (qrKey === key) setQr(url);
        })
        .catch(() => {});
  }
}
view.render();
