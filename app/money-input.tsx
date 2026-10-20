'use client';
import {useEffect,useRef,useState,type InputHTMLAttributes} from 'react';
import {cleanNumericInput,groupNumericInput} from './lib/number-format';
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'defaultValue'|'onChange'|'type'|'min'|'max'> & {value?:number|string;defaultValue?:number|string;min?:number|string;max?:number|string;onValueChange?:(value:string)=>void};
export default function MoneyInput({value,defaultValue='',onValueChange,name,min,max,onFocus,onBlur,...props}:Props){
 const [raw,setRaw]=useState(String(value??defaultValue));const [editing,setEditing]=useState(false);const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(value!==undefined&&!editing)setRaw(String(value));},[value,editing]);
 useEffect(()=>{const n=Number(raw);const valid=raw===''||Number.isFinite(n)&&raw!=='-'&&raw!=='.'&&(min===undefined||n>=Number(min))&&(max===undefined||n<=Number(max));input.current?.setCustomValidity(valid?'':`Nhập số hợp lệ${min!==undefined?` từ ${groupNumericInput(String(min))}`:''}${max!==undefined?` đến ${groupNumericInput(String(max))}`:''}.`);},[raw,min,max]);
 return <><input {...props} ref={input} type="text" inputMode="decimal" value={editing?raw:groupNumericInput(raw)} onFocus={e=>{setEditing(true);onFocus?.(e);}} onBlur={e=>{setEditing(false);onBlur?.(e);}} onChange={e=>{const next=cleanNumericInput(e.target.value);if(!/^-?\d*(\.\d*)?$/.test(next))return;setRaw(next);if(next===''||Number.isFinite(Number(next))&&next!=='-'&&next!=='.')onValueChange?.(next);}}/>{name&&<input type="hidden" name={name} value={raw}/>}</>;
}
