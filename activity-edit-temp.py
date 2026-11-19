from pathlib import Path
p=Path('F:/GitHub/HotelManager_OOADs/.kilo/worktrees/occipital-burn/docs/baocao/Baocaotong.md')
s=p.read_text(encoding='utf-8'); a,c=s.split('# CHƯƠNG 4.',1); c,z=c.split('# CHƯƠNG 5.',1)
r={
'Lựa chọn hợp lệ theo quyền':'Thao tác và quyền ghi danh mục',
'giá và sức chứa hợp lệ':'giá đêm nguyên 1..10^12, sức chứa/giường nguyên 1–20',
'không giảm sức chứa trái nhu cầu booking':'sức chứa mới không thấp hơn số khách của booking hoạt động thuộc loại này',
'Đủ điều kiện theo thao tác?':'Có quyền clean; dọn thì phòng DIRTY không có phân công mở của stay đang ở; báo hỏng thì phòng không OCCUPIED/DISABLED, mô tả 1–1000 ký tự và ảnh đã tải png/jpg?',
'Yêu cầu hợp lệ và tải thành công?':'Có quyền màn hình, tiêu chí thuộc bộ lọc màn hình hỗ trợ và server trả dữ liệu không lỗi?',
'Kiểm tra định dạng, độ dài, chính sách mật khẩu và xác nhận khớp':'Kiểm tra họ tên 1–120 ký tự, email tối đa 254 có dạng tên@miền.hậu_tố, điện thoại 9–14 chữ số có thể bắt đầu +; mật khẩu 8–200 ký tự và xác nhận trùng khớp',
'| D2 | Decision | Dữ liệu hợp lệ?':'| D2 | Decision | Họ tên/email/điện thoại đúng giới hạn A2, mật khẩu 8–200 ký tự và xác nhận khớp?',
'Được phép đăng nhập và thông tin khớp?':'Chưa bị giới hạn thử, email tìm thấy tài khoản hoạt động và mật khẩu đối chiếu băm khớp?',
'OTP hợp lệ?':'Mã OTP khớp đúng requestId/người chuyển/phiên/người nhận, chưa quá 5 phút và chưa hết 5 lượt thử?',
'Đọc hợp lệ và thành công?':'Người xem là Quản lý, tiêu chí dùng các trường lọc hiện có và truy vấn trả kết quả không lỗi?',
'| D3 | Decision | Dữ liệu hợp lệ?':'| D3 | Decision | Các trường đạt giới hạn A3, tỷ lệ 0–100%, đủ hoặc trống cả bộ ngân hàng và QR nội bộ chỉ khi đủ ngân hàng?',
'| D3 | Decision | Yêu cầu hợp lệ?':'| D3 | Decision | Người gửi là Quản lý và xác nhận đúng SAO LUU?',
'Chọn hồ sơ để lưu trữ; xem điều kiện không còn booking/stay/hóa đơn dang dở':'Chọn hồ sơ hoạt động; kiểm tra không còn booking hoạt động chưa hết hạn, stay chưa checkout hoặc hóa đơn khác PAID',
'Kiểm tra dữ liệu, giấy tờ không trùng và điều kiện từng thao tác;':'Kiểm tra quyền customers; thêm/sửa: tên 1–120, điện thoại 9–14 chữ số có thể có +, giấy tờ tối đa 30 không trùng, địa chỉ tối đa 512, sửa cần hồ sơ hoạt động; lưu trữ kiểm tra lại A4;',
'Đã có phiên khách hợp lệ?':'Phiên còn hiệu lực, tài khoản CUSTOMER hoạt động và phiên bản xác thực khớp?',
'Có phiên khách hợp lệ sau bước đăng nhập?':'Sau đăng nhập có phiên còn hiệu lực của CUSTOMER hoạt động, phiên bản xác thực khớp?',
'| D3 | Decision | Kết quả tìm phòng | [hợp lệ và có phòng] → A4; [hợp lệ và không có phòng] → A8; [không hợp lệ hoặc tải lỗi] → A8 |':'| D3 | Decision | Ngày nhận không trước hôm nay, ngày trả sau ngày nhận, khách nguyên 1–20 và truy vấn không lỗi? | [có và còn phòng đủ sức chứa, không trùng lịch] → A4; [có nhưng không còn phòng] → A8; [không] → A8 |',
'Đủ điều kiện tạo phiếu?':'Hồ sơ thuộc tài khoản đang hoạt động, phòng/loại tồn tại, sức chứa đủ, phòng không MAINTENANCE/DISABLED, không trùng lịch booking/phân công đang ở và tính được giá?',
'| D2 | Decision | Dữ liệu chung hợp lệ? | [có] → D3; [không] → A7 |':'| D2 | Decision | Có quyền bookings, hồ sơ hoạt động, ngày nhận không trước hôm nay/ngày trả sau ngày nhận, khách nguyên 1–20 không vượt sức chứa, phòng không MAINTENANCE/DISABLED không trùng lịch, cọc nguyên 1..tiền phòng? | [có] → D3; [không] → A7 |',
'| D4 | Decision | Thao tác đã chọn có đủ điều kiện ghi? | [đã chọn cọc và cọc hợp lệ: nhân viên đủ quyền, PENDING cọc 0 còn hạn, chưa có Payment cọc, dữ liệu nhận tiền đủ] → A5; [đã chọn hủy và hủy hợp lệ] → D5; [mọi trường hợp còn lại] → A8 |':'| D4 | Decision | Yêu cầu đã chọn sau đọc lại trạng thái | [cọc] → D8; [hủy] → D5; [khác] → A8 |\n| D8 | Decision | Có quyền bookings, PENDING cọc 0 còn hạn, chưa có Payment cọc, cọc nguyên 1..tiền phòng, method CASH/TRANSFER/CARD, receiptConfirmed=true và TRANSFER/CARD có tham chiếu 1–100 ký tự? | [có] → A5; [không] → A8 |',
'| D5 | Decision | Loại hủy hợp lệ | [khách sở hữu, CONFIRMED, chưa quá 2 giờ từ lúc tạo] → A6; [khách sở hữu PENDING cọc 0 hoặc nhân viên đủ quyền hủy PENDING cọc 0/CONFIRMED] → A7 |':'| D5 | Decision | Vai trò, sở hữu và trạng thái cho phép hủy? | [khách sở hữu CONFIRMED, chưa quá 2 giờ từ tạo] → A6; [khách sở hữu PENDING cọc 0 hoặc nhân viên có quyền bookings với PENDING cọc 0/CONFIRMED] → A7; [còn lại] → A8 |',
'Điều kiện “hủy hợp lệ” tại D4':'Điều kiện hủy tại D5',
'Phòng khác đáp ứng điều kiện?':'Phòng khác đủ sức chứa, không trùng lịch min(now,startAt)..endAt sau loại booking này và tính được chênh lệch tăng?',
'| M2 | Merge | Phòng thực nhận đủ điều kiện |':'| M2 | Merge | Hợp nhánh cùng phòng hoặc khác phòng |',
'Giấy tờ của lượt nhận hợp lệ?':'Giấy tờ là chuỗi không rỗng sau trim, dài tối đa 30 ký tự?',
'Phương án hợp lệ?':'Stay chưa checkout, booking CHECKED_IN có phân công mở; phòng mới khác phòng cũ, AVAILABLE, đủ sức chứa, không trùng lịch đến ngày trả?',
'Tất cả điều kiện còn đúng và phụ thu khớp lần xem trước?':'Các kiểm tra stay/booking/phân công/phòng/sức chứa/lịch tại D1 vẫn đúng và phụ thu tính lại bằng lần xem trước?',
'Dữ liệu hợp lệ và mã mới không trùng?':'Tên 1–100 ký tự không trùng, loại tồn tại, mã 1–20 chỉ chữ/số/_/- chưa trùng, trạng thái AVAILABLE/MAINTENANCE/DISABLED và ảnh/mô tả đạt giới hạn danh mục?',
'Chuyển trạng thái hợp lệ và thành công?':'DRAFT đã thành PAID, dòng khớp tổng tiền, còn thu dương có khoản SETTLEMENT tương ứng và không lỗi trigger/ghi?',
'Hậu điều kiện finalize hợp lệ?':'Hóa đơn PAID và nếu có thẻ hoạt động thì đã có ledger của InvoiceId?',
'| D2 | Decision | Dữ liệu chung hợp lệ? | [có] → D3; [không] → A9 |':'| D2 | Decision | Stay chưa checkout, booking CHECKED_IN có phân công mở, ngày trả mới là ngày thật sau ngày trả cũ và tính được tiền phần tăng? | [có] → D3; [không] → A9 |',
'Phòng thay thế đáp ứng toàn bộ điều kiện?':'Phòng thay thế khác phòng cũ, AVAILABLE, đủ sức chứa, không trùng lịch now..ngày trả mới và tính được chênh lệch kỳ cũ còn lại?',
'Điều kiện từng thao tác hợp lệ?':'Có quyền stays, stay chưa checkout; ghi thì 1–50 dịch vụ không lặp, còn cung cấp/có cấu hình tính phí của phòng hiện tại, lượng nguyên 1–1000; hủy thì dòng tồn tại chưa hủy?',
'| D2 | Decision | Yêu cầu hợp lệ?':'| D2 | Decision | Có quyền stays, stay chưa checkout, tổng phụ thu nguyên 0..100.000.000 và lý do tối đa 200 ký tự hoặc dùng mặc định?',
'| D3 | Decision | Đủ điều kiện?':'| D3 | Decision | Sửa xong: quyền catalog, phòng hoặc công MAINTENANCE, không còn khách; dọn khẩn: quyền board và phòng DIRTY?',
'Thay đổi hợp lệ?':'Tài khoản hoạt động; sửa hồ sơ đúng giới hạn tên/điện thoại/giấy tờ/địa chỉ, giấy tờ không trùng; đổi mật khẩu thì mật khẩu cũ khớp, mới 8–200 ký tự và xác nhận khớp?',
'Bắt đầu lại thao tác khi còn phiên hợp lệ?':'Muốn thử lại và phiên còn hiệu lực với tài khoản hoạt động, phiên bản xác thực khớp?',
'Có yêu cầu thanh toán hợp lệ?':'Cọc: người gửi sở hữu/có quyền với PENDING cọc 0 còn hạn; tất toán: nhân viên có quyền, stay mở và bảng kê đối chiếu còn thu dương?',
'Đối chiếu nguồn thông báo, mã, tiền, trạng thái phiếu và dấu hiệu đã xử lý':'Kiểm tra nguồn thông báo đã xác thực, mã khớp yêu cầu, tiền khớp, phiếu còn chờ cọc hoặc stay còn mở; kiểm tra biên nhận đã xử lý',
'| D3 | Decision | Kết quả đối chiếu | [đã xử lý hợp lệ trước đó] → A5; [hợp lệ, chưa xử lý và là cọc] → A4; [hợp lệ, chưa xử lý và là tất toán] → A7; [còn lại] → A6 |':'| D3 | Decision | Kết quả kiểm tra nguồn, mã, tiền và trạng thái tại A3 | [đã có biên nhận và kết quả khớp] → A5; [các kiểm tra A3 khớp, chưa xử lý, là cọc] → A4; [các kiểm tra A3 khớp, chưa xử lý, là tất toán] → A7; [còn lại] → A6 |',
}
for old,new in r.items():
 assert old in c,old
 c=c.replace(old,new)
p.write_text(a+'# CHƯƠNG 4.'+c+'# CHƯƠNG 5.'+z,encoding='utf-8')
print('Clarified activity decisions throughout Chapter4.')
