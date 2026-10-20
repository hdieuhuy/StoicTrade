import type { JourneySnapshot } from './trading';
export type CardTheme='aurora'|'midnight'|'ivory'|'emerald'|'ember'|'rose'|'gold'|'frost'|'cobalt';
export const themes:Record<CardTheme,{name:string;bg:string;text:string;muted:string;accent:string;secondary:string;positive:string;negative:string;light?:boolean}>= {
 aurora:{name:'Aurora Glass',bg:'#10172d',text:'#f4efff',muted:'#aba5c5',accent:'#ba9cff',secondary:'#6acde8',positive:'#9ce6c7',negative:'#ffabc4'},
 midnight:{name:'Midnight Blue',bg:'#091e28',text:'#ebf9fa',muted:'#93b8c0',accent:'#61d4ca',secondary:'#3f81bf',positive:'#9fedd0',negative:'#ffb0b8'},
 ivory:{name:'Ivory Studio',light:true,bg:'#f3efe6',text:'#282b42',muted:'#777589',accent:'#7c69b0',secondary:'#86adb3',positive:'#18765c',negative:'#b33f5e'},
 emerald:{name:'Emerald Tide',bg:'#071f1d',text:'#ecfff7',muted:'#a0c4b6',accent:'#6ee7b7',secondary:'#4ea8c6',positive:'#a1efc2',negative:'#ffa6bb'},
 ember:{name:'Ember Sunset',bg:'#27151d',text:'#fff3e9',muted:'#c7aaa8',accent:'#ffad76',secondary:'#dd81b8',positive:'#b9eab4',negative:'#ff9fae'},
 rose:{name:'Rose Quartz',light:true,bg:'#f6eaf0',text:'#42283f',muted:'#856177',accent:'#af5e92',secondary:'#b68ac4',positive:'#216a52',negative:'#a82e51'},
 gold:{name:'Obsidian Gold',bg:'#1a1916',text:'#fff7e6',muted:'#bfb39a',accent:'#e7c477',secondary:'#ad8f59',positive:'#b4e4b3',negative:'#f3a1a1'},
 frost:{name:'Arctic Frost',light:true,bg:'#eaf3f8',text:'#193c52',muted:'#5d7b8f',accent:'#428cad',secondary:'#7c91cc',positive:'#187356',negative:'#ad3e5d'},
 cobalt:{name:'Cobalt Electric',bg:'#0c1438',text:'#eff5ff',muted:'#a2b4dc',accent:'#709cff',secondary:'#8be0f0',positive:'#9be9cc',negative:'#ffacc8'}
};
// Procedural artwork stays identical in previews and PNG exports, without remote assets.
function drawCardLandscape(c:CanvasRenderingContext2D,theme:CardTheme){
 const t=themes[theme];const light=t.light===true;
 c.save();
 const halo=c.createRadialGradient(1330,260,20,1250,350,720);
 halo.addColorStop(0,t.accent+(light?'35':'55'));halo.addColorStop(.52,t.secondary+'18');halo.addColorStop(1,t.bg+'00');
 c.fillStyle=halo;c.fillRect(0,0,1600,900);
 // Folded silk: a broad silhouette gives volume; fine contour lines describe its surface.
 const silk=c.createLinearGradient(920,60,1510,620);
 silk.addColorStop(0,t.secondary+'12');silk.addColorStop(.4,t.accent+(light?'36':'60'));silk.addColorStop(1,t.secondary+'08');
 c.fillStyle=silk;c.beginPath();c.moveTo(940,-70);
 c.bezierCurveTo(640,130,1540,180,1180,390);
 c.bezierCurveTo(860,650,1560,540,1760,770);c.lineTo(1760,920);
 c.bezierCurveTo(1700,650,1230,760,1314,485);
 c.bezierCurveTo(1225,390,1690,250,1228,-70);c.closePath();c.fill();
 for(let i=0;i<97;i++){
  const u=i/96;const sheen=Math.pow(Math.sin(u*Math.PI),5);
  const line=c.createLinearGradient(920,0,1630,800);
  line.addColorStop(0,t.secondary+'08');line.addColorStop(.22,t.secondary+(light?'85':'c0'));
  line.addColorStop(.48,t.accent+(light?'cc':'ff'));line.addColorStop(.7,t.secondary+'65');line.addColorStop(1,t.accent+'00');
  c.strokeStyle=line;c.globalAlpha=.22+sheen*.68;c.lineWidth=i%12===0?2.2:1.15;
  c.beginPath();c.moveTo(940+i*3,-70);
  c.bezierCurveTo(640+i*5,130+i*1.5,1540-i*3,180+i*2.1,1180+i*1.4,390+i);
  c.bezierCurveTo(860+i*3.85,650+i*1.1,1560+i*1.5,540+i*1.8,1760,770+i*1.5);c.stroke();
 }
 c.globalAlpha=1;
 // Sparse etched arcs echo the contour of a market cycle, without implying price data.
 c.strokeStyle=t.secondary+(light?'20':'22');c.lineWidth=1;
 for(let i=0;i<5;i++){c.beginPath();c.ellipse(1410,330,375+i*31,290+i*25,-.48,Math.PI*.64,Math.PI*1.75);c.stroke();}
 // Deterministic fine grain avoids flicker on redraw and keeps exported files consistent.
 for(let i=0;i<1800;i++){
  const x=((i*719)%1600),y=((i*419)%900);
  c.fillStyle=(light?'#ffffff':'#d8e8ff')+(i%7===0?'12':'05');c.fillRect(x,y,1,1);
 }
 const veil=c.createLinearGradient(0,0,1500,0);
 veil.addColorStop(0,t.bg+'f5');veil.addColorStop(.45,t.bg+'e8');veil.addColorStop(.68,t.bg+'85');veil.addColorStop(1,t.bg+'00');c.fillStyle=veil;c.fillRect(0,0,1600,900);
 const base=c.createLinearGradient(0,540,0,900);base.addColorStop(0,t.bg+'00');base.addColorStop(.5,t.bg+'d9');base.addColorStop(1,t.bg+'fa');c.fillStyle=base;c.fillRect(0,540,1600,360);
 c.restore();
}
export function drawJourneyCard(canvas:HTMLCanvasElement,s:JourneySnapshot,theme:CardTheme){
 const c=canvas.getContext('2d');if(!c)throw new Error('Trình duyệt không hỗ trợ Canvas.');canvas.width=1600;canvas.height=900;
 const t=themes[theme];const light=t.light===true;c.fillStyle=t.bg;c.fillRect(0,0,1600,900);
 drawCardLandscape(c,theme);
 c.fillStyle=light?'#ffffff65':'#e7deff06';c.strokeStyle=t.accent+'35';c.lineWidth=1.5;c.beginPath();c.roundRect(32,32,1536,836,32);c.fill();c.stroke();
 const font=(size:number,weight=400)=>`${weight} ${size}px "Be Vietnam Pro", sans-serif`;
 const text=(value:string,x:number,y:number,size:number,color=t.text,weight=400,max=1400)=>{while(size>12){c.font=font(size,weight);if(c.measureText(value).width<=max)break;size-=1;}c.fillStyle=color;c.fillText(value,x,y);};
 text('s.',75,125,56,t.accent,600);text('STOICTRADE',150,105,22,t.text,600);text('JOURNEY / FIELD NOTES',150,136,12,t.muted,500);
 const date=s.from&&s.to?`${s.from}  →  ${s.to}`:'TOÀN BỘ HÀNH TRÌNH';c.font=font(18,500);text(date,1520-c.measureText(date).width,110,18,t.muted,500,600);
 text(s.title.toUpperCase(),80,216,17,t.muted,500,1070);text('NET P&L · USD',82,302,15,t.muted,500);
 const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(s.summary.net);
 text((s.summary.net>0?'+':'')+amount,73,442,115,s.summary.net>=0?t.positive:t.negative,600,1090);
 text(s.scope,83,499,21,t.text,400,1080);
 if(s.summary.closed){const values=s.curve;const max=Math.max(...values,1);const min=Math.min(...values,0);const width=990;const y0=580;const height=65;c.beginPath();values.forEach((v,i)=>{const x=84+i/(values.length-1||1)*width;const y=y0-(v-min)/(max-min)*height;i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle=t.accent+'bb';c.lineWidth=2.5;c.stroke();}else{text('Chưa có lệnh đã đóng trong phạm vi này',84,560,14,t.muted);}
 c.beginPath();c.moveTo(80,625);c.lineTo(1520,625);c.strokeStyle=t.accent+'30';c.lineWidth=1;c.stroke();
 const decimal=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
 const stats=[['WIN RATE',s.summary.closed?decimal(s.summary.winRate)+'%':'—'],['PROFIT FACTOR',s.summary.noLosses?'∞':s.summary.profitFactor===null?'—':decimal(s.summary.profitFactor)],['CLOSED TRADES',String(s.summary.closed)],['AVG REALIZED R',s.summary.averageR===null?'—':decimal(s.summary.averageR)+'R']];
 stats.forEach(([label,value],i)=>{const x=84+i*365;text(label,x,679,13,t.muted,500);text(value,x,744,42,t.text,600,300);});
 text(s.author||'TRADER ẨN DANH',84,821,18,t.text,500,710);text('TỰ GHI CHÉP · CHƯA XÁC MINH',1080,821,12,t.muted,500,440);
}
export function canvasBlob(canvas:HTMLCanvasElement):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Không tạo được ảnh PNG.')),'image/png'));}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function encodeJourney(value:JourneySnapshot){const bytes=new TextEncoder().encode(JSON.stringify(value));if(bytes.length>500000)throw new Error('Báo cáo quá lớn cho link. Hãy tải file HTML.');let data=bytes;let format='j';if(typeof CompressionStream!=='undefined'){const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));data=new Uint8Array(await new Response(stream).arrayBuffer());format='g';}let binary='';for(const byte of data)binary+=String.fromCharCode(byte);const encoded=btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');if(encoded.length>24000)throw new Error('Link quá dài. Hãy ẩn chi tiết hoặc tải báo cáo HTML.');return format+'.'+encoded;}
export async function decodeJourney(hash:string){if(hash.length>25000)throw new Error('Link vượt giới hạn kích thước.');const [format,encoded]=hash.split('.');if(!encoded||!['g','j'].includes(format))throw new Error('Link chia sẻ không hợp lệ.');const data=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));let bytes=data;if(format==='g'){if(typeof DecompressionStream==='undefined')throw new Error('Trình duyệt chưa hỗ trợ mở link nén. Hãy dùng file HTML.');const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();const chunks:Uint8Array[]=[];let length=0;try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>500000){await reader.cancel();throw new Error('Dữ liệu giải nén quá lớn.');}chunks.push(value);}}finally{reader.releaseLock();}bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}}if(bytes.length>500000)throw new Error('Báo cáo quá lớn.');return JSON.parse(new TextDecoder().decode(bytes));}
