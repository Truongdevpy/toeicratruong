import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { chatService, ChatMessage } from '../services/chatService';

interface FloatingChatButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  isModalOpen?: boolean;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ isOpen, onToggle, isModalOpen }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // Listen to incoming messages for unread badge
    const unsubMsg = chatService.onNewMessage((msg: ChatMessage) => {
      if (!msg.is_mine && !isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubMsg();
    };
  }, [isOpen]);



  if (isOpen || isModalOpen) return null;

  return (
    <aside aria-label="Tin nhắn toàn web" className="fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 z-[60] print:hidden">
      <button
        type="button"
        onClick={() => { setUnreadCount(0); onToggle(); }}
        className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-full shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
        title="Mở tin nhắn toàn hệ thống"
      >
        <MessageSquare className="w-4 h-4 fill-white/20 text-white transition-transform group-hover:scale-110" />
        <span className="text-xs sm:text-sm">Tin nhắn</span>

        {/* Unread badge counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center px-1.5 py-0.5 min-w-[20px] h-5 text-[10px] font-bold bg-rose-500 text-white rounded-full shadow-md ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </aside>
  );
};