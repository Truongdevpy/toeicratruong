# -*- coding: utf-8 -*-
from report_src.core import (
    add_heading_2, add_body_p, add_styled_table, add_table_caption
)

def add_chapter_2_tables(doc):
    # 2.3 Mô tả các bảng CSQL
    add_heading_2(doc, "2.3 Mô tả các bảng Cơ sở dữ liệu")
    add_body_p(
        doc,
        "Cơ sở dữ liệu của hệ thống được thiết kế theo chuẩn 3NF (Third Normal Form), đảm bảo không dư thừa dữ liệu "
        "và duy trì tính toàn vẹn tham chiếu chặt chẽ thông qua các ràng buộc khóa ngoại (Foreign Keys). Dưới đây là đặc tả chi tiết "
        "các bảng dữ liệu trọng yếu nhất trong hệ thống:"
    )

    # Bảng 2.4: users
    add_table_caption(doc, "2.4", "Đặc tả bảng users (Quản lý tài khoản và phân quyền)")
    headers_u = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_u = [
        ["id", "INTEGER", "PK", "NO", "Khóa chính tự tăng định danh người dùng"],
        ["email", "VARCHAR(255)", "UNIQUE", "NO", "Địa chỉ email đăng nhập của người dùng"],
        ["password_hash", "VARCHAR(255)", "-", "NO", "Mật khẩu đã được băm an toàn bằng thuật toán bcrypt"],
        ["full_name", "VARCHAR(255)", "-", "NO", "Họ và tên đầy đủ của người học"],
        ["avatar_url", "VARCHAR(512)", "-", "YES", "Đường dẫn URL ảnh đại diện cá nhân"],
        ["role", "VARCHAR(50)", "-", "NO", "Vai trò người dùng ('student', 'vip', 'admin')"],
        ["is_active", "BOOLEAN", "-", "NO", "Trạng thái kích hoạt tài khoản (True/False)"],
        ["token_version", "INTEGER", "-", "NO", "Phiên bản token phục vụ vô hiệu hóa phiên từ xa"],
        ["created_at", "DATETIME", "-", "NO", "Thời điểm đăng ký tài khoản (mặc định UTC now)"]
    ]
    add_styled_table(doc, headers_u, data_u, col_widths=[1.3, 1.3, 0.8, 0.8, 2.3])

    # Bảng 2.5: user_profiles
    add_table_caption(doc, "2.5", "Đặc tả bảng user_profiles (Hồ sơ học tập, CEFR, chuỗi streak)")
    headers_up = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_up = [
        ["id", "INTEGER", "PK", "NO", "Khóa chính hồ sơ học tập"],
        ["user_id", "INTEGER", "FK, UNIQUE", "NO", "Khóa ngoại liên kết tới bảng users.id"],
        ["current_score", "INTEGER", "-", "NO", "Điểm số TOEIC ước tính hiện tại (mặc định 425)"],
        ["target_score", "INTEGER", "-", "NO", "Mục tiêu điểm số TOEIC cần đạt (mặc định 650)"],
        ["study_purpose", "VARCHAR(100)", "-", "YES", "Mục đích học tập (Tốt nghiệp, Đi làm, Thăng tiến)"],
        ["daily_minutes", "INTEGER", "-", "NO", "Mục tiêu thời gian học mỗi ngày (phút)"],
        ["streak_days", "INTEGER", "-", "NO", "Số ngày duy trì chuỗi học liên tục không gián đoạn"],
        ["last_study_date", "VARCHAR(50)", "-", "YES", "Ngày gần nhất ghi nhận hoạt động học tập"],
        ["cefr_level", "VARCHAR(10)", "-", "NO", "Trình độ chuẩn Châu Âu hiện tại ('A1', 'A2', 'B1', 'B2')"],
        ["weak_areas", "TEXT (JSON)", "-", "YES", "Mảng JSON lưu các kỹ năng còn yếu cần bồi dưỡng"],
        ["strengths", "TEXT (JSON)", "-", "YES", "Mảng JSON lưu danh sách các điểm mạnh đã đạt được"]
    ]
    add_styled_table(doc, headers_up, data_up, col_widths=[1.3, 1.3, 0.9, 0.7, 2.3])

    # Bảng 2.6: learning_paths & learning_nodes
    add_table_caption(doc, "2.6", "Đặc tả bảng learning_paths & learning_nodes (Lộ trình học thích ứng)")
    headers_lp = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_lp = [
        ["learning_paths.id", "INTEGER", "PK", "NO", "Khóa chính bảng lộ trình học tập"],
        ["user_id", "INTEGER", "FK, UNIQUE", "NO", "Khóa ngoại nối tới users.id"],
        ["adaptive_weights", "TEXT (JSON)", "-", "NO", "Ma trận tỷ trọng bài học thích ứng theo %"],
        ["last_adaptation_reason", "VARCHAR(512)", "-", "YES", "Lý do hệ thống tự động tái cân bằng lộ trình"],
        ["learning_nodes.id", "INTEGER", "PK", "NO", "Khóa chính nút kỹ năng học tập"],
        ["path_id", "INTEGER", "FK", "NO", "Khóa ngoại nối tới learning_paths.id"],
        ["order_index", "INTEGER", "-", "NO", "Thứ tự sắp xếp nút bài học trong tiến trình"],
        ["title", "VARCHAR(255)", "-", "NO", "Tiêu đề bài học chuyên đề"],
        ["status", "VARCHAR(50)", "-", "NO", "Trạng thái nút ('completed', 'in_progress', 'locked')"],
        ["progress_pct", "INTEGER", "-", "NO", "Tỷ lệ hoàn thành nội dung nút học (%)"]
    ]
    add_styled_table(doc, headers_lp, data_lp, col_widths=[1.5, 1.2, 0.9, 0.7, 2.2])

    # Bảng 2.7: test_attempts & question_attempts
    add_table_caption(doc, "2.7", "Đặc tả bảng test_attempts & question_attempts (Lịch sử làm bài thi)")
    headers_ta = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_ta = [
        ["test_attempts.id", "INTEGER", "PK", "NO", "Khóa chính lần nộp bài thi thử"],
        ["user_id", "INTEGER", "FK", "NO", "Mã học viên nộp bài thi (users.id)"],
        ["test_id", "VARCHAR(100)", "-", "NO", "Mã định danh đề thi (ví dụ: 'crack-toeic-vol-2-test-1')"],
        ["score", "INTEGER", "-", "NO", "Tổng điểm TOEIC đạt được theo thang 10-990"],
        ["listening_score", "INTEGER", "-", "NO", "Điểm phần Nghe hiểu (5 - 495)"],
        ["reading_score", "INTEGER", "-", "NO", "Điểm phần Đọc hiểu (5 - 495)"],
        ["duration_seconds", "INTEGER", "-", "NO", "Thời gian làm bài thực tế tính bằng giây"],
        ["ai_feedback", "TEXT (JSON)", "-", "YES", "Nhận xét phân tích bẫy đề thi từ Google Gemini"],
        ["question_attempts.id", "INTEGER", "PK", "NO", "Khóa chính câu trả lời chi tiết"],
        ["attempt_id", "INTEGER", "FK", "NO", "Khóa ngoại nối tới test_attempts.id"],
        ["user_answer", "VARCHAR(10)", "-", "YES", "Phương án học viên lựa chọn (A, B, C, D)"],
        ["is_correct", "BOOLEAN", "-", "NO", "Kết quả trả lời đúng hay sai"]
    ]
    add_styled_table(doc, headers_ta, data_ta, col_widths=[1.6, 1.2, 0.8, 0.7, 2.2])

    # Bảng 2.8: user_flashcards
    add_table_caption(doc, "2.8", "Đặc tả bảng user_flashcards (Từ vựng ghi nhớ SRS)")
    headers_fc = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_fc = [
        ["id", "INTEGER", "PK", "NO", "Khóa chính thẻ từ vựng"],
        ["user_id", "INTEGER", "FK", "NO", "Mã học viên sở hữu thẻ từ vựng (users.id)"],
        ["word", "VARCHAR(100)", "-", "NO", "Từ vựng tiếng Anh trọng tâm"],
        ["definition", "TEXT", "-", "NO", "Định nghĩa và giải nghĩa tiếng Việt"],
        ["ipa", "VARCHAR(100)", "-", "YES", "Phiên âm quốc tế chuẩn IPA"],
        ["part_of_speech", "VARCHAR(50)", "-", "YES", "Từ loại (Noun, Verb, Adjective, Adverb)"],
        ["repetition_count", "INTEGER", "-", "NO", "Số lần học viên đã ôn luyện từ này"],
        ["ease_factor", "FLOAT", "-", "NO", "Hệ số ghi nhớ phản xạ (mặc định 2.5 theo thuật toán SM-2)"],
        ["next_review_at", "DATETIME", "-", "NO", "Thời điểm hệ thống nhắc nhở ôn tập lần kế tiếp"]
    ]
    add_styled_table(doc, headers_fc, data_fc, col_widths=[1.4, 1.3, 0.8, 0.7, 2.3])

    # Bảng 2.9: ai_conversations & ai_messages
    add_table_caption(doc, "2.9", "Đặc tả bảng ai_conversations & ai_messages (Nhật ký gia sư AI)")
    headers_ai = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_ai = [
        ["ai_conversations.id", "INTEGER", "PK", "NO", "Khóa chính phiên hội thoại gia sư AI"],
        ["user_id", "INTEGER", "FK", "NO", "Khóa ngoại nối tới bảng users.id"],
        ["title", "VARCHAR(255)", "-", "NO", "Tiêu đề cuộc trò chuyện (ví dụ: 'Hỏi bẫy câu 102 Part 5')"],
        ["ai_messages.id", "INTEGER", "PK", "NO", "Khóa chính từng tin nhắn trao đổi"],
        ["conversation_id", "INTEGER", "FK", "NO", "Khóa ngoại nối tới ai_conversations.id"],
        ["sender", "VARCHAR(20)", "-", "NO", "Người gửi tin nhắn ('user' hoặc 'ai')"],
        ["content", "TEXT", "-", "NO", "Nội dung tin nhắn đàm thoại sư phạm Socratic"],
        ["created_at", "DATETIME", "-", "NO", "Thời điểm gửi tin nhắn"]
    ]
    add_styled_table(doc, headers_ai, data_ai, col_widths=[1.6, 1.2, 0.8, 0.7, 2.2])

    # Bảng 2.10: payments & bank_transactions
    add_table_caption(doc, "2.10", "Đặc tả bảng payments & bank_transactions (Quản lý giao dịch nâng VIP)")
    headers_pm = ["Tên trường", "Kiểu dữ liệu", "Khóa", "Null", "Mô tả ý nghĩa"]
    data_pm = [
        ["payments.id", "INTEGER", "PK", "NO", "Khóa chính giao dịch nâng cấp tài khoản"],
        ["user_id", "INTEGER", "FK", "NO", "Mã học viên tạo yêu cầu nâng VIP (users.id)"],
        ["amount", "INTEGER", "-", "NO", "Số tiền thanh toán thực tế (VND)"],
        ["package_type", "VARCHAR(50)", "-", "NO", "Gói dịch vụ đăng ký ('vip_3m', 'vip_6m', 'vip_1y')"],
        ["status", "VARCHAR(50)", "-", "NO", "Trạng thái giao dịch ('pending', 'completed', 'cancelled')"],
        ["bank_transactions.id", "INTEGER", "PK", "NO", "Khóa chính nhật ký sao kê ngân hàng"],
        ["bank_code", "VARCHAR(50)", "-", "NO", "Mã ngân hàng nhận thanh toán (MBBank, Vietcombank)"],
        ["transfer_content", "VARCHAR(255)", "-", "NO", "Nội dung chuyển khoản đối soát tự động qua mã đơn"],
        ["created_at", "DATETIME", "-", "NO", "Thời gian ghi nhận giao dịch"]
    ]
    add_styled_table(doc, headers_pm, data_pm, col_widths=[1.6, 1.2, 0.8, 0.7, 2.2])

    doc.add_page_break()
