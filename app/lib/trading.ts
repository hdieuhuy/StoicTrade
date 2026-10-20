export type Trade = {
  id: string; symbol: string; account: string; propFirmId?: string; side: 'Long' | 'Short'; status: 'open' | 'closed';
  openedAt: string; closedAt: string; entry: number; exit: number; stop: number; quantity: number;
  multiplier: number; fees: number; netPnl?: number; strategy: string; emotion: string; disciplined: boolean; notes: string;
};
export type Strategy = { id: string; name: string; rules: string; exitRules: string };
export type Reflection = { id: string; date: string; mood: string; lesson: string; checklist: boolean[] };
export type PropAccount = {
  id: string; firm: string; name: string; phase: string; status: 'active' | 'paused' | 'passed' | 'failed' | 'funded';
  initialBalance: number; targetPercent: number; maxLossPercent: number; dailyLossPercent: number;
  rulesConfirmed?: boolean; consistencyPercent?: number; trailingFloorCap?: number | null;
  lossMode: 'static' | 'trailing' | 'trailingEod'; dailyBasis: 'initial' | 'dayStart'; minDays: number;
  startDate: string; deadline: string; fee: number; timezone: string; resetHour: number;
  equity: number | null; equityAt: string; notes: string;
};
export type Journal = { version: 1; propAccounts: PropAccount[]; trades: Trade[]; strategies: Strategy[]; reflections: Reflection[]; capital: number; riskPercent: number; goal: string };
export const initialJournal: Journal = { version: 1, propAccounts: [], trades: [], strategies: [], reflections: [], capital: 10000, riskPercent: 1, goal: '' };
export function pnl(t: Trade) { return t.status === 'closed' ? (t.netPnl ?? (((t.exit - t.entry) * (t.side === 'Long' ? 1 : -1) * t.quantity * t.multiplier) - t.fees)) : 0; }
export function risk(t: Trade) { return t.stop > 0 ? Math.abs(t.entry - t.stop) * t.quantity * t.multiplier : 0; }
export function rMultiple(t: Trade) { const amount = risk(t); return amount > 0 && t.status === 'closed' ? pnl(t) / amount : 0; }
export function tradeError(t: Trade): string | null {
  if (!t.id || !t.symbol.trim() || !t.account.trim()) return 'Vui lòng nhập mã tài sản và tên tài khoản.';
  if (!['Long','Short'].includes(t.side) || !['open','closed'].includes(t.status)) return 'Hướng hoặc trạng thái giao dịch không hợp lệ.';
  if (![t.entry,t.stop,t.quantity,t.multiplier,t.fees,t.exit].every(Number.isFinite)) return 'Các giá trị số phải hợp lệ.';
  if (t.entry <= 0 || t.stop < 0 || t.quantity <= 0 || t.multiplier <= 0 || t.fees < 0) return 'Giá, khối lượng, hệ số phải lớn hơn 0; phí không được âm.';
  if (t.netPnl !== undefined && !Number.isFinite(t.netPnl)) return 'Net P&L từ báo cáo phải là một số hợp lệ.';
  if (t.stop > 0 && ((t.side === 'Long' && t.stop >= t.entry) || (t.side === 'Short' && t.stop <= t.entry))) return 'Stop Loss ban đầu phải nằm dưới giá vào với Long và trên giá vào với Short.';
  if (!t.openedAt || !Number.isFinite(Date.parse(t.openedAt))) return 'Thời gian vào lệnh không hợp lệ.';
  if (t.status === 'closed' && (t.exit <= 0 || !t.closedAt || !Number.isFinite(Date.parse(t.closedAt)) || Date.parse(t.closedAt) < Date.parse(t.openedAt))) return 'Lệnh đã đóng cần giá thoát dương và thời gian đóng không sớm hơn lúc mở.';
  if (!Number.isFinite(risk(t)) || !Number.isFinite(pnl(t))) return 'Giá trị vượt giới hạn tính toán. Vui lòng kiểm tra khối lượng và hệ số.';
  return null;
}
export function statistics(trades: Trade[], capital = 10000) {
  const closed = trades.filter(t => t.status === 'closed').sort((a,b) => Date.parse(a.closedAt)-Date.parse(b.closedAt));
  const profits = closed.map(pnl);
  const wins = profits.filter(n => n > 0); const losses = profits.filter(n => n < 0);
  const grossProfit = wins.reduce((s,n) => s+n,0); const grossLoss = -losses.reduce((s,n) => s+n,0);
  let equity = 0; let peak = 0; let drawdown = 0; let drawdownPercent = 0;
  const curve = [{label:'Bắt đầu', value:0}, ...closed.map(t => { equity += pnl(t); peak = Math.max(peak,equity); drawdown = Math.max(drawdown,peak-equity); if (capital+peak > 0) drawdownPercent = Math.max(drawdownPercent,(peak-equity)/(capital+peak)*100); return {label:t.closedAt.slice(0,10),value:equity}; })];
  return {closed, total:profits.reduce((s,n)=>s+n,0), winRate:closed.length ? wins.length/closed.length*100 : 0,
    profitFactor:grossLoss > 0 ? grossProfit/grossLoss : grossProfit > 0 ? Infinity : null,
    expectancy:closed.length ? (grossProfit-grossLoss)/closed.length : 0,
    totalR:closed.reduce((s,t)=>s+rMultiple(t),0), drawdown, drawdownPercent, curve,
    discipline:trades.length ? trades.filter(t=>t.disciplined).length/trades.length*100 : 0 };
}
export function inPeriod(t: Trade, period: string, now = new Date()) {
  if (period === 'all') return true;
  const date = new Date(t.status === 'closed' ? t.closedAt : t.openedAt);
  const start = new Date(now); start.setHours(0,0,0,0);
  if (period === 'week') start.setDate(start.getDate()-((start.getDay()+6)%7));
  else if (period === 'month') start.setDate(1);
  else { start.setMonth(0,1); }
  return date >= start && date <= now;
}
export function positionSize(capital: number, percent: number, entry: number, stop: number, multiplier: number) {
  if (![capital,percent,entry,stop,multiplier].every(Number.isFinite) || capital <= 0 || percent <= 0 || percent > 100 || entry <= 0 || stop <= 0 || entry === stop || multiplier <= 0) return null;
  const budget = capital*percent/100;
  return {budget, quantity:budget/(Math.abs(entry-stop)*multiplier)};
}
export function parseJournal(raw: unknown): Journal {
  if (!raw || typeof raw !== 'object') throw new Error('Tệp dữ liệu không hợp lệ.');
  const d = {...raw} as Journal;
  if (d.propAccounts === undefined) d.propAccounts = [];
  if (!Array.isArray(d.propAccounts)) throw new Error('Danh sách prop firm không hợp lệ.');
  for (const a of d.propAccounts) if (propAccountError(a)) throw new Error('Tài khoản prop firm không hợp lệ.');
  if (d.version !== 1 || !Array.isArray(d.trades) || !Array.isArray(d.strategies) || !Array.isArray(d.reflections) || !Number.isFinite(d.capital) || d.capital <= 0 || !Number.isFinite(d.riskPercent) || d.riskPercent <= 0 || d.riskPercent > 100 || typeof d.goal !== 'string') throw new Error('Cấu trúc bản sao lưu không đúng định dạng StoicTrade.');
  for (const t of d.trades) { if (!t || typeof t !== 'object' || !['id','symbol','account','openedAt','closedAt','strategy','emotion','notes'].every(k=>typeof (t as unknown as Record<string, unknown>)[k] === 'string') || typeof t.disciplined !== 'boolean' || tradeError(t)) throw new Error('Bản sao lưu có giao dịch không hợp lệ.'); }
  for (const s of d.strategies) if (!s || !['id','name','rules','exitRules'].every(k=>typeof (s as unknown as Record<string,unknown>)[k]==='string') || !s.name.trim()) throw new Error('Playbook trong bản sao lưu không hợp lệ.');
  for (const n of d.reflections) if (!n || !['id','date','mood','lesson'].every(k=>typeof (n as unknown as Record<string,unknown>)[k]==='string') || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || !Number.isFinite(Date.parse(n.date)) || !Array.isArray(n.checklist) || n.checklist.length !== 3 || !n.checklist.every(v=>typeof v==='boolean')) throw new Error('Nhật ký tâm lý trong bản sao lưu không hợp lệ.');
  for (const t of d.trades) if (t.propFirmId !== undefined && (typeof t.propFirmId !== 'string' || (t.propFirmId && !d.propAccounts.some(a=>a.id===t.propFirmId)))) throw new Error('Giao dịch tham chiếu prop firm không tồn tại.');
  for (const list of [d.trades,d.strategies,d.reflections,d.propAccounts]) if (new Set(list.map(x=>x.id)).size !== list.length) throw new Error('Bản sao lưu chứa ID bị trùng.');
  return d;
}
export function csvExport(trades: Trade[]) {
  const columns: (keyof Trade)[] = ['symbol','account','propFirmId','side','status','openedAt','closedAt','entry','exit','stop','quantity','multiplier','fees','netPnl','strategy','emotion','disciplined','notes'];
  const cell = (value: unknown) => { let s=String(value ?? ''); if (/^[=+@\-\t\r]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"'; };
  return '\uFEFF'+columns.map(cell).join(',')+'\r\n'+trades.map(t=>columns.map(k=>cell(t[k])).join(',')).join('\r\n');
}

export function propAccountError(a: PropAccount): string | null {
  if (!a || typeof a !== 'object' || !['id','firm','name','phase','startDate','deadline','timezone','equityAt','notes'].every(k=>typeof (a as unknown as Record<string,unknown>)[k] === 'string')) return 'Thông tin tài khoản không hợp lệ.';
  if (!a.id || !a.firm.trim() || !a.name.trim() || !a.phase.trim()) return 'Vui lòng nhập tên quỹ, tên tài khoản và giai đoạn.';
  if (!['active','paused','passed','failed','funded'].includes(a.status) || !['static','trailing','trailingEod'].includes(a.lossMode) || !['initial','dayStart'].includes(a.dailyBasis)) return 'Trạng thái hoặc quy tắc lỗ không hợp lệ.';
  if (![a.initialBalance,a.targetPercent,a.maxLossPercent,a.dailyLossPercent,a.minDays,a.fee,a.resetHour].every(Number.isFinite) || a.initialBalance <= 0 || a.targetPercent < 0 || a.targetPercent > 1000 || a.maxLossPercent <= 0 || a.maxLossPercent > 100 || a.dailyLossPercent < 0 || a.dailyLossPercent > 100 || a.fee < 0 || !Number.isInteger(a.minDays) || a.minDays < 0 || !Number.isInteger(a.resetHour) || a.resetHour < 0 || a.resetHour > 23) return 'Kiểm tra vốn, mục tiêu, giới hạn lỗ, số ngày và giờ reset.';
  if (a.rulesConfirmed !== undefined && typeof a.rulesConfirmed !== 'boolean') return 'Trạng thái xác nhận quy tắc không hợp lệ.';
  if (a.consistencyPercent !== undefined && (!Number.isFinite(a.consistencyPercent) || a.consistencyPercent < 0 || a.consistencyPercent > 100)) return 'Consistency phải từ 0 đến 100%.';
  if (a.trailingFloorCap != null && (!Number.isFinite(a.trailingFloorCap) || a.trailingFloorCap < 0)) return 'Trần sàn trailing không hợp lệ.';
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
  if ((a.startDate ? !validDate(a.startDate) : a.rulesConfirmed!==false) || (a.deadline && (!validDate(a.deadline) || (a.startDate && a.deadline < a.startDate)))) return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
  try { new Intl.DateTimeFormat('en-US',{timeZone:a.timezone}).format(new Date()); } catch { return 'Múi giờ không hợp lệ. Ví dụ: Asia/Ho_Chi_Minh hoặc America/New_York.'; }
  if (a.equity !== null && (!Number.isFinite(a.equity) || a.equity < 0 || !a.equityAt || !Number.isFinite(Date.parse(a.equityAt)))) return 'Equity nhập tay cần lớn hơn hoặc bằng 0 và có thời điểm cập nhật.';
  return null;
}
export function propSession(date: string | Date, timezone: string, resetHour: number) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date));
  const value = (type: string) => Number(parts.find(p=>p.type===type)?.value);
  const day = new Date(Date.UTC(value('year'),value('month')-1,value('day')));
  if (value('hour') < resetHour) day.setUTCDate(day.getUTCDate()-1);
  return day.toISOString().slice(0,10);
}
export function propProgress(a: PropAccount, trades: Trade[], now = new Date()) {
  const session = (date: string | Date) => propSession(date,a.timezone,a.resetHour);
  const today = session(now);
  const linked = trades.filter(t=>t.propFirmId===a.id && session(t.openedAt)>=a.startDate && Date.parse(t.openedAt)<=now.getTime());
  const closed = linked.filter(t=>t.status==='closed' && Date.parse(t.closedAt)<=now.getTime()).sort((x,y)=>Date.parse(x.closedAt)-Date.parse(y.closedAt));
  const tradingDays = new Set(linked.map(t=>session(t.openedAt))).size;
  const limit = a.initialBalance*a.maxLossPercent/100;
  let balance = a.initialBalance; let peak = balance; let totalBreached = false; let dailyBreached = false;
  const floorFor = (high: number) => Math.min((a.lossMode==='static'?a.initialBalance:high)-limit,a.lossMode==='static'?Infinity:(a.trailingFloorCap??Infinity));
  let previousDay = '';
  const sessions = new Map<string,{start:number;net:number;minimum:number}>();
  for (const t of closed) {
    const day = session(t.closedAt);
    if (a.lossMode==='trailingEod' && previousDay && previousDay!==day) peak=Math.max(peak,balance);
    previousDay=day;
    const state = sessions.get(day) || {start:balance,net:0,minimum:balance};
    balance += pnl(t); state.net += pnl(t); state.minimum=Math.min(state.minimum,balance); sessions.set(day,state);
    const floor = floorFor(peak);
    if (balance <= floor) totalBreached=true;
    const dailyLimit = (a.dailyBasis==='initial'?a.initialBalance:state.start)*a.dailyLossPercent/100;
    if (a.dailyLossPercent>0 && state.minimum <= state.start-dailyLimit) dailyBreached=true;
    if (a.lossMode!=='trailingEod') peak = Math.max(peak,balance);
  }
  if (a.lossMode==='trailingEod' && previousDay && previousDay<today) peak=Math.max(peak,balance);
  const floor = floorFor(peak);
  const dayState = sessions.get(today) || {start:balance,net:0,minimum:balance};
  const dailyLimit = (a.dailyBasis==='initial'?a.initialBalance:Math.max(0,dayState.start))*a.dailyLossPercent/100;
  const dailyFloor = dayState.start-dailyLimit;
  const useSnapshot = a.equity !== null && Date.parse(a.equityAt) <= now.getTime() && (!closed.length || Date.parse(a.equityAt)>=Date.parse(closed.at(-1)!.closedAt));
  const equity = useSnapshot ? a.equity! : balance;
  if (equity <= floor) totalBreached=true;
  if (a.dailyLossPercent>0 && useSnapshot && session(a.equityAt)===today && equity<=dailyFloor) dailyBreached=true;
  const profit = balance-a.initialBalance;
  const target = a.initialBalance*a.targetPercent/100;
  const openCount = linked.length-closed.length;
  const bestDay = Math.max(0,...[...sessions.values()].map(s=>s.net));
  const consistency = profit>0?bestDay/profit*100:0;
  const consistencyMet = !a.consistencyPercent || (profit>0 && consistency<=a.consistencyPercent+1e-8);
  const criteriaMet = a.rulesConfirmed!==false && consistencyMet && profit>=target && tradingDays>=a.minDays && !totalBreached && !dailyBreached && openCount===0;
  const remainingDays = a.deadline ? Math.round((Date.parse(a.deadline)-Date.parse(today))/86400000) : null;
  return {balance,equity,useSnapshot,profit,target,progress:target?Math.max(0,Math.min(100,profit/target*100)):100,
    tradingDays,openCount,closedCount:closed.length,floor,dailyFloor,dailyLimit,
    bestDay,consistency,consistencyMet,totalRemaining:equity-floor,dailyRemaining:(useSnapshot&&session(a.equityAt)===today?equity:balance)-dailyFloor,
    dayPnl:dayState.net,totalBreached,dailyBreached,criteriaMet,remainingDays,today};
}

export type JourneyOptions = { author: string; title: string; caption: string; from: string; to: string; scope: string; details: boolean; accounts: boolean; notes: boolean };
export type SharedTrade = { symbol: string; side: 'Long'|'Short'; status:'open'|'closed'; openedAt:string; closedAt:string; entry:number; exit:number; quantity:number; net:number|null; r:number|null; account?:string; notes?:string };
export type JourneySnapshot = { version:1; createdAt:string; author:string; title:string; caption:string; from:string; to:string; scope:string; details:boolean; summary:{ net:number; closed:number; open:number; wins:number; winRate:number; profitFactor:number|null; noLosses:boolean; averageR:number|null; rCount:number; drawdown:number; expectancy:number; discipline:number }; curve:number[]; trades:SharedTrade[] };
export function journeySnapshot(trades:Trade[], options:JourneyOptions):JourneySnapshot {
  const stats=statistics(trades);const known=stats.closed.filter(t=>risk(t)>0);
  return {version:1,createdAt:new Date().toISOString(),author:options.author.trim().slice(0,50),title:options.title.trim().slice(0,80)||'Hành trình giao dịch',caption:options.caption.trim().slice(0,500),from:options.from,to:options.to,scope:options.scope.slice(0,120),details:options.details,
    summary:{net:stats.total,closed:stats.closed.length,open:trades.filter(t=>t.status==='open').length,wins:stats.closed.filter(t=>pnl(t)>0).length,winRate:stats.winRate,profitFactor:Number.isFinite(stats.profitFactor)?stats.profitFactor:null,noLosses:stats.profitFactor===Infinity,averageR:known.length?known.reduce((sum,t)=>sum+rMultiple(t),0)/known.length:null,rCount:known.length,drawdown:stats.drawdown,expectancy:stats.expectancy,discipline:stats.discipline},curve:stats.curve.map(p=>p.value),
    trades:options.details?[...trades].sort((a,b)=>Date.parse(b.openedAt)-Date.parse(a.openedAt)).map(t=>({symbol:t.symbol,side:t.side,status:t.status,openedAt:t.openedAt,closedAt:t.closedAt,entry:t.entry,exit:t.exit,quantity:t.quantity,net:t.status==='closed'?pnl(t):null,r:t.status==='closed'&&risk(t)>0?rMultiple(t):null,...(options.accounts?{account:t.account}:{}),...(options.notes?{notes:t.notes}:{})})):[]};
}
export function validateJourney(value:unknown):JourneySnapshot {
  if(!value||typeof value!=='object')throw new Error('Báo cáo không hợp lệ.');
  const s=value as JourneySnapshot;
  if(s.version!==1||!['createdAt','author','title','caption','from','to','scope'].every(k=>typeof (s as unknown as Record<string,unknown>)[k]==='string')||typeof s.details!=='boolean'||!s.summary||!Array.isArray(s.curve)||!s.curve.length||s.curve.length>10001||!s.curve.every(Number.isFinite)||!Array.isArray(s.trades)||s.trades.length>10000)throw new Error('Định dạng báo cáo không được hỗ trợ.');
  if(s.author.length>50||s.title.length>80||s.caption.length>500||s.scope.length>120||!Number.isFinite(Date.parse(s.createdAt)))throw new Error('Thông tin báo cáo không hợp lệ.');
  if(!['net','closed','open','wins','winRate','rCount','drawdown','expectancy','discipline'].every(k=>Number.isFinite((s.summary as unknown as Record<string,unknown>)[k]))||typeof s.summary.noLosses!=='boolean'||(s.summary.profitFactor!==null&&!Number.isFinite(s.summary.profitFactor))||(s.summary.averageR!==null&&!Number.isFinite(s.summary.averageR)))throw new Error('Số liệu báo cáo không hợp lệ.');
  if(![s.summary.closed,s.summary.open,s.summary.wins,s.summary.rCount].every(n=>Number.isInteger(n)&&n>=0)||s.summary.wins>s.summary.closed||s.summary.rCount>s.summary.closed||s.summary.winRate<0||s.summary.winRate>100||s.summary.discipline<0||s.summary.discipline>100||s.summary.drawdown<0)throw new Error('Thống kê báo cáo không hợp lệ.');
  for(const t of s.trades)if(!t||typeof t.symbol!=='string'||t.symbol.length>100||!['Long','Short'].includes(t.side)||!['open','closed'].includes(t.status)||!Number.isFinite(Date.parse(t.openedAt))||typeof t.closedAt!=='string'||(t.status==='closed'&&!Number.isFinite(Date.parse(t.closedAt)))||![t.entry,t.exit,t.quantity].every(Number.isFinite)||(t.net!==null&&!Number.isFinite(t.net))||(t.r!==null&&!Number.isFinite(t.r))||(t.account!==undefined&&typeof t.account!=='string')||(t.notes!==undefined&&typeof t.notes!=='string'))throw new Error('Chi tiết giao dịch không hợp lệ.');
  // Whitelist every field: a share never carries local account IDs or settings.
  return {version:1,createdAt:s.createdAt,author:s.author,title:s.title,caption:s.caption,from:s.from,to:s.to,scope:s.scope,details:s.details,summary:{net:s.summary.net,closed:s.summary.closed,open:s.summary.open,wins:s.summary.wins,winRate:s.summary.winRate,profitFactor:s.summary.profitFactor,noLosses:s.summary.noLosses,averageR:s.summary.averageR,rCount:s.summary.rCount,drawdown:s.summary.drawdown,expectancy:s.summary.expectancy,discipline:s.summary.discipline},curve:s.curve,trades:s.details?s.trades.map(t=>({symbol:t.symbol,side:t.side,status:t.status,openedAt:t.openedAt,closedAt:t.closedAt,entry:t.entry,exit:t.exit,quantity:t.quantity,net:t.net,r:t.r,...(t.account!==undefined?{account:t.account}:{}),...(t.notes!==undefined?{notes:t.notes}:{})})):[]};
}
export function escapeHtml(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function journeyReport(s:JourneySnapshot):string {
  const e=escapeHtml;const cash=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);const number=(n:number)=>n.toLocaleString('vi-VN',{maximumFractionDigits:2});
  const rows=s.trades.map(t=>`<tr><td>${e(new Date(t.openedAt).toLocaleDateString('vi-VN'))}</td><td><b>${e(t.symbol)}</b>${t.account?`<small>${e(t.account)}</small>`:''}</td><td>${t.side==='Long'?'Buy':'Sell'}</td><td>${number(t.quantity)}</td><td>${t.status==='open'&&t.side==='Short'?'—':cash(t.side==='Long'?t.entry:t.exit)}</td><td>${t.status==='open'&&t.side==='Long'?'—':cash(t.side==='Long'?t.exit:t.entry)}</td><td>${e(new Date(t.openedAt).toLocaleString('vi-VN'))}</td><td>${t.status==='closed'?e(new Date(t.closedAt).toLocaleString('vi-VN')):'Đang mở'}</td><td class="${(t.net??0)>=0?'positive':'negative'}">${t.net===null?'—':cash(t.net)}</td><td>${t.r===null?'—':number(t.r)+'R'}</td>${s.trades.some(t=>t.notes!==undefined)?`<td class="notes">${e(t.notes)}</td>`:''}</tr>`).join('');
  const vals=s.curve;const lo=Math.min(0,...vals);const hi=Math.max(1,...vals);const points=vals.map((v,i)=>`${i/(vals.length-1||1)*1000},${190-(v-lo)/(hi-lo)*170}`).join(' ');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${e(s.title)} — StoicTrade</title><style>*{box-sizing:border-box}body{margin:0;background:#101324;color:#eeeaf8;font:15px/1.7 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:50px 24px}.hero,section{border:1px solid #c4afff26;border-radius:24px;background:linear-gradient(125deg,#7279bf15,#8c64b915);padding:32px;margin-bottom:24px}.brand{color:#b3a3df;font-size:12px;letter-spacing:3px}h1{font-size:clamp(25px,4vw,45px);line-height:1.4}p{color:#aaa4bc}.pnl{font-size:clamp(40px,7vw,82px);line-height:1.3;letter-spacing:-2px}.positive{color:#95e0c1}.negative{color:#f4a9bc}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px;margin-top:30px}.stats small{color:#a59ab9;display:block}.stats b{font-size:24px;font-weight:500}.overflow{overflow:auto}table{border-collapse:collapse;width:100%;white-space:nowrap;font-size:12px}td,th{text-align:left;padding:14px;border-bottom:1px solid #ffffff12}th{color:#b9abd2}td small{display:block;color:#aaa}.notes{white-space:pre-wrap;min-width:220px;max-width:400px}.caption{white-space:pre-wrap}.footer{font-size:12px;color:#928ba4}.actions{margin:20px 0}button{padding:12px 18px;background:#b5a3e9;border:0;border-radius:8px;cursor:pointer;color:#211931}svg{width:100%;height:210px}@media print{body{background:white;color:#111}.hero,section{break-inside:avoid;background:none;border-color:#ddd}.actions{display:none}p,.footer,.brand,.stats small{color:#444}.positive{color:#15664e}.negative{color:#a21f3e}}</style><main><div class="brand">STOICTRADE · JOURNEY REPORT</div><div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div><article class="hero"><p>${e(s.from||'Bắt đầu hành trình')} → ${e(s.to||'Hiện tại')} · ${e(s.scope)}</p><h1>${e(s.title)}</h1><p>${e(s.author||'Trader ẩn danh')}</p><div class="pnl ${s.summary.net>=0?'positive':'negative'}">${cash(s.summary.net)}</div><p>NET P&L · USD · ${s.summary.closed} lệnh đóng / ${s.summary.open} lệnh mở</p><div class="stats">${[['Tỷ lệ thắng',s.summary.closed?number(s.summary.winRate)+'%':'—'],['Profit Factor',s.summary.noLosses?'∞':s.summary.profitFactor===null?'—':number(s.summary.profitFactor)],['R trung bình',s.summary.averageR===null?'—':number(s.summary.averageR)+'R'],['Drawdown',cash(s.summary.drawdown)],['Expectancy',cash(s.summary.expectancy)],['Tuân thủ',number(s.summary.discipline)+'%']].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div></article><section><h2>Đường cong P&L</h2><svg viewBox="0 0 1000 210" role="img" aria-label="P&L tích lũy"><polyline points="${points}" stroke="#ab9be8" stroke-width="3" fill="none"/></svg><p>${s.summary.rCount}/${s.summary.closed} lệnh có SL để tính R. R là kết quả thực tế, không phải tỷ lệ Risk/Reward dự kiến.</p></section>${s.caption?`<section><h2>Điều tôi học được</h2><p class="caption">${e(s.caption)}</p></section>`:''}<section><h2>Nhật ký giao dịch</h2>${s.details?`<div class="overflow"><table><thead><tr><th>Ngày</th><th>Symbol</th><th>Hướng</th><th>Size</th><th>Buy Price</th><th>Sell Price</th><th>Mở lệnh</th><th>Đóng lệnh</th><th>Net P&L</th><th>R</th>${s.trades.some(t=>t.notes!==undefined)?'<th>Ghi chú</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>${!s.trades.length?'<p>Chưa có giao dịch trong phạm vi đã chọn.</p>':''}`:'<p>Người chia sẻ đã ẩn chi tiết giao dịch.</p>'}</section><p class="footer">Dữ liệu tự ghi chép, chưa được xác minh bởi sàn. Bản chụp tại ${e(new Date(s.createdAt).toLocaleString('vi-VN'))}; không tự cập nhật. Báo cáo không kết nối đến tài khoản hoặc nhật ký gốc. Các mốc thời gian hiển thị theo múi giờ của thiết bị mở báo cáo.</p></main></html>`;
}
