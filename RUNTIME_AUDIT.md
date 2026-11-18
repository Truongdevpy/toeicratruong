# RUNTIME_AUDIT.md - Báo cáo kiểm định tự động End-to-End

## 1. Tổng quan kiểm định E2E Playwright
- **Công cụ**: Playwright Chromium (Desktop 1280x800 và Mobile 390x844).
- **Môi trường Database**: Bản sao an toàn `backend/platform.e2e.db` (không chạy trên DB thật).
- **Mock AI (Gemini)**: Toàn bộ endpoint `/api/ai/*` được mock JSON cố định theo đúng schema.
- **Quy tắc cấm và bắt buộc**: Tách biệt tại `e2e/rules.json`.

---

## 2. Bảng kết quả kiểm tra theo Module (Crawler và E2E Specs)

| Nhóm Module | Số lượng kiểm tra | Kết quả | Ghi chú & Triệu chứng |
|:---|:---:|:---:|:---|
| **@nav (Crawler Routes)** | 21 routes chính | PASS | Tất cả các trang mở mượt mà, không trắng trang, không có Footer sai vị trí. |
| **@listening & @reading** | 2 routes luyện tập | PASS | Tải đủ dữ liệu, hiển thị container câu hỏi và điều hướng chuẩn. |
| **@vocab & @grammar** | 2 lộ trình bản đồ | PASS | Lộ trình Chinh phục Từ vựng và Ngữ pháp uốn lượn mở mặc định; đã gỡ sạch banner cũ; không dính chuỗi cấm. |
| **@dictation, @speaking, @writing** | 3 phòng luyện chuyên sâu | PASS | Không còn nhãn sai chuẩn "Band 200", cấu trúc phòng luyện tải đủ. |
| **@games, @leaderboard, @community** | 3 trang tương tác/xã hội | PASS | Không còn banner "Gợi ý hôm nay" tại `/games`; Leaderboard không có phân hạng CLB ảo. |
| **@mock & @placement** | 2 phòng thi | PASS | Đề thi 200 câu và bài đánh giá đầu vào cấu trúc ổn định. |

---

## 3. Danh sách kiểm tra chuỗi cấm & vi phạm (Rules Audit)
- **Chuỗi cấm**: "Duolingo", "Band 200", "10-25 từ", "CLB Master", "CLB Bứt Phá", "CLB Khởi Động", "Kho Từ vựng TOEIC Chuẩn Hóa", "Kho Ngữ Pháp Thực Chiến", "Đấu trường Gamification", "Gợi ý hôm nay", "Nhóm học tập mục tiêu", các tên người ảo trong seed.
  - **Kết quả**: 100% SẠCH (Không phát hiện chuỗi cấm trên các view được kiểm tra).
- **Chuỗi bắt buộc**:
  - Tiêu đề "Lộ trình Chinh phục Từ vựng TOEIC" tại `/practice/vocabulary`: CÓ MẶT.
  - Menu hiển thị "Ngữ pháp": CHÍNH XÁC.

---

## 4. Top 5 nhóm nguyên nhân gốc & Đề xuất hoàn thiện
1. **Âm thanh Part 1-4**: Đã giải quyết triệt để tại `BUG-01` bằng bộ lọc backend media resolver và guard tests.
2. **Đồng bộ Lộ trình Từ vựng (VOC-01 & VOC-02)**: Đã hoàn tất khôi phục 12 Units chuẩn ETS và modal phát âm micro.
3. **Phân trang thống nhất (HUB-04)**: Đã tích hợp `Pagination` cho Listening & Reading.
4. **Bảo mật & Rate limit**: Cần duy trì mock cho các kiểm thử tự động để tránh cạn kiệt hạn ngạch Gemini.
5. **Giao diện Responsive**: Mobile và Desktop hiển thị hài hòa theo đúng breakpoints của Tailwind CSS.
