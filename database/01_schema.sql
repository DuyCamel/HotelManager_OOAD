/*
TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C1, C2
Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
Chạy schema bằng SSMS; đối chiếu kiểu/độ dài/mapping và RoomTypeService trước khi thêm luồng danh mục.
Nếu sửa schema sau khi nhóm đã có dữ liệu, ghi rõ cách nâng cấp; không DROP dữ liệu hoặc giả định chạy lại 001 tự migrate.
Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
*/
/* 01_schema.sql
   TẠO CSDL VÀ BẢNG — SQL Server 2019+ / SSMS.
   Chạy bằng tài khoản có quyền CREATE DATABASE. Không có đường dẫn MDF/LDF cố định.
   Không DROP, không xóa dữ liệu; chạy lại nhận diện SchemaVersion = 10 và bỏ qua.
   Chạy lần lượt 001 -> 002 -> 003. Script này chưa chứa FK/CHECK/UNIQUE nghiệp vụ.
   Mã tiếng Anh theo Node.js; dữ liệu hiển thị nvarchar và chuỗi N'...' để giữ tiếng Việt.
*/
USE [master];
GO
IF DB_ID(N'HotelManager_OOAD_Web') IS NULL
    EXEC(N'CREATE DATABASE [HotelManager_OOAD_Web] COLLATE Latin1_General_100_CI_AS_SC;');
GO
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
IF OBJECT_ID(N'dbo.SchemaVersion', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo=10)
        THROW 51000, N'Phiên bản schema không tương thích. Không chạy tiếp.', 1;
    PRINT N'001: Schema đã tồn tại; giữ nguyên dữ liệu.';
END
ELSE
BEGIN TRY
    BEGIN TRANSACTION;

    -- Bảng SchemaVersion; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[SchemaVersion] (
    VersionNo int NOT NULL CONSTRAINT PK_SchemaVersion PRIMARY KEY,
    AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SchemaVersion_Applied DEFAULT SYSUTCDATETIME()
    );

    -- Bảng SeedHistory; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[SeedHistory] (
    SeedName varchar(100) NOT NULL CONSTRAINT PK_SeedHistory PRIMARY KEY,
    AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SeedHistory_Applied DEFAULT SYSUTCDATETIME()
    );

    -- Tài khoản khách/nhân viên; RoleCode ánh xạ enum Node.js, passwordHash định dạng salt:PBKDF2.
    CREATE TABLE dbo.[Account] (
    AccountId varchar(20) NOT NULL CONSTRAINT PK_Account PRIMARY KEY,
    PasswordHash varchar(200) NOT NULL,
    FullName nvarchar(120) NOT NULL,
    Email nvarchar(254) NOT NULL,
    Phone varchar(15) NOT NULL,
    RoleCode varchar(20) NOT NULL,
    AuthVersion int NOT NULL CONSTRAINT DF_Account_AuthVersion DEFAULT 0,
    IsActive bit NOT NULL CONSTRAINT DF_Account_Active DEFAULT 1,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Account_Created DEFAULT SYSUTCDATETIME(),
    RowVersion rowversion
    );

    -- Hồ sơ tại quầy có thể không có tài khoản; dùng NULL thay vì chuỗi rỗng cho liên kết.
    CREATE TABLE dbo.[Customer] (
    CustomerId varchar(20) NOT NULL CONSTRAINT PK_Customer PRIMARY KEY,
    FullName nvarchar(120) NOT NULL,
    Phone varchar(15) NOT NULL,
    IdentityNo varchar(30) NULL,
    Address nvarchar(512) NOT NULL CONSTRAINT DF_Customer_Address DEFAULT N'',
    AccountId varchar(20) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Customer_Active DEFAULT 1,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Customer_Created DEFAULT SYSUTCDATETIME(),
    RowVersion rowversion
    );

    -- Bảng RoomType; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[RoomType] (
    RoomTypeId varchar(20) NOT NULL CONSTRAINT PK_RoomType PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    Capacity int NOT NULL,
    Beds int NOT NULL,
    HourlyPrice decimal(18,2) NOT NULL,
    NightlyPrice decimal(18,2) NOT NULL,
    DailyPrice decimal(18,2) NOT NULL,
    Amenities nvarchar(1000) NOT NULL CONSTRAINT DF_RoomType_Amenities DEFAULT N'' 
    );

    -- Bảng Room; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[Room] (
    RoomId varchar(20) NOT NULL CONSTRAINT PK_Room PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    RoomTypeId varchar(20) NOT NULL,
    StatusCode varchar(20) NOT NULL CONSTRAINT DF_Room_Status DEFAULT 'AVAILABLE',
    ImagePath nvarchar(512) NULL,
    Note nvarchar(1000) NOT NULL CONSTRAINT DF_Room_Note DEFAULT N'',
    RowVersion rowversion
    );

    -- Bảng HotelService; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[HotelService] (
    ServiceId varchar(20) NOT NULL CONSTRAINT PK_HotelService PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    Description nvarchar(512) NOT NULL CONSTRAINT DF_Service_Description DEFAULT N'',
    UnitName nvarchar(30) NOT NULL,
    Price decimal(18,2) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Service_Active DEFAULT 1
    );

    -- Bảng RoomTypeService; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[RoomTypeService] (
    RoomTypeId varchar(20) NOT NULL,
    ServiceId varchar(20) NOT NULL,
    IsIncluded bit NOT NULL CONSTRAINT DF_RoomTypeService_Included DEFAULT 1,
    CONSTRAINT PK_RoomTypeService PRIMARY KEY(RoomTypeId, ServiceId)
    );

    -- Bảng HolidayRate; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[HolidayRate] (
    HolidayRateId varchar(20) NOT NULL CONSTRAINT PK_HolidayRate PRIMARY KEY,
    Name nvarchar(120) NOT NULL,
    RoomTypeId varchar(20) NOT NULL,
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    IncreasePercent decimal(7,2) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HolidayRate_Active DEFAULT 1
    );

    -- Bảng Membership; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[Membership] (
    MembershipId varchar(20) NOT NULL CONSTRAINT PK_Membership PRIMARY KEY,
    CustomerId varchar(20) NOT NULL,
    Points bigint NOT NULL CONSTRAINT DF_Membership_Points DEFAULT 0,
    IsActive bit NOT NULL CONSTRAINT DF_Membership_Active DEFAULT 1,
    IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_Membership_Issued DEFAULT SYSUTCDATETIME()
    );

    -- Một phiếu giữ một phòng theo [StartAt, EndAt); cọc khác thanh toán toàn bộ.
    CREATE TABLE dbo.[Booking] (
    BookingId varchar(20) NOT NULL CONSTRAINT PK_Booking PRIMARY KEY,
    CustomerId varchar(20) NOT NULL,
    RoomId varchar(20) NOT NULL,
    StartAt datetime2(0) NOT NULL,
    EndAt datetime2(0) NOT NULL,
    GuestCount int NOT NULL,
    StatusCode varchar(20) NOT NULL,
    ChannelCode varchar(20) NOT NULL,
    RoomCharge decimal(18,2) NOT NULL,
    DepositAmount decimal(18,2) NOT NULL CONSTRAINT DF_Booking_Deposit DEFAULT 0,
    HoldUntil datetime2(0) NOT NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Booking_Created DEFAULT SYSUTCDATETIME(),
    CreatedBy varchar(20) NULL,
    RowVersion rowversion
    );

    -- Một phiếu thuê cho một phòng hiện tại, không tạo trùng cho cùng phiếu đặt.
    CREATE TABLE dbo.[Stay] (
    StayId varchar(20) NOT NULL CONSTRAINT PK_Stay PRIMARY KEY,
    BookingId varchar(20) NOT NULL,
    RoomId varchar(20) NOT NULL,
    IdentityNo varchar(30) NOT NULL,
    CheckInAt datetime2(0) NOT NULL,
    CheckOutAt datetime2(0) NULL,
    RoomCharge decimal(18,2) NOT NULL,
    Surcharge decimal(18,2) NOT NULL CONSTRAINT DF_Stay_Surcharge DEFAULT 0,
    CreatedBy varchar(20) NULL,
    RowVersion rowversion
    );

    -- Lịch sử đổi phòng để báo cáo công suất không mất phòng cũ.
    CREATE TABLE dbo.[StayRoomHistory] (
    HistoryId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StayRoomHistory PRIMARY KEY,
    StayId varchar(20) NOT NULL,
    RoomId varchar(20) NOT NULL,
    FromAt datetime2(0) NOT NULL,
    ToAt datetime2(0) NULL,
    ExtraCharge decimal(18,2) NOT NULL CONSTRAINT DF_StayHistory_Extra DEFAULT 0
    );

    -- Hóa đơn nháp cho đến khi đủ dòng chi tiết/thanh toán, sau PAID không sửa.
    CREATE TABLE dbo.[Invoice] (
    InvoiceId varchar(20) NOT NULL CONSTRAINT PK_Invoice PRIMARY KEY,
    StayId varchar(20) NOT NULL,
    CustomerId varchar(20) NOT NULL,
    IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_Invoice_Issued DEFAULT SYSUTCDATETIME(),
    RoomCharge decimal(18,2) NOT NULL,
    ServiceCharge decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Service DEFAULT 0,
    Surcharge decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Surcharge DEFAULT 0,
    DiscountAmount decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Discount DEFAULT 0,
    DepositAmount decimal(18,2) NOT NULL,
    AmountDue AS CONVERT(decimal(18,2), RoomCharge + ServiceCharge + Surcharge - DiscountAmount - DepositAmount) PERSISTED,
    StatusCode varchar(10) NOT NULL CONSTRAINT DF_Invoice_Status DEFAULT 'DRAFT',
    PaymentMethod varchar(20) NOT NULL,
    CreatedBy varchar(20) NULL
    );

    -- Bảng InvoiceLine; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[InvoiceLine] (
    InvoiceLineId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InvoiceLine PRIMARY KEY,
    InvoiceId varchar(20) NOT NULL,
    LineType varchar(20) NOT NULL,
    ServiceId varchar(20) NULL,
    Description nvarchar(200) NOT NULL,
    Quantity decimal(10,2) NOT NULL,
    UnitPrice decimal(18,2) NOT NULL,
    LineAmount AS CONVERT(decimal(18,2), Quantity * UnitPrice) PERSISTED
    );

    -- Bảng Payment; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[Payment] (
    PaymentId varchar(30) NOT NULL CONSTRAINT PK_Payment PRIMARY KEY,
    BookingId varchar(20) NULL,
    InvoiceId varchar(20) NULL,
    PaymentKind varchar(20) NOT NULL,
    Amount decimal(18,2) NOT NULL,
    MethodCode varchar(20) NOT NULL,
    ExternalReference varchar(100) NULL,
    PaidAt datetime2(0) NOT NULL CONSTRAINT DF_Payment_Paid DEFAULT SYSUTCDATETIME(),
    CreatedBy varchar(20) NULL
    );

    -- Sổ điểm mỗi hóa đơn đúng một lần, không chỉnh điểm trực tiếp.
    CREATE TABLE dbo.[MembershipPointEntry] (
    InvoiceId varchar(20) NOT NULL CONSTRAINT PK_MembershipPointEntry PRIMARY KEY,
    MembershipId varchar(20) NOT NULL,
    Points bigint NOT NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_PointEntry_Created DEFAULT SYSUTCDATETIME()
    );

    -- Bảng HousekeepingTask; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[HousekeepingTask] (
    TaskId varchar(20) NOT NULL CONSTRAINT PK_HousekeepingTask PRIMARY KEY,
    RoomId varchar(20) NOT NULL,
    StayId varchar(20) NULL,
    CheckoutAt datetime2(0) NOT NULL,
    DeadlineAt datetime2(0) NOT NULL,
    CompletedAt datetime2(0) NULL,
    StatusCode varchar(20) NOT NULL,
    AssignedTo varchar(20) NULL
    );

    -- Bảng DamageReport; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[DamageReport] (
    DamageReportId varchar(20) NOT NULL CONSTRAINT PK_DamageReport PRIMARY KEY,
    RoomId varchar(20) NOT NULL,
    TaskId varchar(20) NULL,
    Description nvarchar(1000) NOT NULL,
    PhotoPath nvarchar(512) NOT NULL,
    ReportedAt datetime2(0) NOT NULL CONSTRAINT DF_Damage_Reported DEFAULT SYSUTCDATETIME(),
    ReportedBy varchar(20) NOT NULL
    );

    -- Một dòng cấu hình khách sạn.
    CREATE TABLE dbo.[HotelSetting] (
    SettingId tinyint NOT NULL CONSTRAINT PK_HotelSetting PRIMARY KEY,
    HotelName nvarchar(200) NOT NULL,
    Address nvarchar(512) NOT NULL,
    Hotline varchar(15) NOT NULL,
    CheckInTime time(0) NOT NULL,
    CheckOutTime time(0) NOT NULL,
    LateFeeFrom time(0) NOT NULL,
    LateFeePercent decimal(7,2) NOT NULL,
    BankCode varchar(30) NULL,
    BankAccount varchar(40) NULL,
    BankOwner nvarchar(150) NULL,
    LogoPath nvarchar(512) NULL
    );

    -- Chỉ metadata; không phải bản sao lưu thật. File seed chỉ chèn trạng thái DEMO.
    CREATE TABLE dbo.[BackupHistory] (
    BackupId varchar(30) NOT NULL CONSTRAINT PK_BackupHistory PRIMARY KEY,
    FilePath nvarchar(512) NOT NULL,
    BackupAt datetime2(0) NOT NULL,
    CreatedBy varchar(20) NOT NULL,
    StatusCode varchar(20) NOT NULL,
    Note nvarchar(500) NOT NULL CONSTRAINT DF_Backup_Note DEFAULT N'' 
    );

    -- Bảng AuditEvent; kiểm tra và quan hệ được cài tại file 002.
    CREATE TABLE dbo.[AuditEvent] (
    AuditEventId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY,
    EventAt datetime2(0) NOT NULL CONSTRAINT DF_Audit_Time DEFAULT SYSUTCDATETIME(),
    ActorId varchar(20) NULL,
    ActionName nvarchar(100) NOT NULL,
    ObjectType varchar(30) NOT NULL,
    ObjectId varchar(40) NOT NULL,
    Detail nvarchar(2000) NOT NULL CONSTRAINT DF_Audit_Detail DEFAULT N'' 
    );

    -- Phát sinh dịch vụ: đơn giá snapshot; chỉ gắn hóa đơn khi trả phòng.
    CREATE TABLE dbo.ServiceUsage (
      UsageId varchar(20) NOT NULL CONSTRAINT PK_ServiceUsage PRIMARY KEY,
      StayId varchar(20) NOT NULL, ServiceId varchar(20) NOT NULL,
      Quantity decimal(10,2) NOT NULL, UnitPrice decimal(18,2) NOT NULL,
      UsedAt datetime2(0) NOT NULL CONSTRAINT DF_Usage_UsedAt DEFAULT SYSUTCDATETIME(),
      RecordedBy varchar(20) NOT NULL,
      IsVoided bit NOT NULL CONSTRAINT DF_Usage_Void DEFAULT 0,
      InvoiceId varchar(20) NULL
    );
    INSERT dbo.SchemaVersion(VersionNo) VALUES (10);
    COMMIT TRANSACTION;
    PRINT N'001: Đã tạo 23 bảng. Tiếp tục chạy 02_programmability.sql.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
