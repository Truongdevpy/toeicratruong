import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Clock,
  Search,
  CheckCircle2,
  ArrowRight,
  X,
  Maximize2,
  Minimize2,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';

interface VideoLesson {
  id: string;
  youtubeId: string;
  title: string;
  category: 'listening' | 'reading' | 'grammar' | 'vocab' | 'tips';
  part: string;
  duration: string;
  level: string;
  views: number;
  thumbnailUrl: string;
  videoUrl: string;
  instructor: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
}

const VIDEO_LESSONS: VideoLesson[] = [
  {
    "id": "vid-01",
    "youtubeId": "iKyQzEsil3E",
    "title": "Chiến thuật làm bài thi TOEIC Part 1| Anh ngữ Ms Hoa",
    "category": "listening",
    "part": "Part 1",
    "duration": "21:35",
    "level": "Mọi trình độ (0 - 990)",
    "views": 48200,
    "thumbnailUrl": "https://img.youtube.com/vi/iKyQzEsil3E/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/iKyQzEsil3E?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Phương pháp quan sát hành động chủ ngữ, bẫy thì hiện tại tiếp diễn với bị động (being + V3) và các bẫy đồ vật trong tranh không có người.",
    "keyPoints": [
      "Tranh 1 người: Tập trung vào động từ miêu tả hành động của tay, mắt và tư thế cơ thể",
      "Tranh đồ vật: Cảnh giác cao độ với bẫy 'being + V3' khi không có người thao tác",
      "Triệt tiêu ngay các đáp án nhắc đến danh từ không hề xuất hiện trong ảnh"
    ],
    "tags": [
      "Part 1",
      "Listening",
      "Tranh người",
      "Bẫy Being"
    ]
  },
  {
    "id": "vid-02",
    "youtubeId": "XsKJQtrUsJw",
    "title": "[Góc TOEIC] Part 1- Tranh Tả Vật: Tưởng dễ thật mà sai dập mật...!",
    "category": "listening",
    "part": "Part 1",
    "duration": "16:40",
    "level": "Căn bản (350 - 650)",
    "views": 29400,
    "thumbnailUrl": "https://img.youtube.com/vi/XsKJQtrUsJw/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/XsKJQtrUsJw?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Daily Toeic & Business English with Lucy",
    "summary": "Chiến thuật xử lý dạng tranh miêu tả đồ vật và phong cảnh tĩnh: nhận diện giới từ chỉ nơi chốn, cấu trúc đảo ngữ và trạng thái tĩnh.",
    "keyPoints": [
      "Tập trung nghe chủ ngữ và vị trí đồ vật trong không gian (on, under, between)",
      "Phân biệt giữa trạng thái (state) và hành động (action) đang diễn ra",
      "Các động từ hay gặp: be arranged, be displayed, be stacked"
    ],
    "tags": [
      "Part 1",
      "Listening",
      "Tranh vật",
      "Đồ đạc"
    ]
  },
  {
    "id": "vid-03",
    "youtubeId": "tYvgh5q0cfo",
    "title": "Từ vựng TOEIC Listening | Part 1",
    "category": "listening",
    "part": "Part 1",
    "duration": "24:15",
    "level": "Mọi trình độ (0 - 990)",
    "views": 53100,
    "thumbnailUrl": "https://img.youtube.com/vi/tYvgh5q0cfo/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/tYvgh5q0cfo?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Tổng hợp 150 động từ và cụm danh từ tần suất xuất hiện trên 90% trong 6 câu tranh ảnh mở đầu đề thi Listening.",
    "keyPoints": [
      "Nhóm từ hành động văn phòng: typing, reviewing documents, filing papers",
      "Nhóm từ hoạt động ngoài trời: walking along, crossing the street, boarding a vehicle",
      "Luyện nghe nhận diện âm đuôi và phát âm chuẩn để không bị nghe nhầm"
    ],
    "tags": [
      "Part 1",
      "Từ vựng",
      "Listening",
      "Hành động"
    ]
  },
  {
    "id": "vid-04",
    "youtubeId": "MsSIirAM4o0",
    "title": "Mẹo làm bài Part 2 TOEIC không phải ai cũng biết | Ms Hoa TOEIC",
    "category": "listening",
    "part": "Part 2",
    "duration": "28:50",
    "level": "400 - 750+",
    "views": 61200,
    "thumbnailUrl": "https://img.youtube.com/vi/MsSIirAM4o0/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/MsSIirAM4o0?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Mẹo bắt từ để hỏi đầu câu (Who, Where, When, Why, How, What): phương pháp loại trừ đáp án Yes/No và bẫy lặp từ.",
    "keyPoints": [
      "Câu hỏi Wh- tuyệt đối KHÔNG chọn câu trả lời bắt đầu bằng Yes/No/Sure",
      "Who -> Nghe tên người, chức vụ, bộ phận phòng ban đảm nhiệm",
      "When -> Nghe mốc thời gian; Where -> Nghe địa điểm, phòng ban"
    ],
    "tags": [
      "Part 2",
      "Wh-questions",
      "Listening",
      "Loại trừ"
    ]
  },
  {
    "id": "vid-05",
    "youtubeId": "hy3C6lv_Okw",
    "title": "Cách tránh bẫy trong TOEIC Part 2 (Phần 2) | Ms Hoa TOEIC",
    "category": "listening",
    "part": "Part 2",
    "duration": "22:30",
    "level": "500 - 850+",
    "views": 44800,
    "thumbnailUrl": "https://img.youtube.com/vi/hy3C6lv_Okw/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/hy3C6lv_Okw?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Bóc tách các bẫy tinh vi nhất trong Part 2: bẫy từ đồng âm khác nghĩa, bẫy lặp từ khóa và chiến thuật chọn câu trả lời gián tiếp.",
    "keyPoints": [
      "85% đáp án lặp lại nguyên văn từ xuất hiện trong câu hỏi là BẪY SAI",
      "Bẫy từ phát âm na ná (similar sound): coffee/copy, plan/plane",
      "Câu trả lời gián tiếp né tránh thường là đáp án đúng"
    ],
    "tags": [
      "Part 2",
      "Bẫy lặp từ",
      "Listening",
      "Đồng âm"
    ]
  },
  {
    "id": "vid-06",
    "youtubeId": "VMBqJ_gOrjU",
    "title": "Câu hỏi lựa chọn trong P2 TOEIC là những câu có từ or.  #toeiconline #ets2024 #ets2024 #toeiconline",
    "category": "listening",
    "part": "Part 2",
    "duration": "14:20",
    "level": "450 - 700",
    "views": 31500,
    "thumbnailUrl": "https://img.youtube.com/vi/VMBqJ_gOrjU/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/VMBqJ_gOrjU?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "TOEIC Thầy Quý",
    "summary": "Quy tắc xử lý câu hỏi lựa chọn có từ nối 'OR': nhận diện cách trả lời chọn 1 trong 2, chọn cả hai hoặc từ chối cả hai.",
    "keyPoints": [
      "Câu hỏi có 'OR' thường không trả lời bằng Yes/No",
      "Cách trả lời phổ biến: 'Either is fine', 'Neither', 'Whichever you prefer'",
      "Chú ý ngữ điệu lên ở vế đầu và xuống ở vế cuối"
    ],
    "tags": [
      "Part 2",
      "Câu hỏi Or",
      "Listening",
      "Lựa chọn"
    ]
  },
  {
    "id": "vid-07",
    "youtubeId": "laqVaGCAOYU",
    "title": "CHUỖI BÀI GIẢNG TOEIC 2 KỸ NĂNG - Dạng câu trần thuật Listening TOEIC Part 2 - Tập 8 | Ms Hoa TOEIC",
    "category": "listening",
    "part": "Part 2",
    "duration": "19:10",
    "level": "550 - 850+",
    "views": 37600,
    "thumbnailUrl": "https://img.youtube.com/vi/laqVaGCAOYU/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/laqVaGCAOYU?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Chiến thuật xử lý câu trần thuật (Statements): nhận diện dạng câu không dùng từ để hỏi mà đưa ra nhận xét, phàn nàn hoặc yêu cầu.",
    "keyPoints": [
      "Câu trần thuật yêu cầu phản hồi phù hợp với ngữ cảnh thực tế",
      "Thường phản hồi bằng câu đồng tình, giải thích nguyên nhân hoặc đưa ra giải pháp",
      "Cần hiểu trọn vẹn ý câu thay vì chỉ bắt từ khóa đơn lẻ"
    ],
    "tags": [
      "Part 2",
      "Câu trần thuật",
      "Listening",
      "Statements"
    ]
  },
  {
    "id": "vid-08",
    "youtubeId": "EBV1Z1JK3Sg",
    "title": "BÍ KÍP MAX ĐIỂM NGHE LISTENING TOEIC PART 3 || CẬP NHẬT ĐỀ TOEIC 2025 || MS THẮM TOEIC (VIDEO 1)",
    "category": "listening",
    "part": "Part 3",
    "duration": "32:45",
    "level": "500 - 850+",
    "views": 78900,
    "thumbnailUrl": "https://img.youtube.com/vi/EBV1Z1JK3Sg/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/EBV1Z1JK3Sg?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Bí kíp đọc lướt trước câu hỏi trong 30 giây nghỉ giữa các đoạn hội thoại, xác định vai trò người nói (Man/Woman) để bắt trúng thông tin.",
    "keyPoints": [
      "Tận dụng tối đa thời gian hướng dẫn đọc trước 3 câu hỏi của đoạn kế tiếp",
      "Xác định câu hỏi hỏi về ai: 'According to the man' hay 'What does the woman suggest'",
      "Gạch chân từ khóa nội dung để chủ động lắng nghe thông tin cần tìm"
    ],
    "tags": [
      "Part 3",
      "Đọc trước câu hỏi",
      "Listening",
      "Hội thoại"
    ]
  },
  {
    "id": "vid-09",
    "youtubeId": "vJE95yGzlyM",
    "title": "Luyện nghe đoạn hội thoại tiếng Anh TOEIC Part 3 #luyenthitoeic #toeic2025 #tienganhgiaotiep",
    "category": "listening",
    "part": "Part 3",
    "duration": "27:15",
    "level": "450 - 750",
    "views": 41200,
    "thumbnailUrl": "https://img.youtube.com/vi/vJE95yGzlyM/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/vJE95yGzlyM?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học tiếng Anh nhanh",
    "summary": "Luyện nghe các chủ đề phổ biến nhất trong Part 3: đặt lịch hẹn, giao hàng trễ, bảo trì thiết bị và thảo luận dự án văn phòng.",
    "keyPoints": [
      "Nắm vững các cụm diễn đạt công sở thường dùng trong hội thoại hàng ngày",
      "Câu hỏi đầu thường hỏi mục đích/chủ đề chính của cuộc trò chuyện",
      "Câu hỏi cuối thường hỏi hành động tiếp theo người nói sẽ thực hiện"
    ],
    "tags": [
      "Part 3",
      "Công sở",
      "Listening",
      "Giao tiếp"
    ]
  },
  {
    "id": "vid-10",
    "youtubeId": "TsagtYSlvGo",
    "title": "Bí kíp luyện nghe TOEIC Part 3 tăng điểm (p.1) | Barmunity English",
    "category": "listening",
    "part": "Part 3",
    "duration": "23:40",
    "level": "600 - 900+",
    "views": 56300,
    "thumbnailUrl": "https://img.youtube.com/vi/TsagtYSlvGo/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/TsagtYSlvGo?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Phương pháp giải quyết 2 dạng bài khó nhất Part 3: hội thoại có 3 người nói và dạng câu hỏi suy luận ngụ ý câu nói trong ngoặc kép.",
    "keyPoints": [
      "Hội thoại 3 người: Chú ý tên gọi khi các nhân vật xưng hô với nhau",
      "Câu hỏi hàm ý: Phải nghe hiểu ngữ cảnh trước và sau câu nói được trích dẫn",
      "Không dịch từng từ, tập trung vào thái độ và cảm xúc của người nói"
    ],
    "tags": [
      "Part 3",
      "3 người nói",
      "Listening",
      "Ngụ ý"
    ]
  },
  {
    "id": "vid-11",
    "youtubeId": "NKppJCIIXl4",
    "title": "SIÊU BÍ KÍP MAX ĐIỂM NGHE TOEIC LISTENING PART 4 || MS THẮM TOEIC (VIDEO1)",
    "category": "listening",
    "part": "Part 4",
    "duration": "30:20",
    "level": "550 - 850+",
    "views": 68400,
    "thumbnailUrl": "https://img.youtube.com/vi/NKppJCIIXl4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/NKppJCIIXl4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Tổng hợp kỹ thuật nghe bài nói ngắn Part 4: bắt từ khóa, liên kết mạch thông tin của một người nói duy nhất và đối phó với tốc độ nói nhanh.",
    "keyPoints": [
      "Bố cục bài nói luôn đi từ: Mở đầu -> Nội dung chi tiết -> Kêu gọi hành động",
      "Đọc lướt cả 3 câu hỏi trước khi loa phát bài nói",
      "Nếu lỡ mất 1 câu, lập tức bỏ qua để tập trung cho 2 câu còn lại"
    ],
    "tags": [
      "Part 4",
      "Short Talks",
      "Listening",
      "Thông báo"
    ]
  },
  {
    "id": "vid-12",
    "youtubeId": "8BiDFdVbJOI",
    "title": "EP5. TOEIC PART 4 2026 | Ko nghĩ ra viết gi trên tiêu đề cả | Học tốt, thi tốt nha mn😻",
    "category": "listening",
    "part": "Part 4",
    "duration": "20:50",
    "level": "500 - 800",
    "views": 33900,
    "thumbnailUrl": "https://img.youtube.com/vi/8BiDFdVbJOI/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/8BiDFdVbJOI?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Mun English",
    "summary": "Phân tích cấu trúc bài nói thông báo giao thông, chuyến bay, bản tin thời tiết và tin nhắn hộp thư thoại văn phòng.",
    "keyPoints": [
      "Các từ khóa chuyển ý: 'Unfortunately', 'However', 'Please note that'",
      "Thông tin chi tiết (thời gian, cổng ra, chi phí) thường xuất hiện sau từ nối",
      "Nhận diện nhanh số hiệu chuyến bay, số phòng, số điện thoại"
    ],
    "tags": [
      "Part 4",
      "Tin nhắn thoại",
      "Listening",
      "Giao thông"
    ]
  },
  {
    "id": "vid-13",
    "youtubeId": "otUfx6qcY6M",
    "title": "Luyện Nghe TOEIC Part 4 | Dành Cho Người Mục Tiêu TOEIC 700+ | TẬP 1",
    "category": "listening",
    "part": "Part 4",
    "duration": "26:50",
    "level": "650 - 900+",
    "views": 45100,
    "thumbnailUrl": "https://img.youtube.com/vi/otUfx6qcY6M/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/otUfx6qcY6M?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "TOEIC Listening Mastery",
    "summary": "Rèn luyện kỹ năng nghe bắt Paraphrasing (từ đồng nghĩa biến đổi giữa audio và đáp án) dành cho mục tiêu TOEIC 700+ bứt phá.",
    "keyPoints": [
      "Đáp án đúng hầu như không dùng lại từ gốc trong bài nói mà dùng từ đồng nghĩa",
      "Ví dụ: 'renovate the office' -> 'perform building maintenance'",
      "Tập thói quen tích lũy các cặp từ Paraphrase sau mỗi bài luyện nghe"
    ],
    "tags": [
      "Part 4",
      "Paraphrasing",
      "Listening",
      "Nâng cao"
    ]
  },
  {
    "id": "vid-14",
    "youtubeId": "YZAWzL716aU",
    "title": "Đề thi TOEIC - Part 5 - Giải đề TOEIC - từ loại",
    "category": "reading",
    "part": "Part 5",
    "duration": "18:30",
    "level": "350 - 650",
    "views": 52100,
    "thumbnailUrl": "https://img.youtube.com/vi/YZAWzL716aU/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/YZAWzL716aU?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Chiến thuật 5 giây nhận diện vị trí Danh từ, Tính từ, Trạng từ và Động từ chỉ bằng cách nhìn trước nhìn sau chỗ trống trong Part 5.",
    "keyPoints": [
      "Mạo từ / Tính từ sở hữu + (Tính từ) + Danh từ",
      "Giới từ + Danh từ / V-ing; Động từ to be + Tính từ",
      "Trạng từ (-ly) có thể đứng đầu câu, trước động từ hoặc sau tân ngữ"
    ],
    "tags": [
      "Part 5",
      "Từ loại",
      "Reading",
      "Mẹo 5s"
    ]
  },
  {
    "id": "vid-15",
    "youtubeId": "4QnqpWLT5m4",
    "title": "Bài 1-Mẹo làm Part 5 Toeic nhanh nhất!!!",
    "category": "reading",
    "part": "Part 5",
    "duration": "19:45",
    "level": "450 - 750+",
    "views": 89300,
    "thumbnailUrl": "https://img.youtube.com/vi/4QnqpWLT5m4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/4QnqpWLT5m4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Toeic Hackers",
    "summary": "Tổng hợp các dạng câu hỏi từ loại hay lừa thí sinh nhất: phân biệt V-ing / V-ed làm tính từ và các đuôi danh từ chỉ người vs chỉ vật.",
    "keyPoints": [
      "Đuôi danh từ chỉ người (-er, -or, -ant, -ee) vs chỉ sự vật (-tion, -ment, -ance)",
      "Tính từ chủ động (-ing) chỉ bản chất vs tính từ bị động (-ed) chỉ cảm xúc/tác động",
      "Nắm chắc các trường hợp danh từ đếm được bắt buộc phải có mạo từ"
    ],
    "tags": [
      "Part 5",
      "Từ loại nâng cao",
      "Reading",
      "V-ing V-ed"
    ]
  },
  {
    "id": "vid-16",
    "youtubeId": "pB2wO-5HQHk",
    "title": "Bài 2- Câu hỏi từ loại (tiếp)",
    "category": "reading",
    "part": "Part 5",
    "duration": "21:10",
    "level": "400 - 700",
    "views": 41500,
    "thumbnailUrl": "https://img.youtube.com/vi/pB2wO-5HQHk/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/pB2wO-5HQHk?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Toeic Hackers",
    "summary": "Mẹo xử lý nhanh các câu hỏi chia thì động từ: nhận biết dấu hiệu thời gian, sự hòa hợp chủ vị và thể bị động.",
    "keyPoints": [
      "Bước 1: Xét chủ ngữ số ít hay số nhiều để loại trừ",
      "Bước 2: Xét câu chủ động hay bị động (có tân ngữ phía sau hay không)",
      "Bước 3: Nhìn từ chỉ thời gian (recently, since, by the time, next week) để chốt thì"
    ],
    "tags": [
      "Part 5",
      "Thì động từ",
      "Reading",
      "Bị động"
    ]
  },
  {
    "id": "vid-17",
    "youtubeId": "Mw_WCCnhDkI",
    "title": "Một câu sử dụng Đại từ rất hay - Part 5 TOEIC",
    "category": "reading",
    "part": "Part 5",
    "duration": "15:40",
    "level": "550 - 800+",
    "views": 28900,
    "thumbnailUrl": "https://img.youtube.com/vi/Mw_WCCnhDkI/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/Mw_WCCnhDkI?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "TOEIC Thầy Khuê",
    "summary": "Phân biệt cách dùng Đại từ quan hệ (Who, Whom, Which, That, Whose) và cách rút gọn mệnh đề quan hệ dạng V-ing / V-ed.",
    "keyPoints": [
      "Who + V; Whom + S + V; Whose + Noun",
      "That không đứng sau dấu phẩy và không đi sau giới từ",
      "Rút gọn chủ động dùng V-ing, rút gọn bị động dùng V3/ed"
    ],
    "tags": [
      "Part 5",
      "Đại từ quan hệ",
      "Reading",
      "Mệnh đề"
    ]
  },
  {
    "id": "vid-18",
    "youtubeId": "i2UbSghQY5M",
    "title": "TOEIC  PART 6 READING : Mẹo nhìn là biết chọn đáp án ngay loại câu điền nguyên câu | MS THẮM TOEIC",
    "category": "reading",
    "part": "Part 6",
    "duration": "22:15",
    "level": "500 - 800+",
    "views": 39400,
    "thumbnailUrl": "https://img.youtube.com/vi/i2UbSghQY5M/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/i2UbSghQY5M?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Mẹo giải quyết 16 câu Part 6: cách chọn câu điền vào chỗ trống dựa vào câu liền trước và liền sau mà không cần dịch hết đoạn văn.",
    "keyPoints": [
      "Đọc câu liền trước và câu liền sau chỗ trống để nắm mạch ý",
      "Tìm từ khóa liên kết: Đại từ thay thế (it, they, this), liên từ (furthermore, however)",
      "Loại bỏ các phương án lạc đề hoặc đưa ra thông tin mâu thuẫn"
    ],
    "tags": [
      "Part 6",
      "Điền câu",
      "Reading",
      "Đoạn văn"
    ]
  },
  {
    "id": "vid-19",
    "youtubeId": "MFEj2ysOdIo",
    "title": "Part 6 TOEIC: Mẹo Chọn Đáp Án Không Cần Đọc Cả Đoạn | Barmunity English",
    "category": "reading",
    "part": "Part 6",
    "duration": "22:10",
    "level": "450 - 750",
    "views": 34100,
    "thumbnailUrl": "https://img.youtube.com/vi/MFEj2ysOdIo/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/MFEj2ysOdIo?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Tuyệt chiêu chọn liên từ chuyển đoạn (Therefore, However, In addition, In contrast) chuẩn xác dựa vào mối quan hệ nguyên nhân - kết quả.",
    "keyPoints": [
      "Nhóm tương phản: However, Nevertheless, On the other hand",
      "Nhóm kết quả: Therefore, As a result, Consequently",
      "Nhóm bổ sung: Furthermore, Moreover, In addition"
    ],
    "tags": [
      "Part 6",
      "Liên từ chuyển đoạn",
      "Reading",
      "Logic"
    ]
  },
  {
    "id": "vid-20",
    "youtubeId": "HGNBCPnyiUY",
    "title": "3 TIPS LÀM BÀI TOEIC PART 7",
    "category": "reading",
    "part": "Part 7",
    "duration": "25:30",
    "level": "500 - 850+",
    "views": 62300,
    "thumbnailUrl": "https://img.youtube.com/vi/HGNBCPnyiUY/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/HGNBCPnyiUY?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "3 Tips cốt lõi xử lý 54 câu Part 7: kỹ thuật đọc lướt (Skimming) để nắm đại ý và đọc quét (Scanning) để định vị mốc thông tin chi tiết.",
    "keyPoints": [
      "Luôn đọc tiêu đề bài viết và câu hỏi trước khi đọc toàn văn",
      "Định vị từ khóa độc nhất (tên riêng, số liệu, ngày tháng) trong bài đọc",
      "Phân bổ thời gian: dành tối đa 55 phút cho toàn bộ Part 7"
    ],
    "tags": [
      "Part 7",
      "Skimming Scanning",
      "Reading",
      "Tips Part 7"
    ]
  },
  {
    "id": "vid-21",
    "youtubeId": "a3a_rwL4K9g",
    "title": "Các dạng bài TOEIC Part 7",
    "category": "reading",
    "part": "Part 7",
    "duration": "29:40",
    "level": "550 - 900+",
    "views": 51200,
    "thumbnailUrl": "https://img.youtube.com/vi/a3a_rwL4K9g/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/a3a_rwL4K9g?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Tổng hợp các dạng văn bản điển hình Part 7: Email công việc, Thông báo nội bộ, Bài báo kinh doanh, Tin nhắn trao đổi trực tuyến.",
    "keyPoints": [
      "Email: Chú ý dòng Subject, người gửi, người nhận và mục đích chính ở đoạn đầu",
      "Thông báo: Chú ý đối tượng áp dụng, ngày có hiệu lực và các ngoại lệ",
      "Tin nhắn chat: Chú ý ngữ cảnh đối thoại nhanh và câu hỏi suy luận ý người nói"
    ],
    "tags": [
      "Part 7",
      "Email",
      "Reading",
      "Các dạng bài"
    ]
  },
  {
    "id": "vid-22",
    "youtubeId": "LkE9nj1NK0Y",
    "title": "Part 7  Email, Letter, Fax   Khóa  TOEIC Cô Mai Phương",
    "category": "reading",
    "part": "Part 7",
    "duration": "34:20",
    "level": "600 - 950+",
    "views": 47800,
    "thumbnailUrl": "https://img.youtube.com/vi/LkE9nj1NK0Y/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/LkE9nj1NK0Y?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Tài Liệu English VIP",
    "summary": "Kỹ thuật giải quyết câu hỏi chéo ở Đoạn kép (Double Passages) và Đoạn ba (Triple Passages) mà không bị rối thông tin.",
    "keyPoints": [
      "Xác định mối liên hệ giữa các đoạn (ví dụ: Đoạn 1 đặt hàng -> Đoạn 2 khiếu nại -> Đoạn 3 bồi thường)",
      "Câu hỏi thứ 3 hoặc 4 thường là câu hỏi chéo yêu cầu kết hợp thông tin cả 2 đoạn",
      "Tìm các yếu tố đồng bộ: mã đơn hàng, ngày hẹn, tên dịch vụ"
    ],
    "tags": [
      "Part 7",
      "Đoạn kép",
      "Reading",
      "Đoạn ba"
    ]
  },
  {
    "id": "vid-23",
    "youtubeId": "InU21w0vAsk",
    "title": "600 TỪ VỰNG TOEIC * LESSON 1: Contracts * Toeic Vocabulary * Toeic cho người mới bắt đầu",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "27:40",
    "level": "Căn bản (0 - 650)",
    "views": 115000,
    "thumbnailUrl": "https://img.youtube.com/vi/InU21w0vAsk/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/InU21w0vAsk?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Mun English",
    "summary": "600 Từ vựng thiết yếu TOEIC - Bài 1: Chủ đề Hợp đồng (Contracts) kèm phát âm chuẩn IPA, ngữ cảnh thực tế và ví dụ câu chuẩn ETS.",
    "keyPoints": [
      "Các từ cốt lõi: contract, agreement, obligation, assure, party, determine",
      "Học theo cụm Collocations: enter into a contract, abide by the agreement",
      "Luyện tập phát âm chuẩn giúp cải thiện đồng thời cả kỹ năng nghe Listening"
    ],
    "tags": [
      "Từ vựng",
      "600 từ",
      "Contracts",
      "Căn bản"
    ]
  },
  {
    "id": "vid-24",
    "youtubeId": "Lgy0tRU7Zcc",
    "title": "(Cấp tốc) Thuộc ngay 100 mẫu câu giao tiếp nơi công sở để TỰ TIN nói chuyện với đồng nghiệp nhé",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "35:10",
    "level": "400 - 750",
    "views": 82400,
    "thumbnailUrl": "https://img.youtube.com/vi/Lgy0tRU7Zcc/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/Lgy0tRU7Zcc?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "KISS English Center",
    "summary": "100 Mẫu câu và cụm từ thông dụng nhất trong môi trường công sở: họp hành, trao đổi công việc, gửi báo cáo và giao tiếp với đồng nghiệp.",
    "keyPoints": [
      "Mẫu câu báo cáo tiến độ: 'The project is on schedule / behind schedule'",
      "Mẫu câu đề xuất giải pháp: 'I recommend that we postpone the launch'",
      "Cụm từ họp hành: hold a meeting, attend a conference, take minutes"
    ],
    "tags": [
      "Từ vựng",
      "Công sở",
      "Giao tiếp",
      "Mẫu câu"
    ]
  },
  {
    "id": "vid-25",
    "youtubeId": "c-1xO4zL2Gs",
    "title": "Từ vựng Tiếng Anh chuyên ngành kế toán, tài chính #tuvungtienganh #tienganhgiaotiep",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "22:45",
    "level": "500 - 850+",
    "views": 41800,
    "thumbnailUrl": "https://img.youtube.com/vi/c-1xO4zL2Gs/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/c-1xO4zL2Gs?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Cô Hà Tiếng Anh",
    "summary": "Từ vựng chuyên ngành Tài chính, Ngân hàng, Kế toán và Dự toán ngân sách thường xuất hiện trong Part 4 và Part 7.",
    "keyPoints": [
      "Các từ trọng điểm: budget, invoice, revenue, expense, quarterly report, financial audit",
      "Phân biệt giữa: profit (lợi nhuận), deficit (thâm hụt) và surplus (thặng dư)",
      "Cụm từ tài chính: cut down expenses, generate revenue, balance the budget"
    ],
    "tags": [
      "Từ vựng",
      "Tài chính",
      "Ngân hàng",
      "Kế toán"
    ]
  },
  {
    "id": "vid-26",
    "youtubeId": "EPYK-eW5Qgs",
    "title": "Từ vựng TOEIC 2024 Trọng tâm chủ đề Traveling #luyenthitoeic #tienganhgiaotiep",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "26:30",
    "level": "450 - 750",
    "views": 38900,
    "thumbnailUrl": "https://img.youtube.com/vi/EPYK-eW5Qgs/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/EPYK-eW5Qgs?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học tiếng Anh nhanh",
    "summary": "Bộ từ vựng chủ đề Du lịch, Đặt phòng khách sạn, Chuyến bay và Hội thảo công tác quốc tế.",
    "keyPoints": [
      "Từ vựng sân bay: departure, destination, itinerary, baggage claim, boarding pass",
      "Từ vựng khách sạn: reservation, accommodation, front desk, complimentary",
      "Các cụm từ chuyến đi: make a travel arrangement, book a flight in advance"
    ],
    "tags": [
      "Từ vựng",
      "Du lịch",
      "Khách sạn",
      "Traveling"
    ]
  },
  {
    "id": "vid-27",
    "youtubeId": "AHDYSHxXWpE",
    "title": "Ngữ pháp TOEIC: In/On + phương tiện | Barmunity English",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "18:20",
    "level": "350 - 700",
    "views": 33400,
    "thumbnailUrl": "https://img.youtube.com/vi/AHDYSHxXWpE/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/AHDYSHxXWpE?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Quy tắc phân biệt Giới từ (In, On, At, By, With) và Liên từ (Because, Although, While) đi với Mệnh đề vs Cụm danh từ trong Part 5.",
    "keyPoints": [
      "Because / Although / While + Mệnh đề (S + V)",
      "Because of / Despite / In spite of / During + Cụm danh từ / V-ing",
      "Nhìn sau chỗ trống có động từ chia thì hay chỉ có cụm danh từ để chọn đáp án 3 giây"
    ],
    "tags": [
      "Ngữ pháp",
      "Giới từ",
      "Liên từ",
      "Part 5"
    ]
  },
  {
    "id": "vid-28",
    "youtubeId": "lG-K-EyWeKQ",
    "title": "Phá Đảo 4 LOẠI CÂU ĐIỀU KIỆN TRONG TIẾNG ANH / Chống Liệt Tiếng Anh Ep. 26",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "31:15",
    "level": "450 - 800",
    "views": 95600,
    "thumbnailUrl": "https://img.youtube.com/vi/lG-K-EyWeKQ/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/lG-K-EyWeKQ?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Elight Learning English",
    "summary": "Phá đảo toàn diện 4 loại câu điều kiện (Loại 0, 1, 2, 3), câu điều kiện hỗn hợp và hiện tượng đảo ngữ câu điều kiện trong đề thi TOEIC.",
    "keyPoints": [
      "Loại 1: If + HTĐ, S + will + V; Đảo ngữ: Should + S + V",
      "Loại 2: If + QKĐ, S + would + V; Đảo ngữ: Were + S + to V",
      "Loại 3: If + QKHT, S + would have V3; Đảo ngữ: Had + S + V3"
    ],
    "tags": [
      "Ngữ pháp",
      "Câu điều kiện",
      "Đảo ngữ",
      "If"
    ]
  },
  {
    "id": "vid-29",
    "youtubeId": "0vczML2EVH0",
    "title": "Ngữ pháp TOEIC - Bài 6: So Sánh | TOEIC Grammar - Lesson 6: Comparisons",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "25:40",
    "level": "400 - 750",
    "views": 47200,
    "thumbnailUrl": "https://img.youtube.com/vi/0vczML2EVH0/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/0vczML2EVH0?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học Tiếng Anh Iris Academy",
    "summary": "Tổng hợp ngữ pháp so sánh: So sánh hơn, so sánh nhất, so sánh bằng (as...as) và cấu trúc so sánh kép (the more... the more).",
    "keyPoints": [
      "Tính từ ngắn thêm -er/-est; Tính từ dài dùng more/most",
      "Cấu trúc so sánh bằng: as + Adj/Adv + as; chú ý chọn tính từ hay trạng từ",
      "Dấu hiệu nhận biết: có 'than' -> chọn so sánh hơn; có 'the' -> chọn so sánh nhất"
    ],
    "tags": [
      "Ngữ pháp",
      "So sánh",
      "Degrees of Comparison"
    ]
  },
  {
    "id": "vid-30",
    "youtubeId": "uRZBAOXM-O8",
    "title": "Chia sẻ kinh nghiệm của học viên 990 TOEIC #thaylongtoeic",
    "category": "tips",
    "part": "Mẹo thi",
    "duration": "22:15",
    "level": "Mọi trình độ (0 - 990)",
    "views": 67800,
    "thumbnailUrl": "https://img.youtube.com/vi/uRZBAOXM-O8/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/uRZBAOXM-O8?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Lớp TOEIC thầy Long",
    "summary": "Kinh nghiệm thực chiến từ thủ khoa 990 TOEIC: bí quyết giữ vững tập trung trong 2 giờ thi, cách ghi nhớ từ vựng lâu và mẹo tâm lý phòng thi.",
    "keyPoints": [
      "Xây dựng phản xạ không dịch nhẩm trong đầu khi nghe Listening",
      "Cách tạo thói quen bấm giờ giải đề nghiêm túc 120 phút trước khi thi 2 tuần",
      "Cách ăn uống và nghỉ ngơi hợp lý để duy trì năng lượng suốt bài thi"
    ],
    "tags": [
      "Mẹo thi",
      "Kinh nghiệm 990",
      "Chiến thuật",
      "Tâm lý"
    ]
  },
  {
    "id": "vid-31",
    "youtubeId": "SDoeEk9l9DM",
    "title": "Giải chi tiết đề thi TOEIC 2026 | Anhle TOEIC",
    "category": "tips",
    "part": "Chữa đề",
    "duration": "38:40",
    "level": "Mọi trình độ (450 - 990)",
    "views": 104000,
    "thumbnailUrl": "https://img.youtube.com/vi/SDoeEk9l9DM/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/SDoeEk9l9DM?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Chữa chi tiết các câu khó nhất trong bộ đề thi ETS 2026: phân tích bẫy nghe Part 3-4 và các câu từ vựng lạ Part 5-7.",
    "keyPoints": [
      "Chữa 10 câu bẫy từ loại và cấu trúc câu hiếm gặp Part 5",
      "Phân tích cách paraphrase các câu hỏi đọc hiểu đoạn ba Part 7",
      "Rút ra các quy tắc tổng quát áp dụng cho mọi đề thi thật"
    ],
    "tags": [
      "Chữa đề",
      "ETS 2026",
      "Giải chi tiết",
      "Full Test"
    ]
  },
  {
    "id": "vid-32",
    "youtubeId": "_yy62bDi00s",
    "title": "Các mẹo \"vi diệu\" ẵm điểm TOEIC Listening | Ms Hoa TOEIC #tips #english",
    "category": "tips",
    "part": "Mẹo thi",
    "duration": "20:30",
    "level": "Mọi trình độ",
    "views": 59400,
    "thumbnailUrl": "https://img.youtube.com/vi/_yy62bDi00s/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/_yy62bDi00s?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Các mẹo ẵm trọn điểm Listening: cách xử lý khi bị mất dấu audio, mẹo đánh lụi có cơ sở khoa học và kỹ thuật tô đáp án nhanh.",
    "keyPoints": [
      "Nếu bị lỡ 1 câu, đánh lụi ngay lập tức và tập trung 100% cho câu tiếp theo",
      "Tô phiếu trả lời ngay sau khi chọn xong, không đợi hết giờ mới tô",
      "Giữ nhịp thở đều đặn và không hoang mang khi gặp đoạn audio nói nhanh"
    ],
    "tags": [
      "Mẹo thi",
      "Listening Tips",
      "Chiến lược",
      "Đoán mò"
    ]
  },
  {
    "id": "vid-33",
    "youtubeId": "h1-x1Q7Hq48",
    "title": "500 Từ vựng TOEIC thường gặp nhất trong đề thi ETS | Ms Hoa TOEIC",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "45:20",
    "level": "Mọi trình độ (0 - 990)",
    "views": 62400,
    "thumbnailUrl": "https://img.youtube.com/vi/h1-x1Q7Hq48/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/h1-x1Q7Hq48?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Tổng hợp 500 từ vựng xuất hiện với tần suất cao nhất trong các đề thi TOEIC gần đây, phân theo 10 chủ đề công sở và doanh nghiệp thực tế.",
    "keyPoints": [
      "Học từ vựng theo cụm (Collocations) thay vì học từ đơn lẻ để tăng tốc độ phản xạ",
      "Nắm vững các gia đình từ (Word Family: Noun - Verb - Adj - Adv)",
      "Luyện phát âm chuẩn IPA để hỗ trợ trực tiếp cho phần nghe Listening"
    ],
    "tags": [
      "Từ vựng",
      "500 từ",
      "ETS",
      "Cốt lõi"
    ]
  },
  {
    "id": "vid-34",
    "youtubeId": "wG_B3j4_Qn4",
    "title": "Chữa đề thi TOEIC Part 5 Cập nhật mới nhất | Anh Lê TOEIC",
    "category": "reading",
    "part": "Part 5",
    "duration": "34:10",
    "level": "500 - 850+",
    "views": 49100,
    "thumbnailUrl": "https://img.youtube.com/vi/wG_B3j4_Qn4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/wG_B3j4_Qn4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Bóc tách chi tiết từng câu Part 5 đề thi mới, mẹo loại suy phương án nhiễu và phân tích bẫy từ loại chỉ trong 10 giây mỗi câu.",
    "keyPoints": [
      "Nhận diện vị trí chỗ trống đứng trước hay sau danh từ, động từ để chọn ngay từ loại",
      "Triệt tiêu ngay các đáp án bẫy ngữ pháp đối kháng",
      "Tối ưu thời gian làm Part 5 dưới 12 phút để dành thời gian cho Part 7"
    ],
    "tags": [
      "Part 5",
      "Chữa đề",
      "Reading",
      "Từ loại"
    ]
  },
  {
    "id": "vid-35",
    "youtubeId": "bK8pL1m4X7w",
    "title": "Kỹ năng đọc quét Skimming & Scanning TOEIC Part 7 | Thầy Long TOEIC",
    "category": "reading",
    "part": "Part 7",
    "duration": "28:45",
    "level": "600 - 900+",
    "views": 53700,
    "thumbnailUrl": "https://img.youtube.com/vi/bK8pL1m4X7w/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/bK8pL1m4X7w?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Thầy Long TOEIC",
    "summary": "Phương pháp định vị từ khóa và đọc hiểu siêu tốc cho các bài đọc Part 7 dài 2-3 trang không bị thiếu thời gian.",
    "keyPoints": [
      "Skimming nắm bắt bố cục và mục đích chính của bài đọc trong 15 giây đầu",
      "Scanning tìm kiếm chính xác con số, ngày tháng, tên riêng theo câu hỏi",
      "Không dịch toàn bộ bài đọc, chỉ đọc sâu đoạn chứa thông tin đáp án"
    ],
    "tags": [
      "Part 7",
      "Skimming",
      "Scanning",
      "Đọc quét"
    ]
  },
  {
    "id": "vid-36",
    "youtubeId": "4wN3_qX7jL8",
    "title": "Bí kíp luyện nghe bắt âm nối & nuốt âm Part 1 & Part 2",
    "category": "listening",
    "part": "Part 2",
    "duration": "22:15",
    "level": "450 - 750",
    "views": 38200,
    "thumbnailUrl": "https://img.youtube.com/vi/4wN3_qX7jL8/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/4wN3_qX7jL8?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Daily Toeic & Business English with Lucy",
    "summary": "Giải mã hiện tượng nối âm (Linking sounds), biến âm và nuốt âm của người bản xứ khiến thí sinh hay bị nghe nhầm trong Part 1 và Part 2.",
    "keyPoints": [
      "Quy tắc phụ âm cuối nối với nguyên âm đầu từ tiếp theo (hold on -> hol-don)",
      "Hiện tượng nuốt âm t, d khi đứng giữa hai phụ âm",
      "Luyện chép chính tả Dictation để não bộ quen với âm thanh nói nhanh tự nhiên"
    ],
    "tags": [
      "Listening",
      "Part 2",
      "Nối âm",
      "Nuốt âm"
    ]
  },
  {
    "id": "vid-37",
    "youtubeId": "mP1x9L7vK2w",
    "title": "Chiến thuật xử lý câu hỏi Wh- và How trong Part 2 không bao giờ sai",
    "category": "listening",
    "part": "Part 2",
    "duration": "25:30",
    "level": "400 - 700",
    "views": 44800,
    "thumbnailUrl": "https://img.youtube.com/vi/mP1x9L7vK2w/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/mP1x9L7vK2w?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Nhận diện nhanh từ để hỏi Who, Where, When, Why, How, quy tắc loại trừ câu trả lời Yes/No đối với Wh-question và các bẫy đồng âm phổ biến.",
    "keyPoints": [
      "Wh-question tuyệt đối không bao giờ trả lời bằng Yes / No / Sure / Of course",
      "Câu hỏi Where tìm câu trả lời có giới từ nơi chốn (at, in, on, next to)",
      "Cảnh giác bẫy lặp từ hoặc từ đồng âm khác nghĩa với câu hỏi"
    ],
    "tags": [
      "Part 2",
      "Wh-question",
      "Listening",
      "Loại trừ"
    ]
  },
  {
    "id": "vid-38",
    "youtubeId": "nL3wK9xM8p2",
    "title": "Bí kíp bắt câu hỏi đồ họa, lịch trình & biểu đồ TOEIC Part 3",
    "category": "listening",
    "part": "Part 3",
    "duration": "30:15",
    "level": "550 - 850+",
    "views": 51200,
    "thumbnailUrl": "https://img.youtube.com/vi/nL3wK9xM8p2/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/nL3wK9xM8p2?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Chiến thuật phối hợp nhìn biểu đồ và nghe lời thoại để chọn đáp án chớp nhoáng cho các câu hỏi Graphic Part 3 mà không bị rối mắt.",
    "keyPoints": [
      "Nhìn trước thông tin đồ họa: câu hỏi hỏi cột A thì phải tập trung nghe thông tin ở cột B",
      "Xác định tiêu đề và các đơn vị đo lường trong hình ảnh trước khi nghe",
      "Đáp án thường xuất hiện ngay khi người nói nhắc đến mốc tham chiếu"
    ],
    "tags": [
      "Part 3",
      "Đồ họa",
      "Biểu đồ",
      "Graphic"
    ]
  },
  {
    "id": "vid-39",
    "youtubeId": "jT2kP9wL4x1",
    "title": "Mẹo làm câu Mệnh đề quan hệ & Rút gọn mệnh đề Part 5 trong 5 giây",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "18:50",
    "level": "Mọi trình độ (0 - 990)",
    "views": 39500,
    "thumbnailUrl": "https://img.youtube.com/vi/jT2kP9wL4x1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/jT2kP9wL4x1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Quy tắc nhận diện V-ing (chủ động) và V-ed (bị động) trong rút gọn mệnh đề quan hệ, tránh nhầm lẫn với động từ chính của câu.",
    "keyPoints": [
      "Câu đã có động từ chính chia thì thì chỗ trống chắc chắn là dạng rút gọn",
      "Chủ ngữ thực hiện hành động chọn V-ing, chịu tác động chọn V-ed",
      "Các trường hợp đặc biệt đi với the first, the last, the only dùng to V"
    ],
    "tags": [
      "Ngữ pháp",
      "Part 5",
      "Mệnh đề quan hệ",
      "Rút gọn"
    ]
  },
  {
    "id": "vid-40",
    "youtubeId": "xM7vK1pL8n2",
    "title": "Phân biệt Cụm Liên từ và Giới từ trong TOEIC Part 5 (Because vs Because of, Although vs Despite)",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "19:40",
    "level": "350 - 650",
    "views": 47300,
    "thumbnailUrl": "https://img.youtube.com/vi/xM7vK1pL8n2/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/xM7vK1pL8n2?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Bảng đối chiếu toàn diện giữa Conjunctions (+ mệnh đề S+V) và Prepositions (+ danh từ/cụm danh từ) - dạng bài 100% xuất hiện trong mọi đề thi.",
    "keyPoints": [
      "Nhìn phía sau chỗ trống: nếu là S+V chọn Liên từ (Although, Because, While)",
      "Nếu chỉ là Noun Phrase hoặc V-ing chọn Giới từ (Despite, In spite of, Due to)",
      "Mẹo nhớ nhanh cặp tương đương nghĩa chỉ nhượng bộ và nguyên nhân"
    ],
    "tags": [
      "Ngữ pháp",
      "Liên từ",
      "Giới từ",
      "Part 5"
    ]
  },
  {
    "id": "vid-41",
    "youtubeId": "qP4wL2kM8n7",
    "title": "Chiến thuật xử lý Đoạn kép & Đoạn ba Part 7 (Double & Triple Passages)",
    "category": "reading",
    "part": "Part 7",
    "duration": "35:20",
    "level": "650 - 950",
    "views": 58900,
    "thumbnailUrl": "https://img.youtube.com/vi/qP4wL2kM8n7/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/qP4wL2kM8n7?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Kỹ thuật liên kết thông tin giữa các văn bản để trả lời các câu hỏi suy luận chéo trong đoạn 2 và đoạn 3 mà không bị nhầm lẫn.",
    "keyPoints": [
      "Xác định mối quan hệ giữa 2 hoặc 3 văn bản (Email hỏi hàng và Hóa đơn gửi kèm)",
      "Câu hỏi chéo (Cross-reference) luôn yêu cầu kết hợp dữ kiện từ cả 2 văn bản",
      "Làm câu hỏi chi tiết trước, câu hỏi tổng quát hoặc suy luận làm sau"
    ],
    "tags": [
      "Part 7",
      "Đoạn kép",
      "Đoạn ba",
      "Reading"
    ]
  },
  {
    "id": "vid-42",
    "youtubeId": "kL9mP2vX7w4",
    "title": "Chiến lược phân bổ 120 phút làm bài thi TOEIC chuẩn ETS",
    "category": "tips",
    "part": "Mẹo thi",
    "duration": "26:10",
    "level": "Mọi trình độ (0 - 990)",
    "views": 67300,
    "thumbnailUrl": "https://img.youtube.com/vi/kL9mP2vX7w4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/kL9mP2vX7w4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Thầy Long TOEIC",
    "summary": "Timeline chuẩn cho 2 giờ thi thực tế: 45 phút Listening và 75 phút Reading (Part 5: 10-12 phút, Part 6: 6-8 phút, Part 7: 55 phút).",
    "keyPoints": [
      "Không bao giờ dừng lại quá 30 giây cho một câu Part 5",
      "Tô đáp án ngay trong khi làm bài, không để dồn đến cuối giờ mới tô",
      "Kỹ thuật 'đánh dấu câu nghi vấn' để quay lại nếu còn dư thời gian"
    ],
    "tags": [
      "Mẹo thi",
      "Phân bổ thời gian",
      "Chiến lược",
      "120 phút"
    ]
  },
  {
    "id": "vid-43",
    "youtubeId": "zN8pL2mK4w1",
    "title": "Trọn bộ từ vựng chuyên ngành Vận chuyển, Giao hàng & Logistics",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "24:50",
    "level": "500 - 800",
    "views": 35200,
    "thumbnailUrl": "https://img.youtube.com/vi/zN8pL2mK4w1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/zN8pL2mK4w1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Daily Toeic & Business English with Lucy",
    "summary": "Các từ khóa quan trọng về shipping, shipment, tracking, delivery delay, freight, invoice và warehouse trong đề thi TOEIC ETS.",
    "keyPoints": [
      "Từ vựng mô tả trạng thái đơn hàng (in transit, out for delivery, dispatched)",
      "Các từ chỉ phương thức vận chuyển (courier, express, air freight, cargo)",
      "Các loại chứng từ kèm theo hàng hóa (bill of lading, packing slip, receipt)"
    ],
    "tags": [
      "Từ vựng",
      "Logistics",
      "Vận chuyển",
      "Giao hàng"
    ]
  },
  {
    "id": "vid-44",
    "youtubeId": "wK2mL8pX7n3",
    "title": "Phân biệt Thì Hiện tại hoàn thành vs Quá khứ đơn trong đề thi TOEIC",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "21:05",
    "level": "400 - 750",
    "views": 42100,
    "thumbnailUrl": "https://img.youtube.com/vi/wK2mL8pX7n3/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/wK2mL8pX7n3?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học tiếng Anh nhanh",
    "summary": "Dấu hiệu nhận biết since, for, already, yet, recently vs yesterday, ago, last year và các bẫy thời gian thường gặp trong Part 5.",
    "keyPoints": [
      "Quá khứ đơn dùng cho hành động đã chấm dứt hoàn toàn tại thời điểm xác định",
      "Hiện tại hoàn thành nhấn mạnh kết quả hoặc hành động kéo dài đến hiện tại",
      "Cấu trúc kinh điển: S + have/has + V3 since + S + V2/ed"
    ],
    "tags": [
      "Ngữ pháp",
      "Thì động từ",
      "Present Perfect",
      "Past Simple"
    ]
  },
  {
    "id": "vid-45",
    "youtubeId": "pX4nL2mK8w9",
    "title": "Mẹo làm dạng bài Sentence Insertion (Điền câu vào đoạn) TOEIC Part 6",
    "category": "reading",
    "part": "Part 6",
    "duration": "20:15",
    "level": "550 - 850+",
    "views": 39800,
    "thumbnailUrl": "https://img.youtube.com/vi/pX4nL2mK8w9/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/pX4nL2mK8w9?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Cách tìm đại từ thay thế (this, that, these, such), liên từ bắc cầu và sự logic nội dung để điền câu chính xác 100%.",
    "keyPoints": [
      "Đọc câu trước và câu sau chỗ trống để xác định mối liên hệ nguyên nhân - kết quả",
      "Tìm từ chỉ dẫn (transitional words): however, therefore, in addition, for instance",
      "Kiểm tra đại từ ở câu cần điền phải có từ chỉ định tương ứng ở câu liền trước"
    ],
    "tags": [
      "Part 6",
      "Điền câu",
      "Reading",
      "Văn bản"
    ]
  },
  {
    "id": "vid-46",
    "youtubeId": "mK7vL2pX4n1",
    "title": "100 Cụm từ Collocations hay xuất hiện nhất trong bài thi TOEIC",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "31:40",
    "level": "500 - 850+",
    "views": 56400,
    "thumbnailUrl": "https://img.youtube.com/vi/mK7vL2pX4n1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/mK7vL2pX4n1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Các cụm từ cố định không thể tách rời: take effect, conduct a survey, adhere to, in accordance with, highly qualified.",
    "keyPoints": [
      "Học cả cụm giúp chọn đáp án tức thì mà không cần suy nghĩ về ngữ pháp",
      "Các cụm động từ + giới từ đi liền: comply with, depend on, specialize in",
      "Các cặp trạng từ + tính từ thường gặp: highly recommended, widely known"
    ],
    "tags": [
      "Từ vựng",
      "Collocations",
      "Cụm từ",
      "990 TOEIC"
    ]
  },
  {
    "id": "vid-47",
    "youtubeId": "nL2pK8mX7w3",
    "title": "Chiến thuật xử lý câu hỏi phủ định và câu hỏi gắn đuôi Part 2",
    "category": "listening",
    "part": "Part 2",
    "duration": "17:35",
    "level": "450 - 750",
    "views": 33900,
    "thumbnailUrl": "https://img.youtube.com/vi/nL2pK8mX7w3/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/nL2pK8mX7w3?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Cách trả lời câu hỏi phủ định (Didn’t you...) và Tag questions (isn’t it?) mà không bị nhầm lẫn giữa Yes và No trong tiếng Anh.",
    "keyPoints": [
      "Quy tắc vàng: Trong tiếng Anh, Yes luôn có nghĩa là CÓ, No luôn có nghĩa là KHÔNG",
      "Không suy nghĩ theo tư duy tiếng Việt khi trả lời câu hỏi phủ định",
      "Lắng nghe ngữ điệu lên giọng (hỏi han) hoặc xuống giọng (khẳng định)"
    ],
    "tags": [
      "Part 2",
      "Câu hỏi phủ định",
      "Tag Question",
      "Listening"
    ]
  },
  {
    "id": "vid-48",
    "youtubeId": "xL8pK2mN7w4",
    "title": "Kỹ năng nghe bài thông báo nơi công cộng Part 4 (Airport, Train, Store)",
    "category": "listening",
    "part": "Part 4",
    "duration": "27:50",
    "level": "500 - 850",
    "views": 41500,
    "thumbnailUrl": "https://img.youtube.com/vi/xL8pK2mN7w4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/xL8pK2mN7w4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Tổng hợp từ vựng và cấu trúc của các bài thông báo tại sân bay (gate change, delayed flight), ga tàu và siêu thị trong Part 4.",
    "keyPoints": [
      "Câu hỏi 1 thường hỏi người nói đang ở đâu hoặc thông báo này gửi cho ai",
      "Câu hỏi 2 thường hỏi về nguyên nhân sự cố hoặc thay đổi lịch trình",
      "Câu hỏi 3 thường hỏi người nghe được yêu cầu làm gì (proceed to gate...)"
    ],
    "tags": [
      "Part 4",
      "Thông báo",
      "Airport",
      "Listening"
    ]
  },
  {
    "id": "vid-49",
    "youtubeId": "wN7pK2mL8x1",
    "title": "Chữa đề ETS TOEIC 2026 Test 2 - Full 100 câu Reading giải thích chi tiết",
    "category": "tips",
    "part": "Chữa đề",
    "duration": "58:20",
    "level": "550 - 900+",
    "views": 81200,
    "thumbnailUrl": "https://img.youtube.com/vi/wN7pK2mL8x1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/wN7pK2mL8x1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Thầy Long TOEIC",
    "summary": "Giải chi tiết từng câu trong đề ETS Test 2, chỉ rõ bẫy ngữ pháp Part 5-6 và bí kíp tìm dòng chứa thông tin trong Part 7.",
    "keyPoints": [
      "Chi tiết phân tích lý do chọn từng đáp án đúng và lý do 3 phương án còn lại sai",
      "Tổng hợp danh sách từ vựng đắt giá xuất hiện trong đề",
      "Kinh nghiệm duy trì tập trung cao độ trong suốt 75 phút đọc"
    ],
    "tags": [
      "Chữa đề",
      "ETS 2026",
      "Reading",
      "Full Test"
    ]
  },
  {
    "id": "vid-50",
    "youtubeId": "pK2mL8xN7w4",
    "title": "Luyện phản xạ 50 câu TOEIC Part 2 tốc độ cao",
    "category": "listening",
    "part": "Part 2",
    "duration": "29:40",
    "level": "500 - 800",
    "views": 46700,
    "thumbnailUrl": "https://img.youtube.com/vi/pK2mL8xN7w4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/pK2mL8xN7w4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Daily Toeic & Business English with Lucy",
    "summary": "Tập phản xạ nhận diện âm thanh và đáp án nhanh, rèn luyện não bộ bắt trọn ý câu hỏi chỉ sau 1 lần nghe duy nhất.",
    "keyPoints": [
      "Luyện tập ngắt suy nghĩ phân tích bằng tiếng Việt, phản hồi trực tiếp bằng phản xạ",
      "Phân biệt phản hồi trực tiếp và phản hồi gián tiếp (Indirect response)",
      "Chiến thuật xử lý các câu trả lời dạng 'I have no idea' hoặc 'Ask someone else'"
    ],
    "tags": [
      "Part 2",
      "Phản xạ nhanh",
      "50 câu",
      "Listening"
    ]
  },
  {
    "id": "vid-51",
    "youtubeId": "qL8mP2vN7w1",
    "title": "Mẹo làm dạng bài Đặt phòng khách sạn & Đặt vé máy bay TOEIC Part 7",
    "category": "reading",
    "part": "Part 7",
    "duration": "23:30",
    "level": "450 - 750",
    "views": 37100,
    "thumbnailUrl": "https://img.youtube.com/vi/qL8mP2vN7w1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/qL8mP2vN7w1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học tiếng Anh nhanh",
    "summary": "Phân tích các email xác nhận đặt phòng (confirmation email), chính sách hoàn hủy (refund policy) và bảng giá chi tiết.",
    "keyPoints": [
      "Tìm thông tin mã số đặt chỗ (reservation number / booking reference)",
      "Kiểm tra điều khoản hoàn tiền (cancellation deadline, non-refundable)",
      "Kỹ năng đối chiếu thời gian check-in, check-out và phụ phí dịch vụ"
    ],
    "tags": [
      "Part 7",
      "Đặt phòng",
      "Khách sạn",
      "Reading"
    ]
  },
  {
    "id": "vid-52",
    "youtubeId": "mL8xN2pK7w4",
    "title": "Ngữ pháp Bị động đặc biệt (Passive Voice with Prepositions & Modal Verbs)",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "22:15",
    "level": "500 - 800",
    "views": 38900,
    "thumbnailUrl": "https://img.youtube.com/vi/mL8xN2pK7w4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/mL8xN2pK7w4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Thể bị động đi với giới từ đặc biệt (be equipped with, be satisfied with, be filled with) và bị động của động từ khuyết thiếu.",
    "keyPoints": [
      "Không phải câu bị động nào cũng đi với 'by' - học các giới từ cố định",
      "Cấu trúc bị động của Modal Verb: S + modal + be + V3",
      "Thể bị động đặc biệt với các động từ chỉ nhận thức (it is said that...)"
    ],
    "tags": [
      "Ngữ pháp",
      "Bị động",
      "Passive Voice",
      "Part 5"
    ]
  },
  {
    "id": "vid-53",
    "youtubeId": "nK2mL8pX7w1",
    "title": "Từ vựng chuyên ngành Nhân sự, Phỏng vấn & Tuyển dụng (HR & Recruitment)",
    "category": "vocab",
    "part": "Từ vựng",
    "duration": "25:45",
    "level": "400 - 750",
    "views": 44100,
    "thumbnailUrl": "https://img.youtube.com/vi/nK2mL8pX7w1/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/nK2mL8pX7w1?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Các từ vựng cốt lõi: applicant, candidate, résumé, qualifications, salary negotiation, reference letter và probation.",
    "keyPoints": [
      "Bộ từ vựng quy trình tuyển dụng từ đăng tin đến ký hợp đồng",
      "Phân biệt recruit, employ, hire và fire, dismiss, lay off",
      "Các chế độ đãi ngộ: benefits, pension, severance package, bonus"
    ],
    "tags": [
      "Từ vựng",
      "Nhân sự",
      "Tuyển dụng",
      "HR"
    ]
  },
  {
    "id": "vid-54",
    "youtubeId": "xP7mL2kK8w4",
    "title": "Bí kíp tăng 200 điểm TOEIC trong 30 ngày cho người bận rộn",
    "category": "tips",
    "part": "Mẹo thi",
    "duration": "33:10",
    "level": "Mọi trình độ (0 - 990)",
    "views": 75300,
    "thumbnailUrl": "https://img.youtube.com/vi/xP7mL2kK8w4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/xP7mL2kK8w4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Lộ trình ôn tập cấp tốc mỗi ngày 60-90 phút: tập trung vào các dạng bài dễ lấy điểm nhất trong Part 1, 2, 5 và 6.",
    "keyPoints": [
      "Chiến lược 'hái quả thấp' gom trọn điểm số các câu hỏi cơ bản trước",
      "Tập trung học từ vựng tần suất cao thay vì nhồi nhét từ hiếm",
      "Duy trì thói quen luyện nghe 20 phút mỗi ngày vào khung giờ cố định"
    ],
    "tags": [
      "Mẹo thi",
      "Lộ trình",
      "Cấp tốc",
      "30 ngày"
    ]
  },
  {
    "id": "vid-55",
    "youtubeId": "wL8pK2mN7x4",
    "title": "Top 10 bẫy tranh ảnh khó nhất Part 1 TOEIC và cách phòng tránh",
    "category": "listening",
    "part": "Part 1",
    "duration": "19:55",
    "level": "500 - 850",
    "views": 39100,
    "thumbnailUrl": "https://img.youtube.com/vi/wL8pK2mN7x4/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/wL8pK2mN7x4?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Thầy Long TOEIC",
    "summary": "Phân tích các bức tranh có nhiều chi tiết gây nhiễu, tranh góc nhìn xa và tranh đồ vật bị che khuất trong đề thi mới.",
    "keyPoints": [
      "Bẫy hành động đang diễn ra vs hành động đã hoàn tất (putting on vs wearing)",
      "Bẫy vị trí không gian tương quan giữa các chủ thể",
      "Quy tắc tuyệt đối: Cái gì mắt không thấy rõ thì tai không được chọn"
    ],
    "tags": [
      "Part 1",
      "Bẫy tranh ảnh",
      "Listening",
      "Tranh khó"
    ]
  },
  {
    "id": "vid-56",
    "youtubeId": "3eWjQ6Qk8kI",
    "title": "Tổng hợp 100 câu TOEIC Part 1 bẫy tranh chuẩn ETS",
    "category": "listening",
    "part": "Part 1",
    "duration": "28:30",
    "level": "Căn bản (350 - 650)",
    "views": 52600,
    "thumbnailUrl": "https://img.youtube.com/vi/3eWjQ6Qk8kI/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/3eWjQ6Qk8kI?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Anh Le TOEIC",
    "summary": "Luyện tập 100 câu tranh Part 1 điển hình nhất kèm giải thích chi tiết vì sao đáp án đúng và vì sao phương án khác là bẫy.",
    "keyPoints": [
      "Phân nhóm tranh người: 1 người, 2 người, đám đông nơi công cộng",
      "Phân nhóm tranh vật: văn phòng, công trường, nhà hàng, đường phố",
      "Luyện thói quen nghe 4 đáp án và tự loại trừ trên phiếu trả lời"
    ],
    "tags": [
      "Part 1",
      "100 câu",
      "Luyện nghe",
      "Listening"
    ]
  },
  {
    "id": "vid-57",
    "youtubeId": "k0tZ1G4fJ1g",
    "title": "Mẹo làm câu Liên từ phụ thuộc vs Trạng từ liên kết Part 5",
    "category": "grammar",
    "part": "Part 5",
    "duration": "21:10",
    "level": "550 - 850+",
    "views": 36800,
    "thumbnailUrl": "https://img.youtube.com/vi/k0tZ1G4fJ1g/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/k0tZ1G4fJ1g?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Barmunity English",
    "summary": "Phân biệt while/meanwhile, although/even so, because/therefore qua dấu câu (dấu phẩy, dấu chấm phẩy) trong đề thi Part 5.",
    "keyPoints": [
      "Trạng từ liên kết (Conjunctive Adverbs) đứng sau dấu chấm phẩy hoặc đầu câu có dấu phẩy",
      "Liên từ phụ thuộc (Subordinating Conjunctions) nối trực tiếp hai mệnh đề",
      "Mẹo nhìn dấu câu chọn đáp án trong 3 giây không cần dịch nghĩa"
    ],
    "tags": [
      "Ngữ pháp",
      "Liên từ",
      "Trạng từ liên kết",
      "Part 5"
    ]
  },
  {
    "id": "vid-58",
    "youtubeId": "4gV9v_u7n4U",
    "title": "10 Quy tắc chia động từ số ít - số nhiều trong đề thi TOEIC",
    "category": "grammar",
    "part": "Ngữ pháp",
    "duration": "23:45",
    "level": "Mọi trình độ (0 - 990)",
    "views": 48300,
    "thumbnailUrl": "https://img.youtube.com/vi/4gV9v_u7n4U/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/4gV9v_u7n4U?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Học tiếng Anh nhanh",
    "summary": "Quy tắc hòa hợp chủ vị với each, every, either... or, neither... nor, along with, as well as và danh từ tập hợp.",
    "keyPoints": [
      "Chủ ngữ có 'as well as / together with / along with' chia theo chủ ngữ đầu tiên",
      "'Either... or / Neither... nor' chia theo chủ ngữ gần động từ nhất",
      "'The number of + Ns' đi với động từ số ít, 'A number of + Ns' đi với động từ số nhiều"
    ],
    "tags": [
      "Ngữ pháp",
      "Hòa hợp chủ vị",
      "Subject-Verb",
      "Part 5"
    ]
  },
  {
    "id": "vid-59",
    "youtubeId": "X4_XoD6Q2k8",
    "title": "Kỹ năng nghe bài phát biểu & Giới thiệu nhân sự Part 4 (Speeches & Introductions)",
    "category": "listening",
    "part": "Part 4",
    "duration": "26:20",
    "level": "550 - 850",
    "views": 40200,
    "thumbnailUrl": "https://img.youtube.com/vi/X4_XoD6Q2k8/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/X4_XoD6Q2k8?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Thắm Toeic",
    "summary": "Bí kíp làm dạng bài chào đón nhân viên mới, lễ trao giải thưởng hoặc bài phát biểu chia tay người nghỉ hưu trong Part 4.",
    "keyPoints": [
      "Từ khóa mở đầu: 'I’d like to introduce...', 'Please join me in welcoming...'",
      "Bắt các thành tích nổi bật của nhân vật được tôn vinh",
      "Hành động tiếp theo: 'Let’s give a round of applause' hoặc 'Enjoy the refreshments'"
    ],
    "tags": [
      "Part 4",
      "Speeches",
      "Phát biểu",
      "Listening"
    ]
  },
  {
    "id": "vid-60",
    "youtubeId": "8t4nK7xP1mY",
    "title": "Chữa đề thi TOEIC ETS Test 3 - Phân tích chi tiết 40 câu Listening Part 3",
    "category": "tips",
    "part": "Chữa đề",
    "duration": "41:15",
    "level": "500 - 850+",
    "views": 59700,
    "thumbnailUrl": "https://img.youtube.com/vi/8t4nK7xP1mY/hqdefault.jpg",
    "videoUrl": "https://www.youtube-nocookie.com/embed/8t4nK7xP1mY?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1",
    "instructor": "Ms Hoa TOEIC Official",
    "summary": "Bóc tách 40 câu Part 3 trong đề ETS Test 3, hướng dẫn cách đọc lướt câu hỏi trước khi băng phát và đánh dấu đáp án nhanh.",
    "keyPoints": [
      "Chiến lược nhịp điệu: Đọc xong 3 câu hỏi trước khi lời thoại bắt đầu 5 giây",
      "Kỹ thuật vừa nghe vừa chấm tay vào đáp án trên đề",
      "Tô đáp án trong khoảng nghỉ đọc câu hỏi của máy để chuẩn bị cho đoạn kế tiếp"
    ],
    "tags": [
      "Chữa đề",
      "ETS Test 3",
      "Part 3",
      "Listening"
    ]
  }
];

interface VideoLessonsPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

export const VideoLessonsPage: React.FC<VideoLessonsPageProps> = ({
  onNavigate,
  onOpenAuth,
  onOpenRBAC,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'views'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [savedUserNotes, setSavedUserNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('toeic_user_video_notes') || '{}');
    } catch {
      return {};
    }
  });
  const [currentNote, setCurrentNote] = useState<string>('');
  const prevVideoIdRef = useRef<string | null>(null);

  if (activeVideo && activeVideo.id !== prevVideoIdRef.current) {
    prevVideoIdRef.current = activeVideo.id;
    setCurrentNote(savedUserNotes[activeVideo.id] || '');
  }

  const handleSaveNote = () => {
    if (!activeVideo) return;
    const updated = { ...savedUserNotes, [activeVideo.id]: currentNote };
    setSavedUserNotes(updated);
    try {
      localStorage.setItem('toeic_user_video_notes', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save video note:', e);
    }
  };

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Kho Video Bài giảng TOEIC"
        featureDesc="Video bài giảng thực chiến từ chuyên gia: bóc tách chiến thuật 7 Parts, mẹo ngữ pháp 5 giây và giải đề thi thật ETS."
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
        onOpenRBAC={onOpenRBAC}
      />
    );
  }

  const filteredVideos = VIDEO_LESSONS.filter((vid) => {
    if (selectedCategory !== 'all' && vid.category !== selectedCategory) return false;
    if (selectedPart !== 'all' && vid.part !== selectedPart) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = vid.title.toLowerCase().includes(q);
      const matchSummary = vid.summary.toLowerCase().includes(q);
      const matchInstructor = vid.instructor.toLowerCase().includes(q);
      const matchPart = vid.part.toLowerCase().includes(q);
      const matchTags = vid.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchInstructor && !matchPart && !matchTags) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'views') return b.views - a.views;
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `Tất cả bài giảng (${VIDEO_LESSONS.length})` },
                { id: 'listening', label: '🎧 Luyện nghe (Part 1-4)' },
                { id: 'reading', label: '📖 Luyện đọc (Part 5-7)' },
                { id: 'grammar', label: '📝 Ngữ pháp trọng điểm' },
                { id: 'vocab', label: '🎯 600 Từ vựng TOEIC' },
                { id: 'tips', label: '💡 Chữa đề & Mẹo thi' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedPart('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo chủ đề, giáo viên, Part..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sub-Part Filters and Results Count */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Lọc theo Part:</span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'Part 1', label: 'Part 1' },
                { id: 'Part 2', label: 'Part 2' },
                { id: 'Part 3', label: 'Part 3' },
                { id: 'Part 4', label: 'Part 4' },
                { id: 'Part 5', label: 'Part 5' },
                { id: 'Part 6', label: 'Part 6' },
                { id: 'Part 7', label: 'Part 7' },
                { id: 'Ngữ pháp', label: 'Ngữ pháp' },
                { id: 'Từ vựng', label: 'Từ vựng' },
                { id: 'Mẹo thi', label: 'Mẹo thi' },
                { id: 'Chữa đề', label: 'Chữa đề' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPart(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPart === p.id
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
              <span>Hiển thị <strong>{filteredVideos.length}</strong> bài giảng</span>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'views' ? 'default' : 'views')}
                className={`font-semibold cursor-pointer transition-colors ${sortBy === 'views' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {sortBy === 'views' ? '🔥 Xem nhiều nhất' : '⚡ Thứ tự đề xuất'}
              </button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((vid) => (
            <div
              key={vid.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
            >
              {/* Thumbnail Container */}
              <div
                className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer"
                onClick={() => setActiveVideo(vid)}
              >
                <img
                  src={vid.thumbnailUrl}
                  alt={vid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e: any) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-xs">
                  <Clock className="w-3 h-3" />
                  <span>{vid.duration}</span>
                </div>

                {/* Part / Category Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                  {vid.part}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="text-blue-700 font-bold truncate max-w-[180px]">{vid.instructor}</span>
                    <span className="shrink-0">{vid.level}</span>
                  </div>

                  <h3
                    onClick={() => setActiveVideo(vid)}
                    className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                    title={vid.title}
                  >
                    {vid.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {vid.summary}
                  </p>
                </div>

                {/* Footer Meta */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {vid.tags.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Xem bài giảng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Player with Ad-Blocking Embed */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <div
            className={`bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
              isTheaterMode
                ? 'w-full max-w-6xl max-h-[96vh]'
                : 'w-full max-w-4xl max-h-[92vh]'
            }`}
          >
            {/* Modal Top Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0">
                  {activeVideo.part}
                </span>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {activeVideo.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Theater Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsTheaterMode((prev) => !prev)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title={isTheaterMode ? 'Thu nhỏ cửa sổ' : 'Chế độ rạp phim (Mở rộng)'}
                >
                  {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleSaveNote();
                    setActiveVideo(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Area with Privacy Enhanced YouTube Host */}
            <div className="relative aspect-video bg-black shrink-0 w-full">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&disablekb=0&playsinline=1&enablejsapi=1`}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Video Notes & Key Points Tabbed / Scroll Area */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-white flex-1">
              {/* Instructor Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Giảng viên / Kênh:</span>
                  <span className="text-blue-700 font-semibold">{activeVideo.instructor}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">Thời lượng: {activeVideo.duration}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">Trình độ: {activeVideo.level}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tóm tắt bài học:
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeVideo.summary}
                </p>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mẹo thực chiến & Trọng tâm kiến thức:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeVideo.keyPoints.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-800 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {pIdx + 1}
                      </span>
                      <span className="leading-relaxed">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Study Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    Ghi chú nhanh khi học:
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Lưu ghi chú
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  onBlur={handleSaveNote}
                  placeholder="Ghi lại mẹo thi, từ vựng mới hoặc lưu ý từ bài giảng này..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
