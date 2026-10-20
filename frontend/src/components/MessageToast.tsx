import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { chatService, ChatMessage } from '../services/chatService';

interface MessageToastProps {
  currentChatUserId?: number | null;
  onOpenConversation: (userId: number) => void;
}

interface ToastData {
  senderId: number;
  senderName: string;
  senderAvatar: string;
  content: string;
  count: number;
}

export const MessageToast: React.FC<MessageToastProps> = ({ currentChatUserId, onOpenConversation }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const dismissTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = chatService.onNewMessage((msg: ChatMessage) => {
      // Don't show toast if message is from myself or user is currently in this conversation
      if (msg.is_mine) return;
      if (currentChatUserId === msg.sender_id) return;

      const senderName = msg.sender_name || 'Học viên TOEIC';
      const senderAvatar = msg.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      setToast((prev) => {
        const count = prev && prev.senderId === msg.sender_id ? prev.count + 1 : 1;
        return {
          senderId: msg.sender_id,
          senderName,
          senderAvatar,
          content: msg.content,
          count,
        };
      });

      // Clear existing dismiss timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Auto dismiss after 5.5 seconds
      dismissTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 5500);
    });

    return () => {
      unsubscribe();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [currentChatUserId]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
      <div
        onClick={() => {
          onOpenConversation(toast.senderId);
          setToast(null);
        }}
        className="bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/90 shadow-2xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-blue-500/10 transition-all flex items-start gap-3 group"
      >
        <div className="relative shrink-0">
          <img
            src={toast.senderAvatar}
            alt={toast.senderName}
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-900 truncate">
              {toast.senderName} đã gửi cho bạn một tin nhắn.
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToast(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-600 truncate mt-0.5 font-medium leading-relaxed">
            "{toast.content}"
          </p>
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-1.5 group-hover:translate-x-0.5 transition-transform">
            <span>Bấm để trả lời</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
