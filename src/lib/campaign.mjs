export const defaults = {
  titleAr: "ساعد فؤاد على إكمال دراسته الجامعية",
  titleEn: "Help Fouad finish his university education",
  introAr:
    "أنا فؤاد، طالب هندسة أنظمة حاسوب ومبرمج من غزة. بدعمك، بقدر أرجع أكمل دراستي وأقرّب خطوة من التخرّج.",
  introEn:
    "I’m Fouad, a computer systems engineering student and programmer from Gaza. Your support can help me return to university and move closer to graduation.",
  storyAr:
    "اضطررت لتأجيل فصل دراسي لأنّي لم أستطع توفير الرسوم. تبقّى لي 48 ساعة دراسية، وما زلت أحاول إكمال الطريق الذي بدأتُه.\n\nأواصل التعلّم والعمل على مشاريع برمجية، وأطمح لاستخدام مهاراتي لبناء مستقبل أفضل والمساهمة في مجتمعي. أنشأت هذه الصفحة لأشارك قصتي واحتياجاتي الدراسية بوضوح.\n\nسأشارك تفاصيل الرسوم والتحديثات المتعلقة باستخدام الدعم هنا. وإذا لم تستطع المساهمة، فمشاركة الحملة تساعدني أيضًا. شكرًا لكل من يساندني.",
  storyEn:
    "I had to postpone a semester because I could not afford the tuition. I have 48 credit hours remaining, and I’m still working toward finishing what I started.\n\nI continue to learn and build software projects. I hope to use my skills to build a better future and contribute to my community. I created this page to share my story and educational needs clearly.\n\nI will share tuition details and updates about how support is used here. If you cannot contribute, sharing this campaign helps too. Thank you for standing with me.",
  goalCents: 0,
  remainingHours: 48,
  acceptingDonations: false,
  image: "/images/study.jpg",
  imageIsPersonal: false,
  contactEmail: "",
  documents: [],
  projects: [],
  budgets: [],
  btcAddress: "",
  usdtAddress: "",
  usdtNetwork: "TRC20",
};
export function cents(value) {
  const s = String(value);
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(s))
    throw new Error("Enter a valid amount with at most two decimals.");
  const [a, b = ""] = s.split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (n < 100 || n > 500000)
    throw new Error("Amount must be between $1 and $5,000.");
  return n;
}
export function httpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function safeAsset(v) {
  return (
    typeof v === "string" &&
    (/^\/(?:media\/[a-f0-9-]+|images\/[a-zA-Z0-9._-]+)$/.test(v) || httpsUrl(v))
  );
}
export function validateConfig(b) {
  const out = { ...defaults };
  for (const k of [
    "titleAr",
    "titleEn",
    "introAr",
    "introEn",
    "storyAr",
    "storyEn",
  ]) {
    if (
      typeof b[k] !== "string" ||
      !b[k].trim() ||
      b[k].length > (k.startsWith("story") ? 15000 : 800)
    )
      throw new Error("Invalid text: " + k);
    out[k] = b[k].trim();
  }
  if (
    !Number.isInteger(b.goalCents) ||
    b.goalCents < 0 ||
    b.goalCents > 100000000
  )
    throw new Error("Invalid goal");
  out.goalCents = b.goalCents;
  if (
    !Number.isInteger(b.remainingHours) ||
    b.remainingHours < 0 ||
    b.remainingHours > 300
  )
    throw new Error("Invalid credit hours");
  out.remainingHours = b.remainingHours;
  out.acceptingDonations = b.acceptingDonations === true;
  out.imageIsPersonal = b.imageIsPersonal === true;
  if (!safeAsset(b.image)) throw new Error("Invalid image URL");
  out.image = b.image;
  if (b.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contactEmail))
    throw new Error("Invalid email");
  out.contactEmail = String(b.contactEmail || "").slice(0, 200);
  for (const k of ["documents", "projects"]) {
    if (!Array.isArray(b[k]) || b[k].length > 20)
      throw new Error("Invalid list");
    out[k] = b[k].map((x) => {
      if (
        !x.titleAr ||
        !x.titleEn ||
        String(x.titleAr).length > 250 ||
        String(x.titleEn).length > 250 ||
        !(k === "documents" ? safeAsset(x.url) : httpsUrl(x.url))
      )
        throw new Error("Invalid link");
      return {
        titleAr: String(x.titleAr),
        titleEn: String(x.titleEn),
        url: x.url,
      };
    });
  }
  if (!Array.isArray(b.budgets) || b.budgets.length > 12)
    throw new Error("Invalid budget");
  out.budgets = b.budgets.map((x) => {
    if (
      !x.titleAr ||
      !x.titleEn ||
      String(x.titleAr).length > 200 ||
      String(x.titleEn).length > 200 ||
      !Number.isInteger(x.amountCents) ||
      x.amountCents < 0 ||
      x.amountCents > 100000000
    )
      throw new Error("Invalid budget");
    return {
      titleAr: x.titleAr,
      titleEn: x.titleEn,
      amountCents: x.amountCents,
    };
  });
  out.btcAddress = String(b.btcAddress || "").trim();
  out.usdtAddress = String(b.usdtAddress || "").trim();
  out.usdtNetwork = b.usdtNetwork;
  if (
    out.btcAddress &&
    !/^(bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(
      out.btcAddress,
    )
  )
    throw new Error("Invalid Bitcoin address");
  if (!["TRC20", "ERC20"].includes(out.usdtNetwork))
    throw new Error("Select TRC20 or ERC20");
  if (
    out.usdtAddress &&
    !(
      out.usdtNetwork === "TRC20"
        ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/
        : /^0x[a-fA-F0-9]{40}$/
    ).test(out.usdtAddress)
  )
    throw new Error("USDT address does not match network");
  if (out.acceptingDonations && out.goalCents <= 0)
    throw new Error("Set a documented goal before opening donations");
  return out;
}
