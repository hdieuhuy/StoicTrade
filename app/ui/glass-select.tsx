'use client';
import {Children,isValidElement,useCallback,useRef,useState,type ReactNode,type SelectHTMLAttributes} from 'react';
import * as Select from '@radix-ui/react-select';
import {Check,ChevronDown,ChevronUp} from 'lucide-react';
type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,'onChange'|'value'|'defaultValue'|'multiple'|'size'> & {value?:string|number;defaultValue?:string|number;onChange?:(event:{target:{value:string}})=>void};
export default function GlassSelect({children,value,defaultValue,onChange,disabled,required,name,className,id,'aria-label':ariaLabel,...rest}:Props){
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement|null>(null);
 const [container,setContainer]=useState<HTMLElement|undefined>();
 const bind=useCallback((node:HTMLButtonElement|null)=>{trigger.current=node;if(node)setContainer(node.closest('dialog')||undefined);},[]);
 const [fallback,setFallback]=useState(String(defaultValue??''));
 const encode=(v:string)=>v===''?'__stoictrade_empty_option__':v;
 const options=Children.toArray(children).filter(isValidElement).map(child=>{const props=child.props as {value?:string|number;children?:ReactNode;disabled?:boolean};return {value:String(props.value??props.children??''),label:props.children,disabled:props.disabled};});
 return <Select.Root open={open} onOpenChange={setOpen} value={encode(String(value??fallback))} onValueChange={selected=>{const next=selected==='__stoictrade_empty_option__'?'':selected;setFallback(next);onChange?.({target:{value:next}});}} disabled={disabled} required={required}>
  {required&&<input aria-hidden="true" className="control-validation" value={String(value??fallback)} onChange={()=>{}} required disabled={disabled} tabIndex={-1} onInvalid={e=>{e.preventDefault();setOpen(true);trigger.current?.focus();}}/>}
  {name&&<input type="hidden" name={name} value={String(value??fallback)}/>}
  <Select.Trigger ref={bind} id={id} aria-label={ariaLabel} title={rest.title} className={`glass-select-trigger ${className||''}`}><Select.Value/><Select.Icon className="control-chevron"><ChevronDown size={15}/></Select.Icon></Select.Trigger>
  <Select.Portal container={container}><Select.Content position="popper" sideOffset={7} collisionPadding={12} className="glass-select-content" onEscapeKeyDown={e=>e.stopPropagation()}><Select.ScrollUpButton className="select-scroll"><ChevronUp size={14}/></Select.ScrollUpButton><Select.Viewport className="glass-select-viewport">{options.map(option=><Select.Item key={option.value} value={encode(option.value)} disabled={option.disabled} className="glass-select-item"><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator className="select-check"><Check size={15}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport><Select.ScrollDownButton className="select-scroll"><ChevronDown size={14}/></Select.ScrollDownButton></Select.Content></Select.Portal>
 </Select.Root>;
}
