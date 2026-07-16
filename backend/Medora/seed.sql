INSERT INTO Specialties (NameAr, NameEn) VALUES 
(N'باطنة', 'Internal Medicine'),
(N'أطفال', 'Pediatrics'),
(N'قلب', 'Cardiology'),
(N'جلدية', 'Dermatology'),
(N'نساء وتوليد', 'Obstetrics & Gynecology'),
(N'عظام', 'Orthopedics'),
(N'أسنان', 'Dentistry');

INSERT INTO Governorates (NameAr, NameEn) VALUES
(N'القاهرة', 'Cairo'),
(N'الجيزة', 'Giza'),
(N'الإسكندرية', 'Alexandria');

DECLARE @CairoId INT = (SELECT Id FROM Governorates WHERE NameEn = 'Cairo');
DECLARE @GizaId INT = (SELECT Id FROM Governorates WHERE NameEn = 'Giza');
DECLARE @AlexId INT = (SELECT Id FROM Governorates WHERE NameEn = 'Alexandria');

INSERT INTO Cities (GovernorateId, NameAr, NameEn) VALUES
(@CairoId, N'مدينة نصر', 'Nasr City'),
(@CairoId, N'مصر الجديدة', 'Heliopolis'),
(@CairoId, N'المعادي', 'Maadi'),
(@GizaId, N'الدقي', 'Dokki'),
(@GizaId, N'المهندسين', 'Mohandeseen'),
(@GizaId, N'الهرم', 'Haram'),
(@AlexId, N'سموحة', 'Smouha'),
(@AlexId, N'سيدي جابر', 'Sidi Gaber');
