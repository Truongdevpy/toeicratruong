# QA_TEST_EXECUTION.md – Nhật Ký Chạy Kiểm Thử Tự Động

### Phiên kiểm thử: 2026-11-18 (Toàn diện hệ thống)

#### 1. Bước 1: Frontend TypeScript & Vite Production Build
- **Lệnh thực thi**: `npm --prefix frontend run build`
- **Kết quả**: `✓ 3847 modules transformed. Built cleanly in ~850ms.`
- **Trạng thái**: PASS (0 lỗi kiểu TypeScript).

#### 2. Bước 2: Frontend Unit & Regression Tests (Vitest)
- **Lệnh thực thi**: `npm --prefix frontend test`
- **Test files**:
  - `motionHelper.test.ts`: PASS
  - `grammarProgressService.test.ts`: PASS
  - `srsService.test.ts`: PASS
  - `evidenceExtractor.test.ts`: PASS
  - `vocabPath.test.ts`: PASS (VOC-01, VOC-02 12 Units / 48 Nodes)
- **Tổng số tests**: 18/18 PASS (100%).

#### 3. Bước 3: Data Integrity & Resilient Guard Tests
- **Lệnh thực thi**: `python scripts/run_data_tests.py`
- **Kết quả**:
  - `[PASS]` Audio resolution sanity guard (Part 1-4 confirmed playable).
  - `[PASS]` Part 3 prompt completeness (4680/4680 questions valid).
  - `[PASS]` Part 4 prompt completeness (3330/3330 questions valid - BUG-010 verified).
  - `[PASS]` Part 7 prompt completeness (6480/6480 questions valid).
  - `[PASS]` Vocabulary bank Vietnamese translations (5095/5095 words checked).
  - `[PASS]` Tests catalog unique IDs (407 unique tests).
  - `[PASS]` Clean users table in database (0 seed users).

#### 4. Bước 4: Features Manifest & Route Contract Test
- **Lệnh thực thi**: `python scripts/test_manifest.py`
- **Kết quả**: 65/65 tracked features valid (bao gồm VOC-01, VOC-02, DATA-01, HUB-01..04).
- **Trạng thái**: ALL MANIFEST DEFINITIONS VALID!

#### 5. Tổng thời gian thực thi trọn bộ: ~26.5 giây
