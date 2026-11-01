import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../public/js/config.js';
import {budgetSummary,hasChanges,hasPostDraft,readinessItems,previewConfig} from '../public/js/admin-tools.js';
test('editing, restoring and saving config are distinguished without depending on object key order',()=>{
 const original=structuredClone(defaults),edited={...original,titleAr:'مسودة جديدة'};
 assert.equal(hasChanges(edited,original),true);
 assert.equal(hasChanges(structuredClone(original),original),false);
 assert.equal(hasChanges(Object.fromEntries(Object.entries(original).reverse()),original),false);
 assert.equal(hasChanges(edited,null),false);
 assert.equal(hasPostDraft({titleAr:' ',bodyEn:''}),false);
 assert.equal(hasPostDraft({titleAr:'تحديث لم ينشر',bodyEn:''}),true);
 // Saving an older submitted snapshot must leave subsequent edits dirty.
 assert.equal(hasChanges({...edited,titleEn:'A later edit'},edited),true);
});
test('budget comparison uses cents and reports both positive and negative differences',()=>{
 const config={goalCents:9000,budgets:[{amountCents:1234},{amountCents:7766}]};
 assert.deepEqual(budgetSummary(config),{total:9000,goal:9000,difference:0,matches:true,hasRows:true});
 assert.equal(budgetSummary({...config,goalCents:10000}).difference,1000);
 assert.equal(budgetSummary({...config,goalCents:8000}).difference,-1000);
 assert.equal(budgetSummary({...config,budgets:[]}).matches,false);
 assert.equal(budgetSummary({...config,budgets:[{amountCents:1.2}]}).matches,false);
});
test('preparation reflects documented content and configured payment methods without treating placeholders as complete',()=>{
 const initial=readinessItems(defaults);assert.equal(initial.filter(x=>x.ready).length,1);
 const config={...defaults,image:'/media/'+crypto.randomUUID(),imageIsPersonal:true,goalCents:9000,budgets:[{titleAr:'رسوم',titleEn:'Tuition',amountCents:9000}],documents:[{titleAr:'دراسة',titleEn:'Study',url:'https://example.com/document.pdf'}],contactEmail:'student@example.com'};
 assert.equal(readinessItems(config,{configured:true}).every(x=>x.ready),true);
 assert.equal(readinessItems({...config,image:'/images/study.jpg'}).find(x=>x.id==='photo').ready,false);
 assert.equal(readinessItems({...config,goalCents:9500},{configured:true}).find(x=>x.id==='budget').ready,false);
});
test('unpublished previews sanitize links and exclude wallets and unexpected fields',()=>{
 const config=previewConfig({...defaults,image:'javascript:alert(1)',projects:[{titleAr:'عنوان',titleEn:'Title',url:'javascript:alert(1)'}],documents:[{titleAr:'ملف',titleEn:'File',url:'//evil.test/file'}],contactEmail:'x@example.com\r\nBcc:y@example.com',PAYUNIT_API_KEY:'must-not-pass',btcAddress:'not-a-wallet'});
 assert.equal(config.image,defaults.image);assert.equal(config.projects[0].url,'#');assert.equal(config.documents[0].url,'#');assert.equal(config.contactEmail,'');assert.equal(config.btcAddress,'');assert.equal(config.PAYUNIT_API_KEY,undefined);
 assert.equal(previewConfig({...defaults,image:'https://example.com/image.jpg'}).image,'https://example.com/image.jpg');
 assert.equal(previewConfig({...defaults,projects:[{titleAr:'Project',titleEn:'Project',url:'https://user:password@example.com'}]}).projects[0].url,'#');
});
