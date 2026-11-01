import { h, icon } from './dom.js';
import { budgetSummary, readinessItems } from './admin-tools.js';
const Check = icon('Check'), Clock = icon('Clock'), X = icon('X');
const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents/100);
export function readinessCard(config, paymentSetup, onNavigate) {
  const items = readinessItems(config, paymentSetup), completed = items.filter(item => item.ready).length;
  return h('section', {className:'admin-card readiness-card', 'aria-labelledby':'readiness-title'},
    h('div', {className:'readiness-heading'}, h('div',null,h('h2',{id:'readiness-title'},'تجهيز الحملة للإطلاق'),h('p',{className:'muted'},'تابع تجهيز المحتوى والإعدادات. هذا ملخص لتعديلاتك الحالية، وليس توثيقًا أو ضمانًا للدفع.')), h('strong',null,`${completed} / ${items.length}`)),
    h('div',{className:'progress',role:'progressbar','aria-label':'جاهزية إعداد الحملة','aria-valuenow':completed,'aria-valuemin':0,'aria-valuemax':items.length},h('span',{style:{width:Math.round(completed/items.length*100)+'%'}})),
    h('div',{className:'readiness-items'},items.map(item=>h('button',{type:'button',className:'readiness-item '+(item.ready?'complete':''),onClick:()=>onNavigate(item.tab)},h(item.ready?Check:Clock,{size:17}),h('span',null,item.title),h('small',null,item.ready?'مُضاف':'تجهيز')))));
}
export function budgetCard(config) {
 const summary=budgetSummary(config);
 return h('div',{className:'budget-summary','aria-label':'ملخص الميزانية'},
  h('div',null,h('small',null,'مجموع البنود'),h('strong',{dir:'ltr'},money(summary.total))),
  h('div',null,h('small',null,'هدف الحملة'),h('strong',{dir:'ltr'},money(summary.goal))),
  h('div',null,h('small',null,'الفرق بين الهدف والبنود'),h('strong',{dir:'ltr'},money(summary.difference))),
  h('p',{className:summary.matches?'budget-match':'muted',role:'status'},summary.matches?'✓ مجموع البنود يطابق هدف الحملة.':summary.hasRows?'راجع الفرق، أو استخدم زر اعتماد مجموع البنود كهدف الحملة.':'أضف بنود الرسوم لتظهر الميزانية المفصلة.'));
}
export function previewDialog(ref, onClose, onLoad) {
 return h('dialog',{ref,className:'support-dialog admin-preview','aria-labelledby':'preview-title',onCancel:onClose,onClick:event=>{if(event.target===ref.current)onClose()}},
  h('div',{className:'modal-head'},h('div',null,h('h2',{id:'preview-title'},'معاينة التعديلات قبل الحفظ'),h('p',{className:'muted'},'تظهر هنا التعديلات الحالية فقط. لن تُحفظ أو تُنشر، وطرق الدفع متوقفة في المعاينة.')),h('button',{type:'button',className:'icon-button','aria-label':'إغلاق المعاينة',onClick:onClose},h(X,{size:18}))),
  h('iframe',{title:'معاينة الحملة غير المنشورة',src:'/?preview=1',onLoad}));
}
