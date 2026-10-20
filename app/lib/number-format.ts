/** USD convention: comma thousands, dot decimals. Never round stored prices. */
export function formatMoney(value:number){return Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value):'—';}
export function formatPrice(value:number){return Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:8}).format(value):'—';}
export function groupNumericInput(value:string){
 if(!value||value==='-'||value==='.')return value;
 const [whole,fraction]=value.split('.');const sign=whole.startsWith('-')?'-':'';
 return sign+(whole.replace('-','')||'0').replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction!==undefined?'.'+fraction:'');
}
export function cleanNumericInput(value:string){return value.replace(/[$,\s]/g,'');}
