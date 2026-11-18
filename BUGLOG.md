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
