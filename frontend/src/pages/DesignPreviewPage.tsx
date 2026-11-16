import React, { useState } from 'react';
import {
  Button,
  Card,
  Badge,
  Tabs,
  Input,
  ProgressBar,
  Modal,
  EmptyState,
  SkeletonCard,
  SkeletonText
} from '../components/ui';
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  Search,
  Flame,
  Zap,
  Target
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const DesignPreviewPage: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('buttons');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progress, setProgress] = useState(65);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      updateSettings({ theme: 'light' });
    } else {
      document.documentElement.classList.add('dark');
      updateSettings({ theme: 'dark' });
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-charcoal p-4 sm:p-8 space-y-8 font-sans max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Design System & Token Preview
            </h1>
          </div>
          <p className="text-xs text-steel mt-1">
            Quy chuẩn theo DESIGN.md và CLAUDE.md: Tối giản, tông ấm, bảng màu pastel, bo góc chuẩn, WCAG AA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            leftIcon={<Sun className="w-4 h-4 dark:hidden" />}
            rightIcon={<Moon className="w-4 h-4 hidden dark:inline" />}
          >
            Đổi Giao Diện Sáng / Tối
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'buttons', label: '1. Nút bấm (Buttons)' },
          { id: 'cards', label: '2. Thẻ (Cards & Pastel)' },
          { id: 'badges', label: '3. Huy hiệu (Badges)' },
          { id: 'inputs', label: '4. Biểu mẫu (Forms)' },
          { id: 'feedback', label: '5. Phản hồi (Feedback)' },
        ]}
      />

      {/* 1. BUTTONS */}
      {activeTab === 'buttons' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card>
            <h2 className="text-base font-bold text-ink mb-2">Quy chuẩn nút bấm (Button Geometry)</h2>
            <p className="text-xs text-steel mb-4">
              Nút bấm bo góc <code>rounded-md</code> (8px), hỗ trợ hiệu ứng tactile nhấn xuống, vùng chạm tối thiểu 44px ở cỡ vừa (md).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                Nút chính (Primary CTA)
              </Button>
              <Button variant="secondary">Nút phụ (Secondary)</Button>
              <Button variant="outline">Nút viền (Outline)</Button>
              <Button variant="ghost">Nút phẳng (Ghost)</Button>
              <Button variant="danger" leftIcon={<AlertCircle className="w-4 h-4" />}>
                Báo nguy hiểm
              </Button>
              <Button variant="success" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Hoàn thành
              </Button>
              <Button variant="primary" loading>
                Đang xử lý
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-ink mb-3">Các kích cỡ nút</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Cỡ nhỏ (sm 36px)</Button>
              <Button size="md">Cỡ chuẩn (md 44px - Touch Target)</Button>
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Cỡ lớn (lg 48px)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 2. CARDS */}
      {activeTab === 'cards' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card>
            <h2 className="text-base font-bold text-ink mb-2">Họ thẻ màu Pastel Database</h2>
            <p className="text-xs text-steel mb-4">
              Theo DESIGN.md, các tính năng sử dụng linh hoạt các biến màu card-tint nhẹ nhàng, không gây chói mắt.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card variant="peach" hoverable>
                <div className="font-bold text-sm text-weak-point">Card Peach (Mục tiêu)</div>
                <p className="text-xs text-steel mt-1">Dành cho kỹ năng cần cải thiện hoặc mẹo làm bài.</p>
              </Card>
              <Card variant="mint" hoverable>
                <div className="font-bold text-sm text-correct">Card Mint (Thành công)</div>
                <p className="text-xs text-steel mt-1">Đáp án đúng, vùng kiến thức vững vàng.</p>
              </Card>
              <Card variant="rose" hoverable>
                <div className="font-bold text-sm text-wrong">Card Rose (Cảnh báo)</div>
                <p className="text-xs text-steel mt-1">Bẫy đề thi, đáp án sai cần chú ý.</p>
              </Card>
              <Card variant="sky" hoverable>
                <div className="font-bold text-sm text-link-blue">Card Sky (Luyện nghe)</div>
                <p className="text-xs text-steel mt-1">Các bài tập Listening Part 1 - Part 4.</p>
              </Card>
              <Card variant="lavender" hoverable>
                <div className="font-bold text-sm text-primary">Card Lavender (Ngữ pháp)</div>
                <p className="text-xs text-steel mt-1">Ngữ pháp và phân tích bẫy thi ETS.</p>
              </Card>
              <Card variant="yellow" hoverable>
                <div className="font-bold text-sm text-streak">Card Yellow (Chuỗi học tập)</div>
                <p className="text-xs text-steel mt-1">Streak, điểm rèn luyện EXP và thành tựu.</p>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* 3. BADGES */}
      {activeTab === 'badges' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card>
            <h2 className="text-base font-bold text-ink mb-3">Huy hiệu trạng thái (Pill Badges)</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                Gia sư AI Pro
              </Badge>
              <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                Đạt 950+
              </Badge>
              <Badge variant="danger" icon={<AlertCircle className="w-3.5 h-3.5" />}>
                Cần cải thiện
              </Badge>
              <Badge variant="warning" icon={<HelpCircle className="w-3.5 h-3.5" />}>
                Bẫy Part 5
              </Badge>
              <Badge variant="streak" icon={<Flame className="w-3.5 h-3.5" />}>
                14 ngày liên tục
              </Badge>
              <Badge variant="neutral">Part 7 ETS</Badge>
            </div>
          </Card>
        </div>
      )}

      {/* 4. FORMS */}
      {activeTab === 'inputs' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="max-w-md">
            <h2 className="text-base font-bold text-ink mb-4">Trường nhập biểu mẫu (Input)</h2>
            <div className="space-y-4">
              <Input
                label="Tìm kiếm câu hỏi hoặc từ vựng"
                placeholder="Nhập từ khóa..."
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Input
                label="Họ và tên học viên"
                placeholder="Nguyễn Văn A"
                error="Tên hiển thị phải có từ 2 đến 60 ký tự"
              />
            </div>
          </Card>
        </div>
      )}

      {/* 5. FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card>
            <h2 className="text-base font-bold text-ink mb-4">Thanh tiến độ & Modal</h2>
            <div className="space-y-4 max-w-md">
              <ProgressBar
                value={progress}
                label="Tiến độ hoàn thành bài luyện tập"
                showValueLabel
                color="primary"
              />
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setProgress(p => Math.max(0, p - 10))}>-10%</Button>
                <Button size="sm" variant="outline" onClick={() => setProgress(p => Math.min(100, p + 10))}>+10%</Button>
                <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>Mở Modal xem thử</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-xs font-bold text-steel mb-2">Trạng thái rỗng (Empty State)</h3>
              <EmptyState
                title="Chưa có câu hỏi nào được lưu"
                description="Khi bạn đánh dấu câu hỏi cần xem lại, các câu hỏi sẽ xuất hiện tại đây."
                action={<Button size="sm" variant="outline">Khám phá đề thi</Button>}
              />
            </Card>

            <Card>
              <h3 className="text-xs font-bold text-steel mb-2">Khung chờ tải (Skeleton)</h3>
              <SkeletonCard />
            </Card>
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Cửa sổ thông báo chuẩn"
          >
            <div className="space-y-3">
              <p className="text-sm text-charcoal">
                Đây là cửa sổ Modal chuẩn theo Design System. Có thể đóng bằng phím ESC hoặc bấm nút Đóng góc trên.
              </p>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>Xác nhận</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
};
