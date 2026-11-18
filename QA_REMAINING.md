# QA_REMAINING.md – Danh Sách Lỗi & Hạng Mục Chờ Xác Minh Thủ Công

Hiện tại, hệ thống **không còn bất kỳ lỗi CRITICAL, HIGH hoặc MEDIUM** nào chưa được xử lý trong mã nguồn và dữ liệu.

### Các hạng mục đánh dấu `NEEDS_MANUAL_REVIEW`:
1. **Chất lượng phát âm AI / Giọng đọc thực tế**:
   - *Mô tả*: Cần giáo viên hoặc chuyên gia TOEIC nghe thử các đoạn audio tổng hợp mới để đánh giá độ tự nhiên ngữ điệu và trọng âm câu.
   - *Lý do*: Công cụ kiểm thử tự động chỉ xác minh được sự tồn tại của file, Content-Type `audio/*`, dung lượng và mã HTTP 200, không thể tự thẩm định cảm thụ âm nhạc/ngữ điệu.
2. **Kiểm duyệt Watermark hiếm trên hình ảnh Part 1**:
   - *Mô tả*: Rà soát bằng mắt thường một số hình ảnh Part 1 đề cũ xem có sót logo hoặc watermark mờ ở góc ảnh không.
   - *Lý do*: Script tự động chỉ nhận diện các watermark rõ ràng qua hash/kích thước và crop viền; các vết mờ cần xác nhận thủ công.
