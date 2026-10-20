import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Plus,
  Search,
  Sparkles,
  Send,
  X,
  CheckCircle2,
  Clock,
  Hash,
  Award,
  ChevronRight,
  Flame,
  Compass,
  Lightbulb,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CommunityPost } from '../types';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/time';

interface CommunityPageProps {
  onNavigate: (path: string) => void;
  onOpenChat?: (userId?: number | null) => void;
  onViewProfile?: (userId: number) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  onNavigate,
  onOpenChat,
  onViewProfile,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [_totalLearners, setTotalLearners] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [studyGroups, setStudyGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [joinedGroups, setJoinedGroups] = useState<Record<number, boolean>>({});
  const [topLearners, setTopLearners] = useState<any[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    target_score: '700-850+',
    schedule_info: 'Thứ 2, 4, 6 lúc 19:30',
    members_count: 1,
    active_online: 1,
  });
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Post creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenCreatePost = () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để chia sẻ bài viết!');
      onOpenAuth?.('login');
      return;
    }
    setIsModalOpen(true);
  };
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Kinh nghiệm thi');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Active expanded comments
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});



  const loadStudyGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await api.getStudyGroups();
      if (res && res.groups) {
        setStudyGroups(res.groups);
        const jm: Record<number, boolean> = {};
        res.groups.forEach((g: any) => {
          if (g.is_joined) jm[g.id] = true;
        });
        setJoinedGroups(jm);
      } else {
        setStudyGroups([]);
      }
    } catch {
      setStudyGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadTopLearners = async () => {
    try {
      const res = await api.getLeaderboard({ category: 'score', period: 'weekly' });
      if (res && res.rankings && res.rankings.length > 0) {
        setTopLearners(res.rankings.slice(0, 4));
      }
    } catch {}
  };

  const handleJoinGroup = async (groupId: number, groupName: string) => {
    if (!user) {
      showToast('Vui lòng đăng nhập để tham gia nhóm học!');
      onOpenAuth?.('login');
      return;
    }
    const isCurrentlyJoined = !!joinedGroups[groupId];
    try {
      if (isCurrentlyJoined) {
        await api.leaveStudyGroup(groupId);
        setJoinedGroups((prev) => ({ ...prev, [groupId]: false }));
        showToast(`Bạn đã rời khỏi nhóm "${groupName}".`);
      } else {
        await api.joinStudyGroup(groupId);
        setJoinedGroups((prev) => ({ ...prev, [groupId]: true }));
        showToast(`Bạn đã tham gia nhóm "${groupName}" thành công!`);
      }
      await loadStudyGroups();
    } catch {
      showToast('Thao tác nhóm học không thành công. Vui lòng thử lại!');
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;
    try {
      setIsSubmittingGroup(true);
      await api.createAdminStudyGroup(groupFormData);
      showToast(`Đã tạo nhóm học "${groupFormData.name}" thành công!`);
      setIsCreateGroupOpen(false);
      setGroupFormData({
        name: '',
        description: '',
        target_score: '700-850+',
        schedule_info: 'Thứ 2, 4, 6 lúc 19:30',
        members_count: 1,
        active_online: 1,
      });
      await loadStudyGroups();
    } catch {
      showToast('Không thể tạo nhóm học. Vui lòng thử lại!');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${groupName}" không?`)) return;
    try {
      await api.deleteAdminStudyGroup(groupId);
      showToast(`Đã xóa nhóm "${groupName}" thành công.`);
      await loadStudyGroups();
    } catch {
      showToast('Không thể xóa nhóm học. Vui lòng thử lại!');
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await api.getCommunityPosts();
      if (res && res.posts) {
        setPosts(res.posts);
      }
      if (res && typeof res.total_learners === 'number') {
        setTotalLearners(res.total_learners);
      }
    } catch {
      // Fallback posts
      setPosts([
        {
          id: 1,
          author_name: 'Minh Nhật',
          author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
          title: 'Chia sẻ kinh nghiệm nâng điểm Part 7 từ 250 lên 410 sau 6 tuần',
          content: 'Bí quyết của mình là không đọc dịch từng từ mà luôn đọc trước câu hỏi để quét từ khóa (scanning). Đặc biệt trên web có tính năng tra từ và dịch song ngữ rất tiện...',
          category: 'Kinh nghiệm thi',
          likes_count: 42,
          comments_count: 8,
          created_at: '24/09/2026',
          comments: [
            {
              id: 101,
              author_name: 'Lan Anh',
              content: 'Cảm ơn bạn chia sẻ rất tâm huyết! Cho mình hỏi bạn hay luyện bộ đề nào nhất?',
              created_at: '24/09/2026 14:20'
            },
            {
              id: 102,
              author_name: 'Minh Nhật',
              content: 'Mình luyện trực tiếp trên Crack TOEIC Vol 2 của nền tảng này bạn nhé, sát đề thi thật 99% luôn.',
              created_at: '24/09/2026 15:05'
            }
          ]
        },
        {
          id: 2,
          author_name: 'Phương Thảo',
          author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          title: 'Tổng hợp 50 cụm Collocations hay gặp nhất trong đề TOEIC Part 5',
          content: 'Chào các bạn, mình vừa tổng hợp lại 50 cụm danh từ ghép và giới từ hay ra đề nhất như "prior to", "in accordance with", "take into account"... Mọi người lưu lại ôn nhé!',
          category: 'Ngữ pháp & Từ vựng',
          likes_count: 89,
          comments_count: 14,
          created_at: '23/09/2026',
          comments: []
        },
        {
          id: 3,
          author_name: 'Hải Đăng',
          title: 'Phương pháp chép chính tả (Dictation) cứu vớt kỹ năng nghe Part 3 và Part 4',
          content: 'Trước đây mình chỉ nghe thụ động nên hay bị bẫy từ phát âm na ná. Từ khi luyện Dictation 3 bài/ngày với tốc độ 1.0x, tai mình nhạy từ khóa hẳn lên.',
          category: 'Luyện nghe',
          likes_count: 36,
          comments_count: 5,
          created_at: '22/09/2026',
          comments: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    loadStudyGroups();
    loadTopLearners();
  }, []);
  const handleLike = async (postId: number) => {
    if (!user) {
      showToast('Vui lòng đăng nhập để thích bài viết!');
      onOpenAuth?.('login');
      return;
    }
    try {
      await api.likePost(postId);
      setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + (likedPosts[postId] ? -1 : 1) }
            : p
        )
      );
    } catch {
      // Optimistic update
      setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
    }
  };

  const toggleComments = (postId: number) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleAddComment = async (postId: number) => {
    if (!user) {
      showToast('Vui lòng đăng nhập để bình luận!');
      onOpenAuth?.('login');
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const res = await api.addPostComment(postId, { content: text });
      const newComment = res?.comment || {
        id: Date.now(),
        author_name: user?.full_name || 'Học viên',
        author_avatar: user?.avatar_url || '',
        content: text,
        created_at: 'Vừa xong'
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments_count: (p.comments_count || 0) + 1,
                comments: [...(p.comments || []), newComment]
              }
            : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      showToast('Đã gửi bình luận thành công!');
    } catch (err: any) {
      showToast(err.message || 'Không thể gửi bình luận. Vui lòng đăng nhập lại.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Vui lòng đăng nhập để đăng bài viết!');
      onOpenAuth?.('login');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setIsSubmittingPost(true);
      const res = await api.createCommunityPost({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory
      });

      if (res?.post) {
        setPosts((prev) => [res.post, ...prev]);
      } else {
        await loadPosts();
      }
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      showToast('Đăng bài viết thành công!');
    } catch (err: any) {
      showToast(err.message || 'Không thể đăng bài viết. Vui lòng thử lại.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const categories = ['all', 'Kinh nghiệm thi', 'Ngữ pháp & Từ vựng', 'Luyện nghe', 'Tìm bạn học'];

  const HOT_TAGS = React.useMemo(() => {
    const candidateTags = [
      'Mẹo giải Part 5',
      'Part 7 Reading',
      'Target 800+',
      'Dictation hàng ngày',
      'Đề ETS 2024-2026',
      'Collocations hay gặp',
      'Kinh nghiệm thi'
    ];
    return candidateTags
      .map((tag) => {
        const lower = tag.toLowerCase();
        const c = posts.filter(
          (p) =>
            (p.title && p.title.toLowerCase().includes(lower)) ||
            (p.content && p.content.toLowerCase().includes(lower)) ||
            (p.category && p.category.toLowerCase().includes(lower))
        ).length;
        return { tag, count: c };
      })
      .filter((item) => item.count > 0);
  }, [posts]);



  const filteredPosts = posts.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag =
      !selectedTag ||
      p.title.toLowerCase().includes(selectedTag.toLowerCase()) ||
      p.content.toLowerCase().includes(selectedTag.toLowerCase()) ||
      p.category.toLowerCase().includes(selectedTag.toLowerCase());
    return matchCat && matchSearch && matchTag;
  });
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 selection:bg-blue-600 selection:text-white">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Wide Container (Matches max-w-[1600px]) */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Quick Post Prompt Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0 border border-blue-200">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
              </div>
              <button
                type="button"
                onClick={handleOpenCreatePost}
                className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200/60 transition-colors cursor-pointer truncate"
              >
                {user?.full_name
                  ? `${user.full_name} ơi, bạn có thắc mắc hay kinh nghiệm gì muốn chia sẻ hôm nay?`
                  : 'Bạn có thắc mắc bài tập hay kinh nghiệm muốn chia sẻ? Bấm để viết bài...'}
              </button>
              <button
                type="button"
                onClick={handleOpenCreatePost}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tạo bài</span>
              </button>
            </div>

            {/* Category Filter Pills & Search Input */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTag(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCategory === cat && !selectedTag
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'Tất cả chuyên mục' : cat}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết, tác giả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Tag Notice */}
            {selectedTag && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-semibold animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                  <span>Đang lọc theo chủ đề: <strong>#{selectedTag}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-xs text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer"
                >
                  Xóa bộ lọc tag
                </button>
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-4">
              {loading ? (
            <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              Đang tải danh sách bài viết...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              Chưa có bài viết nào trong chuyên mục này. Hãy là người đầu tiên chia sẻ!
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isLiked = likedPosts[post.id];
              const isExpanded = expandedComments[post.id];

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => post.author_id && onViewProfile?.(post.author_id)}
                        className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shrink-0"
                        title={post.author_id ? 'Xem hồ sơ tác giả' : undefined}
                      >
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
                        ) : (
                          post.author_name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            onClick={() => post.author_id && onViewProfile?.(post.author_id)}
                            className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                          >
                            {post.author_name}
                          </h4>
                          {post.author_id && post.author_id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => onOpenChat?.(post.author_id)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Nhắn tin với tác giả"
                            >
                              Nhắn tin
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDisplayDate(post.created_at, post.created_at_raw)}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                      {post.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600' : ''}`} />
                        <span>{post.likes_count} Thích</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments_count} Bình luận</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onNavigate('/ai-tutor')}
                      className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Hỏi AI về bài này
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 space-y-3 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
                      <div className="space-y-2">
                        {(post.comments || []).map((c) => (
                          <div key={c.id} className="p-3 bg-white rounded-xl border border-slate-200/60 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span
                                  onClick={() => c.author_id && onViewProfile?.(c.author_id)}
                                  className={`font-bold text-slate-800 ${c.author_id ? 'hover:text-blue-600 cursor-pointer' : ''}`}
                                >
                                  {c.author_name}
                                </span>
                                {c.author_id && c.author_id !== user?.id && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenChat?.(c.author_id)}
                                    className="text-[9px] text-blue-600 hover:text-blue-800 font-semibold px-1 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                                    title="Nhắn tin"
                                  >
                                    Nhắn tin
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{formatDisplayDateTime(c.created_at, c.created_at_raw)}</span>
                            </div>
                            <p className="text-slate-600">{c.content}</p>
                          </div>
                        ))}
                      </div>

                      {!user ? (
                        <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700">
                          <span>Đăng nhập để tham gia thảo luận cùng cộng đồng TOEIC</span>
                          <button
                            type="button"
                            onClick={() => onOpenAuth?.('login')}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                          >
                            Đăng nhập
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Viết câu trả lời hoặc thảo luận..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
            </div>
          </div>

          {/* Right Sidebar Column (Sticky) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            
            {/* Widget 1: Hot Discussion Tags */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Chủ Đề Thảo Luận Sôi Nổi
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Hot Tags</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {HOT_TAGS.map((t) => {
                  const isActive = selectedTag === t.tag;
                  return (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => setSelectedTag(isActive ? null : t.tag)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70'
                      }`}
                    >
                      <Hash className={`w-3 h-3 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                      <span>{t.tag}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-500'
                      }`}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Widget 2: Study Groups by Target (Real Data from DB) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Nhóm Học Tập Mục Tiêu
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-blue-600">{studyGroups.length} Nhóm</span>
                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                      title="Admin tạo nhóm học mới"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tạo nhóm</span>
                    </button>
                  )}
                </div>
              </div>

              {loadingGroups ? (
                <div className="py-6 text-center text-xs text-slate-400">Đang tải danh sách nhóm học...</div>
              ) : studyGroups.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có nhóm học nào.
                  {user?.role === 'admin' && ' Bấm "Tạo nhóm" ở trên để tạo nhóm đầu tiên!'}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {studyGroups.map((group: any) => (
                    <div
                      key={group.id}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/70 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              {group.target_score || 'TOEIC'}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">{group.name}</h4>
                          </div>
                          {group.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{group.description}</p>
                          )}
                          {group.schedule_info && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{group.schedule_info}</span>
                            </div>
                          )}
                        </div>

                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            title="Xóa nhóm (Quyền Admin)"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{Number(group.members_count || 1).toLocaleString()} thành viên</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {group.active || `${group.active_online || 1} online`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleJoinGroup(group.id, group.name)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                              joinedGroups[group.id]
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {joinedGroups[group.id] ? 'Đã tham gia' : 'Tham gia'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChat?.()}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
                          >
                            Nhắn tin
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget 3: Mini Leaderboard (Real Data from DB) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Top Tích Cực Tuần Này
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/leaderboard')}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Toàn bộ <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {topLearners.length > 0 ? (
                  topLearners.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => onViewProfile?.(c.user_id || c.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Nhấn để xem thông tin cá nhân"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          c.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-2xs' :
                          c.rank === 2 ? 'bg-slate-300 text-slate-800' :
                          c.rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.rank}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-slate-100 overflow-hidden font-bold text-[10px] flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.full_name} className="w-full h-full object-cover" />
                          ) : (
                            c.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{c.full_name}</div>
                          <div className="text-[10px] text-slate-400">
                            {c.questions_count ? `${c.questions_count} câu đã luyện` : `${c.streak_days || 0} ngày streak`}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 shrink-0 bg-blue-50 px-2 py-0.5 rounded-lg">
                        {c.current_score} TOEIC
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">Đang tải bảng xếp hạng...</div>
                )}
              </div>
            </div>

            {/* Widget 4: Community Tips & Rules */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-sm space-y-3 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Mẹo Luyện Thi Nhanh</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Bôi đen từ hoặc câu:</strong> Sử dụng chuột chọn văn bản tiếng Anh bất kỳ để dịch tức thì.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Chat nhóm:</strong> Bấm nút trò chuyện nổi ở góc dưới bên trái màn hình để trao đổi trực tiếp.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Hỏi bài:</strong> Ghi rõ số câu và mã đề thi để nhận lời giải từ AI và cộng đồng nhanh nhất.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Tạo bài viết chia sẻ mới</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề bài viết</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kinh nghiệm đạt 800+ TOEIC sau 2 tháng..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên mục</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Kinh nghiệm thi">Kinh nghiệm thi</option>
                    <option value="Ngữ pháp & Từ vựng">Ngữ pháp & Từ vựng</option>
                    <option value="Luyện nghe">Luyện nghe</option>
                    <option value="Tìm bạn học">Tìm bạn học</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Chia sẻ phương pháp, tài liệu hoặc câu hỏi cần giải đáp..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPost}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isSubmittingPost ? 'Đang đăng...' : 'Đăng bài ngay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Admin Create Study Group */}
        {isCreateGroupOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tạo Nhóm Học Tập Mới</h3>
                    <p className="text-[11px] text-slate-500">Quyền Quản trị viên (Admin)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên nhóm học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chiến binh TOEIC 800+ K54"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Điểm mục tiêu</label>
                    <select
                      value={groupFormData.target_score}
                      onChange={(e) => setGroupFormData({ ...groupFormData, target_score: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="500-650+">500-650+ (Cơ bản)</option>
                      <option value="700-850+">700-850+ (Bứt phá)</option>
                      <option value="900+">900+ (Master)</option>
                      <option value="All levels">All levels (Tất cả)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lịch học / Hoạt động</label>
                    <input
                      type="text"
                      placeholder="VD: Thứ 2, 4, 6 lúc 19:30"
                      value={groupFormData.schedule_info}
                      onChange={(e) => setGroupFormData({ ...groupFormData, schedule_info: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả nhóm</label>
                  <textarea
                    rows={3}
                    placeholder="Mục tiêu, phương pháp ôn luyện và quy tắc sinh hoạt nhóm..."
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên ban đầu</label>
                    <input
                      type="number"
                      min={1}
                      value={groupFormData.members_count}
                      onChange={(e) => setGroupFormData({ ...groupFormData, members_count: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số online ban đầu</label>
                    <input
                      type="number"
                      min={0}
                      value={groupFormData.active_online}
                      onChange={(e) => setGroupFormData({ ...groupFormData, active_online: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGroup}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingGroup ? 'Đang tạo...' : 'Tạo nhóm ngay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
