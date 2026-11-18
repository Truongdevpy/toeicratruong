import React from 'react';
import { Trophy, Star, CheckCircle2, Lock, Play, Sparkles } from 'lucide-react';
import { VocabLessonNode, VocabUserProgress } from '../../types/vocabDuo';

interface VocabPathViewProps {
  progress: VocabUserProgress;
  onSelectNode: (node: VocabLessonNode) => void;
  onUnlockNext?: () => void;
}

export const VOCAB_UNITS: {
  id: string;
  title: string;
  description: string;
  nodes: VocabLessonNode[];
}[] = [
  {
    "id": "unit_1",
    "title": "Unit 1: Hợp đồng & Đàm phán (Contracts & Negotiations)",
    "description": "Nắm vững các thuật ngữ pháp lý cơ bản, đàm phán hợp đồng thương mại.",
    "nodes": [
      {
        "id": "v_u1_n1",
        "topicId": "contract",
        "unitIndex": 1,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 1",
        "subtitle": "Đánh giá độ thuần thục",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_2",
    "title": "Unit 2: Văn phòng & Công sở (Office & Workplace)",
    "description": "Giao tiếp công sở, thông báo nội bộ và quản trị quy trình hành chính.",
    "nodes": [
      {
        "id": "v_u2_n1",
        "topicId": "office",
        "unitIndex": 2,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 2",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_3",
    "title": "Unit 3: Kinh doanh & Tài chính (Business & Finance)",
    "description": "Báo cáo doanh thu, đầu tư chứng khoán và quản lý dòng tiền.",
    "nodes": [
      {
        "id": "v_u3_n1",
        "topicId": "finance",
        "unitIndex": 3,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 3",
        "subtitle": "Chứng chỉ thành thạo",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_4",
    "title": "Unit 4: Nhân sự & Tuyển dụng (Personnel & HR)",
    "description": "Quy trình phỏng vấn, hồ sơ xin việc, chế độ đãi ngộ và phát triển nhân tài.",
    "nodes": [
      {
        "id": "v_u4_n1",
        "topicId": "personnel",
        "unitIndex": 4,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 4",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_5",
    "title": "Unit 5: Du lịch & Khách sạn (Travel & Hospitality)",
    "description": "Vé máy bay, thủ tục sân bay, đặt phòng khách sạn và lịch trình di chuyển.",
    "nodes": [
      {
        "id": "v_u5_n1",
        "topicId": "travel",
        "unitIndex": 5,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 5",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_6",
    "title": "Unit 6: Nhà hàng & Sự kiện (Dining & Catering)",
    "description": "Đặt bàn tiệc, thực đơn ẩm thực, tổ chức hội nghị và đón tiếp khách VIP.",
    "nodes": [
      {
        "id": "v_u6_n1",
        "topicId": "dining",
        "unitIndex": 6,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 6",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_7",
    "title": "Unit 7: Marketing & Tiếp thị (Marketing & Sales)",
    "description": "Chiến dịch quảng cáo, nghiên cứu thị trường, tiếp cận khách hàng và thương hiệu.",
    "nodes": [
      {
        "id": "v_u7_n1",
        "topicId": "marketing",
        "unitIndex": 7,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 7",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_8",
    "title": "Unit 8: Kỹ thuật & Thiết bị (Technology & IT)",
    "description": "Hệ thống máy tính, phần mềm văn phòng, khắc phục sự cố và bảo mật số.",
    "nodes": [
      {
        "id": "v_u8_n1",
        "topicId": "technology",
        "unitIndex": 8,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 8",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_9",
    "title": "Unit 9: Mua sắm & Tiêu dùng (Shopping & Retail)",
    "description": "Thương mại bán lẻ, ưu đãi giảm giá, thanh toán hóa đơn và chính sách đổi trả.",
    "nodes": [
      {
        "id": "v_u9_n1",
        "topicId": "shopping",
        "unitIndex": 9,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 9",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_10",
    "title": "Unit 10: Giải trí & Nghệ thuật (Entertainment & Media)",
    "description": "Sự kiện âm nhạc, bảo tàng triển lãm, rạp chiếu phim và truyền thông đại chúng.",
    "nodes": [
      {
        "id": "v_u10_n1",
        "topicId": "entertainment",
        "unitIndex": 10,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 10",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_11",
    "title": "Unit 11: Y tế & Sức khỏe (Health & Medicine)",
    "description": "Khám chữa bệnh, bảo hiểm y tế, đơn thuốc và chăm sóc sức khỏe công sở.",
    "nodes": [
      {
        "id": "v_u11_n1",
        "topicId": "health",
        "unitIndex": 11,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 11",
        "subtitle": "Thử thách tổng hợp",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  },
  {
    "id": "unit_12",
    "title": "Unit 12: Bất động sản & Nhà ở (Housing & Real Estate)",
    "description": "Hợp đồng thuê căn hộ, tiền đặt cọc, cải tạo không gian sống và cơ sở hạ tầng.",
    "nodes": [
      {
        "id": "v_u12_n1",
        "topicId": "housing",
        "unitIndex": 12,
        "nodeIndex": 0,
        "type": "theory",
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
        "type": "practice_basic",
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
        "type": "collocations",
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
        "type": "checkpoint",
        "title": "Kiểm tra Chốt Unit 12",
        "subtitle": "Thử thách tổng kết toàn lộ trình",
        "wordCount": 10,
        "xpReward": 50
      }
    ]
  }
];

export const VocabPathView: React.FC<VocabPathViewProps> = ({ progress, onSelectNode }) => {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-12">
      {VOCAB_UNITS.map((unit, uIdx) => (
        <div key={unit.id} className="space-y-6">
          {/* Unit Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">Lộ trình Chinh phục</div>
              <h2 className="text-lg font-black">{unit.title}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">{unit.description}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          {/* Duolingo Winding Path Nodes */}
          <div className="flex flex-col items-center space-y-6 py-4 relative">
            {unit.nodes.map((node, nIdx) => {
              const nodeProg = progress.nodes[node.id];
              const isCompleted = nodeProg?.status === 'completed';
              const isUnlocked = isCompleted || nIdx === 0 || uIdx === 0 || nodeProg?.status === 'unlocked';
              
              // Curve offset pattern: 0 -> center, 1 -> right, 2 -> left, 3 -> center
              const offsetClasses = [
                'translate-x-0',
                'translate-x-12 sm:translate-x-16',
                '-translate-x-12 sm:-translate-x-16',
                'translate-x-0'
              ][nIdx % 4];

              return (
                <div key={node.id} className={`flex flex-col items-center transition-all ${offsetClasses}`}>
                  <button
                    type="button"
                    onClick={() => isUnlocked && onSelectNode(node)}
                    disabled={!isUnlocked}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center font-black transition-all shadow-xl cursor-pointer ${
                      isCompleted
                        ? 'bg-amber-400 text-slate-900 border-b-4 border-amber-600 hover:scale-105'
                        : isUnlocked
                        ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 hover:scale-105 active:translate-y-1'
                        : 'bg-slate-200 text-slate-400 border-b-4 border-slate-300 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-amber-950" />
                    ) : isUnlocked ? (
                      <Play className="w-8 h-8 fill-white translate-x-0.5" />
                    ) : (
                      <Lock className="w-7 h-7" />
                    )}

                    {/* Star Badge */}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-amber-950 p-1 rounded-full border border-white shadow-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    )}
                  </button>

                  {/* Title Label Bubble */}
                  <div className="mt-2 text-center max-w-[150px]">
                    <div className="text-xs font-extrabold text-slate-800 line-clamp-1">{node.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{node.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
