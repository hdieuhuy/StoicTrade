# Supabase backend — đã triển khai

Migration `supabase/migrations/001_journals.sql` đã chạy trên project Supabase được cung cấp.

## Cách lưu dữ liệu

`public.stoictrade_journals` có một hàng cho mỗi `auth.users.id`:

- `user_id`: chủ sở hữu; xóa tài khoản Auth sẽ cascade xóa journal.
- `document` (JSONB): toàn bộ journal v1: trades, propAccounts, strategies, reflections, capital, riskPercent, goal.
- `revision`: phiên bản tăng sau mỗi lần ghi; `updated_at`: thời điểm server.

Giai đoạn này dùng document JSONB để lưu toàn bộ nhật ký trong một thao tác nguyên tử, giữ đúng liên kết prop/giao dịch và đổi tên setup. Chưa tách thành bảng trades hoặc bảng tài khoản riêng. Khi cần phân trang, truy vấn phân tích trên server hoặc nhật ký lớn, có thể chuẩn hóa schema bằng migration tiếp theo. Giới hạn request hiện tại: 2 MB. API kiểm tra cấu trúc và quy tắc journal trước khi ghi.

RLS chỉ cho người đăng nhập đọc hàng của chính mình. Client không có quyền insert/update/delete trực tiếp. Hàm `save_stoictrade_journal` dùng `auth.uid()` và compare-and-swap revision để ghi nguyên tử. Không nhận user_id do client tự khai. API xác minh access token với Supabase Auth; không dùng postgres/service-role để phục vụ request.

## API Next.js

Mọi request cần `Authorization: Bearer <Supabase access_token>`; response private/no-store.

| Endpoint | Methods | Dữ liệu |
| --- | --- | --- |
| `/api/journal` | GET, PUT | Toàn bộ journal; UI dùng endpoint này |
| `/api/trades` | GET, PUT | Danh sách giao dịch |
| `/api/propAccounts` | GET, PUT | Danh sách prop firm |
| `/api/strategies` | GET, PUT | Danh sách setup |
| `/api/reflections` | GET, PUT | Danh sách tổng kết |
| `/api/settings` | GET, PUT | capital, riskPercent, goal |

GET trả `{data, revision, updatedAt}`. PUT nhận `{data, revision}`; resource PUT thay toàn bộ danh sách của resource đó (thêm/sửa/xóa phần tử trong danh sách), kiểm tra lại journal và trả toàn bộ journal đã lưu. Revision dùng chung cho mọi resource. Journal chưa có hàng trả revision 0; lần ghi đầu tạo hàng. Không dùng PATCH/POST/DELETE riêng trong phiên bản này.

Mã lỗi: 401 thiếu/hết phiên; 404 resource lạ; 409 xung đột; 413 vượt 2 MB; 415 sai content-type; 422 dữ liệu sai; 503 lỗi kết nối/database.

## Đăng nhập và nhập dữ liệu cũ

Ứng dụng có đăng ký email/mật khẩu, đăng nhập, đăng xuất. Phiên đăng nhập do Supabase SDK quản lý trên trình duyệt; API nhận Bearer token, không dùng cookie SSR. Cần xác nhận email nếu project bật email confirmation. Chưa triển khai quên mật khẩu/OAuth.

Sau đăng nhập, ứng dụng đọc cloud trước. Bản `stoictrade.journal.v1` cũ trong localStorage không bị xóa hoặc ghi đè. Banner cho xem số bản ghi và mở bước xác nhận nhập. Nhập/khôi phục **thay thế** toàn bộ journal cloud của tài khoản hiện tại, không tự merge; có nút tải backup trước khi xác nhận.

Khi đang lưu, khóa chỉnh sửa tiếp. Khi lỗi, giữ thay đổi trong bộ nhớ, cho thử lại/xuất JSON và cảnh báo trước khi đóng trang. Khi xung đột, tải backup trước khi reload. Chưa có hàng đợi offline bền vững hoặc đồng bộ realtime: reload/tab khác đọc bản mới từ server. Banner Đã đồng bộ chỉ xuất hiện sau khi API xác nhận thành công.

## Env và Vercel

`.env.local` riêng tư đã có cấu hình, được Git bỏ qua. Không commit hoặc log URI/mật khẩu database.

Vercel cần:

- `NEXT_PUBLIC_SUPABASE_URL`: copy từ `.env.local`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: copy từ `.env.local`.
- `NEXT_PUBLIC_APP_URL`: origin HTTPS của deployment.

API dùng HTTPS Data API nên Vercel không cần DATABASE_URL hoặc service-role key. DATABASE_URL chỉ dùng local cho migration và kiểm thử database. DATABASE_POOLER_URL là tùy chọn nếu môi trường chạy migration không kết nối được direct IPv6.

Supabase Dashboard > Authentication > URL Configuration: đặt Site URL thành origin HTTPS production, thêm redirect URL đúng origin production và `http://127.0.0.1:3000/` khi phát triển local. Email confirmation quay về trang chủ, không có route `/auth/callback` trong luồng hiện tại. Sau đổi env public cần redeploy. Framework Next.js, build `npm run build`.

## Kiểm tra

- `npm run db:migrate`: áp dụng migration có thể chạy lại.
- `npm run test:database`: thực sự kiểm tra tạo/cập nhật, revision cũ, RLS giữa hai user, quyền anonymous và cấm update trực tiếp. Fixtures nằm trong transaction và rollback.
- `npm run check:backend`: kiểm tra endpoint Auth, không chứng minh toàn bộ luồng đăng nhập.
- `npm test`, `npm run typecheck`, `npm run build`.

Đăng ký/xác nhận email và nhập journal thực tế cần người dùng thao tác bằng email của mình. Không tự tạo tài khoản thật cho người dùng trong quá trình kiểm thử.

## Chưa chuyển sang server

Chia sẻ hiện vẫn dùng snapshot trong URL hash và file PNG/HTML; chưa có share snapshot lưu DB, thời hạn hoặc thu hồi link. Chưa có upload ảnh/bucket attachment, kết nối broker, import CSV. Không cần cấu hình bucket để dùng journal hiện tại.

Tham khảo: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
