/*
 HotelManagerOOAD.sql
 Canonical SQL Server 2019+ application schema and development seed.

 Create/select your application database in SSMS, or select it with sqlcmd -d.
 Run this entire file with input code page 65001. It uses the selected database,
 upgrades older checked-in shapes to version 5, and is safe to
 rerun: DDL is conditional and the realistic seed has a durable marker. It
 never drops the database or application data. SchemaVersion 5 is recorded
 only after all tables, constraints, seed handling, views, and triggers finish.

 sqlcmd example:
 sqlcmd -S localhost,1433 -E -C -d YourHotelDatabase -f 65001 -b -i database\HotelManagerOOAD.sql
 */
SET NOEXEC OFF;
IF DB_ID() IN (1, 2, 3, 4)
BEGIN
    RAISERROR(N'Select your application database in SSMS or use sqlcmd -d before running this script. System databases are not supported.', 16, 1);
    SET NOEXEC ON;
END;
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

IF OBJECT_ID(N'dbo.SchemaVersion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[SchemaVersion] (
        VersionNo int NOT NULL CONSTRAINT PK_SchemaVersion PRIMARY KEY,
        AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SchemaVersion_Applied DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF EXISTS (SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo > 5)
    THROW 51040, N'Database schema is newer than this installer.', 1;
GO

IF OBJECT_ID(N'dbo.SeedHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[SeedHistory] (
        SeedName varchar(100) NOT NULL CONSTRAINT PK_SeedHistory PRIMARY KEY,
        AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SeedHistory_Applied DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID(N'dbo.Account', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.Customer', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.RoomType', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.Room', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[Room] (
        RoomId varchar(20) NOT NULL CONSTRAINT PK_Room PRIMARY KEY,
        Name nvarchar(100) NOT NULL,
        RoomTypeId varchar(20) NOT NULL,
        StatusCode varchar(20) NOT NULL CONSTRAINT DF_Room_Status DEFAULT 'AVAILABLE',
        ImagePath nvarchar(512) NULL,
        ImageGalleryJson nvarchar(2000) NULL,
        ViewName nvarchar(100) NULL,
        Amenities nvarchar(1000) NULL,
        Note nvarchar(1000) NOT NULL CONSTRAINT DF_Room_Note DEFAULT N'',
        RowVersion rowversion
    );
END;
GO

IF OBJECT_ID(N'dbo.HotelService', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[HotelService] (
        ServiceId varchar(20) NOT NULL CONSTRAINT PK_HotelService PRIMARY KEY,
        Name nvarchar(100) NOT NULL,
        Description nvarchar(512) NOT NULL CONSTRAINT DF_Service_Description DEFAULT N'',
        UnitName nvarchar(30) NOT NULL,
        Price decimal(18,2) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Service_Active DEFAULT 1
    );
END;
GO

IF OBJECT_ID(N'dbo.RoomTypeService', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[RoomTypeService] (
        RoomTypeId varchar(20) NOT NULL,
        ServiceId varchar(20) NOT NULL,
        IsIncluded bit NOT NULL CONSTRAINT DF_RoomTypeService_Included DEFAULT 1,
        CONSTRAINT PK_RoomTypeService PRIMARY KEY(RoomTypeId, ServiceId)
    );
END;
GO

IF OBJECT_ID(N'dbo.HolidayRate', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[HolidayRate] (
        HolidayRateId varchar(20) NOT NULL CONSTRAINT PK_HolidayRate PRIMARY KEY,
        Name nvarchar(120) NOT NULL,
        RoomTypeId varchar(20) NOT NULL,
        ScheduleType varchar(10) NOT NULL CONSTRAINT DF_HolidayRate_ScheduleType DEFAULT 'ONE_OFF',
        StartDate date NULL,
        EndDate date NULL,
        StartMonthDay char(5) NULL,
        EndMonthDay char(5) NULL,
        IncreasePercent decimal(7,2) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_HolidayRate_Active DEFAULT 1
    );
END;
GO

IF OBJECT_ID(N'dbo.Membership', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[Membership] (
        MembershipId varchar(20) NOT NULL CONSTRAINT PK_Membership PRIMARY KEY,
        CustomerId varchar(20) NOT NULL,
        Points bigint NOT NULL CONSTRAINT DF_Membership_Points DEFAULT 0,
        IsActive bit NOT NULL CONSTRAINT DF_Membership_Active DEFAULT 1,
        IssuedAt datetime2(0) NOT NULL CONSTRAINT DF_Membership_Issued DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID(N'dbo.Booking', N'U') IS NULL
BEGIN
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
        HoldUntil datetime2(0) NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Booking_Created DEFAULT SYSUTCDATETIME(),
        CreatedBy varchar(20) NULL,
        RowVersion rowversion
    );
END;
GO

-- Walk-in stays are already checked in and do not need a reservation hold deadline.
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Booking')
      AND name = N'HoldUntil'
      AND is_nullable = 0
)
    ALTER TABLE dbo.Booking ALTER COLUMN HoldUntil datetime2(0) NULL;
GO

IF OBJECT_ID(N'dbo.Stay', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[Stay] (
        StayId varchar(20) NOT NULL CONSTRAINT PK_Stay PRIMARY KEY,
        BookingId varchar(20) NOT NULL,
        IdentityNo varchar(30) NOT NULL,
        CheckInAt datetime2(0) NOT NULL,
        CheckOutAt datetime2(0) NULL,
        RoomCharge decimal(18,2) NOT NULL,
        Surcharge decimal(18,2) NOT NULL CONSTRAINT DF_Stay_Surcharge DEFAULT 0,
        CreatedBy varchar(20) NULL,
        RowVersion rowversion
    );
END;
GO

IF OBJECT_ID(N'dbo.StayRoomHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[StayRoomHistory] (
        HistoryId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StayRoomHistory PRIMARY KEY,
        StayId varchar(20) NOT NULL,
        RoomId varchar(20) NOT NULL,
        FromAt datetime2(0) NOT NULL,
        ToAt datetime2(0) NULL,
        ExtraCharge decimal(18,2) NOT NULL CONSTRAINT DF_StayHistory_Extra DEFAULT 0
    );
END;
GO

IF OBJECT_ID(N'dbo.Invoice', N'U') IS NULL
BEGIN
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
        CustomerNameSnapshot nvarchar(120) NULL,
        CustomerIdentitySnapshot varchar(30) NULL,
        CustomerPhoneSnapshot varchar(30) NULL,
        RoomNameSnapshot nvarchar(100) NULL,
        HotelNameSnapshot nvarchar(200) NULL,
        HotelAddressSnapshot nvarchar(512) NULL,
        HotelHotlineSnapshot varchar(30) NULL,
        PaymentReferenceSnapshot varchar(100) NULL,
        CreatedBy varchar(20) NULL,
        RowVersion rowversion
    );
END;
GO

IF OBJECT_ID(N'dbo.InvoiceLine', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.Payment', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.MembershipPointEntry', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[MembershipPointEntry] (
        InvoiceId varchar(20) NOT NULL CONSTRAINT PK_MembershipPointEntry PRIMARY KEY,
        MembershipId varchar(20) NOT NULL,
        Points bigint NOT NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_PointEntry_Created DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID(N'dbo.HousekeepingTask', N'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID(N'dbo.DamageReport', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[DamageReport] (
        DamageReportId varchar(20) NOT NULL CONSTRAINT PK_DamageReport PRIMARY KEY,
        RoomId varchar(20) NOT NULL,
        TaskId varchar(20) NULL,
        Description nvarchar(1000) NOT NULL,
        PhotoPath nvarchar(512) NOT NULL,
        ReportedAt datetime2(0) NOT NULL CONSTRAINT DF_Damage_Reported DEFAULT SYSUTCDATETIME(),
        ReportedBy varchar(20) NOT NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.HotelSetting', N'U') IS NULL
BEGIN
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
        LogoPath nvarchar(512) NULL,
        QrImagePath nvarchar(512) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.BackupHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[BackupHistory] (
        BackupId varchar(30) NOT NULL CONSTRAINT PK_BackupHistory PRIMARY KEY,
        FilePath nvarchar(512) NOT NULL,
        BackupAt datetime2(0) NOT NULL,
        CreatedBy varchar(20) NOT NULL,
        StatusCode varchar(20) NOT NULL,
        Note nvarchar(500) NOT NULL CONSTRAINT DF_Backup_Note DEFAULT N''
    );
END;
GO

IF OBJECT_ID(N'dbo.AuditEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[AuditEvent] (
        AuditEventId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY,
        EventAt datetime2(0) NOT NULL CONSTRAINT DF_Audit_Time DEFAULT SYSUTCDATETIME(),
        ActorId varchar(20) NULL,
        ActionName nvarchar(100) NOT NULL,
        ObjectType varchar(30) NOT NULL,
        ObjectId varchar(40) NOT NULL,
        Detail nvarchar(2000) NOT NULL CONSTRAINT DF_Audit_Detail DEFAULT N''
    );
END;
GO

IF OBJECT_ID(N'dbo.ServiceUsage', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[ServiceUsage] (
        UsageId varchar(20) NOT NULL CONSTRAINT PK_ServiceUsage PRIMARY KEY,
        StayId varchar(20) NOT NULL,
        ServiceId varchar(20) NOT NULL,
        Quantity decimal(10,2) NOT NULL,
        UnitPrice decimal(18,2) NOT NULL,
        UsedAt datetime2(0) NOT NULL CONSTRAINT DF_Usage_UsedAt DEFAULT SYSUTCDATETIME(),
        RecordedBy varchar(20) NULL,
        IsVoided bit NOT NULL CONSTRAINT DF_Usage_Void DEFAULT 0,
        InvoiceId varchar(20) NULL
    );
END;
GO

-- Version 2 -> 3 additive migration. Nullable actor columns preserve legacy/system rows.
IF COL_LENGTH(N'dbo.Booking', N'CreatedBy') IS NULL
    ALTER TABLE dbo.Booking ADD CreatedBy varchar(20) NULL;
IF COL_LENGTH(N'dbo.Stay', N'CreatedBy') IS NULL
    ALTER TABLE dbo.Stay ADD CreatedBy varchar(20) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'CreatedBy') IS NULL
    ALTER TABLE dbo.Invoice ADD CreatedBy varchar(20) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'RowVersion') IS NULL
    ALTER TABLE dbo.Invoice ADD RowVersion rowversion;
IF COL_LENGTH(N'dbo.Payment', N'CreatedBy') IS NULL
    ALTER TABLE dbo.Payment ADD CreatedBy varchar(20) NULL;
IF COL_LENGTH(N'dbo.ServiceUsage', N'RecordedBy') IS NULL
    ALTER TABLE dbo.ServiceUsage ADD RecordedBy varchar(20) NULL;
IF COL_LENGTH(N'dbo.ServiceUsage', N'InvoiceId') IS NULL
    ALTER TABLE dbo.ServiceUsage ADD InvoiceId varchar(20) NULL;
IF COL_LENGTH(N'dbo.HotelSetting', N'QrImagePath') IS NULL
    ALTER TABLE dbo.HotelSetting ADD QrImagePath nvarchar(512) NULL;
IF COL_LENGTH(N'dbo.Room', N'ImageGalleryJson') IS NULL
    ALTER TABLE dbo.Room ADD ImageGalleryJson nvarchar(2000) NULL;
IF COL_LENGTH(N'dbo.Room', N'ViewName') IS NULL
    ALTER TABLE dbo.Room ADD ViewName nvarchar(100) NULL;
IF COL_LENGTH(N'dbo.Room', N'Amenities') IS NULL
    ALTER TABLE dbo.Room ADD Amenities nvarchar(1000) NULL;
GO

IF COL_LENGTH(N'dbo.HolidayRate', N'ScheduleType') IS NULL
    ALTER TABLE dbo.HolidayRate ADD ScheduleType varchar(10) NOT NULL
        CONSTRAINT DF_HolidayRate_ScheduleType DEFAULT 'ONE_OFF' WITH VALUES;
IF COL_LENGTH(N'dbo.HolidayRate', N'StartMonthDay') IS NULL
    ALTER TABLE dbo.HolidayRate ADD StartMonthDay char(5) NULL;
IF COL_LENGTH(N'dbo.HolidayRate', N'EndMonthDay') IS NULL
    ALTER TABLE dbo.HolidayRate ADD EndMonthDay char(5) NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.HolidayRate') AND name = N'StartDate' AND is_nullable = 0)
    ALTER TABLE dbo.HolidayRate ALTER COLUMN StartDate date NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.HolidayRate') AND name = N'EndDate' AND is_nullable = 0)
    ALTER TABLE dbo.HolidayRate ALTER COLUMN EndDate date NULL;
GO

IF COL_LENGTH(N'dbo.Invoice', N'CustomerId') IS NULL
    ALTER TABLE dbo.Invoice ADD CustomerId varchar(20) NULL;
UPDATE i
SET CustomerId = b.CustomerId
FROM dbo.Invoice AS i
JOIN dbo.Stay AS s ON s.StayId = i.StayId
JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
WHERE i.CustomerId IS NULL;
IF EXISTS (SELECT 1 FROM dbo.Invoice WHERE CustomerId IS NULL)
    THROW 51010, N'Cannot migrate Invoice.CustomerId because an invoice has no Stay -> Booking -> Customer owner.', 1;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Invoice') AND name = N'CustomerId' AND is_nullable = 1)
    ALTER TABLE dbo.Invoice ALTER COLUMN CustomerId varchar(20) NOT NULL;
GO

IF COL_LENGTH(N'dbo.Invoice', N'CustomerNameSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD CustomerNameSnapshot nvarchar(120) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'CustomerIdentitySnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD CustomerIdentitySnapshot varchar(30) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'CustomerPhoneSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD CustomerPhoneSnapshot varchar(30) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'RoomNameSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD RoomNameSnapshot nvarchar(100) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'HotelNameSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD HotelNameSnapshot nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'HotelAddressSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD HotelAddressSnapshot nvarchar(512) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'HotelHotlineSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD HotelHotlineSnapshot varchar(30) NULL;
IF COL_LENGTH(N'dbo.Invoice', N'PaymentReferenceSnapshot') IS NULL
    ALTER TABLE dbo.Invoice ADD PaymentReferenceSnapshot varchar(100) NULL;
GO

UPDATE i
SET CustomerNameSnapshot = COALESCE(i.CustomerNameSnapshot, c.FullName),
    CustomerIdentitySnapshot = COALESCE(i.CustomerIdentitySnapshot, c.IdentityNo),
    CustomerPhoneSnapshot = COALESCE(i.CustomerPhoneSnapshot, c.Phone),
    RoomNameSnapshot = COALESCE(i.RoomNameSnapshot, roomInfo.RoomName),
    HotelNameSnapshot = COALESCE(i.HotelNameSnapshot, hs.HotelName),
    HotelAddressSnapshot = COALESCE(i.HotelAddressSnapshot, hs.Address),
    HotelHotlineSnapshot = COALESCE(i.HotelHotlineSnapshot, hs.Hotline),
    PaymentReferenceSnapshot = COALESCE(i.PaymentReferenceSnapshot, paymentInfo.ExternalReference)
FROM dbo.Invoice AS i
JOIN dbo.Customer AS c ON c.CustomerId = i.CustomerId
CROSS JOIN dbo.HotelSetting AS hs
OUTER APPLY (
    SELECT TOP (1) r.Name AS RoomName
    FROM dbo.StayRoomHistory AS srh
    JOIN dbo.Room AS r ON r.RoomId = srh.RoomId
    WHERE srh.StayId = i.StayId
    ORDER BY srh.FromAt DESC
) AS roomInfo
OUTER APPLY (
    SELECT TOP (1) p.ExternalReference
    FROM dbo.Payment AS p
    WHERE p.InvoiceId = i.InvoiceId
    ORDER BY p.PaidAt DESC
) AS paymentInfo;
GO

-- Backfill links and attribution that can be derived without inventing actors.
UPDATE su
SET InvoiceId = i.InvoiceId
FROM dbo.ServiceUsage AS su
JOIN dbo.Invoice AS i ON i.StayId = su.StayId
WHERE su.InvoiceId IS NULL AND su.IsVoided = 0;
UPDATE i
SET CreatedBy = a.ActorId
FROM dbo.Invoice AS i
CROSS APPLY (
    SELECT TOP (1) ae.ActorId
    FROM dbo.AuditEvent AS ae
    WHERE ae.ObjectType IN ('Invoice', 'INVOICE') AND ae.ObjectId = i.InvoiceId
    ORDER BY ae.AuditEventId DESC
) AS a
WHERE i.CreatedBy IS NULL;
UPDATE p
SET CreatedBy = i.CreatedBy
FROM dbo.Payment AS p
JOIN dbo.Invoice AS i ON i.InvoiceId = p.InvoiceId
WHERE p.CreatedBy IS NULL AND i.CreatedBy IS NOT NULL;
UPDATE su
SET RecordedBy = i.CreatedBy
FROM dbo.ServiceUsage AS su
JOIN dbo.Invoice AS i ON i.InvoiceId = su.InvoiceId
WHERE su.RecordedBy IS NULL AND i.CreatedBy IS NOT NULL;
GO

-- Foreign keys. Conditional guards make the installer rerunnable.
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Customer_AccountId')
    ALTER TABLE dbo.[Customer] WITH CHECK ADD CONSTRAINT FK_Customer_AccountId FOREIGN KEY ([AccountId]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Membership_CustomerId')
    ALTER TABLE dbo.[Membership] WITH CHECK ADD CONSTRAINT FK_Membership_CustomerId FOREIGN KEY ([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Room_RoomTypeId')
    ALTER TABLE dbo.[Room] WITH CHECK ADD CONSTRAINT FK_Room_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RoomTypeService_RoomTypeId')
    ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT FK_RoomTypeService_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RoomTypeService_ServiceId')
    ALTER TABLE dbo.[RoomTypeService] WITH CHECK ADD CONSTRAINT FK_RoomTypeService_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HolidayRate_RoomTypeId')
    ALTER TABLE dbo.[HolidayRate] WITH CHECK ADD CONSTRAINT FK_HolidayRate_RoomTypeId FOREIGN KEY ([RoomTypeId]) REFERENCES dbo.[RoomType]([RoomTypeId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Booking_CustomerId')
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT FK_Booking_CustomerId FOREIGN KEY ([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Booking_RoomId')
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT FK_Booking_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Booking_CreatedBy')
    ALTER TABLE dbo.[Booking] WITH CHECK ADD CONSTRAINT FK_Booking_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Stay_BookingId')
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT FK_Stay_BookingId FOREIGN KEY ([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Stay_CreatedBy')
    ALTER TABLE dbo.[Stay] WITH CHECK ADD CONSTRAINT FK_Stay_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_StayRoomHistory_StayId')
    ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT FK_StayRoomHistory_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_StayRoomHistory_RoomId')
    ALTER TABLE dbo.[StayRoomHistory] WITH CHECK ADD CONSTRAINT FK_StayRoomHistory_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ServiceUsage_StayId')
    ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ServiceUsage_ServiceId')
    ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ServiceUsage_RecordedBy')
    ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_RecordedBy FOREIGN KEY ([RecordedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ServiceUsage_InvoiceId')
    ALTER TABLE dbo.[ServiceUsage] WITH CHECK ADD CONSTRAINT FK_ServiceUsage_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Invoice_StayId')
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT FK_Invoice_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Invoice_CustomerId')
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT FK_Invoice_CustomerId FOREIGN KEY ([CustomerId]) REFERENCES dbo.[Customer]([CustomerId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Invoice_CreatedBy')
    ALTER TABLE dbo.[Invoice] WITH CHECK ADD CONSTRAINT FK_Invoice_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_InvoiceLine_InvoiceId')
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT FK_InvoiceLine_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_InvoiceLine_ServiceId')
    ALTER TABLE dbo.[InvoiceLine] WITH CHECK ADD CONSTRAINT FK_InvoiceLine_ServiceId FOREIGN KEY ([ServiceId]) REFERENCES dbo.[HotelService]([ServiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Payment_BookingId')
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT FK_Payment_BookingId FOREIGN KEY ([BookingId]) REFERENCES dbo.[Booking]([BookingId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Payment_InvoiceId')
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT FK_Payment_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Payment_CreatedBy')
    ALTER TABLE dbo.[Payment] WITH CHECK ADD CONSTRAINT FK_Payment_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MembershipPointEntry_InvoiceId')
    ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT FK_MembershipPointEntry_InvoiceId FOREIGN KEY ([InvoiceId]) REFERENCES dbo.[Invoice]([InvoiceId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MembershipPointEntry_MembershipId')
    ALTER TABLE dbo.[MembershipPointEntry] WITH CHECK ADD CONSTRAINT FK_MembershipPointEntry_MembershipId FOREIGN KEY ([MembershipId]) REFERENCES dbo.[Membership]([MembershipId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HousekeepingTask_RoomId')
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HousekeepingTask_StayId')
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_StayId FOREIGN KEY ([StayId]) REFERENCES dbo.[Stay]([StayId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HousekeepingTask_AssignedTo')
    ALTER TABLE dbo.[HousekeepingTask] WITH CHECK ADD CONSTRAINT FK_HousekeepingTask_AssignedTo FOREIGN KEY ([AssignedTo]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DamageReport_RoomId')
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_RoomId FOREIGN KEY ([RoomId]) REFERENCES dbo.[Room]([RoomId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DamageReport_TaskId')
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_TaskId FOREIGN KEY ([TaskId]) REFERENCES dbo.[HousekeepingTask]([TaskId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DamageReport_ReportedBy')
    ALTER TABLE dbo.[DamageReport] WITH CHECK ADD CONSTRAINT FK_DamageReport_ReportedBy FOREIGN KEY ([ReportedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BackupHistory_CreatedBy')
    ALTER TABLE dbo.[BackupHistory] WITH CHECK ADD CONSTRAINT FK_BackupHistory_CreatedBy FOREIGN KEY ([CreatedBy]) REFERENCES dbo.[Account]([AccountId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AuditEvent_ActorId')
    ALTER TABLE dbo.[AuditEvent] WITH CHECK ADD CONSTRAINT FK_AuditEvent_ActorId FOREIGN KEY ([ActorId]) REFERENCES dbo.[Account]([AccountId]);
GO

-- Natural-key and workflow indexes.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Account') AND name = N'UX_Account_Email')
    CREATE UNIQUE INDEX UX_Account_Email ON dbo.Account(Email);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Account') AND name = N'UX_Account_Phone')
    CREATE UNIQUE INDEX UX_Account_Phone ON dbo.Account(Phone);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Customer') AND name IN (N'UX_Customer_Account_NotNull', N'UX_Report_Customer_Account_NotNull'))
    CREATE UNIQUE INDEX UX_Customer_Account_NotNull ON dbo.Customer(AccountId) WHERE AccountId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Customer') AND name = N'UX_Customer_IdentityNo_NotNull')
    CREATE UNIQUE INDEX UX_Customer_IdentityNo_NotNull ON dbo.Customer(IdentityNo) WHERE IdentityNo IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Room') AND name = N'UX_Room_Name')
    CREATE UNIQUE INDEX UX_Room_Name ON dbo.Room(Name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Membership') AND name IN (N'UQ_Membership_Customer', N'UQ_Report_Membership_Customer'))
    ALTER TABLE dbo.Membership ADD CONSTRAINT UQ_Membership_Customer UNIQUE (CustomerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Stay') AND name IN (N'UQ_Stay_Booking', N'UQ_Report_Stay_Booking'))
    ALTER TABLE dbo.Stay ADD CONSTRAINT UQ_Stay_Booking UNIQUE (BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Invoice') AND name IN (N'UQ_Invoice_Stay', N'UQ_Report_Invoice_Stay'))
    ALTER TABLE dbo.Invoice ADD CONSTRAINT UQ_Invoice_Stay UNIQUE (StayId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.StayRoomHistory') AND name IN (N'UX_StayHistory_OneOpen', N'UX_Report_StayHistory_OneOpen'))
    CREATE UNIQUE INDEX UX_StayHistory_OneOpen ON dbo.StayRoomHistory(StayId) WHERE ToAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.StayRoomHistory') AND name = N'UX_StayHistory_OneOpenRoom')
    CREATE UNIQUE INDEX UX_StayHistory_OneOpenRoom ON dbo.StayRoomHistory(RoomId) WHERE ToAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Booking') AND name = N'IX_Booking_Room_Status_Dates')
    CREATE INDEX IX_Booking_Room_Status_Dates ON dbo.Booking(RoomId, StatusCode, StartAt, EndAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Invoice') AND name = N'IX_Invoice_Customer_IssuedAt')
    CREATE INDEX IX_Invoice_Customer_IssuedAt ON dbo.Invoice(CustomerId, IssuedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.ServiceUsage') AND name = N'IX_ServiceUsage_Stay_Invoice')
    CREATE INDEX IX_ServiceUsage_Stay_Invoice ON dbo.ServiceUsage(StayId, InvoiceId) INCLUDE (ServiceId, Quantity, UnitPrice, IsVoided);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Payment') AND name = N'IX_Payment_Booking')
    CREATE INDEX IX_Payment_Booking ON dbo.Payment(BookingId) WHERE BookingId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Payment') AND name = N'IX_Payment_Invoice')
    CREATE INDEX IX_Payment_Invoice ON dbo.Payment(InvoiceId) WHERE InvoiceId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.AuditEvent') AND name = N'IX_AuditEvent_EventAt')
    CREATE INDEX IX_AuditEvent_EventAt ON dbo.AuditEvent(EventAt DESC, AuditEventId DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.HolidayRate') AND name = N'IX_HolidayRate_Type_Active')
    CREATE INDEX IX_HolidayRate_Type_Active ON dbo.HolidayRate(RoomTypeId, IsActive, ScheduleType, StartDate, EndDate);
GO

-- Checks retained from v2 are accepted by either their legacy or canonical name.
-- MANAGER is the highest application role; ADMIN manages daily operations.
-- The application RBAC matrix enforces permissions for these stored role codes.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Account_Role')
    ALTER TABLE dbo.Account WITH CHECK ADD CONSTRAINT CK_Account_Role
        CHECK (RoleCode IN ('MANAGER','ADMIN','RECEPTIONIST','HOUSEKEEPER','CUSTOMER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Booking_Dates', N'CK_Report_Booking_Dates'))
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_Dates CHECK (EndAt > StartAt);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Booking_Guests', N'CK_Report_Booking_Guests'))
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_Guests CHECK (GuestCount > 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Booking_Amounts', N'CK_Report_Booking_Amounts'))
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_Amounts CHECK (RoomCharge >= 0 AND DepositAmount >= 0 AND DepositAmount <= RoomCharge);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Booking_DepositCap')
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_DepositCap CHECK (DepositAmount <= RoomCharge);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Booking_Status')
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_Status CHECK (StatusCode IN ('PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Booking_Channel')
    ALTER TABLE dbo.Booking ADD CONSTRAINT CK_Booking_Channel CHECK (ChannelCode IN ('ONLINE','COUNTER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Stay_Dates', N'CK_Report_Stay_Dates'))
    ALTER TABLE dbo.Stay ADD CONSTRAINT CK_Stay_Dates CHECK (CheckOutAt IS NULL OR CheckOutAt >= CheckInAt);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Stay_Amounts', N'CK_Report_Stay_Amounts'))
    ALTER TABLE dbo.Stay ADD CONSTRAINT CK_Stay_Amounts CHECK (RoomCharge >= 0 AND Surcharge >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_History_Dates', N'CK_Report_History_Dates'))
    ALTER TABLE dbo.StayRoomHistory ADD CONSTRAINT CK_History_Dates CHECK (ToAt IS NULL OR ToAt > FromAt);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_History_Extra', N'CK_Report_History_Extra'))
    ALTER TABLE dbo.StayRoomHistory ADD CONSTRAINT CK_History_Extra CHECK (ExtraCharge >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_RoomType_Values', N'CK_Report_RoomType_Values'))
    ALTER TABLE dbo.RoomType ADD CONSTRAINT CK_RoomType_Values CHECK (Capacity > 0 AND Beds > 0 AND HourlyPrice > 0 AND NightlyPrice > 0 AND DailyPrice > 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Service_Price', N'CK_Report_Service_Price'))
    ALTER TABLE dbo.HotelService ADD CONSTRAINT CK_Service_Price CHECK (Price >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Room_ImageGalleryJson')
    ALTER TABLE dbo.Room ADD CONSTRAINT CK_Room_ImageGalleryJson CHECK (ImageGalleryJson IS NULL OR ISJSON(ImageGalleryJson) = 1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_HolidayRate_Schedule')
    ALTER TABLE dbo.HolidayRate ADD CONSTRAINT CK_HolidayRate_Schedule CHECK (
        IncreasePercent BETWEEN 0 AND 1000 AND (
            (ScheduleType = 'ONE_OFF' AND StartDate IS NOT NULL AND EndDate IS NOT NULL AND StartDate <= EndDate AND StartMonthDay IS NULL AND EndMonthDay IS NULL)
            OR
            (ScheduleType = 'ANNUAL' AND StartDate IS NULL AND EndDate IS NULL
                AND TRY_CONVERT(date, '2000-' + StartMonthDay, 23) IS NOT NULL
                AND TRY_CONVERT(date, '2000-' + EndMonthDay, 23) IS NOT NULL)
        )
    );
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Usage_Values', N'CK_Report_Usage_Values'))
    ALTER TABLE dbo.ServiceUsage ADD CONSTRAINT CK_Usage_Values CHECK (Quantity > 0 AND UnitPrice >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_InvoiceLine_Values', N'CK_Report_InvoiceLine_Values'))
    ALTER TABLE dbo.InvoiceLine ADD CONSTRAINT CK_InvoiceLine_Values CHECK (Quantity > 0 AND UnitPrice >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_InvoiceLine_Type')
    ALTER TABLE dbo.InvoiceLine ADD CONSTRAINT CK_InvoiceLine_Type CHECK (
        (LineType = 'SERVICE' AND ServiceId IS NOT NULL) OR
        (LineType IN ('ROOM','SURCHARGE','DISCOUNT') AND ServiceId IS NULL)
    );
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Invoice_Amounts', N'CK_Report_Invoice_Amounts'))
    ALTER TABLE dbo.Invoice ADD CONSTRAINT CK_Invoice_Amounts CHECK (RoomCharge >= 0 AND ServiceCharge >= 0 AND Surcharge >= 0 AND DiscountAmount >= 0 AND DepositAmount >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Invoice_AmountDue')
    ALTER TABLE dbo.Invoice ADD CONSTRAINT CK_Invoice_AmountDue CHECK (AmountDue >= 0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Invoice_Status')
    ALTER TABLE dbo.Invoice ADD CONSTRAINT CK_Invoice_Status CHECK (StatusCode IN ('DRAFT','PAID'));
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Report_Payment_Positive')
    ALTER TABLE dbo.Payment DROP CONSTRAINT CK_Report_Payment_Positive;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Payment_Amount')
    ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Payment_Amount CHECK (
        (PaymentKind = 'DEPOSIT' AND Amount > 0) OR
        (PaymentKind = 'SETTLEMENT' AND Amount >= 0)
    );
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Payment_OneTarget', N'CK_Report_Payment_OneTarget'))
    ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Payment_OneTarget CHECK (
        (BookingId IS NOT NULL AND InvoiceId IS NULL AND PaymentKind = 'DEPOSIT') OR
        (BookingId IS NULL AND InvoiceId IS NOT NULL AND PaymentKind = 'SETTLEMENT')
    );
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name IN (N'CK_Membership_Points', N'CK_Report_Membership_Points'))
    ALTER TABLE dbo.Membership ADD CONSTRAINT CK_Membership_Points CHECK (Points >= 0);
GO

PRINT N'Canonical schema objects are present; handling the development seed next.';
GO



-- ===================== REALISTIC SEED: DON / DOI / VIP =====================
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
IF EXISTS (SELECT 1 FROM dbo.SeedHistory WHERE SeedName = 'realistic_3roomtypes_v2')
    PRINT N'Realistic development seed already present; seed skipped.';
ELSE IF EXISTS (SELECT 1 FROM dbo.Account)
    PRINT N'Existing application data detected; development seed skipped without changing data.';
ELSE
BEGIN
 BEGIN TRY
  BEGIN TRANSACTION;
-- quanly@khachsan.test (MANAGER) has full access; admin@khachsan.test (ADMIN) handles operations.
INSERT dbo.[Account] ([AccountId], [PasswordHash], [FullName], [Email], [Phone], [RoleCode], [IsActive]) VALUES
  (N'TK001', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Nguyễn Thành Long', N'admin@khachsan.test', N'0903000001', N'ADMIN', 1),
  (N'TK002', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Trần Hải Yến', N'quanly@khachsan.test', N'0903000002', N'MANAGER', 1),
  (N'TK003', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Phạm Minh Tuấn', N'letan1@khachsan.test', N'0903000003', N'RECEPTIONIST', 1),
  (N'TK004', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Lê Thu Hà', N'letan2@khachsan.test', N'0903000004', N'RECEPTIONIST', 1),
  (N'TK005', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Võ Ngọc Anh', N'letan3@khachsan.test', N'0903000005', N'RECEPTIONIST', 1),
  (N'TK006', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Nguyễn Văn Hòa', N'buongphong1@khachsan.test', N'0903000006', N'HOUSEKEEPER', 1),
  (N'TK007', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Đặng Thị Mỹ', N'buongphong2@khachsan.test', N'0903000007', N'HOUSEKEEPER', 1),
  (N'TK008', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Đỗ Đức Tài', N'buongphong3@khachsan.test', N'0903000008', N'HOUSEKEEPER', 1),
  (N'TK009', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Nguyễn Thị Hương', N'khach01@khachsan.test', N'0903000009', N'CUSTOMER', 1),
  (N'TK010', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Trần Văn Minh', N'khach02@khachsan.test', N'0903000010', N'CUSTOMER', 1),
  (N'TK011', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Lê Hoàng Nam', N'khach03@khachsan.test', N'0903000011', N'CUSTOMER', 1),
  (N'TK012', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Phạm Thị Ngọc', N'khach04@khachsan.test', N'0903000012', N'CUSTOMER', 1),
  (N'TK013', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Võ Quốc Bảo', N'khach05@khachsan.test', N'0903000013', N'CUSTOMER', 1),
  (N'TK014', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Đặng Thị Mai', N'khach06@khachsan.test', N'0903000014', N'CUSTOMER', 1),
  (N'TK015', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Bùi Thanh Bình', N'khach07@khachsan.test', N'0903000015', N'CUSTOMER', 1),
  (N'TK016', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Đỗ Thị Lan', N'khach08@khachsan.test', N'0903000016', N'CUSTOMER', 1),
  (N'TK017', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Hoàng Anh Tuấn', N'khach09@khachsan.test', N'0903000017', N'CUSTOMER', 1),
  (N'TK018', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Ngô Thùy Dương', N'khach10@khachsan.test', N'0903000018', N'CUSTOMER', 1),
  (N'TK019', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Dương Văn Phúc', N'khach11@khachsan.test', N'0903000019', N'CUSTOMER', 1),
  (N'TK020', N'mbsOl9q8woBGUcMQ4z2SRQ==:2TA1ikDYozERAiCV/THHV9V8JLEFm44UtgbvvAp+Xdw=', N'Huỳnh Ngọc Trâm', N'khach12@khachsan.test', N'0903000020', N'CUSTOMER', 1);
INSERT dbo.[Customer] ([CustomerId], [FullName], [Phone], [IdentityNo], [Address], [AccountId]) VALUES
  (N'KH001', N'Nguyễn Thị Hương', N'0914000001', N'079026000001', N'TP. Hồ Chí Minh', N'TK009'),
  (N'KH002', N'Trần Văn Minh', N'0914000002', N'079026000002', N'Hà Nội', N'TK010'),
  (N'KH003', N'Lê Hoàng Nam', N'0914000003', N'079026000003', N'Đà Nẵng', N'TK011'),
  (N'KH004', N'Phạm Thị Ngọc', N'0914000004', N'079026000004', N'Cần Thơ', N'TK012'),
  (N'KH005', N'Võ Quốc Bảo', N'0914000005', N'079026000005', N'TP. Hồ Chí Minh', N'TK013'),
  (N'KH006', N'Đặng Thị Mai', N'0914000006', N'079026000006', N'Hà Nội', N'TK014'),
  (N'KH007', N'Bùi Thanh Bình', N'0914000007', N'079026000007', N'Đà Nẵng', N'TK015'),
  (N'KH008', N'Đỗ Thị Lan', N'0914000008', N'079026000008', N'Cần Thơ', N'TK016'),
  (N'KH009', N'Hoàng Anh Tuấn', N'0914000009', N'079026000009', N'TP. Hồ Chí Minh', N'TK017'),
  (N'KH010', N'Ngô Thùy Dương', N'0914000010', N'079026000010', N'Hà Nội', N'TK018'),
  (N'KH011', N'Dương Văn Phúc', N'0914000011', N'079026000011', N'Đà Nẵng', N'TK019'),
  (N'KH012', N'Huỳnh Ngọc Trâm', N'0914000012', N'079026000012', N'Cần Thơ', N'TK020'),
  (N'KH013', N'Nguyễn Thành Long', N'0914000013', N'079026000013', N'TP. Hồ Chí Minh', NULL),
  (N'KH014', N'Trần Hải Yến', N'0914000014', N'079026000014', N'Hà Nội', NULL),
  (N'KH015', N'Phạm Minh Tuấn', N'0914000015', N'079026000015', N'Đà Nẵng', NULL),
  (N'KH016', N'Lê Thu Hà', N'0914000016', N'079026000016', N'Cần Thơ', NULL),
  (N'KH017', N'Võ Ngọc Anh', N'0914000017', N'079026000017', N'TP. Hồ Chí Minh', NULL),
  (N'KH018', N'Nguyễn Văn Hòa', N'0914000018', N'079026000018', N'Hà Nội', NULL),
  (N'KH019', N'Đặng Thị Mỹ', N'0914000019', N'079026000019', N'Đà Nẵng', NULL),
  (N'KH020', N'Đỗ Đức Tài', N'0914000020', N'079026000020', N'Cần Thơ', NULL);
INSERT dbo.[RoomType] ([RoomTypeId], [Name], [Capacity], [Beds], [HourlyPrice], [NightlyPrice], [DailyPrice], [Amenities]) VALUES
  (N'DON', N'Phòng đơn', 1, 1, 120000, 350000, 480000, N'Wi-Fi, điều hòa, giường đơn'),
  (N'DOI', N'Phòng đôi', 2, 2, 180000, 520000, 720000, N'Wi-Fi, TV, hai giường'),
  (N'VIP', N'Phòng VIP', 4, 2, 350000, 1100000, 1550000, N'Wi-Fi, minibar, bồn tắm');
INSERT dbo.[Room] ([RoomId], [Name], [RoomTypeId], [StatusCode], [Note]) VALUES
  (N'P101', N'Phòng 101', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P102', N'Phòng 102', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P103', N'Phòng 103', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P104', N'Phòng 104', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P105', N'Phòng 105', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P106', N'Phòng 106', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P107', N'Phòng 107', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P108', N'Phòng 108', N'DON', N'AVAILABLE', N'Tầng 1'),
  (N'P201', N'Phòng 201', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P202', N'Phòng 202', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P203', N'Phòng 203', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P204', N'Phòng 204', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P205', N'Phòng 205', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P206', N'Phòng 206', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P207', N'Phòng 207', N'DOI', N'AVAILABLE', N'Tầng 2'),
  (N'P301', N'Phòng 301', N'VIP', N'AVAILABLE', N'Tầng 3'),
  (N'P302', N'Phòng 302', N'VIP', N'AVAILABLE', N'Tầng 3'),
  (N'P303', N'Phòng 303', N'VIP', N'AVAILABLE', N'Tầng 3'),
  (N'P304', N'Phòng 304', N'VIP', N'AVAILABLE', N'Tầng 3'),
  (N'P305', N'Phòng 305', N'VIP', N'AVAILABLE', N'Tầng 3');
INSERT dbo.[HotelService] ([ServiceId], [Name], [Description], [UnitName], [Price], [IsActive]) VALUES
  (N'DV001', N'Nước suối', N'Dịch vụ Nước suối', N'Chai', 20000, 1),
  (N'DV002', N'Nước ngọt', N'Dịch vụ Nước ngọt', N'Lon', 30000, 1),
  (N'DV003', N'Cà phê', N'Dịch vụ Cà phê', N'Phần', 40000, 1),
  (N'DV004', N'Trà nóng', N'Dịch vụ Trà nóng', N'Lượt', 50000, 1),
  (N'DV005', N'Ăn sáng', N'Dịch vụ Ăn sáng', N'Kg', 60000, 1),
  (N'DV006', N'Ăn trưa', N'Dịch vụ Ăn trưa', N'Chai', 70000, 1),
  (N'DV007', N'Ăn tối', N'Dịch vụ Ăn tối', N'Lon', 80000, 1),
  (N'DV008', N'Giặt ủi', N'Dịch vụ Giặt ủi', N'Phần', 90000, 1),
  (N'DV009', N'Ủi quần áo', N'Dịch vụ Ủi quần áo', N'Lượt', 100000, 1),
  (N'DV010', N'Đón sân bay', N'Dịch vụ Đón sân bay', N'Kg', 110000, 1),
  (N'DV011', N'Thuê xe máy', N'Dịch vụ Thuê xe máy', N'Chai', 120000, 1),
  (N'DV012', N'Thuê xe đạp', N'Dịch vụ Thuê xe đạp', N'Lon', 130000, 1),
  (N'DV013', N'Dọn phòng theo yêu cầu', N'Dịch vụ Dọn phòng theo yêu cầu', N'Phần', 140000, 1),
  (N'DV014', N'Giường phụ', N'Dịch vụ Giường phụ', N'Lượt', 150000, 1),
  (N'DV015', N'Trang trí sinh nhật', N'Dịch vụ Trang trí sinh nhật', N'Kg', 160000, 1),
  (N'DV016', N'Đồ ăn nhẹ', N'Dịch vụ Đồ ăn nhẹ', N'Chai', 170000, 1),
  (N'DV017', N'Vé tham quan', N'Dịch vụ Vé tham quan', N'Lon', 180000, 1),
  (N'DV018', N'Giỏ trái cây', N'Dịch vụ Giỏ trái cây', N'Phần', 190000, 1),
  (N'DV019', N'Đưa đón ga tàu', N'Dịch vụ Đưa đón ga tàu', N'Lượt', 200000, 1),
  (N'DV020', N'Trả phòng trễ', N'Dịch vụ Trả phòng trễ', N'Kg', 210000, 1);
INSERT dbo.[RoomTypeService] ([RoomTypeId], [ServiceId], [IsIncluded]) VALUES
  (N'DON', N'DV001', 1),
  (N'DON', N'DV002', 1),
  (N'DON', N'DV003', 0),
  (N'DON', N'DV004', 0),
  (N'DON', N'DV005', 0),
  (N'DON', N'DV006', 0),
  (N'DON', N'DV007', 0),
  (N'DON', N'DV008', 0),
  (N'DON', N'DV009', 0),
  (N'DON', N'DV010', 0),
  (N'DON', N'DV011', 0),
  (N'DON', N'DV012', 0),
  (N'DON', N'DV013', 0),
  (N'DOI', N'DV001', 1),
  (N'DOI', N'DV002', 1),
  (N'DOI', N'DV003', 0),
  (N'DOI', N'DV004', 0),
  (N'DOI', N'DV005', 0),
  (N'DOI', N'DV006', 0),
  (N'DOI', N'DV007', 0),
  (N'DOI', N'DV008', 0),
  (N'DOI', N'DV009', 0),
  (N'DOI', N'DV010', 0),
  (N'DOI', N'DV011', 0),
  (N'DOI', N'DV012', 0),
  (N'DOI', N'DV013', 0),
  (N'VIP', N'DV001', 1),
  (N'VIP', N'DV002', 1),
  (N'VIP', N'DV003', 0),
  (N'VIP', N'DV004', 0),
  (N'VIP', N'DV005', 0),
  (N'VIP', N'DV006', 0),
  (N'VIP', N'DV007', 0),
  (N'VIP', N'DV008', 0),
  (N'VIP', N'DV009', 0),
  (N'VIP', N'DV010', 0),
  (N'VIP', N'DV011', 0),
  (N'VIP', N'DV012', 0),
  (N'VIP', N'DV013', 0);
INSERT dbo.[HolidayRate] ([HolidayRateId], [Name], [RoomTypeId], [StartDate], [EndDate], [IncreasePercent], [IsActive]) VALUES
  (N'GL001', N'Đợt cao điểm 001', N'DON', N'2027-01-01', N'2027-01-03', 10, 1),
  (N'GL002', N'Đợt cao điểm 002', N'DOI', N'2027-01-06', N'2027-01-08', 15, 1),
  (N'GL003', N'Đợt cao điểm 003', N'VIP', N'2027-01-11', N'2027-01-13', 20, 1),
  (N'GL004', N'Đợt cao điểm 004', N'DON', N'2027-01-16', N'2027-01-18', 10, 1),
  (N'GL005', N'Đợt cao điểm 005', N'DOI', N'2027-02-01', N'2027-02-03', 15, 1),
  (N'GL006', N'Đợt cao điểm 006', N'VIP', N'2027-02-06', N'2027-02-08', 20, 1),
  (N'GL007', N'Đợt cao điểm 007', N'DON', N'2027-02-11', N'2027-02-13', 10, 1),
  (N'GL008', N'Đợt cao điểm 008', N'DOI', N'2027-02-16', N'2027-02-18', 15, 1),
  (N'GL009', N'Đợt cao điểm 009', N'VIP', N'2027-03-01', N'2027-03-03', 20, 1),
  (N'GL010', N'Đợt cao điểm 010', N'DON', N'2027-03-06', N'2027-03-08', 10, 1),
  (N'GL011', N'Đợt cao điểm 011', N'DOI', N'2027-03-11', N'2027-03-13', 15, 1),
  (N'GL012', N'Đợt cao điểm 012', N'VIP', N'2027-03-16', N'2027-03-18', 20, 1),
  (N'GL013', N'Đợt cao điểm 013', N'DON', N'2027-04-01', N'2027-04-03', 10, 1),
  (N'GL014', N'Đợt cao điểm 014', N'DOI', N'2027-04-06', N'2027-04-08', 15, 1),
  (N'GL015', N'Đợt cao điểm 015', N'VIP', N'2027-04-11', N'2027-04-13', 20, 1),
  (N'GL016', N'Đợt cao điểm 016', N'DON', N'2027-04-16', N'2027-04-18', 10, 1),
  (N'GL017', N'Đợt cao điểm 017', N'DOI', N'2027-05-01', N'2027-05-03', 15, 1),
  (N'GL018', N'Đợt cao điểm 018', N'VIP', N'2027-05-06', N'2027-05-08', 20, 1),
  (N'GL019', N'Đợt cao điểm 019', N'DON', N'2027-05-11', N'2027-05-13', 10, 1),
  (N'GL020', N'Đợt cao điểm 020', N'DOI', N'2027-05-16', N'2027-05-18', 15, 1);
INSERT dbo.[Membership] ([MembershipId], [CustomerId], [Points], [IsActive], [IssuedAt]) VALUES
  (N'TV001', N'KH001', 110, 1, N'2026-07-01T09:00:00'),
  (N'TV002', N'KH002', 120, 1, N'2026-07-01T09:00:00'),
  (N'TV003', N'KH003', 130, 1, N'2026-07-01T09:00:00'),
  (N'TV004', N'KH004', 140, 1, N'2026-07-01T09:00:00'),
  (N'TV005', N'KH005', 150, 1, N'2026-07-01T09:00:00'),
  (N'TV006', N'KH006', 160, 1, N'2026-07-01T09:00:00'),
  (N'TV007', N'KH007', 170, 1, N'2026-07-01T09:00:00'),
  (N'TV008', N'KH008', 180, 1, N'2026-07-01T09:00:00'),
  (N'TV009', N'KH009', 190, 1, N'2026-07-01T09:00:00'),
  (N'TV010', N'KH010', 200, 1, N'2026-07-01T09:00:00'),
  (N'TV011', N'KH011', 210, 1, N'2026-07-01T09:00:00'),
  (N'TV012', N'KH012', 220, 1, N'2026-07-01T09:00:00'),
  (N'TV013', N'KH013', 230, 1, N'2026-07-01T09:00:00'),
  (N'TV014', N'KH014', 240, 1, N'2026-07-01T09:00:00'),
  (N'TV015', N'KH015', 250, 1, N'2026-07-01T09:00:00'),
  (N'TV016', N'KH016', 260, 1, N'2026-07-01T09:00:00'),
  (N'TV017', N'KH017', 270, 1, N'2026-07-01T09:00:00'),
  (N'TV018', N'KH018', 280, 1, N'2026-07-01T09:00:00'),
  (N'TV019', N'KH019', 290, 1, N'2026-07-01T09:00:00'),
  (N'TV020', N'KH020', 300, 1, N'2026-07-01T09:00:00');
INSERT dbo.[Booking] ([BookingId], [CustomerId], [RoomId], [StartAt], [EndAt], [GuestCount], [StatusCode], [ChannelCode], [RoomCharge], [DepositAmount], [HoldUntil]) VALUES
  (N'DP0001', N'KH001', N'P101', N'2026-09-01T14:00:00', N'2026-09-03T12:00:00', 1, N'COMPLETED', N'ONLINE', 960000, 240000, N'2026-08-31T18:00:00'),
  (N'DP0002', N'KH002', N'P102', N'2026-09-02T14:00:00', N'2026-09-04T12:00:00', 1, N'COMPLETED', N'COUNTER', 960000, 240000, N'2026-09-01T18:00:00'),
  (N'DP0003', N'KH003', N'P103', N'2026-09-03T14:00:00', N'2026-09-05T12:00:00', 1, N'COMPLETED', N'ONLINE', 960000, 240000, N'2026-09-02T18:00:00'),
  (N'DP0004', N'KH004', N'P104', N'2026-09-04T14:00:00', N'2026-09-06T12:00:00', 1, N'COMPLETED', N'COUNTER', 960000, 240000, N'2026-09-03T18:00:00'),
  (N'DP0005', N'KH005', N'P105', N'2026-09-05T14:00:00', N'2026-09-07T12:00:00', 1, N'COMPLETED', N'ONLINE', 960000, 240000, N'2026-09-04T18:00:00'),
  (N'DP0006', N'KH006', N'P106', N'2026-09-06T14:00:00', N'2026-09-08T12:00:00', 1, N'COMPLETED', N'COUNTER', 960000, 240000, N'2026-09-05T18:00:00'),
  (N'DP0007', N'KH007', N'P107', N'2026-09-07T14:00:00', N'2026-09-09T12:00:00', 1, N'COMPLETED', N'ONLINE', 960000, 240000, N'2026-09-06T18:00:00'),
  (N'DP0008', N'KH008', N'P108', N'2026-09-08T14:00:00', N'2026-09-10T12:00:00', 1, N'COMPLETED', N'COUNTER', 960000, 240000, N'2026-09-07T18:00:00'),
  (N'DP0009', N'KH009', N'P201', N'2026-09-09T14:00:00', N'2026-09-11T12:00:00', 2, N'COMPLETED', N'ONLINE', 1440000, 360000, N'2026-09-08T18:00:00'),
  (N'DP0010', N'KH010', N'P202', N'2026-09-10T14:00:00', N'2026-09-12T12:00:00', 2, N'COMPLETED', N'COUNTER', 1440000, 360000, N'2026-09-09T18:00:00'),
  (N'DP0011', N'KH011', N'P203', N'2026-09-11T14:00:00', N'2026-09-13T12:00:00', 2, N'COMPLETED', N'ONLINE', 1440000, 360000, N'2026-09-10T18:00:00'),
  (N'DP0012', N'KH012', N'P204', N'2026-09-12T14:00:00', N'2026-09-14T12:00:00', 2, N'COMPLETED', N'COUNTER', 1440000, 360000, N'2026-09-11T18:00:00'),
  (N'DP0013', N'KH013', N'P205', N'2026-09-13T14:00:00', N'2026-09-15T12:00:00', 2, N'COMPLETED', N'ONLINE', 1440000, 360000, N'2026-09-12T18:00:00'),
  (N'DP0014', N'KH014', N'P206', N'2026-09-14T14:00:00', N'2026-09-16T12:00:00', 2, N'COMPLETED', N'COUNTER', 1440000, 360000, N'2026-09-13T18:00:00'),
  (N'DP0015', N'KH015', N'P207', N'2026-09-15T14:00:00', N'2026-09-17T12:00:00', 2, N'COMPLETED', N'ONLINE', 1440000, 360000, N'2026-09-14T18:00:00'),
  (N'DP0016', N'KH016', N'P301', N'2026-09-16T14:00:00', N'2026-09-18T12:00:00', 2, N'COMPLETED', N'COUNTER', 3100000, 775000, N'2026-09-15T18:00:00'),
  (N'DP0017', N'KH017', N'P302', N'2026-09-17T14:00:00', N'2026-09-19T12:00:00', 2, N'COMPLETED', N'ONLINE', 3100000, 775000, N'2026-09-16T18:00:00'),
  (N'DP0018', N'KH018', N'P303', N'2026-09-18T14:00:00', N'2026-09-20T12:00:00', 2, N'COMPLETED', N'COUNTER', 3100000, 775000, N'2026-09-17T18:00:00'),
  (N'DP0019', N'KH019', N'P304', N'2026-09-19T14:00:00', N'2026-09-21T12:00:00', 2, N'COMPLETED', N'ONLINE', 3100000, 775000, N'2026-09-18T18:00:00'),
  (N'DP0020', N'KH020', N'P305', N'2026-09-20T14:00:00', N'2026-09-22T12:00:00', 2, N'COMPLETED', N'COUNTER', 3100000, 775000, N'2026-09-19T18:00:00'),
  (N'DP0021', N'KH001', N'P101', N'2026-11-06T14:00:00', N'2026-11-08T12:00:00', 1, N'CONFIRMED', N'ONLINE', 960000, 240000, N'2026-11-05T18:00:00'),
  (N'DP0022', N'KH002', N'P102', N'2026-11-07T14:00:00', N'2026-11-09T12:00:00', 1, N'CONFIRMED', N'COUNTER', 960000, 240000, N'2026-11-06T18:00:00'),
  (N'DP0023', N'KH003', N'P103', N'2026-11-08T14:00:00', N'2026-11-10T12:00:00', 1, N'CONFIRMED', N'ONLINE', 960000, 240000, N'2026-11-07T18:00:00'),
  (N'DP0024', N'KH004', N'P104', N'2026-11-09T14:00:00', N'2026-11-11T12:00:00', 1, N'CONFIRMED', N'COUNTER', 960000, 240000, N'2026-11-08T18:00:00'),
  (N'DP0025', N'KH005', N'P105', N'2026-11-10T14:00:00', N'2026-11-12T12:00:00', 1, N'CONFIRMED', N'ONLINE', 960000, 240000, N'2026-11-09T18:00:00');
INSERT dbo.[Stay] ([StayId], [BookingId], [IdentityNo], [CheckInAt], [CheckOutAt], [RoomCharge], [Surcharge]) VALUES
  (N'PT0001', N'DP0001', N'079026000001', N'2026-09-01T14:00:00', N'2026-09-03T11:00:00', 960000, 0),
  (N'PT0002', N'DP0002', N'079026000002', N'2026-09-02T14:00:00', N'2026-09-04T11:00:00', 960000, 0),
  (N'PT0003', N'DP0003', N'079026000003', N'2026-09-03T14:00:00', N'2026-09-05T11:00:00', 960000, 0),
  (N'PT0004', N'DP0004', N'079026000004', N'2026-09-04T14:00:00', N'2026-09-06T11:00:00', 960000, 0),
  (N'PT0005', N'DP0005', N'079026000005', N'2026-09-05T14:00:00', N'2026-09-07T11:00:00', 960000, 0),
  (N'PT0006', N'DP0006', N'079026000006', N'2026-09-06T14:00:00', N'2026-09-08T11:00:00', 960000, 0),
  (N'PT0007', N'DP0007', N'079026000007', N'2026-09-07T14:00:00', N'2026-09-09T11:00:00', 960000, 0),
  (N'PT0008', N'DP0008', N'079026000008', N'2026-09-08T14:00:00', N'2026-09-10T11:00:00', 960000, 0),
  (N'PT0009', N'DP0009', N'079026000009', N'2026-09-09T14:00:00', N'2026-09-11T11:00:00', 1440000, 0),
  (N'PT0010', N'DP0010', N'079026000010', N'2026-09-10T14:00:00', N'2026-09-12T11:00:00', 1440000, 0),
  (N'PT0011', N'DP0011', N'079026000011', N'2026-09-11T14:00:00', N'2026-09-13T11:00:00', 1440000, 0),
  (N'PT0012', N'DP0012', N'079026000012', N'2026-09-12T14:00:00', N'2026-09-14T11:00:00', 1440000, 0),
  (N'PT0013', N'DP0013', N'079026000013', N'2026-09-13T14:00:00', N'2026-09-15T11:00:00', 1440000, 0),
  (N'PT0014', N'DP0014', N'079026000014', N'2026-09-14T14:00:00', N'2026-09-16T11:00:00', 1440000, 0),
  (N'PT0015', N'DP0015', N'079026000015', N'2026-09-15T14:00:00', N'2026-09-17T11:00:00', 1440000, 0),
  (N'PT0016', N'DP0016', N'079026000016', N'2026-09-16T14:00:00', N'2026-09-18T11:00:00', 3100000, 0),
  (N'PT0017', N'DP0017', N'079026000017', N'2026-09-17T14:00:00', N'2026-09-19T11:00:00', 3100000, 0),
  (N'PT0018', N'DP0018', N'079026000018', N'2026-09-18T14:00:00', N'2026-09-20T11:00:00', 3100000, 0),
  (N'PT0019', N'DP0019', N'079026000019', N'2026-09-19T14:00:00', N'2026-09-21T11:00:00', 3100000, 0),
  (N'PT0020', N'DP0020', N'079026000020', N'2026-09-20T14:00:00', N'2026-09-22T11:00:00', 3100000, 0);
INSERT dbo.[StayRoomHistory] ([StayId], [RoomId], [FromAt], [ToAt], [ExtraCharge]) VALUES
  (N'PT0001', N'P101', N'2026-09-01T14:00:00', N'2026-09-02T10:00:00', 0),
  (N'PT0001', N'P106', N'2026-09-02T10:00:00', N'2026-09-03T11:00:00', 0),
  (N'PT0002', N'P102', N'2026-09-02T14:00:00', N'2026-09-03T10:00:00', 0),
  (N'PT0002', N'P107', N'2026-09-03T10:00:00', N'2026-09-04T11:00:00', 0),
  (N'PT0003', N'P103', N'2026-09-03T14:00:00', N'2026-09-04T10:00:00', 0),
  (N'PT0003', N'P108', N'2026-09-04T10:00:00', N'2026-09-05T11:00:00', 0),
  (N'PT0004', N'P104', N'2026-09-04T14:00:00', N'2026-09-05T10:00:00', 0),
  (N'PT0004', N'P201', N'2026-09-05T10:00:00', N'2026-09-06T11:00:00', 0),
  (N'PT0005', N'P105', N'2026-09-05T14:00:00', N'2026-09-07T11:00:00', 0),
  (N'PT0006', N'P106', N'2026-09-06T14:00:00', N'2026-09-08T11:00:00', 0),
  (N'PT0007', N'P107', N'2026-09-07T14:00:00', N'2026-09-09T11:00:00', 0),
  (N'PT0008', N'P108', N'2026-09-08T14:00:00', N'2026-09-10T11:00:00', 0),
  (N'PT0009', N'P201', N'2026-09-09T14:00:00', N'2026-09-11T11:00:00', 0),
  (N'PT0010', N'P202', N'2026-09-10T14:00:00', N'2026-09-12T11:00:00', 0),
  (N'PT0011', N'P203', N'2026-09-11T14:00:00', N'2026-09-13T11:00:00', 0),
  (N'PT0012', N'P204', N'2026-09-12T14:00:00', N'2026-09-14T11:00:00', 0),
  (N'PT0013', N'P205', N'2026-09-13T14:00:00', N'2026-09-15T11:00:00', 0),
  (N'PT0014', N'P206', N'2026-09-14T14:00:00', N'2026-09-16T11:00:00', 0),
  (N'PT0015', N'P207', N'2026-09-15T14:00:00', N'2026-09-17T11:00:00', 0),
  (N'PT0016', N'P301', N'2026-09-16T14:00:00', N'2026-09-18T11:00:00', 0),
  (N'PT0017', N'P302', N'2026-09-17T14:00:00', N'2026-09-19T11:00:00', 0),
  (N'PT0018', N'P303', N'2026-09-18T14:00:00', N'2026-09-20T11:00:00', 0),
  (N'PT0019', N'P304', N'2026-09-19T14:00:00', N'2026-09-21T11:00:00', 0),
  (N'PT0020', N'P305', N'2026-09-20T14:00:00', N'2026-09-22T11:00:00', 0);
INSERT dbo.[ServiceUsage] ([UsageId], [StayId], [ServiceId], [Quantity], [UnitPrice], [UsedAt]) VALUES
  (N'SD0001', N'PT0001', N'DV001', 1, 20000, N'2026-09-02T15:00:00'),
  (N'SD0002', N'PT0001', N'DV002', 1, 30000, N'2026-09-02T16:00:00'),
  (N'SD0003', N'PT0001', N'DV003', 1, 40000, N'2026-09-02T17:00:00'),
  (N'SD0004', N'PT0002', N'DV002', 1, 30000, N'2026-09-03T15:00:00'),
  (N'SD0005', N'PT0002', N'DV003', 1, 40000, N'2026-09-03T16:00:00'),
  (N'SD0006', N'PT0002', N'DV004', 1, 50000, N'2026-09-03T17:00:00'),
  (N'SD0007', N'PT0003', N'DV003', 1, 40000, N'2026-09-04T15:00:00'),
  (N'SD0008', N'PT0003', N'DV004', 1, 50000, N'2026-09-04T16:00:00'),
  (N'SD0009', N'PT0003', N'DV005', 1, 60000, N'2026-09-04T17:00:00'),
  (N'SD0010', N'PT0004', N'DV004', 1, 50000, N'2026-09-05T15:00:00'),
  (N'SD0011', N'PT0004', N'DV005', 1, 60000, N'2026-09-05T16:00:00'),
  (N'SD0012', N'PT0004', N'DV006', 1, 70000, N'2026-09-05T17:00:00'),
  (N'SD0013', N'PT0005', N'DV005', 1, 60000, N'2026-09-06T15:00:00'),
  (N'SD0014', N'PT0005', N'DV006', 1, 70000, N'2026-09-06T16:00:00'),
  (N'SD0015', N'PT0005', N'DV007', 1, 80000, N'2026-09-06T17:00:00'),
  (N'SD0016', N'PT0006', N'DV006', 1, 70000, N'2026-09-07T15:00:00'),
  (N'SD0017', N'PT0006', N'DV007', 1, 80000, N'2026-09-07T16:00:00'),
  (N'SD0018', N'PT0006', N'DV008', 1, 90000, N'2026-09-07T17:00:00'),
  (N'SD0019', N'PT0007', N'DV007', 1, 80000, N'2026-09-08T15:00:00'),
  (N'SD0020', N'PT0007', N'DV008', 1, 90000, N'2026-09-08T16:00:00'),
  (N'SD0021', N'PT0007', N'DV009', 1, 100000, N'2026-09-08T17:00:00'),
  (N'SD0022', N'PT0008', N'DV008', 1, 90000, N'2026-09-09T15:00:00'),
  (N'SD0023', N'PT0008', N'DV009', 1, 100000, N'2026-09-09T16:00:00'),
  (N'SD0024', N'PT0008', N'DV010', 1, 110000, N'2026-09-09T17:00:00'),
  (N'SD0025', N'PT0009', N'DV009', 1, 100000, N'2026-09-10T15:00:00'),
  (N'SD0026', N'PT0009', N'DV010', 1, 110000, N'2026-09-10T16:00:00'),
  (N'SD0027', N'PT0009', N'DV011', 1, 120000, N'2026-09-10T17:00:00'),
  (N'SD0028', N'PT0010', N'DV010', 1, 110000, N'2026-09-11T15:00:00'),
  (N'SD0029', N'PT0010', N'DV011', 1, 120000, N'2026-09-11T16:00:00'),
  (N'SD0030', N'PT0010', N'DV012', 1, 130000, N'2026-09-11T17:00:00'),
  (N'SD0031', N'PT0011', N'DV011', 1, 120000, N'2026-09-12T15:00:00'),
  (N'SD0032', N'PT0011', N'DV012', 1, 130000, N'2026-09-12T16:00:00'),
  (N'SD0033', N'PT0011', N'DV013', 1, 140000, N'2026-09-12T17:00:00'),
  (N'SD0034', N'PT0012', N'DV012', 1, 130000, N'2026-09-13T15:00:00'),
  (N'SD0035', N'PT0012', N'DV013', 1, 140000, N'2026-09-13T16:00:00'),
  (N'SD0036', N'PT0012', N'DV014', 1, 150000, N'2026-09-13T17:00:00'),
  (N'SD0037', N'PT0013', N'DV013', 1, 140000, N'2026-09-14T15:00:00'),
  (N'SD0038', N'PT0013', N'DV014', 1, 150000, N'2026-09-14T16:00:00'),
  (N'SD0039', N'PT0013', N'DV015', 1, 160000, N'2026-09-14T17:00:00'),
  (N'SD0040', N'PT0014', N'DV014', 1, 150000, N'2026-09-15T15:00:00'),
  (N'SD0041', N'PT0014', N'DV015', 1, 160000, N'2026-09-15T16:00:00'),
  (N'SD0042', N'PT0014', N'DV016', 1, 170000, N'2026-09-15T17:00:00'),
  (N'SD0043', N'PT0015', N'DV015', 1, 160000, N'2026-09-16T15:00:00'),
  (N'SD0044', N'PT0015', N'DV016', 1, 170000, N'2026-09-16T16:00:00'),
  (N'SD0045', N'PT0015', N'DV017', 1, 180000, N'2026-09-16T17:00:00'),
  (N'SD0046', N'PT0016', N'DV016', 1, 170000, N'2026-09-17T15:00:00'),
  (N'SD0047', N'PT0016', N'DV017', 1, 180000, N'2026-09-17T16:00:00'),
  (N'SD0048', N'PT0016', N'DV018', 1, 190000, N'2026-09-17T17:00:00'),
  (N'SD0049', N'PT0017', N'DV017', 1, 180000, N'2026-09-18T15:00:00'),
  (N'SD0050', N'PT0017', N'DV018', 1, 190000, N'2026-09-18T16:00:00'),
  (N'SD0051', N'PT0017', N'DV019', 1, 200000, N'2026-09-18T17:00:00'),
  (N'SD0052', N'PT0018', N'DV018', 1, 190000, N'2026-09-19T15:00:00'),
  (N'SD0053', N'PT0018', N'DV019', 1, 200000, N'2026-09-19T16:00:00'),
  (N'SD0054', N'PT0018', N'DV020', 1, 210000, N'2026-09-19T17:00:00'),
  (N'SD0055', N'PT0019', N'DV019', 1, 200000, N'2026-09-20T15:00:00'),
  (N'SD0056', N'PT0019', N'DV020', 1, 210000, N'2026-09-20T16:00:00'),
  (N'SD0057', N'PT0019', N'DV001', 1, 20000, N'2026-09-20T17:00:00'),
  (N'SD0058', N'PT0020', N'DV020', 1, 210000, N'2026-09-21T15:00:00'),
  (N'SD0059', N'PT0020', N'DV001', 1, 20000, N'2026-09-21T16:00:00'),
  (N'SD0060', N'PT0020', N'DV002', 1, 30000, N'2026-09-21T17:00:00');
INSERT dbo.[Invoice] ([InvoiceId], [StayId], [CustomerId], [IssuedAt], [RoomCharge], [ServiceCharge], [Surcharge], [DiscountAmount], [DepositAmount], [StatusCode], [PaymentMethod]) VALUES
  (N'HD0001', N'PT0001', N'KH001', N'2026-09-03T11:00:00', 960000, 90000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0002', N'PT0002', N'KH002', N'2026-09-04T11:00:00', 960000, 120000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0003', N'PT0003', N'KH003', N'2026-09-05T11:00:00', 960000, 150000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0004', N'PT0004', N'KH004', N'2026-09-06T11:00:00', 960000, 180000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0005', N'PT0005', N'KH005', N'2026-09-07T11:00:00', 960000, 210000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0006', N'PT0006', N'KH006', N'2026-09-08T11:00:00', 960000, 240000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0007', N'PT0007', N'KH007', N'2026-09-09T11:00:00', 960000, 270000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0008', N'PT0008', N'KH008', N'2026-09-10T11:00:00', 960000, 300000, 0, 0, 240000, N'PAID', N'CASH'),
  (N'HD0009', N'PT0009', N'KH009', N'2026-09-11T11:00:00', 1440000, 330000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0010', N'PT0010', N'KH010', N'2026-09-12T11:00:00', 1440000, 360000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0011', N'PT0011', N'KH011', N'2026-09-13T11:00:00', 1440000, 390000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0012', N'PT0012', N'KH012', N'2026-09-14T11:00:00', 1440000, 420000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0013', N'PT0013', N'KH013', N'2026-09-15T11:00:00', 1440000, 450000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0014', N'PT0014', N'KH014', N'2026-09-16T11:00:00', 1440000, 480000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0015', N'PT0015', N'KH015', N'2026-09-17T11:00:00', 1440000, 510000, 0, 0, 360000, N'PAID', N'CASH'),
  (N'HD0016', N'PT0016', N'KH016', N'2026-09-18T11:00:00', 3100000, 540000, 0, 0, 775000, N'PAID', N'CASH'),
  (N'HD0017', N'PT0017', N'KH017', N'2026-09-19T11:00:00', 3100000, 570000, 0, 0, 775000, N'PAID', N'CASH'),
  (N'HD0018', N'PT0018', N'KH018', N'2026-09-20T11:00:00', 3100000, 600000, 0, 0, 775000, N'PAID', N'CASH'),
  (N'HD0019', N'PT0019', N'KH019', N'2026-09-21T11:00:00', 3100000, 430000, 0, 0, 775000, N'PAID', N'CASH'),
  (N'HD0020', N'PT0020', N'KH020', N'2026-09-22T11:00:00', 3100000, 260000, 0, 0, 775000, N'PAID', N'CASH');
INSERT dbo.[InvoiceLine] ([InvoiceId], [LineType], [ServiceId], [Description], [Quantity], [UnitPrice]) VALUES
  (N'HD0001', N'SERVICE', N'DV001', N'Nước suối', 1, 20000),
  (N'HD0001', N'SERVICE', N'DV002', N'Nước ngọt', 1, 30000),
  (N'HD0001', N'SERVICE', N'DV003', N'Cà phê', 1, 40000),
  (N'HD0001', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0002', N'SERVICE', N'DV002', N'Nước ngọt', 1, 30000),
  (N'HD0002', N'SERVICE', N'DV003', N'Cà phê', 1, 40000),
  (N'HD0002', N'SERVICE', N'DV004', N'Trà nóng', 1, 50000),
  (N'HD0002', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0003', N'SERVICE', N'DV003', N'Cà phê', 1, 40000),
  (N'HD0003', N'SERVICE', N'DV004', N'Trà nóng', 1, 50000),
  (N'HD0003', N'SERVICE', N'DV005', N'Ăn sáng', 1, 60000),
  (N'HD0003', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0004', N'SERVICE', N'DV004', N'Trà nóng', 1, 50000),
  (N'HD0004', N'SERVICE', N'DV005', N'Ăn sáng', 1, 60000),
  (N'HD0004', N'SERVICE', N'DV006', N'Ăn trưa', 1, 70000),
  (N'HD0004', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0005', N'SERVICE', N'DV005', N'Ăn sáng', 1, 60000),
  (N'HD0005', N'SERVICE', N'DV006', N'Ăn trưa', 1, 70000),
  (N'HD0005', N'SERVICE', N'DV007', N'Ăn tối', 1, 80000),
  (N'HD0005', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0006', N'SERVICE', N'DV006', N'Ăn trưa', 1, 70000),
  (N'HD0006', N'SERVICE', N'DV007', N'Ăn tối', 1, 80000),
  (N'HD0006', N'SERVICE', N'DV008', N'Giặt ủi', 1, 90000),
  (N'HD0006', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0007', N'SERVICE', N'DV007', N'Ăn tối', 1, 80000),
  (N'HD0007', N'SERVICE', N'DV008', N'Giặt ủi', 1, 90000),
  (N'HD0007', N'SERVICE', N'DV009', N'Ủi quần áo', 1, 100000),
  (N'HD0007', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0008', N'SERVICE', N'DV008', N'Giặt ủi', 1, 90000),
  (N'HD0008', N'SERVICE', N'DV009', N'Ủi quần áo', 1, 100000),
  (N'HD0008', N'SERVICE', N'DV010', N'Đón sân bay', 1, 110000),
  (N'HD0008', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 960000),
  (N'HD0009', N'SERVICE', N'DV009', N'Ủi quần áo', 1, 100000),
  (N'HD0009', N'SERVICE', N'DV010', N'Đón sân bay', 1, 110000),
  (N'HD0009', N'SERVICE', N'DV011', N'Thuê xe máy', 1, 120000),
  (N'HD0009', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0010', N'SERVICE', N'DV010', N'Đón sân bay', 1, 110000),
  (N'HD0010', N'SERVICE', N'DV011', N'Thuê xe máy', 1, 120000),
  (N'HD0010', N'SERVICE', N'DV012', N'Thuê xe đạp', 1, 130000),
  (N'HD0010', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0011', N'SERVICE', N'DV011', N'Thuê xe máy', 1, 120000),
  (N'HD0011', N'SERVICE', N'DV012', N'Thuê xe đạp', 1, 130000),
  (N'HD0011', N'SERVICE', N'DV013', N'Dọn phòng theo yêu cầu', 1, 140000),
  (N'HD0011', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0012', N'SERVICE', N'DV012', N'Thuê xe đạp', 1, 130000),
  (N'HD0012', N'SERVICE', N'DV013', N'Dọn phòng theo yêu cầu', 1, 140000),
  (N'HD0012', N'SERVICE', N'DV014', N'Giường phụ', 1, 150000),
  (N'HD0012', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0013', N'SERVICE', N'DV013', N'Dọn phòng theo yêu cầu', 1, 140000),
  (N'HD0013', N'SERVICE', N'DV014', N'Giường phụ', 1, 150000),
  (N'HD0013', N'SERVICE', N'DV015', N'Trang trí sinh nhật', 1, 160000),
  (N'HD0013', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0014', N'SERVICE', N'DV014', N'Giường phụ', 1, 150000),
  (N'HD0014', N'SERVICE', N'DV015', N'Trang trí sinh nhật', 1, 160000),
  (N'HD0014', N'SERVICE', N'DV016', N'Đồ ăn nhẹ', 1, 170000),
  (N'HD0014', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0015', N'SERVICE', N'DV015', N'Trang trí sinh nhật', 1, 160000),
  (N'HD0015', N'SERVICE', N'DV016', N'Đồ ăn nhẹ', 1, 170000),
  (N'HD0015', N'SERVICE', N'DV017', N'Vé tham quan', 1, 180000),
  (N'HD0015', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 1440000),
  (N'HD0016', N'SERVICE', N'DV016', N'Đồ ăn nhẹ', 1, 170000),
  (N'HD0016', N'SERVICE', N'DV017', N'Vé tham quan', 1, 180000),
  (N'HD0016', N'SERVICE', N'DV018', N'Giỏ trái cây', 1, 190000),
  (N'HD0016', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 3100000),
  (N'HD0017', N'SERVICE', N'DV017', N'Vé tham quan', 1, 180000),
  (N'HD0017', N'SERVICE', N'DV018', N'Giỏ trái cây', 1, 190000),
  (N'HD0017', N'SERVICE', N'DV019', N'Đưa đón ga tàu', 1, 200000),
  (N'HD0017', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 3100000),
  (N'HD0018', N'SERVICE', N'DV018', N'Giỏ trái cây', 1, 190000),
  (N'HD0018', N'SERVICE', N'DV019', N'Đưa đón ga tàu', 1, 200000),
  (N'HD0018', N'SERVICE', N'DV020', N'Trả phòng trễ', 1, 210000),
  (N'HD0018', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 3100000),
  (N'HD0019', N'SERVICE', N'DV019', N'Đưa đón ga tàu', 1, 200000),
  (N'HD0019', N'SERVICE', N'DV020', N'Trả phòng trễ', 1, 210000),
  (N'HD0019', N'SERVICE', N'DV001', N'Nước suối', 1, 20000),
  (N'HD0019', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 3100000),
  (N'HD0020', N'SERVICE', N'DV020', N'Trả phòng trễ', 1, 210000),
  (N'HD0020', N'SERVICE', N'DV001', N'Nước suối', 1, 20000),
  (N'HD0020', N'SERVICE', N'DV002', N'Nước ngọt', 1, 30000),
  (N'HD0020', N'ROOM', NULL, N'Tiền phòng 2 đêm', 1, 3100000);
INSERT dbo.[Payment] ([PaymentId], [BookingId], [InvoiceId], [PaymentKind], [Amount], [MethodCode], [PaidAt]) VALUES
  (N'TT0001A', N'DP0001', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-08-31T15:00:00'),
  (N'TT0001B', NULL, N'HD0001', N'SETTLEMENT', 810000, N'CASH', N'2026-09-03T12:00:00'),
  (N'TT0002A', N'DP0002', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-01T15:00:00'),
  (N'TT0002B', NULL, N'HD0002', N'SETTLEMENT', 840000, N'CASH', N'2026-09-04T12:00:00'),
  (N'TT0003A', N'DP0003', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-02T15:00:00'),
  (N'TT0003B', NULL, N'HD0003', N'SETTLEMENT', 870000, N'CASH', N'2026-09-05T12:00:00'),
  (N'TT0004A', N'DP0004', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-03T15:00:00'),
  (N'TT0004B', NULL, N'HD0004', N'SETTLEMENT', 900000, N'CASH', N'2026-09-06T12:00:00'),
  (N'TT0005A', N'DP0005', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-04T15:00:00'),
  (N'TT0005B', NULL, N'HD0005', N'SETTLEMENT', 930000, N'CASH', N'2026-09-07T12:00:00'),
  (N'TT0006A', N'DP0006', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-05T15:00:00'),
  (N'TT0006B', NULL, N'HD0006', N'SETTLEMENT', 960000, N'CASH', N'2026-09-08T12:00:00'),
  (N'TT0007A', N'DP0007', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-06T15:00:00'),
  (N'TT0007B', NULL, N'HD0007', N'SETTLEMENT', 990000, N'CASH', N'2026-09-09T12:00:00'),
  (N'TT0008A', N'DP0008', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-09-07T15:00:00'),
  (N'TT0008B', NULL, N'HD0008', N'SETTLEMENT', 1020000, N'CASH', N'2026-09-10T12:00:00'),
  (N'TT0009A', N'DP0009', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-08T15:00:00'),
  (N'TT0009B', NULL, N'HD0009', N'SETTLEMENT', 1410000, N'CASH', N'2026-09-11T12:00:00'),
  (N'TT0010A', N'DP0010', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-09T15:00:00'),
  (N'TT0010B', NULL, N'HD0010', N'SETTLEMENT', 1440000, N'CASH', N'2026-09-12T12:00:00'),
  (N'TT0011A', N'DP0011', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-10T15:00:00'),
  (N'TT0011B', NULL, N'HD0011', N'SETTLEMENT', 1470000, N'CASH', N'2026-09-13T12:00:00'),
  (N'TT0012A', N'DP0012', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-11T15:00:00'),
  (N'TT0012B', NULL, N'HD0012', N'SETTLEMENT', 1500000, N'CASH', N'2026-09-14T12:00:00'),
  (N'TT0013A', N'DP0013', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-12T15:00:00'),
  (N'TT0013B', NULL, N'HD0013', N'SETTLEMENT', 1530000, N'CASH', N'2026-09-15T12:00:00'),
  (N'TT0014A', N'DP0014', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-13T15:00:00'),
  (N'TT0014B', NULL, N'HD0014', N'SETTLEMENT', 1560000, N'CASH', N'2026-09-16T12:00:00'),
  (N'TT0015A', N'DP0015', NULL, N'DEPOSIT', 360000, N'TRANSFER', N'2026-09-14T15:00:00'),
  (N'TT0015B', NULL, N'HD0015', N'SETTLEMENT', 1590000, N'CASH', N'2026-09-17T12:00:00'),
  (N'TT0016A', N'DP0016', NULL, N'DEPOSIT', 775000, N'TRANSFER', N'2026-09-15T15:00:00'),
  (N'TT0016B', NULL, N'HD0016', N'SETTLEMENT', 2865000, N'CASH', N'2026-09-18T12:00:00'),
  (N'TT0017A', N'DP0017', NULL, N'DEPOSIT', 775000, N'TRANSFER', N'2026-09-16T15:00:00'),
  (N'TT0017B', NULL, N'HD0017', N'SETTLEMENT', 2895000, N'CASH', N'2026-09-19T12:00:00'),
  (N'TT0018A', N'DP0018', NULL, N'DEPOSIT', 775000, N'TRANSFER', N'2026-09-17T15:00:00'),
  (N'TT0018B', NULL, N'HD0018', N'SETTLEMENT', 2925000, N'CASH', N'2026-09-20T12:00:00'),
  (N'TT0019A', N'DP0019', NULL, N'DEPOSIT', 775000, N'TRANSFER', N'2026-09-18T15:00:00'),
  (N'TT0019B', NULL, N'HD0019', N'SETTLEMENT', 2755000, N'CASH', N'2026-09-21T12:00:00'),
  (N'TT0020A', N'DP0020', NULL, N'DEPOSIT', 775000, N'TRANSFER', N'2026-09-19T15:00:00'),
  (N'TT0020B', NULL, N'HD0020', N'SETTLEMENT', 2585000, N'CASH', N'2026-09-22T12:00:00'),
  (N'TT0021A', N'DP0021', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-11-05T15:00:00'),
  (N'TT0022A', N'DP0022', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-11-06T15:00:00'),
  (N'TT0023A', N'DP0023', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-11-07T15:00:00'),
  (N'TT0024A', N'DP0024', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-11-08T15:00:00'),
  (N'TT0025A', N'DP0025', NULL, N'DEPOSIT', 240000, N'TRANSFER', N'2026-11-09T15:00:00');
INSERT dbo.[MembershipPointEntry] ([InvoiceId], [MembershipId], [Points], [CreatedAt]) VALUES
  (N'HD0001', N'TV001', 110, N'2026-09-03T12:00:00'),
  (N'HD0002', N'TV002', 120, N'2026-09-04T12:00:00'),
  (N'HD0003', N'TV003', 130, N'2026-09-05T12:00:00'),
  (N'HD0004', N'TV004', 140, N'2026-09-06T12:00:00'),
  (N'HD0005', N'TV005', 150, N'2026-09-07T12:00:00'),
  (N'HD0006', N'TV006', 160, N'2026-09-08T12:00:00'),
  (N'HD0007', N'TV007', 170, N'2026-09-09T12:00:00'),
  (N'HD0008', N'TV008', 180, N'2026-09-10T12:00:00'),
  (N'HD0009', N'TV009', 190, N'2026-09-11T12:00:00'),
  (N'HD0010', N'TV010', 200, N'2026-09-12T12:00:00'),
  (N'HD0011', N'TV011', 210, N'2026-09-13T12:00:00'),
  (N'HD0012', N'TV012', 220, N'2026-09-14T12:00:00'),
  (N'HD0013', N'TV013', 230, N'2026-09-15T12:00:00'),
  (N'HD0014', N'TV014', 240, N'2026-09-16T12:00:00'),
  (N'HD0015', N'TV015', 250, N'2026-09-17T12:00:00'),
  (N'HD0016', N'TV016', 260, N'2026-09-18T12:00:00'),
  (N'HD0017', N'TV017', 270, N'2026-09-19T12:00:00'),
  (N'HD0018', N'TV018', 280, N'2026-09-20T12:00:00'),
  (N'HD0019', N'TV019', 290, N'2026-09-21T12:00:00'),
  (N'HD0020', N'TV020', 300, N'2026-09-22T12:00:00');
INSERT dbo.[HousekeepingTask] ([TaskId], [RoomId], [StayId], [CheckoutAt], [DeadlineAt], [CompletedAt], [StatusCode], [AssignedTo]) VALUES
  (N'DD0001', N'P106', N'PT0001', N'2026-09-03T11:00:00', N'2026-09-03T14:00:00', N'2026-09-03T13:00:00', N'DONE', N'TK007'),
  (N'DD0002', N'P107', N'PT0002', N'2026-09-04T11:00:00', N'2026-09-04T14:00:00', N'2026-09-04T13:00:00', N'DONE', N'TK008'),
  (N'DD0003', N'P108', N'PT0003', N'2026-09-05T11:00:00', N'2026-09-05T14:00:00', N'2026-09-05T13:00:00', N'DONE', N'TK006'),
  (N'DD0004', N'P201', N'PT0004', N'2026-09-06T11:00:00', N'2026-09-06T14:00:00', N'2026-09-06T13:00:00', N'DONE', N'TK007'),
  (N'DD0005', N'P105', N'PT0005', N'2026-09-07T11:00:00', N'2026-09-07T14:00:00', N'2026-09-07T13:00:00', N'DONE', N'TK008'),
  (N'DD0006', N'P106', N'PT0006', N'2026-09-08T11:00:00', N'2026-09-08T14:00:00', N'2026-09-08T13:00:00', N'DONE', N'TK006'),
  (N'DD0007', N'P107', N'PT0007', N'2026-09-09T11:00:00', N'2026-09-09T14:00:00', N'2026-09-09T13:00:00', N'DONE', N'TK007'),
  (N'DD0008', N'P108', N'PT0008', N'2026-09-10T11:00:00', N'2026-09-10T14:00:00', N'2026-09-10T13:00:00', N'DONE', N'TK008'),
  (N'DD0009', N'P201', N'PT0009', N'2026-09-11T11:00:00', N'2026-09-11T14:00:00', N'2026-09-11T13:00:00', N'DONE', N'TK006'),
  (N'DD0010', N'P202', N'PT0010', N'2026-09-12T11:00:00', N'2026-09-12T14:00:00', N'2026-09-12T13:00:00', N'DONE', N'TK007'),
  (N'DD0011', N'P203', N'PT0011', N'2026-09-13T11:00:00', N'2026-09-13T14:00:00', N'2026-09-13T13:00:00', N'DONE', N'TK008'),
  (N'DD0012', N'P204', N'PT0012', N'2026-09-14T11:00:00', N'2026-09-14T14:00:00', N'2026-09-14T13:00:00', N'DONE', N'TK006'),
  (N'DD0013', N'P205', N'PT0013', N'2026-09-15T11:00:00', N'2026-09-15T14:00:00', N'2026-09-15T13:00:00', N'DONE', N'TK007'),
  (N'DD0014', N'P206', N'PT0014', N'2026-09-16T11:00:00', N'2026-09-16T14:00:00', N'2026-09-16T13:00:00', N'DONE', N'TK008'),
  (N'DD0015', N'P207', N'PT0015', N'2026-09-17T11:00:00', N'2026-09-17T14:00:00', N'2026-09-17T13:00:00', N'DONE', N'TK006'),
  (N'DD0016', N'P301', N'PT0016', N'2026-09-18T11:00:00', N'2026-09-18T14:00:00', N'2026-09-18T13:00:00', N'DONE', N'TK007'),
  (N'DD0017', N'P302', N'PT0017', N'2026-09-19T11:00:00', N'2026-09-19T14:00:00', N'2026-09-19T13:00:00', N'DONE', N'TK008'),
  (N'DD0018', N'P303', N'PT0018', N'2026-09-20T11:00:00', N'2026-09-20T14:00:00', N'2026-09-20T13:00:00', N'DONE', N'TK006'),
  (N'DD0019', N'P304', N'PT0019', N'2026-09-21T11:00:00', N'2026-09-21T14:00:00', N'2026-09-21T13:00:00', N'DONE', N'TK007'),
  (N'DD0020', N'P305', N'PT0020', N'2026-09-22T11:00:00', N'2026-09-22T14:00:00', N'2026-09-22T13:00:00', N'DONE', N'TK008');
INSERT dbo.[DamageReport] ([DamageReportId], [RoomId], [TaskId], [Description], [PhotoPath], [ReportedAt], [ReportedBy]) VALUES
  (N'HH0001', N'P106', N'DD0001', N'Thiết bị hao mòn cần kiểm tra', N'images/damage-001.jpg', N'2026-09-03T12:00:00', N'TK007'),
  (N'HH0002', N'P107', N'DD0002', N'Thiết bị hao mòn cần kiểm tra', N'images/damage-002.jpg', N'2026-09-04T12:00:00', N'TK008'),
  (N'HH0003', N'P108', N'DD0003', N'Thiết bị hao mòn cần kiểm tra', N'images/damage-003.jpg', N'2026-09-05T12:00:00', N'TK006'),
  (N'HH0004', N'P201', N'DD0004', N'Thiết bị hao mòn cần kiểm tra', N'images/damage-004.jpg', N'2026-09-06T12:00:00', N'TK007'),
  (N'HH0005', N'P105', N'DD0005', N'Thiết bị hao mòn cần kiểm tra', N'images/damage-005.jpg', N'2026-09-07T12:00:00', N'TK008');
INSERT dbo.[HotelSetting] ([SettingId], [HotelName], [Address], [Hotline], [CheckInTime], [CheckOutTime], [LateFeeFrom], [LateFeePercent]) VALUES
  (1, N'Khách sạn Aurora', N'123 Nguyễn Huệ, TP. Hồ Chí Minh', N'02839990000', N'14:00:00', N'12:00:00', N'13:00:00', 10);
INSERT dbo.[BackupHistory] ([BackupId], [FilePath], [BackupAt], [CreatedBy], [StatusCode], [Note]) VALUES
  (N'BK001', N'backups/metadata-001.bak', N'2026-08-01T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK002', N'backups/metadata-002.bak', N'2026-08-02T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK003', N'backups/metadata-003.bak', N'2026-08-03T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK004', N'backups/metadata-004.bak', N'2026-08-04T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK005', N'backups/metadata-005.bak', N'2026-08-05T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK006', N'backups/metadata-006.bak', N'2026-08-06T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK007', N'backups/metadata-007.bak', N'2026-08-07T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK008', N'backups/metadata-008.bak', N'2026-08-08T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK009', N'backups/metadata-009.bak', N'2026-08-09T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK010', N'backups/metadata-010.bak', N'2026-08-10T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK011', N'backups/metadata-011.bak', N'2026-08-11T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật'),
  (N'BK012', N'backups/metadata-012.bak', N'2026-08-12T09:00:00', N'TK001', N'DEMO', N'Bản ghi mẫu; không phải tệp sao lưu thật');
INSERT dbo.[AuditEvent] ([ActorId], [ActionName], [ObjectType], [ObjectId], [Detail]) VALUES
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0001', N'Hoàn tất thanh toán HD0001'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0002', N'Hoàn tất thanh toán HD0002'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0003', N'Hoàn tất thanh toán HD0003'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0004', N'Hoàn tất thanh toán HD0004'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0005', N'Hoàn tất thanh toán HD0005'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0006', N'Hoàn tất thanh toán HD0006'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0007', N'Hoàn tất thanh toán HD0007'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0008', N'Hoàn tất thanh toán HD0008'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0009', N'Hoàn tất thanh toán HD0009'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0010', N'Hoàn tất thanh toán HD0010'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0011', N'Hoàn tất thanh toán HD0011'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0012', N'Hoàn tất thanh toán HD0012'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0013', N'Hoàn tất thanh toán HD0013'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0014', N'Hoàn tất thanh toán HD0014'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0015', N'Hoàn tất thanh toán HD0015'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0016', N'Hoàn tất thanh toán HD0016'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0017', N'Hoàn tất thanh toán HD0017'),
  (N'TK003', N'Lập hóa đơn', N'Invoice', N'HD0018', N'Hoàn tất thanh toán HD0018'),
  (N'TK004', N'Lập hóa đơn', N'Invoice', N'HD0019', N'Hoàn tất thanh toán HD0019'),
  (N'TK005', N'Lập hóa đơn', N'Invoice', N'HD0020', N'Hoàn tất thanh toán HD0020');

-- Populate the v3 attribution/link columns for the historical seed rows.
UPDATE b
SET CreatedBy = CASE WHEN b.ChannelCode = 'ONLINE' THEN COALESCE(c.AccountId, 'TK003') ELSE 'TK003' END
FROM dbo.Booking AS b
JOIN dbo.Customer AS c ON c.CustomerId = b.CustomerId;
UPDATE dbo.Stay SET CreatedBy = 'TK003' WHERE CreatedBy IS NULL;
UPDATE i
SET CreatedBy = a.ActorId
FROM dbo.Invoice AS i
JOIN dbo.AuditEvent AS a ON a.ObjectType = 'Invoice' AND a.ObjectId = i.InvoiceId
WHERE i.CreatedBy IS NULL;
UPDATE p
SET CreatedBy = COALESCE(i.CreatedBy, b.CreatedBy, 'TK003')
FROM dbo.Payment AS p
LEFT JOIN dbo.Invoice AS i ON i.InvoiceId = p.InvoiceId
LEFT JOIN dbo.Booking AS b ON b.BookingId = p.BookingId
WHERE p.CreatedBy IS NULL;
UPDATE su
SET InvoiceId = i.InvoiceId,
    RecordedBy = COALESCE(i.CreatedBy, 'TK003')
FROM dbo.ServiceUsage AS su
JOIN dbo.Invoice AS i ON i.StayId = su.StayId
WHERE su.IsVoided = 0;

-- Keep the development fixture on the same authoritative nightly/type-service
-- pricing rules as both runtime adapters.
UPDATE b
SET RoomCharge = rt.NightlyPrice * DATEDIFF(day, CONVERT(date, b.StartAt), CONVERT(date, b.EndAt)),
    DepositAmount = ROUND(rt.NightlyPrice * DATEDIFF(day, CONVERT(date, b.StartAt), CONVERT(date, b.EndAt)) * 0.25, 0)
FROM dbo.Booking AS b
JOIN dbo.Room AS r ON r.RoomId = b.RoomId
JOIN dbo.RoomType AS rt ON rt.RoomTypeId = r.RoomTypeId;

UPDATE s
SET RoomCharge = b.RoomCharge
FROM dbo.Stay AS s
JOIN dbo.Booking AS b ON b.BookingId = s.BookingId;

UPDATE il
SET UnitPrice = 0
FROM dbo.InvoiceLine AS il
JOIN dbo.Invoice AS i ON i.InvoiceId = il.InvoiceId
JOIN dbo.Stay AS s ON s.StayId = i.StayId
JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
JOIN dbo.Room AS r ON r.RoomId = b.RoomId
JOIN dbo.RoomTypeService AS rts
  ON rts.RoomTypeId = r.RoomTypeId
 AND rts.ServiceId = il.ServiceId
 AND rts.IsIncluded = 1
WHERE il.LineType = 'SERVICE';

UPDATE su
SET UnitPrice = 0
FROM dbo.ServiceUsage AS su
JOIN dbo.Stay AS s ON s.StayId = su.StayId
JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
JOIN dbo.Room AS r ON r.RoomId = b.RoomId
JOIN dbo.RoomTypeService AS rts
  ON rts.RoomTypeId = r.RoomTypeId
 AND rts.ServiceId = su.ServiceId
 AND rts.IsIncluded = 1;

UPDATE i
SET RoomCharge = s.RoomCharge,
    DepositAmount = b.DepositAmount,
    ServiceCharge = COALESCE(lines.ServiceCharge, 0)
FROM dbo.Invoice AS i
JOIN dbo.Stay AS s ON s.StayId = i.StayId
JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
OUTER APPLY (
    SELECT SUM(il.LineAmount) AS ServiceCharge
    FROM dbo.InvoiceLine AS il
    WHERE il.InvoiceId = i.InvoiceId AND il.LineType = 'SERVICE'
) AS lines;

UPDATE il
SET UnitPrice = i.RoomCharge
FROM dbo.InvoiceLine AS il
JOIN dbo.Invoice AS i ON i.InvoiceId = il.InvoiceId
WHERE il.LineType = 'ROOM';

UPDATE p
SET Amount = CASE
    WHEN p.PaymentKind = 'DEPOSIT' THEN b.DepositAmount
    ELSE i.AmountDue
END,
    ExternalReference = CASE
        WHEN p.MethodCode IN ('TRANSFER', 'CARD')
          THEN COALESCE(NULLIF(p.ExternalReference, ''), CONCAT('SEED-', p.PaymentId))
        ELSE p.ExternalReference
    END
FROM dbo.Payment AS p
LEFT JOIN dbo.Booking AS b ON b.BookingId = p.BookingId
LEFT JOIN dbo.Invoice AS i ON i.InvoiceId = p.InvoiceId;

UPDATE i
SET CustomerNameSnapshot = COALESCE(i.CustomerNameSnapshot, c.FullName),
    CustomerIdentitySnapshot = COALESCE(i.CustomerIdentitySnapshot, c.IdentityNo),
    CustomerPhoneSnapshot = COALESCE(i.CustomerPhoneSnapshot, c.Phone),
    RoomNameSnapshot = COALESCE(i.RoomNameSnapshot, roomInfo.RoomName),
    HotelNameSnapshot = COALESCE(i.HotelNameSnapshot, hs.HotelName),
    HotelAddressSnapshot = COALESCE(i.HotelAddressSnapshot, hs.Address),
    HotelHotlineSnapshot = COALESCE(i.HotelHotlineSnapshot, hs.Hotline),
    PaymentReferenceSnapshot = COALESCE(i.PaymentReferenceSnapshot, paymentInfo.ExternalReference)
FROM dbo.Invoice AS i
JOIN dbo.Customer AS c ON c.CustomerId = i.CustomerId
CROSS JOIN dbo.HotelSetting AS hs
OUTER APPLY (
    SELECT TOP (1) r.Name AS RoomName
    FROM dbo.StayRoomHistory AS srh
    JOIN dbo.Room AS r ON r.RoomId = srh.RoomId
    WHERE srh.StayId = i.StayId
    ORDER BY srh.FromAt DESC
) AS roomInfo
OUTER APPLY (
    SELECT TOP (1) p.ExternalReference
    FROM dbo.Payment AS p
    WHERE p.InvoiceId = i.InvoiceId
    ORDER BY p.PaidAt DESC
) AS paymentInfo;

UPDATE pe
SET Points = CONVERT(bigint, FLOOR((i.RoomCharge + i.ServiceCharge + i.Surcharge - i.DiscountAmount) / 10000))
FROM dbo.MembershipPointEntry AS pe
JOIN dbo.Invoice AS i ON i.InvoiceId = pe.InvoiceId;

UPDATE m
SET Points = totals.Points
FROM dbo.Membership AS m
CROSS APPLY (
    SELECT COALESCE(SUM(pe.Points), 0) AS Points
    FROM dbo.MembershipPointEntry AS pe
    WHERE pe.MembershipId = m.MembershipId
) AS totals;

INSERT dbo.[SeedHistory] ([SeedName]) VALUES
  (N'realistic_3roomtypes_v2');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO

-- Version 4 reconciles only the deterministic development fixture. Existing
-- user-created bookings/invoices are historical snapshots and are untouched.
IF EXISTS (SELECT 1 FROM dbo.SeedHistory WHERE SeedName = N'realistic_3roomtypes_v2')
   AND NOT EXISTS (SELECT 1 FROM dbo.SeedHistory WHERE SeedName = N'pricing_snapshot_v4')
BEGIN
    IF OBJECT_ID(N'dbo.trg_Invoice_Finalize', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_Invoice_Finalize ON dbo.Invoice;
    IF OBJECT_ID(N'dbo.trg_InvoiceLine_ImmutablePaid', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_InvoiceLine_ImmutablePaid ON dbo.InvoiceLine;
    IF OBJECT_ID(N'dbo.trg_Payment_ImmutablePaid', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_Payment_ImmutablePaid ON dbo.Payment;
    IF OBJECT_ID(N'dbo.trg_ServiceUsage_ProtectBilled', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_ServiceUsage_ProtectBilled ON dbo.ServiceUsage;
    IF OBJECT_ID(N'dbo.trg_PointEntry_Protect', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_PointEntry_Protect ON dbo.MembershipPointEntry;
    IF OBJECT_ID(N'dbo.trg_Membership_ProtectPoints', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_Membership_ProtectPoints ON dbo.Membership;

    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @SeedBookings TABLE (BookingId varchar(20) PRIMARY KEY);
        INSERT @SeedBookings (BookingId)
        SELECT BookingId
        FROM dbo.Booking
        WHERE LEN(BookingId) = 6
          AND LEFT(BookingId, 2) = 'DP'
          AND TRY_CONVERT(int, RIGHT(BookingId, 4)) BETWEEN 1 AND 25;

        UPDATE b
        SET RoomCharge = rt.NightlyPrice * DATEDIFF(day, CONVERT(date, b.StartAt), CONVERT(date, b.EndAt)),
            DepositAmount = ROUND(rt.NightlyPrice * DATEDIFF(day, CONVERT(date, b.StartAt), CONVERT(date, b.EndAt)) * 0.25, 0)
        FROM dbo.Booking AS b
        JOIN @SeedBookings AS seed ON seed.BookingId = b.BookingId
        JOIN dbo.Room AS r ON r.RoomId = b.RoomId
        JOIN dbo.RoomType AS rt ON rt.RoomTypeId = r.RoomTypeId;

        UPDATE s
        SET RoomCharge = b.RoomCharge
        FROM dbo.Stay AS s
        JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
        JOIN @SeedBookings AS seed ON seed.BookingId = b.BookingId;

        UPDATE il
        SET UnitPrice = 0
        FROM dbo.InvoiceLine AS il
        JOIN dbo.Invoice AS i ON i.InvoiceId = il.InvoiceId
        JOIN dbo.Stay AS s ON s.StayId = i.StayId
        JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
        JOIN @SeedBookings AS seed ON seed.BookingId = b.BookingId
        JOIN dbo.Room AS r ON r.RoomId = b.RoomId
        JOIN dbo.RoomTypeService AS rts
          ON rts.RoomTypeId = r.RoomTypeId
         AND rts.ServiceId = il.ServiceId
         AND rts.IsIncluded = 1
        WHERE il.LineType = 'SERVICE';

        UPDATE su
        SET UnitPrice = 0
        FROM dbo.ServiceUsage AS su
        JOIN dbo.Stay AS s ON s.StayId = su.StayId
        JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
        JOIN @SeedBookings AS seed ON seed.BookingId = b.BookingId
        JOIN dbo.Room AS r ON r.RoomId = b.RoomId
        JOIN dbo.RoomTypeService AS rts
          ON rts.RoomTypeId = r.RoomTypeId
         AND rts.ServiceId = su.ServiceId
         AND rts.IsIncluded = 1;

        UPDATE i
        SET RoomCharge = s.RoomCharge,
            DepositAmount = b.DepositAmount,
            ServiceCharge = COALESCE(lines.ServiceCharge, 0)
        FROM dbo.Invoice AS i
        JOIN dbo.Stay AS s ON s.StayId = i.StayId
        JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
        JOIN @SeedBookings AS seed ON seed.BookingId = b.BookingId
        OUTER APPLY (
            SELECT SUM(il.LineAmount) AS ServiceCharge
            FROM dbo.InvoiceLine AS il
            WHERE il.InvoiceId = i.InvoiceId AND il.LineType = 'SERVICE'
        ) AS lines;

        UPDATE il
        SET UnitPrice = i.RoomCharge
        FROM dbo.InvoiceLine AS il
        JOIN dbo.Invoice AS i ON i.InvoiceId = il.InvoiceId
        JOIN dbo.Stay AS s ON s.StayId = i.StayId
        JOIN @SeedBookings AS seed ON seed.BookingId = s.BookingId
        WHERE il.LineType = 'ROOM';

        UPDATE p
        SET Amount = CASE WHEN p.PaymentKind = 'DEPOSIT' THEN b.DepositAmount ELSE i.AmountDue END,
            ExternalReference = CASE
                WHEN p.MethodCode IN ('TRANSFER', 'CARD')
                  THEN COALESCE(NULLIF(p.ExternalReference, ''), CONCAT('LEGACY-', p.PaymentId))
                ELSE p.ExternalReference
            END
        FROM dbo.Payment AS p
        LEFT JOIN dbo.Booking AS b ON b.BookingId = p.BookingId
        LEFT JOIN dbo.Invoice AS i ON i.InvoiceId = p.InvoiceId
        LEFT JOIN dbo.Stay AS s ON s.StayId = i.StayId
        WHERE b.BookingId IN (SELECT BookingId FROM @SeedBookings)
           OR s.BookingId IN (SELECT BookingId FROM @SeedBookings);

        UPDATE pe
        SET Points = CONVERT(bigint, FLOOR((i.RoomCharge + i.ServiceCharge + i.Surcharge - i.DiscountAmount) / 10000))
        FROM dbo.MembershipPointEntry AS pe
        JOIN dbo.Invoice AS i ON i.InvoiceId = pe.InvoiceId
        JOIN dbo.Stay AS s ON s.StayId = i.StayId
        JOIN @SeedBookings AS seed ON seed.BookingId = s.BookingId;

        UPDATE m
        SET Points = totals.Points
        FROM dbo.Membership AS m
        CROSS APPLY (
            SELECT COALESCE(SUM(pe.Points), 0) AS Points
            FROM dbo.MembershipPointEntry AS pe
            WHERE pe.MembershipId = m.MembershipId
        ) AS totals;
        INSERT dbo.SeedHistory (SeedName) VALUES (N'pricing_snapshot_v4');
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        IF OBJECT_ID(N'dbo.trg_Invoice_Finalize', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Invoice_Finalize ON dbo.Invoice;
        IF OBJECT_ID(N'dbo.trg_InvoiceLine_ImmutablePaid', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_InvoiceLine_ImmutablePaid ON dbo.InvoiceLine;
        IF OBJECT_ID(N'dbo.trg_Payment_ImmutablePaid', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Payment_ImmutablePaid ON dbo.Payment;
        IF OBJECT_ID(N'dbo.trg_ServiceUsage_ProtectBilled', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_ServiceUsage_ProtectBilled ON dbo.ServiceUsage;
        IF OBJECT_ID(N'dbo.trg_PointEntry_Protect', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_PointEntry_Protect ON dbo.MembershipPointEntry;
        IF OBJECT_ID(N'dbo.trg_Membership_ProtectPoints', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Membership_ProtectPoints ON dbo.Membership;
        THROW;
    END CATCH;

    IF OBJECT_ID(N'dbo.trg_Invoice_Finalize', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Invoice_Finalize ON dbo.Invoice;
    IF OBJECT_ID(N'dbo.trg_InvoiceLine_ImmutablePaid', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_InvoiceLine_ImmutablePaid ON dbo.InvoiceLine;
    IF OBJECT_ID(N'dbo.trg_Payment_ImmutablePaid', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Payment_ImmutablePaid ON dbo.Payment;
    IF OBJECT_ID(N'dbo.trg_ServiceUsage_ProtectBilled', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_ServiceUsage_ProtectBilled ON dbo.ServiceUsage;
    IF OBJECT_ID(N'dbo.trg_PointEntry_Protect', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_PointEntry_Protect ON dbo.MembershipPointEntry;
    IF OBJECT_ID(N'dbo.trg_Membership_ProtectPoints', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Membership_ProtectPoints ON dbo.Membership;
END;
GO

IF EXISTS (
    SELECT 1 FROM dbo.Payment
    WHERE MethodCode IN ('TRANSFER', 'CARD')
      AND NULLIF(LTRIM(RTRIM(ExternalReference)), '') IS NULL
)
BEGIN
    IF OBJECT_ID(N'dbo.trg_Payment_ImmutablePaid', N'TR') IS NOT NULL DISABLE TRIGGER dbo.trg_Payment_ImmutablePaid ON dbo.Payment;
    UPDATE dbo.Payment
    SET ExternalReference = CONCAT('LEGACY-', PaymentId)
    WHERE MethodCode IN ('TRANSFER', 'CARD')
      AND NULLIF(LTRIM(RTRIM(ExternalReference)), '') IS NULL;
    IF OBJECT_ID(N'dbo.trg_Payment_ImmutablePaid', N'TR') IS NOT NULL ENABLE TRIGGER dbo.trg_Payment_ImmutablePaid ON dbo.Payment;
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Payment_Reference')
    ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Payment_Reference CHECK (
        MethodCode = 'CASH' OR NULLIF(LTRIM(RTRIM(ExternalReference)), '') IS NOT NULL
    );
GO

-- Stay has no competing RoomId column. This projection reads the single open
-- history row established by UX_StayHistory_OneOpen/OneOpenRoom.
CREATE OR ALTER VIEW dbo.v_StayCurrentRoom
AS
SELECT s.StayId,
       s.BookingId,
       h.RoomId AS CurrentRoomId,
       h.FromAt AS CurrentRoomFromAt
FROM dbo.Stay AS s
LEFT JOIN dbo.StayRoomHistory AS h
  ON h.StayId = s.StayId AND h.ToAt IS NULL;
GO

-- A paid transition is the single SQL finalization seam. The trigger executes
-- in the caller's transaction, links unvoided usage, and awards one ledger row.
CREATE OR ALTER TRIGGER dbo.trg_Invoice_Finalize
ON dbo.Invoice
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM deleted AS d
        LEFT JOIN inserted AS i ON i.InvoiceId = d.InvoiceId
        WHERE d.StatusCode = 'PAID'
          AND (i.InvoiceId IS NULL
               OR i.StatusCode <> 'PAID'
               OR i.StayId <> d.StayId
               OR i.CustomerId <> d.CustomerId
               OR i.IssuedAt <> d.IssuedAt
               OR i.RoomCharge <> d.RoomCharge
               OR i.ServiceCharge <> d.ServiceCharge
               OR i.Surcharge <> d.Surcharge
               OR i.DiscountAmount <> d.DiscountAmount
               OR i.DepositAmount <> d.DepositAmount
               OR i.PaymentMethod <> d.PaymentMethod
               OR ISNULL(i.CustomerNameSnapshot, '') <> ISNULL(d.CustomerNameSnapshot, '')
               OR ISNULL(i.CustomerIdentitySnapshot, '') <> ISNULL(d.CustomerIdentitySnapshot, '')
               OR ISNULL(i.CustomerPhoneSnapshot, '') <> ISNULL(d.CustomerPhoneSnapshot, '')
               OR ISNULL(i.RoomNameSnapshot, '') <> ISNULL(d.RoomNameSnapshot, '')
               OR ISNULL(i.HotelNameSnapshot, '') <> ISNULL(d.HotelNameSnapshot, '')
               OR ISNULL(i.HotelAddressSnapshot, '') <> ISNULL(d.HotelAddressSnapshot, '')
               OR ISNULL(i.HotelHotlineSnapshot, '') <> ISNULL(d.HotelHotlineSnapshot, '')
               OR ISNULL(i.PaymentReferenceSnapshot, '') <> ISNULL(d.PaymentReferenceSnapshot, '')
               OR ISNULL(i.CreatedBy, '') <> ISNULL(d.CreatedBy, ''))
    )
        THROW 51020, N'Paid invoices are immutable and cannot be deleted.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
        WHERE i.StatusCode = 'PAID' AND d.InvoiceId IS NULL
    )
        THROW 51021, N'Insert invoices as DRAFT, then finalize them with a status update.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
        WHERE i.StatusCode <> d.StatusCode
          AND NOT (d.StatusCode = 'DRAFT' AND i.StatusCode = 'PAID')
    )
        THROW 51022, N'Only the DRAFT to PAID invoice transition is allowed.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        LEFT JOIN dbo.Stay AS s ON s.StayId = i.StayId
        LEFT JOIN dbo.Booking AS b ON b.BookingId = s.BookingId
        WHERE b.BookingId IS NULL OR b.CustomerId <> i.CustomerId
    )
        THROW 51023, N'Invoice customer must match the Stay to Booking owner.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
        WHERE d.StatusCode = 'DRAFT' AND i.StatusCode = 'PAID'
          AND ((i.AmountDue > 0 AND NOT EXISTS (
                    SELECT 1 FROM dbo.Payment AS p
                    WHERE p.InvoiceId = i.InvoiceId AND p.PaymentKind = 'SETTLEMENT'
               ))
               OR i.AmountDue <> (
                   SELECT COALESCE(SUM(p.Amount), 0)
                   FROM dbo.Payment AS p
                   WHERE p.InvoiceId = i.InvoiceId AND p.PaymentKind = 'SETTLEMENT'
               ))
    )
        THROW 51024, N'Settlement payments must exactly equal AmountDue before finalization.', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
        WHERE d.StatusCode = 'DRAFT' AND i.StatusCode = 'PAID'
    )
    BEGIN
        BEGIN TRY
            EXEC sys.sp_set_session_context @key = N'HotelManager.FinalizeInvoice', @value = 1;

            UPDATE su
            SET InvoiceId = i.InvoiceId
            FROM dbo.ServiceUsage AS su
            JOIN inserted AS i ON i.StayId = su.StayId
            JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
            WHERE d.StatusCode = 'DRAFT'
              AND i.StatusCode = 'PAID'
              AND su.IsVoided = 0
              AND su.InvoiceId IS NULL;

            DECLARE @Awards TABLE (
                InvoiceId varchar(20) NOT NULL PRIMARY KEY,
                MembershipId varchar(20) NOT NULL,
                Points bigint NOT NULL
            );

            INSERT dbo.MembershipPointEntry (InvoiceId, MembershipId, Points, CreatedAt)
            OUTPUT inserted.InvoiceId, inserted.MembershipId, inserted.Points
              INTO @Awards (InvoiceId, MembershipId, Points)
            SELECT i.InvoiceId,
                   m.MembershipId,
                   CONVERT(bigint, FLOOR((i.RoomCharge + i.ServiceCharge + i.Surcharge - i.DiscountAmount) / 10000)),
                   i.IssuedAt
            FROM inserted AS i
            JOIN deleted AS d ON d.InvoiceId = i.InvoiceId
            JOIN dbo.Membership AS m ON m.CustomerId = i.CustomerId AND m.IsActive = 1
            WHERE d.StatusCode = 'DRAFT'
              AND i.StatusCode = 'PAID'
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.MembershipPointEntry AS pe WHERE pe.InvoiceId = i.InvoiceId
              );

            UPDATE m
            SET Points = m.Points + a.Points
            FROM dbo.Membership AS m
            JOIN (
                SELECT MembershipId, SUM(Points) AS Points
                FROM @Awards
                GROUP BY MembershipId
            ) AS a ON a.MembershipId = m.MembershipId;

            EXEC sys.sp_set_session_context @key = N'HotelManager.FinalizeInvoice', @value = NULL;
        END TRY
        BEGIN CATCH
            EXEC sys.sp_set_session_context @key = N'HotelManager.FinalizeInvoice', @value = NULL;
            THROW;
        END CATCH;
    END;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_InvoiceLine_ImmutablePaid
ON dbo.InvoiceLine
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT InvoiceId FROM inserted
            UNION
            SELECT InvoiceId FROM deleted
        ) AS changed
        JOIN dbo.Invoice AS i ON i.InvoiceId = changed.InvoiceId
        WHERE i.StatusCode = 'PAID'
    )
        THROW 51025, N'Lines of a paid invoice are immutable.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_Payment_ImmutablePaid
ON dbo.Payment
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT InvoiceId FROM inserted WHERE InvoiceId IS NOT NULL
            UNION
            SELECT InvoiceId FROM deleted WHERE InvoiceId IS NOT NULL
        ) AS changed
        JOIN dbo.Invoice AS i ON i.InvoiceId = changed.InvoiceId
        WHERE i.StatusCode = 'PAID'
    )
        THROW 51026, N'Payments of a paid invoice are immutable.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_ServiceUsage_ProtectBilled
ON dbo.ServiceUsage
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS su
        JOIN dbo.Invoice AS i ON i.InvoiceId = su.InvoiceId
        WHERE i.StayId <> su.StayId OR su.IsVoided = 1
    )
        THROW 51027, N'Billed service usage must be unvoided and belong to the invoice stay.', 1;

    IF EXISTS (
        SELECT 1
        FROM deleted AS su
        JOIN dbo.Invoice AS i ON i.InvoiceId = su.InvoiceId
        WHERE i.StatusCode = 'PAID'
    )
        THROW 51028, N'Service usage linked to a paid invoice is immutable.', 1;

    IF ISNULL(TRY_CONVERT(int, SESSION_CONTEXT(N'HotelManager.FinalizeInvoice')), 0) <> 1
       AND EXISTS (
           SELECT 1
           FROM inserted AS su
           JOIN dbo.Invoice AS i ON i.InvoiceId = su.InvoiceId
           LEFT JOIN deleted AS old ON old.UsageId = su.UsageId
           WHERE i.StatusCode = 'PAID' AND old.InvoiceId IS NULL
       )
        THROW 51029, N'Usage can be linked to a paid invoice only during finalization.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_PointEntry_Protect
ON dbo.MembershipPointEntry
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted)
        THROW 51030, N'Membership point ledger entries are append-only.', 1;
    IF EXISTS (SELECT 1 FROM inserted)
       AND ISNULL(TRY_CONVERT(int, SESSION_CONTEXT(N'HotelManager.FinalizeInvoice')), 0) <> 1
        THROW 51031, N'Point entries are created only by invoice finalization.', 1;
    IF EXISTS (
        SELECT 1
        FROM inserted AS pe
        LEFT JOIN dbo.Invoice AS i ON i.InvoiceId = pe.InvoiceId AND i.StatusCode = 'PAID'
        LEFT JOIN dbo.Membership AS m ON m.MembershipId = pe.MembershipId AND m.CustomerId = i.CustomerId
        WHERE i.InvoiceId IS NULL OR m.MembershipId IS NULL OR pe.Points < 0
    )
        THROW 51032, N'Point entry invoice, membership owner, or points are invalid.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_Membership_ProtectPoints
ON dbo.Membership
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(Points)
       AND ISNULL(TRY_CONVERT(int, SESSION_CONTEXT(N'HotelManager.FinalizeInvoice')), 0) <> 1
        THROW 51033, N'Membership points change only through the point ledger.', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_AuditEvent_AppendOnly
ON dbo.AuditEvent
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted)
        THROW 51034, N'Audit events are append-only.', 1;
END;
GO

IF (SELECT COUNT(*) FROM dbo.HotelSetting) <> 1
    THROW 51041, N'HotelSetting must contain exactly one row before SchemaVersion 4 is recorded.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo = 4)
    INSERT dbo.SchemaVersion (VersionNo) VALUES (4);
GO

-- BEGIN SEPAY SCHEMA V5
-- Select your application database, then execute this block to upgrade version 4.
IF DB_ID() IN (1, 2, 3, 4)
BEGIN
    RAISERROR(N'Select your application database in SSMS or use sqlcmd -d before running this script. System databases are not supported.', 16, 1);
    SET NOEXEC ON;
END;
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
IF (SELECT MAX(VersionNo) FROM dbo.SchemaVersion) IS NULL
   OR (SELECT MAX(VersionNo) FROM dbo.SchemaVersion) NOT IN (4, 5)
    THROW 51050, N'SePay schema v5 requires schema version 4 or 5.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.PaymentIntent', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.[PaymentIntent] (
            IntentId nvarchar(40) NOT NULL CONSTRAINT PK_PaymentIntent PRIMARY KEY,
            IntentKind varchar(20) NOT NULL,
            BookingId varchar(20) NULL,
            StayId varchar(20) NULL,
            Amount decimal(18,0) NOT NULL,
            Fingerprint varchar(64) NULL,
            AccountNo nvarchar(40) NOT NULL,
            StatusCode varchar(20) NOT NULL,
            ExpiresAt datetime2(0) NOT NULL,
            CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_PaymentIntent_Created DEFAULT SYSUTCDATETIME(),
            CreatedBy varchar(20) NULL,
            InvoiceId varchar(20) NULL,
            CONSTRAINT CK_PaymentIntent_Token CHECK (
                DATALENGTH(IntentId) = 52 AND
                LEFT(IntentId, 2) COLLATE Latin1_General_100_BIN2 = N'HT' AND
                SUBSTRING(IntentId, 3, 24) COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^0-9A-Fa-f]%'
            ),
            CONSTRAINT CK_PaymentIntent_Amount CHECK (Amount > 0),
            CONSTRAINT CK_PaymentIntent_Status CHECK (StatusCode IN ('PENDING', 'APPLIED', 'REVIEW', 'EXPIRED', 'CANCELLED')),
            CONSTRAINT CK_PaymentIntent_Target CHECK (
                (IntentKind = 'DEPOSIT' AND BookingId IS NOT NULL AND StayId IS NULL) OR
                (IntentKind = 'SETTLEMENT' AND StayId IS NOT NULL AND BookingId IS NULL)
            )
        );
    END;

    IF OBJECT_ID(N'dbo.SepayReceipt', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.[SepayReceipt] (
            ReceiptId nvarchar(40) NOT NULL CONSTRAINT PK_SepayReceipt PRIMARY KEY,
            IntentId nvarchar(40) NULL,
            Amount decimal(18,0) NOT NULL,
            AccountNo nvarchar(40) NOT NULL,
            Code nvarchar(40) NULL,
            Outcome varchar(20) NOT NULL,
            Reason nvarchar(250) NULL,
            PaymentId varchar(30) NULL,
            CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_SepayReceipt_Created DEFAULT SYSUTCDATETIME(),
            CONSTRAINT CK_SepayReceipt_Amount CHECK (Amount > 0),
            CONSTRAINT CK_SepayReceipt_Outcome CHECK (Outcome IN ('APPLIED', 'REVIEW'))
        );
    END;

    IF OBJECT_ID(N'dbo.FK_PaymentIntent_Booking', N'F') IS NULL
        ALTER TABLE dbo.PaymentIntent WITH CHECK ADD CONSTRAINT FK_PaymentIntent_Booking FOREIGN KEY (BookingId) REFERENCES dbo.Booking(BookingId);
    IF OBJECT_ID(N'dbo.FK_PaymentIntent_Stay', N'F') IS NULL
        ALTER TABLE dbo.PaymentIntent WITH CHECK ADD CONSTRAINT FK_PaymentIntent_Stay FOREIGN KEY (StayId) REFERENCES dbo.Stay(StayId);
    IF OBJECT_ID(N'dbo.FK_PaymentIntent_Account', N'F') IS NULL
        ALTER TABLE dbo.PaymentIntent WITH CHECK ADD CONSTRAINT FK_PaymentIntent_Account FOREIGN KEY (CreatedBy) REFERENCES dbo.Account(AccountId);
    IF OBJECT_ID(N'dbo.FK_PaymentIntent_Invoice', N'F') IS NULL
        ALTER TABLE dbo.PaymentIntent WITH CHECK ADD CONSTRAINT FK_PaymentIntent_Invoice FOREIGN KEY (InvoiceId) REFERENCES dbo.Invoice(InvoiceId);
    IF OBJECT_ID(N'dbo.FK_SepayReceipt_Intent', N'F') IS NULL
        ALTER TABLE dbo.SepayReceipt WITH CHECK ADD CONSTRAINT FK_SepayReceipt_Intent FOREIGN KEY (IntentId) REFERENCES dbo.PaymentIntent(IntentId);
    IF OBJECT_ID(N'dbo.FK_SepayReceipt_Payment', N'F') IS NULL
        ALTER TABLE dbo.SepayReceipt WITH CHECK ADD CONSTRAINT FK_SepayReceipt_Payment FOREIGN KEY (PaymentId) REFERENCES dbo.Payment(PaymentId);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PaymentIntent') AND name = N'UX_PaymentIntent_PendingBooking')
        CREATE UNIQUE INDEX UX_PaymentIntent_PendingBooking ON dbo.PaymentIntent(BookingId, IntentKind)
        WHERE StatusCode = 'PENDING' AND IntentKind = 'DEPOSIT' AND BookingId IS NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PaymentIntent') AND name = N'UX_PaymentIntent_PendingStay')
        CREATE UNIQUE INDEX UX_PaymentIntent_PendingStay ON dbo.PaymentIntent(StayId, IntentKind)
        WHERE StatusCode = 'PENDING' AND IntentKind = 'SETTLEMENT' AND StayId IS NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SepayReceipt') AND name = N'UX_SepayReceipt_AppliedIntent')
        CREATE UNIQUE INDEX UX_SepayReceipt_AppliedIntent ON dbo.SepayReceipt(IntentId)
        WHERE Outcome = 'APPLIED' AND IntentId IS NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SepayReceipt') AND name = N'UX_SepayReceipt_Payment')
        CREATE UNIQUE INDEX UX_SepayReceipt_Payment ON dbo.SepayReceipt(PaymentId)
        WHERE PaymentId IS NOT NULL;

    IF NOT EXISTS (SELECT 1 FROM dbo.SchemaVersion WHERE VersionNo = 5)
        INSERT dbo.SchemaVersion (VersionNo) VALUES (5);
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
SELECT DB_NAME() AS DatabaseName,
       (SELECT MAX(VersionNo) FROM dbo.SchemaVersion) AS SchemaVersion,
       (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) AS TableCount,
       (SELECT COUNT(*) FROM sys.foreign_keys) AS ForeignKeyCount;
SELECT RoomTypeId, Name, DailyPrice FROM dbo.RoomType ORDER BY RoomTypeId;
PRINT N'Schema version 5 is ready in ' + QUOTENAME(DB_NAME()) + N'.';
GO
SET NOEXEC OFF;
GO
-- END SEPAY SCHEMA V5
