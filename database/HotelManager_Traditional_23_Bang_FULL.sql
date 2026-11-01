/*
 HotelManager_Traditional_Report.sql
 PURPOSE: Independent academic/report schema based on HotelManager_Traditional_Full23_PKFK.dbml.
 SQL Server 2019+. 23 tables, 28 foreign keys. No triggers or stored procedures.
 IMPORTANT: This is NOT the GitHub application database. No DROP DATABASE or DELETE statements.
 Run via SSMS. Do not use this script to migrate production data.
 DB constraints cannot alone prevent overlapping date-range bookings or reconcile all money totals;
 transactional validation belongs to the MVC model/service layer.
*/
USE [master];
GO
IF DB_ID(N'HotelManager_Traditional_Report') IS NOT NULL
    THROW 51001, N'Database HotelManager_Traditional_Report already exists. Script stopped to avoid changing existing data.', 1;
GO
CREATE DATABASE [HotelManager_Traditional_Report];
GO
USE [HotelManager_Traditional_Report];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- SchemaVersion
CREATE TABLE dbo.[SchemaVersion] (

    VersionNo int NOT NULL CONSTRAINT PK_SchemaVersion PRIMARY KEY,
    AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SchemaVersion_Applied DEFAULT SYSUTCDATETIME()
);
GO

-- SeedHistory
CREATE TABLE dbo.[SeedHistory] (

    SeedName varchar(100) NOT NULL CONSTRAINT PK_SeedHistory PRIMARY KEY,
    AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SeedHistory_Applied DEFAULT SYSUTCDATETIME()
);
GO

-- Account
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
GO

-- Customer
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
GO

-- RoomType
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
GO

-- Room
CREATE TABLE dbo.[Room] (

    RoomId varchar(20) NOT NULL CONSTRAINT PK_Room PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    RoomTypeId varchar(20) NOT NULL,
    StatusCode varchar(20) NOT NULL CONSTRAINT DF_Room_Status DEFAULT 'AVAILABLE',
    ImagePath nvarchar(512) NULL,
    Note nvarchar(1000) NOT NULL CONSTRAINT DF_Room_Note DEFAULT N'',
    RowVersion rowversion
);
GO

-- HotelService
CREATE TABLE dbo.[HotelService] (

    ServiceId varchar(20) NOT NULL CONSTRAINT PK_HotelService PRIMARY KEY,
    Name nvarchar(100) NOT NULL,
    Description nvarchar(512) NOT NULL CONSTRAINT DF_Service_Description DEFAULT N'',
    UnitName nvarchar(30) NOT NULL,
    Price decimal(18,2) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Service_Active DEFAULT 1
);
GO

-- RoomTypeService
CREATE TABLE dbo.[RoomTypeService] (

    RoomTypeId varchar(20) NOT NULL,
    ServiceId varchar(20) NOT NULL,
    IsIncluded bit NOT NULL CONSTRAINT DF_RoomTypeService_Included DEFAULT 1,
    CONSTRAINT PK_RoomTypeService PRIMARY KEY(RoomTypeId, ServiceId)
);
GO

-- HolidayRate
CREATE TABLE dbo.[HolidayRate] (

    HolidayRateId varchar(20) NOT NULL CONSTRAINT PK_HolidayRate PRIMARY KEY,
    Name nvarchar(120) NOT NULL,
    RoomTypeId varchar(20) NOT NULL,
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    IncreasePercent decimal(7,2) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HolidayRate_Active DEFAULT 1
);
GO

-- Membership
CREATE TABLE dbo.[Membership] (

    MembershipId varchar(20) NOT NULL CONSTRAINT PK_Membership PRIMARY KEY,
    CustomerId varchar(20) NOT NULL,
    Points bigint NOT NULL CONSTRAINT DF_Membership_Points DEFAULT 0,
    IsActive bit NOT NULL CONSTRAINT DF_Membership_Active DEFAULT 1,
    IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_Membership_Issued DEFAULT SYSUTCDATETIME()
);
GO

-- Booking
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
    RowVersion rowversion
);
GO

-- Stay
CREATE TABLE dbo.[Stay] (

    StayId varchar(20) NOT NULL CONSTRAINT PK_Stay PRIMARY KEY,
    BookingId varchar(20) NOT NULL,
    IdentityNo varchar(30) NOT NULL,
    CheckInAt datetime2(0) NOT NULL,
    CheckOutAt datetime2(0) NULL,
    RoomCharge decimal(18,2) NOT NULL,
    Surcharge decimal(18,2) NOT NULL CONSTRAINT DF_Stay_Surcharge DEFAULT 0,
    RowVersion rowversion
);
GO

-- StayRoomHistory
CREATE TABLE dbo.[StayRoomHistory] (

    HistoryId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StayRoomHistory PRIMARY KEY,
    StayId varchar(20) NOT NULL,
    RoomId varchar(20) NOT NULL,
    FromAt datetime2(0) NOT NULL,
    ToAt datetime2(0) NULL,
    ExtraCharge decimal(18,2) NOT NULL CONSTRAINT DF_StayHistory_Extra DEFAULT 0
);
GO

-- Invoice
CREATE TABLE dbo.[Invoice] (

    InvoiceId varchar(20) NOT NULL CONSTRAINT PK_Invoice PRIMARY KEY,
    StayId varchar(20) NOT NULL,
    IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_Invoice_Issued DEFAULT SYSUTCDATETIME(),
    RoomCharge decimal(18,2) NOT NULL,
    ServiceCharge decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Service DEFAULT 0,
    Surcharge decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Surcharge DEFAULT 0,
    DiscountAmount decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Discount DEFAULT 0,
    DepositAmount decimal(18,2) NOT NULL,
    AmountDue AS CONVERT(decimal(18,2), RoomCharge + ServiceCharge + Surcharge - DiscountAmount - DepositAmount) PERSISTED,
    StatusCode varchar(10) NOT NULL CONSTRAINT DF_Invoice_Status DEFAULT 'DRAFT',
    PaymentMethod varchar(20) NOT NULL
);
GO

-- InvoiceLine
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
GO

-- Payment
CREATE TABLE dbo.[Payment] (

    PaymentId varchar(30) NOT NULL CONSTRAINT PK_Payment PRIMARY KEY,
    BookingId varchar(20) NULL,
    InvoiceId varchar(20) NULL,
    PaymentKind varchar(20) NOT NULL,
    Amount decimal(18,2) NOT NULL,
    MethodCode varchar(20) NOT NULL,
    ExternalReference varchar(100) NULL,
    PaidAt datetime2(0) NOT NULL CONSTRAINT DF_Payment_Paid DEFAULT SYSUTCDATETIME()
);
GO

-- MembershipPointEntry
CREATE TABLE dbo.[MembershipPointEntry] (

    InvoiceId varchar(20) NOT NULL CONSTRAINT PK_MembershipPointEntry PRIMARY KEY,
    MembershipId varchar(20) NOT NULL,
    Points bigint NOT NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_PointEntry_Created DEFAULT SYSUTCDATETIME()
);
GO

-- HousekeepingTask
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
GO

-- DamageReport
CREATE TABLE dbo.[DamageReport] (

    DamageReportId varchar(20) NOT NULL CONSTRAINT PK_DamageReport PRIMARY KEY,
    RoomId varchar(20) NOT NULL,
    TaskId varchar(20) NULL,
    Description nvarchar(1000) NOT NULL,
    PhotoPath nvarchar(512) NOT NULL,
    ReportedAt datetime2(0) NOT NULL CONSTRAINT DF_Damage_Reported DEFAULT SYSUTCDATETIME(),
    ReportedBy varchar(20) NOT NULL
);
GO

-- HotelSetting
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
GO

-- BackupHistory
CREATE TABLE dbo.[BackupHistory] (

    BackupId varchar(30) NOT NULL CONSTRAINT PK_BackupHistory PRIMARY KEY,
    FilePath nvarchar(512) NOT NULL,
    BackupAt datetime2(0) NOT NULL,
    CreatedBy varchar(20) NOT NULL,
    StatusCode varchar(20) NOT NULL,
    Note nvarchar(500) NOT NULL CONSTRAINT DF_Backup_Note DEFAULT N''
);
GO

-- AuditEvent
CREATE TABLE dbo.[AuditEvent] (

    AuditEventId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY,
    EventAt datetime2(0) NOT NULL CONSTRAINT DF_Audit_Time DEFAULT SYSUTCDATETIME(),
    ActorId varchar(20) NULL,
    ActionName nvarchar(100) NOT NULL,
    ObjectType varchar(30) NOT NULL,
    ObjectId varchar(40) NOT NULL,
    Detail nvarchar(2000) NOT NULL CONSTRAINT DF_Audit_Detail DEFAULT N''
);
GO

-- ServiceUsage
CREATE TABLE dbo.[ServiceUsage] (
      UsageId varchar(20) NOT NULL CONSTRAINT PK_ServiceUsage PRIMARY KEY,
      StayId varchar(20) NOT NULL,
      ServiceId varchar(20) NOT NULL,
      Quantity decimal(10,2) NOT NULL,
      UnitPrice decimal(18,2) NOT NULL,
      UsedAt datetime2(0) NOT NULL CONSTRAINT DF_Usage_UsedAt DEFAULT SYSUTCDATETIME(),
      IsVoided bit NOT NULL CONSTRAINT DF_Usage_Void DEFAULT 0
);
GO

-- FOREIGN KEYS: exactly the 28 relationships of the report DBML.

ALTER TABLE dbo.[Customer] WITH CHECK ADD CONSTRAINT FK_Customer_AccountId FOREIGN KEY ([AccountId]) REFERENCES dbo.[Account]([AccountId]);
GO

ALTER TABLE dbo.[Membership] WITH CHECK ADD CONSTRAINT FK_Membership_CustomerId FOREIGN KEY ([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
GO

ALTER TABLE dbo.[Room] WITH CHECK ADD CONSTRAINT FK_Room_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
GO

ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT FK_RoomTypeService_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
GO

ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT FK_RoomTypeService_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
GO

ALTER TABLE dbo.[HolidayRate] WITH CHECK ADD CONSTRAINT FK_HolidayRate_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
GO

ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT FK_Booking_CustomerId FOREIGN KEY ([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
GO

ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT FK_Booking_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
GO

ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT FK_Stay_BookingId FOREIGN KEY ([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
GO

ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT FK_StayRoomHistory_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
GO

ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT FK_StayRoomHistory_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
GO

ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
GO

ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
GO

ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT FK_Invoice_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
GO

ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT FK_InvoiceLine_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
GO

ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT FK_InvoiceLine_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
GO

ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT FK_Payment_BookingId FOREIGN KEY ([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
GO

ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT FK_Payment_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
GO

ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT FK_MembershipPointEntry_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
GO

ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT FK_MembershipPointEntry_MembershipId FOREIGN KEY ([MembershipId]) REFERENCES dbo.[Membership]([MembershipId]);
GO

ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
GO

ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
GO

ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_AssignedTo FOREIGN KEY ([AssignedTo]) REFERENCES dbo.[Account]([AccountId]);
GO

ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
GO

ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_TaskId FOREIGN KEY ([TaskId]) REFERENCES dbo.[HousekeepingTask]([TaskId]);
GO

ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_ReportedBy FOREIGN KEY ([ReportedBy]) REFERENCES dbo.[Account]([AccountId]);
GO

ALTER TABLE dbo.[BackupHistory] WITH CHECK ADD CONSTRAINT FK_BackupHistory_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
GO

ALTER TABLE dbo.[AuditEvent] WITH CHECK ADD CONSTRAINT FK_AuditEvent_ActorId FOREIGN KEY ([ActorId]) REFERENCES dbo.[Account]([AccountId]);
GO

-- Minimal additional structural constraints; no trigger/stored procedure.
-- Multiple walk-in customers may have no account; only non-NULL AccountId values must be unique.
CREATE UNIQUE INDEX UX_Report_Customer_Account_NotNull ON dbo.Customer(AccountId) WHERE AccountId IS NOT NULL;
ALTER TABLE dbo.Membership ADD CONSTRAINT UQ_Report_Membership_Customer UNIQUE (CustomerId);
ALTER TABLE dbo.Stay ADD CONSTRAINT UQ_Report_Stay_Booking UNIQUE (BookingId);
ALTER TABLE dbo.Invoice ADD CONSTRAINT UQ_Report_Invoice_Stay UNIQUE (StayId);
GO
ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Report_Booking_Dates CHECK (EndAt > StartAt),
  CONSTRAINT CK_Report_Booking_Guests CHECK (GuestCount > 0),
  CONSTRAINT CK_Report_Booking_Amounts CHECK (RoomCharge >= 0 AND DepositAmount >= 0);
ALTER TABLE dbo.Stay ADD CONSTRAINT CK_Report_Stay_Dates CHECK (CheckOutAt IS NULL OR CheckOutAt >= CheckInAt),
  CONSTRAINT CK_Report_Stay_Amounts CHECK (RoomCharge >= 0 AND Surcharge >= 0);
ALTER TABLE dbo.StayRoomHistory ADD CONSTRAINT CK_Report_History_Dates CHECK (ToAt IS NULL OR ToAt > FromAt),
  CONSTRAINT CK_Report_History_Extra CHECK (ExtraCharge >= 0);
ALTER TABLE dbo.RoomType ADD CONSTRAINT CK_Report_RoomType_Values CHECK (Capacity > 0 AND Beds > 0 AND HourlyPrice > 0 AND NightlyPrice > 0 AND DailyPrice > 0);
ALTER TABLE dbo.HotelService ADD CONSTRAINT CK_Report_Service_Price CHECK (Price >= 0);
ALTER TABLE dbo.HolidayRate ADD CONSTRAINT CK_Report_HolidayRate CHECK (EndDate >= StartDate AND IncreasePercent >= 0);
ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT CK_Report_Usage_Values CHECK (Quantity > 0 AND UnitPrice >= 0);
ALTER TABLE dbo.InvoiceLine ADD CONSTRAINT CK_Report_InvoiceLine_Values CHECK (Quantity > 0 AND UnitPrice >= 0);
ALTER TABLE dbo.Invoice ADD CONSTRAINT CK_Report_Invoice_Amounts CHECK (RoomCharge >= 0 AND ServiceCharge >= 0 AND Surcharge >= 0 AND DiscountAmount >= 0 AND DepositAmount >= 0);
ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Report_Payment_Positive CHECK (Amount > 0),
  CONSTRAINT CK_Report_Payment_OneTarget CHECK ((BookingId IS NOT NULL AND InvoiceId IS NULL AND PaymentKind = 'DEPOSIT') OR (BookingId IS NULL AND InvoiceId IS NOT NULL AND PaymentKind = 'SETTLEMENT'));
ALTER TABLE dbo.Membership ADD CONSTRAINT CK_Report_Membership_Points CHECK (Points >= 0);
GO
-- A stay can have at most one open room assignment. Room occupancy overlaps require MVC transaction checks.
CREATE UNIQUE INDEX UX_Report_StayHistory_OneOpen ON dbo.StayRoomHistory(StayId) WHERE ToAt IS NULL;
GO
-- Verify actual physical schema (not data). Expected: 23 tables, 28 foreign keys.
SELECT COUNT(*) AS TableCount FROM sys.tables WHERE is_ms_shipped = 0;
SELECT COUNT(*) AS ForeignKeyCount FROM sys.foreign_keys;
GO
PRINT N'Report schema created. No demo rows inserted. GitHub database remains unchanged.';
GO


-- === SEED FOLLOWS ===
/*
  02_seed_traditional_report.sql
  Demo dataset for HotelManager_Traditional_Report (23 tables / 28 FK).
  Run AFTER HotelManager_Traditional_Report_23_Tables.sql in SSMS.
  Idempotent seed: a completed marker prevents duplicate inserts.
  Does not DROP or DELETE anything. Sample hashes are NOT login credentials.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
IF OBJECT_ID(N'dbo.SeedHistory', N'U') IS NULL
    THROW 51020, N'Please run the report schema first.', 1;
GO
BEGIN TRY
  BEGIN TRANSACTION;
  IF EXISTS (SELECT 1 FROM dbo.SeedHistory WITH (UPDLOCK, HOLDLOCK) WHERE SeedName = 'report_demo_v1')
  BEGIN
    PRINT N'Demo data was previously inserted; no changes made.';
  END
  ELSE
  BEGIN
    IF EXISTS (SELECT 1 FROM dbo.Account WHERE AccountId LIKE 'DEMO%')
       THROW 51021, N'Conflicting DEMO IDs already exist; aborting seed.', 1;

    INSERT dbo.SchemaVersion(VersionNo) VALUES (1);
    INSERT dbo.Account (AccountId, PasswordHash, FullName, Email, Phone, RoleCode) VALUES
      ('DEMOA01','mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=',N'Quản trị hệ thống',N'admin.demo@hotel.test','0900000001','ADMIN'),
      ('DEMOA02','DRIpKm7xNvavRmth2bbNTA==:avBWkFNlLF2WMuc1yR8m7tUSJdXhJF9o7q/8RfmFjC0=',N'Lễ tân Minh',N'reception.demo@hotel.test','0900000002','RECEPTIONIST'),
      ('DEMOA03','ScqPz+kq8B3NHlYSd4t3AQ==:SB2Jy1XQTdbNcA853DgdAsHuaBrIlc82K74HM/8pE/Q=',N'Buồng phòng Lan',N'housekeeping.demo@hotel.test','0900000003','HOUSEKEEPER'),
      ('DEMOA04','S4kJDsY2qmhNC3xo0VnCTA==:UoRvxsJNK4Ped30W06RAqGEdl5W4S7kWxGKAGQujTnk=',N'Khách hàng An',N'customer.demo@hotel.test','0900000004','CUSTOMER');

    INSERT dbo.Customer(CustomerId, FullName, Phone, IdentityNo, Address, AccountId) VALUES
      ('DEMOC01',N'Nguyễn Văn An','0911000001','079200000001',N'TP. Hồ Chí Minh','DEMOA04'),
      ('DEMOC02',N'Trần Thị Bình','0911000002','079200000002',N'Hà Nội',NULL),
      ('DEMOC03',N'Lê Quốc Cường','0911000003','079200000003',N'Đà Nẵng',NULL);

    INSERT dbo.RoomType(RoomTypeId,Name,Capacity,Beds,HourlyPrice,NightlyPrice,DailyPrice,Amenities) VALUES
      ('DEMOT01',N'Standard',2,1,120000,450000,550000,N'Wi-Fi, máy lạnh'),
      ('DEMOT02',N'Superior',2,2,150000,550000,650000,N'Wi-Fi, TV, máy lạnh'),
      ('DEMOT03',N'Deluxe',3,2,200000,700000,850000,N'Wi-Fi, TV, bồn tắm');

    INSERT dbo.Room(RoomId,Name,RoomTypeId,StatusCode,Note) VALUES
      ('DEMOR101',N'Phòng 101','DEMOT01','AVAILABLE',N'Tầng 1'),
      ('DEMOR102',N'Phòng 102','DEMOT02','AVAILABLE',N'Tầng 1'),
      ('DEMOR201',N'Phòng 201','DEMOT03','AVAILABLE',N'Tầng 2'),
      ('DEMOR202',N'Phòng 202','DEMOT03','AVAILABLE',N'Tầng 2');

    INSERT dbo.HotelService(ServiceId,Name,Description,UnitName,Price) VALUES
      ('DEMOS01',N'Nước suối',N'Nước suối minibar',N'Chai',20000),
      ('DEMOS02',N'Giặt ủi',N'Dịch vụ giặt ủi',N'Kg',50000),
      ('DEMOS03',N'Ăn sáng',N'Bữa sáng tại khách sạn',N'Phần',120000);

    INSERT dbo.RoomTypeService(RoomTypeId,ServiceId,IsIncluded) VALUES
      ('DEMOT01','DEMOS01',0),('DEMOT02','DEMOS01',1),
      ('DEMOT03','DEMOS01',1),('DEMOT03','DEMOS03',1);
    INSERT dbo.HolidayRate(HolidayRateId,Name,RoomTypeId,StartDate,EndDate,IncreasePercent) VALUES
      ('DEMOH01',N'Lễ Quốc khánh','DEMOT03','2026-09-01','2026-09-03',20.00);
    INSERT dbo.Membership(MembershipId,CustomerId,Points) VALUES
      ('DEMOM01','DEMOC01',100);

    -- Room originally booked is DEMOR201; Stay history records move to DEMOR202.
    INSERT dbo.Booking(BookingId,CustomerId,RoomId,StartAt,EndAt,GuestCount,StatusCode,ChannelCode,RoomCharge,DepositAmount,HoldUntil) VALUES
      ('DEMOB01','DEMOC01','DEMOR201','2026-09-04T14:00:00','2026-09-06T12:00:00',2,'COMPLETED','ONLINE',1700000,300000,'2026-09-03T18:00:00'),
      ('DEMOB02','DEMOC02','DEMOR102','2026-11-05T14:00:00','2026-11-06T12:00:00',2,'CONFIRMED','COUNTER',650000,150000,'2026-11-04T18:00:00'),
      ('DEMOB03','DEMOC03','DEMOR101','2026-11-09T14:00:00','2026-11-10T12:00:00',1,'PENDING','ONLINE',550000,0,'2026-11-08T18:00:00');

    INSERT dbo.Stay(StayId,BookingId,IdentityNo,CheckInAt,CheckOutAt,RoomCharge,Surcharge) VALUES
      ('DEMOST01','DEMOB01','079200000001','2026-09-04T14:10:00','2026-09-06T11:30:00',1700000,0);

    INSERT dbo.StayRoomHistory(StayId,RoomId,FromAt,ToAt,ExtraCharge) VALUES
      ('DEMOST01','DEMOR201','2026-09-04T14:10:00','2026-09-05T10:00:00',0),
      ('DEMOST01','DEMOR202','2026-09-05T10:00:00','2026-09-06T11:30:00',0);

    INSERT dbo.ServiceUsage(UsageId,StayId,ServiceId,Quantity,UnitPrice,UsedAt) VALUES
      ('DEMOU01','DEMOST01','DEMOS01',2,20000,'2026-09-04T16:00:00'),
      ('DEMOU02','DEMOST01','DEMOS02',1,50000,'2026-09-05T15:00:00');

    -- Room 1,700,000 + services 90,000 - deposit 300,000 = due 1,490,000.
    INSERT dbo.Invoice(InvoiceId,StayId,IssuedAt,RoomCharge,ServiceCharge,Surcharge,DiscountAmount,DepositAmount,StatusCode,PaymentMethod) VALUES
      ('DEMOI01','DEMOST01','2026-09-06T11:40:00',1700000,90000,0,0,300000,'PAID','CASH');
    INSERT dbo.InvoiceLine(InvoiceId,LineType,ServiceId,Description,Quantity,UnitPrice) VALUES
      ('DEMOI01','ROOM',NULL,N'Tiền phòng 2 đêm',1,1700000),
      ('DEMOI01','SERVICE','DEMOS01',N'Nước suối',2,20000),
      ('DEMOI01','SERVICE','DEMOS02',N'Giặt ủi',1,50000);

    INSERT dbo.Payment(PaymentId,BookingId,InvoiceId,PaymentKind,Amount,MethodCode,PaidAt) VALUES
      ('DEMOP01','DEMOB01',NULL,'DEPOSIT',300000,'TRANSFER','2026-09-03T15:00:00'),
      ('DEMOP02',NULL,'DEMOI01','SETTLEMENT',1490000,'CASH','2026-09-06T11:45:00'),
      ('DEMOP03','DEMOB02',NULL,'DEPOSIT',150000,'TRANSFER','2026-11-04T12:00:00');

    INSERT dbo.MembershipPointEntry(InvoiceId,MembershipId,Points) VALUES
      ('DEMOI01','DEMOM01',100);

    INSERT dbo.HousekeepingTask(TaskId,RoomId,StayId,CheckoutAt,DeadlineAt,CompletedAt,StatusCode,AssignedTo) VALUES
      ('DEMOK01','DEMOR202','DEMOST01','2026-09-06T11:30:00','2026-09-06T14:00:00','2026-09-06T13:00:00','DONE','DEMOA03'),
      ('DEMOK02','DEMOR102',NULL,'2026-11-04T09:00:00','2026-11-04T12:00:00',NULL,'OPEN','DEMOA03');

    INSERT dbo.DamageReport(DamageReportId,RoomId,TaskId,Description,PhotoPath,ReportedAt,ReportedBy) VALUES
      ('DEMOD01','DEMOR202','DEMOK01',N'Khăn tắm bị rách',N'demo/damage-202.jpg','2026-09-06T12:00:00','DEMOA03');

    INSERT dbo.HotelSetting(SettingId,HotelName,Address,Hotline,CheckInTime,CheckOutTime,LateFeeFrom,LateFeePercent) VALUES
      (1,N'HotelManager - dữ liệu mẫu',N'123 Đường Demo, TP. Hồ Chí Minh','02839990000','14:00:00','12:00:00','13:00:00',10.00);

    INSERT dbo.BackupHistory(BackupId,FilePath,BackupAt,CreatedBy,StatusCode,Note) VALUES
      ('DEMOBK01',N'demo/backup_metadata_only.bak','2026-09-07T09:00:00','DEMOA01','DEMO',N'Bản ghi minh họa; không có file sao lưu thật');

    INSERT dbo.AuditEvent(ActorId,ActionName,ObjectType,ObjectId,Detail) VALUES
      ('DEMOA02',N'Tạo đặt phòng',N'Booking','DEMOB01',N'Thao tác minh họa'),
      ('DEMOA03',N'Hoàn tất dọn phòng',N'HousekeepingTask','DEMOK01',N'Thao tác minh họa');

    INSERT dbo.SeedHistory(SeedName) VALUES ('report_demo_v1');
    PRINT N'Inserted demo records successfully into the report database.';
  END;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO

-- Verify all 23 tables and 28 foreign keys; inspect demo rows.
SELECT COUNT(*) AS TableCount FROM sys.tables WHERE is_ms_shipped = 0;
SELECT COUNT(*) AS ForeignKeyCount FROM sys.foreign_keys;
SELECT t.name AS TableName, SUM(p.rows) AS [RowCount]
FROM sys.tables t
JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
GROUP BY t.name ORDER BY t.name;
SELECT i.InvoiceId, i.AmountDue, 
       (SELECT COALESCE(SUM(p.Amount),0) FROM dbo.Payment p WHERE p.InvoiceId=i.InvoiceId) AS SettledAmount
FROM dbo.Invoice i WHERE i.InvoiceId='DEMOI01';
GO
