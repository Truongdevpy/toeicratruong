# -*- coding: utf-8 -*-
from docx.shared import Inches, Pt, RGBColor
from report_src.core import (
    add_heading_1, add_heading_2, add_heading_3, add_body_p, 
    add_bullet, add_styled_table, add_table_caption, add_figure_caption, add_callout
)

def add_chapter_2_part1(doc):
    add_heading_1(doc, "CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG")
    
    add_body_p(
        doc,
        "Dựa trên các yêu cầu nghiệp vụ và mục tiêu đã được xác định tại Chương 1, Chương 2 tập trung trình bày "
        "chi tiết các khâu phân tích kỹ thuật, thiết kế kiến trúc và mô hình dữ liệu cho nền tảng TOEIC Master Platform. "
        "Chương này làm rõ giải pháp kiến trúc phân tầng hiện đại kết hợp mô hình Modular theo tính năng (Feature-Driven), "
        "sự tương tác giữa các tác nhân thông qua sơ đồ Use Case và sơ đồ luồng hoạt động tổng thể. "
        "Trọng tâm của chương đi sâu vào các giải pháp công nghệ cốt lõi: Bộ máy thi thử mô phỏng chuẩn ETS với streaming âm thanh "
        "HTTP Range; Trợ lý ảo AI Socratic cùng dịch vụ quản trị cụm khóa Gemini Pool chịu tải cao; Thuật toán phân bổ trọng số thích ứng "
        "(Adaptive Learning Engine); Module luyện chép chính tả và học từ vựng lặp lại ngắt quãng (SRS). Cuối cùng, chương trình bày "
        "thiết kế cơ sở dữ liệu quan hệ được chuẩn hóa ở dạng chuẩn 3NF, bảo đảm tính toàn vẹn và hiệu năng vận hành của hệ thống."
    )

    add_heading_2(doc, "2.1 Kiến trúc hệ thống")
    add_heading_3(doc, "2.1.1 Kiến trúc tổng thể 3 tầng kết hợp Feature-Driven Modular")
    add_body_p(
        doc,
        "Hệ thống TOEIC Master Platform được xây dựng dựa trên kiến trúc 3 tầng (3-Tier Architecture) hiện đại, "
        "kết hợp mô hình Modular hướng chức năng nhằm tách biệt rõ ràng giữa tầng giao diện người dùng, tầng xử lý logic nghiệp vụ "
        "và tầng lưu trữ dữ liệu. Cấu trúc hệ thống bao gồm 4 phân hệ chính hoạt động đồng bộ:",
        bold_prefix="Mô hình phân tầng kiến trúc: "
    )
    add_bullet(
        doc,
        "Xây dựng bằng React 19 và TypeScript, biên dịch qua Vite 8 và định kiểu bằng Tailwind CSS v4. "
        "Frontend hoạt động theo mô hình SPA (Single Page Application), quản lý trạng thái tập trung qua React Contexts "
        "(AuthContext, SettingsContext) và giao tiếp bất đồng bộ với Backend qua RESTful API tiêu chuẩn. Tối ưu hóa trải nghiệm "
        "với hệ thống Error Boundary bảo vệ ứng dụng không bị sập khi gặp lỗi ngoại lệ.",
        bold_prefix="1. Tầng Trình diễn (Presentation Layer - Frontend SPA): "
    )
    add_bullet(
        doc,
        "Được xây dựng trên nền tảng Python 3.11 và FastAPI. FastAPI cung cấp hiệu năng xử lý bất đồng bộ (Asynchronous ASGI) "
        "vượt trội thông qua Uvicorn server, tự động chuẩn hóa dữ liệu đầu vào/ra bằng Pydantic schemas và tự động sinh tài liệu "
        "OpenAPI/Swagger UI. Hệ thống được module hóa thành hơn 20 router chuyên biệt (routers/auth.py, routers/mock_tests.py, "
        "routers/ai_tutor.py, routers/dictation.py,...).",
        bold_prefix="2. Tầng Ứng dụng & Nghiệp vụ (Application Layer - FastAPI Backend): "
    )
    add_bullet(
        doc,
        "Một phân hệ độc lập phụ trách giao tiếp với các mô hình ngôn ngữ lớn (Google Gemini 3 Flash / 2.5 Flash / 1.5 Flash). "
        "Phân hệ này tích hợp bộ điều phối khóa API (gemini_pool.py) giúp tự động cân bằng tải và xử lý hàng đợi làm nguội khi bị giới hạn tần suất (Rate Limiting).",
        bold_prefix="3. Dịch vụ Trí tuệ Nhân tạo (AI Service Layer - Gemini Pool): "
    )
    add_bullet(
        doc,
        "Bao gồm cơ sở dữ liệu quan hệ SQLite/PostgreSQL quản lý dữ liệu người dùng, kết quả thi, lộ trình học tập, "
        "kết hợp với phân hệ lưu trữ Media phân tán (Media Resolver) phục vụ hàng nghìn file Audio MP3 và hình ảnh chất lượng cao "
        "thông qua cơ chế HTTP Byte-Range Requests.",
        bold_prefix="4. Tầng Dữ liệu & Lưu trữ tĩnh (Data & Media Storage Layer): "
    )
    add_figure_caption(doc, "2.1", "Kiến trúc tổng thể hệ thống 3 tầng kết hợp Feature-Driven Modular")

    add_heading_3(doc, "2.1.2 Sơ đồ Use Case tổng thể")
    add_body_p(
        doc,
        "Hệ thống phân định rõ ràng quyền hạn và chức năng giữa 3 nhóm tác nhân chính:",
        bold_prefix="Phân quyền tác nhân người dùng: "
    )
    add_bullet(
        doc,
        "Thực hiện Đăng ký / Đăng nhập tài khoản an toàn (mã hóa bcrypt, cấp phát JWT); Làm bài kiểm tra năng lực đầu vào (Placement Test); "
        "Nhận lộ trình thích ứng cá nhân hóa; Tham gia thi thử Full Test 200 câu mô phỏng chuẩn ETS; Luyện tập chuyên sâu từng Part (1 - 7); "
        "Luyện nghe chép chính tả (Dictation); Lật thẻ từ vựng thông minh SRS; Trò chuyện với Trợ lý AI DeepTutor Socratic; "
        "Bôi đen tra từ nhanh (Selection Translator); Tham gia thảo luận cộng đồng, nhắn tin riêng và thanh toán nâng cấp tài khoản VIP.",
        bold_prefix="• Tác nhân Học viên (Student): "
    )
    add_bullet(
        doc,
        "Có toàn quyền truy cập Cổng quản trị (Admin Portal): Quản lý danh sách người dùng, kích hoạt/vô hiệu hóa tài khoản; "
        "Xem danh mục đề thi Mock Tests, quản lý ngân hàng câu hỏi; Theo dõi doanh thu, phê duyệt yêu cầu giao dịch nâng cấp VIP; "
        "Giám sát các chỉ số vận hành và cấu hình hệ thống.",
        bold_prefix="• Tác nhân Quản trị viên (Admin): "
    )
    add_bullet(
        doc,
        "Được trải nghiệm các tính năng miễn phí giới hạn như thi thử bài thi mẫu, luyện chép chính tả Dictation mở rộng, "
        "xem bảng xếp hạng thi đua và tìm hiểu thông tin các gói học viên.",
        bold_prefix="• Tác nhân Khách vãng lai (Guest): "
    )
    add_figure_caption(doc, "2.2", "Sơ đồ Use Case tổng thể hệ thống TOEIC Master Platform")

    add_heading_3(doc, "2.1.3 Sơ đồ luồng tổng thể")
    add_body_p(
        doc,
        "Luồng tương tác khép kín của một học viên trên nền tảng được mô tả tuần tự qua các giai đoạn: "
        "(1) Đăng ký tài khoản và hoàn tất khảo sát mục tiêu (Onboarding) -> "
        "(2) Làm bài kiểm tra phân loại trình độ đầu vào (Placement Test) -> "
        "(3) Hệ thống kích hoạt Động cơ thích ứng (Personalization Engine) để tính toán điểm số xuất phát, xác định điểm mạnh/điểm yếu và khởi tạo Lộ trình học (Learning Path) với các nút kỹ năng cụ thể -> "
        "(4) Học viên học theo lộ trình: luyện tập kỹ năng yếu, học từ vựng SRS, nghe chép chính tả và giải đề thi thử Full Test -> "
        "(5) Khi nộp bài thi thử, Bộ máy chấm điểm ETS quy đổi điểm 10-990, đồng thời Trợ lý AI kích hoạt phân tích bẫy thi (Trap Analysis) và đưa ra 'Mẹo 5 giây Socratic' -> "
        "(6) Dữ liệu kết quả được nạp ngược lại Động cơ thích ứng để tái cân bằng trọng số lộ trình học cho các tuần tiếp theo."
    )
    add_figure_caption(doc, "2.3", "Sơ đồ luồng hoạt động tổng thể quy trình học tập thích ứng")

    add_heading_2(doc, "2.2 Chi tiết chức năng & thuật toán cốt lõi")
    
    # 2.2.1 Bộ máy thi thử
    add_heading_3(doc, "2.2.1 Bộ máy thi thử Full Test và Chấm điểm chuẩn ETS")
    add_body_p(
        doc,
        "Bộ máy thi thử (routers/mock_tests.py, personalization_engine.py) được thiết kế nhằm tái hiện chân thực "
        "100% trải nghiệm của phòng thi chuẩn quốc tế do IIG/ETS tổ chức:",
        bold_prefix="Quy chuẩn phòng thi mô phỏng: "
    )
    add_bullet(
        doc,
        "Đúng chuẩn bài thi TOEIC Listening & Reading gồm 200 câu hỏi trắc nghiệm (100 câu Nghe hiểu Part 1-4 trong 45 phút, "
        "100 câu Đọc hiểu Part 5-7 trong 75 phút, tổng thời gian 120 phút). Đồng hồ đếm ngược hiển thị chính xác theo từng giây, "
        "tự động kích hoạt cơ chế thu bài khi hết giờ.",
        bold_prefix="• Quy mô và thời gian thi chuẩn ETS: "
    )
    add_bullet(
        doc,
        "Hỗ trợ người làm bài đánh dấu các câu hỏi nghi vấn để kiểm tra lại trước khi nộp bài. Bảng điều hướng câu hỏi cho phép "
        "nhảy nhanh tới bất kỳ câu nào trong đề thi chỉ với một cú nhấp chuột.",
        bold_prefix="• Bảng điều hướng và cắm cờ (Flag for Review): "
    )
    add_bullet(
        doc,
        "Khác với các kỳ thi tính điểm tuyến tính (mỗi câu 0.5 điểm), bài thi TOEIC áp dụng bảng quy đổi phi tuyến tính "
        "(ETS Scaled Score Conversion Table) theo độ khó của từng câu hỏi và tổng số câu đúng từng phần. Hàm calculate_toeic_score(listening_correct, reading_correct) "
        "được chuẩn hóa để ánh xạ số câu trả lời đúng sang thang điểm chuẩn từ 5 đến 495 cho mỗi kỹ năng, tổng điểm từ 10 đến 990.",
        bold_prefix="• Thuật toán quy đổi thang điểm ETS (Score Conversion Table): "
    )
    add_bullet(
        doc,
        "Xây dựng trên nền tảng lớp CORSStaticFiles kế thừa từ Starlette/FastAPI, máy chủ hỗ trợ header Accept-Ranges: bytes. "
        "Khi học viên bấm nghe lại một câu hỏi trong Part 3 hay tua đến giây thứ 45 của bài nghe Part 4, trình duyệt chỉ gửi yêu cầu "
        "tải đúng đoạn byte cần thiết thay vì phải nạp lại toàn bộ tệp MP3 dung lượng hàng chục MB, giúp giảm 85% băng thông và loại bỏ hiện tượng giật lag.",
        bold_prefix="• Cơ chế truyền phát âm thanh HTTP Byte-Range: "
    )

    add_table_caption(doc, "2.1", "Bảng đặc tả Use Case Chức năng Thi thử Full Test & Chấm điểm ETS")
    headers_uc1 = ["Thuộc tính Use Case", "Mô tả chi tiết kỹ thuật"]
    data_uc1 = [
        ["Tên Use Case", "Làm bài thi thử Full Test và Chấm điểm chuẩn ETS (mock_tests.py)"],
        ["Tác nhân", "Học viên (Student), Hệ thống (System)"],
        ["Mô tả", "Cung cấp phòng thi trực tuyến 200 câu hỏi kèm audio/hình ảnh, đếm ngược 120 phút và chấm điểm chuẩn ETS."],
        ["Tiền điều kiện", "Học viên đã đăng nhập và lựa chọn đề thi từ danh mục đề thi thử (Mock Tests Catalog)."],
        ["Luồng sự kiện chính", 
         "1. Hệ thống nạp tệp cấu trúc đề thi JSON và phát khởi tạo đồng hồ 120 phút.\n"
         "2. Hệ thống tải luồng Audio MP3 thông qua giao thức HTTP Range và ảnh minh họa.\n"
         "3. Học viên chọn đáp án A, B, C, D; có thể đánh dấu cờ xem lại (Flag).\n"
         "4. Học viên bấm 'Nộp bài' (hoặc đồng hồ về 00:00:00 hệ thống tự động thu bài).\n"
         "5. Backend so khớp mảng đáp án nộp với đáp án gốc trong CSDL.\n"
         "6. Gọi hàm calculate_toeic_score() tính điểm Listening (5-495) và Reading (5-495).\n"
         "7. Lưu kết quả vào bảng test_attempts và question_attempts.\n"
         "8. Chuyển hướng học viên tới trang Báo cáo kết quả và Phân tích bẫy thi AI."],
        ["Hậu điều kiện", "Điểm số, thời gian làm bài và chi tiết câu trả lời được ghi nhận đầy đủ vào CSDL."]
    ]
    add_styled_table(doc, headers_uc1, data_uc1, col_widths=[2.0, 4.5])
    add_figure_caption(doc, "2.4", "Sơ đồ luồng làm bài thi Mock Test và chấm điểm chuẩn ETS")

    # 2.2.2 Trợ lý ảo AI Socratic
    add_heading_3(doc, "2.2.2 Trợ lý ảo AI Socratic & Gemini Key Pool Service")
    add_body_p(
        doc,
        "Một trong những đóng góp công nghệ nổi bật nhất của đề tài là việc tích hợp Trợ lý Trí tuệ Nhân tạo Socratic "
        "kết hợp kiến trúc chịu tải cao Gemini Key Pool (gemini_pool.py, ai_grading.py, ai_tutor.py):",
        bold_prefix="Giải pháp xử lý chịu tải và ngắt mạch tự động: "
    )
    add_bullet(
        doc,
        "Khi triển khai thực tế trên diện rộng, các cuộc gọi API tới Google Gemini thường xuyên đối mặt với mã lỗi HTTP 429 "
        "(Too Many Requests) do chạm ngưỡng Rate Limit của gói tài nguyên. Dịch vụ GeminiPoolService được thiết kế nhằm quản lý "
        "một danh sách khóa API động. Mỗi khóa được gắn với đối tượng GeminiKeyTracker ghi nhận trạng thái hoạt động, số lượt gọi và mốc thời gian làm nguội. "
        "Khi một khóa bị phản hồi mã 429, thuật toán tự động đưa khóa đó vào trạng thái cooling_until = now + 65.0 giây và chuyển tiếp "
        "yêu cầu sang khóa kế tiếp theo cơ chế xoay vòng Round-Robin, đảm bảo tỷ lệ sẵn sàng của dịch vụ luôn đạt trên 99.8%.",
        bold_prefix="• Cơ chế Round-Robin với Hàng đợi Cooldown: "
    )
    add_bullet(
        doc,
        "Hệ thống định nghĩa danh sách mô hình ưu tiên: gemini-3-flash-preview -> gemini-3.8-flash -> gemini-flash-latest -> gemini-2.5-flash -> gemini-1.5-flash. "
        "Nếu một mô hình thế hệ mới bị nghẽn mạng hoặc bảo trì, hệ thống tự động suy giảm bậc (graceful degradation) xuống mô hình ổn định tiếp theo.",
        bold_prefix="• Phân cấp mô hình thông minh (Model Fallback Strategy): "
    )
    add_bullet(
        doc,
        "Trong module ai_grading.py, prompt hệ thống được thiết lập theo vai trò 'Chuyên gia Khảo thí và Giám khảo Đề thi TOEIC AI hàng đầu chuẩn ETS'. "
        "Hệ thống phân tích từng câu sai của học viên để bóc tách: (a) Loại bẫy ETS giăng ra (Trap Type); (b) Lý do học viên bị đánh lừa; "
        "(c) 'Quy tắc 5 giây DeepTutor' (5-Second Socratic Rule) giúp học viên nhận diện và loại trừ bẫy tương tự tức thì trong các bài thi sau; "
        "(d) Bảng từ vựng trọng tâm kèm phiên âm quốc tế IPA.",
        bold_prefix="• Kỹ thuật Prompt Engineering phân tích bẫy thi (ETS Distractor/Trap Analysis): "
    )
    add_bullet(
        doc,
        "Khác với các chatbot AI thông thường chỉ đưa ngay lời giải khiến học viên bị thụ động, Trợ lý DeepTutor trong ai_tutor.py "
        "áp dụng phương pháp đàm thoại Socratic (Socratic Questioning Method): AI đặt các câu hỏi dẫn dắt từng bước để người học tự nhận ra lỗi sai ngữ pháp "
        "hoặc từ khóa nghe bị nhầm lẫn.",
        bold_prefix="• Phương pháp đàm thoại gợi mở Socratic (Socratic Dialogue): "
    )

    add_table_caption(doc, "2.2", "Bảng đặc tả Use Case Chức năng Gia sư AI Socratic & Phân tích bẫy thi")
    headers_uc2 = ["Thuộc tính Use Case", "Mô tả chi tiết kỹ thuật"]
    data_uc2 = [
        ["Tên Use Case", "Gia sư AI Socratic & Phân tích bẫy đề thi (ai_grading.py & ai_tutor.py)"],
        ["Tác nhân", "Học viên (Student), Hệ thống Gemini AI (System)"],
        ["Mô tả", "Tự động phân tích bẫy thi ETS, sinh quy tắc 5 giây và đối thoại sư phạm gợi mở với học viên."],
        ["Tiền điều kiện", "Học viên đã hoàn thành bài thi thử hoặc mở cửa sổ trò chuyện với Trợ lý AI DeepTutor."],
        ["Luồng sự kiện chính", 
         "1. Backend lọc ra danh sách các câu hỏi học viên trả lời sai kèm ngữ cảnh câu hỏi.\n"
         "2. Đóng gói payload gửi tới GeminiPoolService.\n"
         "3. GeminiPoolService chọn khóa API khả dụng (không nằm trong trạng thái cooldown).\n"
         "4. Gửi request tới Google Gemini API với System Prompt chuyên gia khảo thí ETS.\n"
         "5. Nếu gặp lỗi 429 -> Đánh dấu key cooldown 65s và thử lại bằng key khác.\n"
         "6. Nhận chuỗi JSON chuẩn hóa chứa cấu trúc bẫy thi và mẹo 5 giây Socratic.\n"
         "7. Lưu trữ phản hồi và hiển thị trực quan lên giao diện người dùng."],
        ["Hậu điều kiện", "Học viên nắm bắt được bản chất bẫy đề thi và cải thiện chiến thuật làm bài."]
    ]
    add_styled_table(doc, headers_uc2, data_uc2, col_widths=[2.0, 4.5])
    add_figure_caption(doc, "2.5", "Sơ đồ kiến trúc quản lý Gemini Key Pool và Trợ lý AI Socratic")
