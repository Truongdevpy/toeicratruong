# -*- coding: utf-8 -*-
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_src.core import (
    add_heading_1, add_heading_2, add_body_p, add_bullet, 
    add_styled_table, add_table_caption
)

def add_cover_page(doc):
    # TRƯỜNG & KHOA
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(10)
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run("TRƯỜNG ĐẠI HỌC SƯ PHẠM HÀ NỘI\nKHOA CÔNG NGHỆ THÔNG TIN")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(14)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    
    # KẺ NGANG
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_line.paragraph_format.space_before = Pt(2)
    p_line.paragraph_format.space_after = Pt(36)
    r_line = p_line.add_run("━━━━━━━━━━━━━━━━━━━")
    r_line.font.name = 'Times New Roman'
    r_line.font.size = Pt(12)
    r_line.font.color.rgb = RGBColor(0x2E, 0x75, 0xB6)

    # LOẠI BÁO CÁO
    p_type = doc.add_paragraph()
    p_type.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_type.paragraph_format.space_before = Pt(20)
    p_type.paragraph_format.space_after = Pt(14)
    r_type = p_type.add_run("BÁO CÁO CHUYÊN ĐỀ TỐT NGHIỆP")
    r_type.font.name = 'Times New Roman'
    r_type.font.size = Pt(16)
    r_type.font.bold = True
    r_type.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    # TÊN ĐỀ TÀI
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(16)
    p_title.paragraph_format.space_after = Pt(10)
    p_title.paragraph_format.line_spacing = 1.3
    r_title = p_title.add_run(
        "NỀN TẢNG LUYỆN THI VÀ ĐÁNH GIÁ NĂNG LỰC TOEIC TOÀN DIỆN CHUẨN ETS "
        "TÍCH HỢP TRÍ TUỆ NHÂN TẠO SOCRATIC VÀ HỌC TẬP THÍCH ỨNG\n"
        "(TOEIC MASTER PLATFORM)"
    )
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0xC0, 0x00, 0x00) # Đỏ đô trang trọng

    p_eng = doc.add_paragraph()
    p_eng.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_eng.paragraph_format.space_before = Pt(4)
    p_eng.paragraph_format.space_after = Pt(45)
    r_eng = p_eng.add_run(
        "Building a Comprehensive ETS-Standard TOEIC Preparation & Assessment Platform "
        "Integrating Socratic AI & Adaptive Learning"
    )
    r_eng.font.name = 'Times New Roman'
    r_eng.font.size = Pt(12)
    r_eng.font.italic = True
    r_eng.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    # KHỐI THÔNG TIN SINH VIÊN VÀ GIẢNG VIÊN
    p_info = doc.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_info.paragraph_format.left_indent = Inches(1.5)
    p_info.paragraph_format.space_before = Pt(25)
    p_info.paragraph_format.space_after = Pt(45)
    p_info.paragraph_format.line_spacing = 1.35
    
    runs_info = [
        ("Chuyên ngành: ", False), ("Công nghệ thông tin\n", True),
        ("Nhóm thực hiện: ", False), ("Nhóm 1 - Nghiên cứu Ứng dụng\n", True),
        ("Sinh viên thực hiện: ", False), ("Nguyễn Bảo Hoàng (MSV: 725105078)\n", True),
        ("                      ", False), ("Nguyễn Bá Lương (MSV: 735105062)\n", True),
        ("Giảng viên hướng dẫn: ", False), ("ThS. Nguyễn Trung Khánh", True)
    ]
    for text, bold in runs_info:
        r = p_info.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(13)
        r.font.bold = bold
        r.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    # ĐỊA DANH - NĂM
    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_date.paragraph_format.space_before = Pt(30)
    p_date.paragraph_format.space_after = Pt(0)
    r_date = p_date.add_run("Hà Nội, Năm 2026")
    r_date.font.name = 'Times New Roman'
    r_date.font.size = Pt(13)
    r_date.font.bold = True
    r_date.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    doc.add_page_break()

def add_preliminaries(doc):
    # LỜI CẢM ƠN
    add_heading_1(doc, "LỜI CẢM ƠN")
    add_body_p(
        doc,
        "Lời đầu tiên, nhóm tác giả xin được bày tỏ lòng biết ơn sâu sắc và chân thành nhất tới các Thầy, Cô giáo "
        "Khoa Công nghệ Thông tin – Trường Đại học Sư phạm Hà Nội, những người đã tận tâm truyền đạt khối lượng tri thức "
        "vững chắc, kỹ năng nghiên cứu khoa học cùng nền tảng tư duy công nghệ quý báu trong suốt quá trình học tập tại giảng đường."
    )
    add_body_p(
        doc,
        "Đặc biệt, nhóm chúng em xin gửi lời tri ân sâu sắc nhất tới Thầy ThS. Nguyễn Trung Khánh. Thầy đã luôn theo sát, "
        "định hướng phương pháp tiếp cận khoa học, động viên và tận tình chỉ dẫn từng giải pháp kỹ thuật, từ khâu phân tích "
        "bài toán thực tiễn khảo thí TOEIC cho tới hoàn thiện hệ thống phần mềm và viết tài liệu báo cáo chuyên đề tốt nghiệp này."
    )
    add_body_p(
        doc,
        "Dù nhóm nghiên cứu đã nỗ lực hết mình để xây dựng nền tảng một cách hoàn thiện và chỉn chu nhất, song do giới hạn "
        "về mặt thời gian cũng như kinh nghiệm thực tế, đề tài chắc chắn khó tránh khỏi những thiếu sót nhất định. Nhóm rất "
        "mong nhận được những ý kiến đóng góp, nhận xét quý báu từ Hội đồng đánh giá chuyên môn để hệ thống ngày càng "
        "được hoàn thiện và có thể ứng dụng rộng rãi trong thực tiễn."
    )
    doc.add_page_break()

    # LỜI CAM ĐOAN
    add_heading_1(doc, "LỜI CAM ĐOAN")
    add_body_p(
        doc,
        "Nhóm sinh viên thực hiện xin cam đoan rằng công trình nghiên cứu và sản phẩm phần mềm 'Nền tảng luyện thi và đánh giá "
        "năng lực TOEIC toàn diện chuẩn ETS tích hợp Trí tuệ nhân tạo Socratic và Học tập thích ứng (TOEIC Master Platform)' "
        "là kết quả làm việc nghiêm túc, độc lập và trung thực của nhóm dưới sự hướng dẫn trực tiếp của ThS. Nguyễn Trung Khánh."
    )
    add_body_p(
        doc,
        "Các số liệu thống kê, mã nguồn chương trình, sơ đồ kiến trúc và kết quả kiểm nghiệm thực tế được trình bày trong "
        "báo cáo là hoàn toàn chính xác và trung thực. Toàn bộ tài liệu tham khảo, các công bố khoa học và thư viện mã nguồn mở "
        "kế thừa đều được trích dẫn nguồn gốc rõ ràng, minh bạch theo đúng quy chuẩn học thuật."
    )
    doc.add_page_break()

    # DANH MỤC TỪ VIẾT TẮT
    add_heading_1(doc, "DANH MỤC TỪ VIẾT TẮT")
    headers_abbr = ["Từ viết tắt", "Giải nghĩa tiếng Anh / Thuật ngữ chuyên ngành", "Ý nghĩa chi tiết trong hệ thống"]
    data_abbr = [
        ["TOEIC", "Test of English for International Communication", "Kỳ thi tiếng Anh giao tiếp quốc tế đánh giá chuẩn đầu ra"],
        ["ETS", "Educational Testing Service", "Viện Khảo thí Giáo dục Hoa Kỳ - Tổ chức ra đề chuẩn"],
        ["RESTful API", "Representational State Transfer API", "Kiến trúc giao tiếp chuẩn mực giữa Backend và Frontend"],
        ["JWT", "JSON Web Token", "Chuẩn mã hóa token định danh người dùng an toàn"],
        ["SPA", "Single Page Application", "Ứng dụng web trang đơn nạp dữ liệu mượt mà bằng React"],
        ["ORM", "Object-Relational Mapping", "Ánh xạ cơ sở dữ liệu quan hệ sang đối tượng (SQLAlchemy)"],
        ["SRS", "Spaced Repetition System", "Hệ thống lặp lại ngắt quãng tối ưu hóa ghi nhớ từ vựng"],
        ["LLM", "Large Language Model", "Mô hình ngôn ngữ lớn xử lý ngôn ngữ tự nhiên (Google Gemini)"],
        ["CEFR", "Common European Framework of Reference", "Khung tham chiếu trình độ ngôn ngữ chung Châu Âu (A1-C2)"],
        ["RBAC", "Role-Based Access Control", "Mô hình kiểm soát truy cập phân quyền dựa trên vai trò"],
        ["PWA", "Progressive Web Application", "Ứng dụng web lũy tiến có trải nghiệm như ứng dụng gốc"],
        ["CSRF", "Cross-Site Request Forgery", "Kỹ thuật tấn công giả mạo yêu cầu qua trang web"],
        ["ACID", "Atomicity, Consistency, Isolation, Durability", "Bốn thuộc tính chuẩn mực bảo đảm tính toàn vẹn CSDL"],
        ["DOM", "Document Object Model", "Mô hình đối tượng tài liệu giao diện web"],
        ["JSON", "JavaScript Object Notation", "Định dạng trao đổi dữ liệu nhẹ chuẩn giữa máy chủ và client"],
        ["CORS", "Cross-Origin Resource Sharing", "Cơ chế kiểm soát chia sẻ tài nguyên giữa các domain khác nhau"],
        ["TTS / STT", "Text-To-Speech / Speech-To-Text", "Công nghệ tổng hợp giọng nói và nhận dạng giọng nói"],
        ["HTTP Range", "HTTP Byte-Range Requests", "Giao thức truyền phát âm thanh/video cho phép tua từng giây"]
    ]
    add_styled_table(doc, headers_abbr, data_abbr, col_widths=[1.3, 2.5, 2.7])
    doc.add_page_break()

    # MỤC LỤC HÌNH VẼ
    add_heading_1(doc, "MỤC LỤC HÌNH VẼ")
    fig_items = [
        ("Hình 2.1", "Kiến trúc tổng thể hệ thống 3 tầng kết hợp Feature-Driven Modular", "11"),
        ("Hình 2.2", "Sơ đồ Use Case tổng thể hệ thống TOEIC Master Platform", "12"),
        ("Hình 2.3", "Sơ đồ luồng hoạt động tổng thể quy trình học tập thích ứng", "13"),
        ("Hình 2.4", "Sơ đồ luồng làm bài thi Mock Test và chấm điểm chuẩn ETS", "15"),
        ("Hình 2.5", "Sơ đồ kiến trúc quản lý Gemini Key Pool và Trợ lý AI Socratic", "17"),
        ("Hình 2.6", "Sơ đồ thuật toán tính trọng số thích ứng (Adaptive Learning Engine)", "19"),
        ("Hình 3.1", "Giao diện Trang chủ và Hệ sinh thái luyện thi TOEIC Ra Trường", "25"),
        ("Hình 3.2", "Giao diện Bảng điều khiển (Dashboard) và Biểu đồ Radar kỹ năng", "26"),
        ("Hình 3.3", "Giao diện Phòng thi thử Full Test mô phỏng chuẩn ETS", "27"),
        ("Hình 3.4", "Giao diện Bảng điểm chi tiết & Phân tích bẫy đề thi (ETS Trap Analysis)", "28"),
        ("Hình 3.5", "Giao diện Trung tâm Luyện tập (Practice Hub) và Nghe chép chính tả Dictation", "29"),
        ("Hình 3.6", "Giao diện Trợ lý ảo AI DeepTutor Socratic và Bong bóng nổi", "30"),
        ("Hình 3.7", "Giao diện Cổng thanh toán chuyển khoản VietQR và Nâng cấp VIP", "31"),
        ("Hình 3.8", "Giao diện Quản trị viên Admin quản lý học viên và bài thi", "32")
    ]
    for fig_id, fig_title, page in fig_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.2
        r_f = p.add_run(f"{fig_id}: {fig_title}")
        r_f.font.name = 'Times New Roman'
        r_f.font.size = Pt(12)
        # Dot leaders
        dots_len = max(2, 85 - len(fig_id) - len(fig_title))
        r_dots = p.add_run(" " + "." * dots_len + " ")
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(11)
        r_dots.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
        r_p = p.add_run(page)
        r_p.font.name = 'Times New Roman'
        r_p.font.size = Pt(12)
        r_p.font.bold = True
    doc.add_page_break()

    # MỤC LỤC BẢNG BIỂU
    add_heading_1(doc, "MỤC LỤC BẢNG BIỂU")
    tbl_items = [
        ("Bảng 1.1", "So sánh chi tiết giải pháp đề xuất với các nền tảng luyện thi hiện có", "9"),
        ("Bảng 2.1", "Bảng đặc tả Use Case Chức năng Thi thử Full Test & Chấm điểm ETS", "14"),
        ("Bảng 2.2", "Bảng đặc tả Use Case Chức năng Gia sư AI Socratic & Phân tích bẫy thi", "16"),
        ("Bảng 2.3", "Bảng đặc tả Use Case Chức năng Đánh giá đầu vào & Sinh lộ trình thích ứng", "18"),
        ("Bảng 2.4", "Đặc tả bảng users (Quản lý tài khoản và phân quyền)", "20"),
        ("Bảng 2.5", "Đặc tả bảng user_profiles (Hồ sơ học tập, CEFR, chuỗi streak)", "21"),
        ("Bảng 2.6", "Đặc tả bảng learning_paths & learning_nodes (Lộ trình học thích ứng)", "21"),
        ("Bảng 2.7", "Đặc tả bảng test_attempts & question_attempts (Lịch sử làm bài thi)", "22"),
        ("Bảng 2.8", "Đặc tả bảng user_flashcards (Từ vựng ghi nhớ SRS)", "23"),
        ("Bảng 2.9", "Đặc tả bảng ai_conversations & ai_messages (Nhật ký gia sư AI)", "23"),
        ("Bảng 2.10", "Đặc tả bảng payments & bank_transactions (Quản lý giao dịch nâng VIP)", "24"),
        ("Bảng 3.1", "Bảng thông số môi trường công nghệ triển khai hệ thống", "24"),
        ("Bảng 3.2", "Ma trận kiểm thử hệ thống toàn diện (Test Cases TC01 - TC20)", "33")
    ]
    for tbl_id, tbl_title, page in tbl_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.2
        r_t = p.add_run(f"{tbl_id}: {tbl_title}")
        r_t.font.name = 'Times New Roman'
        r_t.font.size = Pt(12)
        dots_len = max(2, 85 - len(tbl_id) - len(tbl_title))
        r_dots = p.add_run(" " + "." * dots_len + " ")
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(11)
        r_dots.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
        r_p = p.add_run(page)
        r_p.font.name = 'Times New Roman'
        r_p.font.size = Pt(12)
        r_p.font.bold = True
    doc.add_page_break()

    # MỤC LỤC TỔNG THỂ
    add_heading_1(doc, "MỤC LỤC TỔNG THỂ")
    toc_items = [
        ("LỜI CẢM ƠN", "i"),
        ("LỜI CAM ĐOAN", "ii"),
        ("DANH MỤC TỪ VIẾT TẮT", "iii"),
        ("MỤC LỤC HÌNH VẼ", "iv"),
        ("MỤC LỤC BẢNG BIỂU", "v"),
        ("CHƯƠNG 1: GIỚI THIỆU", "1"),
        ("  1.1 Tổng quan bài toán", "1"),
        ("  1.2 Tình hình nghiên cứu hiện tại", "3"),
        ("  1.3 Mục tiêu và phạm vi đề tài", "4"),
        ("  1.4 Đối tượng thụ hưởng", "5"),
        ("CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", "6"),
        ("  2.1 Kiến trúc hệ thống", "6"),
        ("    2.1.1 Kiến trúc tổng thể", "6"),
        ("    2.1.2 Sơ đồ Use Case tổng thể", "8"),
        ("    2.1.3 Sơ đồ luồng tổng thể", "9"),
        ("  2.2 Chi tiết chức năng & thuật toán cốt lõi", "10"),
        ("    2.2.1 Bộ máy thi thử Full Test và Chấm điểm chuẩn ETS", "10"),
        ("    2.2.2 Trợ lý ảo AI Socratic & Gemini Key Pool Service", "12"),
        ("    2.2.3 Động cơ Luyện tập thích ứng & Lộ trình cá nhân hóa", "14"),
        ("    2.2.4 Luyện nghe chép chính tả (Dictation) & Flashcard SRS", "16"),
        ("    2.2.5 Hệ thống thu thập và chuẩn hóa dữ liệu đề thi quy mô lớn", "17"),
        ("    2.2.6 Cơ chế An toàn thông tin và Quản lý quyền hạn", "18"),
        ("  2.3 Mô tả các bảng Cơ sở dữ liệu", "19"),
        ("CHƯƠNG 3: KẾT QUẢ THỰC NGHIỆM VÀ ĐÁNH GIÁ", "24"),
        ("  3.1 Nền tảng công nghệ và môi trường thực nghiệm", "24"),
        ("  3.2 Mô tả giao diện hệ thống", "25"),
        ("  3.3 Kiểm thử hệ thống (Ma trận Test Cases TC01 - TC20)", "32"),
        ("CHƯƠNG 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN", "36"),
        ("  4.1 Kết luận", "36"),
        ("  4.2 Hướng phát triển trong tương lai", "37"),
        ("TÀI LIỆU THAM KHẢO", "38"),
        ("PHỤ LỤC: HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH", "39")
    ]
    for item_title, page in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.2
        r_t = p.add_run(item_title)
        r_t.font.name = 'Times New Roman'
        r_t.font.size = Pt(12)
        if item_title.startswith("CHƯƠNG") or item_title in ["LỜI CẢM ƠN", "LỜI CAM ĐOAN", "TÀI LIỆU THAM KHẢO"]:
            r_t.font.bold = True
            r_t.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        dots_len = max(2, 85 - len(item_title))
        r_dots = p.add_run(" " + "." * dots_len + " ")
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(11)
        r_dots.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
        r_p = p.add_run(page)
        r_p.font.name = 'Times New Roman'
        r_p.font.size = Pt(12)
        r_p.font.bold = True
    doc.add_page_break()
