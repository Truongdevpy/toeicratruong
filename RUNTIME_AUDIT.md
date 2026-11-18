# RUNTIME_AUDIT.md - Báo cáo Kiểm tra Thực thi Trình duyệt & Lỗi thật người dùng nhìn thấy

Ngày thực hiện: 2026-11-18  
Môi trường kiểm tra: Chrome thật (`channel: 'chrome'`), cờ `--autoplay-policy=no-user-gesture-required`, Frontend `http://localhost:5173` và Backend API `http://localhost:8000`.

---

## 1. Bảng triệu chứng lỗi THẬT người dùng nhìn thấy

| Mã lỗi | Mô tả người dùng thấy | URL / Chức năng | Các bước tái hiện | Kết quả THẬT | Bằng chứng kiểm tra | Nguyên nhân gốc (Dữ liệu hay Code) | Mức độ |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **BUG-01** | Bấm phát audio ở nhiều câu luyện nghe bị im lặng, báo lỗi 404 hoặc không có tiếng. | `/practice/listening`, `/mock-tests` | Chọn Part 1, 2, 3 hoặc 4 ở các đề cào Tooich (`de-minh-hoa-*`). Bấm play audio. | **LỖI** | Quét dữ liệu thực: Part 1 có 492/606 câu, Part 2 có 2475/2975 câu, Part 3 có 3900/4680 câu trỏ đến `/media/tooich/...` nhưng thư mục này không tồn tại trên ổ đĩa. | **Dữ liệu**: Bộ media cào của Tooich bị thiếu trên đĩa; `backend/media_resolver.py` trả về rỗng vì file không tồn tại. | **CRITICAL** |
| **BUG-02** | Part 4 vào làm bài có 930 câu hỏi trắng tinh đề bài, chỉ hiện 4 đáp án A, B, C, D trơ trọi. | `/practice/listening` (Part 4) | Vào Luyện tập Part 4, mở các câu hỏi từ đề `dautoeic_*`. | **LỖI** | Script kiểm tra phát hiện 930 câu có `question_text = None` và `passage_text = None`. | **Dữ liệu**: Quá trình cào/convert dữ liệu Part 4 từ DauTOEIC bị bỏ sót trường câu hỏi. | **HIGH** |
| **BUG-03** | Part 6 vào bài có 240 câu bị thiếu đề bài hoặc dòng điền từ. | `/practice/reading` (Part 6) | Vào Luyện tập Part 6, chọn level nâng cao. | **LỖI** | Script kiểm tra phát hiện 240 câu Part 6 thiếu `question_text`. | **Dữ liệu**: Tệp `part6_practice.json` bị khuyết câu hỏi ở một số bài đọc. | **HIGH** |
| **BUG-04** | Lộ trình Từ vựng `/practice/vocabulary` uốn lượn đã hiển thị chuẩn nhưng các node bài học mới ở mức mẫu demo (3 Unit). | `/practice/vocabulary` | Truy cập trang Từ vựng. | **ĐÚNG (Đã khôi phục)** | Ảnh chụp thực tế: `e2e-audit/screens/vocabulary_winding_path.png`. Chế độ Bản đồ uốn lượn đã là mặc định, có nút chuyển sang "Tra cứu chi tiết". | **Code/Dữ liệu**: Cần nạp đầy đủ danh mục bài tập tương tác từ ngân hàng 5000 từ. | **MEDIUM** |
| **BUG-05** | Trang Đấu trường Game `/games` hiển thị sạch sẽ 9 mini-games, không còn banner rườm rà. | `/games` | Truy cập `/games`. | **ĐÚNG (Đã sửa)** | Ảnh chụp thực tế: `e2e-audit/screens/games_arena_clean.png`. Đã gỡ sạch khối FeaturedGame. | Không còn lỗi. | **RESOLVED** |
| **BUG-06** | Bảng xếp hạng không còn nhãn dữ liệu minh họa CLB, hiển thị thời gian thực sạch sẽ. | `/leaderboard` | Truy cập `/leaderboard`. | **ĐÚNG (Đã sửa)** | Ảnh chụp thực tế: `e2e-audit/screens/leaderboard_clean.png`. | Không còn lỗi. | **RESOLVED** |
| **BUG-07** | Luyện phát âm Speaking Shadowing lưu điểm bền vững qua F5. | `/practice/speaking` | Truy cập `/practice/speaking`, luyện câu. | **ĐÚNG (Đã sửa)** | Ảnh chụp thực tế: `e2e-audit/screens/speaking_practice.png`. Điểm `sentenceScores` đã lưu vào `localStorage`. | Không còn lỗi. | **RESOLVED** |

---

## 2. Phân nhóm theo nguyên nhân gốc rễ

1. **Nhóm I: Dữ liệu và Media thực tế bị thiếu / sai đường dẫn (BUG-01, BUG-02, BUG-03)**
   - *Triệu chứng*: Audio cào từ Tooich bị 404 (chỉ có audio của Crack TOEIC và Study4 là có thật trên đĩa); 930 câu Part 4 và 240 câu Part 6 bị thiếu `question_text`.
   - *Giải pháp*: Lọc catalog đề thi luyện tập chỉ kích hoạt các đề có file âm thanh thực sự tồn tại (`resolve_media_url` thành công); với 930 câu Part 4 khuyết đề, tra cứu đối khớp từ nguồn `dau_crack` hoặc ẩn khỏi danh sách luyện tập.
2. **Nhóm II: Code & UI tương tác (Đã khôi phục và hoạt động chuẩn)**
   - Bản đồ Ngữ pháp (`grammar_duolingo_path.png`) và Từ vựng (`vocabulary_winding_path.png`) đã hoạt động tuần tự.
   - Các lỗi nhãn điểm Writing "Band 200", 10-25 từ, banner Game đã được làm sạch 100%.

---

## 3. Thứ tự sửa đề xuất (Một lần sửa giải quyết nhiều triệu chứng)

1. **Ưu tiên 1 (Xử lý dứt điểm Audio 404 - BUG-01)**:
   - Cập nhật bộ lọc dữ liệu khi trả về API `/api/practice/part/*`: tự động bỏ qua hoặc ẩn các câu hỏi mà file audio không tồn tại trên đĩa. Giải quyết ngay lập tức 100% tình trạng người học bấm nghe nhưng không có âm thanh.
2. **Ưu tiên 2 (Làm sạch 930 câu Part 4 khuyết đề - BUG-02 - Đợt 3)**:
   - Chạy script đối khớp ID với kho thô `study4` / `dau_crack` để lấy lại đề bài thật, nếu không có thì đánh dấu ẩn để tránh trải nghiệm đề thi rác.
3. **Ưu tiên 3 (Đồng bộ 12 chủ đề từ vựng - DATA-14 - Đợt 2)**:
   - Chuẩn hóa phân loại `vocabulary_bank.json` thành đúng 12 chủ đề chuẩn TOEIC quốc tế.

---

## 4. Danh mục ảnh chụp màn hình kiểm chứng (E2E Screenshots)
- `e2e-audit/screens/vocabulary_winding_path.png`: Bản đồ lộ trình uốn lượn Từ vựng (VOC-01).
- `e2e-audit/screens/grammar_duolingo_path.png`: Bản đồ lộ trình Ngữ pháp Duolingo (GRA-01).
- `e2e-audit/screens/games_arena_clean.png`: 9 Mini-games sạch banner (GAM-01, GAM-07).
- `e2e-audit/screens/leaderboard_clean.png`: Bảng xếp hạng thời gian thực sạch CLB giả (GAMI-02).
- `e2e-audit/screens/speaking_practice.png`: Phòng luyện nói Shadowing và lưu điểm qua F5 (SPK-02).
