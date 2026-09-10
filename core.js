export const VERSION = 'som650-500-v1';
export const STORAGE_KEY = 'dealquest.progress.v1';
export const emptyState = () => ({version:1, stats:{}, daily:{}, session:null, custom:[], lastResult:null});
export const shuffle = array => { const a=[...array]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
export const blankStat = () => ({attempts:0,correct:0,wrong:0,latestCorrect:false,needsReview:false,bookmarked:false,bestXp:0,history:[]});
export const localDay = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export function validateQuestion(q) {
  if(!q || typeof q!=='object' || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(q.id||'') || ['constructor','prototype','__proto__'].includes(q.id)) throw Error('Every question needs a valid, unique ID.');
  for(const k of ['question','hint','theory','explanation','topic']) if(typeof q[k]!=='string'||!q[k].trim()||q[k].length>12000) throw Error(`Question ${q.id}: missing or invalid ${k}.`);
  if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim()||x.length>3000)||new Set(q.options).size!==4) throw Error(`Question ${q.id} needs four different answer choices.`);
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3) throw Error(`Question ${q.id} has an invalid answer index.`);
  if(!['Concept','Scenario','Calculation','Case study'].includes(q.type)||!['Starter','Builder','Challenge'].includes(q.difficulty)) throw Error(`Question ${q.id} has an invalid type or difficulty.`);
  if(!q.source||![1,2].includes(q.source.part)||!Array.isArray(q.source.pages)||!q.source.pages.length||q.source.pages.some(n=>!Number.isInteger(n)||n<1||n>(q.source.part===1?173:115))) throw Error(`Question ${q.id} needs valid PDF page references.`);
  return {id:q.id,question:q.question,options:[...q.options],answer:q.answer,topic:q.topic,type:q.type,difficulty:q.difficulty,hint:q.hint,theory:q.theory,explanation:q.explanation,source:{part:q.source.part,pages:[...q.source.pages]},...(typeof q.note==='string'?{note:q.note.slice(0,12000)}:{})};
}
export function validateBank(rows){
  if(!Array.isArray(rows)||rows.length>2000) throw Error('A question pack must contain an array of up to 2,000 questions.');
  const result=rows.map(validateQuestion); if(new Set(result.map(q=>q.id)).size!==result.length) throw Error('Question IDs must be unique.'); return result;
}
export function loadState(storage) {
  try {
    const raw=storage.getItem(STORAGE_KEY);if(!raw)return {state:emptyState(),warning:''};
    const s=JSON.parse(raw);if(s.version!==1||!s.stats||typeof s.stats!=='object'||!s.daily||typeof s.daily!=='object')throw Error();
    const state=emptyState();state.custom=validateBank(s.custom||[]);
    for(const [id,p] of Object.entries(s.stats)){
      if(!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(id)||['constructor','prototype','__proto__'].includes(id)||!p||typeof p!=='object')continue;
      const x=blankStat();for(const k of ['attempts','correct','wrong','bestXp'])x[k]=Number.isFinite(p[k])?Math.max(0,Math.floor(p[k])):0;
      for(const k of ['latestCorrect','needsReview','bookmarked'])x[k]=p[k]===true;
      x.bestXp=Math.min(10,x.bestXp);x.history=Array.isArray(p.history)?p.history.filter(h=>h&&Number.isInteger(h.selected)&&h.selected>=0&&h.selected<4&&typeof h.at==='string').slice(-100):[];
      state.stats[id]=x;
    }
    for(const [day,n]of Object.entries(s.daily))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(n))state.daily[day]=Math.max(0,Math.floor(n));
    state.session=s.session||null;state.lastResult=s.lastResult||null;return {state,warning:''};
  }catch{return {state:emptyState(),warning:'Saved progress could not be read. This tab is starting fresh; your old browser data has not been overwritten.'};}
}
export function validSession(s,bank){
  return !!(s&&Array.isArray(s.items)&&s.items.length&&s.items.length<=2000&&Number.isInteger(s.index)&&s.index>=0&&s.index<s.items.length&&s.items.every(x=>x&&bank.some(q=>q.id===x.id)&&Array.isArray(x.order)&&x.order.length===4&&new Set(x.order).size===4&&x.order.every(n=>Number.isInteger(n)&&n>=0&&n<4)&&(x.selected===null||Number.isInteger(x.selected)&&x.selected>=0&&x.selected<4)));
}
export function makeSession(questions,label){
  if(!questions.length)throw Error('No questions match these filters. Try another topic or mode.');
  return {id:`s-${Date.now()}`,label,startedAt:new Date().toISOString(),index:0,items:questions.map(q=>({id:q.id,order:shuffle([0,1,2,3]),selected:null,submitted:false,hint:false,theory:false}))};
}
export function recordAnswer(state,q,item){
  if(item.submitted||!Number.isInteger(item.selected)||item.selected<0||item.selected>3)return null;
  const p=state.stats[q.id]||blankStat();const correct=item.selected===q.answer,assisted=!!(item.hint||item.theory);
  const reward=correct?(assisted?6:10):2,xp=Math.max(0,reward-p.bestXp);
  p.attempts++;p[correct?'correct':'wrong']++;p.latestCorrect=correct;p.needsReview=!correct;p.bestXp=Math.max(p.bestXp,reward);
  p.history.push({at:new Date().toISOString(),selected:item.selected,correct,hintUsed:!!item.hint,theoryUsed:!!item.theory,mode:state.session?.label||'Practice'});p.history=p.history.slice(-100);
  state.stats[q.id]=p;state.daily[localDay()]=(state.daily[localDay()]||0)+1;item.submitted=true;item.correct=correct;item.earnedXp=xp;return {correct,xp};
}
export function summarize(state,bank){
  const entries=bank.map(q=>state.stats[q.id]).filter(Boolean),attempts=entries.reduce((n,p)=>n+p.attempts,0),correct=entries.reduce((n,p)=>n+p.correct,0);
  return {attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null,seen:entries.filter(p=>p.attempts>0).length,learned:entries.filter(p=>p.latestCorrect&&!p.needsReview).length,missed:entries.filter(p=>p.needsReview).length,xp:entries.reduce((n,p)=>n+p.bestXp,0),today:state.daily[localDay()]||0};
}
export function failureExport(state,bank){
  const failed=bank.filter(q=>state.stats[q.id]?.needsReview);
  return {schema:'dealquest.failures.v1',bankVersion:VERSION,exportedAt:new Date().toISOString(),course:'SOM 650 · Mergers, Acquisitions & Value Creation',summary:{...summarize(state,bank),exported:failed.length},revisionRequest:'Create a targeted revision quiz from these missed questions. Use the included answer history to diagnose misconceptions. Return a JSON pack with schema dealquest.question-pack.v1, unique new question IDs, and the same question fields so it can be imported in DealQuest.',questions:failed.map(q=>({...q,performance:state.stats[q.id],lastSelectedAnswer:q.options[state.stats[q.id].history.at(-1)?.selected]||null,correctAnswer:q.options[q.answer]}))};
}
export function importData(data,state,baseBank){
  if(!data||!['dealquest.failures.v1','dealquest.question-pack.v1'].includes(data.schema))throw Error('Use a DealQuest missed-question file or a revised question pack.');
  const incoming=validateBank(data.questions);if(!incoming.length)throw Error('This file has no questions.');
  const current=[...baseBank,...state.custom],known=new Map(current.map(q=>[q.id,q])),custom=[...state.custom],review=[];
  for(const q of incoming){
    const existing=known.get(q.id);
    if(existing&&(existing.question!==q.question||existing.answer!==q.answer||JSON.stringify(existing.options)!==JSON.stringify(q.options)))throw Error(`ID ${q.id} already belongs to a different question. Give revised questions new IDs.`);
    if(!existing){custom.push(q);known.set(q.id,q);}
    review.push(q.id);
  }
  if(custom.length>1500)throw Error('You can keep up to 1,500 extra revision questions.');
  // Commit only after every row passes: importing an invalid pack changes nothing.
  state.custom=custom;for(const id of review){if(!own(state.stats,id))state.stats[id]=blankStat();state.stats[id].needsReview=true;}
  return {count:review.length,added:custom.length-current.length+baseBank.length};
}
