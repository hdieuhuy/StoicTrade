import test from 'node:test';
import assert from 'node:assert/strict';
import { pnl, risk, rMultiple, statistics, positionSize, tradeError, parseJournal, initialJournal, inPeriod, csvExport } from '../app/lib/trading.ts';
const trade = { id:'1',symbol:'TEST',account:'Demo',side:'Long',status:'closed',openedAt:'2026-10-01T10:00',closedAt:'2026-10-02T10:00',entry:100,exit:110,stop:95,quantity:2,multiplier:10,fees:5,strategy:'',emotion:'Bình tĩnh',disciplined:true,notes:'' };
test('Net P&L, initial risk and R include contract multiplier and fees',()=>{assert.equal(pnl(trade),195); assert.equal(risk(trade),100); assert.equal(rMultiple(trade),1.95); assert.equal(pnl({...trade,side:'Short',entry:110,exit:100,stop:115}),195); assert.equal(pnl({...trade,status:'open'}),0);});
test('Drawdown uses equity peak and handles losing first trade',()=>{const loss={...trade,id:'2',exit:90,fees:0,closedAt:'2026-10-03T10:00'};const s=statistics([trade,loss],1000);assert.equal(s.total,-5);assert.equal(s.drawdown,200);assert.equal(s.winRate,50);assert.equal(s.profitFactor,.975);assert.equal(s.curve.length,3);assert.equal(statistics([loss]).drawdown,200);assert.equal(statistics([]).profitFactor,null);});
test('Validation rejects incorrect stop, exit chronology, nonfinite values',()=>{assert.equal(tradeError(trade),null);assert.ok(tradeError({...trade,stop:105}));assert.ok(tradeError({...trade,closedAt:'2026-09-01'}));assert.ok(tradeError({...trade,quantity:NaN}));});
test('Position sizing rejects zero stop distance and calculates unit exposure',()=>{assert.deepEqual(positionSize(10000,1,100,95,10),{budget:100,quantity:2});assert.equal(positionSize(10000,1,100,100,1),null);});
test('Backup validates records and duplicate IDs',()=>{assert.deepEqual(parseJournal(initialJournal),initialJournal);assert.throws(()=>parseJournal({...initialJournal,trades:[trade,trade]}));assert.throws(()=>parseJournal({...initialJournal,trades:[{...trade,quantity:-1}]}));});
test('Week filter starts Monday and CSV escapes formula cells',()=>{assert.equal(inPeriod({...trade,closedAt:'2026-10-19T12:00'},'week',new Date('2026-10-20T12:00')),true);assert.equal(inPeriod({...trade,closedAt:'2026-10-18T12:00'},'week',new Date('2026-10-20T12:00')),false);assert.match(csvExport([{...trade,notes:'=SUM(A1)'}]), /'=SUM/);});

const { propAccountError, propProgress, propSession } = await import('../app/lib/trading.ts');
const prop = {id:'prop-1',firm:'Test firm',name:'Challenge 100K',phase:'Phase 1',status:'active',initialBalance:100000,targetPercent:8,maxLossPercent:10,dailyLossPercent:5,lossMode:'static',dailyBasis:'initial',minDays:2,startDate:'2026-10-01',deadline:'',fee:500,timezone:'Etc/UTC',resetHour:0,equity:null,equityAt:'',notes:''};
const now = new Date('2026-10-20T18:00:00Z');
const propTrade = (id,net,open,close) => ({...trade,id,propFirmId:prop.id,entry:10000,stop:100,exit:10000+net,quantity:1,multiplier:1,fees:0,openedAt:open,closedAt:close});
test('Old backups migrate to empty prop accounts without losing trades',()=>{const {propAccounts,...old}=initialJournal;assert.deepEqual(parseJournal({...old,trades:[trade]}).propAccounts,[]);assert.equal(parseJournal({...old,trades:[trade]}).trades.length,1);});
test('Prop progress only counts linked trades from the current phase',()=>{const t=propTrade('p1',4000,'2026-10-02T09:00Z','2026-10-02T10:00Z');const p=propProgress(prop,[t,{...t,id:'other',propFirmId:'another'},{...t,id:'old',openedAt:'2026-09-20T09:00Z'}],now);assert.equal(p.balance,104000);assert.equal(p.progress,50);assert.equal(p.tradingDays,1);assert.equal(p.totalRemaining,14000);assert.equal(p.criteriaMet,false);});
test('Prop daily breach persists even when losses recover later',()=>{const p=propProgress(prop,[propTrade('loss',-6000,'2026-10-02T09:00Z','2026-10-02T10:00Z'),propTrade('win',7000,'2026-10-02T11:00Z','2026-10-02T12:00Z')],now);assert.equal(p.profit,1000);assert.equal(p.dailyBreached,true);assert.equal(p.totalBreached,false);assert.equal(p.criteriaMet,false);});
test('Static and trailing total loss floors differ after new balance high',()=>{const trades=[propTrade('w',10000,'2026-10-02T09:00Z','2026-10-02T10:00Z'),propTrade('l',-11000,'2026-10-03T09:00Z','2026-10-03T10:00Z')];assert.equal(propProgress(prop,trades,now).floor,90000);const p=propProgress({...prop,lossMode:'trailing'},trades,now);assert.equal(p.floor,100000);assert.equal(p.totalBreached,true);});
test('Prop sessions follow selected timezone and reset boundary',()=>{assert.equal(propSession('2026-10-20T01:00Z','Etc/UTC',2),'2026-10-19');assert.equal(propSession('2026-10-20T03:00Z','Etc/UTC',2),'2026-10-20');assert.equal(propSession('2026-10-20T01:00Z','America/New_York',0),'2026-10-19');});
test('Equity snapshots account for floating loss only when newer than closes',()=>{const t=propTrade('w',1000,'2026-10-20T09:00Z','2026-10-20T10:00Z');let p=propProgress({...prop,equity:89000,equityAt:'2026-10-20T12:00Z'},[t],now);assert.equal(p.totalBreached,true);assert.equal(p.dailyBreached,true);assert.equal(p.useSnapshot,true);p=propProgress({...prop,equity:89000,equityAt:'2026-10-20T08:00Z'},[t],now);assert.equal(p.useSnapshot,false);assert.equal(p.totalBreached,false);});
test('Prop target requires minimum days and no remaining open trades',()=>{const ts=[propTrade('w',4000,'2026-10-02T09:00Z','2026-10-02T10:00Z'),propTrade('w2',4000,'2026-10-03T09:00Z','2026-10-03T10:00Z')];assert.equal(propProgress(prop,ts,now).criteriaMet,true);assert.equal(propProgress(prop,[...ts,{...ts[0],id:'open',status:'open'}],now).criteriaMet,false);});
test('Prop backup validates IDs, rules, timezone, and dangling trade links',()=>{assert.equal(propAccountError(prop),null);assert.ok(propAccountError({...prop,timezone:'invalid'}));assert.ok(propAccountError({...prop,dailyLossPercent:-1}));assert.ok(propAccountError({...prop,startDate:'2026-02-31'}));assert.throws(()=>parseJournal({...initialJournal,trades:[{...trade,propFirmId:'missing'}]}));assert.equal(parseJournal({...initialJournal,propAccounts:[prop]}).propAccounts.length,1);});

test('EOD trailing ignores intraday highs and advances after session closes',()=>{const ts=[propTrade('w',5000,'2026-10-20T09:00Z','2026-10-20T10:00Z'),propTrade('l',-4000,'2026-10-20T11:00Z','2026-10-20T12:00Z')];assert.equal(propProgress({...prop,lossMode:'trailingEod'},ts,now).floor,90000);assert.equal(propProgress({...prop,lossMode:'trailingEod'},ts,new Date('2026-10-21T12:00Z')).floor,91000);assert.equal(propProgress({...prop,lossMode:'trailing'},ts,now).floor,95000);});
test('No daily limit, trailing cap, and pending rules have distinct behavior',()=>{const ts=[propTrade('w',20000,'2026-10-02T09:00Z','2026-10-02T10:00Z')];assert.equal(propProgress({...prop,lossMode:'trailing',trailingFloorCap:100000},ts,now).floor,100000);assert.equal(propProgress({...prop,dailyLossPercent:0},[propTrade('l',-6000,'2026-10-02T09:00Z','2026-10-02T10:00Z')],now).dailyBreached,false);assert.equal(propProgress({...prop,rulesConfirmed:false,minDays:0},ts,now).criteriaMet,false);assert.equal(propProgress({...prop,consistencyPercent:30,minDays:0},ts,now).consistencyMet,false);});

test('Pending prop profile may leave unknown start date empty',()=>{assert.equal(propAccountError({...prop,rulesConfirmed:false,startDate:''}),null);assert.ok(propAccountError({...prop,rulesConfirmed:true,startDate:''}));});
test('Broker Net P&L overrides calculation without double subtracting fees',()=>{const broker={...trade,netPnl:274.5,fees:4,stop:0};assert.equal(pnl(broker),274.5);assert.equal(tradeError(broker),null);assert.equal(risk(broker),0);assert.equal(rMultiple(broker),0);assert.ok(tradeError({...broker,netPnl:NaN}));assert.equal(parseJournal({...initialJournal,trades:[broker]}).trades[0].netPnl,274.5);});

const {journeySnapshot,validateJourney,journeyReport}=await import('../app/lib/trading.ts');
const shareOptions={author:'Trader',title:'Hành trình',caption:'Bài học',from:'2026-10-01',to:'2026-10-20',scope:'Tất cả tài khoản',details:true,accounts:false,notes:false};
test('Sharing redacts private account names, notes, local IDs and prop links by default',()=>{const shared=journeySnapshot([{...trade,account:'PRIVATE_ACCOUNT',notes:'PRIVATE_NOTE',propFirmId:'secret-prop'}],shareOptions);const raw=JSON.stringify(shared);assert.ok(!raw.includes('PRIVATE_ACCOUNT'));assert.ok(!raw.includes('PRIVATE_NOTE'));assert.ok(!raw.includes('secret-prop'));assert.ok(!('id' in shared.trades[0]));assert.equal(shared.summary.net,pnl(trade));assert.equal(shared.summary.averageR,1.95);});
test('Shared report supports opt-in details and unknown R without fabrication',()=>{const s=journeySnapshot([{...trade,stop:0}],{...shareOptions,accounts:true,notes:true});assert.equal(s.trades[0].account,'Demo');assert.equal(s.trades[0].r,null);assert.equal(s.summary.averageR,null);assert.equal(journeySnapshot([trade],{...shareOptions,details:false}).trades.length,0);});
test('HTML share escapes user content and public snapshots whitelist fields',()=>{const s=journeySnapshot([{...trade,notes:'<script>alert(1)</script>'}],{...shareOptions,title:'<img src=x onerror=alert(1)>',notes:true});const html=journeyReport(s);assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<img src=x'));assert.ok(!('secret' in validateJourney({...s,secret:'private'})));assert.throws(()=>validateJourney({...s,summary:{...s.summary,net:NaN}}));});
test('Compressed share links round trip without browser-local records',async()=>{const {encodeJourney,decodeJourney}=await import('../app/lib/card-render.ts');const s=journeySnapshot([trade],shareOptions);const encoded=await encodeJourney(s);assert.deepEqual(validateJourney(await decodeJourney(encoded)),s);await assert.rejects(()=>decodeJourney('bad.payload'));await assert.rejects(()=>decodeJourney('g.'+'a'.repeat(25001)));});

const {formatMoney,formatPrice,groupNumericInput,cleanNumericInput}=await import('../app/lib/number-format.ts');
test('Money input groups thousands without changing price precision or signed P&L',()=>{
 assert.equal(groupNumericInput('29724.75000'),'29,724.75000');
 assert.equal(groupNumericInput('-4060.25'),'-4,060.25');
 assert.equal(groupNumericInput('0.00001234'),'0.00001234');
 assert.equal(groupNumericInput(''),'');
 assert.equal(cleanNumericInput('$29,724.75'),'29724.75');
 assert.equal(formatMoney(50000),'$50,000.00');
 assert.equal(formatPrice(1.08475),'$1.08475');
 assert.equal(formatPrice(0.00001234),'$0.00001234');
});

const {reuseTradeForm}=await import('../app/lib/trading.ts');
test('New trade reuses last form choices but resets execution fields and identity',()=>{
 const base={...trade,id:'new-trade',entry:0,exit:0,quantity:0,openedAt:'',closedAt:''};
 const old={...trade,netPnl:-125.75,notes:'Previous note',propFirmId:'prop-id'};
 const next=reuseTradeForm(base,old);
 for(const k of ['id','entry','exit','quantity','openedAt','closedAt'])assert.equal(next[k],base[k]);
 for(const k of ['symbol','account','side','stop','multiplier','fees','netPnl','notes','propFirmId'])assert.equal(next[k],old[k]);
 assert.deepEqual(reuseTradeForm(base),base);
 const saved=parseJournal({...initialJournal,trades:[trade],lastTradeFormId:trade.id});
 assert.equal(saved.lastTradeFormId,trade.id);
 assert.throws(()=>parseJournal({...initialJournal,lastTradeFormId:123}));
});
