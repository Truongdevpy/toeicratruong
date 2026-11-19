# QA_FIXES.md – Danh Sách Lỗi Đã Sửa Đổi & Bằng Chứng Xác Minh

### 1. BUG-001 (SPK-02): Khôi phục lưu vết điểm số Speaking
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/pages/SpeakingPracticePage.tsx`
- **Mô tả**: Tích hợp lưu và tải `sentenceScores` từ `localStorage` (`toeic_shadowing_sentence_scores`). F5 không làm mất điểm.
- **Bằng chứng**: Test Vitest `frontend/src/services/srsService.test.ts` PASS.

### 2. BUG-002 (GAM-07): Gỡ bỏ khối FeaturedGame ("Gợi ý hôm nay")
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/pages/ArenaGamePage.tsx`
- **Mô tả**: Đã unmount hoàn toàn component `FeaturedGame` theo quyết định nhất quán của chủ dự án.
- **Bằng chứng**: Playwright test `e2e/specs/05_games_social.spec.ts` kiểm tra chuỗi cấm PASS.

### 3. BUG-003 (WRI-04): Chuẩn hóa thang điểm Writing câu 1-5
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/pages/WritingPracticePage.tsx`
- **Mô tả**: Gỡ bỏ nhãn "Band 200" và "10-25 từ", chuyển sang thang điểm chuẩn ETS (x/3).
- **Bằng chứng**: Playwright test `e2e/specs/04_dictation_speaking_writing.spec.ts` PASS.

### 4. BUG-004 (GAMI-02): Loại bỏ phân hạng CLB minh họa tại Leaderboard
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/pages/LeaderboardPage.tsx`
- **Mô tả**: Gỡ bỏ badge `data?.is_mock` để bảng xếp hạng chỉ hiển thị thông tin học viên thực.
- **Bằng chứng**: Playwright test `e2e/specs/05_games_social.spec.ts` PASS.

### 5. BUG-005 (HUB-04): Đồng bộ phân trang Pagination cho Reading & Listening
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `ReadingPracticePage.tsx`, `ListeningPracticePage.tsx`
- **Mô tả**: Tích hợp hook `usePagination` và giao diện `Pagination` chuẩn toàn hệ thống.
- **Bằng chứng**: Features manifest `HUB-04` contract test PASS.

### 6. BUG-006 (GRA-03): Tích hợp DailyReviewModal cho Ngữ pháp
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/components/grammar/DailyReviewModal.tsx`, `GrammarPage.tsx`
- **Mô tả**: Mount modal ôn tập hàng ngày kích hoạt chu kỳ lặp lại ngắt quãng SRS.
- **Bằng chứng**: Features manifest `GRA-03` contract test PASS.

### 7. BUG-007 (VOC-01): Khôi phục Bản đồ uốn lượn Lộ trình Từ vựng
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/components/vocabulary/VocabPathView.tsx`, `VocabularyPage.tsx`
- **Mô tả**: Dựng bản đồ 12 Units (48 Nodes tuần tự) làm chế độ mặc định, chuyển đổi mượt mà sang Tra cứu chi tiết.
- **Bằng chứng**: Test Vitest `frontend/src/services/vocabPath.test.ts` PASS & Playwright `03_vocab_grammar.spec.ts` PASS.

### 8. BUG-008 (BUG-01): Lọc âm thanh unplayable Part 1-4
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `backend/routers/practice.py`, `backend/routers/tests.py`
- **Mô tả**: Dùng `resolve_media_url` kiểm tra tồn tại thực tế trên đĩa trước khi trả về client.
- **Bằng chứng**: `scripts/run_data_tests.py` (Audio resolution sanity guard) PASS.

### 9. BUG-009 (VOC-02): Thêm modal luyện tập & phát âm micro 0-100
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `frontend/src/components/vocabulary/VocabPracticeModal.tsx`, `VocabularyPage.tsx`
- **Mô tả**: Tích hợp Web Speech API, MediaRecorder, chấm điểm >= 70, phím Space/Enter.
- **Bằng chứng**: Test Vitest `frontend/src/services/vocabPath.test.ts` PASS.

### 10. BUG-010 (DATA-02): Khôi phục 930 đề bài Part 4 từ dữ liệu gốc
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `data/data/web_ready/practice_by_part/part4_practice.json`, `scripts/run_data_tests.py`
- **Mô tả**: Đối khớp 100% dựa trên audio và id từ dữ liệu gốc `dautoeic` và `data/export/questions.json`.
- **Bằng chứng**: `scripts/run_data_tests.py` PASS (`Part 4 prompt completeness: 3330/3330 valid`).

### 11. BUG-011 (DATA-14): Đồng bộ 12 chủ đề từ vựng ETS
- **Trạng thái**: FIXED AND VERIFIED
- **File sửa**: `backend/routers/vocabulary.py`, `frontend/src/pages/VocabularyPage.tsx`
- **Mô tả**: Mở rộng toàn bộ 12 chủ đề chuẩn ETS đồng bộ giữa API filter, Kho từ vựng và Lộ trình bản đồ.
- **Bằng chứng**: `npm run verify` PASS 100%.
