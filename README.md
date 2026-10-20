# StoicTrade

Next.js App Router + React + TypeScript. Giao diện Glassmorphism với intro Inner Space.

## Chạy local

```sh
npm install
npm run dev
```

Mở http://127.0.0.1:3000. `npm run build` kiểm tra production; `npm test` kiểm tra phép tính và dữ liệu.

## Các chức năng đã có

- Intro quote, chuyển cảnh không gian 4,2 giây, bỏ qua/phát lại, hỗ trợ giảm chuyển động. Dải plasma và vòng sáng giữ animation liên tục; chuyển cảnh chỉ thay đổi transform/opacity, không blur hoặc scale dashboard. Chuyển cảnh chạy bằng Web Animations API; chỉ gỡ intro sau khi toàn bộ Animation.finished hoàn tất, không dùng timer để cắt cảnh. Hiệu ứng chỉ mờ ở cuối để giữ rõ các dải sáng khi mở cổng. Workspace được memo hóa để không dựng lại ở đầu chuyển cảnh.
- Prop Firm: quản lý nhiều tài khoản/giai đoạn, trạng thái, mục tiêu, giới hạn lỗ cố định/trailing/EOD, tùy chọn không giới hạn lỗ ngày, consistency, ngày tối thiểu, phí, thời hạn, múi giờ/giờ reset và equity nhập tay. Liên kết giao dịch bằng ID; sửa tên vẫn giữ liên kết. Không gỡ hồ sơ đang có lệnh. Quy tắc chưa đối chiếu được hiển thị chờ xác nhận.
- Chia sẻ hành trình: card tổng kết hoặc một lệnh, ba phối màu Canvas 1600×900, PNG/clipboard/native share, báo cáo HTML độc lập có bảng lệnh và biểu đồ, in PDF, link bản chụp `/journey/#...` nén và kiểm tra dữ liệu. Chọn ngày/tài khoản, tên hiển thị, lời nhắn, tùy chọn chi tiết/tên tài khoản/ghi chú.
- Font chính Be Vietnam Pro (Latin + tiếng Việt, nhúng qua Fontsource).
- Nhật ký có cột Date, Symbol, Buy/Sell Price, Buy/Sell Time, Direction, Size, Net P&L và Action. Lệnh Sell đảo ánh xạ mở/đóng đúng theo hướng. Thời gian hỗ trợ giây. Có thể nhập Net P&L từ báo cáo (không trừ phí hai lần); SL tùy chọn, thiếu SL thì không có R.
- Nhật ký: thêm/sửa/xóa lệnh, Long/Short, mở/đóng, tài khoản, thời gian, giá, SL ban đầu, khối lượng, hệ số hợp đồng, phí, setup, tâm lý, ghi chú và tuân thủ.
- Tự tính P&L ròng, R, tỷ lệ thắng, expectancy, Profit Factor và drawdown.
- Dashboard và biểu đồ dùng dữ liệu thực đã nhập; bộ lọc thời gian/tài khoản, lịch P&L.
- Playbook tạo/sửa; đổi tên setup cập nhật các lệnh liên quan.
- Tổng kết tâm lý theo ngày và checklist kỷ luật.
- Công cụ tính khối lượng và cảnh báo vượt ngân sách rủi ro khi nhập lệnh.
- Thiết lập vốn tham chiếu, % rủi ro và mục tiêu quy trình.
- Xuất CSV giao dịch, sao lưu/khôi phục toàn bộ dữ liệu bằng JSON có kiểm tra định dạng và xác nhận thay thế.

## Dữ liệu và cách tính


Toàn bộ giá trị tiền dùng USD. Hệ số hợp đồng được nhập theo sản phẩm: giá trị USD của một đơn vị biến động giá cho một đơn vị khối lượng. P&L = (giá thoát − giá vào) × hướng × khối lượng × hệ số − phí. R = P&L ròng / rủi ro SL ban đầu. Lệnh mở chưa đóng không được tính vào lợi nhuận.

Drawdown tính từ đỉnh P&L của kỳ đang lọc; % dùng vốn tham chiếu. Các giá trị không thay thế số dư đối soát của sàn. Công cụ khối lượng chưa tính phí, trượt giá và bước khối lượng.

## Chưa triển khai

ảnh biểu đồ, chốt từng phần, nhập CSV theo từng sàn, kết nối broker, nạp/rút và quy đổi đa tiền tệ, trang hành trình công khai. Cần lựa chọn hạ tầng và nền tảng giao dịch để triển khai các phần này chính xác.

## Prop Firm

Hồ sơ prop nằm trong `propAccounts`; dữ liệu/bản sao lưu v1 cũ không có trường này được nâng cấp thành danh sách rỗng. CSV có thêm `propFirmId`. JSON chứa toàn bộ hồ sơ và liên kết.

Tiến độ tính từ giao dịch liên kết mở từ ngày bắt đầu; nếu chưa biết ngày bắt đầu và quy tắc chưa xác nhận, có thể để ngày trống. Chỉ giao dịch đã đóng mới có P&L. Ngày giao dịch đếm theo phiên mở lệnh tại múi giờ và giờ reset đã chọn. Mỗi giai đoạn nên có hồ sơ riêng.

Lỗ tổng cố định dựa trên vốn ban đầu; trailing thường theo đỉnh số dư đã chốt; trailing EOD chỉ nâng đỉnh sau khi phiên kết thúc. Có thể cấu hình trần sàn trailing. Ngân sách lỗ ngày theo % vốn ban đầu hoặc % số dư đầu phiên; 0 nghĩa là không đặt giới hạn. Cảnh báo ghi nhận lần chạm sàn tại các điểm đóng lệnh, kể cả sau đó hồi phục. Không có lịch sử equity thời gian thực. Equity nhập tay chỉ dùng nếu mới hơn lần đóng lệnh gần nhất. Consistency theo ngày lời lớn nhất / tổng lợi nhuận ròng; không tự chuyển trạng thái chính thức sang passed.

Quy tắc phải được đối chiếu với chương trình thực tế. Hỗ trợ trạng thái chờ xác nhận để không hiển thị cảnh báo từ các giá trị gợi ý. Nguồn tham khảo chương trình The Legends Trading: https://thelegendstrading.com/ (Apprentice và Elite 50K có quy tắc khác nhau; không tự chọn gói cho người dùng).

## Chia sẻ hành trình

Card và báo cáo dùng dữ liệu đang có, không tự thêm dữ liệu minh họa. AVG REALIZED R là trung bình R thực tế của các lệnh có SL, không phải tỷ lệ Risk/Reward dự kiến. Lệnh mở không đóng góp P&L.

PNG xuất bằng Canvas sau khi font tải xong; cùng một canvas dùng cho xem trước và file tải. HTML là báo cáo độc lập không cần máy chủ, không tải tài nguyên bên ngoài, có nút In / Lưu PDF. Native Share và clipboard phụ thuộc trình duyệt và quyền của thiết bị; luôn có nút tải file thay thế.

Snapshot chỉ gồm thông tin đã chọn. Mặc định ẩn tên tài khoản và ghi chú từng lệnh; không xuất ID, liên kết prop firm, vốn, thiết lập hoặc nhật ký tâm lý. Tên tài khoản chỉ đưa vào khi chọn hiển thị; ghi chú cần bật riêng. Báo cáo ghi rõ số liệu tự ghi chép chưa xác minh. Link chứa snapshot trong URL hash, không ghi nhật ký vào server; không tự cập nhật và không thu hồi được bản đã gửi. Link giới hạn 24 KB ký tự mã hóa; dữ liệu lớn cần file HTML. Giải nén giới hạn 500 KB và nội dung được kiểm tra trước khi hiển thị.

Ở localhost, link chỉ hoạt động trên thiết bị chạy ứng dụng. Dùng file PNG/HTML khi gửi sang thiết bị khác. Để link hoạt động công khai cần triển khai website lên tên miền truy cập được.

## Chuẩn bị backend

Xem [BACKEND_SETUP.md](./BACKEND_SETUP.md) để biết cấu hình env, thông tin còn thiếu và API, migration, Auth và cách nhập dữ liệu cũ lên Supabase. `.env.local` chứa cấu hình riêng và được Git bỏ qua; `.env.example` là bản mẫu không có secret. Backend đã kết nối Supabase: đăng nhập để tải/lưu qua API; migration và RLS đã được áp dụng.


## Lưu trữ cloud

Journal, prop firm, playbook, tổng kết và thiết lập lưu trong Supabase qua API xác thực. Đăng ký/xác nhận email rồi đăng nhập. Nếu có nhật ký cũ trên trình duyệt, dùng banner “Xem & nhập lên cloud” và sao lưu trước khi thay thế. Xem BACKEND_SETUP.md để biết schema JSONB, revision, giới hạn 2 MB và cấu hình Vercel.

## Quyết định về form giao dịch

Khi tạo lệnh mới, dùng thông tin của form giao dịch được lưu gần nhất (kể cả sau chỉnh sửa). `lastTradeFormId` lưu cùng journal trên Supabase; bản sao lưu cũ không có trường này dùng giao dịch đầu danh sách. Giữ các thông tin khác, gồm mã tài sản, tài khoản/prop, hướng, trạng thái, SL, hệ số, phí, Net P&L nhập tay, setup, tâm lý, checklist và ghi chú. Người dùng kiểm tra trước khi lưu. Không tái sử dụng ID, Buy/Sell Time, Buy/Sell Price hoặc Size: thời gian để trống, giá và size để trống trên form và bắt buộc nhập lại. Sửa giao dịch hiện có vẫn mở đầy đủ giá trị của chính giao dịch đó. Thay đổi chưa lưu hoặc form bị hủy không trở thành mặc định. Modal nhập lệnh rộng tối đa 1100px, ba cột desktop, hai cột tablet và một cột mobile.
