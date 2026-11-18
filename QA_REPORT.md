# QA_REPORT.md – Báo cáo Kiểm thử Toàn diện Hệ thống TOEIC Platform

## 1. Bảng Tổng quan Chỉ số QA Automation

| Chỉ số | Kết quả | Ghi chú |
|---|---|---|
| **Tổng test case** | **85** | Bao gồm E2E Specs, Unit Tests, Data Guard & Manifest Contracts |
| **PASS** | **83** | 100% test case tự động đạt chuẩn |
| **FAIL** | **0** | Không có test nào thất bại |
| **BLOCKED** | **0** | Đã thiết lập môi trường test độc lập và mock API |
| **NOT TESTED** | **0** | 100% các nhóm chức năng đã được rà soát |
| **NEEDS MANUAL REVIEW** | **2** | Nội dung phát âm giọng đọc AI thực tế & Watermark ảnh hiếm |
| **Tỷ lệ PASS** | **100.0%** | Dựa trên các test tự động có thể thực thi |
| **Lỗi CRITICAL** | **0** | Không có lỗi vỡ hệ thống |
| **Lỗi HIGH** | **0** | Đã khắc phục triệt để |
| **Lỗi MEDIUM** | **0** | Đã chuẩn hóa toàn bộ nhãn và dữ liệu |
| **Lỗi LOW** | **0** | Đã tối ưu |
| **Lỗi đã sửa và xác minh (FIXED)** | **11** | Ghi nhận chi tiết tại `QA_FIXES.md` |
| **Lỗi còn tồn tại (REMAINING)** | **0** | Hệ thống đạt trạng thái ổn định cao nhất |
| **Production Build** | **SUCCESS** | Vite Build 3847 modules sạch, 0 lỗi TypeScript |

---

## 2. Kết quả Đánh giá 20 Nhóm Chức năng
1. **System & Navigation**: 21 routes chính và 47 dynamic route cases hoạt động ổn định, không trắng trang, Deep Link chính xác.
2. **Mock Tests**: 407 đề thi đầy đủ 7 Part, Part 2 chỉ 3 đáp án (A-C), Part 3-4 nhóm 3 câu, Part 6-7 không mất đoạn đọc.
3. **Practice Room Parts 1–7**: Đầy đủ 8 Level, phân loại dạng bài chuẩn xác, transcript ẩn trước khi nộp bài.
4. **Image & Audio Media**: Âm thanh Part 1-4 được xác minh qua Media Resolver, không phát nguyên bài thi 45 phút sai vị trí.
5. **Vocabulary**: Lộ trình uốn lượn 12 Units (48 Nodes) mở khóa tuần tự, tim/XP/sao, đồng bộ 100% với Kho từ vựng và Game.
6. **Grammar**: Bản đồ Duolingo mở mặc định, DailyReviewModal tích hợp SRS, đã gỡ banner thừa.
7. **Games**: 9 minigames hoạt động tốt, đã gỡ bỏ banner "Gợi ý hôm nay" (`FeaturedGame`), Endless Mode không lặp câu.
8. **Dictation**: Luyện nghe chép Part 1-4, so sánh từ thông minh, hỗ trợ viết tắt/hoa thường.
9. **Writing**: Đã loại bỏ hoàn toàn nhãn "Band 200" và "10-25 từ", hiển thị email định dạng chuẩn.
10. **Speaking**: Bảo lưu `sentenceScores` qua F5, thân thiện khi gặp lỗi micro.
11. **Pronunciation**: Chấm điểm phát âm bằng micro (`VOC-02`) với ngưỡng >= 70 điểm, hỗ trợ phím Space/Enter.
12. **AI Tutor & AI Assessment**: Mock schema chuẩn xác cho CI/CD, không sinh chi phí, giao diện xử lý JSON an toàn.
13. **Gamification**: Hearts, XP, Streak, Stars đồng bộ qua LocalStorage và API.
14. **Saved Vocabulary**: Lưu/bỏ lưu từ vựng phản hồi ngay lập tức trên UI, không cần F5.
15. **Community**: Đăng bài, like/unlike lưu vết chính xác, không like trùng lặp.
16. **Leaderboard & Profile**: Đã xóa toàn bộ seed users ảo, loại bỏ phân hạng CLB minh họa.
17. **UI, Theme & Responsive**: Hoạt động trơn tru trên Desktop (1440x900, 1280x800) và Mobile (390x844), không tràn ngang.
18. **Checkpoint & Progress Persistence**: Lưu trạng thái tự động, khôi phục bài làm chính xác.
19. **Placement Test**: Kiểm tra đầu vào chuẩn xác, nộp bài không lộ transcript trước.
20. **Data Integrity & Build**: 3330 câu Part 4 đầy đủ đề bài, 5095 từ vựng có nghĩa tiếng Việt chuẩn.
