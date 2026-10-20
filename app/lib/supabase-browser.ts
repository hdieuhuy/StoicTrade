import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
export function browserSupabase() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Thiếu cấu hình Supabase.');
 return client ??= createClient(url,key);
}
