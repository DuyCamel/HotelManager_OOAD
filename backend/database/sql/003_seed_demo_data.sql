/*
TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C6
Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
Chạy sau 001/002 trên SQL Server thật; đối chiếu FK, số lượng, tiền, điểm và các trạng thái đang ở/chờ cọc/cần dọn.
Bổ sung kịch bản cùng ngày/gia hạn/ngày lễ tương ứng seed JSON; không thêm dữ liệu cá nhân hoặc tài khoản ngân hàng thật.
Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
*/
/* 003_seed_demo_data.sql
   DỮ LIỆU GIẢ CHO KIỂM THỬ — chạy sau 001 và 002.
   104 tài khoản, 120 hồ sơ khách, 60 phòng, 240 phiếu đặt, 160 phiếu thuê,
   150 hóa đơn và các giao dịch/chi tiết/sổ điểm/nhật ký tương ứng.
   Mật khẩu ứng dụng mọi tài khoản demo: Demo@123 (KHÔNG phải mật khẩu login SQL).
   PBKDF2WithHmacSHA256 120000 vòng, salt:hash Base64 tương thích Passwords.java.
   Salt dữ liệu demo là xác định để tái lập; tài khoản thật dùng salt ngẫu nhiên tại Node.js.
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
 (N'TK01',N'9YjZalNH+mUpP4uHQ2BUyQ==:gBfqt5rXw6rXJ0kY1d7Ha6ZXfO7rlrfIsUwbFdT0eR8=',N'Quản trị viên',N'admin@hotel.test',N'0909000000',N'ADMIN',1),
 (N'TK02',N'dgbxJA44AZrBSqE8Fhry4w==:PbVvSeY+Rk0ZK0pjGy2/4heFyUi4gRtqY9YI/hYDdqo=',N'Quản lý chính',N'manager@hotel.test',N'0909000001',N'MANAGER',1),
 (N'TK03',N'Tt+bp1uCHvcOlnS/qmohvA==:OCZYV2QYTiR9z1YIrQgqJHh0FEG1FcviAB/fFPFDAxw=',N'Lễ tân chính',N'reception@hotel.test',N'0909000002',N'RECEPTIONIST',1),
 (N'TK04',N'B3AByMVpUEDsQUSF3Jdz+g==:Kefuu/1Ckt4PGfa/oGQ0Snjqq/Imy2QvHoT4YfVQRno=',N'Buồng phòng chính',N'housekeeping@hotel.test',N'0909000003',N'HOUSEKEEPER',1),
 (N'TK_M02',N'cZWtDBZWPJzY7X4amFoTxw==:OOylZCynsILSNJgbfcjLtUeQo2OgUD6/WgFQfrXKMyM=',N'Quản lý 2',N'manager02@hotel.test',N'0909000004',N'MANAGER',1),
 (N'TK_M03',N'03VtNP6U2YuCiz3nqsxZgw==:bnzRz4G5X5IOBsuVkfnjEXqnzCcCPGPvgrSTXh1f8+c=',N'Quản lý 3',N'manager03@hotel.test',N'0909000005',N'MANAGER',1),
 (N'TK_R02',N'X7VecdL+9+Rhn1Te/dUUog==:GI1JGllVIJKMJMg3NNZxYiqCSff4RMB/y+lPdJN9OY0=',N'Lễ tân 2',N'reception02@hotel.test',N'0909000006',N'RECEPTIONIST',1),
 (N'TK_R03',N'OqAxkWtMumk+MugAwoADMw==:jfnbCVvqsFh3HvGFckAlZinPSxe3fAEAx0HWzMOLA2U=',N'Lễ tân 3',N'reception03@hotel.test',N'0909000007',N'RECEPTIONIST',1),
 (N'TK_R04',N'3HtXwB10DCRuGauQqtdCAg==:crm75pX6yUwfwWsjEzWBfB+rNscv8F4l0JurOP+QCRI=',N'Lễ tân 4',N'reception04@hotel.test',N'0909000008',N'RECEPTIONIST',1),
 (N'TK_R05',N'WRG2sgT26096eWKUVshWUA==:y5/ZLz3xYuSDjrImNBtjQUeco88szQhSwclH1vDUNXU=',N'Lễ tân 5',N'reception05@hotel.test',N'0909000009',N'RECEPTIONIST',1),
 (N'TK_R06',N'jehN/sPB+dmqpRJgaRiIeA==:aJfyPj9NVm9cimC1+cVYw02QUdaOX9dNYu4y4eqZets=',N'Lễ tân 6',N'reception06@hotel.test',N'0909000010',N'RECEPTIONIST',1),
 (N'TK_R07',N'AhZ3y/RxbC+6aJ7XVjX7dw==:ipLaZQLqbVBqQlDagaT2TY241obFGbvwCJjhbYGlbwg=',N'Lễ tân 7',N'reception07@hotel.test',N'0909000011',N'RECEPTIONIST',1),
 (N'TK_R08',N'vut9DfnvuI2jSg3bDTV6Qg==:n2JfSb0R+R2O8jv5txeW0VSq5cdLfNBM0PzEVkd9b9E=',N'Lễ tân 8',N'reception08@hotel.test',N'0909000012',N'RECEPTIONIST',1),
 (N'TK_R09',N'bQN+LTwL3SAdhwCW1DRM5Q==:ucgK0jaL8blay7DdhXt7sk+XSd87kBH/X3sX9xnvvuw=',N'Lễ tân 9',N'reception09@hotel.test',N'0909000013',N'RECEPTIONIST',1),
 (N'TK_R10',N'j4amvLI5gp2Qux/22+kq1Q==:H6Z8mlcsNWczdynjvzlocSxHDZmbgdexrr7QcPcxT6k=',N'Lễ tân 10',N'reception10@hotel.test',N'0909000014',N'RECEPTIONIST',1),
 (N'TK_R11',N'G81ni1kuUnsvPd3pC8zmbQ==:LK89zAXgy2HXJNEJh0yCgLkhaiaRD7NdGwZruXS1Cvg=',N'Lễ tân 11',N'reception11@hotel.test',N'0909000015',N'RECEPTIONIST',1),
 (N'TK_R12',N'+K8pgevjK/3yvC6k9mT73A==:BFBYV1bew4XAmjeJaDYwIX45ezzeN0UeQ/5gb8ehK/k=',N'Lễ tân 12',N'reception12@hotel.test',N'0909000016',N'RECEPTIONIST',1),
 (N'TK_H02',N'+UmtaIK3jRsAuiZLr5o2eA==:PQrebp8AojvsiHNwzjiB69EMhYrX+BaMOADBnYF0Ec4=',N'Buồng phòng 2',N'housekeeping02@hotel.test',N'0909000017',N'HOUSEKEEPER',1),
 (N'TK_H03',N'FE5JSC8auuoAGzy+cTxIUg==:J6TYS1Wahn+Bid/4ZkdmHHwL3wrWCmu3Xbv2auyoynA=',N'Buồng phòng 3',N'housekeeping03@hotel.test',N'0909000018',N'HOUSEKEEPER',1),
 (N'TK_H04',N'obHNQspmcnU0QEZ1OzlDrg==:yRlynbICsBs6SrGxdnxfmO3Yzz1iosEQL0+fjvbn29g=',N'Buồng phòng 4',N'housekeeping04@hotel.test',N'0909000019',N'HOUSEKEEPER',1),
 (N'TK_H05',N'c72Uk1Red8YfntR/G1gNwg==:+XveoM21AGuT0RK0TZE3Rsw/XsGCACBGFLe241Xn9j8=',N'Buồng phòng 5',N'housekeeping05@hotel.test',N'0909000020',N'HOUSEKEEPER',1),
 (N'TK_H06',N'lrjtiydBtXjPTS7e2LK7Gw==:4NRCxzasvS5hHpJi+vLq+B39Z4pOYT0PognPRp3IP0w=',N'Buồng phòng 6',N'housekeeping06@hotel.test',N'0909000021',N'HOUSEKEEPER',1),
 (N'TK_H07',N'UlZr5RVN2DconczP0972xg==:xWnGrhRGUfKPTLAe4Q3XrAw0n0+VBwNX9ZwxZ5ufufQ=',N'Buồng phòng 7',N'housekeeping07@hotel.test',N'0909000022',N'HOUSEKEEPER',1),
 (N'TK_H08',N'WJGeJbeGf+5iJQsYKzLviw==:TXiw3eGo4t3rjasiwl1FIOoBBKOhEg9v+EcY4ic/ULg=',N'Buồng phòng 8',N'housekeeping08@hotel.test',N'0909000023',N'HOUSEKEEPER',1),
 (N'TK_C001',N'wFxk+kJnWW+yc2idgRsZGw==:mZJ3roXLrx6h3gytE5v7kF/R40dR5iusVo5bInbnsFE=',N'Khách trực tuyến 001',N'customer@hotel.test',N'0918000001',N'CUSTOMER',1),
 (N'TK_C002',N'QctkRFll8b7+YULEE14nwg==:iT7FvVCN7aGUNY9viCAyGzMmblltrIg/tYWJeJSgDz8=',N'Khách trực tuyến 002',N'customer002@hotel.test',N'0918000002',N'CUSTOMER',1),
 (N'TK_C003',N'1F1MSWjhqVe21dDFSzQW0w==:XK+FAO+m/ktcF5NgA2p1ZAIJwhiyfynI6DYF0IdAPac=',N'Khách trực tuyến 003',N'customer003@hotel.test',N'0918000003',N'CUSTOMER',1),
 (N'TK_C004',N'pQ4fAQ/m3uPA0FRPCF2dPQ==:bbH/eqq5KvIc9jXbOStiL/MOuG1B2tLXYtMtXmT9sWY=',N'Khách trực tuyến 004',N'customer004@hotel.test',N'0918000004',N'CUSTOMER',1),
 (N'TK_C005',N'GHpcCpnQ9NvHKP/2Bjknag==:joiBh5lBaCnjhhRVSvEfZtaWB1/4MJWPs4HDpj8m0PQ=',N'Khách trực tuyến 005',N'customer005@hotel.test',N'0918000005',N'CUSTOMER',1),
 (N'TK_C006',N'ClAKJTS8QTLnq/nl1q6ZJw==:lsnq6ElKT6tkOv7QgyUu2rXqHFEISnWOdvSaoZcdDss=',N'Khách trực tuyến 006',N'customer006@hotel.test',N'0918000006',N'CUSTOMER',1),
 (N'TK_C007',N'ZDuX1NpwWAsJ6IfOt4X54g==:3EgGwD/JNF7Giok0sb/SvCBwYc9M+N2bqqs9sr4UUCc=',N'Khách trực tuyến 007',N'customer007@hotel.test',N'0918000007',N'CUSTOMER',1),
 (N'TK_C008',N'N6nDzf+0RIdaBfo817C9pA==:E+tdHMNILeyRD2D8HXkw3MUW68IoWgPaNhH78G/PqKA=',N'Khách trực tuyến 008',N'customer008@hotel.test',N'0918000008',N'CUSTOMER',1),
 (N'TK_C009',N'coGQkmmE9mXe3AMiOJnCdA==:9SnV6NjuEwudnIIRxgaZTtVNkOQ+OFObPEzjz2EEXps=',N'Khách trực tuyến 009',N'customer009@hotel.test',N'0918000009',N'CUSTOMER',1),
 (N'TK_C010',N'QjBl5XKVyoR2gxz5sEKA3w==:2/IBa25if2L9z7oeM/mGc3o/Pc8whVRBXKa8zge1jCw=',N'Khách trực tuyến 010',N'customer010@hotel.test',N'0918000010',N'CUSTOMER',1),
 (N'TK_C011',N'XuNGa4CG/piyBD+uyd1U+Q==:lL2WUbmHcf5YTZq9VW8dQICxKB7Xp86t9dWT9dxVOPY=',N'Khách trực tuyến 011',N'customer011@hotel.test',N'0918000011',N'CUSTOMER',1),
 (N'TK_C012',N'yVjT6GynGs7jB1QnDdX5fw==:rFPrIUbVUXTwKnqAArGcpdwPcOAt3jLbFNTFCC3AN9o=',N'Khách trực tuyến 012',N'customer012@hotel.test',N'0918000012',N'CUSTOMER',1),
 (N'TK_C013',N'rFnLRSSXhX9HwpOEOFwDMw==:kCxydkIAawrdPqSd6URxgj6HZgmdGucIWOswHg1gOBc=',N'Khách trực tuyến 013',N'customer013@hotel.test',N'0918000013',N'CUSTOMER',1),
 (N'TK_C014',N'jYJdkiyD0KLN8GelGsbM2Q==:Omh4mM8+D70HXH+rHs53QBKQMlHpt5p7Cfk1THPoM/o=',N'Khách trực tuyến 014',N'customer014@hotel.test',N'0918000014',N'CUSTOMER',1),
 (N'TK_C015',N'FrRxWcDLUSVJnlMwuLGP3w==:nwJjt4Sm4VcqAffSotVwybaQYhcbapPaBM3INtzdYOg=',N'Khách trực tuyến 015',N'customer015@hotel.test',N'0918000015',N'CUSTOMER',1),
 (N'TK_C016',N'htsHSO3c/AWH2o4XklxClg==:KAhopdR4TsXydC6evfy+Xznft7xZZZJ6uAj1UFT8xqo=',N'Khách trực tuyến 016',N'customer016@hotel.test',N'0918000016',N'CUSTOMER',1),
 (N'TK_C017',N'olLpkcf19cixWIjNyVjJig==:GVDnAhqN64tdiLeGWgGvrvcNzlGw2Al3dilUpQTjElQ=',N'Khách trực tuyến 017',N'customer017@hotel.test',N'0918000017',N'CUSTOMER',1),
 (N'TK_C018',N'GqLj4PK8+eXsr4amPDRlMQ==:18CYtnOLIIegTPff4EsKbbsCWxxKb0xaJU54dUNhyGA=',N'Khách trực tuyến 018',N'customer018@hotel.test',N'0918000018',N'CUSTOMER',1),
 (N'TK_C019',N'zD1JpEHVUUo1qJ7kAAx26A==:jNpitBMUbup+KtFbs627d2RHHWmZ9lVNt5zJpBk13Bk=',N'Khách trực tuyến 019',N'customer019@hotel.test',N'0918000019',N'CUSTOMER',1),
 (N'TK_C020',N'XMTg65skDOEYuvneecG5yQ==:37dbXRElD6L5vCcoToOEB2+fihvBArfmjTFdnUeyLmk=',N'Khách trực tuyến 020',N'customer020@hotel.test',N'0918000020',N'CUSTOMER',1),
 (N'TK_C021',N'aVeqccER4I91efhE3Iwfig==:/V96cI4qZRDQCoyTX2VZlNXhjzOyluVzVLOXfrmwXZ4=',N'Khách trực tuyến 021',N'customer021@hotel.test',N'0918000021',N'CUSTOMER',1),
 (N'TK_C022',N'hOSxsiEiXR1mCrOJNGgtMA==:2xNMESeJURsxJ9DbyUlqQcL0YjHGbDewMAlBUJmZHb8=',N'Khách trực tuyến 022',N'customer022@hotel.test',N'0918000022',N'CUSTOMER',1),
 (N'TK_C023',N'ZIQgk342o3VEL/4fy3SRvg==:dt4vzj7Vo1lOB/XBOmWGQPs2NNUDrS2LDBYlhRWOBic=',N'Khách trực tuyến 023',N'customer023@hotel.test',N'0918000023',N'CUSTOMER',1),
 (N'TK_C024',N'GvQyxRXbRWfqfNSClsAunQ==:j7Qb/6PyojLyV+1LU8salyUoQwq4rJH6oskY5G3oqI4=',N'Khách trực tuyến 024',N'customer024@hotel.test',N'0918000024',N'CUSTOMER',1),
 (N'TK_C025',N'j3A3vIdGt+o9NDYJ5m5CDg==:DdP9rVKbdhOixVKQcrrbU2Qsi71pjEoObDNCxa6HgPw=',N'Khách trực tuyến 025',N'customer025@hotel.test',N'0918000025',N'CUSTOMER',1),
 (N'TK_C026',N'gAPYXTDDcNZLrRsljGxSrg==:HNB2MBmte4Zqmd/9+8gomY5eppZbB3Yeg5g/KqK8R+I=',N'Khách trực tuyến 026',N'customer026@hotel.test',N'0918000026',N'CUSTOMER',1),
 (N'TK_C027',N'UVoPfQdPjneQLsqo+shFXw==:t0JsvtLZKzJAsYv7HZvZA6a4xnCK0oWvj8r4ulqexLM=',N'Khách trực tuyến 027',N'customer027@hotel.test',N'0918000027',N'CUSTOMER',1),
 (N'TK_C028',N'dpR1M07hYr0sTE693MzLAQ==:ToZqJs5rrYV8LOit6Y+FAf3pCRQ1T94gLVMX4/E85nM=',N'Khách trực tuyến 028',N'customer028@hotel.test',N'0918000028',N'CUSTOMER',1),
 (N'TK_C029',N'QFHNHwsto8wjiO0HVTvlIQ==:Ge0eS8VQGaywotKE/e3bSiNWk8atYFGr6UuxtLC6J8U=',N'Khách trực tuyến 029',N'customer029@hotel.test',N'0918000029',N'CUSTOMER',1),
 (N'TK_C030',N'9OX5ED9fEmdM+hY8MH1H8Q==:bk3LA68OnmIa/QbOUEOJohuXOrejyAwJSOpz9aMEghM=',N'Khách trực tuyến 030',N'customer030@hotel.test',N'0918000030',N'CUSTOMER',1),
 (N'TK_C031',N'fj/8bTUGOUU/iGhvRRmkPQ==:TGdET+rJTMGQjyhjBFNXiolXWdrDsG5mYnmG460jm1s=',N'Khách trực tuyến 031',N'customer031@hotel.test',N'0918000031',N'CUSTOMER',1),
 (N'TK_C032',N'bGByYxz8Rrzi6NCvHvqzSw==:UfqRsDOTFO5VsN2a/MoN3HF1W9mtfqcWd/ElVn1rNho=',N'Khách trực tuyến 032',N'customer032@hotel.test',N'0918000032',N'CUSTOMER',1),
 (N'TK_C033',N'jJBs5V/HZ2sUdEheajYmHQ==:VapYt0mJBiPUXDD2KbUf0C0eVJ7pd6nq9WjVDx4r7m0=',N'Khách trực tuyến 033',N'customer033@hotel.test',N'0918000033',N'CUSTOMER',1),
 (N'TK_C034',N'HDBD37n1gdrV/l3v8wOCpw==:o/nYw8a5k+QALnvSMoyxG8h3Ni5gC9vbET80/IzUrl8=',N'Khách trực tuyến 034',N'customer034@hotel.test',N'0918000034',N'CUSTOMER',1),
 (N'TK_C035',N'ASCJb3GlIaxSwXqA6jBkIA==:d/qrd4G4xnesOmEwVHF0n/43b5wEFq5YYZb81kNSzCQ=',N'Khách trực tuyến 035',N'customer035@hotel.test',N'0918000035',N'CUSTOMER',1),
 (N'TK_C036',N'KnHHI65zDpU9ZJXCAeK71Q==:65JDEFQuf2Ip4TZYC+Yt3fCvPUtNG/HwUZfeOzdGS7U=',N'Khách trực tuyến 036',N'customer036@hotel.test',N'0918000036',N'CUSTOMER',1),
 (N'TK_C037',N'wdMOZrf+prDsMKUDwr8RGQ==:ludLlxRycbdKZ8MG/gA4brce8S65LssyVQ1jqIPWKu8=',N'Khách trực tuyến 037',N'customer037@hotel.test',N'0918000037',N'CUSTOMER',1),
 (N'TK_C038',N'0HT46aeDQoWzIi/UskMTUQ==:/Vwr+bn/JCr6NT8kkbfvz6IdjjOjVn8avWrBhLz2ZOs=',N'Khách trực tuyến 038',N'customer038@hotel.test',N'0918000038',N'CUSTOMER',1),
 (N'TK_C039',N'VhQUBmN7c4r1Rtbum/9DNg==:zmQb5VEG3fk8jQc8ZrKVJAyfeKyHPwQtqRfalhPDY7c=',N'Khách trực tuyến 039',N'customer039@hotel.test',N'0918000039',N'CUSTOMER',1),
 (N'TK_C040',N'Nv2pdYrN3RChrHJ1JNeaXA==:VyZqzEiC72RnWn3cFJf437hufmItj1O0xnIRxXKh/8w=',N'Khách trực tuyến 040',N'customer040@hotel.test',N'0918000040',N'CUSTOMER',1),
 (N'TK_C041',N'lWi1h7dwGQ1V7vKU8o9g4g==:O5v8QXWo39CSOQB2bwQNyWldpLljySWiIgoz37l/Obk=',N'Khách trực tuyến 041',N'customer041@hotel.test',N'0918000041',N'CUSTOMER',1),
 (N'TK_C042',N'VpJ+0+ATenjOGU4XqnJURw==:pNPmuvR25s3RXdiC8Ezo+Owl3EIQc6pz/k+UL/6VWI0=',N'Khách trực tuyến 042',N'customer042@hotel.test',N'0918000042',N'CUSTOMER',1),
 (N'TK_C043',N'RoPM3QzlJRYe39QK1xntxQ==:ncR0/O9lGrOVNSNWOKj4Sk1oN3vvqDs0LcFEEPM97pw=',N'Khách trực tuyến 043',N'customer043@hotel.test',N'0918000043',N'CUSTOMER',1),
 (N'TK_C044',N'wUGWp0XfgAcVi8RrA9UT9Q==:bCIqNVzGpC5swjdjoMeziLo60GkMLMJAQhb4gHu+CQQ=',N'Khách trực tuyến 044',N'customer044@hotel.test',N'0918000044',N'CUSTOMER',1),
 (N'TK_C045',N'qwN/UOBTzwoP6EMp+l2Etg==:yPbp9R29f0wcP6T3pSjgdC7mahjIslDIMQ9tXMKgO20=',N'Khách trực tuyến 045',N'customer045@hotel.test',N'0918000045',N'CUSTOMER',1),
 (N'TK_C046',N'0QbLkEf0xaJU42CkpKAOEg==:WKBMwEYBQjWAUScsgNb8tR2D1wMnmUo07BPtPCj3KC8=',N'Khách trực tuyến 046',N'customer046@hotel.test',N'0918000046',N'CUSTOMER',1),
 (N'TK_C047',N'Xt3aY9/qIYSrPAJr/2Q+/A==:IQpdJoNoALhFCeQlWMNL43yRDmy/Z4mbA0uve/t7ZfY=',N'Khách trực tuyến 047',N'customer047@hotel.test',N'0918000047',N'CUSTOMER',1),
 (N'TK_C048',N'75b60OIDEO+QwdOJGGzENg==:wENFcs0ELzAKdvXZx/6OPSLbGnQjQE9hrl+CZm6BATg=',N'Khách trực tuyến 048',N'customer048@hotel.test',N'0918000048',N'CUSTOMER',1),
 (N'TK_C049',N'4QUz4vOTepZUChNpxoMEWg==:GoximoI1HfnvHqQyzpCazXrgb/Z/XwBjT7dSyxQCrJY=',N'Khách trực tuyến 049',N'customer049@hotel.test',N'0918000049',N'CUSTOMER',1),
 (N'TK_C050',N'L2TP5wbhbcXEqw+ZFr0xvA==:2LlyyvYICFNCGhCPsesMLrIgeyv+GipeJyhRWpTr2rc=',N'Khách trực tuyến 050',N'customer050@hotel.test',N'0918000050',N'CUSTOMER',1),
 (N'TK_C051',N'1QAs+tOO5sS0LsQ6GYltkQ==:RAnJoPf849iofEC+u6MxRarazw9i+oXJzbiCJgIq7uk=',N'Khách trực tuyến 051',N'customer051@hotel.test',N'0918000051',N'CUSTOMER',1),
 (N'TK_C052',N'FNHfL7LZNLcM9rMpePOe0g==:Fb9tiHe0MNOUVboFhhBy+sQ3nyGk3FxIxaWo+FSKDD4=',N'Khách trực tuyến 052',N'customer052@hotel.test',N'0918000052',N'CUSTOMER',1),
 (N'TK_C053',N'QhW2NXx0KNht0gQy6Iq4Nw==:ORB58g3CPmuq4fxT3PbjdPrAxVXf+OzPzvRunyl5UI0=',N'Khách trực tuyến 053',N'customer053@hotel.test',N'0918000053',N'CUSTOMER',1),
 (N'TK_C054',N'xsR9CaDe0oUDY0CzkasoaQ==:byoFloSG934CUW1/8BjUelPcjHcCZRoik8dbstCu7EU=',N'Khách trực tuyến 054',N'customer054@hotel.test',N'0918000054',N'CUSTOMER',1),
 (N'TK_C055',N'i2H60ybznkCggXVoEkVxgA==:2+7MTdwJjv9ijtNRqXaN92Cvw+du4OxK5Bf+CHH922U=',N'Khách trực tuyến 055',N'customer055@hotel.test',N'0918000055',N'CUSTOMER',1),
 (N'TK_C056',N'/un3a78CwBatxSd6EH2o+A==:+72jpCaitpx8MACIwrQ9cdbP8DiipQgqGefF0LtzOFU=',N'Khách trực tuyến 056',N'customer056@hotel.test',N'0918000056',N'CUSTOMER',1),
 (N'TK_C057',N'TFDwI38afqezxjpKopfdOg==:YQKkrdT55RjLI+Ft+zJksw9RztKuHyCVoYyq4jNvh6w=',N'Khách trực tuyến 057',N'customer057@hotel.test',N'0918000057',N'CUSTOMER',1),
 (N'TK_C058',N'MOpS4NQ7bcwl9zWAqgH+8A==:mQ9iQbV/AZZPnE1Nm5LVAD1h+vYLqFCWeIeNa9OwAOM=',N'Khách trực tuyến 058',N'customer058@hotel.test',N'0918000058',N'CUSTOMER',1),
 (N'TK_C059',N'xpeDnEzocQxHAbHk/ja3JA==:7/uhBzT4pgMB63iw9jLBwl2FlaSzmvjm/uXxii9y+nU=',N'Khách trực tuyến 059',N'customer059@hotel.test',N'0918000059',N'CUSTOMER',1),
 (N'TK_C060',N'217BZdSoJBnsCVDLI3smMg==:5NmPTEkZ8Wl+z2R4rZ6TE0LBqDwqDA9vDiaFf/l9aYk=',N'Khách trực tuyến 060',N'customer060@hotel.test',N'0918000060',N'CUSTOMER',1),
 (N'TK_C061',N'jvxFXe+syAM4hTVjukN5vg==:alhm9rVlAS8sStSM4JV2f6uf8+m5vS+Xtlcn46iRMFk=',N'Khách trực tuyến 061',N'customer061@hotel.test',N'0918000061',N'CUSTOMER',1),
 (N'TK_C062',N'qKKmRVpGIvohvPx6hfhtUw==:BPg0FcA+x/rYMjfUIKfYOU9CDJpae6jw4oSF2nBsQPQ=',N'Khách trực tuyến 062',N'customer062@hotel.test',N'0918000062',N'CUSTOMER',1),
 (N'TK_C063',N'2/UzI6nWtOEH/dvmMvbrZQ==:iFjyZeNpJFuwkraRXLbu5LiPuQKLgbnVWg3KLjuWWeg=',N'Khách trực tuyến 063',N'customer063@hotel.test',N'0918000063',N'CUSTOMER',1),
 (N'TK_C064',N'qG8prkyyLxa4p1/Vb+UmHw==:G4Qg5p1WArxvdbTIK9oPK2sS1wOWlNdAot3wGirvw2U=',N'Khách trực tuyến 064',N'customer064@hotel.test',N'0918000064',N'CUSTOMER',1),
 (N'TK_C065',N'5M0OM0Y9XAc0GReKCZRySw==:NebSrnFSmL1GUEWf7fJRrklC3a9JP77O7n6GnP6wAOY=',N'Khách trực tuyến 065',N'customer065@hotel.test',N'0918000065',N'CUSTOMER',1),
 (N'TK_C066',N'RHC2Mzt5lVjNCL/AUxFV3A==:Bs/4coibYqaAEBjuECZySg6r2GG9hZsOVeXPanyjEqo=',N'Khách trực tuyến 066',N'customer066@hotel.test',N'0918000066',N'CUSTOMER',1),
 (N'TK_C067',N'kBv0YDrdgMuPCxWtwBRjRg==:fviUS5rskWvVr664FXeoKiT6hYs1Gg8FLUG1K2AROT4=',N'Khách trực tuyến 067',N'customer067@hotel.test',N'0918000067',N'CUSTOMER',1),
 (N'TK_C068',N'MnebiAd7RKlT1XsddeTAyw==:hhR8gSiBPHhdcNOsv3vtC2eivy97RScVk/RnN6McLm0=',N'Khách trực tuyến 068',N'customer068@hotel.test',N'0918000068',N'CUSTOMER',1),
 (N'TK_C069',N'pWtFnpgfAgfdmkVei2bQFA==:onDgScuvfvmOZMchVcMyxx8EaAi5Ce9M4p2Tcf9l/HY=',N'Khách trực tuyến 069',N'customer069@hotel.test',N'0918000069',N'CUSTOMER',1),
 (N'TK_C070',N'J6N5uqms0Gd/toipzdY3Ow==:yr3cTmwTZ5EagdyhcQ76PN2ihs805HARH4hJ8AVfrcA=',N'Khách trực tuyến 070',N'customer070@hotel.test',N'0918000070',N'CUSTOMER',1),
 (N'TK_C071',N'NRVYGFthrH6C3oGBQXIiNQ==:MebJNhecOvx418+rn6QELA0WHjGzzn4OM0Q8QRRNXz4=',N'Khách trực tuyến 071',N'customer071@hotel.test',N'0918000071',N'CUSTOMER',1),
 (N'TK_C072',N'7rSlUBTneQ/O1nY1vpQSZg==:pMF7Rzx5E+dJ1GJ5DYtONfOpecsy6fIrZ/aTALB5QNI=',N'Khách trực tuyến 072',N'customer072@hotel.test',N'0918000072',N'CUSTOMER',1),
 (N'TK_C073',N'qbgA4iJtMMCdUHDZN9ye6w==:9tER99Zhgms0YXQreqVhqOFZqmgugDXQ/6+F3C/TrSM=',N'Khách trực tuyến 073',N'customer073@hotel.test',N'0918000073',N'CUSTOMER',1),
 (N'TK_C074',N'oRABGqqL5lcedDfo8i7JQw==:JANtw91FisoBm742v/18Rcg8w1UaHVxtH5atLfsLACE=',N'Khách trực tuyến 074',N'customer074@hotel.test',N'0918000074',N'CUSTOMER',1),
 (N'TK_C075',N'oUP/xP3abDsCxlWmImrsYA==:oz4vW7+tPGDO6ek47Wsj/k8hd0QwcntMJyO8qz3FsX8=',N'Khách trực tuyến 075',N'customer075@hotel.test',N'0918000075',N'CUSTOMER',1),
 (N'TK_C076',N'KCyk6xFW5BM6wwDoJ74VwA==:kS8oaikyIqS1UojUs0yah+pHHiNsMZoEZ4MKe7cGWHA=',N'Khách trực tuyến 076',N'customer076@hotel.test',N'0918000076',N'CUSTOMER',1),
 (N'TK_C077',N't143T+hDvgi8w3gi3WTs3Q==:vtksG3ATplOrPp2uUkN8JJDMkuJMFE88brX8Wj4u22U=',N'Khách trực tuyến 077',N'customer077@hotel.test',N'0918000077',N'CUSTOMER',0),
 (N'TK_C078',N'itasFNNA6/ilEfSnY+Sq1g==:L2R7D84ESwdeFLv5E/FgRmk4H3wzi4C/sP79er/krlM=',N'Khách trực tuyến 078',N'customer078@hotel.test',N'0918000078',N'CUSTOMER',0),
 (N'TK_C079',N'4WgN/rXI23582USVqFVb6w==:fDYFFXaCbWdACpTtdZsDdV6sksPWsfEaKgUuBFJI2Bk=',N'Khách trực tuyến 079',N'customer079@hotel.test',N'0918000079',N'CUSTOMER',0),
 (N'TK_C080',N'7hBJNcnZ0ipjEPBSOgumUw==:ELKmv4adbsBbQD6mNuLlKtrboPOJEqz3PBojgugrqlE=',N'Khách trực tuyến 080',N'customer080@hotel.test',N'0918000080',N'CUSTOMER',0);

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
