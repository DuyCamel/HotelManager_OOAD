/*
TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C6
Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
Chạy sau 001/002 trên SQL Server thật; đối chiếu FK, số lượng, tiền, điểm và các trạng thái đang ở/chờ cọc/cần dọn.
Bổ sung kịch bản cùng ngày/gia hạn/ngày lễ tương ứng seed JSON; không thêm dữ liệu cá nhân hoặc tài khoản ngân hàng thật.
Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
*/
/* 03_seed.sql
   DỮ LIỆU GIẢ CHO KIỂM THỬ — chạy sau 001 và 002.
   104 tài khoản, 120 hồ sơ khách, 60 phòng, 240 phiếu đặt, 160 phiếu thuê,
   150 hóa đơn và các giao dịch/chi tiết/sổ điểm/nhật ký tương ứng.
   Mật khẩu ứng dụng mọi tài khoản demo: mk1233456 (KHÔNG phải mật khẩu login SQL).
   PBKDF2WithHmacSHA256 120000 vòng, salt:hash Base64 tương thích Passwords.java.
   Hash demo dùng 4 salt khác nhau để kiểm thử; tài khoản thật luôn dùng salt ngẫu nhiên tại Node.js.
   Ngày tương đối theo máy SQL Server để luôn có quá hạn/chờ cọc/đang ở/tương lai.
   Rerun có marker, không nhân đôi; DB có dữ liệu khác thì dừng, không xóa/ghi đè.
   Không DISABLE TRIGGER, không NOCHECK, không sửa dữ liệu thật.
*/
USE [HotelManager_OOAD_Web];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo=11)
    THROW 51300,N'Phải chạy 001 và 002 thành công trước khi seed.',1;
GO
IF EXISTS(SELECT 1 FROM dbo.SeedHistory WHERE SeedName='hotel-web-demo-v2')
    PRINT N'003 đã chạy trước đó; giữ nguyên dữ liệu và thao tác thử của nhóm.';
ELSE
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @LockResult int;
 EXEC @LockResult=sys.sp_getapplock @Resource=N'HotelManager.SeedDemo',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @LockResult<0 THROW 51301,N'Đang có người chèn dữ liệu mẫu, hãy thử lại.',1;
 IF EXISTS(SELECT 1 FROM dbo.SeedHistory WHERE SeedName='hotel-web-demo-v2')
   THROW 51302,N'Dữ liệu mẫu vừa được tạo bởi phiên khác, hãy chạy lại để xem thống kê.',1;
 IF EXISTS(SELECT 1 FROM dbo.Account) OR EXISTS(SELECT 1 FROM dbo.Room) OR EXISTS(SELECT 1 FROM dbo.Booking)
   THROW 51303,N'CSDL đã có dữ liệu ngoài seed. Không ghi đè; dùng CSDL trống hoặc sao lưu và tự kiểm tra.',1;
 DECLARE @Today date=CONVERT(date,SYSUTCDATETIME()),@Now datetime2(0)=SYSUTCDATETIME();
 DECLARE @Numbers TABLE(n int NOT NULL PRIMARY KEY);
 ;WITH d AS(SELECT n FROM(VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) x(n))
 INSERT @Numbers(n) SELECT a.n+10*b.n+100*c.n+1 FROM d a CROSS JOIN d b CROSS JOIN d c WHERE a.n+10*b.n+100*c.n<300;
 -- Tài khoản: admin, manager, reception, housekeeping, customer và các tài khoản phụ.
 INSERT dbo.Account(AccountId,PasswordHash,FullName,Email,Phone,RoleCode,IsActive)
 VALUES
 (N'TK01',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Quản trị viên',N'admin@hotel.test',N'0909000000',N'ADMIN',1),
 (N'TK02',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Quản lý chính',N'manager@hotel.test',N'0909000001',N'MANAGER',1),
 (N'TK03',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Lễ tân chính',N'reception@hotel.test',N'0909000002',N'RECEPTIONIST',1),
 (N'TK04',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Buồng phòng chính',N'housekeeping@hotel.test',N'0909000003',N'HOUSEKEEPER',1),
 (N'TK_M02',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Quản lý 2',N'manager02@hotel.test',N'0909000004',N'MANAGER',1),
 (N'TK_M03',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Quản lý 3',N'manager03@hotel.test',N'0909000005',N'MANAGER',1),
 (N'TK_R02',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Lễ tân 2',N'reception02@hotel.test',N'0909000006',N'RECEPTIONIST',1),
 (N'TK_R03',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Lễ tân 3',N'reception03@hotel.test',N'0909000007',N'RECEPTIONIST',1),
 (N'TK_R04',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Lễ tân 4',N'reception04@hotel.test',N'0909000008',N'RECEPTIONIST',1),
 (N'TK_R05',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Lễ tân 5',N'reception05@hotel.test',N'0909000009',N'RECEPTIONIST',1),
 (N'TK_R06',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Lễ tân 6',N'reception06@hotel.test',N'0909000010',N'RECEPTIONIST',1),
 (N'TK_R07',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Lễ tân 7',N'reception07@hotel.test',N'0909000011',N'RECEPTIONIST',1),
 (N'TK_R08',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Lễ tân 8',N'reception08@hotel.test',N'0909000012',N'RECEPTIONIST',1),
 (N'TK_R09',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Lễ tân 9',N'reception09@hotel.test',N'0909000013',N'RECEPTIONIST',1),
 (N'TK_R10',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Lễ tân 10',N'reception10@hotel.test',N'0909000014',N'RECEPTIONIST',1),
 (N'TK_R11',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Lễ tân 11',N'reception11@hotel.test',N'0909000015',N'RECEPTIONIST',1),
 (N'TK_R12',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Lễ tân 12',N'reception12@hotel.test',N'0909000016',N'RECEPTIONIST',1),
 (N'TK_H02',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Buồng phòng 2',N'housekeeping02@hotel.test',N'0909000017',N'HOUSEKEEPER',1),
 (N'TK_H03',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Buồng phòng 3',N'housekeeping03@hotel.test',N'0909000018',N'HOUSEKEEPER',1),
 (N'TK_H04',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Buồng phòng 4',N'housekeeping04@hotel.test',N'0909000019',N'HOUSEKEEPER',1),
 (N'TK_H05',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Buồng phòng 5',N'housekeeping05@hotel.test',N'0909000020',N'HOUSEKEEPER',1),
 (N'TK_H06',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Buồng phòng 6',N'housekeeping06@hotel.test',N'0909000021',N'HOUSEKEEPER',1),
 (N'TK_H07',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Buồng phòng 7',N'housekeeping07@hotel.test',N'0909000022',N'HOUSEKEEPER',1),
 (N'TK_H08',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Buồng phòng 8',N'housekeeping08@hotel.test',N'0909000023',N'HOUSEKEEPER',1),
 (N'TK_C001',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 001',N'customer@hotel.test',N'0918000001',N'CUSTOMER',1),
 (N'TK_C002',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 002',N'customer002@hotel.test',N'0918000002',N'CUSTOMER',1),
 (N'TK_C003',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 003',N'customer003@hotel.test',N'0918000003',N'CUSTOMER',1),
 (N'TK_C004',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 004',N'customer004@hotel.test',N'0918000004',N'CUSTOMER',1),
 (N'TK_C005',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 005',N'customer005@hotel.test',N'0918000005',N'CUSTOMER',1),
 (N'TK_C006',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 006',N'customer006@hotel.test',N'0918000006',N'CUSTOMER',1),
 (N'TK_C007',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 007',N'customer007@hotel.test',N'0918000007',N'CUSTOMER',1),
 (N'TK_C008',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 008',N'customer008@hotel.test',N'0918000008',N'CUSTOMER',1),
 (N'TK_C009',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 009',N'customer009@hotel.test',N'0918000009',N'CUSTOMER',1),
 (N'TK_C010',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 010',N'customer010@hotel.test',N'0918000010',N'CUSTOMER',1),
 (N'TK_C011',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 011',N'customer011@hotel.test',N'0918000011',N'CUSTOMER',1),
 (N'TK_C012',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 012',N'customer012@hotel.test',N'0918000012',N'CUSTOMER',1),
 (N'TK_C013',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 013',N'customer013@hotel.test',N'0918000013',N'CUSTOMER',1),
 (N'TK_C014',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 014',N'customer014@hotel.test',N'0918000014',N'CUSTOMER',1),
 (N'TK_C015',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 015',N'customer015@hotel.test',N'0918000015',N'CUSTOMER',1),
 (N'TK_C016',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 016',N'customer016@hotel.test',N'0918000016',N'CUSTOMER',1),
 (N'TK_C017',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 017',N'customer017@hotel.test',N'0918000017',N'CUSTOMER',1),
 (N'TK_C018',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 018',N'customer018@hotel.test',N'0918000018',N'CUSTOMER',1),
 (N'TK_C019',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 019',N'customer019@hotel.test',N'0918000019',N'CUSTOMER',1),
 (N'TK_C020',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 020',N'customer020@hotel.test',N'0918000020',N'CUSTOMER',1),
 (N'TK_C021',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 021',N'customer021@hotel.test',N'0918000021',N'CUSTOMER',1),
 (N'TK_C022',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 022',N'customer022@hotel.test',N'0918000022',N'CUSTOMER',1),
 (N'TK_C023',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 023',N'customer023@hotel.test',N'0918000023',N'CUSTOMER',1),
 (N'TK_C024',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 024',N'customer024@hotel.test',N'0918000024',N'CUSTOMER',1),
 (N'TK_C025',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 025',N'customer025@hotel.test',N'0918000025',N'CUSTOMER',1),
 (N'TK_C026',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 026',N'customer026@hotel.test',N'0918000026',N'CUSTOMER',1),
 (N'TK_C027',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 027',N'customer027@hotel.test',N'0918000027',N'CUSTOMER',1),
 (N'TK_C028',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 028',N'customer028@hotel.test',N'0918000028',N'CUSTOMER',1),
 (N'TK_C029',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 029',N'customer029@hotel.test',N'0918000029',N'CUSTOMER',1),
 (N'TK_C030',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 030',N'customer030@hotel.test',N'0918000030',N'CUSTOMER',1),
 (N'TK_C031',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 031',N'customer031@hotel.test',N'0918000031',N'CUSTOMER',1),
 (N'TK_C032',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 032',N'customer032@hotel.test',N'0918000032',N'CUSTOMER',1),
 (N'TK_C033',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 033',N'customer033@hotel.test',N'0918000033',N'CUSTOMER',1),
 (N'TK_C034',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 034',N'customer034@hotel.test',N'0918000034',N'CUSTOMER',1),
 (N'TK_C035',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 035',N'customer035@hotel.test',N'0918000035',N'CUSTOMER',1),
 (N'TK_C036',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 036',N'customer036@hotel.test',N'0918000036',N'CUSTOMER',1),
 (N'TK_C037',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 037',N'customer037@hotel.test',N'0918000037',N'CUSTOMER',1),
 (N'TK_C038',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 038',N'customer038@hotel.test',N'0918000038',N'CUSTOMER',1),
 (N'TK_C039',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 039',N'customer039@hotel.test',N'0918000039',N'CUSTOMER',1),
 (N'TK_C040',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 040',N'customer040@hotel.test',N'0918000040',N'CUSTOMER',1),
 (N'TK_C041',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 041',N'customer041@hotel.test',N'0918000041',N'CUSTOMER',1),
 (N'TK_C042',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 042',N'customer042@hotel.test',N'0918000042',N'CUSTOMER',1),
 (N'TK_C043',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 043',N'customer043@hotel.test',N'0918000043',N'CUSTOMER',1),
 (N'TK_C044',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 044',N'customer044@hotel.test',N'0918000044',N'CUSTOMER',1),
 (N'TK_C045',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 045',N'customer045@hotel.test',N'0918000045',N'CUSTOMER',1),
 (N'TK_C046',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 046',N'customer046@hotel.test',N'0918000046',N'CUSTOMER',1),
 (N'TK_C047',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 047',N'customer047@hotel.test',N'0918000047',N'CUSTOMER',1),
 (N'TK_C048',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 048',N'customer048@hotel.test',N'0918000048',N'CUSTOMER',1),
 (N'TK_C049',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 049',N'customer049@hotel.test',N'0918000049',N'CUSTOMER',1),
 (N'TK_C050',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 050',N'customer050@hotel.test',N'0918000050',N'CUSTOMER',1),
 (N'TK_C051',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 051',N'customer051@hotel.test',N'0918000051',N'CUSTOMER',1),
 (N'TK_C052',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 052',N'customer052@hotel.test',N'0918000052',N'CUSTOMER',1),
 (N'TK_C053',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 053',N'customer053@hotel.test',N'0918000053',N'CUSTOMER',1),
 (N'TK_C054',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 054',N'customer054@hotel.test',N'0918000054',N'CUSTOMER',1),
 (N'TK_C055',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 055',N'customer055@hotel.test',N'0918000055',N'CUSTOMER',1),
 (N'TK_C056',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 056',N'customer056@hotel.test',N'0918000056',N'CUSTOMER',1),
 (N'TK_C057',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 057',N'customer057@hotel.test',N'0918000057',N'CUSTOMER',1),
 (N'TK_C058',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 058',N'customer058@hotel.test',N'0918000058',N'CUSTOMER',1),
 (N'TK_C059',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 059',N'customer059@hotel.test',N'0918000059',N'CUSTOMER',1),
 (N'TK_C060',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 060',N'customer060@hotel.test',N'0918000060',N'CUSTOMER',1),
 (N'TK_C061',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 061',N'customer061@hotel.test',N'0918000061',N'CUSTOMER',1),
 (N'TK_C062',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 062',N'customer062@hotel.test',N'0918000062',N'CUSTOMER',1),
 (N'TK_C063',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 063',N'customer063@hotel.test',N'0918000063',N'CUSTOMER',1),
 (N'TK_C064',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 064',N'customer064@hotel.test',N'0918000064',N'CUSTOMER',1),
 (N'TK_C065',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 065',N'customer065@hotel.test',N'0918000065',N'CUSTOMER',1),
 (N'TK_C066',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 066',N'customer066@hotel.test',N'0918000066',N'CUSTOMER',1),
 (N'TK_C067',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 067',N'customer067@hotel.test',N'0918000067',N'CUSTOMER',1),
 (N'TK_C068',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 068',N'customer068@hotel.test',N'0918000068',N'CUSTOMER',1),
 (N'TK_C069',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 069',N'customer069@hotel.test',N'0918000069',N'CUSTOMER',1),
 (N'TK_C070',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 070',N'customer070@hotel.test',N'0918000070',N'CUSTOMER',1),
 (N'TK_C071',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 071',N'customer071@hotel.test',N'0918000071',N'CUSTOMER',1),
 (N'TK_C072',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 072',N'customer072@hotel.test',N'0918000072',N'CUSTOMER',1),
 (N'TK_C073',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 073',N'customer073@hotel.test',N'0918000073',N'CUSTOMER',1),
 (N'TK_C074',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 074',N'customer074@hotel.test',N'0918000074',N'CUSTOMER',1),
 (N'TK_C075',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 075',N'customer075@hotel.test',N'0918000075',N'CUSTOMER',1),
 (N'TK_C076',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 076',N'customer076@hotel.test',N'0918000076',N'CUSTOMER',1),
 (N'TK_C077',N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Khách trực tuyến 077',N'customer077@hotel.test',N'0918000077',N'CUSTOMER',0),
 (N'TK_C078',N'DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Khách trực tuyến 078',N'customer078@hotel.test',N'0918000078',N'CUSTOMER',0),
 (N'TK_C079',N'ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Khách trực tuyến 079',N'customer079@hotel.test',N'0918000079',N'CUSTOMER',0),
 (N'TK_C080',N'S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách trực tuyến 080',N'customer080@hotel.test',N'0918000080',N'CUSTOMER',0);

 -- Hồ sơ độc lập tài khoản; 40 khách tại quầy không có tài khoản online.
 INSERT dbo.Customer(CustomerId,FullName,Phone,IdentityNo,Address,AccountId,IsActive)
 SELECT 'KH'+RIGHT('000'+CONVERT(varchar(3),n),3),
        CHOOSE(1+(n-1)%10,N'Nguyễn Minh Anh',N'Trần Quốc Bảo',N'Lê Ngọc Hà',N'Phạm Gia Huy',N'Hoàng Thu Linh',N'Vũ Đức Minh',N'Đặng Khánh Ngân',N'Bùi Thanh Phong',N'Đỗ Phương Thảo',N'Hồ Nhật Nam')+N' '+CONVERT(nvarchar(3),n),
        '0918'+RIGHT('000000'+CONVERT(varchar(6),n),6),
        '079900'+RIGHT('000000'+CONVERT(varchar(6),n),6),
        CHOOSE(1+(n-1)%6,N'TP. Hồ Chí Minh',N'Hà Nội',N'Đà Nẵng',N'Cần Thơ',N'Đà Lạt',N'Hải Phòng')+N' — địa chỉ giả phục vụ kiểm thử',
        CASE WHEN n<=80 THEN 'TK_C'+RIGHT('000'+CONVERT(varchar(3),n),3) END,
        CASE WHEN n>116 THEN 0 ELSE 1 END
 FROM @Numbers WHERE n<=120;
 INSERT dbo.RoomType(RoomTypeId,Name,Capacity,Beds,HourlyPrice,NightlyPrice,DailyPrice,Amenities) VALUES
 ('STD',N'Standard',2,1,120000,400000,550000,N'Wi-Fi, TV, nước suối'),
 ('SUP',N'Superior',2,1,150000,500000,650000,N'Wi-Fi, TV, bàn làm việc'),
 ('DLX',N'Deluxe',3,2,180000,650000,850000,N'Ban công, Wi-Fi, minibar'),
 ('TWN',N'Deluxe Twin',4,2,220000,800000,1000000,N'Hai giường đôi, Wi-Fi, minibar'),
 ('FAM',N'Family',4,2,260000,1100000,1400000,N'Phòng gia đình, minibar, ban công'),
 ('STE',N'Suite',6,3,400000,1700000,2200000,N'Bồn tắm, phòng khách, minibar');
 INSERT dbo.Room(RoomId,Name,RoomTypeId,StatusCode,ImagePath,Note)
 SELECT 'P'+CONVERT(varchar(3),100+n),N'Phòng '+CONVERT(nvarchar(3),100+n),
        CHOOSE(1+(n-1)/10,'STD','SUP','DLX','TWN','FAM','STE'),
        CASE WHEN n>=51 THEN 'OCCUPIED' WHEN n BETWEEN 41 AND 45 THEN 'DIRTY'
             WHEN n BETWEEN 46 AND 48 THEN 'MAINTENANCE' WHEN n BETWEEN 49 AND 50 THEN 'DISABLED' ELSE 'AVAILABLE' END,
        'assets/rooms/P'+CONVERT(varchar(3),100+n)+'.jpg',
        CASE WHEN n BETWEEN 46 AND 48 THEN N'Đang kiểm tra thiết bị' WHEN n BETWEEN 49 AND 50 THEN N'Tạm ngừng hoạt động' ELSE N'Dữ liệu mẫu' END
 FROM @Numbers WHERE n<=60;
 INSERT dbo.HotelService(ServiceId,Name,Description,UnitName,Price,IsActive) VALUES
 ('DV001',N'Nước suối minibar',N'Danh mục minibar, không quản lý tồn kho',N'Chai',20000,1),
 ('DV002',N'Nước ngọt minibar',N'Danh mục minibar',N'Lon',35000,1),
 ('DV003',N'Bánh snack minibar',N'Danh mục minibar',N'Gói',40000,1),
 ('DV004',N'Giặt ủi',N'Giặt sấy quần áo',N'Kg',50000,1),
 ('DV005',N'Ăn sáng',N'Phần ăn sáng',N'Phần',120000,1),
 ('DV006',N'Đón sân bay',N'Một chiều',N'Chuyến',350000,1),
 ('DV007',N'Tiễn sân bay',N'Một chiều',N'Chuyến',350000,1),
 ('DV008',N'Spa',N'Gói 60 phút',N'Lượt',450000,1),
 ('DV009',N'Thuê xe máy',N'Thuê theo ngày',N'Ngày',150000,1),
 ('DV010',N'Thuê xe đạp',N'Thuê theo ngày',N'Ngày',80000,1),
 ('DV011',N'Giường phụ',N'Theo đêm',N'Đêm',250000,1),
 ('DV012',N'Trái cây',N'Giỏ trái cây',N'Giỏ',180000,1),
 ('DV013',N'Trang trí sinh nhật',N'Gói cơ bản',N'Gói',500000,1),
 ('DV014',N'Trang trí kỷ niệm',N'Gói cơ bản',N'Gói',650000,1),
 ('DV015',N'Đồ ăn tại phòng',N'Phục vụ tận phòng',N'Phần',160000,1),
 ('DV016',N'Cà phê',N'Cà phê pha máy',N'Ly',55000,1),
 ('DV017',N'Trà',N'Trà nóng',N'Ấm',60000,1),
 ('DV018',N'Gửi hành lý',N'Gửi trong ngày',N'Lượt',30000,1),
 ('DV019',N'Dịch vụ cũ A',N'Đã ngừng cung cấp',N'Lượt',70000,0),
 ('DV020',N'Dịch vụ cũ B',N'Đã ngừng cung cấp',N'Lượt',90000,0);
 INSERT dbo.RoomTypeService(RoomTypeId,ServiceId,IsIncluded)
 SELECT t.RoomTypeId,s.ServiceId,CASE WHEN s.ServiceId='DV001' THEN 1 ELSE 0 END
 FROM dbo.RoomType t CROSS JOIN dbo.HotelService s WHERE s.ServiceId IN ('DV001','DV002','DV003','DV005');
 INSERT dbo.HolidayRate(HolidayRateId,Name,RoomTypeId,StartDate,EndDate,IncreasePercent)
 SELECT 'GL'+RIGHT('00'+CONVERT(varchar(2),n.n),2)+'_'+t.RoomTypeId,
        N'Đợt giá mẫu '+CONVERT(nvarchar(2),n.n),t.RoomTypeId,
        DATEADD(DAY,CHOOSE(n.n,-60,-30,15,45),@Today),
        DATEADD(DAY,CHOOSE(n.n,-58,-28,17,47),@Today),CHOOSE(n.n,10,15,25,30)
 FROM @Numbers n CROSS JOIN dbo.RoomType t WHERE n.n<=4;
 INSERT dbo.Membership(MembershipId,CustomerId,IsActive,IssuedAt)
 SELECT 'TV'+RIGHT('000'+CONVERT(varchar(3),n),3),'KH'+RIGHT('000'+CONVERT(varchar(3),n),3),
        CASE WHEN n<=76 THEN 1 ELSE 0 END,DATEADD(DAY,-120,@Now)
 FROM @Numbers WHERE n<=80;
 -- Một nguồn hình học dữ liệu, dùng lại để giữ các bảng con khớp nhau.
 DECLARE @SeedBooking TABLE(n int PRIMARY KEY,BookingId varchar(20),CustomerId varchar(20),RoomId varchar(20),StartAt datetime2(0),EndAt datetime2(0),StatusCode varchar(20),RoomCharge decimal(18,2),Deposit decimal(18,2),CreatedAt datetime2(0),HoldUntil datetime2(0));
 INSERT @SeedBooking(n,BookingId,CustomerId,RoomId,StartAt,EndAt,StatusCode,RoomCharge,Deposit,CreatedAt,HoldUntil)
 SELECT n,'DP'+RIGHT('0000'+CONVERT(varchar(4),n),4),
        -- Khách lưu trữ 117..120 chỉ có phiếu lịch sử; phiếu còn hoạt động dùng khách 1..116.
        'KH'+RIGHT('000'+CONVERT(varchar(3),CASE WHEN n BETWEEN 211 AND 230 THEN 1+(n-211)%76 WHEN n<=180 THEN 1+(n-1)%120 ELSE 1+(n-1)%116 END),3),
        'P'+CONVERT(varchar(3),100+CASE WHEN n<=150 THEN 1+(n-1)%60 WHEN n<=180 THEN n-150 WHEN n<=210 THEN n-180 WHEN n<=230 THEN n-190 ELSE n-180 END),
        DATEADD(HOUR,14,CONVERT(datetime2(0),DATEADD(DAY,
          CASE WHEN n<=150 THEN -65+((n-1)/60)*20+(n-1)%20 WHEN n<=180 THEN 25 WHEN n<=210 THEN 3 WHEN n<=230 THEN 10 ELSE -1 END,@Today))),
        DATEADD(HOUR,12,CONVERT(datetime2(0),DATEADD(DAY,
          CASE WHEN n<=150 THEN -65+((n-1)/60)*20+(n-1)%20+1+(n%5) WHEN n<=180 THEN 27 WHEN n<=210 THEN 5 WHEN n<=230 THEN 12 ELSE 2 END,@Today))),
        CASE WHEN n<=150 THEN 'COMPLETED' WHEN n<=180 THEN 'CANCELLED' WHEN n<=210 THEN 'CONFIRMED' WHEN n<=230 THEN 'PENDING' ELSE 'CHECKED_IN' END,
        0,0,
        CASE WHEN n BETWEEN 211 AND 220 THEN DATEADD(MINUTE,-60,@Now) WHEN n BETWEEN 221 AND 230 THEN DATEADD(MINUTE,-5,@Now) ELSE DATEADD(DAY,-100,@Now) END,
        CASE WHEN n BETWEEN 211 AND 220 THEN DATEADD(MINUTE,-30,@Now) WHEN n BETWEEN 221 AND 230 THEN DATEADD(MINUTE,25,@Now) ELSE DATEADD(MINUTE,30,DATEADD(DAY,-100,@Now)) END
 FROM @Numbers WHERE n<=240;
 UPDATE @SeedBooking SET RoomCharge=dbo.fn_QuoteRoom(RoomId,StartAt,EndAt);
 UPDATE @SeedBooking SET Deposit=CASE WHEN StatusCode IN ('COMPLETED','CONFIRMED','CHECKED_IN') THEN ROUND(RoomCharge*0.3,0) ELSE 0 END;
 INSERT dbo.Booking(BookingId,CustomerId,RoomId,StartAt,EndAt,GuestCount,StatusCode,ChannelCode,RoomCharge,DepositAmount,HoldUntil,CreatedAt,CreatedBy)
 SELECT b.BookingId,b.CustomerId,b.RoomId,b.StartAt,b.EndAt,1+(b.n%t.Capacity),b.StatusCode,
        CASE WHEN b.StatusCode IN ('PENDING','CANCELLED') OR (b.n%2=0 AND c.AccountId IS NOT NULL) THEN 'ONLINE' ELSE 'COUNTER' END,b.RoomCharge,b.Deposit,b.HoldUntil,b.CreatedAt,
        CASE WHEN b.n%2=0 AND c.AccountId IS NOT NULL THEN c.AccountId ELSE 'TK03' END
 FROM @SeedBooking b JOIN dbo.Room r ON r.RoomId=b.RoomId JOIN dbo.RoomType t ON t.RoomTypeId=r.RoomTypeId JOIN dbo.Customer c ON c.CustomerId=b.CustomerId;
 INSERT dbo.Stay(StayId,BookingId,RoomId,IdentityNo,CheckInAt,CheckOutAt,RoomCharge,Surcharge,CreatedBy)
 SELECT 'PT'+RIGHT('0000'+CONVERT(varchar(4),b.n),4),b.BookingId,b.RoomId,c.IdentityNo,b.StartAt,
        CASE WHEN b.StatusCode='COMPLETED' THEN b.EndAt END,b.RoomCharge,CASE WHEN b.n%10=0 THEN 100000 ELSE 0 END,'TK03'
 FROM @SeedBooking b JOIN dbo.Customer c ON c.CustomerId=b.CustomerId WHERE b.StatusCode IN ('COMPLETED','CHECKED_IN');
 INSERT dbo.StayRoomHistory(StayId,RoomId,FromAt,ToAt,ExtraCharge) SELECT StayId,RoomId,CheckInAt,CheckOutAt,Surcharge FROM dbo.Stay;
 -- Tạo nháp -> dòng chi tiết -> giao dịch -> PAID; không vượt qua kiểm tra SQL.
 INSERT dbo.Invoice(InvoiceId,StayId,CustomerId,IssuedAt,RoomCharge,ServiceCharge,Surcharge,DiscountAmount,DepositAmount,PaymentMethod,CreatedBy)
 SELECT 'HD'+RIGHT('0000'+CONVERT(varchar(4),b.n),4),s.StayId,b.CustomerId,s.CheckOutAt,b.RoomCharge,
        CASE WHEN b.n%3=0 THEN 90000 ELSE 0 END,s.Surcharge,CASE WHEN b.n%15=0 THEN 50000 ELSE 0 END,
        b.Deposit,CHOOSE(1+b.n%3,'CASH','TRANSFER','CARD'),'TK03'
 FROM @SeedBooking b JOIN dbo.Stay s ON s.BookingId=b.BookingId WHERE b.StatusCode='COMPLETED';
 INSERT dbo.InvoiceLine(InvoiceId,LineType,Description,Quantity,UnitPrice)
 SELECT InvoiceId,'ROOM',N'Tiền phòng theo giá đã chốt',1,RoomCharge FROM dbo.Invoice;
 INSERT dbo.InvoiceLine(InvoiceId,LineType,ServiceId,Description,Quantity,UnitPrice)
 SELECT InvoiceId,'SERVICE','DV001',N'Nước suối minibar',2,20000 FROM dbo.Invoice WHERE ServiceCharge>0;
 INSERT dbo.InvoiceLine(InvoiceId,LineType,ServiceId,Description,Quantity,UnitPrice)
 SELECT InvoiceId,'SERVICE','DV004',N'Giặt ủi',1,50000 FROM dbo.Invoice WHERE ServiceCharge>0;
 INSERT dbo.InvoiceLine(InvoiceId,LineType,Description,Quantity,UnitPrice)
 SELECT InvoiceId,'SURCHARGE',N'Phụ thu lưu trú mẫu',1,Surcharge FROM dbo.Invoice WHERE Surcharge>0;
 INSERT dbo.Payment(PaymentId,BookingId,PaymentKind,Amount,MethodCode,ExternalReference,PaidAt,CreatedBy)
 SELECT 'GD_COC_'+RIGHT('0000'+CONVERT(varchar(4),n),4),BookingId,'DEPOSIT',Deposit,'TRANSFER',
        'DEMO-DEP-'+CONVERT(varchar(4),n),DATEADD(MINUTE,5,CreatedAt),'TK03' FROM @SeedBooking WHERE Deposit>0;
 INSERT dbo.Payment(PaymentId,InvoiceId,PaymentKind,Amount,MethodCode,ExternalReference,PaidAt,CreatedBy)
 SELECT 'GD_TT_'+InvoiceId,InvoiceId,'SETTLEMENT',AmountDue,PaymentMethod,
        'DEMO-PAY-'+InvoiceId,IssuedAt,'TK03' FROM dbo.Invoice;
 UPDATE dbo.Invoice SET StatusCode='PAID'; -- Trigger tự ghi sổ và cộng điểm, có chống lặp.
 INSERT dbo.HousekeepingTask(TaskId,RoomId,StayId,CheckoutAt,DeadlineAt,CompletedAt,StatusCode,AssignedTo)
 SELECT 'DD_'+s.StayId,s.RoomId,s.StayId,s.CheckOutAt,DATEADD(MINUTE,90,s.CheckOutAt),DATEADD(MINUTE,45,s.CheckOutAt),'DONE','TK04'
 FROM dbo.Stay s WHERE s.CheckOutAt IS NOT NULL;
 INSERT dbo.HousekeepingTask(TaskId,RoomId,CheckoutAt,DeadlineAt,StatusCode,AssignedTo)
 SELECT 'DD_OPEN_'+CONVERT(varchar(3),140+n),'P'+CONVERT(varchar(3),140+n),
        DATEADD(MINUTE,CASE WHEN n<=3 THEN -120 ELSE -30 END,@Now),
        DATEADD(MINUTE,CASE WHEN n<=3 THEN -30 ELSE 60 END,@Now),'OPEN','TK04'
 FROM @Numbers WHERE n<=5;
 INSERT dbo.HousekeepingTask(TaskId,RoomId,CheckoutAt,DeadlineAt,StatusCode,AssignedTo)
 SELECT 'DD_FIX_'+CONVERT(varchar(3),145+n),'P'+CONVERT(varchar(3),145+n),DATEADD(HOUR,-3,@Now),DATEADD(MINUTE,-90,@Now),'MAINTENANCE','TK04'
 FROM @Numbers WHERE n<=3;
 INSERT dbo.DamageReport(DamageReportId,RoomId,TaskId,Description,PhotoPath,ReportedAt,ReportedBy)
 SELECT 'HH'+RIGHT('00'+CONVERT(varchar(2),n),2),'P'+CONVERT(varchar(3),146+(n-1)%3),
        'DD_FIX_'+CONVERT(varchar(3),146+(n-1)%3),
        CHOOSE(1+(n-1)%3,N'Điều hòa không làm lạnh',N'Vòi nước bị rò rỉ',N'Khóa cửa cần kiểm tra'),
        'DEMO_ONLY/damage-'+CONVERT(varchar(2),n)+'.jpg',DATEADD(MINUTE,-n,@Now),'TK04'
 FROM @Numbers WHERE n<=6;
 -- 20 dòng dịch vụ của 10 phiếu đang ở; thêm một dòng đã hủy để thử giao diện.
 INSERT dbo.ServiceUsage(UsageId,StayId,ServiceId,Quantity,UnitPrice,UsedAt,RecordedBy)
 SELECT 'SD'+s.StayId+'_'+v.Code,s.StayId,v.ServiceId,v.Qty,h.Price,@Now,'TK03'
 FROM dbo.Stay s CROSS JOIN(VALUES('A','DV001',2),('B','DV004',1))v(Code,ServiceId,Qty)
 JOIN dbo.HotelService h ON h.ServiceId=v.ServiceId WHERE s.CheckOutAt IS NULL;
 INSERT dbo.ServiceUsage(UsageId,StayId,ServiceId,Quantity,UnitPrice,UsedAt,RecordedBy,IsVoided)
 SELECT TOP(1) 'SD_VOID',StayId,'DV001',1,20000,@Now,'TK03',1 FROM dbo.Stay WHERE CheckOutAt IS NULL ORDER BY StayId;
 INSERT dbo.HotelSetting(SettingId,HotelName,Address,Hotline,CheckInTime,CheckOutTime,LateFeeFrom,LateFeePercent,BankCode,BankAccount,BankOwner)
 VALUES(1,N'Aurora Hotel',N'Địa chỉ giả — TP. Hồ Chí Minh','0281234567','14:00','12:00','13:00',30,'DEMO','0000000000',N'TÀI KHOẢN MẪU KHÔNG GIAO DỊCH');
 INSERT dbo.BackupHistory(BackupId,FilePath,BackupAt,CreatedBy,StatusCode,Note)
 SELECT 'BK_DEMO_'+CONVERT(varchar(2),n),'DEMO_ONLY/not-a-real-backup-'+CONVERT(varchar(2),n)+'.bak',DATEADD(DAY,-n,@Now),'TK01','DEMO',N'Metadata giả, không có tệp backup để khôi phục'
 FROM @Numbers WHERE n<=5;
 INSERT dbo.AuditEvent(EventAt,ActorId,ActionName,ObjectType,ObjectId,Detail)
 SELECT b.CreatedAt,b.CreatedBy,N'Tạo phiếu mẫu','BOOKING',b.BookingId,N'Dữ liệu giả, không phải giao dịch thật' FROM dbo.Booking b;
 INSERT dbo.AuditEvent(EventAt,ActorId,ActionName,ObjectType,ObjectId,Detail)
 SELECT i.IssuedAt,'TK03',N'Thanh toán mẫu','INVOICE',i.InvoiceId,N'Đã có chứng từ cọc và tất toán mẫu' FROM dbo.Invoice i;
 INSERT dbo.AuditEvent(EventAt,ActorId,ActionName,ObjectType,ObjectId,Detail)
 SELECT h.CompletedAt,'TK04',N'Dọn xong mẫu','ROOM',h.RoomId,h.TaskId FROM dbo.HousekeepingTask h WHERE h.StatusCode='DONE';
 -- Các hậu điều kiện chặn commit nếu dữ liệu sinh ra sai; không chỉ kiểm số lượng.
 IF (SELECT COUNT(*) FROM dbo.Booking)<>240 OR (SELECT COUNT(*) FROM dbo.Invoice WHERE StatusCode='PAID')<>150
   THROW 51304,N'Số lượng dữ liệu mẫu không như dự kiến.',1;
 IF EXISTS(SELECT 1 FROM dbo.Membership m OUTER APPLY(SELECT SUM(Points) p FROM dbo.MembershipPointEntry x WHERE x.MembershipId=m.MembershipId) x WHERE m.Points<>ISNULL(x.p,0))
   THROW 51305,N'Điểm thẻ không khớp sổ điểm.',1;
 IF EXISTS(SELECT 1 FROM dbo.Invoice i OUTER APPLY(SELECT SUM(LineAmount) Total FROM dbo.InvoiceLine l WHERE l.InvoiceId=i.InvoiceId) x WHERE x.Total<>i.RoomCharge+i.ServiceCharge+i.Surcharge)
   THROW 51306,N'Tổng dòng hóa đơn không khớp.',1;
 INSERT dbo.SeedHistory(SeedName) VALUES('hotel-web-demo-v2');
 COMMIT TRANSACTION;
 PRINT N'003 hoàn tất. Mọi dữ liệu cá nhân/giao dịch/đường dẫn ảnh/ngân hàng đều là giả.';
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
-- Kết quả kiểm tra: đối chiếu README để biết tình huống có sẵn.
SELECT N'Tài khoản' Entity,COUNT_BIG(*) [RowCount] FROM dbo.Account
UNION ALL SELECT N'Khách hàng',COUNT_BIG(*) FROM dbo.Customer
UNION ALL SELECT N'Phòng',COUNT_BIG(*) FROM dbo.Room
UNION ALL SELECT N'Dịch vụ',COUNT_BIG(*) FROM dbo.HotelService
UNION ALL SELECT N'Phiếu đặt',COUNT_BIG(*) FROM dbo.Booking
UNION ALL SELECT N'Phiếu thuê',COUNT_BIG(*) FROM dbo.Stay
UNION ALL SELECT N'Hóa đơn',COUNT_BIG(*) FROM dbo.Invoice
UNION ALL SELECT N'Dòng hóa đơn',COUNT_BIG(*) FROM dbo.InvoiceLine
UNION ALL SELECT N'Dịch vụ sử dụng',COUNT_BIG(*) FROM dbo.ServiceUsage
UNION ALL SELECT N'Giao dịch',COUNT_BIG(*) FROM dbo.Payment
UNION ALL SELECT N'Nhật ký',COUNT_BIG(*) FROM dbo.AuditEvent;
SELECT StatusCode,COUNT_BIG(*) CountRows FROM dbo.Booking GROUP BY StatusCode;
SELECT StatusCode,COUNT_BIG(*) CountRows FROM dbo.Room GROUP BY StatusCode;
SELECT TierName,COUNT_BIG(*) CountRows FROM dbo.v_Membership GROUP BY TierName;
SELECT TOP(10) * FROM dbo.v_RoomBoard WHERE StatusCode IN ('DIRTY','MAINTENANCE') ORDER BY RoomId;
SELECT TOP(10) * FROM dbo.v_DailyRevenue ORDER BY RevenueDate DESC;
GO
