// Pure helpers shared by the editor, its preview, and Node's built-in tests.
import { defaults } from './config.js';
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
export const hasChanges = (current, saved) => Boolean(current && saved && JSON.stringify(stable(current)) !== JSON.stringify(stable(saved)));
export const hasPostDraft = post => Object.values(post || {}).some(value => typeof value === 'string' && value.trim());
export function budgetSummary(config) {
  const rows = Array.isArray(config?.budgets) ? config.budgets : [];
  const valid = rows.every(row => Number.isSafeInteger(row.amountCents) && row.amountCents >= 0);
  const total = rows.reduce((sum, row) => sum + (Number.isSafeInteger(row.amountCents) && row.amountCents >= 0 ? row.amountCents : 0), 0);
  const goal = Number.isSafeInteger(config?.goalCents) && config.goalCents >= 0 ? config.goalCents : 0;
  return { total, goal, difference: goal - total, matches: valid && rows.length > 0 && total > 0 && total === goal, hasRows: rows.length > 0 };
}
export function readinessItems(config, paymentSetup = {}) {
  const c = config || {}, text = value => typeof value === 'string' && value.trim().length > 0;
  const budget = budgetSummary(c);
  return [
    { id: 'story', title: 'القصة بالعربي والإنجليزي', ready: ['titleAr','titleEn','introAr','introEn','storyAr','storyEn'].every(key => text(c[key])), tab: 'content' },
    { id: 'photo', title: 'صورة شخصية للحملة', ready: c.imageIsPersonal === true && text(c.image) && c.image !== '/images/study.jpg', tab: 'content' },
    { id: 'budget', title: 'هدف مالي مطابق للميزانية', ready: budget.matches, tab: 'support' },
    { id: 'documents', title: 'مستند دراسي منشور', ready: Array.isArray(c.documents) && c.documents.some(row => text(row.titleAr) && text(row.titleEn) && text(row.url)), tab: 'files' },
    { id: 'contact', title: 'بريد للتواصل', ready: typeof c.contactEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail), tab: 'content' },
    { id: 'payment', title: 'إعداد وسيلة دعم', ready: Boolean(paymentSetup.configured || text(c.btcAddress) || text(c.usdtAddress)), tab: 'support' },
  ];
}
const safeUrl = (value, local = false) => {
  if (typeof value !== 'string') return '';
  if (local && /^\/(?:images\/[a-zA-Z0-9._-]+|media\/[a-f0-9-]+)$/.test(value)) return value;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
};
export function previewConfig(input) {
  const config = { ...defaults };
  for (const key of ['titleAr','titleEn','introAr','introEn','storyAr','storyEn']) if (typeof input?.[key] === 'string') config[key] = input[key].slice(0,15000);
  config.image = safeUrl(input?.image, true) || defaults.image;
  config.imageIsPersonal = input?.imageIsPersonal === true;
  for (const key of ['goalCents', 'remainingHours']) if (Number.isSafeInteger(input?.[key]) && input[key] >= 0) config[key] = input[key];
  config.contactEmail = typeof input?.contactEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail) ? input.contactEmail : '';
  for (const key of ['documents', 'projects']) config[key] = (Array.isArray(input?.[key]) ? input[key] : []).slice(0,20).map(row => ({ titleAr: String(row.titleAr || '').slice(0,250), titleEn: String(row.titleEn || '').slice(0,250), url: safeUrl(row.url, key === 'documents') || '#' }));
  config.budgets = (Array.isArray(input?.budgets) ? input.budgets : []).slice(0,12).map(row => ({ titleAr: String(row.titleAr || '').slice(0,200), titleEn: String(row.titleEn || '').slice(0,200), amountCents: Number.isSafeInteger(row.amountCents) && row.amountCents >= 0 ? row.amountCents : 0 }));
  // The preview is intentionally never a payment surface.
  config.acceptingDonations = input?.acceptingDonations === true;
  return config;
}
