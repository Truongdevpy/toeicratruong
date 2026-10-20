# -*- coding: utf-8 -*-
from report_src.core import (
    add_heading_1, add_heading_2, add_heading_3, add_body_p, 
    add_bullet, add_styled_table, add_table_caption, add_figure_caption
)

def add_chapter_3_part1(doc):
    add_heading_1(doc, "CHƯƠNG 3: KẾT QUẢ THỰC NGHIỆM VÀ ĐÁNH GIÁ")
    
    add_body_p(
        doc,
        "Sau khi hoàn thành các khâu phân tích yêu cầu, thiết kế kiến trúc và mô hình dữ liệu tại Chương 2, "
        "Chương 3 trình bày các kết quả thực nghiệm đạt được từ việc lập trình, tích hợp và triển khai hệ thống trong môi trường thực tế. "
        "Nội dung của chương được tổ chức thành 3 phần trọng tâm: Phần đầu tiên (3.1) giới thiệu chi tiết về hệ thống công nghệ, "
        "môi trường phần cứng và phần mềm triển khai; Phần thứ hai (3.2) mô tả các giao diện người dùng cốt lõi của ứng dụng kèm các chỉ dẫn chức năng; "
        "Phần thứ ba (3.3) trình bày ma trận kiểm thử hệ thống toàn diện với 20 kịch bản kiểm thử (Test Cases) bao phủ toàn bộ các khía cạnh: "
        "xác thực, phòng thi trực tuyến, chấm điểm ETS, khả năng chịu tải của cụm khóa Gemini Pool, thuật toán thích ứng, truyền phát âm thanh và an ninh mạng. "
        "Toàn bộ các trường hợp kiểm thử đều đạt kết quả PASS, khẳng định độ tin cậy và sự sẵn sàng đưa vào ứng dụng thực tiễn của đề tài."
    )

    add_heading_2(doc, "3.1 Nền tảng công nghệ và môi trường thực nghiệm")
    add_body_p(
        doc,
        "Hệ thống được phát triển và kiểm thử trên môi trường tiêu chuẩn với các thông số cấu hình phần cứng và công nghệ như sau:",
        bold_prefix="Môi trường triển khai và vận hành: "
    )

    add_table_caption(doc, "3.1", "Bảng thông số môi trường công nghệ triển khai hệ thống")
    headers_env = ["Thành phần", "Công nghệ / Phiên bản sử dụng", "Mục đích & Vai trò trong hệ thống"]
    data_env = [
        ["Hệ điều hành máy chủ", "Windows 11 64-bit / Linux Ubuntu 22.04 LTS", "Môi trường lưu trữ và chạy các tiến trình dịch vụ"],
        ["Ngôn ngữ Backend", "Python 3.11.9 (64-bit)", "Xử lý logic nghiệp vụ, tính toán điểm số và điều phối API"],
        ["Backend Web Framework", "FastAPI 0.115+ (chạy trên Uvicorn ASGI Server)", "Cung cấp hệ thống RESTful API bất đồng bộ hiệu năng cao"],
        ["Thư viện ORM & CSDL", "SQLAlchemy 2.0+ & SQLite 3 (kết nối mở rộng PostgreSQL)", "Quản lý cơ sở dữ liệu quan hệ tuân thủ chuẩn ACID"],
        ["Bảo mật xác thực", "Passlib (bcrypt) & PyJWT (HS256)", "Mã hóa mật khẩu muối (salted hash) và cấp phát JWT token"],
        ["Frontend Library", "React 19.2.8 & TypeScript 6.0+", "Xây dựng giao diện ứng dụng trang đơn (SPA) trực quan"],
        ["Build Tool & Bundler", "Vite 8.3.0", "Hỗ trợ Hot Module Replacement (HMR) và tối ưu hóa đóng gói mã nguồn"],
        ["Định kiểu giao diện (Styling)", "Tailwind CSS v4.3.3 & Lucide React", "Thiết kế giao diện người dùng hiện đại, chuẩn Responsive"],
        ["Trí tuệ nhân tạo (AI Engine)", "Google Gemini API (gemini-3-flash, 2.5-flash)", "Chấm thi, phân tích bẫy đề thi và đối thoại gợi mở Socratic"],
        ["Quản lý Media & Streaming", "CORSStaticFiles (Starlette StaticFiles + HTTP Range)", "Phát trực tiếp âm thanh Audio MP3 và phục vụ hình ảnh đề thi"]
    ]
    add_styled_table(doc, headers_env, data_env, col_widths=[1.6, 2.2, 2.7])

    add_heading_2(doc, "3.2 Mô tả giao diện hệ thống")
    
    # 3.2.1 Trang chủ & Auth
    add_heading_3(doc, "3.2.1 Giao diện Trang chủ và Xác thực tài khoản phân quyền RBAC")
    add_body_p(
        doc,
        "Trang chủ (HomePage.tsx) mang phong cách thiết kế hiện đại, cung cấp cái nhìn tổng quan về hệ sinh thái học tập: "
        "banner chào mừng sinh động, giới thiệu các tính năng độc quyền (Gia sư AI Socratic, Luyện chép chính tả, Thi thử ETS 2024). "
        "Hệ thống xác thực (AuthModal.tsx) tích hợp form Đăng nhập và Đăng ký với cơ chế kiểm tra tính hợp lệ của định dạng email, "
        "độ mạnh mật khẩu ngay tại client trước khi gửi yêu cầu tới máy chủ. Khi đăng nhập thành công, hệ thống tự động lưu token "
        "vào LocalStorage và điều hướng người dùng tới Dashboard cá nhân.",
        bold_prefix="Mô tả trải nghiệm người dùng: "
    )
    add_figure_caption(doc, "3.1", "Giao diện Trang chủ và Hệ sinh thái luyện thi TOEIC Ra Trường")

    # 3.2.2 Dashboard
    add_heading_3(doc, "3.2.2 Giao diện Bảng điều khiển (Dashboard) & Biểu đồ Radar kỹ năng")
    add_body_p(
        doc,
        "Dashboard (DashboardPage.tsx) là trung tâm điều phối học tập của từng học viên. Giao diện hiển thị trực quan: "
        "(a) Điểm số hiện tại đối chiếu với Điểm số mục tiêu ra trường (Target Score ProgressBar); "
        "(b) Chỉ số chuỗi ngày học liên tục (Streak Counter) với biểu tượng ngọn lửa khích lệ; "
        "(c) Thời gian hoàn thành việc học trong ngày (Daily Study Minutes); "
        "(d) Biểu đồ mạng nhện Radar phân tích năng lực chi tiết trên 7 Part của bài thi TOEIC, chỉ rõ các kỹ năng mạnh và lỗ hổng kiến thức cần bù đắp.",
        bold_prefix="Chỉ số thống kê học tập: "
    )
    add_figure_caption(doc, "3.2", "Giao diện Bảng điều khiển (Dashboard) và Biểu đồ Radar kỹ năng")

    # 3.2.3 Phòng thi
    add_heading_3(doc, "3.2.3 Giao diện Phòng thi thử Full Test mô phỏng chuẩn ETS")
    add_body_p(
        doc,
        "Phòng thi trực tuyến (MockTestsPage.tsx) tái lập chính xác cấu trúc phòng thi quốc tế: "
        "Đồng hồ đếm ngược 120 phút cố định trên thanh điều hướng; Bảng danh sách 200 câu hỏi chia thành từng Part; "
        "Mỗi câu hỏi có 4 nút lựa chọn phương án A, B, C, D rõ ràng kèm nút cắm cờ (Flag) màu cam nổi bật. "
        "Trình phát âm thanh Audio Player tích hợp thanh điều khiển tốc độ phát (0.8x, 1.0x, 1.2x) và cơ chế tua mượt mà "
        "hỗ trợ học viên tập trung tối đa trong suốt thời gian làm bài.",
        bold_prefix="Thiết kế phòng thi mô phỏng: "
    )
    add_figure_caption(doc, "3.3", "Giao diện Phòng thi thử Full Test mô phỏng chuẩn ETS")

    # 3.2.4 Bảng điểm & Bẫy thi
    add_heading_3(doc, "3.2.4 Giao diện Bảng điểm chi tiết & Phân tích bẫy đề thi (ETS Trap Analysis)")
    add_body_p(
        doc,
        "Ngay sau khi nộp bài thi, giao diện Báo cáo kết quả hiển thị tổng điểm TOEIC chính thức (thang 10-990) kèm điểm chi tiết "
        "cho hai kỹ năng Listening và Reading. Đặc biệt, khu vực 'DeepTutor Trap Analysis' làm nổi bật các câu hỏi học viên trả lời sai: "
        "giải thích rõ phương án bẫy của ETS là gì, nguyên nhân chọn sai và đóng khung 'Mẹo 5 giây Socratic' giúp ghi nhớ nguyên tắc nhận diện bẫy ngay lập tức.",
        bold_prefix="Báo cáo phân tích chuyên sâu: "
    )
    add_figure_caption(doc, "3.4", "Giao diện Bảng điểm chi tiết & Phân tích bẫy đề thi (ETS Trap Analysis)")

    # 3.2.5 Practice Hub & Dictation
    add_heading_3(doc, "3.2.5 Giao diện Trung tâm Luyện tập (Practice Hub) & Nghe chép chính tả Dictation")
    add_body_p(
        doc,
        "Trung tâm Luyện tập (PracticeHubPage.tsx, DictationPracticePage.tsx) phân loại ngân hàng câu hỏi theo từng Part chuyên biệt (Part 1 đến Part 7). "
        "Tại giao diện Luyện chép chính tả, học viên nghe các phân đoạn âm thanh ngắn và gõ trực tiếp nội dung vào khung soạn thảo. "
        "Hệ thống tự động so khớp, gạch chân đỏ các từ nghe sai hoặc bị sót, hiển thị transcript song ngữ và tính tỷ lệ chính xác tức thì.",
        bold_prefix="Không gian rèn luyện phản xạ: "
    )
    add_figure_caption(doc, "3.5", "Giao diện Trung tâm Luyện tập (Practice Hub) và Nghe chép chính tả Dictation")

    # 3.2.6 AI DeepTutor
    add_heading_3(doc, "3.2.6 Giao diện Trợ lý ảo AI DeepTutor Socratic và Bong bóng nổi")
    add_body_p(
        doc,
        "Hệ thống cung cấp hai hình thức tương tác với Trợ lý AI: (1) Trang trò chuyện chuyên sâu (AITutorPage.tsx) nơi học viên có thể "
        "thảo luận ngữ pháp, nhờ AI phân tích cấu trúc đoạn văn; (2) Bong bóng trợ lý nổi (FloatingAITutor.tsx) hiện diện ở góc dưới màn hình "
        "trên mọi trang của ứng dụng, cho phép học viên đặt câu hỏi nhanh bất kỳ lúc nào mà không cần rời khỏi màn hình làm bài.",
        bold_prefix="Hỗ trợ học tập đa điểm chạm: "
    )
    add_figure_caption(doc, "3.6", "Giao diện Trợ lý ảo AI DeepTutor Socratic và Bong bóng nổi")

    # 3.2.7 Thanh toán VIP
    add_heading_3(doc, "3.2.7 Giao diện Cổng thanh toán chuyển khoản VietQR và Nâng cấp VIP")
    add_body_p(
        doc,
        "Trang thanh toán (PaymentPage.tsx) giới thiệu các gói quyền lợi VIP (Mở khóa toàn bộ đề thi ETS mới nhất, không giới hạn lượt hỏi AI DeepTutor). "
        "Hệ thống tự động tạo mã VietQR động chứa chính xác số tiền và cú pháp chuyển khoản định danh người dùng, "
        "giúp quá trình thanh toán diễn ra tiện lợi, chuẩn xác và tức thì.",
        bold_prefix="Cổng thanh toán tự động hóa: "
    )
    add_figure_caption(doc, "3.7", "Giao diện Cổng thanh toán chuyển khoản VietQR và Nâng cấp VIP")

    # 3.2.8 Admin Portal
    add_heading_3(doc, "3.2.8 Giao diện Quản trị viên Admin (Admin Portal)")
    add_body_p(
        doc,
        "Dành riêng cho người quản trị (AdminPage.tsx), cung cấp bảng điều khiển quản lý toàn bộ hệ thống: "
        "danh sách tài khoản người dùng, phân quyền vai trò, quản lý ngân hàng đề thi, phê duyệt giao dịch nâng cấp VIP "
        "và giám sát trạng thái sức khỏe của cụm khóa Gemini Key Pool.",
        bold_prefix="Bảng điều khiển quản trị tập trung: "
    )
    add_figure_caption(doc, "3.8", "Giao diện Quản trị viên Admin quản lý học viên và bài thi")
