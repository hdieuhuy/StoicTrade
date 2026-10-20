'use client';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import TradingWorkspace from './workspace';
import CloudAccount from './cloud-account';
import type {Session} from '@supabase/supabase-js';

const MemoizedWorkspace = memo(TradingWorkspace);

export default function Home() {
  return <CloudAccount>{session=><AuthenticatedHome session={session}/>}</CloudAccount>;
}

function AuthenticatedHome({session}:{session:Session}) {
  const [phase, setPhase] = useState<'intro' | 'leaving' | 'dashboard'>('intro');
  const entered = useRef(false);
  const experience = useRef<HTMLDivElement>(null);
  const replay = useCallback(() => { entered.current = false; setPhase('intro'); }, []);
  const finish = useCallback(() => setPhase('dashboard'), []);
  function enter() { if (!entered.current) { entered.current = true; setPhase('leaving'); } }
  useEffect(() => { if (phase !== 'intro') return; const timer = setTimeout(enter, 6500); return () => clearTimeout(timer); }, [phase]);
  useEffect(() => {
    if (phase !== 'leaving') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    const root = experience.current!;
    const animations: Animation[] = [];
    const duration = 4200;
    const animate = (selector: string, frames: Keyframe[], options: KeyframeAnimationOptions = {}) => {
      root.querySelectorAll<HTMLElement>(selector).forEach(element => {
        animations.push(element.animate(frames, { duration, fill: 'forwards', easing: 'ease-in-out', ...options }));
      });
    };
    // One browser-driven timeline; the scene is removed only after it finishes.
    animate('.intro', [{opacity:1,offset:0},{opacity:1,offset:.78},{opacity:0,offset:1}]);
    animate('.intro-backdrop', [{opacity:1,offset:0},{opacity:1,offset:.25},{opacity:0,offset:.85},{opacity:0,offset:1}]);
    animate('.quote-content', [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-24px)'}], {duration:950});
    animate('.intro-brand, .intro-footer, .intro-progress, .space-coordinates', [{opacity:1},{opacity:0}], {duration:800});
    animate('.portal-field', [
      {transform:'translate(-50%, -50%) scale(1)',opacity:1,offset:0},
      {transform:'translate(-50%, -50%) scale(.92)',opacity:1,offset:.2},
      {transform:'translate(-50%, -50%) scale(1.7)',opacity:1,offset:.65},
      {transform:'translate(-50%, -50%) scale(3.4)',opacity:0,offset:1}
    ]);
    animate('.portal-core', [{opacity:0,transform:'scale(.5)',offset:0},{opacity:.85,transform:'scale(1.7)',offset:.5},{opacity:0,transform:'scale(3)',offset:1}]);
    root.querySelectorAll<HTMLElement>('.light-trails i').forEach((ray,i) => {
      const angle=i*45;
      animations.push(ray.animate([{opacity:0,transform:`rotate(${angle}deg) translateX(5vmax) scaleX(.2)`,offset:0},{opacity:.9,offset:.35},{opacity:0,transform:`rotate(${angle}deg) translateX(48vmax) scaleX(1.3)`,offset:1}],{duration:2400,delay:700+i*60,fill:'both',easing:'ease-in-out'}));
    });
    animate('.dashboard-shell', [{opacity:0,offset:0},{opacity:0,offset:.35},{opacity:1,offset:.9},{opacity:1,offset:1}]);
    let cancelled=false;
    Promise.all(animations.map(animation=>animation.finished)).then(()=>{if(!cancelled)finish();}).catch(()=>{});
    return ()=>{cancelled=true;animations.forEach(animation=>animation.cancel());};
  }, [phase, finish]);
  useEffect(() => {
    if (phase === 'dashboard') return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [phase === 'dashboard']);
  return <div className="experience" data-phase={phase} ref={experience}>
    <div className="ambient" aria-hidden="true"><div className="glow blue"/><div className="glow violet"/><div className="grain"/></div>
    {phase !== 'dashboard' && <section className="intro" aria-label="Lời nhắc trước phiên giao dịch">
      <div className="intro-backdrop" aria-hidden="true"/><div className="intro-brand"><span className="brand-mark">s.</span> STOICTRADE</div>
      <div className="future-space" aria-hidden="true">
        <div className="space-grid"/><div className="energy-wave wave-a"/><div className="energy-wave wave-b"/>
        <div className="portal-field"><div className="portal-halo"/><div className="plasma-ribbon ribbon-a"/><div className="plasma-ribbon ribbon-b"/><div className="portal-ring ring-one"/><div className="portal-ring ring-two"/><div className="portal-ring ring-three"/><div className="portal-core"/></div>
        <div className="light-trails">{Array.from({length: 8}, (_, i) => <i key={i} style={{'--ray': i} as React.CSSProperties}/>)}</div>
        <div className="space-coordinates"><span>ST / INNER SPACE</span><span>DISCIPLINE IS YOUR EDGE</span></div>
      </div>
      <div className="quote-content"><div className="eyebrow"><span/> MỘT KHOẢNH KHẮC TĨNH TÂM</div><Quote className="quote-icon" size={28}/>
        <h1>Thị trường nằm ngoài tầm kiểm soát.<br/><em>Kỷ luật thì nằm trong tay bạn.</em></h1>
        <p>Một lời nhắc cho hành trình trading của bạn</p>
        <button className="enter-button" onClick={enter}>Bắt đầu với sự tỉnh táo <ArrowRight size={17}/></button>
      </div>
      <footer className="intro-footer"><span>HÍT THỞ. TẬP TRUNG. TUÂN THỦ KẾ HOẠCH.</span><button onClick={enter}>Vào dashboard <ArrowRight size={15}/></button></footer>
      <div className="intro-progress" aria-hidden="true"/>
    </section>}
    <MemoizedWorkspace open={phase === 'dashboard'} onReplay={replay} userId={session.user.id} email={session.user.email||''}/>
  </div>;
}
