# TOEIC Practice Test Crawler & Downloader

Công c? t? d?ng thu th?p và phân lo?i tài li?u luy?n thi TOEIC (Full Test, Part 1–7, Audio MP3/WAV, ?nh d?, Ðáp án, L?i gi?i chi ti?t) t? các n?n t?ng:
1. **Ð?u TOEIC** (`dauenglish.com` / `dautoeic.vn`)
2. **Study4** (`study4.com`)

---

## M?c l?c
1. [Yêu c?u h? th?ng & Cài Python](#1-cài-python)
2. [Cài d?t thu vi?n](#2-pip-install--r-requirementstxt)
3. [Cài d?t Playwright Browser](#3-playwright-install)
4. [Ðang nh?p th? công khi c?n](#4-dang-nh?p-th?-công-n?u-c?n)
5. [Ch?y Discovery Mode](#5-ch?y-discovery)
6. [Ch?y Dry-Run (U?c tính d? li?u)](#6-ch?y-dry-run)
7. [Ch?y Crawler chính th?c](#7-ch?y-crawler)
8. [Ti?p t?c Crawl (Resume)](#8-resume)
9. [T?i l?i các file b? l?i (Retry Failed)](#9-retry-failed)
10. [Xu?t d? li?u (Export)](#10-export-d?-li?u)
11. [C?u trúc thu m?c t?i v?](#c?u-trúc-thu-m?c-t?i-v?)

---

### 1. Cài Python
- Yêu c?u: **Python 3.11 tr? lên** (ho?c 3.12+).
- Ki?m tra phiên b?n hi?n t?i:
  ```bash
  python --version
  ```

### 2. pip install -r requirements.txt
Cài d?t toàn b? các dependency c?n thi?t:
```bash
pip install -r requirements.txt
```

### 3. Playwright install
Cài d?t browser runtime cho Playwright (du?c dùng khi c?n load các trang render b?ng JavaScript và luu session dang nh?p):
```bash
python -m playwright install chromium
```

### 4. Ðang nh?p th? công n?u c?n
Ð?i v?i website yêu c?u dang nh?p (nhu Study4 d? m? phòng thi / luy?n t?p):
- Tool h? tr? m? c?a s? trình duy?t th?t (`headless=False`) d? b?n dang nh?p b?ng tài kho?n c?a chính mình:
  ```bash
  python crawler.py --site study4 --login
  ```
- Sau khi b?n dang nh?p thành công trên trình duy?t, quay l?i c?a s? terminal và nh?n **Enter**.
- Tr?ng thái phiên (cookies/local storage) s? du?c luu an toàn t?i `data/sessions/study4_storage_state.json` và tái s? d?ng t? d?ng ? t?t c? các l?n crawl sau, **không** luu m?t kh?u và **không** bypass CAPTCHA.

### 5. Ch?y Discovery
Xem tru?c cây danh m?c, b? suu t?p, danh sách d? và API c?a website tru?c khi t?i:
```bash
# Discovery Ð?u TOEIC
python crawler.py --site dautoeic --dry-run

# Discovery Study4
python crawler.py --site study4 --dry-run
```

### 6. Ch?y Dry-Run
Mô ph?ng quá trình quét toàn b? b? d?, bóc tách c?u trúc câu h?i và tính toán s? lu?ng media (Audio, ?nh, Tài li?u) mà **không t?i file v? dia**:
```bash
# Quét th? nghi?m t?t c?
python crawler.py --site all --dry-run

# Quét th? nghi?m 1 d? c? th?
python crawler.py --site dautoeic --limit 1 --dry-run
```

### 7. Ch?y Crawler
T? d?ng cào d? li?u câu h?i, sinh file d? offline và t?i toàn b? file media:

```bash
# Cào toàn b? 10 d? thi Ð?u TOEIC (2000 câu h?i kèm audio & ?nh)
python crawler.py --site dautoeic

# Cào th? nghi?m 1 d? d? ki?m tra c?u trúc thu m?c
python crawler.py --site dautoeic --limit 1

# Cào Study4
python crawler.py --site study4

# Cào c? 2 trang
python crawler.py --site all
```

**Tùy ch?nh t?c d? & Concurrency:**
```bash
# Ði?u ch?nh concurrency và delay d? tuân th? rate limit
python crawler.py --site dautoeic --concurrency 3 --delay 1.5
```

### 8. Resume
N?u quá trình t?i b? d?ng do m?t m?ng ho?c t?t máy, ch?y v?i c? `--resume`. Tool s? ki?m tra kích thu?c file và mã bam SHA-256 trên dia, t? d?ng b? qua các file dã hoàn thành mà không t?i l?i:
```bash
python crawler.py --site dautoeic --resume
```

### 9. Retry Failed
N?u có m?t s? file t?i b? l?i (timeout, m?ng ng?t quãng), ch? c?n ch?y l?nh sau d? t?i bù các file l?i ghi nh?n trong database:
```bash
python crawler.py --retry-failed
```

### 10. Export D? li?u
Xu?t toàn b? co s? d? li?u crawl ra d?nh d?ng JSON và CSV d? d? phân tích ho?c tích h?p vào app khác:
```bash
python crawler.py --export-json
```
Các file du?c t?o ra trong thu m?c `export/`:
- `export/catalog.json`: Danh m?c trang, b? suu t?p, bài thi, ph?n thi.
- `export/questions.json`: Toàn b? câu h?i chu?n hóa kèm các l?a ch?n (A, B, C, D), dáp án, gi?i thích.
- `export/media.json`: Danh m?c du?ng d?n và link t?i c?a t?ng file audio/?nh.
- `export/tests.csv`: B?ng t?ng h?p các bài thi d?ng CSV.

---

## C?u trúc thu m?c t?i v?

D? li?u du?c t? ch?c chu?n theo t?ng bài thi:

```
data/
+-- crawler.db               # SQLite database luu tr?ng thái và ch?ng trùng l?p
+-- raw/                     # D? li?u JSON/HTML thô t? API/website
+-- json/                    # D? li?u JSON câu h?i dã chu?n hóa
¦
+-- dautoeic/
¦   +-- Crack_TOEIC_Vol_2/
¦       +-- Test_1/
¦       ¦   +-- metadata.json       # Thông tin bài thi, th?i gian, s? câu
¦       ¦   +-- questions.json      # Toàn b? câu h?i, dáp án, gi?i thích
¦       ¦   +-- test.html           # Trình xem và luy?n thi Offline (m? b?ng trình duy?t)
¦       ¦   +-- audio/
¦       ¦   ¦   +-- part_1/         # 001_audio_xxx.mp3, ...
¦       ¦   ¦   +-- part_2/
¦       ¦   ¦   +-- part_3/
¦       ¦   ¦   +-- part_4/
¦       ¦   +-- images/             # 001_image_xxx.jpg, ...
¦       ¦   +-- documents/
¦       +-- Test_2/
¦
+-- study4/
    +-- TOEIC_LR_Collection_1/
        +-- Test_1/
        ¦   +-- metadata.json
        ¦   +-- questions.json
        ¦   +-- test.html
        ¦   +-- audio/
        ¦   +-- images/
        ¦   +-- documents/
        +-- ...
```

## Tính nang n?i b?t
- **Ch?ng trùng file (SHA-256 Deduplication):** T? d?ng phát hi?n các file audio/hình ?nh có cùng n?i dung qua mã bam SHA-256 d? không t?n bang thông và dung lu?ng dia.
- **H? tr? HTTP Range:** T? d?ng ti?p t?c t?i ph?n còn thi?u n?u file dang t?i d? dang.
- **Offline Test Viewer (`test.html`):** M?i thu m?c d? d?u có file `test.html` t? sinh, cho phép m? b?ng trình duy?t b?t k? d? nghe Audio t?ng câu, xem hình ?nh d? thi và ki?m tra dáp án/gi?i thích hoàn toàn không c?n k?t n?i m?ng.
- **An toàn & Minh b?ch:** Ghi log chi ti?t t?i `logs/crawler.log` và `logs/errors.jsonl`.
