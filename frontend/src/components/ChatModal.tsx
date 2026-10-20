import { formatDisplayTime } from '../utils/time';
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Send,
  X,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  CornerDownRight,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import {
  chatService,
  ChatMessage,
  ConversationThread,
  ChatUser,
  CommunityMessage,
  FriendItem,
  FriendRequestItem
} from '../services/chatService';
import { useAuth } from '../context/AuthContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: number | null;
  onViewProfile?: (userId: number) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

const getInitials = (name?: string): string => {
  if (!name) return 'HV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  initialUserId,
  onViewProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'community' | 'friends'>(() => {
    try {
      const saved = localStorage.getItem('toeic_chat_active_tab');
      return saved === 'friends' ? 'friends' : 'community';
    } catch {
      return 'community';
    }
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(247);

  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [replyTarget, setReplyTarget] = useState<{ sender_name: string; content: string } | null>(null);

  const [friendsSubTab, setFriendsSubTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<number | null>(() => {
    if (initialUserId) return initialUserId;
    try {
      const saved = localStorage.getItem('toeic_chat_active_friend_id');
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeFriend, setActiveFriend] = useState<ChatUser | null>(null);
  const [friendMessages, setFriendMessages] = useState<ChatMessage[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState<Record<number, boolean>>({});

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem('toeic_chat_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      if (activeFriendId) {
        localStorage.setItem('toeic_chat_active_friend_id', String(activeFriendId));
      } else {
        localStorage.removeItem('toeic_chat_active_friend_id');
      }
    } catch {}
  }, [activeFriendId]);

  useEffect(() => {
    if (initialUserId) {
      setActiveFriendId(initialUserId);
      setActiveTab('friends');
      loadFriendThread(initialUserId);
    } else if (isOpen && activeFriendId && activeTab === 'friends') {
      loadFriendThread(activeFriendId);
    }
  }, [initialUserId, isOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const loadCommunityData = async () => {
    try {
      const res = await chatService.getCommunityMessages();
      setCommunityMessages(res.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load community messages', err);
    }
  };

  const loadFriendsData = async () => {
    try {
      const [onlineRes, convRes, friendsRes] = await Promise.all([
        chatService.getOnlineUsers(),
        chatService.getConversations().catch(() => ({ conversations: [], total_unread: 0 })),
        chatService.getFriends().catch(() => ({ friends: [], incoming_requests: [], outgoing_requests: [] })),
      ]);
      setOnlineUsers(onlineRes.users || []);
      setOnlineCount(onlineRes.total_online || 262);
      setConversations(convRes.conversations || []);
      setFriends(friendsRes.friends || []);
      setIncomingRequests(friendsRes.incoming_requests || []);
      setOutgoingRequests(friendsRes.outgoing_requests || []);
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'community') {
      await loadCommunityData();
    } else {
      await loadFriendsData();
      if (activeFriendId) {
        await loadFriendThread(activeFriendId);
      }
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const loadFriendThread = async (friendId: number) => {
    setIsFriendLoading(true);
    try {
      const res = await chatService.getMessages(friendId);
      setFriendMessages(res.messages || []);
      setActiveFriend(res.other_user);
      scrollToBottom();
      setConversations((prev) =>
        prev.map((c) => (c.user_id === friendId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load friend messages', err);
    } finally {
      setIsFriendLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetId: number) => {
    if (!user) {
      setActionNotice('Vui lòng đăng nhập để kết bạn.');
      onOpenAuth?.('login');
      return;
    }
    try {
      setFriendActionLoading((prev) => ({ ...prev, [targetId]: true }));
      const res = await chatService.sendFriendRequest(targetId);
      setActionNotice(res.message);
      await loadFriendsData();
    } catch (err: any) {
      setActionNotice(err.message || 'Không thể gửi kết bạn');
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleRespondFriendRequest = async (requestId: number, action: 'accept' | 'reject') => {
    if (!user) {
      setActionNotice('Vui lòng đăng nhập để phản hồi kết bạn.');
      onOpenAuth?.('login');
      return;
    }
    try {
      setFriendActionLoading((prev) => ({ ...prev, [requestId]: true }));
      const res = await chatService.respondFriendRequest(requestId, action);
      setActionNotice(res.message);
      await loadFriendsData();
    } catch (err: any) {
      setActionNotice(err.message || 'Thao tác không thành công');
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn hủy kết bạn với người này?')) return;
    try {
      await chatService.removeFriend(friendId);
      setActionNotice('Đã hủy kết bạn thành công');
      await loadFriendsData();
    } catch (err: any) {
      setActionNotice(err.message || 'Không thể hủy kết bạn');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadCommunityData();
    loadFriendsData();

    const unsubComm = chatService.onCommunityMessage((msg) => {
      setCommunityMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const isMine = Boolean(user && msg.sender_id === user.id);
        const optIndex = prev.findIndex(
          (m) => m.id > 1000000000000 && m.sender_id === msg.sender_id && m.content === msg.content
        );
        if (optIndex !== -1) {
          const next = [...prev];
          next[optIndex] = { ...msg, is_mine: isMine };
          return next;
        }
        return [...prev, { ...msg, is_mine: isMine }];
      });
      if (activeTab === 'community') {
        scrollToBottom();
      }
    });

    const unsubDirect = chatService.onNewMessage((msg) => {
      const isMine = Boolean(user && msg.sender_id === user.id);
      const otherId = isMine ? msg.recipient_id : msg.sender_id;

      setConversations((prev) => {
        const existing = prev.find((c) => c.user_id === otherId);
        if (existing) {
          return [
            {
              ...existing,
              last_message: msg.content,
              last_message_at: msg.created_at || 'Vừa xong',
              unread_count:
                activeFriendId === otherId
                  ? 0
                  : (existing.unread_count || 0) + (isMine ? 0 : 1),
            },
            ...prev.filter((c) => c.user_id !== otherId),
          ];
        }
        return prev;
      });

      if (activeFriendId && (msg.sender_id === activeFriendId || msg.recipient_id === activeFriendId)) {
        setFriendMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const optIndex = prev.findIndex(
            (m) => m.id > 1000000000000 && m.content === msg.content
          );
          if (optIndex !== -1) {
            const next = [...prev];
            next[optIndex] = { ...msg, is_mine: isMine };
            return next;
          }
          return [...prev, { ...msg, is_mine: isMine }];
        });
        scrollToBottom();
        if (!isMine) {
          chatService.markAsRead(activeFriendId);
        }
      }
    });

    const unsubTyping = chatService.onTyping((data) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.sender_id]: data.is_typing,
      }));
    });

    const unsubOnline = chatService.onOnlineCount((cnt) => {
      setOnlineCount(cnt);
    });

    return () => {
      unsubComm();
      unsubDirect();
      unsubTyping();
      unsubOnline();
    };
  }, [isOpen, activeTab, activeFriendId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (activeTab === 'friends' && activeFriendId) {
      chatService.sendTyping(activeFriendId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (activeFriendId) chatService.sendTyping(activeFriendId, false);
      }, 1500);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setActionNotice('Vui lòng đăng nhập để gửi tin nhắn.');
      onOpenAuth?.('login');
      return;
    }
    const content = inputText.trim();
    if (!content) return;

    setInputText('');

    if (activeTab === 'community') {
      const currentReply = replyTarget;
      setReplyTarget(null);

      const tempId = Date.now();
      const tempMsg: CommunityMessage = {
        id: tempId,
        sender_id: user.id,
        sender_name: user.full_name || 'Bạn',
        sender_avatar: user.avatar_url || '',
        reply_to: currentReply,
        content,
        created_at: 'Vừa xong',
        is_mine: true,
      };
      setCommunityMessages((prev) => [...prev, tempMsg]);
      scrollToBottom();

      try {
        const realMsg = await chatService.sendCommunityMessage(
          content,
          currentReply,
          user.full_name,
          user.avatar_url
        );
        setCommunityMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...realMsg, is_mine: true } : m))
        );
      } catch (err: any) {
        // Rollback optimistic message on failure
        setCommunityMessages((prev) => prev.filter((m) => m.id !== tempId));
        setActionNotice(err.message || 'Không thể gửi tin nhắn. Vui lòng đăng nhập lại.');
      }
    } else {
      if (!activeFriendId) return;

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      chatService.sendTyping(activeFriendId, false);

      const tempId = Date.now();
      const tempDirect: ChatMessage = {
        id: tempId,
        sender_id: user.id,
        recipient_id: activeFriendId,
        content,
        is_mine: true,
        is_read: false,
        created_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        created_at_raw: new Date().toISOString(),
      };
      setFriendMessages((prev) => [...prev, tempDirect]);
      scrollToBottom();

      try {
        const sentMsg = await chatService.sendMessage(activeFriendId, content);
        setFriendMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...sentMsg, is_mine: true } : m))
        );
        setConversations((prev) => {
          const existing = prev.find((c) => c.user_id === activeFriendId);
          if (existing) {
            return [
              {
                ...existing,
                last_message: content,
                last_message_at: 'Vừa xong',
                is_mine: true,
              },
              ...prev.filter((c) => c.user_id !== activeFriendId),
            ];
          }
          return prev;
        });
      } catch (err: any) {
        // Rollback direct message on failure
        setFriendMessages((prev) => prev.filter((m) => m.id !== tempId));
        setActionNotice(err.message || 'Không thể gửi tin nhắn.');
      }
    }
  };

  if (!isOpen) return null;

  const totalFriendsUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const suggestions = onlineUsers.filter(
    (u) =>
      u.id !== user?.id &&
      !friends.some((f) => f.id === u.id)
  );

  return (
    <aside
      aria-label="Cửa sổ Chat cộng đồng"
      className={`fixed z-[8500] print:hidden transition-all duration-200 ease-out flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 overflow-hidden ${
        isMaximized
          ? 'inset-x-0 bottom-0 top-0 h-[100dvh] max-h-[100dvh] rounded-none sm:rounded-2xl sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:w-[560px] sm:h-[84vh] sm:max-h-[760px]'
          : 'inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 w-full max-w-full sm:w-[420px] sm:max-w-none h-[88dvh] max-h-[88dvh] sm:h-[580px] sm:max-h-[calc(100vh-80px)]'
      }`}
    >
      {/* 1. BLUE HEADER */}
      <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shrink-0 select-none shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0">
            <MessageSquare className="w-4 h-4 fill-white/20" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight tracking-tight">
              {activeTab === 'community'
                ? 'Chat cộng đồng'
                : activeFriend
                ? activeFriend.full_name
                : 'Bạn bè & Tin nhắn'}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-100 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>{onlineCount} đang online</span>
            </div>
          </div>
        </div>

        {/* Action icons on right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Làm mới tin nhắn"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Toast Alert Banner */}
      {actionNotice && (
        <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between shrink-0">
          <span className="font-medium truncate">{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 ml-2 p-1 font-bold cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. SUB-NAV TABS */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/70 text-xs font-semibold shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('community');
            setActiveFriendId(null);
          }}
          className={`flex-1 py-3 sm:py-2 min-h-[44px] sm:min-h-0 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'community'
              ? 'border-blue-600 text-blue-600 bg-white shadow-2xs font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Cộng đồng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 sm:py-2 min-h-[44px] sm:min-h-0 text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'friends'
              ? 'border-blue-600 text-blue-600 bg-white shadow-2xs font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Bạn bè</span>
          {totalFriendsUnread > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {totalFriendsUnread}
            </span>
          )}
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. MESSAGE BODY */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col justify-between">
        {/* TAB 1: CỘNG ĐỒNG FEED */}
        {activeTab === 'community' && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {communityMessages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có tin nhắn nào trong phòng chat cộng đồng. Hãy gửi tin nhắn đầu tiên!
              </div>
            ) : (
              communityMessages.map((msg) => {
                const initials = getInitials(msg.sender_name);
                const isMsgMine = msg.is_mine || (user && msg.sender_id === user.id);

                return (
                  <div key={msg.id} className="flex items-start gap-2.5 group">
                    <div
                      onClick={() => msg.sender_id && onViewProfile?.(msg.sender_id)}
                      className={`relative shrink-0 ${msg.sender_id ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
                      title={msg.sender_id ? 'Xem hồ sơ học viên' : undefined}
                    >
                      {msg.sender_avatar ? (
                        <img
                          src={msg.sender_avatar}
                          alt={msg.sender_name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center ring-1 ring-blue-200">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => msg.sender_id && onViewProfile?.(msg.sender_id)}
                          className={`text-xs font-bold truncate text-left ${
                            msg.sender_id ? 'text-slate-900 hover:text-blue-600 cursor-pointer' : 'text-slate-900'
                          }`}
                        >
                          {msg.sender_name}
                        </button>

                        {isMsgMine && (
                          <span className="px-1.5 py-0.2 rounded-sm bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200/60">
                            Bạn
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-normal">
                          {formatDisplayTime(msg.created_at, msg.created_at_raw)}
                        </span>
                      </div>

                      {msg.reply_to && (
                        <div className="mt-1 mb-1 p-2 bg-slate-50 border-l-2 border-blue-500 rounded-r-lg text-[11px] text-slate-600 space-y-0.5">
                          <span className="font-bold text-slate-800 block">
                            {msg.reply_to.sender_name}
                          </span>
                          <p className="line-clamp-2 text-slate-600">
                            {msg.reply_to.content}
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-slate-800 leading-relaxed break-words mt-0.5">
                        {msg.content}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTarget({
                              sender_name: msg.sender_name,
                              content: msg.content,
                            })
                          }
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Trả lời</span>
                        </button>

                        {msg.sender_id && onViewProfile && (
                          <button
                            type="button"
                            onClick={() => onViewProfile(msg.sender_id)}
                            className="text-[10px] font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <UserIcon className="w-2.5 h-2.5" />
                            <span>Hồ sơ</span>
                          </button>
                        )}

                        {msg.sender_id && user && msg.sender_id !== user.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('friends');
                              setActiveFriendId(msg.sender_id);
                              loadFriendThread(msg.sender_id);
                            }}
                            className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>Nhắn tin</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* TAB 2: BẠN BÈ & TIN NHẮN RIÊNG */}
        {activeTab === 'friends' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeFriendId === null ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm bạn học, người online..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFriendsSubTab('friends')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        friendsSubTab === 'friends'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                      }`}
                    >
                      <span>Bạn bè</span>
                      <span className="text-[10px] opacity-80">({friends.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFriendsSubTab('requests')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        friendsSubTab === 'requests'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : incomingRequests.length > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                          : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                      }`}
                    >
                      <span>Lời mời</span>
                      <span className="text-[10px] opacity-80">({incomingRequests.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFriendsSubTab('suggestions')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        friendsSubTab === 'suggestions'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Gợi ý kết bạn</span>
                      <span className="text-[10px] opacity-80">({suggestions.length})</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {friendsSubTab === 'requests' && (
                    <div className="p-3 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Lời mời kết bạn đang chờ ({incomingRequests.length})
                      </div>

                      {incomingRequests.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Không có lời mời kết bạn nào đang chờ.
                        </div>
                      ) : (
                        incomingRequests.map((req) => (
                          <div
                            key={req.request_id}
                            className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div
                              onClick={() => onViewProfile?.(req.user_id)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                            >
                              <img
                                src={req.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt={req.full_name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-300 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {req.full_name}
                                </div>
                                <div className="text-[10px] text-amber-700 font-medium">
                                  Mục tiêu {req.target_score}+ • {req.created_at}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRespondFriendRequest(req.request_id, 'accept')}
                                disabled={friendActionLoading[req.request_id]}
                                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                Đồng ý
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondFriendRequest(req.request_id, 'reject')}
                                disabled={friendActionLoading[req.request_id]}
                                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {friendsSubTab === 'friends' && (
                    <div className="p-3 space-y-2">
                      {incomingRequests.length > 0 && (
                        <div
                          onClick={() => setFriendsSubTab('requests')}
                          className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Bạn có {incomingRequests.length} lời mời kết bạn mới!</span>
                          </div>
                          <span className="text-[11px] text-blue-600 font-bold underline">Xem ngay</span>
                        </div>
                      )}

                      <div className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                        Danh sách bạn bè ({friends.length})
                      </div>

                      {friends.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                          <p>Bạn chưa có bạn bè nào.</p>
                          <button
                            type="button"
                            onClick={() => setFriendsSubTab('suggestions')}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            Khám phá danh sách bạn học để kết bạn →
                          </button>
                        </div>
                      ) : (
                        friends
                          .filter((f) => f.full_name.toLowerCase().includes(friendSearch.toLowerCase()))
                          .map((f) => {
                            const conv = conversations.find((c) => c.user_id === f.id);
                            return (
                              <div
                                key={f.id}
                                className="p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 transition-all group"
                              >
                                <div
                                  onClick={() => onViewProfile?.(f.id)}
                                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                                  title="Xem hồ sơ học viên"
                                >
                                  <div className="relative shrink-0">
                                    <img
                                      src={f.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                      alt={f.full_name}
                                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                                    />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600">
                                      {f.full_name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {conv ? `${conv.last_message} • ${formatDisplayTime(conv.last_message_at, conv.last_message_raw)}` : `Mục tiêu ${f.target_score}+`}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {conv && conv.unread_count > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                                      {conv.unread_count}
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFriendId(f.id);
                                      loadFriendThread(f.id);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Nhắn tin 1-kèm-1"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>Nhắn tin</span>
                                  </button>

                                  {onViewProfile && (
                                    <button
                                      type="button"
                                      onClick={() => onViewProfile(f.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Xem hồ sơ"
                                    >
                                      <UserIcon className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFriend(f.id)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hủy kết bạn"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}

                  {friendsSubTab === 'suggestions' && (
                    <div className="p-3 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider flex items-center justify-between">
                        <span>Học viên đang online ({suggestions.length})</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Sẵn sàng kết nối</span>
                      </div>

                      {suggestions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Hiện tại bạn đã kết bạn với tất cả học viên online!
                        </div>
                      ) : (
                        suggestions
                          .filter((u) => u.full_name.toLowerCase().includes(friendSearch.toLowerCase()))
                          .map((u) => {
                            const isPending = outgoingRequests.some((r) => r.user_id === u.id);
                            return (
                              <div
                                key={u.id}
                                className="p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 transition-all"
                              >
                                <div
                                  onClick={() => onViewProfile?.(u.id)}
                                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85"
                                  title="Xem hồ sơ học viên"
                                >
                                  <div className="relative shrink-0">
                                    <img
                                      src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                      alt={u.full_name}
                                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                                    />
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">
                                      {u.full_name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {u.role || `Mục tiêu ${u.target_score}+`}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isPending ? (
                                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold select-none flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-500" />
                                      <span>Đã gửi</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSendFriendRequest(u.id)}
                                      disabled={friendActionLoading[u.id]}
                                      className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-200/80 shadow-2xs"
                                    >
                                      <UserPlus className="w-3 h-3" />
                                      <span>Kết bạn</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFriendId(u.id);
                                      loadFriendThread(u.id);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Nhắn tin"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Friend Active Conversation Header */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveFriendId(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Danh sách bạn bè</span>
                  </button>

                  <div
                    onClick={() => activeFriendId && onViewProfile?.(activeFriendId)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                    title="Xem hồ sơ học viên"
                  >
                    <span className="text-xs font-bold text-slate-800">
                      {activeFriend?.full_name || `Người dùng #${activeFriendId}`}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {onViewProfile && (
                      <span className="text-[10px] text-blue-600 underline font-semibold">Hồ sơ</span>
                    )}
                  </div>
                </div>

                {/* Friend Messages Thread */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-white">
                  {friendMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Bắt đầu cuộc trò chuyện riêng với bạn học này!
                    </div>
                  ) : (
                    friendMessages.map((m) => {
                      const isMsgMine = m.is_mine || (user && m.sender_id === user.id);

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMsgMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                              isMsgMine
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            {m.content}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                            {formatDisplayTime(m.created_at, m.created_at_raw)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {activeFriendId && typingUsers[activeFriendId] && (
                    <div className="text-[11px] text-slate-400 italic">
                      Đối phương đang soạn tin nhắn...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. BOTTOM INPUT BAR */}
      <div className="border-t border-slate-100 bg-white shrink-0 pb-[calc(10px+env(safe-area-inset-bottom,0px))]">
        {replyTarget && activeTab === 'community' && (
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="truncate">
              Đang trả lời <strong>@{replyTarget.sender_name}</strong>: "{replyTarget.content.slice(0, 28)}..."
            </span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!user ? (
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600 font-medium">
              Vui lòng đăng nhập để gửi tin nhắn và kết nối bạn bè
            </span>
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-2.5 flex items-center gap-2">
            <input
              type="text"
              placeholder={
                activeTab === 'community'
                  ? 'Nhập tin nhắn cộng đồng... (Enter để gửi)'
                : activeFriend
                  ? `Nhắn tin cho ${activeFriend.full_name}...`
                  : 'Nhập tin nhắn... (Enter để gửi)'
              }
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 min-h-[44px] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-11 h-11 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-2xs"
              title="Gửi tin nhắn"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
};
