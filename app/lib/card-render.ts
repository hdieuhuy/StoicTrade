import type { JourneySnapshot } from './trading';
export type CardTheme='aurora'|'midnight'|'ivory';
export const themes:Record<CardTheme,{name:string;bg:string;text:string;muted:string;accent:string;secondary:string;positive:string;negative:string}>= {
 aurora:{name:'Aurora Glass',bg:'#10172d',text:'#f4efff',muted:'#aba5c5',accent:'#ba9cff',secondary:'#6acde8',positive:'#9ce6c7',negative:'#ffabc4'},
 midnight:{name:'Midnight Blue',bg:'#091e28',text:'#ebf9fa',muted:'#93b8c0',accent:'#61d4ca',secondary:'#3f81bf',positive:'#9fedd0',negative:'#ffb0b8'},
 ivory:{name:'Ivory Studio',bg:'#f3efe6',text:'#282b42',muted:'#777589',accent:'#7c69b0',secondary:'#86adb3',positive:'#18765c',negative:'#b33f5e'}
};
export function drawJourneyCard(canvas:HTMLCanvasElement,s:JourneySnapshot,theme:CardTheme){
 const c=canvas.getContext('2d');if(!c)throw new Error('Trình duyệt không hỗ trợ Canvas.');canvas.width=1600;canvas.height=900;
 const t=themes[theme];const light=theme==='ivory';c.fillStyle=t.bg;c.fillRect(0,0,1600,900);
 const glow=c.createRadialGradient(1300,250,0,1300,250,850);glow.addColorStop(0,t.accent+(light?'24':'30'));glow.addColorStop(1,t.accent+'00');c.fillStyle=glow;c.fillRect(0,0,1600,900);
 const blue=c.createRadialGradient(180,50,0,180,50,900);blue.addColorStop(0,t.secondary+'25');blue.addColorStop(1,t.secondary+'00');c.fillStyle=blue;c.fillRect(0,0,1600,900);
 c.strokeStyle=t.accent+'10';c.lineWidth=1;for(let x=30;x<1600;x+=65){c.beginPath();c.moveTo(x,0);c.lineTo(x,900);c.stroke();}for(let y=25;y<900;y+=65){c.beginPath();c.moveTo(0,y);c.lineTo(1600,y);c.stroke();}
 c.save();c.translate(1250,385);for(let i=0;i<3;i++){c.save();c.rotate((i*62-30)*Math.PI/180);const g=c.createLinearGradient(-310,0,310,0);g.addColorStop(0,t.accent+'00');g.addColorStop(.45,t.accent+(i===0?'bb':'55'));g.addColorStop(1,t.secondary+'22');c.strokeStyle=g;c.lineWidth=i===0?9:2;c.beginPath();c.ellipse(0,0,310+i*18,145+i*14,0,0,Math.PI*2);c.stroke();c.restore();}c.restore();
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
