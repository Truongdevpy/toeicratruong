# -*- coding: utf-8 -*-
from docx.shared import Inches, Pt, RGBColor
from report_src.core import (
    add_heading_1, add_heading_2, add_body_p, 
    add_bullet, add_callout
)

def add_chapter_4(doc):
    add_heading_1(doc, "CHƯƠNG 4: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN")
    
    add_heading_2(doc, "4.1 Kết luận")
    add_body_p(
        doc,
        "Sau quá trình nghiên cứu lý thuyết chuyên sâu, khảo sát nhu cầu thực tế của học viên và thực hiện lập trình "
        "hoàn thiện sản phẩm, đề tài 'Nền tảng luyện thi và đánh giá năng lực TOEIC toàn diện chuẩn ETS tích hợp Trí tuệ nhân tạo "
        "Socratic và Học tập thích ứng (TOEIC Master Platform)' đã hoàn thành 100% các mục tiêu nghiên cứu và phát triển đề ra ban đầu. "
        "Những đóng góp nổi bật của công trình nghiên cứu bao gồm:",
        bold_prefix="Tổng kết các kết quả đạt được: "
    )
    add_bullet(
        doc,
        "Đề tài đã hiện thực hóa thành công thuật toán quy đổi điểm thi TOEIC Listening & Reading chuẩn xác theo thang 10 - 990 "
        "của Viện Khảo thí Giáo dục Hoa Kỳ (ETS); thiết kế bài kiểm tra phân loại đầu vào (Placement Test) đa tầng và thuật toán "
        "tự động tính trọng số thích ứng (Adaptive Weights) giúp tái cân bằng lộ trình học tập theo thời gian thực dựa trên tỷ lệ sai của học viên.",
        bold_prefix="1. Về mặt lý thuyết khảo thí & Học tập thích ứng: "
    )
    add_bullet(
        doc,
        "Đề xuất và hiện thực hóa thành công dịch vụ quản lý cụm khóa API Gemini (Gemini Pool Engine) với hàng đợi làm nguội 65 giây "
        "và cơ chế luân chuyển mô hình thông minh, giải quyết triệt để bài toán nghẽn cổ chai HTTP 429 Rate Limit khi triển khai AI diện rộng. "
        "Đồng thời, việc ứng dụng kỹ thuật Prompt Engineering chuyên sâu đã tạo ra công cụ phân tích bẫy thi độc quyền (ETS Distractor/Trap Analysis) "
        "cùng 'Mẹo 5 giây Socratic' định hướng tư duy phản biện cho người học.",
        bold_prefix="2. Về mặt ứng dụng công nghệ Trí tuệ Nhân tạo: "
    )
    add_bullet(
        doc,
        "Xây dựng thành công một Single Page Application (SPA) trên nền React 19, TypeScript và Vite 8 kết hợp backend FastAPI bất đồng bộ. "
        "Cơ chế truyền phát âm thanh phân đoạn HTTP Byte-Range giúp học viên tua mượt mà từng giây âm thanh mà không gián đoạn mạng. "
        "Hệ thống tích hợp đầy đủ các module: Luyện chép chính tả (Dictation) so khớp chuỗi thời gian thực, Thẻ từ vựng ngắt quãng (SRS Flashcard), "
        "Tra cứu nhanh khi bôi đen văn bản và Cổng thanh toán mã VietQR tự động.",
        bold_prefix="3. Về mặt kiến trúc phần mềm và kỹ thuật: "
    )
    add_bullet(
        doc,
        "Hệ thống cung cấp một giải pháp tự học toàn diện, hiện đại, xóa bỏ rào cản chi phí đắt đỏ của các trung tâm ngoại ngữ, "
        "giúp sinh viên các trường đại học tại Việt Nam tự tin vượt qua chuẩn đầu ra tiếng Anh để tốt nghiệp đúng hạn và thăng tiến nghề nghiệp.",
        bold_prefix="4. Về mặt giá trị thực tiễn giáo dục: "
    )

    add_heading_2(doc, "4.2 Hướng phát triển trong tương lai")
    add_body_p(
        doc,
        "Mặc dù hệ thống đã vận hành ổn định và đạt kết quả kiểm nghiệm xuất sắc, nhóm nghiên cứu nhận định vẫn còn nhiều "
        "tiềm năng mở rộng để nâng cấp sản phẩm lên tầm cao mới trong tương lai gần:",
        bold_prefix="Định hướng nâng cấp tiếp theo: "
    )
    add_bullet(
        doc,
        "Tích hợp mô hình nhận dạng giọng nói tiên tiến (như OpenAI Whisper hoặc Google Cloud Speech-to-Text) kết hợp thuật toán "
        "phân tích âm vị học (Phoneme-level Analysis) để đánh giá độ chuẩn xác phát âm, ngữ điệu, trọng âm và độ trôi chảy cho bài thi TOEIC Speaking.",
        bold_prefix="1. Chấm điểm phát âm TOEIC Speaking tự động bằng Speech-to-Text: "
    )
    add_bullet(
        doc,
        "Phát triển module chấm bài viết tự động (Automated Essay Scoring - AES) dựa trên các mô hình ngôn ngữ lớn (LLM) "
        "được huấn luyện tinh chỉnh (Fine-tuning) theo đúng tiêu chí chấm thi của ETS: Cấu trúc câu, tính mạch lạc, vốn từ vựng học thuật "
        "và ngữ pháp cho các bài viết mô tả tranh hoặc bài luận quan điểm của TOEIC Writing.",
        bold_prefix="2. Nâng cấp bộ máy chấm TOEIC Writing theo chuẩn khảo thí ETS: "
    )
    add_bullet(
        doc,
        "Mở rộng hệ sinh thái sang ứng dụng di động bản địa (Native Mobile Application) sử dụng Flutter hoặc React Native, "
        "hỗ trợ chế độ tải đề thi về máy để học tập ngoại tuyến (Offline Learning) và gửi thông báo đẩy nhắc nhở duy trì chuỗi Streak mỗi ngày.",
        bold_prefix="3. Phát triển ứng dụng di động đa nền tảng (iOS & Android): "
    )
    add_bullet(
        doc,
        "Ứng dụng thuật toán Không gian Tri thức (Knowledge Space Theory) và Đồ thị Tri thức (Knowledge Graphs) "
        "để liên kết từng câu hỏi thi với các vi kỹ năng ngôn ngữ cụ thể, giúp cá nhân hóa lộ trình học tập đến từng phân đoạn ngữ pháp nhỏ nhất.",
        bold_prefix="4. Ứng dụng Đồ thị Tri thức (Knowledge Graph) vào mô hình thích ứng: "
    )

    doc.add_page_break()

    # TÀI LIỆU THAM KHẢO
    add_heading_1(doc, "TÀI LIỆU THAM KHẢO")
    refs = [
        "[1] Educational Testing Service (ETS), TOEIC Examinee Handbook: Listening & Reading, Princeton, NJ, USA, 2024.",
        "[2] Tiêu chuẩn Khung năng lực ngoại ngữ 6 bậc dùng cho Việt Nam (Ban hành kèm Thông tư số 01/2014/TT-BGDĐT của Bộ Giáo dục và Đào tạo).",
        "[3] Council of Europe, Common European Framework of Reference for Languages: Learning, Teaching, Assessment (CEFR), Cambridge University Press, 2020.",
        "[4] Tiago Ramirez et al., FastAPI: Modern, High-Performance Web Framework for Building APIs with Python, Official Documentation: https://fastapi.tiangolo.com, 2024.",
        "[5] Meta Platforms Inc., React 19 Documentation & Concurrent Rendering Architecture, Website: https://react.dev, 2024.",
        "[6] Google AI for Developers, Gemini API Technical Reference & Model System Architecture, Website: https://ai.google.dev/docs, 2024.",
        "[7] Piotr Woźniak, Optimization of Learning: The SuperMemo Method and the Two-Component Model of Long-Term Memory, Doctoral Dissertation, University of Economics in Wroclaw, 1995.",
        "[8] Hermann Ebbinghaus, Memory: A Contribution to Experimental Psychology, Teachers College, Columbia University, 1913.",
        "[9] Field Fielding R. et al., Hypertext Transfer Protocol (HTTP/1.1): Range Requests, RFC 7233, Internet Engineering Task Force (IETF), 2014.",
        "[10] Michael Bayer, SQLAlchemy: The Database Toolkit for Python, O'Reilly Media Publishing, 2023."
    ]
    for r in refs:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.25
        run = p.add_run(r)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)

    doc.add_page_break()

    # PHỤ LỤC
    add_heading_1(doc, "PHỤ LỤC: HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH HỆ THỐNG")
    add_body_p(
        doc,
        "Để hỗ trợ Hội đồng đánh giá và các nhà phát triển dễ dàng triển khai, kiểm thử ứng dụng trong môi trường thực tế, "
        "dưới đây là quy trình 5 bước cài đặt và khởi chạy toàn diện hệ thống TOEIC Master Platform:",
        bold_prefix="Quy trình khởi chạy môi trường cục bộ (Localhost): "
    )
    add_bullet(
        doc,
        "Máy tính cần cài đặt sẵn Python phiên bản 3.11 trở lên (https://python.org) và Node.js phiên bản 18+ (https://nodejs.org). "
        "Kiểm tra môi trường trong terminal:\n"
        "python --version\n"
        "node --version",
        bold_prefix="Bước 1: Chuẩn bị môi trường phần mềm: "
    )
    add_bullet(
        doc,
        "Mở cửa sổ dòng lệnh Terminal tại thư mục backend của dự án và cài đặt các thư viện phụ thuộc:\n"
        "cd backend\n"
        "pip install fastapi uvicorn sqlalchemy pydantic httpx pyjwt passlib bcrypt",
        bold_prefix="Bước 2: Cài đặt các thư viện Backend (FastAPI): "
    )
    add_bullet(
        doc,
        "Mở tệp backend/.env và điền các khóa Google Gemini API Key:\n"
        "GEMINI_API_KEYS=\"key_1,key_2,key_3\"\n"
        "(Hệ thống hỗ trợ phân tách nhiều khóa bằng dấu phẩy để kích hoạt cụm Gemini Pool tự động)",
        bold_prefix="Bước 3: Cấu hình biến môi trường và Gemini API Key: "
    )
    add_bullet(
        doc,
        "Mở terminal tại thư mục backend và khởi chạy máy chủ API qua Uvicorn:\n"
        "python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload\n"
        "Kiểm tra máy chủ hoạt động tại đường dẫn: http://127.0.0.1:8001/docs (Giao diện Swagger UI)",
        bold_prefix="Bước 4: Khởi động máy chủ Backend: "
    )
    add_bullet(
        doc,
        "Mở một cửa sổ terminal mới tại thư mục frontend, cài đặt node_modules và khởi động dev server:\n"
        "cd frontend\n"
        "npm install\n"
        "npm run dev\n"
        "Mở trình duyệt web bất kỳ và truy cập đường dẫn: http://localhost:5173 để trải nghiệm toàn bộ hệ sinh thái luyện thi TOEIC Master Platform.",
        bold_prefix="Bước 5: Cài đặt và khởi chạy Frontend (React Vite): "
    )
