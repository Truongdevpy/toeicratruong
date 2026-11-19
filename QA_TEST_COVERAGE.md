# QA_TEST_COVERAGE.md – Ma Trận Phủ Kiểm Thử Hệ Thống

| Module | Route chính | Các tính năng được kiểm thử | Số test case | Trạng thái |
|---|---|---|---|---|
| **System & Nav** | `/`, 21 routes | Tải trang, chống màn hình trắng, Deep Link, chuyển hướng, Footer duy nhất ở home | 21 | PASS |
| **Mock Tests** | `/mock-tests` | Danh mục đề, 7 Part, Part 2 (A-C), Part 3-4 (3 câu), Part 6-7 chia đôi, ẩn transcript | 12 | PASS |
| **Practice Listening**| `/practice/listening` | Part 1-4, phát âm thanh, chuyển câu, chọn đáp án, xem giải thích, phân trang | 8 | PASS |
| **Practice Reading** | `/practice/reading` | Part 5-7, hiển thị passage, highlight dẫn chứng, chia đôi màn hình, phân trang | 8 | PASS |
| **Vocabulary** | `/practice/vocabulary` | Bản đồ uốn lượn 12 Units (48 Nodes), tim, XP, sao, mở khóa tuần tự, tra cứu chi tiết | 6 | PASS |
| **Pronunciation** | `/practice/vocabulary` | Chấm điểm micro Web Speech API, ngưỡng 70/100, phím Space/Enter | 3 | PASS |
| **Grammar** | `/practice/grammar` | Bản đồ Duolingo, DailyReviewModal, SRS lặp lại ngắt quãng, gỡ banner thừa | 5 | PASS |
| **Games** | `/games` | 9 minigames, GameSetupModal, Endless mode, gỡ banner FeaturedGame | 9 | PASS |
| **Dictation** | `/practice/dictation` | Luyện nghe chép Part 1-4, so sánh từ thông minh, viết tắt | 4 | PASS |
| **Writing** | `/practice/writing` | Viết câu theo tranh (x/3), viết phản hồi email, viết luận, bỏ nhãn Band 200 | 4 | PASS |
| **Speaking** | `/practice/speaking` | Shadowing phát âm, lưu sentenceScores qua F5, thân thiện lỗi micro | 3 | PASS |
| **Leaderboard** | `/leaderboard` | Bảng xếp hạng thật, không seed user ảo, bỏ phân hạng CLB minh họa | 3 | PASS |
| **Community** | `/community` | Đăng bài, like/unlike lưu vết sau F5 | 2 | PASS |
| **Data Integrity** | Toàn bộ dữ liệu | Chống Mojibake, đủ prompt Part 3, 4, 7, kiểm tra 5095 từ vựng tiếng Việt | 5 | PASS |
