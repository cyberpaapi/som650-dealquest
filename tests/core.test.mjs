import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyState,validateBank,validateQuestion,makeSession,validSession,reconcileSession,recordAnswer,summarize,failureExport,importData,loadState,STORAGE_KEY} from '../core.js';
const bank=JSON.parse(readFileSync(new URL('../questions.json',import.meta.url),'utf8'));
test('250 unique, source-backed questions with complete teaching fields',()=>{
 assert.equal(bank.length,250);validateBank(bank);assert.equal(new Set(bank.map(q=>q.question.trim().toLowerCase())).size,250);
 for(const q of bank){assert.ok(q.hint.length>=20,q.id);assert.ok(q.theory.length>=60,q.id);assert.ok(q.explanation.length>=45,q.id);}
 assert.equal(new Set(bank.map(q=>q.topic)).size,14);
});
test('wrong answer enters Comeback, export includes context; correct retry removes it',()=>{
 const s=emptyState(),q=bank[0];s.session=makeSession([q],'Test');let item=s.session.items[0];item.selected=(q.answer+1)%4;
 assert.equal(recordAnswer(s,q,item).correct,false);assert.equal(s.stats[q.id].needsReview,true);
 const out=failureExport(s,bank);assert.equal(out.questions.length,1);assert.equal(out.questions[0].performance.wrong,1);assert.equal(out.questions[0].lastSelectedAnswer,q.options[item.selected]);assert.deepEqual(out.questions[0].source,q.source);
 s.session=makeSession([q],'Comeback');item=s.session.items[0];item.selected=q.answer;assert.equal(recordAnswer(s,q,item).xp,8);
 assert.equal(s.stats[q.id].needsReview,false);assert.equal(failureExport(s,bank).questions.length,0);assert.equal(s.stats[q.id].wrong,1);assert.equal(s.stats[q.id].history.length,2);
});
test('double submissions and repeated correct answers cannot farm XP',()=>{
 const s=emptyState(),q=bank[1];s.session=makeSession([q],'Test');const item=s.session.items[0];item.selected=q.answer;
 assert.equal(recordAnswer(s,q,item).xp,10);assert.equal(recordAnswer(s,q,item),null);assert.equal(s.stats[q.id].attempts,1);
 s.session=makeSession([q],'Test');s.session.items[0].selected=q.answer;assert.equal(recordAnswer(s,q,s.session.items[0]).xp,0);assert.equal(summarize(s,bank).xp,10);
});
test('help affects reward, and stronger retry awards only remaining XP',()=>{
 const s=emptyState(),q=bank[2];s.session=makeSession([q],'Test');let item=s.session.items[0];item.selected=q.answer;item.theory=true;assert.equal(recordAnswer(s,q,item).xp,6);
 s.session=makeSession([q],'Test');item=s.session.items[0];item.selected=q.answer;assert.equal(recordAnswer(s,q,item).xp,4);assert.equal(summarize(s,bank).xp,10);
});
test('shuffled answer order preserves original grading and all IDs in full journey',()=>{
 const s=emptyState();s.session=makeSession(bank,'Full journey');assert.equal(s.session.items.length,250);assert.ok(validSession(s.session,bank));
 for(const item of s.session.items){assert.deepEqual([...item.order].sort(),[0,1,2,3]);const q=bank.find(q=>q.id===item.id);item.selected=q.answer;recordAnswer(s,q,item);}assert.equal(summarize(s,bank).correct,250);
});
test('state survives a JSON storage round trip, including active round and answer order',()=>{
 const s=emptyState(),q=bank[4];s.session=makeSession([q],'Round');s.session.items[0].selected=q.answer;recordAnswer(s,q,s.session.items[0]);
 const storage={getItem:key=>key===STORAGE_KEY?JSON.stringify(s):null};const loaded=loadState(storage);assert.equal(loaded.warning,'');assert.deepEqual(loaded.state.session,s.session);assert.equal(loaded.state.stats[q.id].correct,1);assert.ok(validSession(loaded.state.session,bank));
});
test('export import restores retry queue without inflating recorded attempts',()=>{
 const s=emptyState(),q=bank[6];s.session=makeSession([q],'Test');s.session.items[0].selected=(q.answer+1)%4;recordAnswer(s,q,s.session.items[0]);
 const destination=emptyState(),out=failureExport(s,bank);importData(out,destination,bank);assert.equal(destination.stats[q.id].needsReview,true);assert.equal(destination.stats[q.id].attempts,0);assert.equal(destination.custom.length,0);
 importData(out,destination,bank);assert.equal(destination.custom.length,0);assert.equal(summarize(destination,bank).missed,1);
});
test('new revision questions import with complete study fields and can be retried',()=>{
 const s=emptyState(),q={...bank[0],id:'R001',question:'Revised scenario: '+bank[0].question};const result=importData({schema:'dealquest.question-pack.v1',questions:[q]},s,bank);assert.equal(result.added,1);assert.equal(s.custom.length,1);assert.equal(s.stats.R001.needsReview,true);validateQuestion(s.custom[0]);
});
test('invalid import is atomic: collisions, duplicate IDs, unsafe keys and bad answers rejected',()=>{
 const s=emptyState(),q=bank[0],initial=JSON.stringify(s);
 for(const rows of [[{...q,id:'R002'},{...q,question:'Changed'}],[q,q],[{...q,id:'constructor'}],[{...q,answer:7}],[{...q,source:{part:1,pages:[200]}}]]){
 assert.throws(()=>importData({schema:'dealquest.question-pack.v1',questions:rows},s,bank));assert.equal(JSON.stringify(s),initial);
 }
});
test('broken browser storage and stale sessions fail safely',()=>{
 assert.ok(loadState({getItem:()=>'{invalid'}).warning);assert.ok(loadState({getItem:()=>{throw Error('blocked');}}).warning);
 assert.equal(validSession({items:[{id:'NOT-IN-BANK',order:[0,1,2,3]}],index:0},bank),false);
});
test('reducing the bank preserves paused answer order, retained progress and old export compatibility',()=>{
 const retired={...bank[0],id:'Retired001'};
 const oldBank=[bank[0],retired,bank[1]];
 const s=emptyState();s.session=makeSession(oldBank,'Complete journey');s.session.items[0].selected=bank[0].answer;recordAnswer(s,bank[0],s.session.items[0]);
 s.session.index=1;s.session.items[1].selected=(retired.answer+1)%4;recordAnswer(s,retired,s.session.items[1]);
 const before=JSON.stringify(s.stats),oldSession=JSON.stringify(s.session),out=failureExport(s,oldBank);
 const result=reconcileSession(s.session,bank);
 assert.equal(result.items.length,2);assert.equal(result.index,1);assert.equal(result.items[1].id,bank[1].id);assert.deepEqual(result.items[0],s.session.items[0]);
 assert.equal(JSON.stringify(s.session),oldSession);assert.equal(JSON.stringify(s.stats),before);
 assert.equal(reconcileSession(makeSession([retired],'Old round'),bank),null);
 importData(out,s,bank);assert.equal(s.custom[0].id,retired.id);assert.equal(s.stats[retired.id].wrong,1);
});
