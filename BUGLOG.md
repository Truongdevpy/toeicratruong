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
