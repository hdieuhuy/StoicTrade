// Integration test against a running local build and the configured Supabase project.
// Creates isolated example.invalid auth fixtures, never sends email, cleans them in finally.
import {writeFile,access,unlink} from 'node:fs/promises';
import nextEnv from '@next/env';import postgres from 'postgres';import sharp from 'sharp';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createClient} from '@supabase/supabase-js';
import {initialJournal,journeySnapshot} from '../app/lib/trading.ts';
nextEnv.loadEnvConfig(process.cwd());
const base=process.env.TEST_APP_ORIGIN||'http://127.0.0.1:3107';const db=postgres(process.env.DATABASE_POOLER_URL||process.env.DATABASE_URL,{ssl:'require',max:1,prepare:false,connect_timeout:12});
const users=[randomUUID(),randomUUID()];const password=randomUUID()+'Aa1!';const emails=users.map(id=>`stoictrade-test-${id}@example.invalid`);const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));let ownerPaths=[];let ownerToken;
async function request(path,token,method='GET',body){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
try{
 for(let i=0;i<users.length;i++){
  await db`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token) values('00000000-0000-0000-0000-000000000000',${users[i]},'authenticated','authenticated',${emails[i]},extensions.crypt(${password},extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','')`;
  await db`insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at) values(${randomUUID()},${users[i]},${users[i]},${db.json({sub:users[i],email:emails[i],email_verified:true})},'email',now(),now())`;
 }
 const sessions=await Promise.all(clients.map((client,i)=>client.auth.signInWithPassword({email:emails[i],password})));assert.ok(sessions.every(s=>s.data.session),'Fixture sign-in failed');const [a,b]=sessions.map(s=>s.data.session.access_token);ownerToken=a;
 const trade={id:randomUUID(),symbol:'QA_ONLY',account:'Integration fixture',side:'Long',status:'closed',openedAt:'2026-10-19T10:00:00',closedAt:'2026-10-19T10:05:00',entry:100,exit:110,stop:95,quantity:1,multiplier:1,fees:1,strategy:'Fixture',emotion:'Bình tĩnh',disciplined:true,notes:'Not real trading data'};
 assert.equal((await request('/api/journal',a,'PUT',{revision:0,data:{...initialJournal,trades:[trade]}})).status,200);
 assert.equal((await request('/api/attachments')).status,401);assert.equal((await request('/api/shares')).status,401);
 const png=await sharp({create:{width:200,height:100,channels:3,background:'#172447'}}).png().toBuffer();const form=new FormData();form.set('tradeId',trade.id);form.set('stage','before');form.set('file',new Blob([png],{type:'image/png'}),'fixture.png');
 const uploaded=await request('/api/attachments',a,'POST',form);assert.equal(uploaded.status,201,'Upload failed');const id=uploaded.body.data.id;
 const listed=await request('/api/attachments?tradeId='+trade.id,a);assert.equal(listed.status,200);assert.equal(listed.body.data.length,1);const img=listed.body.data[0];ownerPaths.push(img.path);assert.equal((await fetch(img.url)).status,200);
 assert.equal((await request('/api/attachments?tradeId='+trade.id,b)).body.data.length,0);
 assert.equal((await request('/api/attachments/'+id,b,'PATCH',{note:'forbidden',annotations:[]})).status,404);
 assert.equal((await request('/api/attachments/'+id,a,'PATCH',{note:'Before entry',annotations:[{id:'pin',x:25,y:50,text:'Resistance'}]})).status,200);
 assert.equal((await request('/api/attachments/'+id,a,'PATCH',{note:'bad',annotations:[{id:'pin',x:101,y:50,text:'Invalid'}]})).status,400);
 const {error:crossRead}=await clients[1].storage.from('trade-attachments').createSignedUrl(img.path,30);assert.ok(crossRead,'Other user must not sign owner image');
 const snapshot=journeySnapshot([trade],{author:'QA',title:'Integration fixture',caption:'Test only',from:'',to:'',scope:'Test',details:false,accounts:false,notes:false});
 const shared=await request('/api/shares',a,'POST',{snapshot:{...snapshot,privateSecret:'must drop'},theme:'emerald',days:1});assert.equal(shared.status,201,'Share creation failed');const token=shared.body.data.token;
 const publicRead=await request('/api/shares/'+token);assert.equal(publicRead.status,200);assert.equal(publicRead.body.data.theme,'emerald');assert.ok(!JSON.stringify(publicRead.body).includes('privateSecret'));assert.equal(publicRead.body.data.snapshot.trades.length,0);
 assert.equal((await request('/api/shares',a)).body.data[0].title,'Integration fixture');assert.equal((await request('/api/shares',b)).body.data.length,0);assert.equal((await request('/api/shares/'+token,b,'DELETE')).status,404);
 assert.equal((await request('/api/shares/'+token,a,'DELETE')).status,200);assert.equal((await request('/api/shares/'+token)).status,404);
 const expiry=await request('/api/shares',a,'POST',{snapshot,theme:'aurora',days:1});assert.equal(expiry.status,201);await db`update public.journey_shares set expires_at=now()-interval '1 minute' where token=${expiry.body.data.token}`;assert.equal((await request('/api/shares/'+expiry.body.data.token)).status,404);
 assert.equal((await request('/api/attachments/'+id,a,'DELETE')).status,200);ownerPaths=[];assert.equal((await request('/api/attachments?tradeId='+trade.id,a)).body.data.length,0);
 console.log('PASS: auth, real image upload/read/annotation/delete, ownership, redacted share, expiry and revocation.');
 if(process.env.TEST_UI_WAIT==='1'){
  await writeFile('/private/tmp/stoictrade-ui-fixture.json',JSON.stringify({email:emails[0],password}),{mode:0o600});
  console.log('UI fixture ready; waiting up to 180 seconds before cleanup.');
  for(let i=0;i<180;i++){try{await access('/private/tmp/stoictrade-ui-fixture.done');break;}catch{}await new Promise(r=>setTimeout(r,1000));}
  await unlink('/private/tmp/stoictrade-ui-fixture.json').catch(()=>{});await unlink('/private/tmp/stoictrade-ui-fixture.done').catch(()=>{});
 }

}catch(e){console.error('Feature test failed:',e instanceof assert.AssertionError?e.message:e.code||'INTEGRATION_ERROR');process.exitCode=1;}
finally{
 for(const id of users){try{const paths=await db`select path from public.trade_attachments where user_id=${id}`;if(paths.length&&ownerToken)await clients[0].storage.from('trade-attachments').remove(paths.map(p=>p.path));await db`delete from auth.users where id=${id}`;}catch{console.error('Fixture cleanup requires attention:',id);process.exitCode=1;}}
 await Promise.all(clients.map(c=>c.auth.signOut().catch(()=>{})));await db.end({timeout:2});console.log('Test account cleanup finished.');
}
