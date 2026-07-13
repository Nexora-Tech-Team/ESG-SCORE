INSERT INTO award_periods (year, name, status)
VALUES (2026, 'ESG Mining Award 2026', 'active')
ON CONFLICT (year) DO NOTHING;

DELETE FROM checklist_items WHERE id IN ('soc-community', 'gov-board-risk');

INSERT INTO checklist_items (id, pillar, category, sub_category, question_number, question, evidence_required, weight, sort_order)
VALUES
('env-tailings-water', 'environmental', 'Tailing & Air', 'Tailings Safety', '1.1', 'Apakah desain fasilitas tailing telah ditinjau dan disetujui oleh *Engineer of Record* (EoR) independen sesuai standar global (GISTM/ANCOLD)?', 'Laporan tinjauan EoR terbaru, Dokumen desain teknis bendungan.', 0.02, 10),
('env-tailings-monitoring', 'environmental', 'Tailing & Air', 'Tailings Safety', '1.2', 'Apakah perusahaan menerapkan sistem pemantauan instrumental real-time (piezometer, inclinometer) pada bendungan tailing?', 'Data log pemantauan harian/bulanan, Dashboard sistem pemantauan.', 0.03, 20),
('env-tailings-erp', 'environmental', 'Tailing & Air', 'Tailings Safety', '1.3', 'Apakah ada Rencana Tanggap Darurat (ERP) khusus kegagalan tailing yang telah disimulasikan dengan masyarakat hilir minimal 1x/tahun?', 'Dokumen ERP Tailing, Laporan hasil simulasi/drill, Daftar hadir masyarakat.', 0.03, 30),
('env-water-balance', 'environmental', 'Tailing & Air', 'Water Management', '1.4', 'Apakah perusahaan memiliki Neraca Air (*Water Balance*) yang terupdate dan diverifikasi pihak ketiga?', 'Laporan Neraca Air tahunan, Sertifikat verifikasi pihak ketiga.', 0.03, 40),
('env-recycle-rate', 'environmental', 'Tailing & Air', 'Water Management', '1.5', 'Berapa persentase air proses yang didaur ulang (*recycle rate*) dan apakah ada target peningkatan tahunan?', 'Data operasional bulanan, Dokumen target KPI lingkungan (ISO 14001).', 0.02, 50),
('env-effluent-quality', 'environmental', 'Tailing & Air', 'Water Management', '1.6', 'Apakah kualitas air limpasan (*effluent*) memenuhi baku mutu lingkungan sebelum dibuang ke badan air penerima?', 'Laporan hasil uji laboratorium air limbah rutin (min. 1x/bulan).', 0.02, 60),
('env-biodiversity-baseline', 'environmental', 'Biodiversity & Closure', 'Biodiversity', '2.1', 'Apakah perusahaan telah melakukan studi baseline keanekaragaman hayati sebelum operasi dan memantau perubahan secara berkala?', 'Laporan Baseline Biodiversitas, Laporan monitoring flora/fauna tahunan.', 0.02, 70),
('env-biodiversity-tnfd', 'environmental', 'Biodiversity & Closure', 'Biodiversity', '2.2', 'Apakah perusahaan mengadopsi kerangka TNFD atau standar serupa untuk mengelola risiko alam?', 'Dokumen kebijakan manajemen risiko alam, Laporan pengungkapan TNFD.', 0.02, 80),
('env-iso14001', 'environmental', 'Biodiversity & Closure', 'Biodiversity', '2.3', 'Apakah perusahaan memiliki Sistem Manajemen Lingkungan tersertifikasi ISO 14001 dan terakreditasi?', 'Sertifikat ISO 14001, Laporan audit', 0.03, 90),
('env-biodiversity-closure', 'environmental', 'Biodiversity & Closure', 'Mine Closure', '2.4', 'Apakah tersedia Dana Jaminan Reklamasi/Pascatambang yang terpisah (*escrow account*) dan cukup untuk menutup tambang?', 'Bukti rekening escrow, Perhitungan biaya penutupan tambang terkini.', 0.02, 100),
('env-mine-closure-progressive', 'environmental', 'Biodiversity & Closure', 'Mine Closure', '2.05', 'Apakah perusahaan menerapkan reklamasi progresif (saat tambang masih beroperasi) minimal 10% dari lahan terganggu per tahun?', 'Peta progres reklamasi, Foto dokumentasi lapangan, Laporan capaian fisik.', 0.02, 110),
('env-ghg-inventory', 'environmental', 'Decarbonization', 'GHG Management', '3.1', 'Apakah inventarisasi Gas Rumah Kaca (GRK) Scope 1 & 2 telah dilakukan sesuai ISO 14064 dan diverifikasi pihak ketiga?', 'Laporan Inventarisasi GRK, Sertifikat Verifikasi ISO 14064', 0.03, 120),
('env-ghg-target', 'environmental', 'Decarbonization', 'GHG Management', '3.2', 'Apakah perusahaan memiliki target penurunan emisi berbasis sains (SBTi) atau target net-zero yang jelas?', 'Dokumen komitmen SBTi/Net-Zero, Roadmap dekarbonisasi.', 0.02, 130),
('env-decarbonization-energy', 'environmental', 'Decarbonization', 'Energy Efficiency', '3.3', 'Apakah perusahaan memiliki Sistem Manajemen Energi tersertifikasi ISO 50001 dan terakredasi?', 'Sertifikat ISO 50001, Laporan audit energi internal.', 0.02, 140),
('env-ebt-share', 'environmental', 'Decarbonization', 'Energy Efficiency', '3.4', 'Berapa persentase penggunaan Energi Baru Terbarukan (EBT) dalam total konsumsi energi situs tambang?', 'Tagihan/listrik EBT, Kontrak pembelian EBT, Data konsumsi bahan bakar.', 0.02, 150),
('env-electrification', 'environmental', 'Decarbonization', 'Energy Efficiency', '3.5', 'Apakah ada program elektrifikasi alat berat atau efisiensi bahan bakar diesel yang terukur?', 'Data penggunaan alat berat EV/hybrid, Laporan penghematan BBM.', 0.03, 160),
('soc-zero-harm', 'social', 'Zero Harm & K3', 'Safety System', '4.1', 'Apakah perusahaan memiliki sertifikat ISO 45001 yang berlaku untuk seluruh operasional situs?', 'Sertifikat ISO 45001 Ruang lingkup sertifikasi.', 0.05, 170),
('soc-ltifr-trifr', 'social', 'Zero Harm & K3', 'Safety System', '4.2', 'Berapa nilai LTIFR (Lost Time Injury Frequency Rate) dan TRIFR dalam 12 bulan terakhir?', 'Statistik kecelakaan kerja bulanan/tahunan, Grafik tren.', 0.04, 180),
('soc-fatality', 'social', 'Zero Harm & K3', 'Safety System', '4.3', 'Apakah terjadi kasus fatalitas (kematian) pekerja/kontraktor dalam 12 bulan terakhir?', 'Laporan investigasi kecelakaan (jika ada), Pernyataan zero fatality.', 0.04, 190),
('soc-health-wellbeing', 'social', 'Zero Harm & K3', 'Health & Wellbeing', '4.4', 'Apakah perusahaan memiliki program kesehatan kerja yang mencakup pemeriksaan kesehatan berkala dan kesehatan mental?', 'Laporan HIPERKES, Program Employee Assistance Program (EAP).', 0.03, 200),
('soc-stop-work', 'social', 'Zero Harm & K3', 'Health & Wellbeing', '4.5', 'Apakah ada mekanisme *Stop Work Authority* yang diberdayakan kepada semua pekerja tanpa takut sanksi?', 'Prosedur SWA, Hasil survei iklim keselamatan, Kasus SWA yang tercatat.', 0.03, 210),
('soc-fpic', 'social', 'SLO & Community', 'FPIC & Consent', '5.1', 'Apakah perusahaan menerapkan prinsip FPIC (*Free, Prior, and Informed Consent*) untuk setiap akuisisi lahan baru?', 'Dokumen kesepakatan masyarakat adat/lokal, Notulensi sosialisasi.', 0.03, 220),
('soc-grievance', 'social', 'SLO & Community', 'Grievance Mechanism', '5.2', 'Apakah terdapat mekanisme pengaduan (*grievance*) yang mudah diakses, transparan, dan terlacak statusnya?', 'Buku/Register keluhan, SOP penanganan keluhan (**ISO 26000**).', 0.03, 230),
('soc-grievance-resolution', 'social', 'SLO & Community', 'Grievance Mechanism', '5.3', 'Berapa persentase keluhan masyarakat yang terselesaikan dalam waktu yang disepakati (misal: <30 hari)?', 'Laporan resolusi keluhan bulanan, Survei kepuasan masyarakat.', 0.02, 240),
('soc-community-dev', 'social', 'SLO & Community', 'Community Dev', '5.4', 'Apakah program pengembangan masyarakat fokus pada kemandirian ekonomi (bukan sekadar charity/bantuan tunai)?', 'Laporan dampak sosial, Data UMKM binaan, Laporan keberlanjutan program.', 0.03, 250),
('soc-community-monitoring', 'social', 'SLO & Community', 'Community Dev', '5.5', 'Apakah masyarakat lokal dilibatkan dalam pemantauan lingkungan partisipatif?', 'Laporan hasil pemantauan bersama, Daftar anggota kelompok pemantau.', 0.02, 260),
('soc-supplier-code', 'social', 'Supply Chain & HAM', 'Supplier Mgmt', '6.1', 'Apakah semua kontraktor utama wajib menandatangani *Supplier Code of Conduct* yang mencakup HAM dan K3?', 'Daftar kontraktor, Salinan kode etik yang ditandatangani.', 0.02, 270),
('soc-supplier-audit', 'social', 'Supply Chain & HAM', 'Supplier Mgmt', '6.2', 'Apakah perusahaan melakukan audit K3 dan HAM terhadap kontraktor Tier-1 secara berkala?', 'Laporan audit kontraktor, Temuan audit dan tindak lanjut.', 0.03, 280),
('soc-human-rights', 'social', 'Supply Chain & HAM', 'Human Rights', '6.3', 'Apakah perusahaan memiliki kebijakan hak asasi manusia yang selaras dengan UNGP (*UN Guiding Principles*)?', 'Dokumen Kebijakan HAM, Laporan Due Diligence HAM.', 0.02, 290),
('soc-modern-slavery', 'social', 'Supply Chain & HAM', 'Human Rights', '6.4', 'Apakah dipastikan tidak ada pekerja anak atau kerja paksa di seluruh rantai pasok langsung?', 'Pernyataan anti-perbudakan modern, Audit sosial rantai pasok.', 0.02, 300),
('gov-anti-corruption', 'governance', 'Transparency & Anti-Corruption', 'System & Cert', '7.1', 'Apakah perusahaan memiliki sertifikat ISO 37001 (Sistem Manajemen Anti Penyuapan)?', 'Sertifikat ISO 37001', 0.03, 310),
('gov-whistleblowing', 'governance', 'Transparency & Anti-Corruption', 'System & Cert', '7.2', 'Apakah terdapat saluran pelaporan pelanggaran (*whistleblowing*) yang dikelola pihak ketiga/independen?', 'SOP Whistleblowing, Laporan statistik penggunaan saluran.', 0.03, 320),
('gov-iso37301', 'governance', 'Transparency & Anti-Corruption', 'System & Cert', '7.3', 'Apakah perusahaan memiliki sertifikat ISO 37301 (Compliance Management System)?', 'Sertifikat ISO 37301', 0.02, 330),
('gov-eiti', 'governance', 'Transparency & Anti-Corruption', 'Transparency', '7.4', 'Apakah perusahaan mempublikasikan pembayaran kepada pemerintah (pajak, royalti) secara transparan (EITI)?', 'Laporan EITI atau laporan pembayaran publik di website.', 0.03, 340),
('gov-due-diligence', 'governance', 'Transparency & Anti-Corruption', 'Transparency', '7.5', 'Apakah seluruh pihak ketiga (konsultan, vendor) menjalani proses *Due Diligence* integritas sebelum kontrak?', 'Formulir due diligence vendor, Hasil screening latar belakang.', 0.02, 350),
('gov-board-oversight', 'governance', 'Board Oversight & ESG Risk', 'Governance Structure', '8.1', 'Apakah terdapat Komite Khusus di tingkat Direksi/Komisaris yang secara eksplisit mengawasi ESG?', 'Struktur organisasi dewan, Terms of Reference (TOR) komite ESG.', 0.03, 360),
('gov-esg-meeting-frequency', 'governance', 'Board Oversight & ESG Risk', 'Governance Structure', '8.2', 'Seberapa sering Komite ESG bertemu dan membahas isu material dalam setahun?', 'Notulensi rapat komite ESG (min. 4x/tahun).', 0.02, 370),
('gov-esg-erm', 'governance', 'Board Oversight & ESG Risk', 'Risk & Remuneration', '8.3', 'Apakah risiko ESG telah diintegrasikan ke dalam Enterprise Risk Management (ERM) perusahaan?', 'Register Risiko Perusahaan (termasuk risiko ESG), Laporan mitigasi.', 0.03, 380),
('gov-remuneration', 'governance', 'Board Oversight & ESG Risk', 'Risk & Remuneration', '8.4', 'Apakah remunerasi/bonus eksekutif senior dikaitkan dengan pencapaian target KPI ESG?', 'Kebijakan Remunerasi, Kontrak kerja direksi/manajer.', 0.02, 390),
('gov-reporting', 'governance', 'Board Oversight & ESG Risk', 'Reporting', '8.5', 'Apakah perusahaan menerbitkan Laporan Keberlanjutan yang mengacu pada GRI Standards atau ISSB?', 'Sustainability Report terbaru, Indeks GRI/ISSB.', 0.02, 400)
ON CONFLICT (id) DO UPDATE SET
    pillar = EXCLUDED.pillar,
    category = EXCLUDED.category,
    sub_category = EXCLUDED.sub_category,
    question_number = EXCLUDED.question_number,
    question = EXCLUDED.question,
    evidence_required = EXCLUDED.evidence_required,
    weight = EXCLUDED.weight,
    sort_order = EXCLUDED.sort_order;

UPDATE checklist_items
SET applicability_tag = CASE id
        WHEN 'env-tailings-water' THEN 'IUP'
        WHEN 'env-tailings-monitoring' THEN 'IUP'
        WHEN 'env-tailings-erp' THEN 'IUP'
        WHEN 'env-water-balance' THEN 'IUP,IUJP-PENGOLAHAN'
        WHEN 'env-recycle-rate' THEN 'IUP,IUJP-PENGOLAHAN'
        WHEN 'env-effluent-quality' THEN 'IUP,IUJP-PENGOLAHAN'
        WHEN 'env-biodiversity-baseline' THEN 'IUP'
        WHEN 'env-biodiversity-tnfd' THEN 'IUP'
        WHEN 'env-iso14001' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'env-biodiversity-closure' THEN 'IUP'
        WHEN 'env-mine-closure-progressive' THEN 'IUP'
        WHEN 'env-ghg-inventory' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'env-ghg-target' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'env-decarbonization-energy' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'env-ebt-share' THEN 'IUP,IUJP-OPERASIONAL,IUJP-PENGOLAHAN'
        WHEN 'env-electrification' THEN 'IUP,IUJP-OPERASIONAL,IUJP-DRILLING'
        WHEN 'soc-zero-harm' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-ltifr-trifr' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-fatality' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-health-wellbeing' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-stop-work' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-fpic' THEN 'IUP'
        WHEN 'soc-grievance' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-grievance-resolution' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-community-dev' THEN 'IUP'
        WHEN 'soc-community-monitoring' THEN 'IUP'
        WHEN 'soc-supplier-code' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-supplier-audit' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-human-rights' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'soc-modern-slavery' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-anti-corruption' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-whistleblowing' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-iso37301' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-eiti' THEN 'IUP'
        WHEN 'gov-due-diligence' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-board-oversight' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-esg-meeting-frequency' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-esg-erm' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-remuneration' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        WHEN 'gov-reporting' THEN 'IUP,IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG'
        ELSE COALESCE(applicability_tag, 'IUP')
    END;

INSERT INTO checklist_items (id, pillar, category, sub_category, question_number, question, evidence_required, applicability_tag, weight, sort_order)
VALUES
    ('env-operational-b3-bbm', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.6', 'Program manajemen tumpahan B3/BBM di area kerja', 'SOP spill management, catatan insiden tumpahan', 'IUP,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN', 0.0200, 161),
    ('env-dust-emissions', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.7', 'Pemantauan dan pengendalian debu/emisi dari aktivitas hauling & alat berat', 'Data pemantauan kualitas udara, jadwal penyiraman jalan', 'IUJP-OPERASIONAL', 0.0200, 162),
    ('env-drilling-mud', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.8', 'Pengelolaan lumpur pemboran (drilling mud) & cutting sesuai baku mutu limbah B3', 'Manifest limbah B3, SOP pengelolaan mud & cutting', 'IUJP-DRILLING', 0.0200, 163),
    ('env-blast-vibration', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.9', 'Manajemen getaran (blast vibration) dan kebisingan aktivitas peledakan', 'Data monitoring vibrasi/kebisingan, izin peledakan', 'IUJP-DRILLING', 0.0200, 164),
    ('env-process-waste', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.10', 'Pengelolaan limbah proses pengolahan/pemurnian sesuai baku mutu B3', 'Manifest limbah proses, hasil uji lab', 'IUJP-PENGOLAHAN', 0.0200, 165),
    ('env-green-office', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.11', 'Praktik manajemen lingkungan kantor/basecamp (sampah, efisiensi energi, digitalisasi dokumen)', 'Kebijakan green office, data pemilahan sampah', 'IUJP-KONSULTASI,IUJP-PENUNJANG', 0.0300, 166),
    ('env-domestic-waste', 'environmental', 'Environmental', 'Jejak Operasional Jasa (IUJP)', '3.12', 'Pengelolaan limbah domestik & sanitasi camp/mess pekerja', 'SOP pengelolaan limbah domestik, hasil inspeksi sanitasi', 'IUJP-PENUNJANG', 0.0200, 167),
    ('soc-worker-welfare', 'social', 'Social', 'Rantai Pasok & HAM', '6.5', 'Standar kesejahteraan pekerja lapangan (akomodasi, gizi, jam kerja & istirahat sesuai UU Ketenagakerjaan)', 'Inspeksi camp/mess, data jam kerja & lembur', 'IUJP-PENUNJANG,IUJP-OPERASIONAL,IUJP-DRILLING', 0.0300, 205),
    ('gov-tax-compliance', 'governance', 'Governance', 'Integritas & Kepatuhan', '7.4b', 'Transparansi kepatuhan pajak & kontrak kerja dengan pemberi kerja (IUP)', 'Bukti kepatuhan pajak, laporan kinerja kontrak', 'IUJP-KONSULTASI,IUJP-OPERASIONAL,IUJP-DRILLING,IUJP-PENGOLAHAN,IUJP-PENUNJANG', 0.0300, 345)
ON CONFLICT (id) DO UPDATE SET
    pillar = EXCLUDED.pillar,
    category = EXCLUDED.category,
    sub_category = EXCLUDED.sub_category,
    question_number = EXCLUDED.question_number,
    question = EXCLUDED.question,
    evidence_required = EXCLUDED.evidence_required,
    applicability_tag = EXCLUDED.applicability_tag,
    weight = EXCLUDED.weight,
    sort_order = EXCLUDED.sort_order;
