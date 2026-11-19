import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Star,
  CheckCircle2,
  Lock,
  Play,
  Sparkles,
  BookOpen,
  Headphones,
  Video,
  Repeat,
  Gift,
  ArrowDown,
  FastForward,
  X,
  Flame,
  Award
} from 'lucide-react';
import { VocabLessonNode, VocabUserProgress } from '../../types/vocabDuo';

interface VocabPathViewProps {
  progress: VocabUserProgress;
  onSelectNode: (node: VocabLessonNode) => void;
  onUnlockNext?: () => void;
  onFastPass?: (unitId: string, unitIndex: number) => void;
}

export interface VocabUnitDef {
  id: string;
  unitIndex: number;
  doorNumber: number;
  title: string;
  subtopic: string;
  description: string;
  themeColor: string;
  nodes: VocabLessonNode[];
}

export const VOCAB_UNITS: VocabUnitDef[] = [
  {
    "id": "unit_1",
    "unitIndex": 1,
    "doorNumber": 3,
    "title": "Unit 1: Hợp đồng & Đàm phán (Contracts & Negotiations)",
    "subtopic": "Nắm vững các thuật ngữ pháp lý cơ bản",
    "description": "Nắm vững các thuật ngữ pháp lý cơ bản, đàm phán hợp đồng thương mại.",
    "themeColor": "green",
    "nodes": [
      {
        "id": "v_u1_n1",
        "topicId": "contract",
        "unitIndex": 1,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Thuật ngữ Hợp đồng",
        "subtitle": "Khái niệm & từ loại cốt lõi",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u1_n2",
        "topicId": "contract",
        "unitIndex": 1,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Luyện phản xạ từ",
        "subtitle": "Trắc nghiệm nghĩa tiếng Việt",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u1_n3",
        "topicId": "contract",
        "unitIndex": 1,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Luyện phát âm chuẩn với Micro (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u1_n4",
        "topicId": "contract",
        "unitIndex": 1,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 1",
        "subtitle": "Đánh giá độ thuần thục",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_2",
    "unitIndex": 2,
    "doorNumber": 6,
    "title": "Unit 2: Văn phòng & Công sở (Office & Workplace)",
    "subtopic": "Giao tiếp công sở",
    "description": "Giao tiếp công sở, thông báo nội bộ và quản trị quy trình hành chính.",
    "themeColor": "blue",
    "nodes": [
      {
        "id": "v_u2_n1",
        "topicId": "office",
        "unitIndex": 2,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Thiết bị & Quy trình",
        "subtitle": "Từ vựng văn phòng phẩm",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u2_n2",
        "topicId": "office",
        "unitIndex": 2,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Luyện phản xạ công sở",
        "subtitle": "Phản xạ từ vựng văn phòng",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u2_n3",
        "topicId": "office",
        "unitIndex": 2,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn thuật ngữ công sở (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u2_n4",
        "topicId": "office",
        "unitIndex": 2,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 2",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_3",
    "unitIndex": 3,
    "doorNumber": 9,
    "title": "Unit 3: Kinh doanh & Tài chính (Business & Finance)",
    "subtopic": "Báo cáo doanh thu",
    "description": "Báo cáo doanh thu, đầu tư chứng khoán và quản lý dòng tiền.",
    "themeColor": "purple",
    "nodes": [
      {
        "id": "v_u3_n1",
        "topicId": "finance",
        "unitIndex": 3,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Thuật ngữ Kế toán",
        "subtitle": "Doanh thu, chi phí, lợi nhuận",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u3_n2",
        "topicId": "finance",
        "unitIndex": 3,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Giao dịch Ngân hàng",
        "subtitle": "Thanh toán & tín dụng",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u3_n3",
        "topicId": "finance",
        "unitIndex": 3,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng tài chính (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u3_n4",
        "topicId": "finance",
        "unitIndex": 3,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 3",
        "subtitle": "Chứng chỉ thành thạo",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_4",
    "unitIndex": 4,
    "doorNumber": 12,
    "title": "Unit 4: Nhân sự & Tuyển dụng (Personnel & HR)",
    "subtopic": "Quy trình phỏng vấn",
    "description": "Quy trình phỏng vấn, hồ sơ xin việc, chế độ đãi ngộ và phát triển nhân tài.",
    "themeColor": "pink",
    "nodes": [
      {
        "id": "v_u4_n1",
        "topicId": "personnel",
        "unitIndex": 4,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Tuyển dụng & Phỏng vấn",
        "subtitle": "CV, ứng viên và tiêu chuẩn",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u4_n2",
        "topicId": "personnel",
        "unitIndex": 4,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Lương bổng & Đãi ngộ",
        "subtitle": "Chế độ phúc lợi & thăng tiến",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u4_n3",
        "topicId": "personnel",
        "unitIndex": 4,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn thuật ngữ nhân sự (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u4_n4",
        "topicId": "personnel",
        "unitIndex": 4,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 4",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_5",
    "unitIndex": 5,
    "doorNumber": 15,
    "title": "Unit 5: Du lịch & Khách sạn (Travel & Hospitality)",
    "subtopic": "Vé máy bay",
    "description": "Vé máy bay, thủ tục sân bay, đặt phòng khách sạn và lịch trình di chuyển.",
    "themeColor": "green",
    "nodes": [
      {
        "id": "v_u5_n1",
        "topicId": "travel",
        "unitIndex": 5,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Hàng không & Chuyến bay",
        "subtitle": "Đặt vé & thủ tục sân bay",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u5_n2",
        "topicId": "travel",
        "unitIndex": 5,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Lưu trú Khách sạn",
        "subtitle": "Dịch vụ & nhận phòng",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u5_n3",
        "topicId": "travel",
        "unitIndex": 5,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng du lịch (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u5_n4",
        "topicId": "travel",
        "unitIndex": 5,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 5",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_6",
    "unitIndex": 6,
    "doorNumber": 18,
    "title": "Unit 6: Nhà hàng & Sự kiện (Dining & Catering)",
    "subtopic": "Đặt bàn tiệc",
    "description": "Đặt bàn tiệc, thực đơn ẩm thực, tổ chức hội nghị và đón tiếp khách VIP.",
    "themeColor": "blue",
    "nodes": [
      {
        "id": "v_u6_n1",
        "topicId": "dining",
        "unitIndex": 6,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Thực đơn & Đặt bàn",
        "subtitle": "Món ăn, đồ uống & gọi món",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u6_n2",
        "topicId": "dining",
        "unitIndex": 6,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Tiệc & Sự kiện",
        "subtitle": "Hội nghị & tiệc chiêu đãi",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u6_n3",
        "topicId": "dining",
        "unitIndex": 6,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn thực đơn & món ăn (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u6_n4",
        "topicId": "dining",
        "unitIndex": 6,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 6",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_7",
    "unitIndex": 7,
    "doorNumber": 21,
    "title": "Unit 7: Marketing & Tiếp thị (Marketing & Sales)",
    "subtopic": "Chiến dịch quảng cáo",
    "description": "Chiến dịch quảng cáo, nghiên cứu thị trường, tiếp cận khách hàng và thương hiệu.",
    "themeColor": "purple",
    "nodes": [
      {
        "id": "v_u7_n1",
        "topicId": "marketing",
        "unitIndex": 7,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Nghiên cứu Thị trường",
        "subtitle": "Thị hiếu & khách hàng mục tiêu",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u7_n2",
        "topicId": "marketing",
        "unitIndex": 7,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Chiến dịch Quảng cáo",
        "subtitle": "Khuyến mãi & truyền thông",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u7_n3",
        "topicId": "marketing",
        "unitIndex": 7,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn thuật ngữ quảng cáo (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u7_n4",
        "topicId": "marketing",
        "unitIndex": 7,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 7",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_8",
    "unitIndex": 8,
    "doorNumber": 24,
    "title": "Unit 8: Kỹ thuật & Thiết bị (Technology & IT)",
    "subtopic": "Hệ thống máy tính",
    "description": "Hệ thống máy tính, phần mềm văn phòng, khắc phục sự cố và bảo mật số.",
    "themeColor": "pink",
    "nodes": [
      {
        "id": "v_u8_n1",
        "topicId": "technology",
        "unitIndex": 8,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Phần mềm & Hệ thống",
        "subtitle": "Cài đặt & dữ liệu số",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u8_n2",
        "topicId": "technology",
        "unitIndex": 8,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Bảo trì & Thiết bị",
        "subtitle": "Sửa chữa & khắc phục sự cố",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u8_n3",
        "topicId": "technology",
        "unitIndex": 8,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn thuật ngữ IT (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u8_n4",
        "topicId": "technology",
        "unitIndex": 8,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 8",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_9",
    "unitIndex": 9,
    "doorNumber": 27,
    "title": "Unit 9: Mua sắm & Tiêu dùng (Shopping & Retail)",
    "subtopic": "Thương mại bán lẻ",
    "description": "Thương mại bán lẻ, ưu đãi giảm giá, thanh toán hóa đơn và chính sách đổi trả.",
    "themeColor": "green",
    "nodes": [
      {
        "id": "v_u9_n1",
        "topicId": "shopping",
        "unitIndex": 9,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Cửa hàng & Bán lẻ",
        "subtitle": "Giá cả, hóa đơn & thanh toán",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u9_n2",
        "topicId": "shopping",
        "unitIndex": 9,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Đổi trả & Hậu mãi",
        "subtitle": "Hoàn tiền & dịch vụ khách hàng",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u9_n3",
        "topicId": "shopping",
        "unitIndex": 9,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng mua sắm (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u9_n4",
        "topicId": "shopping",
        "unitIndex": 9,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 9",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_10",
    "unitIndex": 10,
    "doorNumber": 30,
    "title": "Unit 10: Giải trí & Nghệ thuật (Entertainment & Media)",
    "subtopic": "Sự kiện âm nhạc",
    "description": "Sự kiện âm nhạc, bảo tàng triển lãm, rạp chiếu phim và truyền thông đại chúng.",
    "themeColor": "blue",
    "nodes": [
      {
        "id": "v_u10_n1",
        "topicId": "entertainment",
        "unitIndex": 10,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Sự kiện Nghệ thuật",
        "subtitle": "Bảo tàng, hòa nhạc & vé xem",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u10_n2",
        "topicId": "entertainment",
        "unitIndex": 10,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Truyền thông & Báo chí",
        "subtitle": "Phát thanh, truyền hình & tin tức",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u10_n3",
        "topicId": "entertainment",
        "unitIndex": 10,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng nghệ thuật (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u10_n4",
        "topicId": "entertainment",
        "unitIndex": 10,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 10",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_11",
    "unitIndex": 11,
    "doorNumber": 33,
    "title": "Unit 11: Y tế & Sức khỏe (Health & Medicine)",
    "subtopic": "Khám chữa bệnh",
    "description": "Khám chữa bệnh, bảo hiểm y tế, đơn thuốc và chăm sóc sức khỏe công sở.",
    "themeColor": "purple",
    "nodes": [
      {
        "id": "v_u11_n1",
        "topicId": "health",
        "unitIndex": 11,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Phòng khám & Bệnh viện",
        "subtitle": "Bác sĩ, lịch hẹn & xét nghiệm",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u11_n2",
        "topicId": "health",
        "unitIndex": 11,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Thuốc & Bảo hiểm Y tế",
        "subtitle": "Kê đơn & thanh toán viện phí",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u11_n3",
        "topicId": "health",
        "unitIndex": 11,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng y tế (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u11_n4",
        "topicId": "health",
        "unitIndex": 11,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 11",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_12",
    "unitIndex": 12,
    "doorNumber": 36,
    "title": "Unit 12: Bất động sản & Nhà ở (Housing & Real Estate)",
    "subtopic": "Hợp đồng thuê căn hộ",
    "description": "Hợp đồng thuê căn hộ, tiền đặt cọc, cải tạo không gian sống và cơ sở hạ tầng.",
    "themeColor": "pink",
    "nodes": [
      {
        "id": "v_u12_n1",
        "topicId": "housing",
        "unitIndex": 12,
        "nodeIndex": 0,
        "type": "comprehensive",
        "title": "Thuê nhà & Tiện ích",
        "subtitle": "Căn hộ, tiền đặt cọc & hợp đồng thuê",
        "wordCount": 8,
        "xpReward": 20
      },
      {
        "id": "v_u12_n2",
        "topicId": "housing",
        "unitIndex": 12,
        "nodeIndex": 1,
        "type": "comprehensive",
        "title": "Sửa chữa & Kiến trúc",
        "subtitle": "Hệ thống điện nước & cải tạo nhà",
        "wordCount": 8,
        "xpReward": 25
      },
      {
        "id": "v_u12_n3",
        "topicId": "housing",
        "unitIndex": 12,
        "nodeIndex": 2,
        "type": "comprehensive",
        "title": "Luyện đọc phát âm",
        "subtitle": "Phát âm chuẩn từ vựng nhà ở (70+)",
        "wordCount": 5,
        "xpReward": 35
      },
      {
        "id": "v_u12_n4",
        "topicId": "housing",
        "unitIndex": 12,
        "nodeIndex": 3,
        "type": "comprehensive",
        "title": "Kiểm tra Chốt Unit 12",
        "subtitle": "Thử thách tổng kết toàn lộ trình",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  }
];

export const VocabPathView: React.FC<VocabPathViewProps> = ({
  progress,
  onSelectNode,
  onFastPass
}) => {
  const [activeTooltipNodeId, setActiveTooltipNodeId] = useState<string | null>(null);
  const [jumpModalUnit, setJumpModalUnit] = useState<any | null>(null);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active lesson node
  const scrollToActiveNode = () => {
    if (activeNodeRef.current) {
      activeNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActiveNode();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const themeClasses: Record<string, { headerBg: string; border: string; accent: string }> = {
    green: {
      headerBg: 'bg-[#58CC02] border-[#46A302] text-white',
      border: 'border-[#58CC02]',
      accent: 'bg-[#58CC02]'
    },
    blue: {
      headerBg: 'bg-[#1CB0F6] border-[#1899D6] text-white',
      border: 'border-[#1CB0F6]',
      accent: 'bg-[#1CB0F6]'
    },
    purple: {
      headerBg: 'bg-[#CE82FF] border-[#BA57FF] text-white',
      border: 'border-[#CE82FF]',
      accent: 'bg-[#CE82FF]'
    },
    pink: {
      headerBg: 'bg-[#FF4B4B] border-[#EA2B2B] text-white',
      border: 'border-[#FF4B4B]',
      accent: 'bg-[#FF4B4B]'
    }
  };

  // Helper to determine node icon
  const getNodeIcon = (node: VocabLessonNode, isCompleted: boolean, isLocked: boolean) => {
    if (isCompleted) return <CheckCircle2 className="w-8 h-8 text-white drop-shadow-xs" />;
    if (isLocked) return <Lock className="w-6 h-6 text-slate-400" />;
    if (node.nodeIndex === 3) return <Trophy className="w-7 h-7 text-white" />;
    if (node.nodeIndex === 2) return <Headphones className="w-7 h-7 text-white" />;
    if (node.nodeIndex === 1) return <Star className="w-7 h-7 text-white fill-white" />;
    return <BookOpen className="w-7 h-7 text-white" />;
  };
  

  return (
    <div className="w-full max-w-xl mx-auto py-4 px-3 sm:px-4 select-none relative pb-32">
      {VOCAB_UNITS.map((unit, uIdx) => {
        const theme = themeClasses[unit.themeColor] || themeClasses.green;

        return (
          <div key={unit.id} className="mb-14 relative">
            {/* Duolingo Section Header (Photos 1, 2, 3, 5) */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border-b-4 shadow-md flex items-center justify-between mb-8 sticky top-3 z-30 transition-all ${theme.headerBg}`}
            >
              <div>
                <div className="text-[11px] sm:text-xs font-black tracking-wider uppercase opacity-90">
                  PHẦN {unit.unitIndex}, CỬA {unit.doorNumber}
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5 leading-snug">
                  {unit.title}
                </h3>
                <div className="text-xs font-medium opacity-90 mt-0.5">
                  {unit.subtopic}
                </div>
              </div>

              <button
                type="button"
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Sổ tay ghi chú & lý thuyết"
              >
                <BookOpen className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Winding Path Nodes */}
            <div className="flex flex-col items-center space-y-6 relative py-2">
              {unit.nodes.map((node, nIdx) => {
                const nodeProg = progress.nodes[node.id];
                const isCompleted = nodeProg?.status === 'completed';
                const isFirstOfAll = uIdx === 0 && nIdx === 0;
                const prevNodeId = nIdx > 0 ? unit.nodes[nIdx - 1].id : uIdx > 0 ? VOCAB_UNITS[uIdx - 1].nodes[VOCAB_UNITS[uIdx - 1].nodes.length - 1].id : null;
                const isUnlocked = isCompleted || isFirstOfAll || (prevNodeId ? progress.nodes[prevNodeId]?.status === 'completed' : false) || nodeProg?.status === 'unlocked';
                const isCurrent = isUnlocked && !isCompleted;

                // S-Curve Offsets (Center -> Right -> Far Right -> Center -> Left -> Far Left)
                const curveOffsets = [
                  'translate-x-0',
                  'translate-x-12 sm:translate-x-16',
                  'translate-x-20 sm:translate-x-24',
                  'translate-x-10 sm:translate-x-12',
                  'translate-x-0',
                  '-translate-x-10 sm:-translate-x-12',
                  '-translate-x-20 sm:-translate-x-24',
                  '-translate-x-12 sm:-translate-x-16'
                ];
                const offsetClass = curveOffsets[(uIdx * 4 + nIdx) % curveOffsets.length];

                return (
                  <div
                    key={node.id}
                    ref={isCurrent ? activeNodeRef : undefined}
                    className={`flex flex-col items-center relative ${offsetClass}`}
                  >
                    {/* 3D Duolingo Node Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnlocked) {
                          setActiveTooltipNodeId((prev) => (prev === node.id ? null : node.id));
                        } else {
                          setActiveTooltipNodeId((prev) => (prev === node.id ? null : node.id));
                        }
                      }}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center font-black transition-all shadow-xl cursor-pointer ${
                        isCompleted
                          ? 'bg-[#FFC800] border-b-6 border-[#E5A500] hover:scale-105 active:translate-y-1'
                          : isCurrent
                          ? 'bg-[#58CC02] border-b-6 border-[#46A302] hover:scale-105 active:translate-y-1 ring-8 ring-[#58CC02]/25 animate-bounce-subtle'
                          : isUnlocked
                          ? 'bg-[#1CB0F6] border-b-6 border-[#1899D6] hover:scale-105'
                          : 'bg-[#E5E5E5] border-b-6 border-[#CECECE] cursor-pointer'
                      }`}
                    >
                      {getNodeIcon(node, isCompleted, !isUnlocked)}

                      

                      {/* Stars count under node */}
                      {isCompleted && (
                        <div className="absolute -bottom-2 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        </div>
                      )}
                    </button>

                    {/* Node Title & Subtitle Badge below 3D button */}
                    <div className="text-center mt-2 max-w-[130px] pointer-events-none select-none">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
                        {node.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                        {node.subtitle} • {node.wordCount} từ
                      </div>
                    </div>

                    {/* Popover Tooltip Dialog on Node Click (Photos 2 & 9) */}
                    {activeTooltipNodeId === node.id && (
                      <div className="absolute -top-32 z-40 bg-[#FF4B4B] text-white p-4 rounded-3xl shadow-2xl w-64 text-center animate-in zoom-in-95 duration-150 border-2 border-white">
                        {isUnlocked ? (
                          <div className="space-y-2">
                            <div className="text-xs font-black tracking-wide uppercase opacity-90">
                              {isCompleted ? 'Ôn tập lại' : 'Điểm học tập'}
                            </div>
                            <h4 className="text-sm font-black truncate">{node.title}</h4>
                            <div className="text-[11px] opacity-90">{node.subtitle} ({node.wordCount} từ)</div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTooltipNodeId(null);
                                onSelectNode(node);
                              }}
                              className="w-full py-2.5 rounded-2xl bg-white text-[#FF4B4B] hover:bg-slate-50 font-black text-xs uppercase tracking-wider shadow-md transition-transform active:scale-95 cursor-pointer mt-1"
                            >
                              BẮT ĐẦU +{node.xpReward} KN
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 bg-slate-800 text-white -m-4 p-4 rounded-3xl border-2 border-slate-700">
                            <h4 className="text-sm font-black">{node.title}</h4>
                            <p className="text-xs text-slate-300">
                              Hãy hoàn thành tất cả các cấp độ phía trên để mở khóa!
                            </p>
                            <button
                              disabled
                              className="w-full py-2 rounded-xl bg-slate-700 text-slate-400 font-bold text-xs uppercase cursor-not-allowed"
                            >
                              KHÓA
                            </button>
                          </div>
                        )}
                        <div className="w-3 h-3 bg-[#FF4B4B] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Jump Ahead / Học vượt Banner at end of Section (Photos 4, 7, 8) */}
            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300/80 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kế tiếp: Phần {unit.unitIndex + 1}
              </div>
              <button
                type="button"
                onClick={() => setJumpModalUnit(unit)}
                className="px-6 py-2.5 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <FastForward className="w-4 h-4 text-emerald-600" />
                <span>HỌC VƯỢT?</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* Floating Scroll Down to Current Node Button (Photos 1, 3, 5, 8) */}
      <button
        type="button"
        onClick={scrollToActiveNode}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-90 border border-slate-700"
        title="Cuộn tới bài đang học"
      >
        <ArrowDown className="w-6 h-6 animate-pulse" />
      </button>

      {/* Modal Học Vượt (Jump Test Modal - Photo 6) */}
      {jumpModalUnit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131F24] border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl text-white">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setJumpModalUnit(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black">
                Nhảy tới Phần {jumpModalUnit.unitIndex + 1} nhé!
              </h3>
              <p className="text-xs text-slate-300">
                Làm bài kiểm tra đánh giá để mở khóa ngay lập tức toàn bộ các bài của Phần {jumpModalUnit.unitIndex}.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onFastPass?.(jumpModalUnit.id, jumpModalUnit.unitIndex);
                  setJumpModalUnit(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-[#1CB0F6] hover:bg-[#1899D6] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                BẮT ĐẦU BÀI KIỂM TRA
              </button>
              <button
                type="button"
                onClick={() => setJumpModalUnit(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                KHÔNG, CẢM ƠN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
