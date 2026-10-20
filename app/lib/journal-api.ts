import {createClient} from '@supabase/supabase-js';
import {initialJournal,parseJournal,type Journal} from './trading';
export const resources = ['trades','propAccounts','strategies','reflections','settings'] as const;
export type Resource = typeof resources[number];
class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});}
export async function journalApi(request:Request,resource?:string){
 try{
  if(resource&&!resources.includes(resource as Resource))throw new ApiError('Không tìm thấy API.',404);
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)throw new ApiError('Vui lòng đăng nhập.',401);
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)throw new ApiError('Phiên đăng nhập đã hết hạn.',401);
  const {data:row,error}=await db.from('stoictrade_journals').select('document,revision,updated_at').eq('user_id',auth.user.id).maybeSingle();
  if(error)throw new ApiError('Không đọc được database. Vui lòng thử lại.',503);
  const current:Journal=row?parseJournal(row.document):structuredClone(initialJournal);
  const revision=Number(row?.revision||0);
  if(request.method==='GET')return reply({data:resource?(resource==='settings'?{capital:current.capital,riskPercent:current.riskPercent,goal:current.goal}:current[resource as Exclude<Resource,'settings'>]):current,revision,updatedAt:row?.updated_at??null});
  if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError('Cần Content-Type application/json.',415);
  const reader=request.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  if(!reader)throw new ApiError('Thiếu dữ liệu.',400);
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024){await reader.cancel();throw new ApiError('Dữ liệu vượt quá 2 MB.',413);}chunks.push(value);}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(buffer));}catch{throw new ApiError('JSON không hợp lệ.',400);}
  if(!body||!Number.isSafeInteger(body.revision)||body.revision<0)throw new ApiError('Cần revision hợp lệ.',400);
  if(body.revision!==revision)throw new ApiError('Dữ liệu đã thay đổi ở phiên khác. Hãy sao lưu thay đổi và tải lại.',409);
  let candidate:unknown=body.data;
  if(resource==='settings')candidate={...current,capital:body.data?.capital,riskPercent:body.data?.riskPercent,goal:body.data?.goal};
  else if(resource)candidate={...current,[resource]:body.data};
  let document:Journal;try{document=parseJournal(candidate);}catch{throw new ApiError('Dữ liệu journal không hợp lệ. Kiểm tra giá, thời gian và tài khoản tham chiếu.',422);}
  const {data:saved,error:saveError}=await db.rpc('save_stoictrade_journal',{payload:document,expected_revision:revision});
  if(saveError)throw new ApiError('Không lưu được database. Thay đổi chưa được đồng bộ.',503);
  if(!saved?.length)throw new ApiError('Dữ liệu đã thay đổi ở phiên khác. Hãy sao lưu và tải lại.',409);
  return reply({data:document,revision:Number(saved[0].revision),updatedAt:saved[0].updated_at});
 }catch(e){return reply({error:e instanceof ApiError?e.message:'Không kết nối được máy chủ. Vui lòng thử lại.'},e instanceof ApiError?e.status:503);}
}
