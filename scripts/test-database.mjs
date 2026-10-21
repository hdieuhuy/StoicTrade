// Real database isolation tests; every test record is rolled back.
import nextEnv from '@next/env';
import postgres from 'postgres';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const sql=postgres(process.env.DATABASE_POOLER_URL||process.env.DATABASE_URL,{ssl:'require',max:1,connect_timeout:12,prepare:false});
const a=randomUUID(),b=randomUUID();const document={version:1,trades:[],propAccounts:[],strategies:[],reflections:[],capital:50000,riskPercent:1,goal:'transaction-only-test'};
try{
 await sql.begin(async tx=>{
  await tx`insert into auth.users(id) values(${a}),(${b})`;
  await tx`set local role authenticated`;
  await tx`select set_config('request.jwt.claim.sub',${a},true)`;
  const first=await tx`select * from public.save_stoictrade_journal(${tx.json(document)},0)`;
  assert.equal(first.length,1);assert.equal(first[0].user_id,a);assert.equal(Number(first[0].revision),1);
  assert.equal((await tx`select * from public.save_stoictrade_journal(${tx.json(document)},0)`).length,0);
  assert.equal((await tx`select * from public.save_stoictrade_journal(${tx.json(document)},99)`).length,0);
  const updated=await tx`select * from public.save_stoictrade_journal(${tx.json({...document,goal:'updated'})},1)`;
  assert.equal(Number(updated[0].revision),2);
  await tx`select set_config('request.jwt.claim.sub',${b},true)`;
  assert.equal((await tx`select * from public.stoictrade_journals`).length,0);
  assert.equal((await tx`select * from public.save_stoictrade_journal(${tx.json(document)},2)`).length,0);
  assert.equal((await tx`select * from public.save_stoictrade_journal(${tx.json(document)},0)`)[0].user_id,b);
  assert.equal((await tx`select * from public.stoictrade_journals`).length,1);
  const share=await tx`insert into public.journey_shares(user_id,snapshot,theme,expires_at) values(${b},${tx.json({version:1,title:'transaction-test'})},'aurora',now()+interval '1 day') returning token`;
  // Insert a valid owning trade before testing attachment policy.
  await tx`reset role`;
  await tx`update public.stoictrade_journals set document=jsonb_set(document,'{trades}','[{"id":"fixture-trade"}]') where user_id=${b}`;
  await tx`set local role authenticated`;
  const image=await tx`insert into public.trade_attachments(user_id,trade_id,path,stage) values(${b},'fixture-trade',${b+'/fixture.webp'},'before') returning id`;
  await tx`select set_config('request.jwt.claim.sub',${a},true)`;
  assert.equal((await tx`select * from public.journey_shares`).length,0);
  assert.equal((await tx`select * from public.trade_attachments`).length,0);
  await tx`reset role`;
  await tx`set local role anon`;
  assert.ok((await tx`select public.read_journey_share(${share[0].token}::uuid) as shared`)[0].shared);
  await tx`reset role`;
  await tx`update public.journey_shares set revoked_at=now() where token=${share[0].token}`;
  await tx`set local role anon`;
  assert.equal((await tx`select public.read_journey_share(${share[0].token}::uuid) as shared`)[0].shared,null);
  await tx`reset role`;
  await tx`update public.journey_shares set revoked_at=null,expires_at=now()-interval '1 second' where token=${share[0].token}`;
  await tx`set local role anon`;
  assert.equal((await tx`select public.read_journey_share(${share[0].token}::uuid) as shared`)[0].shared,null);
  await tx`reset role`;
  const [bucket]=await tx`select public from storage.buckets where id='trade-attachments'`;
  assert.equal(bucket.public,false);
  const [priv]=await tx`select has_table_privilege('anon','public.stoictrade_journals','select') as anon_read,has_table_privilege('authenticated','public.stoictrade_journals','update') as direct_write,has_function_privilege('anon','public.save_stoictrade_journal(jsonb,bigint)','execute') as anon_save`;
  assert.equal(priv.anon_read,false);assert.equal(priv.direct_write,false);assert.equal(priv.anon_save,false);
  throw new Error('ROLLBACK_TEST_SUCCESS');
 });
}catch(e){if(e.message==='ROLLBACK_TEST_SUCCESS')console.log('PASS: create/update, stale revision, RLS isolation, anon denial, direct write denial, attachment isolation, share revocation/expiry, private bucket. All fixtures rolled back.');else{console.error('Database test failed:',e.code||'ASSERTION');process.exitCode=1;}}
finally{await sql.end({timeout:2});}
