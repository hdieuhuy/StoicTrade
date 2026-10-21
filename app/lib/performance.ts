import type {Trade} from './trading';
const pnl=(t:Trade)=>t.netPnl??((t.exit-t.entry)*(t.side==='Long'?1:-1)*t.quantity*t.multiplier-t.fees);
export type Breakdown={label:string;count:number;net:number;winRate:number;expectancy:number;profitFactor:number|null;noLosses:boolean;averageMinutes:number};
export function tradeClock(value:string,timezone:string){
 // datetime-local records represent wall time in the timezone selected by the user.
 if(!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)){const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!m)throw new Error('Thời gian không hợp lệ.');const day=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).getUTCDay();return {hour:+m[4],day};}
 const d=new Date(value);const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(d);return {hour:Number(parts.find(p=>p.type==='hour')?.value),day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.find(p=>p.type==='weekday')?.value||'')};
}
export function holdingMinutes(t:Trade){const parse=(s:string)=>Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(s)?s:s+'Z');return Math.max(0,(parse(t.closedAt)-parse(t.openedAt))/60000);}
export function performanceBreakdown(trades:Trade[],by:'symbol'|'setup'|'session'|'weekday'|'duration',timezone='Asia/Ho_Chi_Minh'):Breakdown[]{
 const weekdays=['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];const groups=new Map<string,Trade[]>();
 for(const t of trades.filter(t=>t.status==='closed')){const clock=tradeClock(t.openedAt,timezone);const minutes=holdingMinutes(t);const label=by==='symbol'?t.symbol:by==='setup'?t.strategy||'Chưa gắn setup':by==='weekday'?weekdays[clock.day]:by==='duration'?minutes<5?'< 5 phút':minutes<30?'5–30 phút':minutes<120?'30–120 phút':minutes<1440?'2–24 giờ':'≥ 24 giờ':clock.hour<8?'00:00–08:00':clock.hour<16?'08:00–16:00':'16:00–24:00';groups.set(label,[...(groups.get(label)||[]),t]);}
 const rows=[...groups].map(([label,list])=>{const wins=list.filter(t=>pnl(t)>0);const profit=wins.reduce((sum,t)=>sum+pnl(t),0);const loss=-list.filter(t=>pnl(t)<0).reduce((sum,t)=>sum+pnl(t),0);const net=profit-loss;return {label,count:list.length,net,winRate:wins.length/list.length*100,expectancy:net/list.length,profitFactor:loss>0?profit/loss:null,noLosses:loss===0&&profit>0,averageMinutes:list.reduce((sum,t)=>sum+holdingMinutes(t),0)/list.length};});
 const order=by==='weekday'?['Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy','Chủ nhật']:by==='duration'?['< 5 phút','5–30 phút','30–120 phút','2–24 giờ','≥ 24 giờ']:by==='session'?['00:00–08:00','08:00–16:00','16:00–24:00']:null;
 return rows.sort((a,b)=>order?order.indexOf(a.label)-order.indexOf(b.label):b.net-a.net);
}
export function tradeStreaks(trades:Trade[]){let win=0,loss=0,maxWin=0,maxLoss=0;const sorted=trades.filter(t=>t.status==='closed').slice().sort((a,b)=>Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(a.closedAt)?a.closedAt:a.closedAt+'Z')-Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(b.closedAt)?b.closedAt:b.closedAt+'Z')||a.id.localeCompare(b.id));for(const t of sorted){const net=pnl(t);if(net>0){win++;loss=0;}else if(net<0){loss++;win=0;}else{win=0;loss=0;}maxWin=Math.max(maxWin,win);maxLoss=Math.max(maxLoss,loss);}return {maxWin,maxLoss,currentCount:win||loss,currentKind:win?'thắng':loss?'thua':'hòa'};}
