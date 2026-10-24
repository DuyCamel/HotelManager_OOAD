/*
TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C1, B1, B2, B6
Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
P0: đồng bộ fn_QuoteRoom và procedure đặt/nhận/đổi phòng với ngày địa phương, giờ trả 12:00 và khung 12:00–14:00 hiện ở JS.
Phối hợp TV2 bổ sung gia hạn/ràng buộc liên quan; nghiệm thu lịch trùng, dòng hóa đơn, chứng từ và sổ điểm bằng SSMS.
Giữ schema publication guard, ràng buộc bất biến và AuthVersion; không tắt trigger để chạy cho qua lỗi.
Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
*/
/* 02_programmability.sql
   KHÓA NGOẠI, CHECK, UNIQUE, INDEX, TRIGGER, FUNCTION, VIEW, PROCEDURE.
   SQL Server 2019+. Chạy sau 001. Chạy lại được, không tắt trigger/ràng buộc.
   Trigger xử lý inserted/deleted theo tập hợp (kể cả INSERT/UPDATE nhiều dòng).
   UPDLOCK + HOLDLOCK bảo vệ kiểm tra khoảng thời gian; nếu deadlock 1205, client
   rollback và thử lại toàn bộ nghiệp vụ, không thử lại từng câu lệnh rời.
   Quyền/phiên/OTP do backend xác thực; các @ActorId không thay thế xác thực.
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
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo=10)
    THROW 51000, N'Phải chạy 001 trước.', 1;
DELETE dbo.SchemaVersion WHERE VersionNo=11; -- Chỉ công bố lại sau khi xác minh toàn bộ object.
GO
-- CHECK/FK được thêm trong một transaction; WITH CHECK kiểm tra cả dữ liệu đã có.
BEGIN TRY
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Account_Role' AND parent_object_id=OBJECT_ID(N'dbo.Account'))
    ALTER TABLE dbo.[Account] WITH CHECK ADD CONSTRAINT [CK_Account_Role] CHECK (RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST','HOUSEKEEPER','CUSTOMER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Account_Contact' AND parent_object_id=OBJECT_ID(N'dbo.Account'))
    ALTER TABLE dbo.[Account] WITH CHECK ADD CONSTRAINT [CK_Account_Contact] CHECK (LEN(FullName)>0 AND Email LIKE N'%_@_%._%' AND Phone NOT LIKE '%[^0-9+]%' AND LEN(Phone) BETWEEN 9 AND 15);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Account_Hash' AND parent_object_id=OBJECT_ID(N'dbo.Account'))
    ALTER TABLE dbo.[Account] WITH CHECK ADD CONSTRAINT [CK_Account_Hash] CHECK (LEN(PasswordHash)>=60 AND CHARINDEX(':',PasswordHash)>1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Customer_NamePhone' AND parent_object_id=OBJECT_ID(N'dbo.Customer'))
    ALTER TABLE dbo.[Customer] WITH CHECK ADD CONSTRAINT [CK_Customer_NamePhone] CHECK (LEN(LTRIM(RTRIM(FullName)))>0 AND LEN(Phone) BETWEEN 9 AND 15 AND Phone NOT LIKE '%[^0-9+]%');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Customer_Identity' AND parent_object_id=OBJECT_ID(N'dbo.Customer'))
    ALTER TABLE dbo.[Customer] WITH CHECK ADD CONSTRAINT [CK_Customer_Identity] CHECK (IdentityNo IS NULL OR LEN(LTRIM(RTRIM(IdentityNo)))>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_RoomType_Values' AND parent_object_id=OBJECT_ID(N'dbo.RoomType'))
    ALTER TABLE dbo.[RoomType] WITH CHECK ADD CONSTRAINT [CK_RoomType_Values] CHECK (Capacity BETWEEN 1 AND 20 AND Beds BETWEEN 1 AND 20 AND HourlyPrice>0 AND NightlyPrice>0 AND DailyPrice>0 AND LEN(Name)>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Room_Status' AND parent_object_id=OBJECT_ID(N'dbo.Room'))
    ALTER TABLE dbo.[Room] WITH CHECK ADD CONSTRAINT [CK_Room_Status] CHECK (StatusCode IN ('AVAILABLE','OCCUPIED','DIRTY','MAINTENANCE','DISABLED'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Room_Name' AND parent_object_id=OBJECT_ID(N'dbo.Room'))
    ALTER TABLE dbo.[Room] WITH CHECK ADD CONSTRAINT [CK_Room_Name] CHECK (LEN(LTRIM(RTRIM(Name)))>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HotelService_Price' AND parent_object_id=OBJECT_ID(N'dbo.HotelService'))
    ALTER TABLE dbo.[HotelService] WITH CHECK ADD CONSTRAINT [CK_HotelService_Price] CHECK (Price>0 AND LEN(Name)>0 AND LEN(UnitName)>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HolidayRate_Range' AND parent_object_id=OBJECT_ID(N'dbo.HolidayRate'))
    ALTER TABLE dbo.[HolidayRate] WITH CHECK ADD CONSTRAINT [CK_HolidayRate_Range] CHECK (StartDate<=EndDate AND IncreasePercent BETWEEN 0 AND 1000);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Membership_Points' AND parent_object_id=OBJECT_ID(N'dbo.Membership'))
    ALTER TABLE dbo.[Membership] WITH CHECK ADD CONSTRAINT [CK_Membership_Points] CHECK (Points>=0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Range' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Range] CHECK (StartAt<EndAt AND DATEDIFF(DAY,StartAt,EndAt)<=3660);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Amount' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Amount] CHECK (RoomCharge>0 AND DepositAmount>=0 AND DepositAmount<=RoomCharge AND RoomCharge=FLOOR(RoomCharge) AND DepositAmount=FLOOR(DepositAmount));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Status' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Status] CHECK (StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Channel' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Channel] CHECK (ChannelCode IN ('ONLINE','COUNTER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_StateDeposit' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_StateDeposit] CHECK ((StatusCode IN ('PENDING','CANCELLED') AND DepositAmount=0) OR (StatusCode IN ('CONFIRMED','CHECKED_IN','COMPLETED') AND DepositAmount>0));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Hold' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Hold] CHECK (HoldUntil>CreatedAt);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Booking_Guests' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [CK_Booking_Guests] CHECK (GuestCount>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Stay_Time' AND parent_object_id=OBJECT_ID(N'dbo.Stay'))
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT [CK_Stay_Time] CHECK (CheckOutAt IS NULL OR CheckOutAt>=CheckInAt);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Stay_Values' AND parent_object_id=OBJECT_ID(N'dbo.Stay'))
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT [CK_Stay_Values] CHECK (RoomCharge>0 AND Surcharge>=0 AND LEN(IdentityNo)>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_StayRoomHistory_Time' AND parent_object_id=OBJECT_ID(N'dbo.StayRoomHistory'))
    ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT [CK_StayRoomHistory_Time] CHECK ((ToAt IS NULL OR ToAt>=FromAt) AND ExtraCharge>=0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Invoice_Amounts' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [CK_Invoice_Amounts] CHECK (RoomCharge>0 AND ServiceCharge>=0 AND Surcharge>=0 AND DiscountAmount>=0 AND DepositAmount>=0 AND RoomCharge+ServiceCharge+Surcharge>=DiscountAmount+DepositAmount);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Invoice_Status' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [CK_Invoice_Status] CHECK (StatusCode IN ('DRAFT','PAID'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Invoice_Method' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [CK_Invoice_Method] CHECK (PaymentMethod IN ('CASH','TRANSFER','CARD'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_InvoiceLine_Values' AND parent_object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT [CK_InvoiceLine_Values] CHECK (Quantity>0 AND UnitPrice>=0 AND LEN(Description)>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_InvoiceLine_Kind' AND parent_object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT [CK_InvoiceLine_Kind] CHECK (LineType IN ('ROOM','SERVICE','SURCHARGE'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_InvoiceLine_ServiceRef' AND parent_object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT [CK_InvoiceLine_ServiceRef] CHECK ((LineType='SERVICE' AND ServiceId IS NOT NULL) OR (LineType<>'SERVICE' AND ServiceId IS NULL));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Payment_KindLink' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [CK_Payment_KindLink] CHECK ((PaymentKind='DEPOSIT' AND BookingId IS NOT NULL AND InvoiceId IS NULL AND Amount>0) OR (PaymentKind='SETTLEMENT' AND InvoiceId IS NOT NULL AND BookingId IS NULL AND Amount>=0));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Payment_Method' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [CK_Payment_Method] CHECK (MethodCode IN ('CASH','TRANSFER','CARD'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Payment_Reference' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [CK_Payment_Reference] CHECK (ExternalReference IS NULL OR LEN(LTRIM(RTRIM(ExternalReference)))>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_MembershipPointEntry_Points' AND parent_object_id=OBJECT_ID(N'dbo.MembershipPointEntry'))
    ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT [CK_MembershipPointEntry_Points] CHECK (Points>=0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HousekeepingTask_Deadline' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [CK_HousekeepingTask_Deadline] CHECK (DeadlineAt=DATEADD(MINUTE,90,CheckoutAt));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HousekeepingTask_Status' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [CK_HousekeepingTask_Status] CHECK (StatusCode IN ('OPEN','DONE','MAINTENANCE'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HousekeepingTask_Completion' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [CK_HousekeepingTask_Completion] CHECK ((StatusCode='DONE' AND CompletedAt IS NOT NULL AND CompletedAt>=CheckoutAt) OR (StatusCode IN ('OPEN','MAINTENANCE') AND CompletedAt IS NULL));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_DamageReport_Text' AND parent_object_id=OBJECT_ID(N'dbo.DamageReport'))
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT [CK_DamageReport_Text] CHECK (LEN(LTRIM(RTRIM(Description)))>0 AND LEN(LTRIM(RTRIM(PhotoPath)))>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HotelSetting_OneRow' AND parent_object_id=OBJECT_ID(N'dbo.HotelSetting'))
    ALTER TABLE dbo.[HotelSetting] WITH CHECK ADD CONSTRAINT [CK_HotelSetting_OneRow] CHECK (SettingId=1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HotelSetting_LateFee' AND parent_object_id=OBJECT_ID(N'dbo.HotelSetting'))
    ALTER TABLE dbo.[HotelSetting] WITH CHECK ADD CONSTRAINT [CK_HotelSetting_LateFee] CHECK (LateFeeFrom>=CheckOutTime AND LateFeePercent BETWEEN 0 AND 1000);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_HotelSetting_Text' AND parent_object_id=OBJECT_ID(N'dbo.HotelSetting'))
    ALTER TABLE dbo.[HotelSetting] WITH CHECK ADD CONSTRAINT [CK_HotelSetting_Text] CHECK (LEN(HotelName)>0 AND LEN(Hotline) BETWEEN 9 AND 15);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_BackupHistory_Status' AND parent_object_id=OBJECT_ID(N'dbo.BackupHistory'))
    ALTER TABLE dbo.[BackupHistory] WITH CHECK ADD CONSTRAINT [CK_BackupHistory_Status] CHECK (StatusCode IN ('SUCCESS','FAILED','DEMO'));
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Customer_AccountId' AND parent_object_id=OBJECT_ID(N'dbo.Customer'))
    ALTER TABLE dbo.[Customer] WITH CHECK ADD CONSTRAINT [FK_Customer_AccountId] FOREIGN KEY([AccountId]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Room_RoomTypeId' AND parent_object_id=OBJECT_ID(N'dbo.Room'))
    ALTER TABLE dbo.[Room] WITH CHECK ADD CONSTRAINT [FK_Room_RoomTypeId] FOREIGN KEY([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_RoomTypeService_RoomTypeId' AND parent_object_id=OBJECT_ID(N'dbo.RoomTypeService'))
    ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT [FK_RoomTypeService_RoomTypeId] FOREIGN KEY([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_RoomTypeService_ServiceId' AND parent_object_id=OBJECT_ID(N'dbo.RoomTypeService'))
    ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT [FK_RoomTypeService_ServiceId] FOREIGN KEY([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HolidayRate_RoomTypeId' AND parent_object_id=OBJECT_ID(N'dbo.HolidayRate'))
    ALTER TABLE dbo.[HolidayRate] WITH CHECK ADD CONSTRAINT [FK_HolidayRate_RoomTypeId] FOREIGN KEY([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Membership_CustomerId' AND parent_object_id=OBJECT_ID(N'dbo.Membership'))
    ALTER TABLE dbo.[Membership] WITH CHECK ADD CONSTRAINT [FK_Membership_CustomerId] FOREIGN KEY([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Booking_CustomerId' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [FK_Booking_CustomerId] FOREIGN KEY([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Booking_RoomId' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [FK_Booking_RoomId] FOREIGN KEY([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Booking_CreatedBy' AND parent_object_id=OBJECT_ID(N'dbo.Booking'))
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT [FK_Booking_CreatedBy] FOREIGN KEY([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Stay_BookingId' AND parent_object_id=OBJECT_ID(N'dbo.Stay'))
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT [FK_Stay_BookingId] FOREIGN KEY([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Stay_RoomId' AND parent_object_id=OBJECT_ID(N'dbo.Stay'))
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT [FK_Stay_RoomId] FOREIGN KEY([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Stay_CreatedBy' AND parent_object_id=OBJECT_ID(N'dbo.Stay'))
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT [FK_Stay_CreatedBy] FOREIGN KEY([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_StayRoomHistory_StayId' AND parent_object_id=OBJECT_ID(N'dbo.StayRoomHistory'))
    ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT [FK_StayRoomHistory_StayId] FOREIGN KEY([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_StayRoomHistory_RoomId' AND parent_object_id=OBJECT_ID(N'dbo.StayRoomHistory'))
    ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT [FK_StayRoomHistory_RoomId] FOREIGN KEY([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Invoice_StayId' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [FK_Invoice_StayId] FOREIGN KEY([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Invoice_CustomerId' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [FK_Invoice_CustomerId] FOREIGN KEY([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Invoice_CreatedBy' AND parent_object_id=OBJECT_ID(N'dbo.Invoice'))
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT [FK_Invoice_CreatedBy] FOREIGN KEY([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_InvoiceLine_InvoiceId' AND parent_object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT [FK_InvoiceLine_InvoiceId] FOREIGN KEY([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_InvoiceLine_ServiceId' AND parent_object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT [FK_InvoiceLine_ServiceId] FOREIGN KEY([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Payment_BookingId' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [FK_Payment_BookingId] FOREIGN KEY([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Payment_InvoiceId' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [FK_Payment_InvoiceId] FOREIGN KEY([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_Payment_CreatedBy' AND parent_object_id=OBJECT_ID(N'dbo.Payment'))
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT [FK_Payment_CreatedBy] FOREIGN KEY([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_MembershipPointEntry_InvoiceId' AND parent_object_id=OBJECT_ID(N'dbo.MembershipPointEntry'))
    ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT [FK_MembershipPointEntry_InvoiceId] FOREIGN KEY([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_MembershipPointEntry_MembershipId' AND parent_object_id=OBJECT_ID(N'dbo.MembershipPointEntry'))
    ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT [FK_MembershipPointEntry_MembershipId] FOREIGN KEY([MembershipId]) REFERENCES dbo.[Membership]([MembershipId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HousekeepingTask_RoomId' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [FK_HousekeepingTask_RoomId] FOREIGN KEY([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HousekeepingTask_StayId' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [FK_HousekeepingTask_StayId] FOREIGN KEY([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_HousekeepingTask_AssignedTo' AND parent_object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT [FK_HousekeepingTask_AssignedTo] FOREIGN KEY([AssignedTo]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DamageReport_RoomId' AND parent_object_id=OBJECT_ID(N'dbo.DamageReport'))
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT [FK_DamageReport_RoomId] FOREIGN KEY([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DamageReport_TaskId' AND parent_object_id=OBJECT_ID(N'dbo.DamageReport'))
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT [FK_DamageReport_TaskId] FOREIGN KEY([TaskId]) REFERENCES dbo.[HousekeepingTask]([TaskId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DamageReport_ReportedBy' AND parent_object_id=OBJECT_ID(N'dbo.DamageReport'))
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT [FK_DamageReport_ReportedBy] FOREIGN KEY([ReportedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_BackupHistory_CreatedBy' AND parent_object_id=OBJECT_ID(N'dbo.BackupHistory'))
    ALTER TABLE dbo.[BackupHistory] WITH CHECK ADD CONSTRAINT [FK_BackupHistory_CreatedBy] FOREIGN KEY([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_AuditEvent_ActorId' AND parent_object_id=OBJECT_ID(N'dbo.AuditEvent'))
    ALTER TABLE dbo.[AuditEvent] WITH CHECK ADD CONSTRAINT [FK_AuditEvent_ActorId] FOREIGN KEY([ActorId]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Account_Email' AND object_id=OBJECT_ID(N'dbo.Account'))
    CREATE UNIQUE INDEX [UX_Account_Email] ON dbo.[Account](Email) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Account_OneAdmin' AND object_id=OBJECT_ID(N'dbo.Account'))
    CREATE UNIQUE INDEX [UX_Account_OneAdmin] ON dbo.[Account](RoleCode) WHERE RoleCode='ADMIN' AND IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Customer_Identity' AND object_id=OBJECT_ID(N'dbo.Customer'))
    CREATE UNIQUE INDEX [UX_Customer_Identity] ON dbo.[Customer](IdentityNo) WHERE IdentityNo IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Customer_Account' AND object_id=OBJECT_ID(N'dbo.Customer'))
    CREATE UNIQUE INDEX [UX_Customer_Account] ON dbo.[Customer](AccountId) WHERE AccountId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Customer_Phone' AND object_id=OBJECT_ID(N'dbo.Customer'))
    CREATE  INDEX [IX_Customer_Phone] ON dbo.[Customer](Phone) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_RoomType_Name' AND object_id=OBJECT_ID(N'dbo.RoomType'))
    CREATE UNIQUE INDEX [UX_RoomType_Name] ON dbo.[RoomType](Name) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Room_Name' AND object_id=OBJECT_ID(N'dbo.Room'))
    CREATE UNIQUE INDEX [UX_Room_Name] ON dbo.[Room](Name) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_HotelService_Name' AND object_id=OBJECT_ID(N'dbo.HotelService'))
    CREATE UNIQUE INDEX [UX_HotelService_Name] ON dbo.[HotelService](Name) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Membership_Customer' AND object_id=OBJECT_ID(N'dbo.Membership'))
    CREATE UNIQUE INDEX [UX_Membership_Customer] ON dbo.[Membership](CustomerId) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Booking_Room_Time' AND object_id=OBJECT_ID(N'dbo.Booking'))
    CREATE  INDEX [IX_Booking_Room_Time] ON dbo.[Booking](RoomId, StartAt, EndAt) INCLUDE(StatusCode);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Booking_Customer' AND object_id=OBJECT_ID(N'dbo.Booking'))
    CREATE  INDEX [IX_Booking_Customer] ON dbo.[Booking](CustomerId, StartAt) INCLUDE(StatusCode,RoomId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Stay_Booking' AND object_id=OBJECT_ID(N'dbo.Stay'))
    CREATE UNIQUE INDEX [UX_Stay_Booking] ON dbo.[Stay](BookingId) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Stay_ActiveRoom' AND object_id=OBJECT_ID(N'dbo.Stay'))
    CREATE UNIQUE INDEX [UX_Stay_ActiveRoom] ON dbo.[Stay](RoomId) WHERE CheckOutAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_History_OpenRoom' AND object_id=OBJECT_ID(N'dbo.StayRoomHistory'))
    CREATE UNIQUE INDEX [UX_History_OpenRoom] ON dbo.[StayRoomHistory](RoomId) WHERE ToAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_History_OpenStay' AND object_id=OBJECT_ID(N'dbo.StayRoomHistory'))
    CREATE UNIQUE INDEX [UX_History_OpenStay] ON dbo.[StayRoomHistory](StayId) WHERE ToAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Invoice_Stay' AND object_id=OBJECT_ID(N'dbo.Invoice'))
    CREATE UNIQUE INDEX [UX_Invoice_Stay] ON dbo.[Invoice](StayId) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Invoice_Date' AND object_id=OBJECT_ID(N'dbo.Invoice'))
    CREATE  INDEX [IX_Invoice_Date] ON dbo.[Invoice](IssuedAt) INCLUDE(StatusCode,RoomCharge,ServiceCharge,Surcharge,DiscountAmount);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_InvoiceLine_Invoice' AND object_id=OBJECT_ID(N'dbo.InvoiceLine'))
    CREATE  INDEX [IX_InvoiceLine_Invoice] ON dbo.[InvoiceLine](InvoiceId) ;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Payment_Deposit' AND object_id=OBJECT_ID(N'dbo.Payment'))
    CREATE UNIQUE INDEX [UX_Payment_Deposit] ON dbo.[Payment](BookingId) WHERE PaymentKind='DEPOSIT';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Payment_Settlement' AND object_id=OBJECT_ID(N'dbo.Payment'))
    CREATE UNIQUE INDEX [UX_Payment_Settlement] ON dbo.[Payment](InvoiceId) WHERE PaymentKind='SETTLEMENT';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Payment_Reference' AND object_id=OBJECT_ID(N'dbo.Payment'))
    CREATE UNIQUE INDEX [UX_Payment_Reference] ON dbo.[Payment](ExternalReference) WHERE ExternalReference IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Holiday_Type_Time' AND object_id=OBJECT_ID(N'dbo.HolidayRate'))
    CREATE  INDEX [IX_Holiday_Type_Time] ON dbo.[HolidayRate](RoomTypeId,StartDate,EndDate) INCLUDE(IsActive);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Task_OpenRoom' AND object_id=OBJECT_ID(N'dbo.HousekeepingTask'))
    CREATE UNIQUE INDEX [UX_Task_OpenRoom] ON dbo.[HousekeepingTask](RoomId) WHERE StatusCode='OPEN';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Audit_Object' AND object_id=OBJECT_ID(N'dbo.AuditEvent'))
    CREATE  INDEX [IX_Audit_Object] ON dbo.[AuditEvent](ObjectType,ObjectId,EventAt) ;
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
-- Khoảng đặt phòng nửa mở: nhận cùng lúc phiếu khác trả là hợp lệ.
CREATE OR ALTER TRIGGER dbo.trg_Booking_Validate
ON dbo.Booking AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS(SELECT 1 FROM inserted) RETURN;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Customer c ON c.CustomerId=i.CustomerId
              WHERE c.IsActive=0 AND i.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN'))
        THROW 51101, N'Không đặt phòng cho hồ sơ đã lưu trữ.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Room r ON r.RoomId=i.RoomId
              JOIN dbo.RoomType t ON t.RoomTypeId=r.RoomTypeId
              WHERE i.GuestCount>t.Capacity OR
              (i.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN') AND r.StatusCode IN ('DISABLED','MAINTENANCE')))
        THROW 51102, N'Vượt sức chứa hoặc phòng đang bảo trì/ngừng hoạt động.', 1;
    IF EXISTS(SELECT 1 FROM inserted i
              JOIN dbo.Booking b WITH(UPDLOCK,HOLDLOCK,INDEX(IX_Booking_Room_Time))
                ON b.RoomId=i.RoomId AND b.BookingId<>i.BookingId
               AND i.StartAt<b.EndAt AND b.StartAt<i.EndAt
              WHERE i.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN')
                AND b.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN'))
        THROW 51103, N'Phòng đã có phiếu khác trùng thời gian.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.BookingId=i.BookingId
              WHERE d.StatusCode IN ('COMPLETED','CANCELLED'))
        THROW 51104, N'Không sửa phiếu đã hoàn tất hoặc đã hủy.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.BookingId=i.BookingId
              WHERE i.StatusCode<>d.StatusCode AND NOT
               ((d.StatusCode='PENDING' AND i.StatusCode IN ('CONFIRMED','CANCELLED')) OR
                (d.StatusCode='CONFIRMED' AND i.StatusCode='CHECKED_IN') OR
                (d.StatusCode='CHECKED_IN' AND i.StatusCode='COMPLETED')))
        THROW 51105, N'Chuyển trạng thái đặt phòng không hợp lệ; hủy đã cọc cần chính sách hoàn tiền.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_HolidayRate_NoOverlap
ON dbo.HolidayRate AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM inserted i
              JOIN dbo.HolidayRate h WITH(UPDLOCK,HOLDLOCK,INDEX(IX_Holiday_Type_Time))
                ON h.RoomTypeId=i.RoomTypeId AND h.HolidayRateId<>i.HolidayRateId
               AND i.StartDate<=h.EndDate AND h.StartDate<=i.EndDate
              WHERE i.IsActive=1 AND h.IsActive=1)
        THROW 51106, N'Các đợt giá lễ của cùng loại phòng không được chồng lấn.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_Room_ProtectReservations
ON dbo.Room AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.RoomId=i.RoomId
              JOIN dbo.Booking b ON b.RoomId=i.RoomId
              WHERE b.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN')
                AND (i.RoomTypeId<>d.RoomTypeId OR i.StatusCode='DISABLED'))
        THROW 51107, N'Không đổi loại/khóa phòng còn phiếu chưa hoàn tất.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Stay s ON s.RoomId=i.RoomId
              WHERE s.CheckOutAt IS NULL AND i.StatusCode<>'OCCUPIED')
        THROW 51108, N'Phòng còn khách lưu trú; chưa được chuyển trống/dọn/bảo trì.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_Customer_Validate
ON dbo.Customer AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Account a ON a.AccountId=i.AccountId WHERE a.RoleCode<>'CUSTOMER')
        THROW 51109, N'Hồ sơ khách chỉ liên kết tài khoản CUSTOMER.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Booking b ON b.CustomerId=i.CustomerId
              WHERE i.IsActive=0 AND b.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN'))
        THROW 51110, N'Khách còn giao dịch dang dở, không được lưu trữ.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_Stay_Validate
ON dbo.Stay AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Booking b ON b.BookingId=i.BookingId
              WHERE b.StatusCode NOT IN ('CHECKED_IN','COMPLETED') OR b.RoomId<>i.RoomId
                 OR b.RoomCharge<>i.RoomCharge)
        THROW 51111, N'Phiếu thuê không khớp phiếu đặt đã nhận phòng.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.StayId=i.StayId WHERE d.CheckOutAt IS NOT NULL)
        THROW 51112, N'Không sửa phiếu thuê đã kết thúc.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_InvoiceLine_ImmutablePaid
ON dbo.InvoiceLine AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM (SELECT InvoiceId FROM inserted UNION SELECT InvoiceId FROM deleted) x
              JOIN dbo.Invoice h ON h.InvoiceId=x.InvoiceId WHERE h.StatusCode='PAID')
        THROW 51113, N'Không sửa chi tiết hóa đơn đã thanh toán.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_Payment_Validate
ON dbo.Payment AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted)
        THROW 51114, N'Giao dịch thanh toán là bất biến; không sửa/xóa trực tiếp.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Booking b ON b.BookingId=i.BookingId
              WHERE i.PaymentKind='DEPOSIT' AND (i.Amount<>b.DepositAmount OR b.StatusCode IN ('PENDING','CANCELLED')))
        THROW 51115, N'Khoản cọc không khớp phiếu đã xác nhận.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Invoice h ON h.InvoiceId=i.InvoiceId
              WHERE i.PaymentKind='SETTLEMENT' AND (i.Amount<>h.AmountDue OR i.MethodCode<>h.PaymentMethod OR h.StatusCode<>'DRAFT'))
        THROW 51116, N'Thu tất toán phải đúng số còn lại, phương thức và hóa đơn nháp.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_Membership_PointsFromLedger
ON dbo.Membership AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM inserted i OUTER APPLY
              (SELECT SUM(p.Points) TotalPoints FROM dbo.MembershipPointEntry p WHERE p.MembershipId=i.MembershipId) p
              WHERE i.Points<>ISNULL(p.TotalPoints,0))
        THROW 51117, N'Điểm thẻ phải khớp sổ điểm hóa đơn; không chỉnh điểm bằng tay.', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_PointEntry_Immutable
ON dbo.MembershipPointEntry AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted) THROW 51118, N'Không sửa/xóa sổ điểm hóa đơn.', 1;
END;
GO
-- Xác nhận PAID là bước cuối: kiểm tra tổng các dòng, cọc, giao dịch rồi cộng điểm.
CREATE OR ALTER TRIGGER dbo.trg_Invoice_Finalize
ON dbo.Invoice AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted WHERE StatusCode='PAID')
        THROW 51119, N'Hóa đơn đã thanh toán chỉ được xem/in lại, không sửa/xóa.', 1;
    IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Stay s ON s.StayId=i.StayId
              JOIN dbo.Booking b ON b.BookingId=s.BookingId
              WHERE i.CustomerId<>b.CustomerId OR i.DepositAmount<>b.DepositAmount
                 OR i.RoomCharge<>s.RoomCharge OR i.Surcharge<>s.Surcharge)
        THROW 51120, N'Hóa đơn không khớp khách, cọc hoặc chi phí trên phiếu thuê.', 1;
    IF EXISTS(SELECT 1 FROM inserted i OUTER APPLY
              (SELECT SUM(CASE WHEN LineType='ROOM' THEN LineAmount ELSE 0 END) R,
                      SUM(CASE WHEN LineType='SERVICE' THEN LineAmount ELSE 0 END) S,
                      SUM(CASE WHEN LineType='SURCHARGE' THEN LineAmount ELSE 0 END) X
               FROM dbo.InvoiceLine l WHERE l.InvoiceId=i.InvoiceId) a
              WHERE i.StatusCode='PAID' AND
                    (ISNULL(a.R,0)<>i.RoomCharge OR ISNULL(a.S,0)<>i.ServiceCharge OR ISNULL(a.X,0)<>i.Surcharge))
        THROW 51121, N'Tổng dòng hóa đơn không khớp tiền phòng/dịch vụ/phụ thu.', 1;
    IF EXISTS(SELECT 1 FROM inserted i WHERE i.StatusCode='PAID' AND
              (NOT EXISTS(SELECT 1 FROM dbo.Payment p WHERE p.InvoiceId=i.InvoiceId AND p.PaymentKind='SETTLEMENT' AND p.Amount=i.AmountDue)
               OR NOT EXISTS(SELECT 1 FROM dbo.Stay s JOIN dbo.Payment p ON p.BookingId=s.BookingId
                             WHERE s.StayId=i.StayId AND p.PaymentKind='DEPOSIT' AND p.Amount=i.DepositAmount)))
        THROW 51122, N'Chưa đủ chứng từ cọc và thu tất toán.', 1;
    INSERT dbo.MembershipPointEntry(InvoiceId,MembershipId,Points,CreatedAt)
        SELECT i.InvoiceId,m.MembershipId,CONVERT(bigint,FLOOR((i.RoomCharge+i.ServiceCharge+i.Surcharge-i.DiscountAmount)/10000)),i.IssuedAt
        FROM inserted i LEFT JOIN deleted d ON d.InvoiceId=i.InvoiceId
        JOIN dbo.Membership m WITH(UPDLOCK,HOLDLOCK) ON m.CustomerId=i.CustomerId AND m.IsActive=1
        WHERE i.StatusCode='PAID' AND (d.InvoiceId IS NULL OR d.StatusCode<>'PAID');
    UPDATE m SET Points=p.TotalPoints
        FROM dbo.Membership m JOIN
          (SELECT MembershipId,SUM(Points) TotalPoints FROM dbo.MembershipPointEntry GROUP BY MembershipId) p
            ON p.MembershipId=m.MembershipId
        WHERE EXISTS(SELECT 1 FROM inserted i WHERE i.CustomerId=m.CustomerId AND i.StatusCode='PAID');
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_AuditEvent_AppendOnly
ON dbo.AuditEvent AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS(SELECT 1 FROM deleted) THROW 51123, N'Nhật ký chỉ ghi thêm, không sửa/xóa trực tiếp.', 1;
END;
GO
-- Giá ngày dùng cho bản Node.js hiện tại. Giá giờ/đêm lưu riêng, chưa tự suy đoán chính sách.
CREATE OR ALTER FUNCTION dbo.fn_QuoteRoom
(@RoomId varchar(20), @StartAt datetime2(0), @EndAt datetime2(0))
RETURNS decimal(18,2)
AS
BEGIN
    IF @StartAt IS NULL OR @EndAt IS NULL OR @StartAt>=@EndAt OR DATEDIFF(DAY,@StartAt,@EndAt)>3660 RETURN NULL;
    DECLARE @TypeId varchar(20),@Base decimal(18,2),@Total decimal(18,2)=0,
            @Date date=CONVERT(date,@StartAt),@Days int=DATEDIFF(DAY,@StartAt,@EndAt),@i int=0,@Percent decimal(7,2);
    IF @Days<1 SET @Days=1;
    SELECT @TypeId=t.RoomTypeId,@Base=t.DailyPrice FROM dbo.Room r JOIN dbo.RoomType t ON t.RoomTypeId=r.RoomTypeId WHERE r.RoomId=@RoomId;
    IF @Base IS NULL RETURN NULL;
    WHILE @i<@Days
    BEGIN
        SET @Percent=0;
        SELECT @Percent=IncreasePercent FROM dbo.HolidayRate WHERE RoomTypeId=@TypeId AND IsActive=1 AND @Date BETWEEN StartDate AND EndDate;
        SET @Total=@Total+ROUND(@Base*(100+@Percent)/100,0);
        SET @Date=DATEADD(DAY,1,@Date); SET @i=@i+1;
    END;
    RETURN @Total;
END;
GO
CREATE OR ALTER VIEW dbo.v_RoomBoard
AS
SELECT r.RoomId,r.Name,r.RoomTypeId,t.Name RoomTypeName,t.Capacity,t.DailyPrice,r.StatusCode,
       h.TaskId,h.CheckoutAt,h.DeadlineAt,
       CASE WHEN h.StatusCode='OPEN' THEN DATEDIFF(MINUTE,SYSUTCDATETIME(),h.DeadlineAt) END MinutesRemaining,
       CONVERT(bit,CASE WHEN h.StatusCode='OPEN' AND h.DeadlineAt<SYSUTCDATETIME() THEN 1 ELSE 0 END) IsOverdue
FROM dbo.Room r JOIN dbo.RoomType t ON t.RoomTypeId=r.RoomTypeId
LEFT JOIN dbo.HousekeepingTask h ON h.RoomId=r.RoomId AND h.StatusCode='OPEN';
GO
CREATE OR ALTER VIEW dbo.v_BookingLookup
AS
SELECT b.BookingId,b.CustomerId,c.FullName CustomerName,c.Phone,b.RoomId,b.StartAt,b.EndAt,b.GuestCount,
       b.StatusCode,b.ChannelCode,b.RoomCharge,b.DepositAmount,b.HoldUntil
FROM dbo.Booking b JOIN dbo.Customer c ON c.CustomerId=b.CustomerId;
GO
CREATE OR ALTER VIEW dbo.v_Membership
AS
SELECT m.MembershipId,m.CustomerId,c.FullName,c.Phone,m.Points,m.IsActive,
       CASE WHEN m.Points>=1000 THEN N'Kim cương' WHEN m.Points>=500 THEN N'Vàng'
            WHEN m.Points>=100 THEN N'Bạc' ELSE N'Thành viên' END TierName
FROM dbo.Membership m JOIN dbo.Customer c ON c.CustomerId=m.CustomerId;
GO
CREATE OR ALTER VIEW dbo.v_DailyRevenue
AS
SELECT CONVERT(date,IssuedAt) RevenueDate,COUNT_BIG(*) InvoiceCount,
       SUM(RoomCharge) RoomRevenue,SUM(ServiceCharge) ServiceRevenue,SUM(Surcharge) SurchargeRevenue,
       SUM(DiscountAmount) DiscountTotal,SUM(RoomCharge+ServiceCharge+Surcharge-DiscountAmount) TotalRevenue
FROM dbo.Invoice WHERE StatusCode='PAID' GROUP BY CONVERT(date,IssuedAt);
GO
CREATE OR ALTER PROCEDURE dbo.usp_ExpireUnpaidBookings
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @Expired TABLE(BookingId varchar(20) PRIMARY KEY);
    BEGIN TRY
      BEGIN TRANSACTION;
      UPDATE dbo.Booking SET StatusCode='CANCELLED'
        OUTPUT inserted.BookingId INTO @Expired(BookingId)
      WHERE StatusCode='PENDING' AND DepositAmount=0 AND HoldUntil<SYSUTCDATETIME();
      INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail)
        SELECT NULL,N'Tự hủy phiếu quá hạn','BOOKING',BookingId,N'Chưa cọc, quá hạn giữ phòng' FROM @Expired;
      COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
END;
GO
-- Ví dụ cổng ghi nhất quán để node-mssql dùng sau; bên gọi phải xác thực phiên trước.
CREATE OR ALTER PROCEDURE dbo.usp_CreateBooking
    @BookingId varchar(20),@CustomerId varchar(20),@RoomId varchar(20),
    @StartAt datetime2(0),@EndAt datetime2(0),@GuestCount int,
    @ChannelCode varchar(20),@DepositAmount decimal(18,2),@ActorId varchar(20)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST','CUSTOMER'))
        THROW 51201,N'Tài khoản không có quyền đặt phòng.',1;
    IF EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND RoleCode='CUSTOMER') AND
       (@ChannelCode<>'ONLINE' OR NOT EXISTS(SELECT 1 FROM dbo.Customer WHERE CustomerId=@CustomerId AND AccountId=@ActorId))
        THROW 51202,N'Khách chỉ đặt trực tuyến cho hồ sơ của mình.',1;
    IF @ChannelCode NOT IN ('ONLINE','COUNTER') OR @DepositAmount<0 OR
       (@ChannelCode='ONLINE' AND @DepositAmount<>0) OR (@ChannelCode='COUNTER' AND @DepositAmount<=0)
        THROW 51203,N'Đặt online chưa ghi cọc; đặt tại quầy cần cọc dương.',1;
    IF @StartAt<DATEADD(MINUTE,-5,SYSUTCDATETIME()) OR @EndAt<=@StartAt
        THROW 51204,N'Thời gian nhận/trả không hợp lệ.',1;
    EXEC dbo.usp_ExpireUnpaidBookings;
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @LockRoom varchar(20),@Price decimal(18,2),@Now datetime2(0)=SYSUTCDATETIME();
      SELECT @LockRoom=RoomId FROM dbo.Room WITH(UPDLOCK,HOLDLOCK) WHERE RoomId=@RoomId;
      SET @Price=dbo.fn_QuoteRoom(@RoomId,@StartAt,@EndAt);
      IF @LockRoom IS NULL OR @Price IS NULL THROW 51205,N'Không có phòng hoặc không tính được giá.',1;
      INSERT dbo.Booking(BookingId,CustomerId,RoomId,StartAt,EndAt,GuestCount,StatusCode,ChannelCode,RoomCharge,DepositAmount,HoldUntil,CreatedAt,CreatedBy)
      VALUES(@BookingId,@CustomerId,@RoomId,@StartAt,@EndAt,@GuestCount,
             CASE WHEN @ChannelCode='ONLINE' THEN 'PENDING' ELSE 'CONFIRMED' END,
             @ChannelCode,@Price,@DepositAmount,DATEADD(MINUTE,30,@Now),@Now,@ActorId);
      IF @DepositAmount>0 INSERT dbo.Payment(PaymentId,BookingId,PaymentKind,Amount,MethodCode,CreatedBy)
        VALUES('GD'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),26),@BookingId,'DEPOSIT',@DepositAmount,'CASH',@ActorId);
      INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail)
        VALUES(@ActorId,N'Đặt phòng','BOOKING',@BookingId,@ChannelCode);
      COMMIT TRANSACTION;
      SELECT * FROM dbo.v_BookingLookup WHERE BookingId=@BookingId;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ConfirmDeposit
 @BookingId varchar(20),@Amount decimal(18,2),@MethodCode varchar(20),@PaymentId varchar(30),@ActorId varchar(20),@ExternalReference varchar(100)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST'))
   THROW 51206,N'Không có quyền xác nhận cọc.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE BookingId=@BookingId AND StatusCode='PENDING' AND HoldUntil>=SYSUTCDATETIME())
    THROW 51207,N'Phiếu không còn chờ cọc hoặc đã quá hạn.',1;
  UPDATE dbo.Booking SET DepositAmount=@Amount,StatusCode='CONFIRMED' WHERE BookingId=@BookingId;
  INSERT dbo.Payment(PaymentId,BookingId,PaymentKind,Amount,MethodCode,ExternalReference,CreatedBy)
    VALUES(@PaymentId,@BookingId,'DEPOSIT',@Amount,@MethodCode,@ExternalReference,@ActorId);
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@ActorId,N'Xác nhận cọc','BOOKING',@BookingId,N'Đã đối chiếu khoản cọc');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_CheckIn
 @StayId varchar(20),@BookingId varchar(20),@IdentityNo varchar(30),@ActorId varchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST'))
   THROW 51208,N'Không có quyền nhận phòng.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @RoomId varchar(20),@Charge decimal(18,2),@Now datetime2(0)=SYSUTCDATETIME();
  SELECT @RoomId=RoomId,@Charge=RoomCharge FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK)
   WHERE BookingId=@BookingId AND StatusCode='CONFIRMED' AND @Now>=StartAt AND @Now<EndAt;
  IF @RoomId IS NULL THROW 51209,N'Phiếu chưa xác nhận hoặc chưa trong thời gian nhận phòng.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Room WITH(UPDLOCK,HOLDLOCK) WHERE RoomId=@RoomId AND StatusCode='AVAILABLE')
    THROW 51210,N'Phòng chưa sạch/sẵn sàng.',1;
  UPDATE dbo.Booking SET StatusCode='CHECKED_IN' WHERE BookingId=@BookingId;
  INSERT dbo.Stay(StayId,BookingId,RoomId,IdentityNo,CheckInAt,RoomCharge,CreatedBy)
    VALUES(@StayId,@BookingId,@RoomId,@IdentityNo,@Now,@Charge,@ActorId);
  INSERT dbo.StayRoomHistory(StayId,RoomId,FromAt) VALUES(@StayId,@RoomId,@Now);
  UPDATE dbo.Room SET StatusCode='OCCUPIED' WHERE RoomId=@RoomId;
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@ActorId,N'Nhận phòng','STAY',@StayId,@BookingId);
  COMMIT TRANSACTION;
  SELECT * FROM dbo.Stay WHERE StayId=@StayId;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_CheckOut
 @StayId varchar(20),@InvoiceId varchar(20),@PaymentId varchar(30),@MethodCode varchar(20),@ExpectedAmount decimal(18,2),@ActorId varchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST'))
   THROW 51211,N'Không có quyền trả phòng.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @BookingId varchar(20),@RoomId varchar(20),@CustomerId varchar(20),@Charge decimal(18,2),@Extra decimal(18,2),@Deposit decimal(18,2),@Due decimal(18,2),@Now datetime2(0)=SYSUTCDATETIME();
  SELECT @BookingId=s.BookingId,@RoomId=s.RoomId,@Charge=s.RoomCharge,@Extra=s.Surcharge,@CustomerId=b.CustomerId,@Deposit=b.DepositAmount
    FROM dbo.Stay s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Booking b WITH(UPDLOCK,HOLDLOCK) ON b.BookingId=s.BookingId
    WHERE s.StayId=@StayId AND s.CheckOutAt IS NULL;
  IF @BookingId IS NULL THROW 51212,N'Phiếu thuê không còn đang lưu trú.',1;
  DECLARE @Service decimal(18,2);
  SELECT @Service=ISNULL(SUM(Quantity*UnitPrice),0) FROM dbo.ServiceUsage WITH(UPDLOCK,HOLDLOCK) WHERE StayId=@StayId AND IsVoided=0 AND InvoiceId IS NULL;
  SET @Due=@Charge+@Extra+@Service-@Deposit;
  IF @ExpectedAmount IS NULL OR @Due<>@ExpectedAmount THROW 51213,N'Bảng kê đã thay đổi, phải đối chiếu lại trước thu tiền.',1;
  -- Ghi dịch vụ cùng transaction với hóa đơn, thanh toán, điểm thẻ và trả phòng.
  INSERT dbo.Invoice(InvoiceId,StayId,CustomerId,IssuedAt,RoomCharge,ServiceCharge,Surcharge,DepositAmount,PaymentMethod,CreatedBy)
    VALUES(@InvoiceId,@StayId,@CustomerId,@Now,@Charge,@Service,@Extra,@Deposit,@MethodCode,@ActorId);
  INSERT dbo.InvoiceLine(InvoiceId,LineType,Description,Quantity,UnitPrice) VALUES(@InvoiceId,'ROOM',N'Tiền lưu trú',1,@Charge);
  IF @Extra>0 INSERT dbo.InvoiceLine(InvoiceId,LineType,Description,Quantity,UnitPrice) VALUES(@InvoiceId,'SURCHARGE',N'Phụ thu đổi phòng',1,@Extra);
  INSERT dbo.InvoiceLine(InvoiceId,LineType,ServiceId,Description,Quantity,UnitPrice)
    SELECT @InvoiceId,'SERVICE',u.ServiceId,s.Name,u.Quantity,u.UnitPrice
    FROM dbo.ServiceUsage u JOIN dbo.HotelService s ON s.ServiceId=u.ServiceId
    WHERE u.StayId=@StayId AND u.IsVoided=0 AND u.InvoiceId IS NULL;
  UPDATE dbo.ServiceUsage SET InvoiceId=@InvoiceId WHERE StayId=@StayId AND IsVoided=0 AND InvoiceId IS NULL;
  INSERT dbo.Payment(PaymentId,InvoiceId,PaymentKind,Amount,MethodCode,CreatedBy) VALUES(@PaymentId,@InvoiceId,'SETTLEMENT',@Due,@MethodCode,@ActorId);
  UPDATE dbo.Invoice SET StatusCode='PAID' WHERE InvoiceId=@InvoiceId;
  UPDATE dbo.Stay SET CheckOutAt=@Now WHERE StayId=@StayId;
  UPDATE dbo.StayRoomHistory SET ToAt=@Now WHERE StayId=@StayId AND ToAt IS NULL;
  UPDATE dbo.Booking SET StatusCode='COMPLETED' WHERE BookingId=@BookingId;
  UPDATE dbo.Room SET StatusCode='DIRTY' WHERE RoomId=@RoomId;
  INSERT dbo.HousekeepingTask(TaskId,RoomId,StayId,CheckoutAt,DeadlineAt,StatusCode)
    VALUES('DD'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),18),@RoomId,@StayId,@Now,DATEADD(MINUTE,90,@Now),'OPEN');
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@ActorId,N'Thanh toán và trả phòng','INVOICE',@InvoiceId,@MethodCode);
  COMMIT TRANSACTION;
  SELECT * FROM dbo.Invoice WHERE InvoiceId=@InvoiceId;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ChangeRoom
 @StayId varchar(20),@NewRoomId varchar(20),@ActorId varchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','RECEPTIONIST'))
   THROW 51214,N'Không có quyền đổi phòng.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @BookingId varchar(20),@OldRoomId varchar(20),@EndAt datetime2(0),@Now datetime2(0)=SYSUTCDATETIME(),@Extra decimal(18,2);
  SELECT @BookingId=s.BookingId,@OldRoomId=s.RoomId,@EndAt=b.EndAt
    FROM dbo.Stay s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Booking b WITH(UPDLOCK,HOLDLOCK) ON b.BookingId=s.BookingId
    WHERE s.StayId=@StayId AND s.CheckOutAt IS NULL;
  IF @BookingId IS NULL OR @EndAt<=@Now OR @OldRoomId=@NewRoomId THROW 51215,N'Phiếu/khung giờ đổi phòng không hợp lệ.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Room WITH(UPDLOCK,HOLDLOCK) WHERE RoomId=@NewRoomId AND StatusCode='AVAILABLE')
    THROW 51216,N'Phòng mới chưa sẵn sàng.',1;
  SET @Extra=dbo.fn_QuoteRoom(@NewRoomId,@Now,@EndAt)-dbo.fn_QuoteRoom(@OldRoomId,@Now,@EndAt);
  IF @Extra<0 SET @Extra=0;
  UPDATE dbo.Booking SET RoomId=@NewRoomId WHERE BookingId=@BookingId;
  UPDATE dbo.Stay SET RoomId=@NewRoomId,Surcharge=Surcharge+@Extra WHERE StayId=@StayId;
  UPDATE dbo.StayRoomHistory SET ToAt=@Now WHERE StayId=@StayId AND ToAt IS NULL;
  INSERT dbo.StayRoomHistory(StayId,RoomId,FromAt,ExtraCharge) VALUES(@StayId,@NewRoomId,@Now,@Extra);
  UPDATE dbo.Room SET StatusCode='OCCUPIED' WHERE RoomId=@NewRoomId;
  UPDATE dbo.Room SET StatusCode='DIRTY' WHERE RoomId=@OldRoomId;
  INSERT dbo.HousekeepingTask(TaskId,RoomId,StayId,CheckoutAt,DeadlineAt,StatusCode)
    VALUES('DD'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),18),@OldRoomId,@StayId,@Now,DATEADD(MINUTE,90,@Now),'OPEN');
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@ActorId,N'Đổi phòng','STAY',@StayId,CONCAT(@OldRoomId,' -> ',@NewRoomId));
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_FinishCleaning @RoomId varchar(20),@ActorId varchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Account WHERE AccountId=@ActorId AND IsActive=1 AND RoleCode IN ('ADMIN','MANAGER','HOUSEKEEPER'))
   THROW 51217,N'Không có quyền hoàn tất dọn phòng.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.Room WITH(UPDLOCK,HOLDLOCK) WHERE RoomId=@RoomId AND StatusCode IN ('DIRTY','MAINTENANCE'))
    THROW 51218,N'Phòng không cần dọn/bảo trì.',1;
  UPDATE dbo.HousekeepingTask SET StatusCode='DONE',CompletedAt=SYSUTCDATETIME() WHERE RoomId=@RoomId AND StatusCode IN ('OPEN','MAINTENANCE');
  UPDATE dbo.Room SET StatusCode='AVAILABLE' WHERE RoomId=@RoomId;
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@ActorId,N'Dọn phòng hoàn tất','ROOM',@RoomId,N'Đã sẵn sàng');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
-- OTP phải được backend xác thực TRƯỚC khi gọi procedure này. Không nhận/ghi OTP vào SQL.
CREATE OR ALTER PROCEDURE dbo.usp_TransferAdmin @CurrentAdminId varchar(20),@TargetManagerId varchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @Lock int;
  EXEC @Lock=sys.sp_getapplock @Resource=N'HotelManager.AdminTransfer',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
  IF @Lock<0 THROW 51219,N'Đang có thao tác chuyển quyền khác, hãy thử lại.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Account WITH(UPDLOCK,HOLDLOCK) WHERE AccountId=@CurrentAdminId AND RoleCode='ADMIN' AND IsActive=1)
    THROW 51220,N'Admin hiện tại không hợp lệ.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Account WITH(UPDLOCK,HOLDLOCK) WHERE AccountId=@TargetManagerId AND RoleCode='MANAGER' AND IsActive=1)
    THROW 51221,N'Người nhận phải là Quản lý đang hoạt động.',1;
  -- Hai UPDATE trong cùng transaction để không vướng chỉ mục UNIQUE một Admin.
  UPDATE dbo.Account SET RoleCode='MANAGER',AuthVersion=AuthVersion+1 WHERE AccountId=@CurrentAdminId;
  UPDATE dbo.Account SET RoleCode='ADMIN',AuthVersion=AuthVersion+1 WHERE AccountId=@TargetManagerId;
  INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES(@CurrentAdminId,N'Chuyển quyền Admin','ACCOUNT',@TargetManagerId,N'Backend chịu trách nhiệm OTP/thu hồi phiên');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_PointEntry_ValidateInsert
ON dbo.MembershipPointEntry AFTER INSERT
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted p JOIN dbo.Invoice i ON i.InvoiceId=p.InvoiceId
           JOIN dbo.Membership m ON m.MembershipId=p.MembershipId
           WHERE i.StatusCode<>'PAID' OR i.CustomerId<>m.CustomerId OR m.IsActive=0
              OR p.Points<>CONVERT(bigint,FLOOR((i.RoomCharge+i.ServiceCharge+i.Surcharge-i.DiscountAmount)/10000)))
   THROW 51124,N'Sổ điểm phải thuộc hóa đơn đã thanh toán, đúng thẻ và đúng số điểm.',1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_RoomType_ProtectCapacity
ON dbo.RoomType AFTER UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted t JOIN dbo.Room r ON r.RoomTypeId=t.RoomTypeId
           JOIN dbo.Booking b ON b.RoomId=r.RoomId
           WHERE b.StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN') AND b.GuestCount>t.Capacity)
   THROW 51125,N'Không giảm sức chứa khiến phiếu đặt hiện có vượt số người.',1;
END;
GO
-- Marker để 003 biết logic đã cài xong (không có nghĩa mọi batch trước đã tự chạy nếu SSMS báo lỗi).
-- SSMS có thể tiếp tục sau lỗi GO: thiếu object/ràng buộc thì không tạo marker 2.
IF EXISTS(SELECT 1 FROM (VALUES
(N'dbo.trg_Booking_Validate'),
(N'dbo.trg_HolidayRate_NoOverlap'),
(N'dbo.trg_Room_ProtectReservations'),
(N'dbo.trg_Customer_Validate'),
(N'dbo.trg_Stay_Validate'),
(N'dbo.trg_InvoiceLine_ImmutablePaid'),
(N'dbo.trg_Payment_Validate'),
(N'dbo.trg_Membership_PointsFromLedger'),
(N'dbo.trg_PointEntry_Immutable'),
(N'dbo.trg_Invoice_Finalize'),
(N'dbo.trg_AuditEvent_AppendOnly'),
(N'dbo.fn_QuoteRoom'),
(N'dbo.v_RoomBoard'),
(N'dbo.v_BookingLookup'),
(N'dbo.v_Membership'),
(N'dbo.v_DailyRevenue'),
(N'dbo.usp_ExpireUnpaidBookings'),
(N'dbo.usp_CreateBooking'),
(N'dbo.usp_ConfirmDeposit'),
(N'dbo.usp_CheckIn'),
(N'dbo.usp_CheckOut'),
(N'dbo.usp_ChangeRoom'),
(N'dbo.usp_FinishCleaning'),
(N'dbo.usp_TransferAdmin'),
(N'dbo.trg_PointEntry_ValidateInsert'),
(N'dbo.trg_RoomType_ProtectCapacity')) required(Name) WHERE OBJECT_ID(required.Name) IS NULL)
 THROW 51001,N'002 còn thiếu trigger/function/view/procedure. Kiểm tra lỗi batch trước.',1;
IF EXISTS(SELECT 1 FROM (VALUES
(N'CK_Account_Role'),
(N'CK_Account_Contact'),
(N'CK_Account_Hash'),
(N'CK_Customer_NamePhone'),
(N'CK_Customer_Identity'),
(N'CK_RoomType_Values'),
(N'CK_Room_Status'),
(N'CK_Room_Name'),
(N'CK_HotelService_Price'),
(N'CK_HolidayRate_Range'),
(N'CK_Membership_Points'),
(N'CK_Booking_Range'),
(N'CK_Booking_Amount'),
(N'CK_Booking_Status'),
(N'CK_Booking_Channel'),
(N'CK_Booking_StateDeposit'),
(N'CK_Booking_Hold'),
(N'CK_Booking_Guests'),
(N'CK_Stay_Time'),
(N'CK_Stay_Values'),
(N'CK_StayRoomHistory_Time'),
(N'CK_Invoice_Amounts'),
(N'CK_Invoice_Status'),
(N'CK_Invoice_Method'),
(N'CK_InvoiceLine_Values'),
(N'CK_InvoiceLine_Kind'),
(N'CK_InvoiceLine_ServiceRef'),
(N'CK_Payment_KindLink'),
(N'CK_Payment_Method'),
(N'CK_Payment_Reference'),
(N'CK_MembershipPointEntry_Points'),
(N'CK_HousekeepingTask_Deadline'),
(N'CK_HousekeepingTask_Status'),
(N'CK_HousekeepingTask_Completion'),
(N'CK_DamageReport_Text'),
(N'CK_HotelSetting_OneRow'),
(N'CK_HotelSetting_LateFee'),
(N'CK_HotelSetting_Text'),
(N'CK_BackupHistory_Status'),
(N'FK_Customer_AccountId'),
(N'FK_Room_RoomTypeId'),
(N'FK_RoomTypeService_RoomTypeId'),
(N'FK_RoomTypeService_ServiceId'),
(N'FK_HolidayRate_RoomTypeId'),
(N'FK_Membership_CustomerId'),
(N'FK_Booking_CustomerId'),
(N'FK_Booking_RoomId'),
(N'FK_Booking_CreatedBy'),
(N'FK_Stay_BookingId'),
(N'FK_Stay_RoomId'),
(N'FK_Stay_CreatedBy'),
(N'FK_StayRoomHistory_StayId'),
(N'FK_StayRoomHistory_RoomId'),
(N'FK_Invoice_StayId'),
(N'FK_Invoice_CustomerId'),
(N'FK_Invoice_CreatedBy'),
(N'FK_InvoiceLine_InvoiceId'),
(N'FK_InvoiceLine_ServiceId'),
(N'FK_Payment_BookingId'),
(N'FK_Payment_InvoiceId'),
(N'FK_Payment_CreatedBy'),
(N'FK_MembershipPointEntry_InvoiceId'),
(N'FK_MembershipPointEntry_MembershipId'),
(N'FK_HousekeepingTask_RoomId'),
(N'FK_HousekeepingTask_StayId'),
(N'FK_HousekeepingTask_AssignedTo'),
(N'FK_DamageReport_RoomId'),
(N'FK_DamageReport_TaskId'),
(N'FK_DamageReport_ReportedBy'),
(N'FK_BackupHistory_CreatedBy'),
(N'FK_AuditEvent_ActorId')) required(Name) WHERE OBJECT_ID(N'dbo.'+required.Name) IS NULL)
 THROW 51002,N'002 chưa đủ CHECK/FK.',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE schema_id=SCHEMA_ID(N'dbo') AND (is_disabled=1 OR is_not_trusted=1))
 OR EXISTS(SELECT 1 FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID(N'dbo') AND (is_disabled=1 OR is_not_trusted=1))
 OR EXISTS(SELECT 1 FROM sys.triggers WHERE parent_class=1 AND is_disabled=1)
 THROW 51003,N'Có ràng buộc/trigger chưa bật hoặc chưa kiểm chứng dữ liệu.',1;
IF EXISTS(SELECT 1 FROM (VALUES
(N'UX_Account_Email',N'dbo.Account'),
(N'UX_Account_OneAdmin',N'dbo.Account'),
(N'UX_Customer_Identity',N'dbo.Customer'),
(N'UX_Customer_Account',N'dbo.Customer'),
(N'IX_Customer_Phone',N'dbo.Customer'),
(N'UX_RoomType_Name',N'dbo.RoomType'),
(N'UX_Room_Name',N'dbo.Room'),
(N'UX_HotelService_Name',N'dbo.HotelService'),
(N'UX_Membership_Customer',N'dbo.Membership'),
(N'IX_Booking_Room_Time',N'dbo.Booking'),
(N'IX_Booking_Customer',N'dbo.Booking'),
(N'UX_Stay_Booking',N'dbo.Stay'),
(N'UX_Stay_ActiveRoom',N'dbo.Stay'),
(N'UX_History_OpenRoom',N'dbo.StayRoomHistory'),
(N'UX_History_OpenStay',N'dbo.StayRoomHistory'),
(N'UX_Invoice_Stay',N'dbo.Invoice'),
(N'IX_Invoice_Date',N'dbo.Invoice'),
(N'IX_InvoiceLine_Invoice',N'dbo.InvoiceLine'),
(N'UX_Payment_Deposit',N'dbo.Payment'),
(N'UX_Payment_Settlement',N'dbo.Payment'),
(N'UX_Payment_Reference',N'dbo.Payment'),
(N'IX_Holiday_Type_Time',N'dbo.HolidayRate'),
(N'UX_Task_OpenRoom',N'dbo.HousekeepingTask'),
(N'IX_Audit_Object',N'dbo.AuditEvent')) required(Name,TableName)
 WHERE NOT EXISTS(SELECT 1 FROM sys.indexes i WHERE i.name=required.Name AND i.object_id=OBJECT_ID(required.TableName) AND i.is_disabled=0))
 THROW 51004,N'002 chưa đủ chỉ mục nghiệp vụ.',1;
-- Ràng buộc bổ sung cho web; cài trước khi công bố schema 11.
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Account_AuthVersion')
 ALTER TABLE dbo.Account ADD CONSTRAINT CK_Account_AuthVersion CHECK(AuthVersion>=0);
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Usage_Amounts')
 ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT CK_Usage_Amounts CHECK(Quantity>0 AND UnitPrice>0 AND (IsVoided=0 OR InvoiceId IS NULL));
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Usage_Stay')
 ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT FK_Usage_Stay FOREIGN KEY(StayId) REFERENCES dbo.Stay(StayId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Usage_Service')
 ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT FK_Usage_Service FOREIGN KEY(ServiceId) REFERENCES dbo.HotelService(ServiceId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Usage_Actor')
 ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT FK_Usage_Actor FOREIGN KEY(RecordedBy) REFERENCES dbo.Account(AccountId);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Usage_Invoice')
 ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT FK_Usage_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoice(InvoiceId);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Usage_Stay' AND object_id=OBJECT_ID('dbo.ServiceUsage'))
 CREATE INDEX IX_Usage_Stay ON dbo.ServiceUsage(StayId,IsVoided) INCLUDE(Quantity,UnitPrice,InvoiceId);
GO
CREATE OR ALTER TRIGGER dbo.trg_Usage_Validate ON dbo.ServiceUsage AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d JOIN dbo.Stay s ON s.StayId=d.StayId WHERE d.InvoiceId IS NOT NULL OR s.CheckOutAt IS NOT NULL)
  THROW 51401,N'Không sửa/xóa dịch vụ đã lên hóa đơn hoặc phiếu thuê đã kết thúc.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Stay s ON s.StayId=i.StayId WHERE s.CheckOutAt IS NOT NULL)
  THROW 51402,N'Chỉ ghi dịch vụ trên phiếu thuê đang lưu trú.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Invoice h ON h.InvoiceId=i.InvoiceId WHERE h.StayId<>i.StayId OR h.StatusCode<>'DRAFT')
  THROW 51403,N'Dịch vụ phải thuộc đúng hóa đơn nháp của phiếu thuê.',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.UsageId=i.UsageId JOIN dbo.Account a ON a.AccountId=i.RecordedBy WHERE (d.UsageId IS NULL OR d.RecordedBy<>i.RecordedBy) AND (a.IsActive=0 OR a.RoleCode NOT IN('ADMIN','MANAGER','RECEPTIONIST')))
  THROW 51404,N'Người ghi dịch vụ không có quyền.',1;
END;
GO
-- Không công bố schema nếu các batch web còn thiếu object.
IF OBJECT_ID(N'dbo.trg_Usage_Validate',N'TR') IS NULL
 OR EXISTS(SELECT 1 FROM(VALUES('CK_Account_AuthVersion'),('CK_Usage_Amounts'))v(Name) WHERE NOT EXISTS(SELECT 1 FROM sys.check_constraints c WHERE c.name=v.Name AND c.is_disabled=0 AND c.is_not_trusted=0))
 OR EXISTS(SELECT 1 FROM(VALUES('FK_Usage_Stay'),('FK_Usage_Service'),('FK_Usage_Actor'),('FK_Usage_Invoice'))v(Name) WHERE NOT EXISTS(SELECT 1 FROM sys.foreign_keys f WHERE f.name=v.Name AND f.is_disabled=0 AND f.is_not_trusted=0))
 THROW 51405,N'Chưa cài đầy đủ ràng buộc web. Kiểm tra lỗi các batch trước.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo=11) INSERT dbo.SchemaVersion(VersionNo) VALUES(11);
PRINT N'002 hoàn tất. Kiểm tra không có lỗi đỏ ở các batch trước rồi chạy 03_seed.sql.';
GO
