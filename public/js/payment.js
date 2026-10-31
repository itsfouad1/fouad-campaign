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
function Payment() {
  const { data, error, busy, lang, reference } = view.state;
  const ar = lang === "ar",
    t = (a, b) => (ar ? a : b);
  async function refresh(id) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/donations/" + encodeURIComponent(id) + "?refresh=1",
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      if (d.status === "paid") {
        sessionStorage.removeItem("campaign-attempt");
        sessionStorage.removeItem("campaign-payment");
      }
      return d.status;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const paid = data?.status === "paid";
  const terminal = [
    "refunded",
    "partially_refunded",
    "expired",
    "cancelled",
  ].includes(data?.status);
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
      t("حملة فؤاد", "For Fouad"),
    ),
    /* @__PURE__ */ h(
      "section",
      { className: "admin-card login-box", style: { textAlign: "center" } },
      paid
        ? /* @__PURE__ */ h(CheckCircle2, {
            size: 48,
            color: "var(--green)",
            style: { margin: "auto" },
          })
        : terminal
          ? /* @__PURE__ */ h(AlertCircle, {
              size: 48,
              style: { margin: "auto", color: "#997140" },
            })
          : /* @__PURE__ */ h(Clock, {
              size: 48,
              style: { margin: "auto", color: "var(--green)" },
            }),
      /* @__PURE__ */ h(
        "h1",
        { style: { fontSize: 25, marginTop: 20 } },
        paid
          ? t("شكرًا لمساندتك 🤍", "Thank you for your support 🤍")
          : terminal
            ? t("حالة الدفع تحتاج انتباهك", "Please check your payment status")
            : t("نتحقق من حالة مساهمتك", "Checking your contribution"),
      ),
      /* @__PURE__ */ h(
        "p",
        { className: "muted" },
        paid
          ? t(
              "تم تأكيد الدفع من Payunit. مساهمتك تعني الكثير.",
              "Your payment has been confirmed by Payunit. Your support means so much.",
            )
          : t(
              "الرجوع من البوابة وحده لا يؤكد الدفع. نتحقق من الفاتورة مباشرة قبل عرض النجاح.",
              "Returning from checkout does not confirm payment. We verify the invoice directly before showing success.",
            ),
      ),
      data &&
        /* @__PURE__ */ h(
          "div",
          { className: "notice" },
          /* @__PURE__ */ h(
            "strong",
            null,
            t("الحالة: ", "Status: "),
            data.status,
          ),
          /* @__PURE__ */ h("br", null),
          t("المبلغ: ", "Amount: "),
          "$",
          (data.amount / 100).toFixed(2),
          " USD",
          data.mode === "test" &&
            /* @__PURE__ */ h(
              "p",
              null,
              t(
                "هذه عملية اختبار، ولا تدخل إجمالي الحملة.",
                "This is a test transaction, excluded from campaign totals.",
              ),
            ),
        ),
      error &&
        /* @__PURE__ */ h("p", { className: "error", role: "alert" }, error),
      reference &&
        /* @__PURE__ */ h(
          "button",
          {
            className: "button outline",
            style: { width: "100%" },
            disabled: busy,
            onClick: () => refresh(reference),
          },
          /* @__PURE__ */ h(RefreshCw, { size: 17 }),
          busy
            ? t("جاري التحقق…", "Checking…")
            : t("تحديث حالة الدفع", "Refresh payment status"),
        ),
      /* @__PURE__ */ h(
        "a",
        { href: "/", className: "share-instead" },
        /* @__PURE__ */ h(ArrowRight, { size: 16 }),
        t("العودة إلى الحملة", "Back to the campaign"),
      ),
    ),
  );
}

const lang = localStorage.getItem("campaign-lang") === "en" ? "en" : "ar";
const view = mount(
  document.getElementById("app"),
  {
    data: null,
    error: "",
    busy: true,
    lang,
    reference: new URLSearchParams(location.search).get("id") || "",
  },
  Payment,
  () => {
    document.documentElement.lang = view.state.lang;
    document.documentElement.dir = view.state.lang === "ar" ? "rtl" : "ltr";
  },
);
const setData = (value) => view.set("data", value);
const setError = (value) => view.set("error", value);
const setBusy = (value) => view.set("busy", value);
const setLang = (value) => view.set("lang", value);
const setReference = (value) => view.set("reference", value);
let count = 0,
  stopped = false;
async function poll() {
  let status;
  setBusy(true);
  try {
    const r = await fetch(
      "/api/donations/" +
        encodeURIComponent(view.state.reference) +
        "?refresh=1",
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    status = d.status;
    if (status === "paid") {
      sessionStorage.removeItem("campaign-attempt");
      sessionStorage.removeItem("campaign-payment");
    }
  } catch (e) {
    setError(e.message);
  } finally {
    setBusy(false);
  }
  if (
    !stopped &&
    ++count < 12 &&
    ![
      "paid",
      "refunded",
      "partially_refunded",
      "cancelled",
      "expired",
    ].includes(status || "")
  )
    setTimeout(poll, 5000);
}
view.render();
if (/^[a-f0-9-]{36}$/.test(view.state.reference)) poll();
else {
  setBusy(false);
  setError(lang === "ar" ? "رابط الدفع غير صالح." : "Invalid payment link.");
}
window.addEventListener("pagehide", () => {
  stopped = true;
});
