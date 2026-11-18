# BUGLOG.md - Nhật ký theo dõi & ngăn ngừa tái phát lỗi

Tài liệu này lưu lại toàn bộ các lỗi phát sinh trong quá trình phát triển, nguyên nhân gốc rễ, giải pháp và bài học kiểm thử nhằm ngăn ngừa việc sửa lỗi gây tái phát lỗi cũ (regression).

---

## Mẫu ghi nhận lỗi (Template)

### [BUG-XXX] Tiêu đề ngắn gọn về lỗi
- **Mã lỗi**: BUG-XXX (Ví dụ: BUG-001)
- **Ngày phát hiện / sửa**: YYYY-MM-DD
- **Triệu chứng**: Mô tả hiện tượng lỗi gặp phải (UI bị crash, API trả về mã lỗi gì, dữ liệu sai lệch ra sao).
- **Nguyên nhân gốc (Root Cause)**: Lý do kỹ thuật cụ thể dẫn đến lỗi (biến undefined, race condition, xung đột route, lỗi encoding,...).
- **File đã sửa**:
  - `path/to/file1.ts` (dòng x - y)
  - `path/to/file2.py`
- **Các vị trí dùng chung bị ảnh hưởng (Impacted Shared Usages)**: Liệt kê các module, components khác sử dụng chung code này và đã được kiểm tra chéo.
- **Test giữ lỗi (Regression Test)**: Tên file test hoặc bước kiểm thử tự động/thủ công bảo đảm lỗi không bị quay lại.
- **Ghi chú "KHÔNG đổi lại vì..." (Guardrails)**: Lời dặn rõ ràng cho các lượt agent/lập trình viên tiếp theo không được hoàn tác hay thay đổi logic này vì lý do cụ thể.

---

## Danh sách lỗi đã xử lý

*(Chưa có bản ghi mới. Điền theo mẫu trên mỗi khi sửa xong một lỗi.)*
### [BUG-001] Mất điểm các câu Shadowing Speaking sau khi F5
- **Mã lỗi**: SPK-02
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Khi học viên luyện phát âm các câu Speaking Shadowing, tải lại trang (F5) khiến toàn bộ `sentenceScores` bị reset về rỗng.
- **Nguyên nhân gốc (Root Cause)**: `sentenceScores` chỉ lưu tạm trong bộ nhớ component state `useState({})`, không được đồng bộ xuống `localStorage`.
- **File đã sửa**: `frontend/src/pages/SpeakingPracticePage.tsx`
- **Các vị trí dùng chung bị ảnh hưởng**: Không ảnh hưởng trang khác, chỉ tác động trực tiếp lên tiến độ phòng Shadowing.
- **Test giữ lỗi**: `frontend/src/services/srsService.test.ts`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG đổi `sentenceScores` về state đơn thuần mà không qua `updateSentenceScore`, vì học viên cần bảo lưu kết quả luyện nói qua các phiên tải lại trang.

### [BUG-002] Khối FeaturedGame xuất hiện tại trang Games trái với quyết định
- **Mã lỗi**: GAM-07
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Trang `/games` xuất hiện khối banner "Gợi ý hôm nay" chiếm diện tích dù đã có quyết định gỡ bỏ để giữ giao diện phẳng sạch.
- **Nguyên nhân gốc (Root Cause)**: Component `FeaturedGame` và hook tính toán game nổi bật vẫn còn được import và mount trong trang `ArenaGamePage.tsx`.
- **File đã sửa**: `frontend/src/pages/ArenaGamePage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG mount lại `FeaturedGame` theo quyết định nhất quán của chủ dự án tại `FEATURES.md`.

### [BUG-003] Nhãn Band 200 và mục tiêu 10-25 từ trong đề Writing
- **Mã lỗi**: WRI-04
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Hiển thị nhãn sai chuẩn ETS: "Band 200" và "10-25 từ" cho phần viết câu theo tranh (Q1-5 chuẩn ETS chỉ chấm theo ngữ pháp/cấu trúc, thang điểm x/3).
- **Nguyên nhân gốc (Root Cause)**: Chuỗi hardcode mô tả trong cấu hình đề thi câu 1-5.
- **File đã sửa**: `frontend/src/pages/WritingPracticePage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG đưa lại nhãn "Band 200" hay "10-25 từ" vào Writing theo chuẩn Rubric ETS.

### [BUG-004] Bảng xếp hạng hiển thị nhãn dữ liệu minh họa CLB
- **Mã lỗi**: GAMI-02
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Header và footer bảng xếp hạng hiển thị badge "Minh họa CLB" gây hiểu nhầm dữ liệu ảo.
- **Nguyên nhân gốc (Root Cause)**: Cờ `data?.is_mock` render UI điều kiện dư thừa.
- **File đã sửa**: `frontend/src/pages/LeaderboardPage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG hiển thị nhãn CLB minh họa khi bảng xếp hạng đã kết nối dữ liệu người dùng thật.
### [BUG-005] Đồng bộ phân trang Pagination cho Reading và Listening Practice
- **Mã lỗi**: HUB-04
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Giao diện phần luyện tập đọc và nghe hiển thị danh sách kéo dài không đồng bộ chuẩn điều hướng trang như các mục khác.
- **Nguyên nhân gốc (Root Cause)**: Chưa import và tích hợp `usePagination` và `Pagination` vào `ReadingPracticePage.tsx` và `ListeningPracticePage.tsx`.
- **File đã sửa**: `frontend/src/pages/ReadingPracticePage.tsx`, `frontend/src/pages/ListeningPracticePage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG quay lại layout cuộn dọc vô hạn không kiểm soát; phải dùng chung chuẩn Pagination toàn hệ thống.

### [BUG-006] Thiếu DailyReviewModal kích hoạt SRS trong trang Ngữ pháp
- **Mã lỗi**: GRA-03
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Logic tính toán lặp lại ngắt quãng SRS (`srsService`) đã có nhưng trên giao diện `GrammarPage.tsx` không có modal cho phép học viên ôn tập hàng ngày.
- **Nguyên nhân gốc (Root Cause)**: Chưa tạo component giao diện `DailyReviewModal.tsx` và chưa gắn state kích hoạt vào `GrammarPage.tsx`.
- **File đã sửa**: `frontend/src/components/grammar/DailyReviewModal.tsx`, `frontend/src/pages/GrammarPage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG gỡ kết nối giữa `DailyReviewModal` và `srsService` để bảo đảm tính năng ghi nhớ dài hạn.
### [BUG-007] Thiếu bản đồ lộ trình uốn lượn tại Lộ trình Từ vựng
- **Mã lỗi**: VOC-01
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Giao diện Lộ trình Từ vựng `/practice/vocabulary` chỉ hiển thị dạng lưới chủ đề thông thường, thiếu chế độ bản đồ uốn lượn theo phong cách Duolingo làm mặc định theo quyết định của chủ dự án.
- **Nguyên nhân gốc (Root Cause)**: Chưa tạo component `VocabPathView.tsx` và chưa gắn `viewMode: 'path' | 'list'` vào `VocabularyPage.tsx`.
- **File đã sửa**: `frontend/src/components/vocabulary/VocabPathView.tsx`, `frontend/src/pages/VocabularyPage.tsx`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG đảo ngược chế độ "Tra cứu chi tiết" thành mặc định; "Bản đồ Lộ trình" uốn lượn phải là giao diện chính khi người học truy cập `/practice/vocabulary`.


### [BUG-008] Audio phát Part 1-4 bị im vặng hoặc 404
- **Mã lỗi**: BUG-01 (DATA-03, DATA-07, TEST-07)
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Khi học viên luyện nghe Part 1-4 og các đề Crawl Tooich, âm thanh bị 404 hoặc rỗng khiến trình phát im lặng.
- **Nguyên nhân gốc**: Dữ liệu cảo Tooich trỏ vào /media/tooich/... nhưng thư mục này chêa có trên đĩa; API chêa lọc cân/ đề có file âm thanh thực sự tồn tại.
- **File đã sửa**:
  - `backend/routers/practice.py` (lọc trong get_cached_part_practice)
  - `backend/routers/tests.py` (lọc đề cồ file âm thanh tốn tại và đóng phần băng liền dài 45 phút)
  - `scripts/run_data_tests.py` (thêm guard test kiểm tra Part 1-4)
- **Các vị trí dùng chung bị ảnh hưởng**: Trang luyện tập Nghe Part 1-4 (`/practice/listening`) và Phòng thi thử (`/mock-tests`).
- **Test giữ lỗi**: `scripts/run_data_tests.py` (Audio resolution sanity guard) & npm run verify
- **Ghi chú "KHÔNG đổi lại vi..."**: KHÔNG bỏ bộ lọc resolve_media_url trên đĩa; chỉ trả về cân hỏi và đề thi có file âm thanh thực sự phát được.
### [BUG-009] Thiếu bài tập tương tác & bước Luyện đọc từ bằng micro (VOC-02) trong Lộ trình Từ vựng
- **Mã lỗi**: VOC-02 (VOC-01, DATA-14)
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: Bản đồ từ vựng khi bấm vào node chưa mở modal luyện tập tương tác; thiếu bước kiểm tra phát âm bằng micro với Web Speech API đạt chuẩn >= 70 điểm.
- **Nguyên nhân gốc**: Chưa tích hợp `VocabPracticeModal` kết nối Web Speech API, MediaRecorder và phím tắt Space/Enter.
- **File đã sửa**:
  - `frontend/src/components/vocabulary/VocabPracticeModal.tsx`
  - `frontend/src/pages/VocabularyPage.tsx`
  - `frontend/src/services/vocabPath.test.ts`
  - `features.manifest.json`
- **Các vị trí dùng chung bị ảnh hưởng**: `/practice/vocabulary`, kho từ vựng và tiến trình học viên `toeic_vocab_user_progress`.
- **Test giữ lỗi**: `frontend/src/services/vocabPath.test.ts` & `npm run verify`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG gỡ bỏ bước chấm phát âm micro (ngưỡng 70 điểm) và các bài tập tương tác (theory, mcq, pronunciation, typing checkpoint) theo đúng mô tả VOC-01 và VOC-02.

### [BUG-010] 930 câu hỏi Part 4 thiếu question_text trong kho luyện tập
- **Mã lỗi**: DATA-02 (BUG-10)
- **Ngày phát hiện / sửa**: 2026-11-18
- **Triệu chứng**: 930 câu hỏi Part 4 trong `part4_practice.json` bị để trống `question_text`/`question`, khiến người học chỉ thấy 4 phương án A-D mà không có đề bài.
- **Nguyên nhân gốc**: Khi tổng hợp file `part4_practice.json`, các bản ghi từ nguồn `dautoeic` chưa được map trường `question_text` từ file `questions.json` gốc.
- **File đã sửa**:
  - `data/data/web_ready/practice_by_part/part4_practice.json`
  - `scripts/run_data_tests.py`
  - `FEATURES.md`
  - `RUNTIME_AUDIT.md`
- **Các vị trí dùng chung bị ảnh hưởng**: Trang luyện tập Listening Part 4 (`/practice/listening`) và API `/api/practice/part/4`.
- **Test giữ lỗi**: `scripts/run_data_tests.py` (Part 4 prompt completeness 3330/3330 questions valid) & `npm run verify`
- **Ghi chú "KHÔNG đổi lại vì..."**: KHÔNG ghi đè `part4_practice.json` bằng các bản xuất thiếu trường `question_text`; luôn đối khớp từ dữ liệu gốc của dự án.

