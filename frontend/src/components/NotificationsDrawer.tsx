import React, { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, X, Sparkles, BookOpen, Clock, Award } from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { formatDisplayDateTime } from '../utils/time';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch {
      // Fallback
      setNotifications([
        {
          id: 1,
          title: 'Lộ trình đã được tối ưu hóa',
          message: 'AI đã tăng trọng số kỹ năng Word Form lên 35% dựa trên kết quả bài làm gần nhất.',
          type: 'path',
          is_read: false,
          created_at: 'Hôm nay',
        },
        {
          id: 2,
          title: 'Nhắc nhở ôn tập Flashcards',
          message: 'Bạn có 15 thẻ từ vựng đến hạn lặp lại ngắt quãng (SRS) hôm nay.',
          type: 'review',
          is_read: false,
          created_at: 'Hôm nay',
        },
        {
          id: 3,
          title: 'Báo cáo tuần đã sẵn sàng',
          message: 'Chúc mừng bạn đã hoàn thành 327 câu hỏi và tăng 45 điểm trong tuần qua.',
          type: 'achievement',
          is_read: true,
          created_at: 'Hôm qua',
        },
      ]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('button[title="Th?ng b?o h?c t?p"]')) {
          onClose();
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'path':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'review':
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div ref={drawerRef} className="absolute right-0 top-14 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">Thông báo học tập</span>
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
            {notifications.filter((n) => !n.is_read).length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            title="Đánh dấu tất cả đã đọc"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Đọc hết
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Không có thông báo mới nào</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.type === 'path') onNavigate('/learning-path');
                else if (n.type === 'review') onNavigate('/practice/flashcards');
                else if (n.type === 'achievement') onNavigate('/statistics');
                onClose();
              }}
              className={`p-3.5 px-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${
                !n.is_read ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-100 shadow-xs shrink-0 h-fit">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatDisplayDateTime(n.created_at, n.created_at_raw, true)}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
