import nextEnv from '@next/env';
import postgres from 'postgres';
import {readFile,readdir} from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
const uri=process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
if(!uri){console.error('Thiếu DATABASE_URL hoặc DATABASE_POOLER_URL');process.exit(1);}
const sql=postgres(uri,{ssl:'require',max:1,connect_timeout:12,prepare:false,onnotice:()=>{}});
try {
 await sql`select 1`;
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){await sql.unsafe(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));console.log('Đã áp dụng migration:',file);}
} catch(e){console.error('Migration chưa thành công. Mã lỗi:',e.code || 'NETWORK_ERROR');process.exitCode=1;}
finally{await sql.end({timeout:2});}
