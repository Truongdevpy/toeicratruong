# QA_BUGS.md – Danh Sách Lỗi Đã Phát Hiện & Phân Tích Nguyên Nhân

| Bug ID | Nhóm chức năng | Mức độ | Mô tả hiện tượng | Nguyên nhân gốc rễ | File / Component liên quan |
|---|---|---|---|---|---|
| **BUG-001** | Speaking | HIGH | Mất điểm các câu Shadowing Speaking sau khi F5 | `sentenceScores` chỉ lưu tạm trong component state, chưa đồng bộ localStorage | `frontend/src/pages/SpeakingPracticePage.tsx` |
| **BUG-002** | Games | MEDIUM | Banner "Gợi ý hôm nay" (`FeaturedGame`) xuất hiện trái quyết định | Hook tính toán và component `FeaturedGame` còn mount trong UI | `frontend/src/pages/ArenaGamePage.tsx` |
| **BUG-003** | Writing | MEDIUM | Nhãn "Band 200" và "10-25 từ" sai chuẩn Rubric ETS ở câu 1-5 | Chuỗi hardcode mô tả trong cấu hình đề thi câu 1-5 | `frontend/src/pages/WritingPracticePage.tsx` |
| **BUG-004** | Leaderboard | LOW | Header hiển thị badge "Minh họa CLB" gây hiểu nhầm | Cờ `data?.is_mock` render UI điều kiện dư thừa | `frontend/src/pages/LeaderboardPage.tsx` |
| **BUG-005** | Practice Hub | MEDIUM | Thiếu phân trang thống nhất cho Reading & Listening Practice | Chưa tích hợp hook `usePagination` và component `Pagination` | `ReadingPracticePage.tsx`, `ListeningPracticePage.tsx` |
| **BUG-006** | Grammar | HIGH | Thiếu `DailyReviewModal` kết nối chu kỳ Spaced Repetition | Chưa mount modal giao diện kích hoạt chu kỳ ôn tập hàng ngày | `frontend/src/pages/GrammarPage.tsx` |
| **BUG-007** | Vocabulary | HIGH | Thiếu bản đồ uốn lượn Duolingo làm chế độ mặc định | `VocabularyPage.tsx` chỉ hiển thị dạng bảng phẳng, thiếu viewMode 'path' | `frontend/src/pages/VocabularyPage.tsx` |
| **BUG-008** | Media / Audio | CRITICAL | Audio Part 1-4 bị im lặng hoặc 404 trên các đề crawl Tooich | Thư mục audio crawl chưa có trên đĩa, API chưa lọc bài có file tồn tại | `backend/routers/practice.py`, `backend/routers/tests.py` |
| **BUG-009** | Vocabulary | HIGH | Thiếu modal luyện tập tương tác & bước chấm phát âm micro (VOC-02) | Chưa tích hợp `VocabPracticeModal` kết nối Web Speech API & MediaRecorder | `VocabPracticeModal.tsx`, `VocabularyPage.tsx` |
| **BUG-010** | Data / Listening | CRITICAL | 930 câu hỏi Part 4 thiếu `question_text`/`prompt` trong kho luyện tập | Quá trình trích xuất từ dữ liệu thô `dautoeic` chưa map trường câu hỏi | `data/.../part4_practice.json`, `run_data_tests.py` |
| **BUG-011** | Vocabulary / Data | MEDIUM | Lệch số chủ đề từ vựng giữa Backend (8) và Bản đồ Lộ trình (12) | `TOPIC_ALIASES` thiếu 4 chủ đề: shopping, entertainment, health, housing | `backend/routers/vocabulary.py`, `VocabularyPage.tsx` |
