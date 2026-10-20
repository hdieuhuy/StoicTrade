import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!endpoint || !key) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exitCode = 1;
} else {
  try {
    const url = new URL('/auth/v1/settings', endpoint);
    if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('invalid-url');
    const response = await fetch(url, {headers: {apikey:key}, redirect:'error', signal:AbortSignal.timeout(15000)});
    if (!response.ok) {
      console.error(`Endpoint Supabase Auth trả HTTP ${response.status}. Kiểm tra URL, key và trạng thái project.`);
      process.exitCode = 1;
    } else {
      const settings = await response.json();
      if (!settings || typeof settings !== 'object' || !settings.external || typeof settings.external !== 'object') {
        console.error('Endpoint trả nội dung không đúng cấu hình Supabase Auth.');
        process.exitCode = 1;
      } else {
        console.log('Supabase Auth: kết nối thành công với publishable key.');
        console.log(`Email provider: ${settings.external.email === true ? 'bật' : 'chưa bật'}.`);
        console.log('Chỉ kiểm tra endpoint Auth; chưa xác nhận schema, API journal hoặc RLS.');
      }
    }
  } catch {
    // Never print network exceptions: they may carry request/connection details.
    console.error('Không kiểm tra được Supabase Auth. Kiểm tra kết nối mạng và trạng thái project.');
    process.exitCode = 1;
  }
}
