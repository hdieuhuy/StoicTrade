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

## Phạm vi hiện tại

Ảnh biểu đồ và link server đã triển khai ở migration 002 bên dưới. PNG/HTML và link hash cũ tiếp tục dùng được. Chưa có kết nối broker hoặc nhập CSV.

Tham khảo: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Ảnh biểu đồ, link server và phân tích (migration 002)

Đã thêm migration `002_media_sharing.sql`; lệnh db:migrate chạy các file SQL theo thứ tự và có thể chạy lại. Session pooler URI được lưu riêng trong `.env.local`, không cần đưa lên Vercel. Bucket cố định `trade-attachments` đã đặt private và có RLS theo thư mục user_id.

- `GET /api/attachments?tradeId=…`: danh sách ảnh của người đăng nhập, URL ký hạn 5 phút.
- `POST /api/attachments`: multipart `tradeId`, `stage` (before/after), `file`. Chỉ nhận PNG/JPEG/WebP tối đa 3 MB, kiểm tra file thật, giới hạn 24 megapixel, chuyển WebP tối đa 2560×2560, bỏ EXIF. Chỉ gắn vào giao dịch đã lưu. Giao diện cho tối đa 12 ảnh/lệnh.
- `PATCH /api/attachments/:id`: `{note, annotations}`; tối đa 2.000 ký tự ghi chú, 30 marker. Marker `{id,x,y,text}` dùng tọa độ % 0–100 và nội dung tối đa 200 ký tự.
- `DELETE /api/attachments/:id`: xóa tệp và thông tin ảnh của chủ sở hữu. Giao diện có bước xác nhận.
- `GET /api/shares`: 100 link mới nhất của người đăng nhập.
- `POST /api/shares`: `{snapshot,theme,days}` với hạn 1/7/30/90 ngày. Chỉ lưu các trường snapshot công khai đã whitelist, không lấy toàn bộ journal.
- `GET /api/shares/:token`: công khai, chỉ trả snapshot/theme/hạn nếu token còn hiệu lực. Không có quyền SELECT bảng gốc cho anonymous. Token UUID ngẫu nhiên.
- `DELETE /api/shares/:token`: chủ sở hữu thu hồi link. Đường dẫn xem là `/journey/?share=TOKEN`.

API ảnh và quản lý share xác minh Bearer token; phản hồi no-store. Dùng `sharp` trên Node runtime, không cần service-role. Không cần env mới trên Vercel. Link công khai dùng origin của website đang mở; tạo trên production để gửi người khác.

Ảnh được đính kèm khi mở sửa giao dịch đã lưu. Ghi chú ảnh lưu độc lập bằng nút “Lưu ghi chú ảnh”; không nằm trong nút lưu journal. URL ảnh hết hạn cần bấm tải lại ảnh; chỉ chủ sở hữu có thể tạo URL mới. Bất kỳ ai đã có URL ký đều có thể dùng URL đó đến lúc hết hạn; không đưa URL ảnh vào báo cáo chia sẻ.

Ảnh, annotation và share lưu ở bảng/bucket riêng, **không có trong backup JSON của journal**. Khôi phục/thay thế journal không xóa tệp ảnh trên Storage. Ảnh của một trade ID chỉ hiển thị nếu giao dịch đó còn trong journal; xóa giao dịch không tự xóa ảnh vì còn chức năng hoàn tác. Cần quy trình dọn tệp mồ côi/backup media riêng khi muốn quản lý vòng đời lâu dài.

Link server không tự cập nhật khi sửa journal. Thu hồi/hết hạn chặn request mới; không xóa bản PNG/HTML hoặc nội dung người nhận đã tải. Các link hash cũ vẫn hoạt động theo cơ chế trước và không thể thu hồi.

Phân tích nhóm chỉ tính lệnh đã đóng, cùng bộ lọc tài khoản/thời gian trên workspace. Phân nhóm theo mã, setup, khung 8 giờ, ngày mở lệnh và khoảng thời gian giữ lệnh; có net P&L, win rate, profit factor, expectancy và thời gian giữ trung bình. Chuỗi theo thời điểm đóng, hòa ngắt chuỗi. Các timestamp datetime-local hiện không có offset: được hiểu theo giờ tường đã nhập, không tự chuyển múi giờ; timestamp có Z/offset chuyển được theo timezone chọn. Độ dài giữ lệnh của timestamp không offset tính theo chênh lệch giờ tường, có thể khác thời gian thực khi qua DST. Chưa dùng lịch phiên chính thức/giờ nghỉ của từng sàn.

`npm run test:features` yêu cầu bản build chạy ở `http://127.0.0.1:3107` (đổi qua `TEST_APP_ORIGIN`). Lệnh tạo hai auth fixture email example.invalid bằng DB, không gửi email; test upload/ghi chú/phân quyền/link và tự dọn tài khoản/tệp sau khi hoàn tất. Không chạy đồng thời trên cùng test fixture. `npm run test:database` mở rộng kiểm tra RLS/thu hồi/hết hạn với transaction rollback.
