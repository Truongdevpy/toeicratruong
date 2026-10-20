import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  X,
  Flame,
  MessageSquare,
  Heart,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  isLeaderboardProfile?: boolean;
  onOpenChat?: (userId: number) => void;
  onOpenRBAC?: () => void;
  onNavigate?: (path: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  isLeaderboardProfile,
  onOpenChat,
  onOpenRBAC,
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [cheered, setCheered] = useState(false);

  // Friendship states
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [requestId, setRequestId] = useState<number | undefined>(undefined);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendSuccessMsg, setFriendSuccessMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const res = await api.getPublicProfile(id, !isLeaderboardProfile);
      setProfile(res);
    } catch {
      // Fallback
      setProfile({
        id,
        user_id: id,
        full_name: `H?c vi?n #${id}`,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        school_or_org: 'C?ng ??ng TOEIC AI',
        current_score: 680,
        target_score: 800,
        streak_days: 12,
        questions_count: 320,
        accuracy_pct: 78.5,
        badge: 'Chi?n Binh Ch?m Ch?',
        cheer_count: 24,
        rank: 14,
        strengths: ['Listening Part 1 & 2', 'Reading Part 5 Ng? ph?p'],
        weak_areas: ['Listening Part 3', 'Reading Part 7'],
        member_since: '08/2026'
      });
    } finally {
      setLoading(false);
    }
  }, [isLeaderboardProfile]);

  const checkFriendship = useCallback(async (id: number) => {
    try {
      const res = await chatService.getFriendshipStatus(id);
      setFriendshipStatus(res.status);
      setRequestId(res.request_id);
    } catch {
      setFriendshipStatus('none');
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile(userId);
      checkFriendship(userId);
    } else {
      setProfile(null);
      setCheered(false);
      setFriendshipStatus('none');
      setRequestId(undefined);
      setFriendSuccessMsg(null);
    }
  }, [isOpen, userId, loadProfile, checkFriendship]);



  const handleSendFriendRequest = async () => {
    const targetId = profile?.user_id || profile?.id || userId;
    if (!targetId || friendActionLoading) return;
    try {
      setFriendActionLoading(true);
      const res = await chatService.sendFriendRequest(targetId);
      setFriendSuccessMsg(res.message);
      if (res.message && (res.message.includes('thành công') || res.message.includes('th?nh c?ng'))) {
        setFriendshipStatus('friends');
      } else {
        setFriendshipStatus('pending_sent');
      }
    } catch (err: any) {
      alert(err.message || 'Không thể gửi lời mời kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!requestId || friendActionLoading) return;
    try {
      setFriendActionLoading(true);
      await chatService.respondFriendRequest(requestId, 'accept');
      setFriendshipStatus('friends');
      setFriendSuccessMsg('Đã chấp nhận kết bạn thành công!');
    } catch {
      alert('Không thể chấp nhận kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    const targetId = profile?.user_id || profile?.id || userId;
    if (!targetId || friendActionLoading) return;
    if (!window.confirm('Bạn có chắc muốn hủy kết bạn với người này không?')) return;
    try {
      setFriendActionLoading(true);
      await chatService.removeFriend(targetId);
      setFriendshipStatus('none');
      setFriendSuccessMsg('Đã hủy kết bạn thành công');
    } catch {
      alert('Không thể hủy kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCheer = async () => {
    if (!profile || cheered) return;
    try {
      setCheered(true);
      setProfile((prev: any) => prev ? { ...prev, cheer_count: (prev.cheer_count || 0) + 1 } : prev);
      await api.cheerLeaderboardUser(profile.id);
    } catch {}
  };

  if (!isOpen) return null;

  const targetUserId = profile?.user_id || profile?.id || userId;
  const isSelf = currentUser && targetUserId === currentUser.id;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Cover */}
        <div className="relative h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative -mt-12 space-y-4">
          {friendSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
              <span className="font-medium">{friendSuccessMsg}</span>
              <button
                type="button"
                onClick={() => setFriendSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer font-bold"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Đang tải hồ sơ học viên...</div>
          ) : profile ? (
            <>
              {/* Avatar & Basic Info */}
              <div className="flex items-end justify-between">
                <div className="relative">
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={profile.full_name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
                  />
                  <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px] border-2 border-white shadow-xs">
                    #{profile.rank || 15}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={handleCheer}
                    disabled={cheered}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer ${
                      cheered
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                    }`}
                    title="Cổ vũ học viên"
                  >
                    <Heart className={`w-3.5 h-3.5 ${cheered ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    <span>{profile.cheer_count || 0}</span>
                  </button>

                  {isSelf && onOpenRBAC && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRBAC();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 fill-white/20" />
                      <span>Gói VIP 👑</span>
                    </button>
                  )}

                  {/* Friendship Button */}
                  {!isSelf && (
                    <>
                      {friendshipStatus === 'none' && (
                        <button
                          type="button"
                          onClick={handleSendFriendRequest}
                          disabled={friendActionLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Kết bạn</span>
                        </button>
                      )}

                      {friendshipStatus === 'pending_sent' && (
                        <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-semibold flex items-center gap-1 border border-slate-200 select-none">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Đã gửi</span>
                        </span>
                      )}

                      {friendshipStatus === 'pending_received' && (
                        <button
                          type="button"
                          onClick={handleAcceptFriendRequest}
                          disabled={friendActionLoading}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Đồng ý</span>
                        </button>
                      )}

                      {friendshipStatus === 'friends' && (
                        <button
                          type="button"
                          onClick={handleRemoveFriend}
                          disabled={friendActionLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 text-xs font-bold flex items-center gap-1 border border-emerald-200 hover:border-rose-200 shadow-2xs transition-colors cursor-pointer group"
                          title="Nhấp để hủy kết bạn"
                        >
                          <UserCheck className="w-3.5 h-3.5 group-hover:hidden" />
                          <UserMinus className="w-3.5 h-3.5 hidden group-hover:inline text-rose-500" />
                          <span className="group-hover:hidden">Bạn bè</span>
                          <span className="hidden group-hover:inline text-rose-600">Hủy</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Message Button */}
                  {!isSelf && onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenChat(targetUserId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Nhắn tin</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Name & School */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{profile.full_name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold text-[10px]">
                    {profile.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.school_or_org} • Tham gia từ {profile.member_since || '2026'}
                </p>
              </div>

              {/* 4 Stats Grid */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-500">Điểm hiện tại</div>
                  <div className="text-sm font-black text-blue-600 mt-0.5">{profile.current_score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Mục tiêu</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">{profile.target_score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Chuỗi ngày</div>
                  <div className="text-sm font-black text-orange-600 mt-0.5 flex items-center justify-center gap-0.5">
                    <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                    {profile.streak_days}d
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Tỷ lệ đúng</div>
                  <div className="text-sm font-black text-emerald-600 mt-0.5">{profile.accuracy_pct}%</div>
                </div>
              </div>

              {/* Strengths & Weak Areas */}
              <div className="space-y-2 text-xs">
                {profile.strengths && profile.strengths.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Thế mạnh kỹ năng:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.strengths.map((s: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.weak_areas && profile.weak_areas.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Kỹ năng đang cải thiện:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.weak_areas.map((w: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 text-[11px] font-medium">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
