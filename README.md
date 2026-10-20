# 🎯 TOEIC Master Platform (TOEIC Ra Trường)

> **Nền tảng luyện thi TOEIC trực tuyến toàn diện chuẩn format ETS, tích hợp AI Trợ giảng cá nhân hóa (Gemini Multi-Key Pool), Chấm điểm Speaking/Writing thông minh, Nghe chép chính tả & Luyện đề thực chiến.**

---

## 📌 Mục lục
- [Giới thiệu dự án](#-giới-thiệu-dự-án)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Kiến trúc hệ thống & Công nghệ](#-kiến-trúc-hệ-thống--công-nghệ)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Tài khoản Demo kiểm thử](#-tài-khoản-demo-kiểm-thử)
- [Hướng dẫn cài đặt & Chạy Local](#-hướng-dẫn-cài-đặt--chạy-local)
  - [1. Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
  - [2. Cài đặt Backend (FastAPI)](#2-cài-đặt-backend-fastapi)
  - [3. Cài đặt Frontend (React + Vite)](#3-cài-đặt-frontend-react--vite)
  - [4. Mô-đun Crawler & Xử lý dữ liệu (Tùy chọn)](#4-mô-đun-crawler--xử-lý-dữ-liệu-tùy-chọn)
- [Kiểm thử tự động (Automated Testing)](#-kiểm-thử-tự-động-automated-testing)
- [Hướng dẫn đẩy dự án lên GitHub](#-hướng-dẫn-đẩy-dự-án-lên-github)
- [Giấy phép (License)](#-giấy-phép)

---

## 📖 Giới thiệu dự án

**TOEIC Master Platform** là giải pháp EdTech hoàn chỉnh hỗ trợ sinh viên và người đi làm ôn luyện chứng chỉ tiếng Anh **TOEIC 2 Kỹ năng (Listening & Reading)** và **TOEIC 4 Kỹ năng (Speaking & Writing)**.

Dự án được xây dựng với mục tiêu:
1. **Mô phỏng trải nghiệm thi thật chuẩn ETS**: Đầy đủ 200 câu hỏi chia 7 Part, giới hạn thời gian nghiêm ngặt, bảng tính điểm chuẩn hóa ETS (10 - 990).
2. **Cá nhân hóa lộ trình bằng Trí tuệ Nhân tạo (AI)**: Đánh giá trình độ đầu vào (Placement Test), phân tích điểm mạnh - điểm yếu và tự động điều chỉnh trọng số lộ trình học tập thích ứng.
3. **Trợ giảng AI 24/7 (AI DeepTutor)**: Hỗ trợ giải thích ngữ pháp, từ vựng, transcript nghe và phân tích bẫy đề thi với trí nhớ ngữ cảnh (Context Memory).
4. **Hệ thống chấm điểm AI Speaking & Writing**: Tự động nhận diện giọng nói và bài viết, phân tích chi tiết theo 4 tiêu chí rubric chuẩn ETS.
5. **Cơ chế chống lỗi hiển thị tiếng Việt (Anti-Mojibake Guard)**: Chuẩn hóa 100% UTF-8 ở tầng Database, API Middleware và Client.

---

## ✨ Tính năng nổi bật

### 1. 📝 Thi thử Full Test (Mock Tests)
- Kho đề thi mô phỏng 100% định dạng đề thi TOEIC Quốc tế (ETS Format).
- Bộ đếm thời gian 120 phút, tự động lưu bài làm khi gặp sự cố, bảng câu hỏi điều hướng thông minh.
- Chấm điểm ngay lập tức kèm bảng điểm quy đổi ETS chuẩn xác.
- Xem lại chi tiết từng câu: Đáp án đúng, giải thích ngữ pháp, audio script, highlight từ khóa và dẫn chứng câu trả lời.

### 2. 🎯 Luyện tập chuyên sâu từng phần (Practice by Part)
- Luyện độc lập từng phần:
  - **Part 1**: Mô tả tranh (phân loại tranh 1 người, nhiều người, vật thể/phong cảnh).
  - **Part 2**: Hỏi đáp (Câu hỏi Wh-, Yes/No, câu hỏi gián tiếp, trần thuật).
  - **Part 3**: Đoạn hội thoại ngắn (kèm dẫn chứng hội thoại Evidence Highlight).
  - **Part 4**: Bài nói ngắn (thông báo, phát thanh, hướng dẫn).
  - **Part 5**: Hoàn thành câu (Ngữ pháp, từ loại, giới từ, liên từ).
  - **Part 6**: Điền đoạn văn (ngữ cảnh logic, chọn câu thích hợp).
  - **Part 7**: Đọc hiểu đoạn đơn, đoạn kép, đoạn ba (Multiple Passages).
- Lọc theo độ khó (Dễ - Trung bình - Khó) và lọc câu đã làm / chưa làm.

### 3. 🎧 Luyện nghe chép chính tả (Dictation Practice)
- Rèn luyện kỹ năng bắt âm chi tiết từng câu trong bài nghe Part 1 - Part 4.
- Công nghệ Word Diff so sánh độ khớp từng từ, tô màu trực quan (đúng/sai/thiếu).
- Tính năng gợi ý chữ cái đầu, điều chỉnh tốc độ audio (0.75x, 1.0x, 1.25x), lặp lại câu.

### 4. 🤖 Trợ lý học tập AI (AI DeepTutor & Gemini Pool)
- Tích hợp cụm **Multi-Key Google Gemini Pool** với cơ chế tự động xoay vòng key (Key Rotation), tự động hồi phục khi chạm giới hạn rate limit (429 Cooldown) và hỗ trợ fallback qua nhiều model (`gemini-2.5-flash`, `gemini-1.5-flash`, ...).
- Chat hỏi đáp thắc mắc ngữ pháp, cấu trúc câu ngay khi đang làm bài.
- Bảo mật tầng AI (AI Security): Bộ lọc chống Prompt Injection, làm sạch mã độc và xác thực JSON đầu ra.

### 5. 🗣️ Luyện thi TOEIC Speaking & Writing (SW)
- **Speaking Room**: Đọc văn bản, mô tả tranh, trả lời câu hỏi, đề xuất giải pháp, trình bày quan điểm. Hỗ trợ ghi âm trực tiếp và AI chấm phát âm, độ trôi chảy (Fluency), trọng âm và ngữ điệu.
- **Writing Room**: Viết câu theo tranh, trả lời email, viết bài luận thể hiện quan điểm (Opinion Essay). AI phân tích lỗi ngữ pháp, độ đa dạng từ vựng, tính mạch lạc và chấm điểm theo thang ETS.

### 6. 📊 Chẩn đoán đầu vào & Lộ trình thích ứng (Placement Test & Adaptive Path)
- Bài kiểm tra đầu vào 30 - 60 phút chẩn đoán toàn diện năng lực.
- Báo cáo radar chart trực quan điểm mạnh, vùng kiến thức cần cải thiện.
- Tự động sinh lộ trình học tập theo từng tuần (Roadmap Nodes) tương ứng mục tiêu (ví dụ: TOEIC 450, 650, 800+).

### 7. 🗂️ Từ vựng Flashcards & Ngữ pháp trọng tâm
- 3000 từ vựng TOEIC chia theo các chủ đề thực tế (Office, Marketing, Human Resources, Travel, Banking,...).
- Flashcards lật thẻ tương tác, theo dõi tiến độ từ đã thuộc / chưa thuộc.
- Thư viện bài giảng lý thuyết ngữ pháp TOEIC kèm bài tập thực hành củng cố.

### 8. 🏆 Động lực học tập (Gamification & Community)
- Hệ thống theo dõi chuỗi học tập hàng ngày (**Streak Counter**).
- Điểm kinh nghiệm (XP), bảng xếp hạng học viên theo tuần và theo tháng, tính năng cổ vũ (Cheer).
- Diễn đàn cộng đồng và nhóm học tập (Study Groups) trao đổi câu hỏi, chia sẻ tài liệu.

### 9. 💳 Nâng cấp hội viên VIP & Cổng thanh toán VietQR
- Tích hợp phương thức quét mã QR thanh toán tự động (VietQR Payload).
- Phân quyền hội viên đa cấp: **Guest** (Khách trải nghiệm), **Student** (Học viên tiêu chuẩn), **VIP Pro** (Không giới hạn tính năng & AI), **Admin** (Quản trị hệ thống).

### 10. 🛡️ Trang quản trị (Admin Dashboard)
- Quản lý ngân hàng câu hỏi, cập nhật đề thi mock test.
- Quản lý danh sách người dùng, phân quyền RBAC và theo dõi giao dịch nâng cấp VIP.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT - BROWSER                     │
│  React 19 + TypeScript + Vite + Tailwind CSS v4        │
│  Context API (Auth, Settings) | Lucide | Audio Players │
└───────────────────────────┬────────────────────────────┘
                            │ REST API / CORS
                            ▼
┌────────────────────────────────────────────────────────┐
│                 BACKEND - FASTAPI (ASGI)               │
│  ├── Security Headers & Anti-Mojibake Middleware      │
│  ├── In-Memory Rate Limiting                           │
│  ├── JWT Authentication & RBAC (Guest/Student/VIP/Admin)│
│  ├── Gemini Multi-Key Pool (Auto-rotation & Failover)  │
│  └── AI Grading & Security Guards                      │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy 2.0 ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│                   DATABASE & STORAGE                   │
│  ├── SQLite (platform.db) / PostgreSQL / MySQL         │
│  ├── Static Media Server (/media, /dautoeic_media)     │
│  └── JSON / CSV Practice Repositories                  │
└────────────────────────────────────────────────────────┘
```

### Công nghệ sử dụng:
- **Frontend**:
  - React 19, TypeScript
  - Vite 8.3 (Tốc độ khởi động siêu tốc)
  - Tailwind CSS v4, Lucide React, Morphicons
  - Canvas Confetti, DOMPurify (XSS Protection)
- **Backend**:
  - Python 3.11+
  - FastAPI (Hiệu năng cao, async I/O)
  - SQLAlchemy 2.0 ORM
  - Pydantic v2 (Xác thực dữ liệu schema chặt chẽ)
  - PyJWT & Passlib (Bcrypt hashing, JWT Token)
  - Uvicorn (ASGI Production Server)
- **AI Engine**:
  - Google Gemini API (Gemini 2.5 Flash / Flash Preview)
  - Hệ thống Pool Key xoay vòng tự động chịu tải cao
- **Data Engineering**:
  - Playwright, BeautifulSoup4, HTTPX, lxml, Tenacity

---

## 📁 Cấu trúc thư mục

```
toeicratruong/
├── backend/                        # Máy chủ REST API FastAPI
│   ├── routers/                    # Các API endpoint chuyên biệt
│   │   ├── auth.py                 # Đăng nhập, đăng ký, Google Auth, Demo login
│   │   ├── tests.py                # Quản lý đề thi Full Test & nộp bài
│   │   ├── practice.py             # Luyện tập theo từng Part (1-7)
│   │   ├── dictation.py            # Nghe chép chính tả & word diff
│   │   ├── sw.py                   # Luyện thi Speaking & Writing
│   │   ├── ai_tutor.py             # Chat với AI DeepTutor
│   │   ├── vocabulary.py           # Bộ từ vựng 3000 từ & Flashcards
│   │   ├── grammar.py              # Ngữ pháp TOEIC & trắc nghiệm
│   │   ├── placement.py            # Bài kiểm tra đầu vào & chẩn đoán
│   │   ├── learning_path.py        # Lộ trình học thích ứng cá nhân hóa
│   │   ├── leaderboard.py          # Bảng xếp hạng, XP & Cheers
│   │   ├── community.py            # Diễn đàn, bài đăng, nhóm học
│   │   ├── payments.py             # Thanh toán VietQR & gói VIP
│   │   ├── admin.py                # Dashboard quản trị viên
│   │   └── ...
│   ├── tests/                      # Bộ kiểm thử tự động (Unit & Integration)
│   ├── database.py                 # Khởi tạo kết nối SQLAlchemy DB
│   ├── models.py                   # Cấu trúc bảng Database (ORM)
│   ├── schemas.py                  # Pydantic schemas xác thực request/response
│   ├── gemini_pool.py              # Cụm quản lý xoay vòng Gemini API Keys
│   ├── ai_grading.py               # AI chấm điểm Speaking & Writing theo rubric ETS
│   ├── ai_placement.py             # AI chẩn đoán năng lực học viên
│   ├── ai_security.py              # Bộ lọc chống Prompt Injection & xác thực AI
│   ├── mojibake_guard.py           # Middleware chống lỗi font UTF-8 tiếng Việt
│   ├── rate_limit.py               # Middleware giới hạn tần suất request
│   ├── platform.db                 # Cơ sở dữ liệu SQLite đã được nạp sẵn dữ liệu
│   ├── requirements.txt            # Danh sách thư viện Python cần cài đặt
│   └── main.py                     # Entrypoint khởi chạy FastAPI app
│
├── frontend/                       # Ứng dụng giao diện Client React
│   ├── src/
│   │   ├── components/             # Các component tái sử dụng (AudioPlayer, Gate, Modals,...)
│   │   ├── pages/                  # Các trang màn hình chính (MockTests, Dictation, SW,...)
│   │   ├── context/                # AuthContext, SettingsContext
│   │   ├── services/               # Cấu hình gọi API & Local Storage
│   │   ├── types/                  # TypeScript interface definitions
│   │   ├── utils/                  # Tiện ích trích xuất dẫn chứng, làm sạch XSS
│   │   ├── App.tsx                 # Điều hướng chính ứng dụng
│   │   └── main.tsx                # Entry point ReactDOM
│   ├── package.json                # Danh sách dependencies Frontend
│   └── vite.config.ts              # Cấu hình Vite & API Proxy
│
├── data/                           # Mô-đun Crawler & xử lý dữ liệu đề thi
│   ├── core/                       # Trình tải, bộ bóc tách và xử lý âm thanh/ảnh
│   ├── sites/                      # Adapter bóc tách riêng từng nguồn
│   ├── crawler.py                  # Script chạy cào dữ liệu
│   └── README.md                   # Hướng dẫn chi tiết sử dụng bộ crawler
│
├── .gitignore                      # Cấu hình loại trừ file rác, file nặng và secrets
└── README.md                       # Tài liệu hướng dẫn dự án (File này)
```

---

## 🔑 Tài khoản Demo kiểm thử

Hệ thống đã chuẩn bị sẵn các tài khoản demo tương ứng với từng cấp độ phân quyền (RBAC) để tiện kiểm thử ngay lập tức:

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Quyền hạn nổi bật |
| :--- | :--- | :--- | :--- |
| **Student** | `student@toeicai.vn` | `password123` | Luyện tập các Part cơ bản, làm Mock Test, xem từ vựng, chat AI giới hạn |
| **VIP Pro** | `vip@toeicai.vn` | `password123` | Toàn quyền sử dụng Speaking/Writing AI, không giới hạn lượt hỏi AI Tutor, mở khóa toàn bộ kho đề |
| **Admin** | `admin@toeicai.vn` | `password123` | Truy cập Admin Dashboard, chỉnh sửa câu hỏi, quản lý người dùng, xem doanh thu |

> 💡 **Mẹo:** Bạn cũng có thể bấm nút **"Đăng nhập nhanh Demo"** ngay tại giao diện Đăng nhập trên website mà không cần gõ thủ công mật khẩu!

---

## 🚀 Hướng dẫn cài đặt & Chạy Local

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18.0 trở lên (khuyến nghị Node 20+ hoặc 22+).
- **Python**: Phiên bản 3.11 trở lên.
- **Git**: Đã cài đặt trên máy.

---

### 2. Cài đặt Backend (FastAPI)

1. Mở cửa sổ terminal, di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Tạo và kích hoạt môi trường ảo Python (khuyến nghị):
   - **Trên Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Trên macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

4. Cấu hình biến môi trường (Environment Variables):
   - Copy file cấu hình mẫu `.env.example` thành `.env`:
     ```bash
     cp .env.example .env     # Trên Linux/macOS
     copy .env.example .env   # Trên Windows CMD/PowerShell
     ```
   - Mở file `.env` và điền khóa API Google Gemini của bạn (hỗ trợ nhiều key cách nhau bằng dấu phẩy để tự động xoay vòng):
     ```env
     GEMINI_API_KEYS="AIzaSyYourGeminiApiKey1,AIzaSyYourGeminiApiKey2"
     JWT_SECRET="your-super-secret-jwt-key"
     ```

5. Khởi chạy máy chủ Backend:
   ```bash
   python main.py
   # hoặc:
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```
   - API Backend sẽ chạy tại: `http://127.0.0.1:8001`
   - Tài liệu tương tác Swagger UI: `http://127.0.0.1:8001/docs`
   - Tài liệu ReDoc: `http://127.0.0.1:8001/redoc`

---

### 3. Cài đặt Frontend (React + Vite)

1. Mở một cửa sổ terminal mới, di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```

2. Cài đặt các gói phụ thuộc (Dependencies):
   ```bash
   npm install
   ```

3. Khởi chạy máy chủ phát triển Frontend:
   ```bash
   npm run dev
   ```
   - Giao diện người dùng sẽ sẵn sàng tại: `http://localhost:5173`
   - Vite đã được cấu hình Proxy tự động chuyển các request `/api`, `/media`, `/dautoeic_media` sang cổng `8001` của backend.

---

### 4. Mô-đun Crawler & Xử lý dữ liệu (Tùy chọn)

Nếu bạn muốn tự thu thập thêm đề thi mới từ các nguồn học liệu:
```bash
cd data
pip install -r requirements.txt
python -m playwright install chromium
python crawler.py --site all --limit 1
```
*Xem hướng dẫn chi tiết tại `data/README.md`.*

---

## 🧪 Kiểm thử tự động (Automated Testing)

Dự án đi kèm bộ test case toàn diện phủ kín các nghiệp vụ cốt lõi (Xác thực, Phân quyền RBAC, Chống Mojibake, Rate Limit, Chấm điểm AI, Xử lý múi giờ Việt Nam, v.v.):

```bash
# Chạy toàn bộ test suites của backend
python -m pytest backend/tests/ -v

# Chạy riêng kiểm tra chuẩn mã hóa Tiếng Việt (Anti-Mojibake Guard)
python -m pytest backend/tests/test_mojibake_guard.py -v

# Chạy riêng kiểm tra phân quyền bảo mật (RBAC & VIP Access)
python -m pytest backend/tests/test_rbac_strict_verification.py -v

# Kiểm tra build Frontend & Linting
cd frontend
npm run lint
npm run build
```

---

## 📤 Hướng dẫn đẩy dự án lên GitHub

Dự án đã được cấu hình sẵn file `.gitignore` tiêu chuẩn, tự động loại trừ các file media âm thanh dung lượng lớn (> 3GB), cache và các file chứa mã khóa cá nhân để đảm bảo quá trình đẩy code lên GitHub luôn diễn ra nhanh chóng, an toàn và không bị vượt ngưỡng giới hạn 100MB của GitHub.

Thực hiện lần lượt các bước sau trên máy của bạn (sử dụng PowerShell hoặc Git Bash tại thư mục gốc `toeicratruong`):

### Bước 1: Khởi tạo Git tại thư mục dự án
```powershell
# Đảm bảo bạn đang đứng tại thư mục gốc của dự án:
cd C:\Users\truon\Downloads\CV\toeicratruong

# Khởi tạo repository cục bộ:
git init
```

### Bước 2: Kiểm tra trạng thái các file
```powershell
# Kiểm tra danh sách file sẽ được theo dõi (loại trừ file rác):
git status
```

### Bước 3: Đưa toàn bộ mã nguồn vào vùng chuẩn bị (Stage) và Commit
```powershell
# Thêm toàn bộ mã nguồn sạch vào commit:
git add .

# Tạo commit đầu tiên:
git commit -m "feat: initial commit - TOEIC Master Platform fullstack system"
```

### Bước 4: Đổi tên nhánh chính thành `main`
```powershell
git branch -M main
```

### Bước 5: Tạo một Repository mới trên GitHub
1. Truy cập [https://github.com/new](https://github.com/new).
2. Đặt tên Repository (Ví dụ: `toeic-master-platform` hoặc `toeicratruong`).
3. Để ở chế độ **Public** hoặc **Private** tùy ý.
4. **Không** tích chọn *"Initialize this repository with a README"* (vì chúng ta đã tạo sẵn README rồi).
5. Bấm nút **Create repository**.

### Bước 6: Liên kết Remote và Đẩy code lên GitHub
Thay thế `username` và `ten-repo` bằng đường dẫn GitHub của bạn:
```powershell
# Thêm địa chỉ remote GitHub (thay URL dưới bằng URL repo của bạn):
git remote add origin https://github.com/<username>/<ten-repo>.git

# Đẩy code lên nhánh main của GitHub:
git push -u origin main
```

*(Nếu đã từng push trước đó hoặc muốn đẩy các thay đổi tiếp theo sau này, bạn chỉ cần gõ:)*
```powershell
git add .
git commit -m "update: mô tả thay đổi của bạn"
git push
```

---

## 📜 Giấy phép (License)

Dự án được phát hành dưới giấy phép mã nguồn mở **MIT License**. Bạn được tự do sử dụng, chỉnh sửa và phát triển cho các mục đích học tập, nghiên cứu và xây dựng đồ án.

---

<p align="center">
  <b>TOEIC Master Platform &copy; 2026. Made with ❤️ for TOEIC Learners.</b>
</p>
