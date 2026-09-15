import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout(doc, text, title="CATATAN PENTING", bg_hex="F0F9FF", border_hex="0284C7"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border only
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_title = p.add_run(f"📌 {title}: ")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10)
    run_title.font.color.rgb = RGBColor(2, 132, 199)
    
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(15, 23, 42)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_row(row, heights, font_size=9.5, is_header=False):
    for cell in row.cells:
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(font_size)
                if is_header:
                    r.bold = True
                    r.font.color.rgb = RGBColor(255, 255, 255)

def build_word_document():
    doc = Document()
    
    # Page Setup (A4, 1 inch margins)
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Header and Footer
        footer = section.footer
        p_ft = footer.paragraphs[0]
        p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_ft = p_ft.add_run("© 2026 BUMKAM Hen Wani — Kampung Enggros • Kelompok 5 Kelas C • S1 Akuntansi FEB Uncen")
        r_ft.font.name = "Calibri"
        r_ft.font.size = Pt(8.5)
        r_ft.font.color.rgb = RGBColor(100, 116, 139)

    # -------------------------------------------------------------
    # HALAMAN COVER / JUDUL
    # -------------------------------------------------------------
    p_cov_logo = doc.add_paragraph()
    p_cov_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov_logo.paragraph_format.space_before = Pt(10)
    p_cov_logo.paragraph_format.space_after = Pt(15)
    
    logo_path = r"D:\8 PROJECT\2026\tda_kelompok5\public\logo.png"
    if os.path.exists(logo_path):
        p_cov_logo.add_run().add_picture(logo_path, width=Inches(1.8))
        
    p_cov_sub1 = doc.add_paragraph()
    p_cov_sub1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov_sub1.paragraph_format.space_after = Pt(4)
    r_c1 = p_cov_sub1.add_run("BUMKAM HEN WANI — KAMPUNG ENGGROS")
    r_c1.bold = True
    r_c1.font.name = "Calibri"
    r_c1.font.size = Pt(13)
    r_c1.font.color.rgb = RGBColor(2, 132, 199)

    p_cov_title = doc.add_paragraph()
    p_cov_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov_title.paragraph_format.space_after = Pt(8)
    r_title = p_cov_title.add_run("BUMKAM FINANCE")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(28)
    r_title.font.color.rgb = RGBColor(11, 37, 69)

    p_cov_desc = doc.add_paragraph()
    p_cov_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov_desc.paragraph_format.space_after = Pt(15)
    r_desc = p_cov_desc.add_run("SISTEM INFORMASI KEUANGAN TERPADU USAHA PULSA & AIR GALON\nBERBASIS PRINSIP ONE TRANSACTION — ONE INPUT")
    r_desc.bold = True
    r_desc.font.name = "Calibri"
    r_desc.font.size = Pt(12)
    r_desc.font.color.rgb = RGBColor(51, 65, 85)

    # Hero image on cover
    hero_path = r"D:\8 PROJECT\2026\tda_kelompok5\public\login-hero.jpg"
    if os.path.exists(hero_path):
        p_hero = doc.add_paragraph()
        p_hero.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_hero.paragraph_format.space_after = Pt(20)
        p_hero.add_run().add_picture(hero_path, width=Inches(5.5))

    # Academic Box on Cover
    p_box = doc.add_paragraph()
    p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_box.paragraph_format.space_after = Pt(4)
    r_b = p_box.add_run("DOKUMEN DESKRIPSI SISTEM & BUKU PANDUAN PENGGUNA (USER MANUAL)")
    r_b.bold = True
    r_b.font.name = "Calibri"
    r_b.font.size = Pt(11)
    r_b.font.color.rgb = RGBColor(15, 23, 42)

    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_after = Pt(0)
    r_inst = p_inst.add_run(
        "Disusun Oleh:\n"
        "KELOMPOK 5 — KELAS C\n"
        "Mata Kuliah: Teknologi Digital Akuntansi\n"
        "Program Studi S1 Akuntansi • Fakultas Ekonomi dan Bisnis\n"
        "UNIVERSITAS CENDERAWASIH (UNCEN)\n"
        "Jayapura, Papua — 2026"
    )
    r_inst.font.name = "Calibri"
    r_inst.font.size = Pt(10)
    r_inst.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_page_break()

    # -------------------------------------------------------------
    # DAFTAR ISI RINGKAS
    # -------------------------------------------------------------
    p_toc_title = doc.add_heading(level=1)
    r_tt = p_toc_title.add_run("DAFTAR ISI DOKUMEN")
    r_tt.bold = True
    r_tt.font.color.rgb = RGBColor(11, 37, 69)

    toc_items = [
        ("BAGIAN I: DESKRIPSI LENGKAP SISTEM BUMKAM FINANCE", [
            "1. Latar Belakang & Identitas BUMKAM Hen Wani Kampung Enggros",
            "2. Permasalahan Utama yang Diselesaikan",
            "3. Prinsip Inti Perancangan: One Transaction — One Input",
            "4. Karakteristik & Perbedaan Dua Unit Usaha (Pulsa vs Galon)",
            "5. Bagan Akun Standar (Chart of Accounts - COA)",
            "6. Arsitektur Jurnal Umum & Keseimbangan Double-Entry (Debit = Kredit)",
            "7. Keamanan Sistem, Pembatalan Transaksi (VOID), & Audit Trail",
            "8. Rekapitulasi Hasil Verifikasi Pengujian (TEST 01 s/d TEST 12: 100% Lulus)",
            "9. Arsitektur Multi-Platform: Cloud Web (Vercel) & Android 100% Offline (APK)"
        ]),
        ("BAGIAN II: BUKU PANDUAN PENGGUNAAN (USER MANUAL)", [
            "Bab 1: Akses Sistem & Hak Akses Pengguna (Admin vs Operator)",
            "Bab 2: Panduan Navigasi Dashboard & Monitoring 4 KPI Real-Time",
            "Bab 3: Panduan Transaksi Unit Pulsa (Jual Pulsa & Top-Up Saldo)",
            "Bab 4: Panduan Transaksi Unit Air Galon (Jual Tunai, Kredit, & Mutasi Wadah)",
            "Bab 5: Panduan Pelanggan & Pembayaran Piutang (Cicilan & Pelunasan)",
            "Bab 6: Panduan Buku Kas & Beban Operasional Depot",
            "Bab 7: Panduan Akuntansi: Jurnal Umum, Buku Besar, & Neraca Saldo",
            "Bab 8: Panduan Pembatalan Transaksi (VOID) Khusus Administrator",
            "Bab 9: Panduan Cetak Laporan Keuangan Ber-Kop Resmi & Tanda Tangan",
            "Bab 10: Panduan Pemasangan & Pemakaian Aplikasi Android Offline di Kampung Enggros",
            "Bab 11: Tanya Jawab (FAQ) & Panduan Penyelesaian Masalah (Troubleshooting)"
        ])
    ]

    for section_title, sub_items in toc_items:
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(8)
        p_sec.paragraph_format.space_after = Pt(2)
        r_sec = p_sec.add_run(section_title)
        r_sec.bold = True
        r_sec.font.name = "Calibri"
        r_sec.font.size = Pt(11)
        r_sec.font.color.rgb = RGBColor(2, 132, 199)
        
        for item in sub_items:
            p_sub = doc.add_paragraph()
            p_sub.paragraph_format.left_indent = Inches(0.3)
            p_sub.paragraph_format.space_before = Pt(1)
            p_sub.paragraph_format.space_after = Pt(1)
            r_sub = p_sub.add_run(f"• {item}")
            r_sub.font.name = "Calibri"
            r_sub.font.size = Pt(9.5)
            r_sub.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAGIAN I: DESKRIPSI SISTEM
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("BAGIAN I: DESKRIPSI LENGKAP SISTEM BUMKAM FINANCE")
    r.bold = True
    r.font.color.rgb = RGBColor(11, 37, 69)

    # 1. Latar Belakang
    h2 = doc.add_heading(level=2)
    r = h2.add_run("1. Latar Belakang & Profil BUMKAM Hen Wani Kampung Enggros")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "BUMKAM (Badan Usaha Milik Kampung) Hen Wani merupakan lembaga ekonomi kampung yang didirikan di Kampung Enggros, Distrik Abepura, Kota Jayapura, Provinsi Papua. Kampung Enggros yang berada di kawasan perairan Teluk Youtefa memiliki dinamika ekonomi masyarakat yang unik, di mana kebutuhan masyarakat sehari-hari sangat bertumpu pada dua komoditas pokok:\n"
        "1. Kebutuhan air minum bersih higienis yang disuplai melalui Depot Air Galon BUMKAM.\n"
        "2. Kebutuhan komunikasi dan konektivitas digital yang dilayani melalui Penjualan Pulsa dan Paket Data Internet Telematika.\n\n"
        "Meskipun kedua unit usaha ini memiliki perputaran transaksi harian yang sangat tinggi, pengelolaan administratif dan keuangannya selama ini masih dilakukan secara konvensional (pencatatan buku kas manual atau nota kertas lepas). Akibatnya, pengurus sering mengalami kesulitan dalam mengontrol saldo deposit pulsa, mengetahui keberadaan fisik galon yang dipinjam warga, memantau piutang macet, serta menyusun laporan pertanggungjawaban hasil usaha untuk Musyawarah Kampung (Muskam)."
    )

    add_callout(doc, "Sistem ini dirancang khusus oleh Kelompok 5 Kelas C (Teknologi Digital Akuntansi, S1 Akuntansi FEB Universitas Cenderawasih) untuk menjembatani kesenjangan teknis pengelola kampung. Aplikasi menyajikan antarmuka berbahasa Indonesia yang sangat ramah orang awam, namun memiliki engine akuntansi berstandar double-entry yang sangat presisi di baliknya.", "TUJUAN UTAMA PENGEMBANGAN")

    # 2. Permasalahan Utama
    h2 = doc.add_heading(level=2)
    r = h2.add_run("2. Permasalahan Utama yang Berhasil Diselesaikan")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    issues_data = [
        ("Kondisi Sebelum Sistem", "Solusi Terintegrasi BUMKAM Finance"),
        ("Pencatatan manual di buku kas kertas rentan hilang, rusak, atau tersiram air laut/depot.", "Pencatatan digital multi-platform (Web Cloud & APK Android) dengan auto-backup database."),
        ("Saldo deposit pulsa sering minus/habis mendadak tanpa diketahui penyebabnya.", "Sistem mengunci otomatis: penjualan ditolak jika harga modal melebihi deposit aktif."),
        ("Banyak tabung galon hilang di pelanggan karena tidak tercatat siapa yang memegang.", "Pencatatan ketat 4 status wadah: Tersedia di Depot, Di Pelanggan, Kembali, dan Rusak."),
        ("Piutang warga menumpuk dan sering terjadi perdebatan jumlah utang saat penagihan.", "Buku pembantu piutang per pelanggan (CUST-XXXX) dengan riwayat cicilan transparan."),
        ("Pembayaran piutang sering dicatat sebagai omset penjualan baru (laba semu ganda).", "Integritas akuntansi terkunci: Pelunasan piutang HANYA menambah kas dan memotong utang."),
        ("Laporan laba rugi terlambat dan sulit memisahkan hasil usaha pulsa vs air galon.", "Dashboard & Laporan Laba Rugi terupdate real-time, terpisah jelas per unit usaha."),
        ("Ketiadaan internet stabil di perkampungan pesisir menghambat sistem berbasis web.", "Offline Engine 100% lokal pada APK Android: dapat beroperasi penuh tanpa sinyal internet.")
    ]

    t_issues = doc.add_table(rows=len(issues_data), cols=2)
    t_issues.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (col1, col2) in enumerate(issues_data):
        row = t_issues.rows[i]
        row.cells[0].paragraphs[0].text = col1
        row.cells[1].paragraphs[0].text = col2
        if i == 0:
            set_cell_background(row.cells[0], "0F172A")
            set_cell_background(row.cells[1], "0F172A")
            format_row(row, None, font_size=10, is_header=True)
        else:
            set_cell_background(row.cells[0], "F8FAFC" if i % 2 == 1 else "FFFFFF")
            set_cell_background(row.cells[1], "F0F9FF" if i % 2 == 1 else "FFFFFF")
            format_row(row, None, font_size=9)
            row.cells[0].paragraphs[0].runs[0].bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 3. Prinsip One Transaction One Input
    h2 = doc.add_heading(level=2)
    r = h2.add_run("3. Prinsip Inti Perancangan: ONE TRANSACTION — ONE INPUT")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Prinsip fundamental dari aplikasi ini adalah membebaskan operator dari pekerjaan akuntansi yang rumit melalui konsep 'Satu Transaksi — Sekali Input'. Operator hanya bertugas mencatat transaksi fisik kasir sehari-hari, dan sistem secara atomik mengeksekusi seluruh rantai dampak keuangan dalam satu waktu bersamaan (Single Atomic Database Transaction):"
    )

    doc.add_paragraph(
        "1. Pengurangan Stok / Saldo: Persediaan fisik tabung galon terpotong ATAU saldo deposit pulsa berkurang sebesar harga pokok modal (HPP).\n"
        "2. Mutasi Keuangan: Kas Tunai bertambah (jika dibayar cash) ATAU Piutang Usaha Pelanggan bertambah (jika tempo/kredit).\n"
        "3. Jurnal Akuntansi Double-Entry: Terbentuk otomatis sepasang entri debit dan kredit dengan nilai yang seimbang mutlak (Debit = Kredit).\n"
        "4. Agregasi Dashboard: 4 kartu indikator kinerja (Saldo Kas, Penjualan Hari Ini, Piutang Belum Lunas, Laba Bersih) berubah seketika tanpa perlu refresh halaman.\n"
        "5. Laporan Finansial: Buku Kas, Laba Rugi per unit, Arus Kas, dan Neraca langsung mutakhir dan siap dicetak."
    )

    # 4. Karakteristik Pulsa vs Galon
    h2 = doc.add_heading(level=2)
    r = h2.add_run("4. Karakteristik & Perbedaan Alur Dua Unit Usaha")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Sistem dirancang dengan memahami perbedaan fundamental sifat ekonomi komoditas pulsa vs air galon:"
    )

    diff_data = [
        ("Parameter Pembeda", "Unit Penjualan Pulsa", "Unit Penjualan Air Galon"),
        ("Sifat Komoditas", "Komoditas digital murni tanpa wujud fisik tabung.", "Barang fisik dengan wadah tabung berulang pakai."),
        ("Struktur Modal", "Deposit modal saldo rupiah ke distributor/server pulsa.", "Air baku depot & inventaris aset fisik tabung galon."),
        ("Penentuan Keuntungan", "Margin = Harga Jual − Harga Modal (Dihitung otomatis).", "Margin kotor = Harga Jual Galon − Beban Pokok Air."),
        ("Validasi Kritis", "Anti-Saldo Minus: Transaksi ditolak jika modal > saldo.", "Anti-Stok Minus: Transaksi ditolak jika qty > stok."),
        ("Pengawasan Khusus", "Monitoring nomor HP, provider, serial number/ref no.", "Monitoring 4 status wadah: Tersedia, Pinjam, Balik, Rusak."),
        ("Penjualan Kredit", "Mencatat piutang pulsa tanpa menambah uang tunai.", "Mencatat piutang galon; KAS TERBUKTI TIDAK BERTAMBAH.")
    ]

    t_diff = doc.add_table(rows=len(diff_data), cols=3)
    t_diff.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (c1, c2, c3) in enumerate(diff_data):
        row = t_diff.rows[i]
        row.cells[0].paragraphs[0].text = c1
        row.cells[1].paragraphs[0].text = c2
        row.cells[2].paragraphs[0].text = c3
        if i == 0:
            set_cell_background(row.cells[0], "0F172A")
            set_cell_background(row.cells[1], "0369A1")
            set_cell_background(row.cells[2], "0284C7")
            format_row(row, None, font_size=9.5, is_header=True)
        else:
            set_cell_background(row.cells[0], "F8FAFC" if i % 2 == 1 else "FFFFFF")
            set_cell_background(row.cells[1], "F0F9FF" if i % 2 == 1 else "FFFFFF")
            set_cell_background(row.cells[2], "F0FDF4" if i % 2 == 1 else "FFFFFF")
            format_row(row, None, font_size=8.5)
            row.cells[0].paragraphs[0].runs[0].bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 5. COA
    h2 = doc.add_heading(level=2)
    r = h2.add_run("5. Bagan Akun Standar (Standard Chart of Accounts - COA)")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Aplikasi menerapkan kodefikasi akun akuntansi terstandarisasi untuk menjamin laporan keuangan BUMKAM Hen Wani memenuhi kaidah pelaporan keuangan umum di Indonesia:"
    )

    coa_data = [
        ("Kode Akun", "Nama Akun Rekening", "Klasifikasi Akun", "Saldo Normal"),
        ("1101", "Kas Tunai di Tangan", "Aset Lancar", "Debit"),
        ("1102", "Piutang Usaha Unit Pulsa", "Aset Lancar", "Debit"),
        ("1103", "Piutang Usaha Unit Air Galon", "Aset Lancar", "Debit"),
        ("1104", "Persediaan Saldo Modal Pulsa", "Aset Lancar", "Debit"),
        ("1105", "Persediaan Air Galon Jadi", "Aset Lancar", "Debit"),
        ("1201", "Aset Tetap Wadah Galon & Mesin Depot", "Aset Tetap", "Debit"),
        ("2101", "Utang Usaha / Operasional", "Liabilitas Lancar", "Kredit"),
        ("3101", "Modal Awal BUMKAM Hen Wani", "Ekuitas", "Kredit"),
        ("3201", "Laba Ditahan / Cadangan Kampung", "Ekuitas", "Kredit"),
        ("4101", "Pendapatan Penjualan Pulsa", "Pendapatan Usaha", "Kredit"),
        ("4102", "Pendapatan Penjualan Air Galon", "Pendapatan Usaha", "Kredit"),
        ("5101", "Harga Pokok Penjualan (HPP) Pulsa", "Beban Pokok", "Debit"),
        ("5102", "Beban Pokok Produksi Air Galon", "Beban Pokok", "Debit"),
        ("6101", "Beban Listrik, Air & Telepon", "Beban Operasional", "Debit"),
        ("6102", "Beban Transportasi & Distribusi", "Beban Operasional", "Debit"),
        ("6103", "Beban Pemeliharaan Depot & Filter", "Beban Operasional", "Debit"),
        ("6104", "Beban Operasional Lain-lain", "Beban Operasional", "Debit")
    ]

    t_coa = doc.add_table(rows=len(coa_data), cols=4)
    t_coa.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (c1, c2, c3, c4) in enumerate(coa_data):
        row = t_coa.rows[i]
        row.cells[0].paragraphs[0].text = c1
        row.cells[1].paragraphs[0].text = c2
        row.cells[2].paragraphs[0].text = c3
        row.cells[3].paragraphs[0].text = c4
        if i == 0:
            set_cell_background(row.cells[0], "0F172A")
            set_cell_background(row.cells[1], "0F172A")
            set_cell_background(row.cells[2], "0F172A")
            set_cell_background(row.cells[3], "0F172A")
            format_row(row, None, font_size=9, is_header=True)
        else:
            set_cell_background(row.cells[0], "F1F5F9" if i % 2 == 1 else "FFFFFF")
            set_cell_background(row.cells[1], "FFFFFF")
            set_cell_background(row.cells[2], "FFFFFF")
            set_cell_background(row.cells[3], "F8FAFC")
            format_row(row, None, font_size=8.5)
            row.cells[0].paragraphs[0].runs[0].bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 6. Hasil Uji TEST 01 - 12
    h2 = doc.add_heading(level=2)
    r = h2.add_run("6. Rekapitulasi Pembuktian Pengujian Sistem (TEST 01 s/d TEST 12)")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Keandalan dan kepatuhan sistem telah diuji secara menyeluruh melalui automated test runner (`scripts/run_all_tests.js`) serta panel pengujian interaktif in-browser di menu Verifikasi. Hasil pengujian menunjukkan tingkat kelulusan 100%:"
    )

    test_results = [
        ("Kode Uji", "Skenario Pengujian", "Hasil Verifikasi & Bukti Integritas", "Status"),
        ("TEST 01", "Masalah BUMKAM yang Diselesaikan", "Digitalisasi pulsa & galon terstruktur; profil lembaga & hak akses aktif.", "LULUS (100%)"),
        ("TEST 02", "Perbedaan Alur Pulsa vs Galon", "Pulsa berbasis saldo rupiah modal; Galon berbasis fisik wadah tabung.", "LULUS (100%)"),
        ("TEST 03", "Penjualan Galon Tunai (1 Input)", "Stok -5, Kas +Rp30.000, Jurnal Debit=Kredit Rp30.000, Laporan update.", "LULUS (100%)"),
        ("TEST 04", "Penjualan Galon Kredit / Tempo", "Stok -3, Piutang +Rp18.000, KAS TERBUKTI TIDAK BERTAMBAH (Rp 0).", "LULUS (100%)"),
        ("TEST 05", "Pembayaran Sebagian Piutang", "Cicil Rp10.000: Kas +Rp10.000, Piutang sisa Rp8.000, TIDAK ADA OMSET BARU.", "LULUS (100%)"),
        ("TEST 06", "Margin Pulsa Otomatis", "Modal Rp48.500, Jual Rp52.000 -> Margin Rp3.500 terkunci otomatis.", "LULUS (100%)"),
        ("TEST 07", "Saldo Pulsa & Anti Saldo Negatif", "Top up nambah saldo; transaksi pulsa melebihi deposit DITOLAK SISTEM.", "LULUS (100%)"),
        ("TEST 08", "4 Status Inventaris Wadah Galon", "Pemisahan ketat: Galon Tersedia, Di Pelanggan, Kembali, & Rusak/Hilang.", "LULUS (100%)"),
        ("TEST 09", "Sumber Angka Dashboard Riil", "Saldo Kas, Penjualan, Piutang & Laba 100% dari agregasi database transaksi.", "LULUS (100%)"),
        ("TEST 10", "Pembatalan Transaksi (VOID)", "Khusus Admin: Stok balik, kas dikoreksi, jurnal pembalik otomatis terbentuk.", "LULUS (100%)"),
        ("TEST 11", "Pendapatan != Kas Masuk != Laba", "Terbukti: Penjualan tunai, piutang, dan pelunasan dihitung sesuai posnya.", "LULUS (100%)"),
        ("TEST 12", "Penelusuran Penuh (Traceability)", "Laba Rugi -> Buku Besar -> Jurnal Umum -> Transaksi Asal dapat dilacak.", "LULUS (100%)")
    ]

    t_tests = doc.add_table(rows=len(test_results), cols=4)
    t_tests.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (c1, c2, c3, c4) in enumerate(test_results):
        row = t_tests.rows[i]
        row.cells[0].paragraphs[0].text = c1
        row.cells[1].paragraphs[0].text = c2
        row.cells[2].paragraphs[0].text = c3
        row.cells[3].paragraphs[0].text = c4
        if i == 0:
            set_cell_background(row.cells[0], "0F172A")
            set_cell_background(row.cells[1], "0F172A")
            set_cell_background(row.cells[2], "0F172A")
            set_cell_background(row.cells[3], "0F172A")
            format_row(row, None, font_size=9, is_header=True)
        else:
            set_cell_background(row.cells[0], "F8FAFC" if i % 2 == 1 else "FFFFFF")
            set_cell_background(row.cells[1], "FFFFFF")
            set_cell_background(row.cells[2], "FFFFFF")
            set_cell_background(row.cells[3], "ECFDF5")
            format_row(row, None, font_size=8.5)
            row.cells[0].paragraphs[0].runs[0].bold = True
            row.cells[3].paragraphs[0].runs[0].bold = True
            row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor(16, 185, 129)

    doc.add_page_break()

    # -------------------------------------------------------------
    # BAGIAN II: PANDUAN PENGGUNA (USER MANUAL)
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("BAGIAN II: BUKU PANDUAN PENGGUNA (USER MANUAL)")
    r.bold = True
    r.font.color.rgb = RGBColor(11, 37, 69)

    # Bab 1: Akses Sistem & Login
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 1: Akses Sistem & Hak Akses Pengguna")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Aplikasi BUMKAM Finance dapat diakses melalui dua cara:\n"
        "1. Melalui Browser Komputer / HP: Buka alamat web lokal http://localhost:3000 atau domain Vercel yang telah disediakan.\n"
        "2. Melalui Aplikasi Android Offline (APK): Buka aplikasi 'BUMKAM Finance' yang telah terinstal di handphone Android."
    )

    doc.add_paragraph(
        "Pada halaman login, pengguna akan melihat ilustrasi visual Usaha Air Galon dan Pulsa Telko Digital. Terdapat dua pilihan akun bawaan untuk pengoperasian sistem:"
    )

    doc.add_paragraph(
        "• Akun Administrator:\n"
        "  - Username: admin\n"
        "  - Password: admin123\n"
        "  - Wewenang: Memiliki hak akses penuh untuk membatalkan transaksi (VOID), menambah pengguna kasir baru, mengubah identitas BUMKAM di menu Pengaturan, dan melihat Audit Trail aktivitas.\n\n"
        "• Akun Operator / Bendahara Kampung:\n"
        "  - Username: operator\n"
        "  - Password: operator123\n"
        "  - Wewenang: Fokus pada operasional harian: mencatat penjualan pulsa, penjualan air galon, mutasi tabung, menerima pembayaran cicilan piutang, mencatat kas keluar operasional, dan melihat laporan."
    )

    # Bab 2: Dashboard
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 2: Panduan Navigasi Dashboard & Monitoring Real-Time")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Setelah berhasil masuk, pengguna akan diarahkan ke layar Dashboard Utama. Dashboard menyajikan ringkasan kinerja keuangan BUMKAM Hen Wani tanpa angka rekayasa/dummy:\n"
        "1. Kartu Saldo Kas Tunai: Menunjukkan total uang fisik yang wajib ada di laci kasir saat ini (Arus Kas Masuk dikurangi Arus Kas Keluar).\n"
        "2. Kartu Penjualan Hari Ini: Akumulasi omset kotor penjualan pulsa dan galon yang telah terbit pada hari ini.\n"
        "3. Kartu Piutang Belum Lunas: Total tagihan uang BUMKAM yang masih berada di tangan warga/pelanggan.\n"
        "4. Kartu Hasil Usaha Bersih Bulan Ini: Laba bersih riil bulan berjalan (Laba Kotor dikurangi Beban Operasional Depot).\n"
        "5. Ringkasan Stok Pulsa & Galon: Menampilkan sisa deposit modal pulsa aktif dan jumlah galon terisi siap jual di depot.\n"
        "6. Tabel 10 Transaksi Terakhir: Memperlihatkan nomor transaksi, tanggal, unit usaha, nama pelanggan, nominal, dan status pembayaran."
    )

    # Bab 3: Unit Pulsa
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 3: Panduan Transaksi Unit Penjualan Pulsa")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "A. Langkah-Langkah Mencatat Penjualan Pulsa (One Input):\n"
        "1. Klik menu 'Unit Pulsa' pada bilah navigasi (sidebar/bottom nav).\n"
        "2. Masukkan Nomor HP Pelanggan (misal: 081234567890).\n"
        "3. Pilih Operator Provider (Telkomsel, Indosat, XL/Axis, Smartfren, Tri).\n"
        "4. Pilih Nominal / Jenis Paket (contoh: Pulsa 50.000 atau Data 10GB).\n"
        "5. Masukkan Harga Pokok Modal (HPP / modal beli dari server distributor, misal: Rp 48.500).\n"
        "6. Masukkan Harga Jual ke Konsumen (misal: Rp 52.000).\n"
        "7. Sistem secara otomatis menghitung dan mengunci Margin Keuntungan: Rp 3.500 (tanpa perlu kalkulator).\n"
        "8. Pilih Metode Pembayaran:\n"
        "   - Tunai (Cash): Kas bertambah seketika.\n"
        "   - Tempo / Piutang (Kredit): Wajib memilih Nama Pelanggan dari daftar.\n"
        "9. Klik tombol 'Simpan & Posting Transaksi'. Transaksi langsung tercatat dan memotong deposit pulsa."
    )

    add_callout(doc, "Jika harga modal transaksi melebihi sisa deposit pulsa yang dimiliki BUMKAM, sistem akan menolak transaksi dan menampilkan pesan error merah: 'Saldo pulsa tidak mencukupi'. Pengelola harus melakukan Top-Up terlebih dahulu.", "PROTEKSI ANTI SALDO MINUS")

    doc.add_paragraph(
        "B. Langkah-Langkah Tambah Saldo (Top-Up Deposit Modal Pulsa):\n"
        "1. Pada halaman Unit Pulsa, klik tab/tombol 'Tambah Saldo Deposit Pulsa'.\n"
        "2. Masukkan Nominal Tambahan Saldo (misal: Rp 1.000.000).\n"
        "3. Masukkan Uang Kas yang Dikeluarkan untuk membeli saldo tersebut (misal: Rp 990.000).\n"
        "4. Masukkan Catatan / Ref No Transfer Bank atau bukti pembelian.\n"
        "5. Klik 'Simpan Saldo'. Kas tunai akan berkurang, saldo deposit pulsa bertambah, dan jurnal terbentuk otomatis."
    )

    # Bab 4: Unit Air Galon
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 4: Panduan Transaksi Unit Usaha Air Galon")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "A. Langkah-Langkah Mencatat Penjualan Air Galon:\n"
        "1. Klik menu 'Unit Air Galon'.\n"
        "2. Masukkan Jumlah Galon yang dibeli (misal: 5 galon).\n"
        "3. Masukkan Harga per Galon (default standar depot: Rp 6.000).\n"
        "4. Total tagihan otomatis dihitung sistem: 5 x Rp 6.000 = Rp 30.000.\n"
        "5. Pilih Alur Wadah Tabung:\n"
        "   - Tukar Tabung (Pelanggan bawa galon kosong, tukar isi: stok tersedia berkurang, stok kosong bertambah).\n"
        "   - Beli Air + Pinjam Wadah BUMKAM (Tabung BUMKAM dibawa warga: stok di pelanggan bertambah).\n"
        "   - Beli Tabung Baru Milik Sendiri (Konsumen membeli wadah baru).\n"
        "6. Pilih Metode Pembayaran:\n"
        "   - Tunai (Cash): Kas kasir bertambah Rp 30.000.\n"
        "   - Tempo / Piutang (Kredit): Wajib pilih pelanggan. Piutang bertambah Rp 30.000, KAS TETAP Rp 0.\n"
        "7. Klik tombol 'Proses Penjualan Galon'."
    )

    doc.add_paragraph(
        "B. Langkah-Langkah Mencatat Mutasi Pengembalian Galon Kosong:\n"
        "Jika warga mengembalikan galon pinjaman tanpa membeli air:\n"
        "1. Pada halaman Unit Air Galon, pilih menu 'Catat Mutasi Tabung'.\n"
        "2. Pilih Jenis Mutasi: 'Pengembalian Galon dari Pelanggan'.\n"
        "3. Pilih Nama Pelanggan dan masukkan Jumlah Tabung yang diserahkan kembali.\n"
        "4. Klik 'Simpan Mutasi'. Saldo tabung di kartu pelanggan akan berkurang dan stok galon di depot bertambah."
    )

    # Bab 5: Pelanggan & Piutang
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 5: Panduan Pengelolaan Pelanggan & Pembayaran Piutang")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "A. Mendaftarkan Pelanggan Baru:\n"
        "1. Buka menu 'Pelanggan'.\n"
        "2. Klik tombol '+ Tambah Pelanggan'.\n"
        "3. Masukkan Nama Lengkap (misal: Bapak Silas Itaar), Nomor HP, dan Alamat RT di Kampung Enggros.\n"
        "4. Sistem secara otomatis memberikan nomor kode unik pelanggan (contoh: CUST-0004)."
    )

    doc.add_paragraph(
        "B. Menerima Pembayaran Piutang (Cicilan / Lunas):\n"
        "1. Buka menu 'Piutang Pelanggan'.\n"
        "2. Pengguna akan melihat kartu daftar piutang warga lengkap dengan status badge: BELUM LUNAS, SEBAGIAN, atau LUNAS.\n"
        "3. Cari nama pelanggan atau nomor transaksi yang ingin dicicil/dilunasi.\n"
        "4. Klik tombol 'Bayar / Cicil'.\n"
        "5. Masukkan Nominal Uang yang diserahkan warga (bisa bayar lunas atau cicilan sebagian).\n"
        "6. Klik 'Proses Pembayaran'.\n\n"
        "Dampak Akuntansi: Kas tunai kasir bertambah dan saldo sisa piutang warga berkurang. Transaksi pelunasan ini BUKAN PENJUALAN BARU, sehingga omset penjualan dan laba kotor BUMKAM tidak terlipat ganda."
    )

    # Bab 6: Kas Operasional
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 6: Panduan Pengelolaan Buku Kas & Beban Operasional")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Menu 'Buku Kas' memperlihatkan buku kas umum real-time BUMKAM Hen Wani. Kas masuk terisi otomatis dari penjualan tunai pulsa, penjualan tunai galon, dan pelunasan piutang.\n\n"
        "Untuk mencatat pengeluaran uang kas untuk kebutuhan operasional depot:\n"
        "1. Buka menu 'Buku Kas', klik '+ Catat Pengeluaran Operasional'.\n"
        "2. Pilih Kategori Beban (Listrik PLN Depot, Pulsa Internet Admin, Bensin Transportasi Galon, Pembelian Filter Air, atau Beban Lainnya).\n"
        "3. Masukkan Jumlah Uang Kas yang dikeluarkan.\n"
        "4. Masukkan Keterangan Lengkap pengeluaran (misal: 'Beli 2 buah cartridge spun filter sedimen depot').\n"
        "5. Klik 'Simpan Pengeluaran'. Saldo kas riil di dashboard langsung berkurang dan tercatat di Laporan Laba Rugi."
    )

    # Bab 7: Akuntansi
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 7: Panduan Menu Akuntansi (Jurnal, Buku Besar, Neraca Saldo)")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Menu 'Akuntansi' disediakan bagi bendahara atau pengawas audit untuk memeriksa kebenaran pencatatan pembukuan:\n"
        "• Tab Bagan Akun (COA): Menampilkan daftar seluruh kode rekening akun beserta saldo normalnya.\n"
        "• Tab Jurnal Umum: Menampilkan setiap baris jurnal debit dan kredit hasil posting otomatis transaksi kasir. Dilengkapi badge 'SEIMBANG' (Total Debit = Total Kredit).\n"
        "• Tab Buku Besar (General Ledger): Memungkinkan bendahara memilih satu akun tertentu (misal: Akun 1101 Kas Tunai atau 4102 Pendapatan Galon) untuk melihat mutasi historisnya.\n"
        "• Tab Neraca Saldo (Trial Balance): Memastikan saldo akhir seluruh akun aktiva, pasiva, modal, pendapatan, dan biaya dalam kondisi berimbang."
    )

    # Bab 8: Pembatalan Transaksi VOID
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 8: Prosedur Pembatalan Transaksi (VOID) Khusus Administrator")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Jika kasir melakukan kesalahan input (misal salah nominal atau salah nomor HP) transaksi yang sudah diposting TIDAK BOLEH dihapus secara manual demi integritas data. Sistem menyediakan fitur Pembatalan Transaksi (VOID) resmi:\n"
        "1. Masuk ke sistem menggunakan akun Administrator (admin).\n"
        "2. Buka menu 'Audit Log & Pembatalan'.\n"
        "3. Cari nomor transaksi yang ingin dibatalkan (misal: TRX-GLN-001234).\n"
        "4. Klik tombol merah 'Batalkan (VOID)'.\n"
        "5. Masukkan Alasan Pembatalan secara tertulis (wajib diisi sebagai syarat audit).\n"
        "6. Konfirmasi pembatalan.\n\n"
        "Sistem secara otomatis akan:\n"
        "• Mengubah status transaksi menjadi 'void'.\n"
        "• Mengembalikan kuantitas stok galon atau saldo pulsa ke posisi semula.\n"
        "• Mengurangi kas masuk atau menghapus piutang yang bersangkutan.\n"
        "• Membuat Jurnal Pembalik (Reversal Journal Entry) otomatis di Jurnal Umum.\n"
        "• Mencatat log pembatalan ke Audit Trail (siapa yang membatalkan, jam berapa, dan alasannya)."
    )

    # Bab 9: Cetak Laporan
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 9: Panduan Pembuatan & Cetak Laporan Resmi Muskam")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Menu 'Laporan' dirancang untuk menghasilkan dokumen laporan pertanggungjawaban resmi yang siap diserahkan kepada Kepala Kampung dan warga dalam Musyawarah Kampung (Muskam):\n"
        "1. Buka menu 'Laporan'.\n"
        "2. Pilih Periode Laporan: Hari Ini, Bulan Ini, Tahun Ini, atau Kustom Tanggal.\n"
        "3. Pilih Jenis Laporan:\n"
        "   - Rekapitulasi Penjualan (Omset & Kuantitas Pulsa dan Galon).\n"
        "   - Laporan Posisi Piutang Pelanggan.\n"
        "   - Laporan Buku Kas (Rincian Kas Masuk & Kas Keluar).\n"
        "   - Laporan Hasil Usaha / Laba Rugi (Pendapatan dikurangi HPP & Beban Operasional).\n"
        "   - Laporan Posisi Keuangan / Neraca (Aset = Kewajiban + Modal).\n"
        "   - Laporan Arus Kas (Cash Flow).\n"
        "4. Tampilan laporan otomatis dilengkapi Kop Surat Resmi Lembaga:\n"
        "   'BADAN USAHA MILIK KAMPUNG (BUMKAM) HEN WANI — KAMPUNG ENGGROS, DISTRIK ABEPURA, KOTA JAYAPURA'.\n"
        "5. Di bagian bawah laporan tersedia kolom tanda tangan Direktur BUMKAM (Silas Itaar) dan Bendahara (Maria Haay).\n"
        "6. Klik tombol 'Cetak / Simpan PDF' untuk mencetak langsung ke printer atau menyimpannya sebagai file PDF."
    )

    # Bab 10: Mode Offline APK
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 10: Panduan Aplikasi Android Offline (.apk) di Kampung Enggros")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph(
        "Aplikasi BUMKAM Finance versi Android APK (`BUMKAM-Finance-v1.0.0.apk`) dibangun dengan teknologi Capacitor Native dan Embedded Offline Storage Engine sehingga dapat digunakan 100% tanpa jaringan internet di perkampungan pesisir:\n\n"
        "1. Pemasangan Pertama Kali:\n"
        "   - Unduh file APK dari rilis GitHub: https://github.com/ekobot2025-cyber/bumkam-finance/releases/download/v1.0.0/BUMKAM-Finance-v1.0.0.apk\n"
        "   - Buka file di HP Android, pilih 'Install'. Jika muncul Play Protect, pilih 'Tetap Instal'.\n"
        "   - Ikon logo resmi BUMKAM Finance akan muncul di menu aplikasi HP.\n\n"
        "2. Pengoperasian Tanpa Internet:\n"
        "   - Matikan WiFi dan Data Seluler pada HP.\n"
        "   - Buka aplikasi BUMKAM Finance. Aplikasi akan langsung terbuka seketika dengan status badge hijau 'OFFLINE READY'.\n"
        "   - Operator dapat langsung melayani pembeli pulsa, mencatat galon, dan mencatat kas seperti biasa.\n"
        "   - Seluruh data transaksi, mutasi stok, piutang, dan jurnal tersimpan aman di memori lokal handphone pengelola."
    )

    # Bab 11: FAQ & Troubleshooting
    h2 = doc.add_heading(level=2)
    r = h2.add_run("Bab 11: Tanya Jawab (FAQ) & Penyelesaian Masalah")
    r.bold = True
    r.font.color.rgb = RGBColor(2, 132, 199)

    faq_items = [
        ("Q: Mengapa saldo kas di dashboard tidak bertambah saat penjualan galon kredit?",
         "A: Karena penjualan kredit adalah piutang (uang belum diterima kasir). Sesuai standar akuntansi, kas HANYA bertambah saat warga datang membayar cicilan atau melunasi utangnya."),
        
        ("Q: Bagaimana jika kasir salah menginput nominal pulsa atau galon?",
         "A: Masuk sebagai Admin, buka menu 'Audit Log & Pembatalan', cari transaksi yang salah lalu klik 'Batalkan (VOID)'. Sistem akan mengembalikan stok/saldo dan membuat jurnal koreksi otomatis."),
         
        ("Q: Apakah data di handphone hilang jika aplikasi ditutup atau HP dimatikan?",
         "A: Tidak. Database offline tersimpan permanen di penyimpanan lokal HP (Local Storage/SQLite Engine). Data tetap ada saat HP dinyalakan kembali."),
         
        ("Q: Apakah aplikasi Android membutuhkan pulsa kuota internet untuk mencetak laporan?",
         "A: Tidak. Semua perhitungan laporan laba rugi, buku kas, dan neraca diproses secara lokal di dalam HP tanpa perlu koneksi ke server luar.")
    ]

    for q, a in faq_items:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(2)
        r_q = p_q.add_run(q)
        r_q.bold = True
        r_q.font.name = "Calibri"
        r_q.font.size = Pt(10)
        r_q.font.color.rgb = RGBColor(11, 37, 69)

        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_before = Pt(0)
        p_a.paragraph_format.space_after = Pt(4)
        r_a = p_a.add_run(a)
        r_a.font.name = "Calibri"
        r_a.font.size = Pt(9.5)
        r_a.font.color.rgb = RGBColor(51, 65, 85)

    # Closing Signature on Document
    p_close = doc.add_paragraph()
    p_close.paragraph_format.space_before = Pt(20)
    p_close.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_cl = p_close.add_run(
        "Jayapura, 15 September 2026\n"
        "Tim Pengembang Sistem BUMKAM Finance\n"
        "Kelompok 5 Kelas C — S1 Akuntansi FEB Universitas Cenderawasih"
    )
    r_cl.font.name = "Calibri"
    r_cl.font.size = Pt(9.5)
    r_cl.font.color.rgb = RGBColor(71, 85, 105)

    # Save document
    out_path = r"D:\8 PROJECT\2026\tda_kelompok5\BUMKAM_Finance_Deskripsi_dan_Panduan_Penggunaan.docx"
    doc.save(out_path)
    print(f"Document saved successfully at: {out_path}")

if __name__ == "__main__":
    build_word_document()
