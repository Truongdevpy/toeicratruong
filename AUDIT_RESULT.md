# AUDIT_RESULT.md - Báo cáo kiểm kê tính năng & mã lỗi (FEATURES.md)

Ngày thực hiện: 2026-11-18  
Người kiểm kê: AI Agent (Chế độ CHỈ ĐỌC - không sửa code ứng dụng)

---

## 1. Bảng tóm tắt tổng quan trạng thái (Tiến trình đang cập nhật)

| Nhóm chức năng | Tổng số ID | CÒN | HỎNG | MẤT | KHÔNG RÕ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Dữ liệu và media (DATA)** | 15 | 11 | 2 | 0 | 2 |
| **2. Phòng làm bài / Mock-tests (TEST)** | 15 | - | - | - | - |
| **3. Practice Hub (HUB)** | 4 | - | - | - | - |
| **4. Từ vựng và Flashcard (VOC)** | 4 | - | - | - | - |
| **5. Ngữ pháp (GRA)** | 3 | - | - | - | - |
| **6. Nghe chép chính tả (DIC)** | 5 | - | - | - | - |
| **7. Nói (Speaking) (SPK)** | 4 | - | - | - | - |
| **8. Viết (Writing) (WRI)** | 4 | - | - | - | - |
| **9. Đấu trường Game (GAM)** | 7 | - | - | - | - |
| **10. Gamification, Cộng đồng, Hồ sơ (GAMI)** | 4 | - | - | - | - |
| **11. Hệ thống (SYS)** | 4 | - | - | - | - |
| **TỔNG CỘNG** | **69** | - | - | - | - |

---

## Chi tiết từng nhóm

### 1. Dữ liệu và media (DATA-01 đến DATA-15)

- **DATA-01** [CÒN]: Deep link toàn app.
  - *Bằng chứng*: `frontend/src/App.tsx` (dòng 59-150) quản lý `currentPath` đồng bộ `window.location.pathname` + `search`, hỗ trợ các route `/practice/mock-tests/...`, `/practice/writing`, `/practice/dictation`, v.v. Bắt sự kiện `popstate` khôi phục đúng đề/Part khi Back/Forward/F5.
- **DATA-02** [HỎNG]: Part 3, 4, 7 có đủ đề bài.
  - *Bằng chứng*: Đo kiểm dữ liệu thực tế tại `data/data/web_ready/practice_by_part/`: Part 3 (4680 câu: 0 thiếu), Part 7 (6480 câu: 0 thiếu). **Tuy nhiên, Part 4 có 930 / 3330 câu bị thiếu `question_text`** (trống prompt, ví dụ câu `dautoeic_1adf946e-218d-42b6-ae08-55ae6fda1bf8` số 71 chỉ có 4 options A-D).
- **DATA-03** [CÒN]: Nhãn dạng bài chuẩn ETS cho 7 Part.
  - *Bằng chứng*: `part1_practice.json` có 4 dạng chuẩn (Tranh 1 người, nhiều người, tả vật, tả cảnh); Part 2 có 12 dạng chuẩn (When, Where, khẳng định, đuôi...); Part 5 (Từ vựng, Từ loại, Giới từ, Động từ); không còn nhãn rập khuôn.
- **DATA-04** [CÒN]: Từ vựng quan trọng trong câu (`vocab_helper`).
  - *Bằng chứng*: Part 1 có 471/606 câu có vocabulary; Part 5 có 3534/3570 câu có vocabulary cấu trúc đầy đủ `text`, `role`, `vi`, `collocation`, `collocationVi`. Không có hiện tượng "Tiếng Việt : Tiếng Việt".
- **DATA-05** [CÒN]: Part 1 ảnh không dính logo (crop hoặc loại).
  - *Bằng chứng*: `scripts/clean_all_p1_watermarks.py` và kiểm tra 606 câu Part 1 không còn url chứa watermark tooich/đậu toeic.
- **DATA-06** [CÒN]: Phân loại Part 1 đều 4 dạng.
  - *Bằng chứng*: `part1_practice.json` phân bổ: Tranh một người (258), Tranh nhiều người (200), Tranh tả vật (108), Tranh tả cảnh (40). Không còn dồn 335 câu vào tả vật.
- **DATA-07** [CÒN]: Audio phát ổn định, mã hóa và cắt câu.
  - *Bằng chứng*: `backend/media_resolver.py` index 4000+ file, không có file audio nào bị dấu cách chưa chuẩn hóa (0 file có space). Audio Part 1 đã cắt ngắn theo từng câu.
- **DATA-08** [CÒN]: Không còn lỗi Mojibake UTF-8 trong Reading Part 6/7.
  - *Bằng chứng*: `backend/mojibake_guard.py` áp dụng middleware, quét toàn bộ file JSON reading part 6 & 7 đều đạt chuẩn UTF-8 sạch.
- **DATA-09** [CÒN]: Số câu hiển thị khớp số câu thực tế khi vào làm.
  - *Bằng chứng*: `backend/routers/practice.py` tính `len(questions)` động từ json dataset thực tế.
- **DATA-10** [KHÔNG RÕ - Thuộc [QUYẾT ĐỊNH]]: Chia level đều cho 7 Part.
  - *Bằng chứng*: Trong dữ liệu `practice_by_part/part*.json`, hiện tại cả 7 Part đều được phân theo **8 Level** (Level 1 đến Level 8). Mục này đang chờ Chủ dự án chốt giữ 4 hay 8 level.
- **DATA-11** [CÒN]: Mock-tests không trùng ID, phân loại theo năm.
  - *Bằng chứng*: `tests_catalog.json` có 407 đề thi, tỷ lệ trùng ID là 0%. Sidebar và tab hiển thị đầy đủ Đề thi (200).
- **DATA-12** [CÒN]: Tích hợp đầy đủ các tệp dữ liệu cào.
  - *Bằng chứng*: Đầy đủ `dictation_challenges.json`, `vocabulary_bank.json`, `tests_catalog.json` trong thư mục `data/data/web_ready/`.
- **DATA-13** [CÒN]: Đề thi thử bỏ Part 1 dính logo nhưng giữ Part 2-7 ở luyện tập.
  - *Bằng chứng*: Catalog đề mock-tests đã lọc bài thi hợp lệ; kho practice giữ nguyên toàn bộ Part 2-7.
- **DATA-14** [HỎNG]: Kho từ vựng khoảng 5000 từ, 12 chủ đề khớp Game/Lộ trình.
  - *Bằng chứng*: `vocabulary_bank.json` có 5095 từ nhưng chỉ phân vào **8 chủ đề** (office, finance, marketing, personnel, travel, dining, entertainment, shopping) thay vì 12 chủ đề.
- **DATA-15** [CÒN]: Không dữ liệu ảo.
  - *Bằng chứng*: Database `platform.db` bảng `users` chỉ chứa tài khoản người dùng thực tế; seed test data giả đã được loại bỏ.
### 2. Phòng làm bài / Mock-tests (TEST-01 đến TEST-15)

- **TEST-01** [CÒN]: Giao diện đổi theo từng Part (`effectiveGroups`), không ép tất cả thành Part 1.
  - *Bằng chứng*: `frontend/src/components/FocusedPracticeRoom.tsx` dòng 313–399 cài đặt useMemo `effectiveGroups`, chia rõ Part 1, 2, 5 (câu đơn) và Part 3, 4, 6, 7 (theo nhóm/passage).
- **TEST-02** [CÒN]: `QuestionImage` chỉ hiện ở Part 1, các Part khác không hiện khung ảnh lỗi.
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 2079 `partNumber === 1 && (<QuestionImage ... />)` và dòng 2094 `part={1}`.
- **TEST-03** [CÒN]: Part 1 ẩn transcript đến khi xem giải thích; Part 2 ẩn chữ câu hỏi, chỉ có 3 đáp án A-B-C và dòng "Nghe và chọn câu trả lời đúng nhất".
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 2228, 2437 (`['A', 'B', 'C', ...(partNumber === 2 ? [] : ['D'])]`).
- **TEST-04** [CÒN]: Part 3, 4 cụm 3 câu cho 1 audio, transcript hiện sau khi nộp, sang bài kế tiếp nhảy đúng số thứ tự.
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 352–367 gộp 3 câu/audio cho Part 3, 4; transcript chỉ hiển thị khi `isQAnswered`.
- **TEST-05** [CÒN]: Part 6 (4 câu/đoạn), Part 7 (2-5 câu/đoạn) chia đôi màn hình; `cleanOptionText` hiện đúng chữ đáp án.
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 72 (`cleanOptionText`) và layout `grid grid-cols-1 lg:grid-cols-12` chia đoạn đọc bên trái, câu hỏi bên phải.
- **TEST-06** [CÒN]: Drawer danh sách câu hiển thị theo dải (32-34, 131-134, v.v.).
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 3183 và drawer điều hướng group câu hỏi theo dải index chuẩn ETS.
- **TEST-07** [CÒN]: Audio tự phát khi chuyển câu.
  - *Bằng chứng*: `frontend/src/components/AudioPlayer.tsx` và `FocusedPracticeRoom.tsx` gắn listener kích hoạt audio playback ngay khi chọn câu hỏi/bài mới.
- **TEST-08** [CÒN]: Bảng câu hỏi có trạng thái đã làm (đúng xanh, sai đỏ), tự nhảy câu chưa làm, lọc câu sai.
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 2600-2720 có bộ lọc sai/đúng và đánh dấu màu trực quan cho từng nút câu.
- **TEST-09** [CÒN]: Thoát giữa chừng hiện checkpoint lưu tiến độ / khôi phục đúng vị trí.
  - *Bằng chứng*: Đã tích hợp qua `grammarProgressService.ts` và `DuolingoPracticeModal.tsx` (commit `55aed7c`), lưu vị trí câu hỏi đang làm dở vào storage.
- **TEST-10** [CÒN]: Focus Mode toàn màn hình khi vào bài, đổi đề không bị kẹt state cũ.
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` reset lại các state hook thông qua `key` và dependency khi thay đổi `testId`/`partNumber`.
- **TEST-11** [CÒN]: Mở bài nhanh, in-memory cache, không còn màn "Đang chuẩn bị đề thi..." xoay lâu, không còn chữ Duolingo ở loading.
  - *Bằng chứng*: Commit `dabc3ed` đã dọn bỏ chữ loading Duolingo và áp dụng in-memory cache cho tốc độ load dưới 50ms.
- **TEST-12** [CÒN]: Dẫn chứng (evidence) Part 7 highlight đúng câu chứa đáp án, hội thoại chat/email không bị `\n\n` thô.
  - *Bằng chứng*: `frontend/src/utils/evidenceExtractor.ts` và `MockTestsPage.tsx` dòng 1844–1861 hiển thị `q.evidence` và `q.evidence_vi`.
- **TEST-13** [CÒN]: Placement test không lộ transcript, đủ số câu đã chọn, audio tự phát, nộp trắng không được phân tích điểm mạnh.
  - *Bằng chứng*: `PlacementTestPage.tsx` và `backend/ai_placement.py` kiểm tra số câu làm thật; nộp trắng trả về kết quả yêu cầu làm bài nghiêm túc, không sinh điểm mạnh giả.
- **TEST-14** [CÒN]: Nút "Chấm bài AI" ở tổng quan và "Giải thích bằng AI" cho Part 1-7.
  - *Bằng chứng*: `backend/routers/ai_assessment.py`, commit `17f0e31` và drawer AIAssessmentDrawer hỗ trợ phân tích toàn diện.
- **TEST-15** [CÒN]: Hỏi đáp AI Tutor ngay tại câu hỏi (tự nhận ngữ cảnh câu hiện tại).
  - *Bằng chứng*: `FocusedPracticeRoom.tsx` dòng 807–819 `handleOpenAiTutor` truyền context câu hỏi hiện tại cho trợ lý AI.
### 3. Practice Hub (Nghe, Đọc) (HUB-01 đến HUB-04)

- **HUB-01** [CÒN]: Nút "Đánh giá bằng AI" ở hàng tiêu đề cấp độ: drawer gồm điểm mạnh, điểm yếu ưu tiên (kèm nguyên nhân), kế hoạch 7 ngày, ngưỡng dữ liệu nghiêm ngặt do server tính.
  - *Bằng chứng*: `frontend/src/pages/ListeningPracticePage.tsx` (dòng 643-674), `frontend/src/pages/ReadingPracticePage.tsx` tích hợp `AIAssessmentDrawer` và backend `backend/routers/ai_assessment.py`.
- **HUB-02** [CÒN]: Bộ phân loại dạng bài hiển thị ngoài danh mục Part 6, 7; đã bỏ lọc theo năm.
  - *Bằng chứng*: Danh mục Part 6 và 7 trong `ReadingPracticePage.tsx` phân loại theo dạng câu hỏi/chủ đề văn bản chuẩn ETS; không còn dropdown lọc năm gây rối.
- **HUB-03** [CÒN]: Footer chỉ ở trang chủ (`/`), các trang con không có.
  - *Bằng chứng*: `frontend/src/App.tsx` dòng 675: `{!isPracticeOrExamMode && isHomePage && (<footer ... />)}`.
- **HUB-04** [HỎNG]: Phân trang chuẩn (`usePagination`, `Pagination`) đồng bộ mọi tab.
  - *Bằng chứng*: Hook `usePagination` và component `Pagination` đã được tạo và dùng ở `LeaderboardPage.tsx` và `WritingPracticePage.tsx`, **nhưng chưa được đồng bộ sang ReadingPracticePage và ListeningPracticePage** (vẫn dùng scroll dài theo level).
### 4. Từ vựng và Flashcard (VOC-01 đến VOC-04)

- **VOC-01** [HỎNG]: Lộ trình Chinh phục Từ vựng (/practice/vocabulary): bản đồ uốn lượn Duolingo, tim, XP, sao.
  - *Bằng chứng*: `VocabDuoService` chỉ mới lưu trữ XP cục bộ (`toeic_vocab_xp_`); trang `frontend/src/pages/VocabularyPage.tsx` hiện tại vẫn sử dụng layout danh sách chủ đề truyền thống và tab Ôn thẻ SRS, chưa tích hợp bản đồ uốn lượn Duolingo hoàn chỉnh như bên Ngữ pháp.
- **VOC-02** [MẤT]: Bước "Luyện đọc từ" (micro, Web Speech API + MediaRecorder, chấm 0-100, đạt từ 70% mở tiếp).
  - *Bằng chứng*: Trong `frontend/src/pages/VocabularyPage.tsx` hoàn toàn không có `MediaRecorder` hay `SpeechRecognition` (tính năng thu âm chỉ đang có tại `SpeakingPracticePage.tsx`).
- **VOC-03** [CÒN]: Lưu từ vựng: giao diện cập nhật ngay qua `practiceProgressStore` (useSyncExternalStore), nhớ câu/Part, nút giỏ từ vựng trên thanh điều hướng.
  - *Bằng chứng*: `frontend/src/components/VocabBasketModal.tsx` và `frontend/src/services/practiceProgressStore.ts` đồng bộ tức thì, ghi nhận `part`, `context`.
- **VOC-04** [CÒN]: Flashcard SRS (/practice/flashcards): lật thẻ 3D, đánh giá 1-4, lọc chủ đề, phiên 10/20 thẻ, tính chu kỳ.
  - *Bằng chứng*: `frontend/src/pages/FlashcardsPage.tsx` dòng 914-1154 hỗ trợ chế độ Lật thẻ 3D SRS (`rotateY`), đánh giá 4 mức ghi nhớ, gọi `api.reviewFlashcard`.
### 5. Ngữ pháp (GRA-01 đến GRA-03)

- **GRA-01** [CÒN]: Lộ trình Ngữ pháp (`DuolingoPathView`) là chế độ mặc định: node theo thứ tự Lý thuyết -> Luyện tập -> Trắc nghiệm -> Kiểm tra chốt; mở khóa tuần tự; thanh tiến độ theo Unit/Chủ đề.
  - *Bằng chứng*: `frontend/src/pages/GrammarPage.tsx` dòng 437 nhúng `DuolingoPathView` làm view chính, liên kết dữ liệu tiến độ qua `grammarProgressService`.
- **GRA-02** [CÒN]: Modal bài học (`TheoryCardSwiper`, `DuolingoPracticeModal`, `DuolingoInteractiveExercise`).
  - *Bằng chứng*: Cả 3 components đã được xây dựng hoàn chỉnh trong `frontend/src/components/grammar/`, có chấm điểm âm thanh sfx, lời giải thích chi tiết, lưu checkpoint.
- **GRA-03** [HỎNG]: SRS trong Ngữ pháp: DailyReviewModal, chu kỳ 1, 3, 7, 14, 30 ngày.
  - *Bằng chứng*: File logic lõi `frontend/src/services/srsService.ts` đã có thuật toán tính interval và repetition, nhưng **`DailyReviewModal` chưa được render / kết nối vào `GrammarPage.tsx`**.
### 6. Nghe chép chính tả (/practice/dictation) (DIC-01 đến DIC-05)

- **DIC-01** [CÒN]: Part 1 có ảnh, 4 dòng nghe riêng A-D, ô nhập riêng, có chế độ Easy và Hard.
  - *Bằng chứng*: `frontend/src/pages/DictationPracticePage.tsx` và `backend/routers/dictation.py` hỗ trợ chia đa dòng `line_diffs` theo từng lựa chọn A-D.
- **DIC-02** [CÒN]: Part 2 có ô chép câu hỏi + 3 ô A-C.
  - *Bằng chứng*: `backend/routers/dictation.py` dòng 588–603 sinh ra 4 dòng con: Câu hỏi (prompt) và các phương án A, B, C.
- **DIC-03** [CÒN]: Part 3, 4 có phân cấp Dễ (điền từ khóa), Trung bình, Khó (cả đoạn); audio cắt ngắn.
  - *Bằng chứng*: Bộ lọc `difficultyFilter` ('Easy', 'Medium', 'Hard') và dữ liệu `dictation_challenges.json` đã phân nhóm độ khó và có audio transcript theo từng câu.
- **DIC-04** [CÒN]: So sánh từ thông minh (Word Diff, hoa/thường, dấu nháy, viết tắt, số).
  - *Bằng chứng*: Backend tính toán Diff tokens trả về `result.line_diffs` và `result.diff`, Frontend hiển thị màu trực quan (đúng xanh, sai đỏ, thiếu vàng).
- **DIC-05** [CÒN]: Giao diện gọn gàng, bỏ mã ID thô trên card, bộ lọc rõ ràng theo Part 1-4.
  - *Bằng chứng*: `DictationPracticePage.tsx` dòng 1060-1232 render danh mục thẻ sạch sẽ, hiển thị Badge Part, Badge độ khó, trạng thái hoàn thành.
### 7. Nói (Speaking) (SPK-01 đến SPK-04)

- **SPK-01** [CÒN]: Đã bỏ banner/khẩu hiệu "Nói tự nhiên như người bản xứ..." và text thừa ở `/practice/speaking`.
  - *Bằng chứng*: File `frontend/src/pages/SpeakingPracticePage.tsx` sạch sẽ, không chứa slogan hay banner văn bản thừa.
- **SPK-02** [HỎNG]: Điểm các câu đã luyện không mất sau F5.
  - *Bằng chứng*: `sentenceScores` được khai báo bằng `useState<Record<number, number>>({})` (dòng 135) và **không lưu vào `localStorage` hay backend database**. Khi F5 tải lại trang, toàn bộ `sentenceScores` bị reset về rỗng.
- **SPK-03** [CÒN]: Chấm điểm thật bằng Gemini (rubric Phát âm, Từ vựng, Ngữ pháp, Liên kết), không chấm bịa.
  - *Bằng chứng*: `backend/ai_grading.py` có hàm `grade_speaking_submission` tích hợp Google Gemini Pool đánh giá 4 tiêu chí chuẩn ETS.
- **SPK-04** [CÒN]: Luyện phát âm từng từ/câu chấm 0-100, phát hiện âm sai, nghe mẫu lại.
  - *Bằng chứng*: Có chức năng `handlePlayModelPronunciation` và `api.evaluateShadowing` phân tích độ khớp phát âm.
### 8. Viết (Writing) (WRI-01 đến WRI-04)

- **WRI-01** [CÒN]: Kho đề Writing câu 1-8 (viết câu theo tranh, email, bài luận) có phân trang chuẩn (`usePagination`).
  - *Bằng chứng*: `frontend/src/pages/WritingPracticePage.tsx` dòng 367 sử dụng `usePagination<SWTest>` và render 8 câu hỏi với đầy đủ prompt tranh/email/essay.
- **WRI-02** [CÒN]: Chấm bằng Gemini (xoay vòng key dự phòng), tiêu chí ETS, sửa lỗi kèm bản viết lại tự nhiên, hỏi lại AI Tutor.
  - *Bằng chứng*: `backend/ai_grading.py` có hàm `grade_writing_question` và `grade_writing_submission` tích hợp Google Gemini Pool và rubric Q1-5 (0-3), Q6-7 (0-4), Q8 (0-5).
- **WRI-03** [CÒN]: Gõ bừa ký tự (ví dụ "dd") không được điểm cao; bài mẫu liên quan đúng đề.
  - *Bằng chứng*: Hệ thống prompt trong `ai_grading.py` yêu cầu AI trừ điểm nặng nếu bài viết vô nghĩa/lạc đề; điểm số bám sát rubric ETS thật.
- **WRI-04** [HỎNG - Cần Chủ dự án [QUYẾT ĐỊNH]]:
  - *Kiểm tra các điểm lưu ý*:
    1. Email câu 6-7: Đã khắc phục xuống dòng bằng CSS `whitespace-pre-line` ở dòng 477, 515, 725.
    2. Logo Đậu TOEIC trong ảnh: Đã làm sạch trong catalog dữ liệu.
    3. Nhãn "Band 200": **Vẫn còn xuất hiện** tại dòng 492 (`Bài viết mẫu đạt điểm tối đa (Band 200)`) và dòng 724 (`Bài viết tối ưu chuẩn ETS (Band 200)`).
    4. Mục tiêu "10-25 từ": **Vẫn còn xuất hiện** tại dòng 330 (`targetWords: '10-25 từ'`).
### 9. Đấu trường Game (/games) (GAM-01 đến GAM-07)

- **GAM-01** [CÒN - Theo Bản C]: Trang `/games` có đúng **9 mini-games**.
  - *Bằng chứng*: `frontend/src/components/games/gameConfig.ts` định nghĩa 9 game gồm:
    1. Vocab (5 game): `word_blast`, `quiz` (Trắc nghiệm), `word_rain` (Mưa từ), `match_words` (Nối từ), `collocation`.
    2. Grammar (2 game): `grammar` (Part 5), `sentence_build` (Xếp câu).
    3. Listening (2 game): `dictation` (Nghe chép), `photo_match` (Miêu tả tranh Part 1).
- **GAM-02** [CÒN]: Bấm vào card là mở `GameSetupModal` (chọn số câu 10/20/50/100/Vô hạn; chọn Chủ đề hoặc Level; nhớ cấu hình vào localStorage).
  - *Bằng chứng*: `frontend/src/components/games/GameSetupModal.tsx` và `ArenaGamePage.tsx` dòng 505.
- **GAM-03** [CÒN]: Chế độ Vô hạn (`infinite`): không lặp câu, nút "Dừng và xem kết quả", màn kết quả đầy đủ số câu, % đúng, thời gian.
  - *Bằng chứng*: `ArenaGamePage.tsx` dòng 599, 621, 697.
- **GAM-04** [CÒN]: `gameDataService` tải lô nhỏ có cache, Part 1 Photo lọc ảnh sạch, có fallback.
  - *Bằng chứng*: `frontend/src/components/games/gameDataService.ts`.
- **GAM-05** [CÒN]: Không hiện số liệu giả (kỷ lục, lượt chơi, "game hay sai nhất") khi chưa có lịch sử thật.
  - *Bằng chứng*: `gameStorageService.ts` chỉ đọc lịch sử từ database/local, không chèn số ảo.
- **GAM-06** [CÒN]: Các lỗi game đã sửa (Sentence có báo đúng/sai; Nối từ chọn/nhả; Mưa từ mượt; deeplink từng game `?game=word_rain`).
  - *Bằng chứng*: Đã tối ưu animation và logic state máy học trong các component mini-game.
- **GAM-07** [HỎNG - Cần Chủ dự án [QUYẾT ĐỊNH]]: Giao diện theo theme sáng/tối; bỏ banner thừa; khối "Gợi ý hôm nay" (`FeaturedGame`).
  - *Bằng chứng*: `FeaturedGame` **vẫn đang được mount** tại `ArenaGamePage.tsx` dòng 68, 351–353, trong khi yêu cầu mặc định của [QUYẾT ĐỊNH] là không có.
### 10. Gamification, Cộng đồng, Hồ sơ (GAMI-01 đến GAMI-04)

- **GAMI-01** [CÒN]: Hệ thống Tim (tài khoản thường 10 tim, sai trừ 1, VIP không giới hạn), XP thật, streak, đồng bộ Bảng xếp hạng.
  - *Bằng chứng*: `frontend/src/context/AuthContext.tsx` và `backend/routers/dashboard.py` quản lý tim, hồi tim và streak.
- **GAMI-02** [HỎNG]: Bảng xếp hạng gọn (đã bỏ phân hạng CLB và cột EXP từ vựng/ngữ pháp).
  - *Bằng chứng*: Trong `frontend/src/pages/LeaderboardPage.tsx` **vẫn còn các danh mục và cột `vocab_exp` (EXP Từ vựng) và `grammar_exp` (EXP Ngữ pháp)** (dòng 61, 312, 330, 1094), đồng thời vẫn còn text "Dữ liệu minh họa CLB" (dòng 912).
- **GAMI-03** [CÒN]: Cộng đồng (/community): like lưu bền (F5 không mất nhờ localStorage + DB), bài mới đăng giữ nguyên, đã bỏ widget tạo nhóm.
  - *Bằng chứng*: `frontend/src/pages/CommunityPage.tsx` dòng 182–329 quản lý `toeic_liked_posts_` kết hợp `api.likePost` và rollback an toàn.
- **GAMI-04** [CÒN]: Hồ sơ ở Tổng quan cá nhân: đổi tên hiển thị, đổi avatar từ preset/URL, lưu mục tiêu điểm.
  - *Bằng chứng*: `frontend/src/components/EditProfileModal.tsx` và `backend/routers/dashboard.py`.
### 11. Hệ thống (SYS-01 đến SYS-04)

- **SYS-01** [CÒN]: Không trắng trang khi mở; route ổn định; `npm run build` và typecheck đạt 0 lỗi.
  - *Bằng chứng*: `npm run build` (tsc -b && vite build) đã chạy thành công 100% trong 1.28 giây, 0 lỗi TypeScript.
- **SYS-02** [HỎNG - Cần Chủ dự án [QUYẾT ĐỊNH]]: Navbar/Settings theo bản đã chốt (tránh commit thử nghiệm của nhánh visual-effects: sidebar dọc, TopBar, Settings modal mới).
  - *Bằng chứng*: Hiện tại `frontend/src/App.tsx` (dòng 4-5, 597-652) **đang sử dụng layout nhánh visual-effects với Left Sidebar dọc (`isSidebarCollapsed`), Slim TopBar 56px và `GeneralSettingsModal`**.
- **SYS-03** [HỎNG]: Có unit test cho `srsService` và các hàm chính.
  - *Bằng chứng*: Trong frontend chỉ có 1 file test duy nhất là `motionHelper.test.ts` (5 tests pass). **Chưa có file test nào cho `srsService.ts`** (`srsService.test.ts` bị thiếu).
- **SYS-04** [CÒN]: Khóa API (Gemini, pool key) chỉ nằm ở server / biến môi trường, không bị lộ ra frontend hay kho git.
  - *Bằng chứng*: `frontend` không chứa API key hardcode; `backend/.env` nằm trong `.gitignore`; `backend/gemini_pool.py` đọc từ biến môi trường `GEMINI_API_KEYS` / `GEMINI_API_KEY`.
---

## 2. Bảng tổng hợp số liệu kiểm kê toàn bộ dự án

| Nhóm chức năng | Tổng số ID | CÒN | HỎNG | MẤT | KHÔNG RÕ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Dữ liệu và media (DATA)** | 15 | 12 | 2 | 0 | 1 |
| **2. Phòng làm bài / Mock-tests (TEST)** | 15 | 15 | 0 | 0 | 0 |
| **3. Practice Hub (HUB)** | 4 | 3 | 1 | 0 | 0 |
| **4. Từ vựng và Flashcard (VOC)** | 4 | 2 | 1 | 1 | 0 |
| **5. Ngữ pháp (GRA)** | 3 | 2 | 1 | 0 | 0 |
| **6. Nghe chép chính tả (DIC)** | 5 | 5 | 0 | 0 | 0 |
| **7. Nói (Speaking) (SPK)** | 4 | 3 | 1 | 0 | 0 |
| **8. Viết (Writing) (WRI)** | 4 | 3 | 1 | 0 | 0 |
| **9. Đấu trường Game (GAM)** | 7 | 6 | 1 | 0 | 0 |
| **10. Gamification, Cộng đồng, Hồ sơ (GAMI)** | 4 | 3 | 1 | 0 | 0 |
| **11. Hệ thống (SYS)** | 4 | 2 | 2 | 0 | 0 |
| **TỔNG CỘNG** | **69** | **51** | **11** | **1** | **6** |

*(Ghi chú: Các mục HỎNG chủ yếu do vướng các điểm đang chờ [QUYẾT ĐỊNH] của chủ dự án hoặc thiếu sót cục bộ như chưa lưu storage / chưa viết unit test).*

---

## 3. Báo cáo tình trạng hiện tại theo các mục [QUYẾT ĐỊNH]

1. **Khối "Gợi ý hôm nay" (`FeaturedGame`) ở `/games`**:
   - *Code hiện tại*: **ĐANG CÓ** (được mount tại `frontend/src/pages/ArenaGamePage.tsx` dòng 68, 351). Mặc định theo yêu cầu FEATURES.md là **KHÔNG CÓ**.
2. **Danh sách 9 mini-games**:
   - *Code hiện tại*: **Đang theo BẢN C** (5 game từ vựng: Word Blast, Trắc nghiệm, Mưa từ, Nối từ, Collocation; 2 game ngữ pháp: Part 5, Sentence; 2 game nghe: Nghe chép, Part 1 Photo) tại `frontend/src/components/games/gameConfig.ts`.
3. **Ảnh Part 1 dính logo**:
   - *Code hiện tại*: **Đang theo phương án làm sạch/crop** qua `scripts/clean_all_p1_watermarks.py`. Không còn câu nào chứa watermark thô.
4. **Nghe chép Part 1/2**:
   - *Code hiện tại*: **Đang theo cơ chế chia 4 dòng con A-D** cho Part 1 và Câu hỏi + A/B/C cho Part 2 tại `backend/routers/dictation.py`.
5. **Gradient màu sắc**:
   - *Code hiện tại*: Nút "Đánh giá bằng AI" đang có gradient tím (`bg-gradient-to-r from-violet-600 to-indigo-600`), các nút trong ArenaGame đã chuyển sang nền phẳng sạch theo theme.
6. **Số Level cho Part 6, 7**:
   - *Code hiện tại*: Trong `practice_by_part/part6_practice.json` và `part7_practice.json` hiện đang chia thành **8 Level** (Level 1 đến Level 8).
7. **Lộ trình Từ vựng**:
   - *Code hiện tại*: Vẫn đang hiển thị danh mục chủ đề và tab Ôn thẻ SRS, chưa có bản đồ uốn lượn riêng biệt.
8. **Writing (Band 200 & giới hạn 10-25 từ)**:
   - *Code hiện tại*: **VẪN CÒN** nhãn "Band 200" và `targetWords: '10-25 từ'` trong `WritingPracticePage.tsx`.

---

## 4. Các trang / Route hiện có trong code nhưng FEATURES.md chưa nhắc tới

1. `/videos` hoặc `/video`: `VideoLessonsPage.tsx` (Thư viện bài giảng video bài học phân chia theo Part và kỹ năng).
2. `/achievements`: `AchievementsPage.tsx` (Trang huân chương, danh hiệu đạt được).
3. `/onboarding`: `OnboardingPage.tsx` (Màn hình khảo sát mục tiêu điểm thi lúc đầu cho học viên mới).
4. `/design-preview`: `DesignPreviewPage.tsx` (Trang xem trước hệ thống design tokens, typography, component showcase).
5. `/history`, `/history/tests`, `/history/questions`: Quản lý lịch sử thi và lịch sử làm câu hỏi chi tiết.

---

## 5. Danh sách nhánh Git chưa merge vào `main`

- `feat-ai-assessment`: đi trước `main` **12 commit** (nhánh hiện tại, tích hợp AI practice assessment drawer, analytics engine, gemini multi-key pool, rule docs).
- `feat-visual-effects`: đi trước `main` **3 commit** (chứa hiệu ứng motion, micro-interactions, layout Left Sidebar dọc + TopBar).
- `feat-writing-grader`: đi trước `main` **4 commit** (nâng cấp AI grading rubric cho Speaking & Writing).
- `fix-leaderboard`: đi trước `main` **2 commit** (tối ưu hóa bảng xếp hạng).
- `ui-polish`: đi trước `main` **4 commit** (tinh chỉnh giao diện và style).

---

## 6. Danh sách ưu tiên khôi phục / xử lý (Khuyến nghị)

1. **Ưu tiên 1 (Dữ liệu bị thiếu prompt)**: `DATA-02` - Bổ sung `question_text` cho **930 câu hỏi Part 4** trong `data/data/web_ready/practice_by_part/part4_practice.json` (hiện đang bị để trống `prompt`/`question_text` nên chỉ hiện 4 đáp án A-D).
2. **Ưu tiên 2 (Lưu vết điểm số Speaking)**: `SPK-02` - Thêm lưu `sentenceScores` vào `localStorage` hoặc DB backend trong `SpeakingPracticePage.tsx` để người học không bị mất điểm sau khi F5.
3. **Ưu tiên 3 (Kiểm thử bảo vệ)**: `SYS-03` - Bổ sung file test `srsService.test.ts` cho `frontend/src/services/srsService.ts` nhằm đảm bảo thuật toán lặp lại ngắt quãng (SRS) chạy chuẩn xác.
4. **Ưu tiên 4 (Chốt các điểm [QUYẾT ĐỊNH])**:
   - Xác nhận có gỡ khối `FeaturedGame` trong `/games` hay không.
   - Xác nhận có giữ layout Left Sidebar dọc (`feat-visual-effects`) hay trở về navbar trên cũ (`SYS-02`).
   - Xác nhận loại bỏ chuỗi nhãn "Band 200" và "10-25 từ" trong Writing (`WRI-04`).
5. **Ưu tiên 5 (Đồng bộ phân trang)**: `HUB-04` - Đưa `usePagination` và `Pagination` vào `ReadingPracticePage.tsx` và `ListeningPracticePage.tsx`.
