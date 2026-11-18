# FEATURES.md - Danh sách chức năng và lỗi đã sửa (nguồn sự thật)

Cách dùng: đặt file này ở thư mục gốc dự án. Mỗi mục có mã (ID). Agent kiểm kê phải điền trạng thái cho từng ID:
CÒN (hoạt động đúng) / HỎNG (có nhưng sai) / MẤT (không còn trong code) / KHÔNG RÕ.
Mọi trạng thái phải kèm bằng chứng (file, dòng, commit hoặc kết quả chạy). Không đoán.

Quy ước: mục có dấu [QUYẾT ĐỊNH] là chỗ các lần yêu cầu trước mâu thuẫn nhau. Xem phần cuối file.

---

## 1. Dữ liệu và media

- DATA-01 Deep link toàn app (routes.ts): URL theo path và query, Back/Forward đúng, F5 khôi phục đúng đề/Part/câu. Ví dụ /practice/mock-tests/:testId/part/:partNo/question/:qNo, /practice/writing?test=&q=, ?tab=duo, ?part=, ?q=. Mỗi game có link riêng. [Guard Test: e2e/smoke.spec.ts]
- DATA-02 Câu hỏi Part 3, 4, 7 có đủ đề bài (không chỉ 4 đáp án A-D). [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- DATA-03 Nhãn dạng bài chuẩn ETS cho 7 Part (không còn nhãn rập khuôn "Câu hỏi chi tiết"; Part 2 không gán nhãn phủ định sai). [Guard Test: scripts/run_data_tests.py]
- DATA-04 "Từ vựng quan trọng trong câu": vocab_helper có nghĩa tiếng Việt, IPA, ví dụ và dịch; không còn kiểu "Tiếng Việt : Tiếng Việt"; không hiện nhãn dịch thừa khi câu không có từ vựng. [Guard Test: scripts/run_data_tests.py]
- DATA-05 Part 1: ảnh không dính logo (tooich.com / "Đậu TOEIC"). [QUYẾT ĐỊNH] loại câu hay crop. [Guard Test: scripts/run_data_tests.py]
- DATA-06 Phân loại Part 1: Một người / Nhiều người / Tả cảnh / Tả vật (đã chia lại, không còn lệch 335/388 vào tả vật). [Guard Test: scripts/run_data_tests.py]
- DATA-07 Audio: mã hóa %20 trong media_resolver.py (160/160 file phát được); audio Part 1 cắt thành từng câu (không còn file 50 phút); Part 2 không cắt sát đầu câu; có tùy chọn bỏ đoạn đọc hướng dẫn đầu giờ. [Guard Test: scripts/run_data_tests.py]
- DATA-08 Không còn lỗi Mojibake UTF-8 (Reading Part 6/7, Dictation, thông báo). [Guard Test: scripts/run_data_tests.py]
- DATA-09 Số câu hiển thị ngoài danh mục khớp số câu thực tế khi vào làm (từng lệch 700-893 vs 500). [Guard Test: scripts/run_data_tests.py]
- DATA-10 Chia Level đều cho 7 Part: Nghe/Đọc Level 1-4; Part 6, 7 theo 8 level. [QUYẾT ĐỊNH] 4 hay 8 level. [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- DATA-11 Mock-tests: không đề trùng ID/nội dung, phân loại theo năm, tab "Đề thi (200)", sidebar "Đề thi". [Guard Test: scripts/run_data_tests.py]
- DATA-12 Tích hợp đề cào (dau_crack-toeic, study4_*, tooich_raw 80 đề): đường dẫn media đúng; có dictation_challenges.json, vocabulary_bank.json, tests_catalog.json. [Guard Test: scripts/run_data_tests.py]
- DATA-13 Đề thi thử bỏ các đề Part 1 dính logo nhưng vẫn giữ Part 2-7 ở phần luyện tập. [Guard Test: scripts/run_data_tests.py]
- DATA-14 Kho từ vựng khoảng 5.000 từ, 12 chủ đề, 3 tầng (Chủ đề, Nhóm nhỏ, Bài 6-8 từ). Số từ mỗi chủ đề khớp 100% giữa Kho từ vựng, Game và Lộ trình. [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- DATA-15 Không dữ liệu ảo: đã xóa seed users; Bảng xếp hạng và widget "Top tích cực tuần này" dùng dữ liệu thật (users, user_profiles, question_attempts). [Guard Test: scripts/run_data_tests.py]

## 2. Phòng làm bài / Mock-tests

- TEST-01 Giao diện đổi theo từng Part (effectiveGroups), không ép tất cả thành Part 1. [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-02 QuestionImage chỉ hiện ở Part 1, các Part khác không có khung ảnh lỗi. [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-03 Part 1: ẩn transcript/lời thoại đến khi xem giải thích. Part 2: ẩn chữ câu hỏi, chỉ 3 đáp án A-B-C, dòng "Nghe và chọn câu trả lời đúng nhất". [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-04 Part 3, 4: cụm 3 câu cho 1 audio, transcript chỉ hiện sau khi nộp, sang bài kế tiếp nhảy đúng số (ví dụ 10-12 rồi 13). [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-05 Part 6 (4 câu/đoạn), Part 7 (2-5 câu/đoạn): chia đôi màn hình, bài đọc bên trái, câu hỏi bên phải; cleanOptionText hiện đúng chữ đáp án. [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-06 Drawer danh sách câu hiển thị theo dải (32-34, 131-134, 147-150). [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-07 Audio tự phát khi chuyển câu (đã mở khóa AudioContext). [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-08 Bảng câu hỏi có trạng thái đã làm (đúng xanh, sai đỏ), tự nhảy tới câu chưa làm; có lọc câu sai và nút xem toàn bộ câu sai. [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-09 Thoát giữa chừng hiện hộp thoại "Lưu tiến độ?" (Có/Không); lần sau học tiếp đúng vị trí (Checkpoint). [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- TEST-10 Focus Mode toàn màn hình khi vào bài; rời trang rồi chọn đề mới không bị kẹt state cũ. [Guard Test: e2e/smoke.spec.ts]
- TEST-11 Mở bài nhanh (in-memory cache, dưới 50ms); không còn màn "Đang chuẩn bị đề thi..." xoay lâu; không còn chữ Duolingo ở loading. [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- TEST-12 Dẫn chứng (evidence) Part 7: highlight đúng câu chứa đáp án, không cụt, không lan sang câu sau; hội thoại chat/email xuống dòng đúng (không còn \n\n thô). [Guard Test: frontend/src/utils/evidenceExtractor.test.ts]
- TEST-13 Placement test (Đánh giá năng lực): không lộ transcript, đủ số câu đã chọn, nhóm câu hiển thị đủ, audio tự phát, nộp trắng không được phân tích điểm mạnh. [Guard Test: e2e/smoke.spec.ts]
- TEST-14 Nút "Chấm bài AI" ở tổng quan và "Giải thích bằng AI" cho Part 1-7 (Part 1 dùng Vision + transcript chuẩn; kết quả gọn, render Markdown). [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- TEST-15 Hỏi đáp AI Tutor ngay tại câu hỏi (tự nhận câu hiện tại). [Guard Test: e2e/smoke.spec.ts]

## 3. Practice Hub (Nghe, Đọc)

- HUB-01 Nút "Đánh giá bằng AI" ở hàng tiêu đề cấp độ: drawer gồm điểm mạnh, điểm yếu ưu tiên (kèm nguyên nhân), mẫu thói quen, kế hoạch 7 ngày; ngưỡng dữ liệu nghiêm ngặt (số liệu do server tính, AI không bịa); nút "Hỏi Gia sư AI về kết quả này". [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- HUB-02 Bộ phân loại dạng bài hiển thị ngoài danh mục Part 6, 7; đã bỏ lọc theo năm. [Guard Test: e2e/smoke.spec.ts]
- HUB-03 Footer chỉ ở trang chủ (/), các trang con không có. [Guard Test: e2e/smoke.spec.ts]
- HUB-04 Phân trang chuẩn (usePagination, Pagination) đồng bộ mọi tab. [Guard Test: e2e/smoke.spec.ts]

## 4. Từ vựng và Flashcard

- VOC-01 Lộ trình Chinh phục Từ vựng (/practice/vocabulary): bản đồ uốn lượn, tim, XP, sao, mở khóa tuần tự, checkpoint 5-10 từ, bài đa dạng (flashcard, nghe chọn nghĩa, gõ từ, nối từ, trắc nghiệm), tự cuộn tới điểm học hiện tại, lưu tiến trình. Tiêu đề "Lộ trình Chinh phục Từ vựng TOEIC". Có nút chuyển sang "Tra cứu chi tiết". Không còn chữ "Duolingo" trong giao diện. [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- VOC-02 Bước "Luyện đọc từ": micro, Web Speech API + MediaRecorder, chấm 0-100, đạt từ 70, thử lại tối đa 3 lần, xử lý ngoại lệ (không có micro, ồn, im), phím Space để thu và Enter để tiếp. [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- VOC-03 Lưu từ vựng: giao diện cập nhật ngay (không cần F5), nhớ từ thuộc Part nào, có nút "Xóa tất cả", không bắt buộc 10 từ. [Guard Test: frontend/src/services/srsService.test.ts]
- VOC-04 Flashcard SRS (/practice/flashcards): lật thẻ, đánh giá 1-4, lọc chủ đề, phiên 10/20/tất cả, phát âm, đánh dấu sao. [Guard Test: frontend/src/services/srsService.test.ts]

## 5. Ngữ pháp

- GRA-01 Lộ trình Ngữ pháp (DuolingoPathView) là chế độ mặc định: node theo thứ tự Lý thuyết, Nhận diện, Bẫy đề ETS, Vận dụng, Checkpoint; mở khóa tuần tự; tự cuộn tới bài đang học; Học vượt (đạt từ 80% mở khóa); tim và XP. Menu chỉ ghi "Ngữ pháp"; đã bỏ banner "Kho Ngữ Pháp Thực Chiến". [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- GRA-02 Modal bài học (TheoryCardSwiper, DuolingoPracticeModal, DuolingoInteractiveExercise): tràn viền, thẻ lý thuyết, trắc nghiệm / điền từ / sắp xếp câu, tự phát âm khi sang câu mới. Bài sắp xếp: bấm một từ thì từ đó biến khỏi danh sách dưới và kéo thả sắp xếp lại được. [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- GRA-03 SRS: DailyReviewModal, chu kỳ 1, 3, 7, 14, 30 ngày; có unit test srsService. [Guard Test: frontend/src/services/srsService.test.ts]

## 6. Nghe chép chính tả (/practice/dictation)

- DIC-01 Part 1: ảnh, 4 dòng nghe riêng A-D, ô nhập riêng; chế độ Dễ (điền từ khóa) và Khó (chép cả câu). [QUYẾT ĐỊNH] cách định nghĩa chép Part 1/2. [Guard Test: e2e/smoke.spec.ts]
- DIC-02 Part 2: ô chép câu hỏi + 3 ô A-C, có chế độ bẫy âm (echo word). [Guard Test: e2e/smoke.spec.ts]
- DIC-03 Part 3, 4: Dễ (điền 8-15 từ khóa), Trung bình (từng câu/nhân vật), Khó (nguyên đoạn có gợi ý chữ cái đầu); audio cắt ngắn, không bắt chép đoạn dài. [Guard Test: e2e/smoke.spec.ts]
- DIC-04 So sánh từ thông minh (hoa/thường, dấu nháy, I'm = I am, 3 = three). [Guard Test: e2e/smoke.spec.ts]
- DIC-05 Giao diện: bỏ mã ID trên thẻ, chỉ một hàng lọc "PART: Tất cả 1-4 | 1 | 2 | 3 | 4", phân trang chuẩn. [Guard Test: e2e/smoke.spec.ts]

## 7. Nói (Speaking)

- SPK-01 Đã bỏ banner/khẩu hiệu "Nói tự nhiên như người bản xứ..." và text thừa ở /practice/speaking. [Guard Test: e2e/smoke.spec.ts]
- SPK-02 Điểm các câu đã luyện không mất sau F5. [Guard Test: frontend/src/services/srsService.test.ts]
- SPK-03 Chấm điểm thật bằng Gemini (rubric Phát âm, Từ vựng, Ngữ pháp, Liên kết), không chấm bịa. [Guard Test: backend/tests/test_gemini_keys_and_grading.py]
- SPK-04 Luyện phát âm từng từ chấm 0-100, phát hiện âm sai, nghe mẫu lại. [Guard Test: e2e/smoke.spec.ts]

## 8. Viết (Writing)

- WRI-01 Kho đề Writing câu 1-8 (viết câu theo tranh, email, bài luận) có phân trang chuẩn. [Guard Test: e2e/smoke.spec.ts]
- WRI-02 Chấm bằng Gemini (xoay vòng key dự phòng), tiêu chí ETS, sửa lỗi kèm bản viết lại tự nhiên, nút hỏi lại AI Tutor về điểm bị trừ. [Guard Test: backend/tests/test_gemini_keys_and_grading.py]
- WRI-03 Gõ bừa ký tự (ví dụ "dd") không được điểm cao; bài mẫu liên quan đúng đề. [Guard Test: backend/tests/test_gemini_keys_and_grading.py]
- WRI-04 Kiểm tra lại ngay: email câu 6-7 từng hiện chuỗi "\n" thô; ảnh Writing câu 1-3 từng còn logo "Đậu TOEIC"; nhãn "Band 200" cho từng câu; mục tiêu "10-25 từ". [Guard Test: e2e/smoke.spec.ts]

## 9. Đấu trường Game (/games)

- GAM-01 Trang /games có 9 mini-games. [QUYẾT ĐỊNH] danh sách chuẩn (3 bản khác nhau ở cuối file). [Guard Test: e2e/flows.spec.ts]
- GAM-02 Bấm vào card là mở GameSetupModal (modal desktop, bottom-sheet mobile; Tab, Enter, Esc); không còn nút "So tài" / "Tự luyện" (code PvP vẫn giữ, không xóa). Chọn số câu 10/20/50/100/Vô hạn; chọn Chủ đề thật (12 chủ đề kèm số từ) hoặc Part/level; "Từ đã lưu" và "Từ cần ôn (SRS)" làm mờ kèm lý do khi chưa có dữ liệu; checkbox bật/tắt gợi ý; nhớ cấu hình bằng localStorage (try/catch). [Guard Test: e2e/flows.spec.ts]
- GAM-03 Chế độ Vô hạn: không lặp câu tới khi hết bộ, nút "Dừng và xem kết quả", màn kết quả (số câu, đúng, %, điểm, thời gian). [Guard Test: e2e/flows.spec.ts]
- GAM-04 gameDataService: tải lô nhỏ có cache; đáp án nhiễu cùng chủ đề và loại từ; Nối từ đủ 4 cặp/vòng không lặp; Part 1 Photo bỏ câu lỗi ảnh/audio; fallback arenaGamesData.json kèm thông báo "Đang dùng bộ từ rút gọn". [Guard Test: e2e/flows.spec.ts]
- GAM-05 Không hiện số liệu giả (kỷ lục, lượt chơi, "game hay sai nhất") khi chưa có lịch sử thật. [Guard Test: e2e/flows.spec.ts]
- GAM-06 Lỗi game đã sửa: Sentence có báo đúng/sai; Nối từ chọn/nhả như Quizlet; Mưa từ mượt, chữ rơi không giật; đáp án trắc nghiệm không nảy vị trí; mỗi game có deeplink riêng. [Guard Test: e2e/smoke.spec.ts]
- GAM-07 Giao diện: theo theme sáng/tối (useSettings), không còn nền đen cố định; bỏ banner và dòng chữ "Đấu trường Gamification TOEIC"; 3 nhóm (Từ vựng và cụm từ, Ngữ pháp và đặt câu, Kỹ năng nghe và hình ảnh); 1/2/3 cột theo mobile/tablet/desktop; game toàn màn hình. [QUYẾT ĐỊNH] khối "Gợi ý hôm nay", gradient. [Guard Test: e2e/flows.spec.ts]

## 10. Gamification, Cộng đồng, Hồ sơ

- GAMI-01 Tim: tài khoản thường 10 tim (sai trừ 1, hết thì chờ hồi hoặc VIP), VIP không giới hạn; XP thật, streak, đồng bộ Bảng xếp hạng. [Guard Test: frontend/src/services/grammarProgressService.test.ts]
- GAMI-02 Bảng xếp hạng gọn: đã bỏ phân hạng CLB (Master/Bứt Phá/Khởi Động) và các cột EXP từ vựng/ngữ pháp rối. [Guard Test: e2e/smoke.spec.ts]
- GAMI-03 Cộng đồng (/community): like lưu bền (F5 không mất, không like lại), bài mới đăng không mất sau F5, đã bỏ widget "Nhóm học tập mục tiêu" và modal tạo nhóm. [Guard Test: e2e/flows.spec.ts]
- GAMI-04 Hồ sơ ở Tổng quan cá nhân: đổi tên hiển thị và avatar; lọc từ tục tĩu và ảnh không phù hợp. [Guard Test: e2e/smoke.spec.ts]

## 11. Hệ thống

- SYS-01 Không trắng trang khi mở; route ổn định; npm run build và typecheck đạt 0 lỗi. [Guard Test: e2e/smoke.spec.ts]
- SYS-02 Navbar/Settings theo bản đã chốt (không dính commit thử nghiệm nhánh visual-effects: sidebar dọc, TopBar, Settings modal mới). [QUYẾT ĐỊNH] xác nhận bản đang dùng. [Guard Test: Đang chờ hoàn thiện ở Đợt 2/3]
- SYS-03 Có unit test cho srsService và các hàm chính. [Guard Test: frontend/src/services/srsService.test.ts]
- SYS-04 Khóa API (Gemini, pool key) chỉ nằm ở server/biến môi trường, không có trong repo hay lịch sử git. [Guard Test: scripts/run_data_tests.py]

---

## Chỗ mâu thuẫn cần chủ dự án quyết định (agent KHÔNG tự chọn)

1. Khối "Gợi ý hôm nay" (FeaturedGame) ở /games: các lần yêu cầu vừa xây vừa gỡ. Lần mới nhất là gỡ. Mặc định: KHÔNG có.
2. Danh sách 9 mini-games có 3 phiên bản khác nhau:
   - Bản A: Word Rain, Word Blast, Quiz Speedrun, Match Words, Dictation Sprint, Sentence Build, Photo Match, Collocation Master, Grammar Speed.
   - Bản B: Flashcard Blitz, Word Rain, Sentence Builder, Photo Match, Grammar Boss, Listening Drop, Collocation Dash, Part 2 Rapid Fire, Vocab Memory.
   - Bản C: Trắc nghiệm, Mưa từ, Nối từ, Bắn chữ, Collocation, Miêu tả tranh Part 1, Xếp câu, Ngữ pháp Part 5, Nghe chép chính tả.
   Cần chốt một danh sách duy nhất, đúng với code đang chạy.
3. Ảnh Part 1 dính logo: một yêu cầu là loại bỏ hết câu dính logo, yêu cầu khác là crop bằng script. Cần chốt (ưu tiên crop, câu không crop được thì loại).
4. Nghe chép Part 1/2: một yêu cầu là 4 dòng A-D, một yêu cầu là "Part 2 chỉ chép câu hỏi, Part 1 chỉ chép câu mô tả đúng". Cần chốt luật chơi.
5. Gradient: Game bỏ gradient tím-xanh trên nút, nhưng nút "Đánh giá bằng AI" yêu cầu gradient tím. Cần chốt phạm vi.
6. Level: 4 level hay 8 level cho Part 6, 7 (Level 1-4 vs 1-8).
7. Lộ trình Từ vựng: cây bản đồ là mặc định, "Tra cứu chi tiết" là chế độ phụ (đã từng bị đảo ngược nhầm).
8. Writing: giữ hay bỏ giới hạn "10-25 từ" và nhãn "Band 200" (xem WRI-04).