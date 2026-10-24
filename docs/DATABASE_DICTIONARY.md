# Từ điển dữ liệu

Tự sinh bằng `npm run docs:dictionary` từ `database/01_schema.sql` và `database/02_programmability.sql`. Không sửa tay file này. `npm run docs:check` kiểm tra tài liệu có còn khớp DDL. Đây là metadata đọc từ script, không phải chứng nhận đã chạy SQL Server.

Tổng: **23 bảng, 167 cột, 36 khóa ngoại**.

## Danh sách bảng

| Bảng | Số cột |
|---|---:|
| SchemaVersion | 2 |
| SeedHistory | 2 |
| Account | 10 |
| Customer | 9 |
| RoomType | 8 |
| Room | 7 |
| HotelService | 6 |
| RoomTypeService | 3 |
| HolidayRate | 7 |
| Membership | 5 |
| Booking | 14 |
| Stay | 8 |
| StayRoomHistory | 6 |
| Invoice | 13 |
| InvoiceLine | 8 |
| Payment | 9 |
| MembershipPointEntry | 4 |
| HousekeepingTask | 7 |
| DamageReport | 7 |
| HotelSetting | 10 |
| BackupHistory | 6 |
| AuditEvent | 7 |
| ServiceUsage | 9 |

## SchemaVersion

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| VersionNo | int | Không | PK | int NOT NULL CONSTRAINT PK_SchemaVersion PRIMARY KEY |
| AppliedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_SchemaVersion_Applied DEFAULT SYSUTCDATETIME() |

## SeedHistory

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| SeedName | varchar(100) | Không | PK | varchar(100) NOT NULL CONSTRAINT PK_SeedHistory PRIMARY KEY |
| AppliedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_SeedHistory_Applied DEFAULT SYSUTCDATETIME() |

## Account

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| AccountId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Account PRIMARY KEY |
| PasswordHash | varchar(200) | Không |  | varchar(200) NOT NULL |
| FullName | nvarchar(120) | Không |  | nvarchar(120) NOT NULL |
| Email | nvarchar(254) | Không |  | nvarchar(254) NOT NULL |
| Phone | varchar(15) | Không |  | varchar(15) NOT NULL |
| RoleCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| AuthVersion | int | Không |  | int NOT NULL CONSTRAINT DF_Account_AuthVersion DEFAULT 0 |
| IsActive | bit | Không |  | bit NOT NULL CONSTRAINT DF_Account_Active DEFAULT 1 |
| CreatedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Account_Created DEFAULT SYSUTCDATETIME() |
| RowVersion | rowversion | Theo SQL Server |  | rowversion |

## Customer

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| CustomerId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Customer PRIMARY KEY |
| FullName | nvarchar(120) | Không |  | nvarchar(120) NOT NULL |
| Phone | varchar(15) | Không |  | varchar(15) NOT NULL |
| IdentityNo | varchar(30) | Có |  | varchar(30) NULL |
| Address | nvarchar(512) | Không |  | nvarchar(512) NOT NULL CONSTRAINT DF_Customer_Address DEFAULT N'' |
| AccountId | varchar(20) | Có |  | varchar(20) NULL |
| IsActive | bit | Không |  | bit NOT NULL CONSTRAINT DF_Customer_Active DEFAULT 1 |
| CreatedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Customer_Created DEFAULT SYSUTCDATETIME() |
| RowVersion | rowversion | Theo SQL Server |  | rowversion |

Khóa ngoại:

- `FK_Customer_AccountId`: [AccountId] → Account([AccountId]).

## RoomType

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| RoomTypeId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_RoomType PRIMARY KEY |
| Name | nvarchar(100) | Không |  | nvarchar(100) NOT NULL |
| Capacity | int | Không |  | int NOT NULL |
| Beds | int | Không |  | int NOT NULL |
| HourlyPrice | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| NightlyPrice | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| DailyPrice | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| Amenities | nvarchar(1000) | Không |  | nvarchar(1000) NOT NULL CONSTRAINT DF_RoomType_Amenities DEFAULT N'' |

## Room

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| RoomId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Room PRIMARY KEY |
| Name | nvarchar(100) | Không |  | nvarchar(100) NOT NULL |
| RoomTypeId | varchar(20) | Không |  | varchar(20) NOT NULL |
| StatusCode | varchar(20) | Không |  | varchar(20) NOT NULL CONSTRAINT DF_Room_Status DEFAULT 'AVAILABLE' |
| ImagePath | nvarchar(512) | Có |  | nvarchar(512) NULL |
| Note | nvarchar(1000) | Không |  | nvarchar(1000) NOT NULL CONSTRAINT DF_Room_Note DEFAULT N'' |
| RowVersion | rowversion | Theo SQL Server |  | rowversion |

Khóa ngoại:

- `FK_Room_RoomTypeId`: [RoomTypeId] → RoomType([RoomTypeId]).

## HotelService

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| ServiceId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_HotelService PRIMARY KEY |
| Name | nvarchar(100) | Không |  | nvarchar(100) NOT NULL |
| Description | nvarchar(512) | Không |  | nvarchar(512) NOT NULL CONSTRAINT DF_Service_Description DEFAULT N'' |
| UnitName | nvarchar(30) | Không |  | nvarchar(30) NOT NULL |
| Price | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| IsActive | bit | Không |  | bit NOT NULL CONSTRAINT DF_Service_Active DEFAULT 1 |

## RoomTypeService

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| RoomTypeId | varchar(20) | Không |  | varchar(20) NOT NULL |
| ServiceId | varchar(20) | Không |  | varchar(20) NOT NULL |
| IsIncluded | bit | Không |  | bit NOT NULL CONSTRAINT DF_RoomTypeService_Included DEFAULT 1 |

Khóa ngoại:

- `FK_RoomTypeService_RoomTypeId`: [RoomTypeId] → RoomType([RoomTypeId]).
- `FK_RoomTypeService_ServiceId`: [ServiceId] → HotelService([ServiceId]).

## HolidayRate

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| HolidayRateId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_HolidayRate PRIMARY KEY |
| Name | nvarchar(120) | Không |  | nvarchar(120) NOT NULL |
| RoomTypeId | varchar(20) | Không |  | varchar(20) NOT NULL |
| StartDate | date | Không |  | date NOT NULL |
| EndDate | date | Không |  | date NOT NULL |
| IncreasePercent | decimal(7,2) | Không |  | decimal(7,2) NOT NULL |
| IsActive | bit | Không |  | bit NOT NULL CONSTRAINT DF_HolidayRate_Active DEFAULT 1 |

Khóa ngoại:

- `FK_HolidayRate_RoomTypeId`: [RoomTypeId] → RoomType([RoomTypeId]).

## Membership

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| MembershipId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Membership PRIMARY KEY |
| CustomerId | varchar(20) | Không |  | varchar(20) NOT NULL |
| Points | bigint | Không |  | bigint NOT NULL CONSTRAINT DF_Membership_Points DEFAULT 0 |
| IsActive | bit | Không |  | bit NOT NULL CONSTRAINT DF_Membership_Active DEFAULT 1 |
| IssuedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Membership_Issued DEFAULT SYSUTCDATETIME() |

Khóa ngoại:

- `FK_Membership_CustomerId`: [CustomerId] → Customer([CustomerId]).

## Booking

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| BookingId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Booking PRIMARY KEY |
| CustomerId | varchar(20) | Không |  | varchar(20) NOT NULL |
| RoomId | varchar(20) | Không |  | varchar(20) NOT NULL |
| StartAt | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| EndAt | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| GuestCount | int | Không |  | int NOT NULL |
| StatusCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| ChannelCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| RoomCharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| DepositAmount | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_Booking_Deposit DEFAULT 0 |
| HoldUntil | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| CreatedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Booking_Created DEFAULT SYSUTCDATETIME() |
| CreatedBy | varchar(20) | Có |  | varchar(20) NULL |
| RowVersion | rowversion | Theo SQL Server |  | rowversion |

Khóa ngoại:

- `FK_Booking_CustomerId`: [CustomerId] → Customer([CustomerId]).
- `FK_Booking_RoomId`: [RoomId] → Room([RoomId]).
- `FK_Booking_CreatedBy`: [CreatedBy] → Account([AccountId]).

## Stay

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| StayId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Stay PRIMARY KEY |
| BookingId | varchar(20) | Không |  | varchar(20) NOT NULL |
| RoomId | varchar(20) | Không |  | varchar(20) NOT NULL |
| IdentityNo | varchar(30) | Không |  | varchar(30) NOT NULL |
| RoomCharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| Surcharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_Stay_Surcharge DEFAULT 0 |
| CreatedBy | varchar(20) | Có |  | varchar(20) NULL |
| RowVersion | rowversion | Theo SQL Server |  | rowversion |

Khóa ngoại:

- `FK_Stay_BookingId`: [BookingId] → Booking([BookingId]).
- `FK_Stay_RoomId`: [RoomId] → Room([RoomId]).
- `FK_Stay_CreatedBy`: [CreatedBy] → Account([AccountId]).

## StayRoomHistory

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| HistoryId | bigint | Không | PK, identity | bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_StayRoomHistory PRIMARY KEY |
| StayId | varchar(20) | Không |  | varchar(20) NOT NULL |
| RoomId | varchar(20) | Không |  | varchar(20) NOT NULL |
| FromAt | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| ToAt | datetime2(0) | Có |  | datetime2(0) NULL |
| ExtraCharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_StayHistory_Extra DEFAULT 0 |

Khóa ngoại:

- `FK_StayRoomHistory_StayId`: [StayId] → Stay([StayId]).
- `FK_StayRoomHistory_RoomId`: [RoomId] → Room([RoomId]).

## Invoice

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| InvoiceId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_Invoice PRIMARY KEY |
| StayId | varchar(20) | Không |  | varchar(20) NOT NULL |
| CustomerId | varchar(20) | Không |  | varchar(20) NOT NULL |
| IssuedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Invoice_Issued DEFAULT SYSUTCDATETIME() |
| RoomCharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| ServiceCharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Service DEFAULT 0 |
| Surcharge | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Surcharge DEFAULT 0 |
| DiscountAmount | decimal(18,2) | Không |  | decimal(18,2) NOT NULL CONSTRAINT DF_Invoice_Discount DEFAULT 0 |
| DepositAmount | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| AmountDue | computed | Theo SQL Server |  | AS CONVERT(decimal(18,2), RoomCharge + ServiceCharge + Surcharge - DiscountAmount - DepositAmount) PERSISTED |
| StatusCode | varchar(10) | Không |  | varchar(10) NOT NULL CONSTRAINT DF_Invoice_Status DEFAULT 'DRAFT' |
| PaymentMethod | varchar(20) | Không |  | varchar(20) NOT NULL |
| CreatedBy | varchar(20) | Có |  | varchar(20) NULL |

Khóa ngoại:

- `FK_Invoice_StayId`: [StayId] → Stay([StayId]).
- `FK_Invoice_CustomerId`: [CustomerId] → Customer([CustomerId]).
- `FK_Invoice_CreatedBy`: [CreatedBy] → Account([AccountId]).

## InvoiceLine

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| InvoiceLineId | bigint | Không | PK, identity | bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InvoiceLine PRIMARY KEY |
| InvoiceId | varchar(20) | Không |  | varchar(20) NOT NULL |
| LineType | varchar(20) | Không |  | varchar(20) NOT NULL |
| ServiceId | varchar(20) | Có |  | varchar(20) NULL |
| Description | nvarchar(200) | Không |  | nvarchar(200) NOT NULL |
| Quantity | decimal(10,2) | Không |  | decimal(10,2) NOT NULL |
| UnitPrice | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| LineAmount | computed | Theo SQL Server |  | AS CONVERT(decimal(18,2), Quantity * UnitPrice) PERSISTED |

Khóa ngoại:

- `FK_InvoiceLine_InvoiceId`: [InvoiceId] → Invoice([InvoiceId]).
- `FK_InvoiceLine_ServiceId`: [ServiceId] → HotelService([ServiceId]).

## Payment

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| PaymentId | varchar(30) | Không | PK | varchar(30) NOT NULL CONSTRAINT PK_Payment PRIMARY KEY |
| BookingId | varchar(20) | Có |  | varchar(20) NULL |
| InvoiceId | varchar(20) | Có |  | varchar(20) NULL |
| PaymentKind | varchar(20) | Không |  | varchar(20) NOT NULL |
| Amount | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| MethodCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| ExternalReference | varchar(100) | Có |  | varchar(100) NULL |
| PaidAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Payment_Paid DEFAULT SYSUTCDATETIME() |
| CreatedBy | varchar(20) | Có |  | varchar(20) NULL |

Khóa ngoại:

- `FK_Payment_BookingId`: [BookingId] → Booking([BookingId]).
- `FK_Payment_InvoiceId`: [InvoiceId] → Invoice([InvoiceId]).
- `FK_Payment_CreatedBy`: [CreatedBy] → Account([AccountId]).

## MembershipPointEntry

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| InvoiceId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_MembershipPointEntry PRIMARY KEY |
| MembershipId | varchar(20) | Không |  | varchar(20) NOT NULL |
| Points | bigint | Không |  | bigint NOT NULL |
| CreatedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_PointEntry_Created DEFAULT SYSUTCDATETIME() |

Khóa ngoại:

- `FK_MembershipPointEntry_InvoiceId`: [InvoiceId] → Invoice([InvoiceId]).
- `FK_MembershipPointEntry_MembershipId`: [MembershipId] → Membership([MembershipId]).

## HousekeepingTask

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| TaskId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_HousekeepingTask PRIMARY KEY |
| RoomId | varchar(20) | Không |  | varchar(20) NOT NULL |
| StayId | varchar(20) | Có |  | varchar(20) NULL |
| DeadlineAt | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| CompletedAt | datetime2(0) | Có |  | datetime2(0) NULL |
| StatusCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| AssignedTo | varchar(20) | Có |  | varchar(20) NULL |

Khóa ngoại:

- `FK_HousekeepingTask_RoomId`: [RoomId] → Room([RoomId]).
- `FK_HousekeepingTask_StayId`: [StayId] → Stay([StayId]).
- `FK_HousekeepingTask_AssignedTo`: [AssignedTo] → Account([AccountId]).

## DamageReport

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| DamageReportId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_DamageReport PRIMARY KEY |
| RoomId | varchar(20) | Không |  | varchar(20) NOT NULL |
| TaskId | varchar(20) | Có |  | varchar(20) NULL |
| Description | nvarchar(1000) | Không |  | nvarchar(1000) NOT NULL |
| PhotoPath | nvarchar(512) | Không |  | nvarchar(512) NOT NULL |
| ReportedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Damage_Reported DEFAULT SYSUTCDATETIME() |
| ReportedBy | varchar(20) | Không |  | varchar(20) NOT NULL |

Khóa ngoại:

- `FK_DamageReport_RoomId`: [RoomId] → Room([RoomId]).
- `FK_DamageReport_TaskId`: [TaskId] → HousekeepingTask([TaskId]).
- `FK_DamageReport_ReportedBy`: [ReportedBy] → Account([AccountId]).

## HotelSetting

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| SettingId | tinyint | Không | PK | tinyint NOT NULL CONSTRAINT PK_HotelSetting PRIMARY KEY |
| HotelName | nvarchar(200) | Không |  | nvarchar(200) NOT NULL |
| Address | nvarchar(512) | Không |  | nvarchar(512) NOT NULL |
| Hotline | varchar(15) | Không |  | varchar(15) NOT NULL |
| LateFeeFrom | time(0) | Không |  | time(0) NOT NULL |
| LateFeePercent | decimal(7,2) | Không |  | decimal(7,2) NOT NULL |
| BankCode | varchar(30) | Có |  | varchar(30) NULL |
| BankAccount | varchar(40) | Có |  | varchar(40) NULL |
| BankOwner | nvarchar(150) | Có |  | nvarchar(150) NULL |
| LogoPath | nvarchar(512) | Có |  | nvarchar(512) NULL |

## BackupHistory

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| BackupId | varchar(30) | Không | PK | varchar(30) NOT NULL CONSTRAINT PK_BackupHistory PRIMARY KEY |
| FilePath | nvarchar(512) | Không |  | nvarchar(512) NOT NULL |
| BackupAt | datetime2(0) | Không |  | datetime2(0) NOT NULL |
| CreatedBy | varchar(20) | Không |  | varchar(20) NOT NULL |
| StatusCode | varchar(20) | Không |  | varchar(20) NOT NULL |
| Note | nvarchar(500) | Không |  | nvarchar(500) NOT NULL CONSTRAINT DF_Backup_Note DEFAULT N'' |

Khóa ngoại:

- `FK_BackupHistory_CreatedBy`: [CreatedBy] → Account([AccountId]).

## AuditEvent

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| AuditEventId | bigint | Không | PK, identity | bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY |
| EventAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Audit_Time DEFAULT SYSUTCDATETIME() |
| ActorId | varchar(20) | Có |  | varchar(20) NULL |
| ActionName | nvarchar(100) | Không |  | nvarchar(100) NOT NULL |
| ObjectType | varchar(30) | Không |  | varchar(30) NOT NULL |
| ObjectId | varchar(40) | Không |  | varchar(40) NOT NULL |
| Detail | nvarchar(2000) | Không |  | nvarchar(2000) NOT NULL CONSTRAINT DF_Audit_Detail DEFAULT N'' |

Khóa ngoại:

- `FK_AuditEvent_ActorId`: [ActorId] → Account([AccountId]).

## ServiceUsage

| Cột | Kiểu | NULL | PK / identity | Định nghĩa gốc |
|---|---|---|---|---|
| UsageId | varchar(20) | Không | PK | varchar(20) NOT NULL CONSTRAINT PK_ServiceUsage PRIMARY KEY |
| StayId | varchar(20) | Không |  | varchar(20) NOT NULL |
| ServiceId | varchar(20) | Không |  | varchar(20) NOT NULL |
| Quantity | decimal(10,2) | Không |  | decimal(10,2) NOT NULL |
| UnitPrice | decimal(18,2) | Không |  | decimal(18,2) NOT NULL |
| UsedAt | datetime2(0) | Không |  | datetime2(0) NOT NULL CONSTRAINT DF_Usage_UsedAt DEFAULT SYSUTCDATETIME() |
| RecordedBy | varchar(20) | Không |  | varchar(20) NOT NULL |
| IsVoided | bit | Không |  | bit NOT NULL CONSTRAINT DF_Usage_Void DEFAULT 0 |
| InvoiceId | varchar(20) | Có |  | varchar(20) NULL |

Khóa ngoại:

- `FK_Usage_Stay`: StayId → Stay(StayId).
- `FK_Usage_Service`: ServiceId → HotelService(ServiceId).
- `FK_Usage_Actor`: RecordedBy → Account(AccountId).
- `FK_Usage_Invoice`: InvoiceId → Invoice(InvoiceId).

## Trigger, view, function và procedure

| Loại | Object |
|---|---|
| TRIGGER | trg_Booking_Validate |
| TRIGGER | trg_HolidayRate_NoOverlap |
| TRIGGER | trg_Room_ProtectReservations |
| TRIGGER | trg_Customer_Validate |
| TRIGGER | trg_Stay_Validate |
| TRIGGER | trg_InvoiceLine_ImmutablePaid |
| TRIGGER | trg_Payment_Validate |
| TRIGGER | trg_Membership_PointsFromLedger |
| TRIGGER | trg_PointEntry_Immutable |
| TRIGGER | trg_Invoice_Finalize |
| TRIGGER | trg_AuditEvent_AppendOnly |
| FUNCTION | fn_QuoteRoom |
| VIEW | v_RoomBoard |
| VIEW | v_BookingLookup |
| VIEW | v_Membership |
| VIEW | v_DailyRevenue |
| PROCEDURE | usp_ExpireUnpaidBookings |
| PROCEDURE | usp_CreateBooking |
| PROCEDURE | usp_ConfirmDeposit |
| PROCEDURE | usp_CheckIn |
| PROCEDURE | usp_CheckOut |
| PROCEDURE | usp_ChangeRoom |
| PROCEDURE | usp_FinishCleaning |
| PROCEDURE | usp_TransferAdmin |
| TRIGGER | trg_PointEntry_ValidateInsert |
| TRIGGER | trg_RoomType_ProtectCapacity |
| TRIGGER | trg_Usage_Validate |
