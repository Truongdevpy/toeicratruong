# AGENTS.md - Quy định & Nguyên tắc làm việc dành cho AI Agents

Tài liệu này là bộ nguyên tắc bắt buộc mọi AI Agent (Codex, Claude, v.v.) phải tuân thủ nghiêm ngặt trong suốt quá trình phân tích, sửa lỗi hoặc phát triển dự án **TOEIC Master Platform**.
Mục tiêu tối thượng: **Bảo vệ tính ổn định của hệ thống, không làm mất chức năng đã có, không tự ý phá vỡ quy chuẩn và ngăn ngừa tái phát lỗi (Zero Regression).**

---

## 1. 🔍 Nguyên tắc trước khi sửa (Pre-edit Ritual)

Trước khi thực hiện bất kỳ thay đổi mã nguồn nào:
1. **Đọc kỹ tài liệu bắt buộc**:
   - `AGENTS.md` (Quy định & nguyên tắc an toàn).
   - `FEATURES.md` (Nguồn sự thật về chức năng, ID tính năng, trạng thái CÒN/HỎNG/MẤT/KHÔNG RÕ).
   - `BUGLOG.md` (Nhật ký lỗi đã sửa và các bài học "KHÔNG đổi lại vì...").
2. **Kiểm tra trạng thái kho mã nguồn**:
   - Chạy `git status` để kiểm tra có file nào đang bị sửa đổi dở dang hay untracked không.
   - Chạy `git --no-pager log --oneline -20` để nắm ngữ cảnh 20 commit gần nhất và quy ước đặt tên commit.

---

## 2. 🛡️ Quy chuẩn chỉnh sửa code & An toàn mã nguồn

1. **Chỉnh sửa theo đoạn (Surgical Editing)**:
   - Chỉ sửa đúng hàm, đúng khối lệnh liên quan.
   - **TUYỆT ĐỐI KHÔNG** ghi đè toàn bộ file (full file rewrite) nếu file đã tồn tại và đang hoạt động ổn định.
2. **Cấm xóa mã bừa bãi**:
   - **KHÔNG xóa code** nếu chưa tìm kiếm toàn diện trong dự án (kể cả import động `import()`, URL router, cờ tính năng `feature flags`, biến trạng thái dynamic). Phải chứng minh chắc chắn đoạn code đó không còn nơi nào sử dụng trước khi loại bỏ.
3. **Không dọn dẹp / tái cấu trúc ngoài phạm vi (No Unauthorized Refactoring)**:
   - Nghiêm cấm "tiện tay dọn dẹp" (cleanup), đổi tên biến hàng loạt, tái cấu trúc kiến trúc (refactor), định dạng lại toàn bộ file nếu không được yêu cầu cụ thể.
4. **Phân tích nguyên nhân gốc & Tầm ảnh hưởng (Root Cause Analysis & Shared Usages)**:
   - Trước khi sửa một lỗi, phải xác định nguyên nhân gốc rễ (Root Cause).
   - Phải chủ động rà soát và nêu rõ những chỗ khác trong toàn dự án đang dùng chung hàm/component/endpoint đó trước khi áp dụng thay đổi.
5. **Dừng lại xin ý kiến khi quy mô xóa lớn**:
   - Nếu một tác vụ dẫn đến việc **xóa trên 100 dòng** hoặc **xóa file**, agent phải **dừng lại và hỏi ý kiến/chờ phê duyệt từ chủ dự án** trước khi thực hiện.

---

## 3. 🧪 Quy chuẩn sau khi sửa lỗi (Post-fix & Verification)

Mỗi khi sửa xong một lỗi hoặc hoàn thành một tính năng:
1. **Thêm bài kiểm thử (Regression Test)**: Bổ sung bài test tự động (Vitest / Pytest) hoặc kịch bản kiểm thử cụ thể nhằm tái hiện và chốt chặn lỗi, không để tái phát.
2. **Chạy kiểm thử hệ thống**: Chạy `npm run build` (hoặc `npm run verify` nếu có), kiểm tra TypeScript/Linter không có lỗi.
3. **Cập nhật `BUGLOG.md`**: Ghi nhận đầy đủ theo mẫu chuẩn: Mã lỗi, Ngày, Triệu chứng, Nguyên nhân gốc, File đã sửa, Test giữ lỗi, Ghi chú "KHÔNG đổi lại vì...".
4. **Báo cáo rõ ràng**: Xuất báo cáo ngắn gọn kèm kết quả `git diff --stat`.

---

## 4. 🗂️ Quy chuẩn xử lý dữ liệu lớn & Ngữ cảnh (Context Economy)

- **Tuyệt đối không in nguyên file dữ liệu lớn** (như `platform.db`, `tests_catalog.json`, `vocabulary_bank.json`, `dictation_challenges.json`, v.v.) hay in toàn bộ danh sách thư mục media.
- Luôn dùng `grep` / `Select-String` hoặc trích xuất mẫu **3 đến 5 bản ghi** đại diện để phục vụ phân tích, nhằm tránh làm tràn ngữ cảnh của agent.

---

## 5. ⚖️ Tuân thủ quyết định chủ dự án (Project Owner Decisions)

- Các mục được đánh dấu **`[QUYẾT ĐỊNH]`** trong file `FEATURES.md` đại diện cho các yêu cầu đã từng có mâu thuẫn cần sự thống nhất từ chủ dự án.
- **Agent tuyệt đối KHÔNG tự ý suy diễn hoặc thay đổi** những mục này. Khi chạm tới các tính năng có mâu thuẫn, phải giữ nguyên trạng hoặc hỏi ý kiến chủ dự án.

---

## 6. 🌿 Quy tắc quản lý nhánh & Commit

- Mỗi nhiệm vụ / tính năng / lỗi phải được thực hiện trên **nhánh riêng biệt** (`feat/...`, `fix/...`).
- Thực hiện các **commit nhỏ, nguyên tử (atomic commits)**: mỗi commit chỉ giải quyết trọn vẹn một tính năng hoặc một lỗi cụ thể kèm thông điệp rõ ràng theo chuẩn Conventional Commits (ví dụ: `fix(auth): ...`, `feat(grammar): ...`).
- **An toàn tuyệt đối**: Không bao giờ chạy các lệnh phá hủy như `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash drop`, `git push --force`.
