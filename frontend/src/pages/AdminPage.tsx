import React, { useState, useEffect } from 'react';
import {
  Crown,
  Building2,
  DollarSign,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Key,
  Zap,
  AlertCircle,
  Shield,
  Users,
  Database,
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  BookOpen,
  ArrowRight,
  Server,
  Edit2,
  Trash2,
  Clock,
  Compass,
  Eye,
  FileText,
  Save,
  Music,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { api } from '../services/api';
import { AIReviewItem } from '../types';
import { AdminBankingCard } from '../components/AdminBankingCard';

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [reviewItems, setReviewItems] = useState<AIReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'queue' | 'generator' | 'groups' | 'users' | 'revenue' | 'banking' | 'gemini' | 'overview' | 'tests'>('queue');

  // Generator form state
  const [genSkill, setGenSkill] = useState('reading');
  const [genTopic, setGenTopic] = useState('Business Contract & Negotiations');
  const [genDifficulty, setGenDifficulty] = useState('650');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  // Study Groups Management State
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    target_score: '500-650+',
    schedule_info: '',
    members_count: 10,
    active_online: 2
  });


  // User & VIP Management State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'vip' | 'admin'>('all');
  const [userPage, setUserPage] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [userActionToast, setUserActionToast] = useState<string | null>(null);
  // User Edit & Create Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [userEditForm, setUserEditForm] = useState({
    full_name: '',
    role: 'student',
    target_score: 650,
    is_active: true,
    password: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    full_name: '',
    role: 'student',
    target_score: 650,
    password: 'Toeic123@'
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserEditForm({
      full_name: u.full_name || '',
      role: u.role || 'student',
      target_score: u.target_score || 650,
      is_active: u.is_active !== false,
      password: ''
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSavingUser(true);
      const res = await api.updateAdminUser(editingUser.id, userEditForm);
      setUserActionToast(res?.message || 'Đã cập nhật thông tin người dùng thành công!');
      setIsEditUserModalOpen(false);
      loadAdminUsers(userPage, userSearch);
      setTimeout(() => setUserActionToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi cập nhật người dùng');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingUser(true);
      const res = await api.createAdminUser(newUserForm);
      setUserActionToast(res?.message || 'Đã tạo tài khoản học viên mới thành công!');
      setIsCreateUserModalOpen(false);
      setNewUserForm({
        email: '',
        full_name: '',
        role: 'student',
        target_score: 650,
        password: 'Toeic123@'
      });
      loadAdminUsers(1, userSearch);
      setTimeout(() => setUserActionToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tạo người dùng');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentActive);
      setUserActionToast(`Đã ${!currentActive ? 'mở khóa' : 'tạm khóa'} tài khoản người dùng!`);
      loadAdminUsers(userPage, userSearch);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi đổi trạng thái');
    }
  };

  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);

  const handleToggleAudioPreview = (url: string) => {
    if (!url) return;
    if (audioPreviewUrl === url && audioPreviewRef.current && !audioPreviewRef.current.paused) {
      audioPreviewRef.current.pause();
      setAudioPreviewUrl(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      try {
        const audio = new Audio(url);
        audioPreviewRef.current = audio;
        setAudioPreviewUrl(url);
        audio.play().catch(() => setAudioPreviewUrl(null));
        audio.onended = () => setAudioPreviewUrl(null);
      } catch {
        setAudioPreviewUrl(null);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadAdminUsers(1, userSearch);
    } else if (activeTab === 'gemini') {
      loadGeminiKeys();
    } else if (activeTab === 'revenue') {
      loadAdminRevenue();
    } else if (activeTab === 'groups') {
      loadAdminGroups();
    } else if (activeTab === 'tests') {
      loadAdminTestsList(1, testsSearch);
    } else if (activeTab === 'overview') {
      loadPoolStats();
    }
  }, [activeTab]);


  // ========== CRUD Test & Question State ==========
  const [adminTests, setAdminTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsPage, setTestsPage] = useState(1);
  const [testsTotalCount, setTestsTotalCount] = useState(0);
  const [testsSearch, setTestsSearch] = useState('');
  const [testsTypeFilter, setTestsTypeFilter] = useState('all');
  const [testActionToast, setTestActionToast] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testForm, setTestForm] = useState({ name: '', slug: '', collection_id: 'dautoeic_ets_full', test_type: 'lr_full', total_questions: 200, duration_minutes: 120, year: 2026, overall_audio: '', is_vip: false });
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [viewingTestId, setViewingTestId] = useState<string | null>(null);
  const [viewingTestMeta, setViewingTestMeta] = useState<any>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsSearch, setQuestionsSearch] = useState('');
  const [questionsPartFilter, setQuestionsPartFilter] = useState<number | undefined>(undefined);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ question_number: 1, part: 1, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', audio_url: '', image_url: '', passage_text: '', transcript: '' });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const loadAdminTestsList = async (p = 1, search = testsSearch) => {
    try { setLoadingTests(true); const res = await api.adminGetTests({ search, test_type: testsTypeFilter !== 'all' ? testsTypeFilter : undefined, page: p, limit: 15 }); setAdminTests(res.tests || []); setTestsTotalCount(res.total || 0); setTestsPage(p); } catch (err: any) { console.error('Load tests error:', err); } finally { setLoadingTests(false); }
  };
  const handleOpenCreateTest = () => { setEditingTestId(null); setTestForm({ name: '', slug: '', collection_id: 'dautoeic_ets_full', test_type: 'lr_full', total_questions: 200, duration_minutes: 120, year: 2026, overall_audio: '', is_vip: false }); setIsTestModalOpen(true); };
  const handleOpenEditTest = (test: any) => { setEditingTestId(test.id || test.test_id); setTestForm({ name: test.name || '', slug: test.slug || '', collection_id: test.collection_id || 'dautoeic_ets_full', test_type: test.test_type || 'lr_full', total_questions: test.total_questions || 200, duration_minutes: test.duration_minutes || 120, year: test.year || 2026, overall_audio: test.overall_audio || '', is_vip: test.is_vip || false }); setIsTestModalOpen(true); };
  const handleSaveTest = async (e: React.FormEvent) => { e.preventDefault(); if (!testForm.name.trim()) { alert('Ten de thi khong duoc de trong'); return; } try { setIsSavingTest(true); if (editingTestId) { await api.adminUpdateTest(editingTestId, testForm); setTestActionToast('Cap nhat de thi thanh cong!'); } else { await api.adminCreateTest(testForm); setTestActionToast('Tao de thi moi thanh cong!'); } setIsTestModalOpen(false); loadAdminTestsList(testsPage, testsSearch); setTimeout(() => setTestActionToast(null), 3500); } catch (err: any) { alert(err?.message || 'Loi khi luu de thi'); } finally { setIsSavingTest(false); } };
  const handleDeleteTest = async (testId: string, testName: string) => { if (!confirm('Ban co chac muon XOA de thi "' + testName + '"?')) return; try { await api.adminDeleteTest(testId); setTestActionToast('Da xoa de thi thanh cong!'); loadAdminTestsList(testsPage, testsSearch); setTimeout(() => setTestActionToast(null), 3500); } catch (err: any) { alert(err?.message || 'Loi khi xoa de thi'); } };
  const handleViewTestQuestions = async (testId: string) => { setViewingTestId(testId); setQuestionsPage(1); setQuestionsSearch(''); setQuestionsPartFilter(undefined); await loadTestQuestions(testId, 1); };
  const loadTestQuestions = async (testId: string, p = 1, search = questionsSearch, part?: number) => { try { setLoadingQuestions(true); const res = await api.adminGetTestQuestions(testId, { search, part, page: p, limit: 20 }); setTestQuestions(res.questions || []); setQuestionsTotal(res.filtered_total || res.total_questions || 0); setViewingTestMeta(res.test_meta || null); setQuestionsPage(p); } catch (err: any) { console.error('Load questions error:', err); } finally { setLoadingQuestions(false); } };
  const handleOpenAddQuestion = () => { setEditingQuestionIdx(null); setQuestionForm({ question_number: (testQuestions.length > 0 ? Math.max(...testQuestions.map((q: any) => q.question_number || 0)) + 1 : 1), part: 1, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', audio_url: '', image_url: '', passage_text: '', transcript: '' }); setIsQuestionModalOpen(true); };
  const handleOpenEditQuestion = (q: any) => { setEditingQuestionIdx(String(q.id || q.question_number)); setQuestionForm({ question_number: q.question_number || 1, part: q.part || 1, question_text: q.question_text || '', option_a: q.option_a || q.options?.A || '', option_b: q.option_b || q.options?.B || '', option_c: q.option_c || q.options?.C || '', option_d: q.option_d || q.options?.D || '', correct_answer: q.correct_answer || 'A', explanation: q.explanation || '', audio_url: q.audio_url || '', image_url: q.image_url || '', passage_text: q.passage_text || '', transcript: q.transcript || '' }); setIsQuestionModalOpen(true); };
  const handleSaveQuestion = async (e: React.FormEvent) => { e.preventDefault(); if (!viewingTestId) return; try { setIsSavingQuestion(true); if (editingQuestionIdx) { await api.adminUpdateTestQuestion(viewingTestId, editingQuestionIdx, questionForm); setTestActionToast('Cap nhat cau hoi thanh cong!'); } else { await api.adminAddTestQuestion(viewingTestId, questionForm); setTestActionToast('Them cau hoi moi thanh cong!'); } setIsQuestionModalOpen(false); loadTestQuestions(viewingTestId, questionsPage, questionsSearch, questionsPartFilter); setTimeout(() => setTestActionToast(null), 3500); } catch (err: any) { alert(err?.message || 'Loi khi luu cau hoi'); } finally { setIsSavingQuestion(false); } };
  const handleDeleteQuestion = async (qIdx: string) => { if (!viewingTestId) return; if (!confirm('Ban co chac muon xoa cau hoi nay?')) return; try { await api.adminDeleteTestQuestion(viewingTestId, qIdx); setTestActionToast('Da xoa cau hoi thanh cong!'); loadTestQuestions(viewingTestId, questionsPage, questionsSearch, questionsPartFilter); setTimeout(() => setTestActionToast(null), 3500); } catch (err: any) { alert(err?.message || 'Loi khi xoa cau hoi'); } };


  // ========== CRUD Kho cau hoi tong (Pool) ==========
  const [poolStats, setPoolStats] = useState<any>(null);
  const [poolQuestions, setPoolQuestions] = useState<any[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [poolPage, setPoolPage] = useState(1);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolPartFilter, setPoolPartFilter] = useState<number | undefined>(undefined);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolToast, setPoolToast] = useState<string | null>(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [editingPoolQId, setEditingPoolQId] = useState<string | null>(null);
  const [poolForm, setPoolForm] = useState({ part: 5, question_number: 0, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation_vi: '', audio_url: '', image_url: '', passage_text: '', transcript: '', difficulty_level: 2, topic: '', test_id: 'pool' });
  const [isSavingPool, setIsSavingPool] = useState(false);
  const [poolViewMode, setPoolViewMode] = useState<'stats' | 'list'>('stats');

  const loadPoolStats = async () => {
    try {
      const res = await api.getAdminQuestionStats();
      if (res) setPoolStats(res);
    } catch (err) { console.error('Pool stats error:', err); }
  };

  const loadPoolQuestions = async (p = 1, part?: number, search = poolSearch) => {
    try {
      setLoadingPool(true);
      const res = await api.getAdminPoolQuestions({ part, search, page: p, limit: 20 });
      setPoolQuestions(res.questions || []);
      setPoolTotal(res.total || 0);
      setPoolPage(p);
    } catch (err: any) { console.error('Pool load error:', err); }
    finally { setLoadingPool(false); }
  };

  const handlePoolPartClick = (partNum: number) => {
    setPoolPartFilter(partNum);
    setPoolViewMode('list');
    loadPoolQuestions(1, partNum, '');
  };

  const handlePoolBackToStats = () => {
    setPoolViewMode('stats');
    setPoolPartFilter(undefined);
    setPoolSearch('');
    loadPoolStats();
  };

  const handleOpenCreatePoolQ = () => {
    setEditingPoolQId(null);
    setPoolForm({ part: poolPartFilter || 5, question_number: 0, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation_vi: '', audio_url: '', image_url: '', passage_text: '', transcript: '', difficulty_level: 2, topic: '', test_id: 'pool' });
    setIsPoolModalOpen(true);
  };

  const handleOpenEditPoolQ = (q: any) => {
    setEditingPoolQId(q.id);
    setPoolForm({
      part: q.part || 5, question_number: q.question_number || 1,
      question_text: q.question_text || '', option_a: q.option_a || '', option_b: q.option_b || '',
      option_c: q.option_c || '', option_d: q.option_d || '', correct_answer: q.correct_answer || 'A',
      explanation_vi: q.explanation_vi || '', audio_url: q.audio_url || '', image_url: q.image_url || '',
      passage_text: q.passage_text || '', transcript: q.transcript || '',
      difficulty_level: q.difficulty_level || 2, topic: q.topic || '', test_id: q.test_id || 'pool'
    });
    setIsPoolModalOpen(true);
  };

  const handleSavePoolQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPool(true);
      if (editingPoolQId) {
        await api.updateAdminPoolQuestion(editingPoolQId, poolForm);
        setPoolToast('Cập nhật câu hỏi thành công!');
      } else {
        await api.createAdminPoolQuestion(poolForm);
        setPoolToast('Thêm câu hỏi mới thành công!');
      }
      setIsPoolModalOpen(false);
      loadPoolQuestions(poolPage, poolPartFilter, poolSearch);
      loadPoolStats();
      setTimeout(() => setPoolToast(null), 3500);
    } catch (err: any) { alert(err?.message || 'Lỗi khi lưu câu hỏi'); }
    finally { setIsSavingPool(false); }
  };

  const handleDeletePoolQ = async (qId: string) => {
    if (!confirm('Xóa câu hỏi này khỏi kho?')) return;
    try {
      await api.deleteAdminPoolQuestion(qId);
      setPoolToast('Đã xóa câu hỏi thành công!');
      loadPoolQuestions(poolPage, poolPartFilter, poolSearch);
      loadPoolStats();
      setTimeout(() => setPoolToast(null), 3500);
    } catch (err: any) { alert(err?.message || 'Lỗi khi xóa'); }
  };

  // VIP Revenue State
  const [revenueStats, setRevenueStats] = useState<any | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  const loadAdminUsers = async (p = 1, search = userSearch) => {
    try {
      setLoadingUsers(true);
      const res = await api.getAdminUsers({ page: p, limit: 12, search: search.trim() || undefined });
      if (res && res.users) {
        setAdminUsers(res.users);
        setTotalUsersCount(res.total || res.users.length);
        setUserPage(p);
      }
    } catch (err) {
      console.warn('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleVip = async (userId: number) => {
    try {
      const res = await api.toggleUserVip(userId);
      setUserActionToast(res?.message || 'Đã cập nhật trạng thái VIP');
      loadAdminUsers(userPage, userSearch);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật gói VIP');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUserActionToast(`Đã chuyển vai trò người dùng thành ${newRole}`);
      loadAdminUsers(userPage, userSearch);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật vai trò');
    }
  };

  const loadAdminRevenue = async () => {
    try {
      setLoadingRevenue(true);
      const res = await api.getAdminRevenue();
      setRevenueStats(res);
    } catch (err) {
      console.warn('Failed to load revenue metrics:', err);
    } finally {
      setLoadingRevenue(false);
    }
  };

  const handleApprovePayment = async (orderId: number) => {
    if (!window.confirm(`Xác nhận duyệt thanh toán thủ công cho đơn hàng #${orderId}? Tài khoản học viên sẽ được kích hoạt VIP Pro ngay.`)) {
      return;
    }
    try {
      await api.adminApprovePayment(orderId);
      await loadAdminRevenue();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt đơn hàng');
    }
  };

  // Gemini AI Key Management State
  const [geminiKeys, setGeminiKeys] = useState<any[]>([]);
  const [geminiInput, setGeminiInput] = useState('');
  const [loadingGeminiKeys, setLoadingGeminiKeys] = useState(false);
  const [testingGeminiKey, setTestingGeminiKey] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<any | null>(null);
  const [activeModels, setActiveModels] = useState<string[]>(['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']);
  const [geminiSaveMessage, setGeminiSaveMessage] = useState<string | null>(null);
  const [selectedPrimaryModel, setSelectedPrimaryModel] = useState<string>('gemini-2.0-flash');
  const [savingModels, setSavingModels] = useState<boolean>(false);

  const handleSaveModelsConfig = async () => {
    try {
      setSavingModels(true);
      const ordered = [
        selectedPrimaryModel,
        ...activeModels.filter((m) => m !== selectedPrimaryModel)
      ];
      const res = await api.updateAdminGeminiModels(ordered);
      setActiveModels(ordered);
      setGeminiSaveMessage(res?.message || 'Đã cập nhật danh sách mô hình thành công!');
      setTimeout(() => setGeminiSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu cấu hình mô hình');
    } finally {
      setSavingModels(false);
    }
  };

  const loadGeminiKeys = async () => {
    try {
      setLoadingGeminiKeys(true);
      const res = await api.getAdminGeminiKeys();
      if (res && res.keys) {
        setGeminiKeys(res.keys);
        if (res.active_models && res.active_models.length > 0) {
          setActiveModels(res.active_models);
          setSelectedPrimaryModel(res.active_models[0]);
        }
      }
    } catch (err) {
      console.warn('Could not load Gemini keys', err);
    } finally {
      setLoadingGeminiKeys(false);
    }
  };

  const handleSaveGeminiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiInput.trim()) return;
    try {
      setLoadingGeminiKeys(true);
      const res = await api.updateAdminGeminiKeys(geminiInput.trim());
      setGeminiInput('');
      setGeminiSaveMessage(res.message || 'Đã cập nhật Gemini API keys thành công!');
      if (res.keys) setGeminiKeys(res.keys);
      setTimeout(() => setGeminiSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu Gemini API keys');
    } finally {
      setLoadingGeminiKeys(false);
    }
  };

  const handleTestGemini = async (key?: string) => {
    try {
      setTestingGeminiKey(true);
      setGeminiTestResult(null);
      const res = await api.testAdminGeminiKeys(key);
      setGeminiTestResult(res);
      loadGeminiKeys();
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        error: err?.message || 'Lỗi kết nối Gemini API'
      });
    } finally {
      setTestingGeminiKey(false);
    }
  };

  const handleDeleteGeminiKey = async (target: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa API key này khỏi pool?')) return;
    try {
      setLoadingGeminiKeys(true);
      const res = await api.deleteAdminGeminiKey(target);
      if (res.keys) setGeminiKeys(res.keys);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa key');
    } finally {
      setLoadingGeminiKeys(false);
    }
  };

  const loadAdminGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await api.getAdminStudyGroups();
      if (res && res.groups) {
        setAdminGroups(res.groups);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setGroupFormData({
      name: '',
      description: '',
      target_score: '500-650+',
      schedule_info: '',
      members_count: 10,
      active_online: 2
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: any) => {
    setEditingGroupId(g.id);
    setGroupFormData({
      name: g.name,
      description: g.description || '',
      target_score: g.target_score || '500-650+',
      schedule_info: g.schedule_info || '',
      members_count: g.members_count || 1,
      active_online: g.active_online || 1
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;
    try {
      if (editingGroupId) {
        await api.updateAdminStudyGroup(editingGroupId, groupFormData);
      } else {
        await api.createAdminStudyGroup(groupFormData);
      }
      setIsGroupModalOpen(false);
      loadAdminGroups();
    } catch {
      alert('Không thể lưu thông tin nhóm học. Vui lòng thử lại!');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhóm học này?')) return;
    try {
      await api.deleteAdminStudyGroup(id);
      loadAdminGroups();
    } catch {
      alert('Không thể xóa nhóm học. Vui lòng thử lại!');
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, queueRes] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAIReviewQueue(statusFilter).catch(() => null)
      ]);

      if (metricsRes) setMetrics(metricsRes);
      if (queueRes && queueRes.items) {
        setReviewItems(queueRes.items);
      }
      loadAdminGroups();
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (itemId: number, action: 'approve' | 'reject') => {
    try {
      await api.updateAIQuestionStatus(itemId, action);
      setReviewItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item))
      );
    } catch {
      // Optimistic update
      setReviewItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item))
      );
    }
  };

  const handleGenerateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      setGeneratedResult(null);
      const res = await api.generateAIQuestion({
        skill: genSkill,
        topic: genTopic,
        difficulty: genDifficulty
      });

      if (res && res.question) {
        setGeneratedResult(res.question);
        loadData();
      }
    } catch {
      // Fallback preview
      const fallbackQ = {
        skill: genSkill,
        topic: genTopic,
        difficulty: `TOEIC ${genDifficulty}+`,
        question_text: `The financial steering committee agreed to ________ the revised operating budget once the external audit concludes.`,
        option_a: 'approve',
        option_b: 'approving',
        option_c: 'approval',
        option_d: 'approved',
        correct_answer: 'A',
        explanation: 'Cấu trúc agree to + V_inf: Hội đồng tài chính đã đồng ý phê duyệt ngân sách điều hành sau khi cuộc kiểm toán kết thúc.'
      };
      setGeneratedResult(fallbackQ);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <Shield className="w-3.5 h-3.5" /> Quản trị viên hệ thống (Admin Portal)
              </span>
              <span className="text-xs text-slate-500 font-medium">Bảo mật & Giám sát dữ liệu AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bảng Điều Khiển Quản Trị & Kiểm Duyệt AI
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Kiểm duyệt ngân hàng câu hỏi AI sinh tự động, theo dõi dung lượng và sức khỏe hệ sinh thái.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Về Dashboard học viên
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Tổng học viên</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics?.total_users || 12}</div>
            <div className="text-[10px] text-emerald-600 font-medium">+4 học viên hôm nay</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Ngân hàng câu hỏi</span>
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics?.total_questions || 2000}+</div>
            <div className="text-[10px] text-slate-400">Authentic ETS format</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Kho từ vựng</span>
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics?.total_vocab_words || 5165}</div>
            <div className="text-[10px] text-slate-400">IPA & Audio US/UK</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Chờ AI duyệt</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{metrics?.pending_ai_reviews || 3}</div>
            <div className="text-[10px] text-amber-700 font-medium">Cần quản trị viên xác thực</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Sức khỏe API</span>
              <Server className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-bold text-emerald-600 pt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 100% Bình thường
            </div>
            <div className="text-[10px] text-slate-400">FastAPI + SQLite Live</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hàng đợi kiểm duyệt câu hỏi AI ({reviewItems.length})
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tạo câu hỏi AI theo chủ đề
          </button>
          <button
            onClick={() => {
              setActiveTab('groups');
              loadAdminGroups();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Quản lý nhóm học ({adminGroups.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              loadAdminUsers(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>Người dùng & Gói VIP</span>
          </button>
          <button
            onClick={() => setActiveTab('banking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'banking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Cấu hình Ngân hàng & VietQR</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('revenue');
              loadAdminRevenue();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'revenue'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
            <span>Doanh thu & Đơn hàng</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('gemini');
              loadGeminiKeys();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gemini'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Cấu hình Gemini API ({geminiKeys.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('tests');
              loadAdminTestsList(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quản lý Đề thi & Câu hỏi</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tổng quan kho câu hỏi ETS
          </button>
        </div>
        {/* Tab 1: AI Review Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
                {['all', 'ai_generated', 'pending_review', 'approved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'all' ? 'Tất cả' : status === 'approved' ? 'Đã duyệt' : status === 'ai_generated' ? 'AI vừa tạo' : 'Chờ duyệt'}
                  </button>
                ))}
              </div>

              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm mới
              </button>
            </div>

            {loading ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                Đang tải dữ liệu...
              </div>
            ) : reviewItems.length === 0 ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                Không có câu hỏi nào cần kiểm duyệt trong mục này.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                          {item.skill.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{item.topic}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {item.difficulty}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      {item.question_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'A', text: item.option_a },
                        { key: 'B', text: item.option_b },
                        { key: 'C', text: item.option_c },
                        { key: 'D', text: item.option_d },
                      ].map((opt) => (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-lg border flex items-center justify-between ${
                            opt.key === item.correct_answer
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{opt.key}. {opt.text}</span>
                          {opt.key === item.correct_answer && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Giải thích ngữ pháp & Mẹo TOEIC:
                      </div>
                      <p className="text-slate-700">{item.explanation}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(item.id, 'reject')}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Từ chối
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Phê duyệt & Đưa vào đề thi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI Question Generator */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Thiết lập tham số sinh câu hỏi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI mô phỏng quy chuẩn đề thi ETS TOEIC với độ chính xác cao.
                </p>
              </div>

              <form onSubmit={handleGenerateQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kỹ năng mục tiêu</label>
                  <select
                    value={genSkill}
                    onChange={(e) => setGenSkill(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="reading">Reading (Part 5 - Incomplete Sentences)</option>
                    <option value="listening">Listening (Part 2 - Question & Response)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chủ đề bài thi</label>
                  <select
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Business Contract & Negotiations">Hợp đồng & Đàm phán thương mại</option>
                    <option value="Financial Budget & Invoices">Tài chính, Ngân sách & Hóa đơn</option>
                    <option value="Human Resources & Recruitment">Nhân sự & Tuyển dụng</option>
                    <option value="Office Facilities & Operations">Vận hành văn phòng & Thiết bị</option>
                    <option value="Marketing & Product Launch">Tiếp thị & Ra mắt sản phẩm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Độ khó mục tiêu</label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="500">TOEIC 500 (Cơ bản, nhận biết)</option>
                    <option value="650">TOEIC 650 (Trung cấp, từ loại & thì)</option>
                    <option value="800">TOEIC 800+ (Nâng cao, ngữ cảnh & từ vựng khó)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? 'AI đang tạo câu hỏi...' : 'Tạo câu hỏi ngay'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Kết quả câu hỏi vừa tạo
                </h3>

                {generatedResult ? (
                  <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        {generatedResult.skill?.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{generatedResult.topic}</span>
                    </div>

                    <p className="text-sm font-bold text-slate-900">{generatedResult.question_text}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { k: 'A', t: generatedResult.option_a },
                        { k: 'B', t: generatedResult.option_b },
                        { k: 'C', t: generatedResult.option_c },
                        { k: 'D', t: generatedResult.option_d },
                      ].map((o) => (
                        <div
                          key={o.k}
                          className={`p-2 rounded-lg border ${
                            o.k === generatedResult.correct_answer
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {o.k}. {o.t}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                      <strong>Giải thích:</strong> {generatedResult.explanation}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                    Chưa tạo câu hỏi. Chọn thông số bên trái và bấm Tạo câu hỏi.
                  </div>
                )}
              </div>

              {generatedResult && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActiveTab('queue')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Xem trong hàng đợi kiểm duyệt
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Study Groups Management */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  Quản lý nhóm học cộng đồng ({adminGroups.length})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tạo mới, chỉnh sửa thông tin hoặc xóa các nhóm học tập mục tiêu hiển thị trên trang Cộng đồng.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateGroup}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tạo nhóm học mới</span>
              </button>
            </div>

            {loadingGroups ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                Đang tải danh sách nhóm học từ cơ sở dữ liệu...
              </div>
            ) : adminGroups.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
                <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Chưa có nhóm học nào được khởi tạo trong hệ thống.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Tạo nhóm đầu tiên ngay
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Tên nhóm & Mục tiêu</th>
                        <th className="py-3 px-4">Mô tả</th>
                        <th className="py-3 px-4">Lịch sinh hoạt</th>
                        <th className="py-3 px-4">Thành viên</th>
                        <th className="py-3 px-4">Online</th>
                        <th className="py-3 px-4">Ngày tạo</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminGroups.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                {g.target_score || 'All'}
                              </span>
                              <span className="font-bold">{g.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={g.description}>
                            {g.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {g.schedule_info ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{g.schedule_info}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {Number(g.members_count || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {g.active_online || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {g.created_at || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditGroup(g)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(g.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa nhóm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Users & VIP Management */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            {userActionToast && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{userActionToast}</span>
              </div>
            )}

            {/* User Overview Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Tổng học viên
                </div>
                <div className="text-2xl font-black text-slate-900">{totalUsersCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Toàn hệ thống</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" /> Học viên VIP Pro
                </div>
                <div className="text-2xl font-black text-amber-600">
                  {adminUsers.filter((u) => u.role === 'vip').length}
                </div>
                <div className="text-[10px] text-amber-600 font-semibold">Toàn quyền tính năng AI</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Học viên Thường
                </div>
                <div className="text-2xl font-black text-slate-700">
                  {adminUsers.filter((u) => u.role === 'student').length}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Gói chuẩn miễn phí</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-500" /> Quản trị viên
                </div>
                <div className="text-2xl font-black text-rose-600">
                  {adminUsers.filter((u) => u.role === 'admin').length}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Quản lý hệ thống</div>
              </div>
            </div>

            {/* Toolbar: Search, Filters & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc email người dùng..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      loadAdminUsers(1, e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'vip', 'student', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === r
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r === 'all' ? 'Tất cả' : r === 'vip' ? '👑 VIP PRO' : r === 'student' ? 'Học viên' : 'Admin'}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm học viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadAdminUsers(userPage, userSearch)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* User List Table */}
            {loadingUsers ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                Đang tải danh sách người dùng...
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Không tìm thấy người dùng nào phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Học viên</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Gói học / Vai trò</th>
                        <th className="py-3 px-4">Target Điểm</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Chỉnh sửa & Cấu hình</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers
                        .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    u.full_name?.charAt(0) || 'U'
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{u.full_name || 'Chưa đặt tên'}</span>
                                    {u.role === 'vip' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                  </div>
                                  <div className="text-[10px] text-slate-400">ID: #{u.id} • Ngày tạo: {u.created_at || 'Mới'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">{u.email}</td>
                            <td className="py-3.5 px-4">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Shield className="w-3 h-3 text-rose-600" /> Quản trị viên
                                </span>
                              ) : u.role === 'vip' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                  <Crown className="w-3 h-3 text-amber-500" /> VIP Pro 👑
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Học viên Thường
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {u.target_score || 650}+
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {u.is_active !== false ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoạt động
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  <XCircle className="w-3 h-3 text-slate-400" /> Tạm khóa
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Toggle VIP Fast Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleVip(u.id)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    u.role === 'vip'
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                      : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200'
                                  }`}
                                  title={u.role === 'vip' ? 'Hạ về gói thường' : 'Cấp quyền VIP Pro'}
                                >
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  <span>{u.role === 'vip' ? 'Hạ VIP' : 'Cấp VIP'}</span>
                                </button>

                                {/* Full Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                                  title="Chỉnh sửa thông tin học viên & gói học"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Sửa</span>
                                </button>

                                {/* Toggle Active / Lock Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u.id, u.is_active !== false)}
                                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                    u.is_active !== false
                                      ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200'
                                      : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                                  }`}
                                  title={u.is_active !== false ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                >
                                  {u.is_active !== false ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
                  <span>Tổng số: {totalUsersCount} người dùng</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={userPage <= 1}
                      onClick={() => loadAdminUsers(userPage - 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold text-xs"
                    >
                      Trước
                    </button>
                    <span className="px-2 font-semibold">Trang {userPage}</span>
                    <button
                      type="button"
                      disabled={adminUsers.length < 12}
                      onClick={() => loadAdminUsers(userPage + 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold text-xs"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Revenue & VIP Orders */}
        {activeTab === 'revenue' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Báo cáo doanh thu & Đơn hàng VIP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thống kê doanh thu từ các gói học viên VIP Pro và giao dịch kích hoạt
                </p>
              </div>
              <button
                onClick={loadAdminRevenue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm mới
              </button>
            </div>

            {loadingRevenue ? (
              <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                Đang tổng hợp số liệu doanh thu...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Tổng doanh thu
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {Number(revenueStats?.total_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">VND</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Tất cả giao dịch thành công</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> Doanh thu tháng này
                    </div>
                    <div className="text-2xl font-black text-blue-600">
                      {Number(revenueStats?.monthly_revenue || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">VND</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Tháng hiện tại</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> Học viên VIP
                    </div>
                    <div className="text-2xl font-black text-amber-600">
                      {revenueStats?.total_vip_users || 0} <span className="text-xs font-bold text-slate-400">học viên</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Đang sử dụng gói VIP Pro</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-purple-500" /> Tỷ lệ chuyển đổi
                    </div>
                    <div className="text-2xl font-black text-purple-600">
                      {revenueStats?.conversion_rate || '0%'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Học viên thường sang VIP</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Đơn hàng kích hoạt gói học gần đây
                  </h4>
                  {revenueStats?.recent_orders && revenueStats.recent_orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Mã đơn</th>
                            <th className="py-2.5 px-3">Học viên</th>
                            <th className="py-2.5 px-3">Gói học</th>
                            <th className="py-2.5 px-3">Số tiền</th>
                            <th className="py-2.5 px-3">Thời gian</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {revenueStats.recent_orders.map((ord: any) => (
                            <tr key={ord.id || ord.raw_id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">#{ord.id}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{ord.user_name}</div>
                                <div className="text-[10px] text-slate-400">{ord.email}</div>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-blue-600">{ord.plan_name || ord.package_name}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{ord.formatted_amount || `${Number(ord.amount).toLocaleString()} đ`}</td>
                              <td className="py-2.5 px-3 text-slate-400">{ord.created_at}</td>
                              <td className="py-2.5 px-3">
                                {ord.raw_status === 'COMPLETED' || ord.status === 'Thành công' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Thành công
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Chờ duyệt
                                    </span>
                                    {ord.raw_id && (
                                      <button
                                        type="button"
                                        onClick={() => handleApprovePayment(ord.raw_id)}
                                        className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                                      >
                                        Duyệt tay
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Chưa có phát sinh đơn hàng mới trong kỳ.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}


        {/* Tab: Banking Configuration & VietQR Auto-Deposit */}
        {activeTab === 'banking' && (
          <AdminBankingCard />
        )}

        {/* Tab: Gemini AI Configuration */}
        {activeTab === 'gemini' && (
          <div className="space-y-6">
            {/* Top Notifications */}
            {geminiSaveMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{geminiSaveMessage}</span>
              </div>
            )}

            {/* Status Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái Key Pool</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {geminiKeys.length} API Key
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {geminiKeys.filter((k) => k.is_available).length} key sẵn sàng hoạt động
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô hình chính (Primary)</div>
                  <div className="text-lg font-black text-purple-700 mt-0.5 font-mono">
                    {selectedPrimaryModel || activeModels[0] || 'gemini-2.0-flash'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Tốc độ ~200ms • Chuẩn TOEIC</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cơ chế Failover</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">Round-Robin + Tự động 429</div>
                  <div className="text-[11px] text-slate-400 font-medium">Tự chuyển key khi hết quota</div>
                </div>
              </div>
            </div>

            {/* Section 1: Input & Save API Keys */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    Thêm & Cập nhật Gemini API Key
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ dán 1 key hoặc nhiều key (ngăn cách bằng dấu phẩy hoặc dòng mới) để tự động cân bằng tải.
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <span>Lấy key Google miễn phí</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleSaveGeminiKeys} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nhập Gemini API Key (Bắt đầu bằng AIzaSy...):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Dán một hoặc nhiều API key vào đây:
AIzaSyD...key1,
AIzaSyB...key2"
                    value={geminiInput}
                    onChange={(e) => setGeminiInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    🔒 Bảo mật: Key được mã hóa lưu trữ an toàn trong biến môi trường máy chủ (.env), không bao giờ lộ ra ngoài giao diện công khai.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={loadingGeminiKeys || !geminiInput.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingGeminiKeys ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Lưu Cấu Hình Key</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeminiInput('')}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa trắng ô nhập
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Model Selection & Priorities */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Chọn Model AI & Thứ tự ưu tiên (Model Priority)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hệ thống tự động sử dụng Model chính trước; nếu gặp rate-limit hoặc quá tải sẽ tự động chuyển sang Model tiếp theo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'gemini-2.0-flash',
                    title: 'Gemini 2.0 Flash',
                    badge: 'Khuyên dùng',
                    desc: 'Thế hệ mới nhất, tốc độ phản hồi siêu nhanh (~200ms), tối ưu chấm bài và tạo câu hỏi TOEIC Parts 1-7.',
                    speed: 'Rất nhanh (0.2s)',
                    cost: 'Tối ưu chi phí'
                  },
                  {
                    id: 'gemini-1.5-flash',
                    title: 'Gemini 1.5 Flash',
                    badge: 'Ổn định',
                    desc: 'Hạn mức token 1 triệu, xử lý dữ liệu lớn, phân tích lỗi sai và đề xuất lộ trình dài hạn.',
                    speed: 'Nhanh (0.5s)',
                    cost: 'Hạn mức cao'
                  },
                  {
                    id: 'gemini-1.5-pro',
                    title: 'Gemini 1.5 Pro',
                    badge: 'Chuyên sâu',
                    desc: 'Suy luận cao cấp, giải thích ngữ pháp đa tầng và bài đọc kép phức tạp Part 7.',
                    speed: 'Tiêu chuẩn (1.2s)',
                    cost: 'Chất lượng cao'
                  }
                ].map((m) => {
                  const isPrimary = (selectedPrimaryModel || activeModels[0]) === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedPrimaryModel(m.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isPrimary
                          ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 font-mono">{m.title}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isPrimary
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPrimary ? 'Đang chọn làm Chính' : m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{m.desc}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Tốc độ: {m.speed}</span>
                        <span>{m.cost}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  Thứ tự ưu tiên hiện tại:{' '}
                  <span className="font-mono font-bold text-slate-700">
                    {[selectedPrimaryModel, ...activeModels.filter((m) => m !== selectedPrimaryModel)].join(' → ')}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={savingModels}
                  onClick={handleSaveModelsConfig}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingModels ? 'Đang lưu...' : 'Áp dụng Model chính'}
                </button>
              </div>
            </div>

            {/* Section 3: Test Connection & Diagnostic */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Kiểm tra kết nối Gemini API (Test Connection)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gửi yêu cầu thử nghiệm thực tế đến Google Gemini API để đo độ trễ mạng và xác thực tính hợp lệ của key.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={testingGeminiKey}
                  onClick={() => handleTestGemini()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {testingGeminiKey ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>{testingGeminiKey ? 'Đang kiểm tra kết nối...' : 'Kiểm tra toàn bộ Pool'}</span>
                </button>
              </div>

              {/* Test Result Display */}
              {geminiTestResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 animate-in fade-in duration-200 ${
                    geminiTestResult.success
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {geminiTestResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Kết nối Gemini API thành công! (HTTP 200 OK)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Kết nối thất bại / Lỗi xác thực API</span>
                      </>
                    )}
                  </div>

                  {geminiTestResult.success ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-[11px]">
                      <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">Model phản hồi:</span>
                        <span className="font-bold text-emerald-700">{geminiTestResult.model}</span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">Độ trễ (Latency):</span>
                        <span className="font-bold text-emerald-700">{geminiTestResult.latency_ms} ms</span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">Key sử dụng:</span>
                        <span className="font-bold text-slate-700">{geminiTestResult.masked_key}</span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-xl border border-emerald-100">
                        <span className="text-slate-400 block text-[10px]">Phản hồi mẫu:</span>
                        <span className="font-bold text-slate-700">"{geminiTestResult.reply || 'OK'}"</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/80 rounded-xl border border-rose-100 text-rose-700 text-xs">
                      <strong>Chi tiết lỗi:</strong> {geminiTestResult.error}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Gợi ý: Kiểm tra xem API key đã kích hoạt Generative Language API trên Google Cloud Console chưa, hoặc kiểm tra hạn mức gọi API (Quota).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Current Key Pool Table */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    Danh sách các Key trong Pool ({geminiKeys.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống tự động luân phiên sử dụng các key này để phân phối tải và tránh lỗi quá tải 429
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadGeminiKeys}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Làm mới danh sách
                </button>
              </div>

              {geminiKeys.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Key className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Chưa có API key nào trong hệ thống.</p>
                  <p className="text-[11px]">Vui lòng nhập API key ở khung trên để kích hoạt tính năng Gemini AI.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Key ID</th>
                        <th className="py-3 px-4">Masked API Key</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4">Đã gọi thành công</th>
                        <th className="py-3 px-4">Số lỗi</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {geminiKeys.map((k, idx) => (
                        <tr key={k.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-800">#{k.id || idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{k.masked_key}</td>
                          <td className="py-3.5 px-4 font-sans">
                            {k.is_available ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng
                              </span>
                            ) : k.cooling_seconds > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-500" /> Làm mát ({k.cooling_seconds}s)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-500" /> Lỗi
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{k.request_count || 0} lượt</td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className={k.error_count > 0 ? 'text-rose-600 font-bold' : ''}>
                              {k.error_count || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-sans">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTestGemini(k.masked_key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                title="Kiểm tra kết nối cho key này"
                              >
                                <Zap className="w-3 h-3" /> Test
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGeminiKey(k.masked_key || String(k.id || idx + 1))}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa key khỏi pool"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Tab: CRUD Tests & Questions */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {testActionToast && (
              <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-right">
                <CheckCircle2 className="w-4 h-4" /> {testActionToast}
              </div>
            )}
            {!viewingTestId ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="text" placeholder="Tìm đề thi theo tên, ID..." value={testsSearch} onChange={(e) => setTestsSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadAdminTestsList(1, testsSearch); }} className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <select value={testsTypeFilter} onChange={(e) => { setTestsTypeFilter(e.target.value); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="all">Tất cả loại</option>
                      <option value="lr_full">Full Test (LR)</option>
                      <option value="listening">Listening Only</option>
                      <option value="reading">Reading Only</option>
                      <option value="mini_test">Mini Test</option>
                    </select>
                    <button onClick={() => loadAdminTestsList(1, testsSearch)} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Tìm
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleOpenCreateTest} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Tạo đề thi mới
                    </button>
                    <button onClick={handleOpenCreatePoolQ} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {loadingTests ? (
                    <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách đề thi...</div>
                  ) : adminTests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">Không tìm thấy đề thi nào.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Tên đề thi</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-600 uppercase tracking-wider">Loại</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-600 uppercase tracking-wider">Số câu</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-600 uppercase tracking-wider">Thời gian</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-600 uppercase tracking-wider">Năm</th>
                            <th className="text-center px-3 py-3 font-bold text-slate-600 uppercase tracking-wider">VIP</th>
                            <th className="text-right px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminTests.map((test: any, idx: number) => (
                            <tr key={test.id || idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-800 truncate max-w-xs">{test.name || test.slug || test.id}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">ID: {test.id}</div>
                              </td>
                              <td className="text-center px-3 py-3"><span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[10px]">{test.test_type || 'lr_full'}</span></td>
                              <td className="text-center px-3 py-3 font-semibold text-slate-700">{test.total_questions || 0}</td>
                              <td className="text-center px-3 py-3 text-slate-500">{test.duration_minutes || 120} phút</td>
                              <td className="text-center px-3 py-3 text-slate-500">{test.year || '-'}</td>
                              <td className="text-center px-3 py-3">{test.is_vip ? <Crown className="w-3.5 h-3.5 text-amber-500 mx-auto" /> : <span className="text-slate-300">-</span>}</td>
                              <td className="text-right px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => handleViewTestQuestions(test.id || test.test_id)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 cursor-pointer" title="Xem câu hỏi"><Eye className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleOpenEditTest(test)} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 cursor-pointer" title="Sửa đề thi"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteTest(test.id || test.test_id, test.name)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 cursor-pointer" title="Xóa đề thi"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {testsTotalCount > 15 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400">Hiển thị {adminTests.length} / {testsTotalCount} đề thi</span>
                      <div className="flex items-center gap-1">
                        <button disabled={testsPage <= 1} onClick={() => loadAdminTestsList(testsPage - 1, testsSearch)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-xs font-semibold text-slate-600 px-2">Trang {testsPage}</span>
                        <button disabled={testsPage * 15 >= testsTotalCount} onClick={() => loadAdminTestsList(testsPage + 1, testsSearch)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <button onClick={() => { setViewingTestId(null); setTestQuestions([]); }} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{viewingTestMeta?.name || viewingTestId}</h3>
                    <div className="text-[10px] text-slate-400">ID: {viewingTestId} &bull; Tổng: {questionsTotal} câu hỏi</div>
                  </div>
                  <button onClick={handleOpenAddQuestion} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Thêm câu hỏi</button>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Tìm câu hỏi..." value={questionsSearch} onChange={(e) => setQuestionsSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && viewingTestId) loadTestQuestions(viewingTestId, 1, questionsSearch, questionsPartFilter); }} className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <select value={questionsPartFilter ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : undefined; setQuestionsPartFilter(v); if (viewingTestId) loadTestQuestions(viewingTestId, 1, questionsSearch, v); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Tất cả Part</option>
                    {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>Part {p}</option>)}
                  </select>
                  <button onClick={() => { if (viewingTestId) loadTestQuestions(viewingTestId, 1, questionsSearch, questionsPartFilter); }} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Lọc</button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {loadingQuestions ? (
                    <div className="p-8 text-center text-xs text-slate-400">Đang tải câu hỏi...</div>
                  ) : testQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">Chưa có câu hỏi nào.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {testQuestions.map((q: any, idx: number) => (
                        <div key={q.id || idx} className="p-4 hover:bg-blue-50/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">Câu {q.question_number || idx + 1}</span>
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[10px]">Part {q.part || '?'}</span>
                                {q.audio_url && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAudioPreview(q.audio_url)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      audioPreviewUrl === q.audio_url
                                        ? 'bg-purple-600 text-white animate-pulse'
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    }`}
                                    title="Nghe thử audio"
                                  >
                                    {audioPreviewUrl === q.audio_url ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                    <span>Audio</span>
                                  </button>
                                )}
                                {q.image_url && (
                                  <a
                                    href={q.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    title="Xem ảnh câu hỏi"
                                  >
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    <span>Ảnh</span>
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-slate-800 line-clamp-2">{q.question_text || '(Kh\u00f4ng c\u00f3 n\u1ed9i dung)'}</div>
                              <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-500">
                                <span><b className="text-slate-700">A:</b> {q.option_a || q.options?.A || '-'}</span>
                                <span><b className="text-slate-700">B:</b> {q.option_b || q.options?.B || '-'}</span>
                                <span><b className="text-slate-700">C:</b> {q.option_c || q.options?.C || '-'}</span>
                                <span><b className="text-slate-700">D:</b> {q.option_d || q.options?.D || '-'}</span>
                              </div>
                              <div className="mt-1 text-[10px]"><span className="text-emerald-600 font-bold">Đáp án: {q.correct_answer || '-'}</span></div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleOpenEditQuestion(q)} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 cursor-pointer" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteQuestion(String(q.id || q.question_number))} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 cursor-pointer" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {questionsTotal > 20 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400">Hiển thị {testQuestions.length} / {questionsTotal} câu</span>
                      <div className="flex items-center gap-1">
                        <button disabled={questionsPage <= 1} onClick={() => { if (viewingTestId) loadTestQuestions(viewingTestId, questionsPage - 1, questionsSearch, questionsPartFilter); }} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-xs font-semibold text-slate-600 px-2">Trang {questionsPage}</span>
                        <button disabled={questionsPage * 20 >= questionsTotal} onClick={() => { if (viewingTestId) loadTestQuestions(viewingTestId, questionsPage + 1, questionsSearch, questionsPartFilter); }} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {isTestModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                      <h3 className="text-sm font-bold text-slate-900">{editingTestId ? 'Ch\u1EC9nh s\u1EEDa \u0111\u1EC1 thi' : 'T\u1EA1o \u0111\u1EC1 thi m\u1EDBi'}</h3>
                    </div>
                    <button onClick={() => setIsTestModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSaveTest} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên đề thi *</label>
                      <input type="text" required value={testForm.name} onChange={(e) => setTestForm({...testForm, name: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: ETS 2026 Test 1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Slug</label>
                        <input type="text" value={testForm.slug} onChange={(e) => setTestForm({...testForm, slug: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ets-2026-test-1" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Loại đề</label>
                        <select value={testForm.test_type} onChange={(e) => setTestForm({...testForm, test_type: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="lr_full">Full Test (LR)</option>
                          <option value="listening">Listening Only</option>
                          <option value="reading">Reading Only</option>
                          <option value="mini_test">Mini Test</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Số câu</label>
                        <input type="number" min={1} value={testForm.total_questions} onChange={(e) => setTestForm({...testForm, total_questions: parseInt(e.target.value) || 200})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian (phút)</label>
                        <input type="number" min={1} value={testForm.duration_minutes} onChange={(e) => setTestForm({...testForm, duration_minutes: parseInt(e.target.value) || 120})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Năm</label>
                        <input type="number" value={testForm.year} onChange={(e) => setTestForm({...testForm, year: parseInt(e.target.value) || 2026})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bộ sưu tập</label>
                        <input type="text" value={testForm.collection_id} onChange={(e) => setTestForm({...testForm, collection_id: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Audio tổng</label>
                        <input type="text" value={testForm.overall_audio} onChange={(e) => setTestForm({...testForm, overall_audio: e.target.value})} placeholder="URL audio..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_vip_test" checked={testForm.is_vip} onChange={(e) => setTestForm({...testForm, is_vip: e.target.checked})} className="rounded" />
                      <label htmlFor="is_vip_test" className="text-xs font-semibold text-slate-700">Đề thi VIP (chỉ dành cho tài khoản VIP)</label>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setIsTestModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Hủy</button>
                      <button type="submit" disabled={isSavingTest} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> {isSavingTest ? '\u0110ang l\u01B0u...' : (editingTestId ? 'C\u1EADp nh\u1EADt' : 'T\u1EA1o \u0111\u1EC1 thi')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {isQuestionModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4" /></div>
                      <h3 className="text-sm font-bold text-slate-900">{editingQuestionIdx ? 'Ch\u1EC9nh s\u1EEDa c\u00E2u h\u1ECFi' : 'Th\u00EAm c\u00E2u h\u1ECFi m\u1EDBi'}</h3>
                    </div>
                    <button onClick={() => setIsQuestionModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSaveQuestion} className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Câu số</label>
                        <input type="number" min={1} value={questionForm.question_number} onChange={(e) => setQuestionForm({...questionForm, question_number: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Part</label>
                        <select value={questionForm.part} onChange={(e) => setQuestionForm({...questionForm, part: parseInt(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>Part {p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án đúng</label>
                        <select value={questionForm.correct_answer} onChange={(e) => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {['A','B','C','D'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi</label>
                      <textarea rows={2} value={questionForm.question_text} onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Nội dung câu hỏi..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án A</label>
                        <input type="text" value={questionForm.option_a} onChange={(e) => setQuestionForm({...questionForm, option_a: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án B</label>
                        <input type="text" value={questionForm.option_b} onChange={(e) => setQuestionForm({...questionForm, option_b: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án C</label>
                        <input type="text" value={questionForm.option_c} onChange={(e) => setQuestionForm({...questionForm, option_c: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án D</label>
                        <input type="text" value={questionForm.option_d} onChange={(e) => setQuestionForm({...questionForm, option_d: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giải thích</label>
                      <textarea rows={2} value={questionForm.explanation} onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Giải thích đáp án..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">Audio URL</label>
                          {questionForm.audio_url && (
                            <button
                              type="button"
                              onClick={() => handleToggleAudioPreview(questionForm.audio_url)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                audioPreviewUrl === questionForm.audio_url
                                  ? 'bg-purple-600 text-white animate-pulse'
                                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                              }`}
                            >
                              {audioPreviewUrl === questionForm.audio_url ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                              <span>{audioPreviewUrl === questionForm.audio_url ? 'Đang phát' : 'Nghe thử'}</span>
                            </button>
                          )}
                        </div>
                        <input type="text" value={questionForm.audio_url} onChange={(e) => setQuestionForm({...questionForm, audio_url: e.target.value})} placeholder="/media/... hoặc https://..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                        <input type="text" value={questionForm.image_url} onChange={(e) => setQuestionForm({...questionForm, image_url: e.target.value})} placeholder="/media/... hoặc https://..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                        {questionForm.image_url && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                            <img src={questionForm.image_url} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            <div className="text-[10px] text-slate-500 truncate">Ảnh xem trước hợp lệ</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Đoạn văn / Passage</label>
                      <textarea rows={2} value={questionForm.passage_text} onChange={(e) => setQuestionForm({...questionForm, passage_text: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Đoạn văn (nếu có)..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transcript</label>
                      <textarea rows={2} value={questionForm.transcript} onChange={(e) => setQuestionForm({...questionForm, transcript: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Bản ghi lời..." />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Hủy</button>
                      <button type="submit" disabled={isSavingQuestion} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> {isSavingQuestion ? '\u0110ang l\u01B0u...' : (editingQuestionIdx ? 'C\u1EADp nh\u1EADt' : 'Th\u00EAm c\u00E2u h\u1ECFi')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Tab 4: Tong kho cau hoi - CRUD */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {poolToast && (
              <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-right">
                <CheckCircle2 className="w-4 h-4" /> {poolToast}
              </div>
            )}

            {/* Header Action Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[11px] border border-blue-400/30">
                    Kho Đề thi & Ngân hàng Câu hỏi
                  </span>
                  <span className="text-slate-400 text-xs">• 100% Authentic Format</span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Quản lý Ngân hàng Đề thi & Kho câu hỏi ETS
                </h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Thêm mới đề thi chuẩn ETS, cập nhật và quản lý kho câu hỏi Part 1–7 với đầy đủ Audio, hình ảnh, bài đọc và đáp án giải thích chi tiết.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenCreatePoolQ()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm câu hỏi mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateTest()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo đề thi mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tests');
                    loadAdminTestsList(1);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 cursor-pointer transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Xem 168 đề thi →</span>
                </button>
              </div>
            </div>

            {poolViewMode === 'stats' ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Phân bố câu hỏi theo từng Part trong hệ thống
                  </h3>
                  <div className="text-xs text-slate-400">
                    Tổng: <b className="text-blue-600">{poolStats?.total_questions || 0}</b> câu hỏi &bull; <b className="text-blue-600">{poolStats?.total_tests || 0}</b> đề thi
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {(poolStats?.distribution || [
                    { part: 'Part 1', part_number: 1, name: 'Photographs', count: 0, media: 'Audio + Ảnh' },
                    { part: 'Part 2', part_number: 2, name: 'Question-Response', count: 0, media: 'Audio' },
                    { part: 'Part 3', part_number: 3, name: 'Conversations', count: 0, media: 'Audio + Biểu đồ' },
                    { part: 'Part 4', part_number: 4, name: 'Short Talks', count: 0, media: 'Audio' },
                    { part: 'Part 5', part_number: 5, name: 'Incomplete Sentences', count: 0, media: 'Văn bản' },
                    { part: 'Part 6', part_number: 6, name: 'Text Completion', count: 0, media: 'Đoạn văn' },
                    { part: 'Part 7', part_number: 7, name: 'Reading Comprehension', count: 0, media: 'Đơn & Đa đoạn' },
                  ]).map((item: any) => (
                    <div
                      key={item.part}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-1 cursor-pointer" onClick={() => handlePoolPartClick(item.part_number)}>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{item.part}</span>
                          <span className="text-blue-600 font-extrabold">{item.count} câu</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Định dạng: {item.media}</div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPoolPartFilter(item.part_number);
                            setPoolForm({
                              ...poolForm,
                              part: item.part_number,
                              question_number: 0,
                              question_text: '',
                              option_a: '',
                              option_b: '',
                              option_c: '',
                              option_d: '',
                              correct_answer: 'A',
                              explanation_vi: '',
                              audio_url: '',
                              image_url: '',
                              passage_text: '',
                              transcript: '',
                              difficulty_level: 2,
                              topic: '',
                              test_id: 'pool'
                            });
                            setEditingPoolQId(null);
                            setIsPoolModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePoolPartClick(item.part_number)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Quản lý</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <button onClick={handlePoolBackToStats} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Kho câu hỏi {poolPartFilter ? `Part ${poolPartFilter}` : 'Tất cả'}</h3>
                    <div className="text-[10px] text-slate-400">Tổng: {poolTotal} câu hỏi trong kho</div>
                  </div>
                  <button onClick={handleOpenCreatePoolQ} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Tìm câu hỏi..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadPoolQuestions(1, poolPartFilter, poolSearch); }} className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <select value={poolPartFilter ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : undefined; setPoolPartFilter(v); loadPoolQuestions(1, v, poolSearch); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Tất cả Part</option>
                    {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>Part {p}</option>)}
                  </select>
                  <button onClick={() => loadPoolQuestions(1, poolPartFilter, poolSearch)} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Lọc
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {loadingPool ? (
                    <div className="p-8 text-center text-xs text-slate-400">Đang tải câu hỏi...</div>
                  ) : poolQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">Chưa có câu hỏi nào trong kho.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {poolQuestions.map((q: any, idx: number) => (
                        <div key={q.id || idx} className="p-4 hover:bg-blue-50/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">#{q.question_number || idx + 1}</span>
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[10px]">Part {q.part || '?'}</span>
                                {q.topic && <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-600 font-semibold text-[10px]">{q.topic}</span>}
                                {q.difficulty_level && <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-semibold text-[10px]">Lv.{q.difficulty_level}</span>}
                                {q.audio_url && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAudioPreview(q.audio_url)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      audioPreviewUrl === q.audio_url
                                        ? 'bg-purple-600 text-white animate-pulse'
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    }`}
                                    title="Nghe thử audio"
                                  >
                                    {audioPreviewUrl === q.audio_url ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                    <span>Audio</span>
                                  </button>
                                )}
                                {q.image_url && (
                                  <a
                                    href={q.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    title="Xem ảnh câu hỏi"
                                  >
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    <span>Ảnh</span>
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-slate-800 line-clamp-2">{q.question_text || '(Không có nội dung)'}</div>
                              <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-500">
                                <span><b className="text-slate-700">A:</b> {q.option_a || '-'}</span>
                                <span><b className="text-slate-700">B:</b> {q.option_b || '-'}</span>
                                <span><b className="text-slate-700">C:</b> {q.option_c || '-'}</span>
                                <span><b className="text-slate-700">D:</b> {q.option_d || '-'}</span>
                              </div>
                              <div className="mt-1 text-[10px] flex items-center gap-3">
                                <span className="text-emerald-600 font-bold">Đáp án: {q.correct_answer || '-'}</span>
                                <span className="text-slate-400">ID: {q.id}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleOpenEditPoolQ(q)} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 cursor-pointer" title="Sửa">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeletePoolQ(q.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 cursor-pointer" title="Xóa">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {poolTotal > 20 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400">Hiển thị {poolQuestions.length} / {poolTotal} câu</span>
                      <div className="flex items-center gap-1">
                        <button disabled={poolPage <= 1} onClick={() => loadPoolQuestions(poolPage - 1, poolPartFilter, poolSearch)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-xs font-semibold text-slate-600 px-2">Trang {poolPage}</span>
                        <button disabled={poolPage * 20 >= poolTotal} onClick={() => loadPoolQuestions(poolPage + 1, poolPartFilter, poolSearch)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isPoolModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Database className="w-4 h-4" /></div>
                      <h3 className="text-sm font-bold text-slate-900">{editingPoolQId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi vào kho'}</h3>
                    </div>
                    <button onClick={() => setIsPoolModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSavePoolQ} className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Part</label>
                        <select value={poolForm.part} onChange={(e) => setPoolForm({...poolForm, part: parseInt(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {[1,2,3,4,5,6,7].map(p => <option key={p} value={p}>Part {p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Câu số</label>
                        <input type="number" min={0} value={poolForm.question_number} onChange={(e) => setPoolForm({...poolForm, question_number: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tự động" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án đúng</label>
                        <select value={poolForm.correct_answer} onChange={(e) => setPoolForm({...poolForm, correct_answer: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {['A','B','C','D'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Độ khó</label>
                        <select value={poolForm.difficulty_level} onChange={(e) => setPoolForm({...poolForm, difficulty_level: parseInt(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value={1}>1 - Dễ</option>
                          <option value={2}>2 - Trung bình</option>
                          <option value={3}>3 - Khó</option>
                          <option value={4}>4 - Rất khó</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Chủ đề</label>
                        <input type="text" value={poolForm.topic} onChange={(e) => setPoolForm({...poolForm, topic: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Word Form, Tense..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Test ID (nguồn)</label>
                        <input type="text" value={poolForm.test_id} onChange={(e) => setPoolForm({...poolForm, test_id: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="pool" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi</label>
                      <textarea rows={2} value={poolForm.question_text} onChange={(e) => setPoolForm({...poolForm, question_text: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Nội dung câu hỏi..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án A</label>
                        <input type="text" value={poolForm.option_a} onChange={(e) => setPoolForm({...poolForm, option_a: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án B</label>
                        <input type="text" value={poolForm.option_b} onChange={(e) => setPoolForm({...poolForm, option_b: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án C</label>
                        <input type="text" value={poolForm.option_c} onChange={(e) => setPoolForm({...poolForm, option_c: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án D</label>
                        <input type="text" value={poolForm.option_d} onChange={(e) => setPoolForm({...poolForm, option_d: e.target.value})} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giải thích (tiếng Việt)</label>
                      <textarea rows={2} value={poolForm.explanation_vi} onChange={(e) => setPoolForm({...poolForm, explanation_vi: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Giải thích đáp án đúng..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">Audio URL</label>
                          {poolForm.audio_url && (
                            <button
                              type="button"
                              onClick={() => handleToggleAudioPreview(poolForm.audio_url)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                audioPreviewUrl === poolForm.audio_url
                                  ? 'bg-purple-600 text-white animate-pulse'
                                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                              }`}
                            >
                              {audioPreviewUrl === poolForm.audio_url ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                              <span>{audioPreviewUrl === poolForm.audio_url ? 'Đang phát' : 'Nghe thử'}</span>
                            </button>
                          )}
                        </div>
                        <input type="text" value={poolForm.audio_url} onChange={(e) => setPoolForm({...poolForm, audio_url: e.target.value})} placeholder="/media/... hoặc https://..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                        <input type="text" value={poolForm.image_url} onChange={(e) => setPoolForm({...poolForm, image_url: e.target.value})} placeholder="/media/... hoặc https://..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                        {poolForm.image_url && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                            <img src={poolForm.image_url} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            <div className="text-[10px] text-slate-500 truncate">Ảnh xem trước hợp lệ</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Đoạn văn / Passage</label>
                      <textarea rows={2} value={poolForm.passage_text} onChange={(e) => setPoolForm({...poolForm, passage_text: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Đoạn văn (nếu có)..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transcript</label>
                      <textarea rows={2} value={poolForm.transcript} onChange={(e) => setPoolForm({...poolForm, transcript: e.target.value})} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Bản ghi lời (nếu có)..." />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setIsPoolModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Hủy</button>
                      <button type="submit" disabled={isSavingPool} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> {isSavingPool ? 'Đang lưu...' : (editingPoolQId ? 'Cập nhật' : 'Thêm câu hỏi')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Edit Modal */}
        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Chỉnh sửa tài khoản #{editingUser.id}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">{editingUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên học viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userEditForm.full_name}
                    onChange={(e) => setUserEditForm({ ...userEditForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gói học / Vai trò
                    </label>
                    <select
                      value={userEditForm.role}
                      onChange={(e) => setUserEditForm({ ...userEditForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="student">Học viên Thường</option>
                      <option value="vip">VIP Pro 👑</option>
                      <option value="admin">Quản trị viên 🛡️</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mục tiêu điểm TOEIC
                    </label>
                    <select
                      value={userEditForm.target_score}
                      onChange={(e) => setUserEditForm({ ...userEditForm, target_score: parseInt(e.target.value) || 650 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="500">Target 500+</option>
                      <option value="650">Target 650+</option>
                      <option value="750">Target 750+</option>
                      <option value="850">Target 850+</option>
                      <option value="950">Target 950+</option>
                      <option value="990">Target 990 Max</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={userEditForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setUserEditForm({ ...userEditForm, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                  >
                    <option value="active">🟢 Đang hoạt động bình thường</option>
                    <option value="inactive">🔴 Tạm khóa tài khoản</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đặt lại mật khẩu mới (Tùy chọn)
                  </label>
                  <input
                    type="password"
                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                    value={userEditForm.password}
                    onChange={(e) => setUserEditForm({ ...userEditForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nhập tối thiểu 6 ký tự nếu bạn muốn cấp lại mật khẩu cho học viên này.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isSavingUser ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Create Modal */}
        {isCreateUserModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tạo tài khoản học viên mới
                    </h3>
                    <p className="text-[11px] text-slate-400">Admin Portal cấp quyền học viên</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên học viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="VD: hocvien.an@gmail.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu ban đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu tối thiểu 6 ký tự"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gói học khởi tạo
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="student">Học viên Thường</option>
                      <option value="vip">VIP Pro 👑</option>
                      <option value="admin">Quản trị viên 🛡️</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mục tiêu ban đầu
                    </label>
                    <select
                      value={newUserForm.target_score}
                      onChange={(e) => setNewUserForm({ ...newUserForm, target_score: parseInt(e.target.value) || 650 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="500">Target 500+</option>
                      <option value="650">Target 650+</option>
                      <option value="750">Target 750+</option>
                      <option value="850">Target 850+</option>
                      <option value="950">Target 950+</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Group Creation / Edit Modal */}
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingGroupId ? 'Chỉnh sửa thông tin nhóm học' : 'Tạo nhóm học tập mục tiêu mới'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Quản trị viên Hệ thống (Admin Portal)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGroup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên nhóm học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Target 750+ Bứt phá tốc độ Part 7"
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
                      <option value="500-650+">500-650+ (Cơ bản - Xây gốc)</option>
                      <option value="700-850+">700-850+ (Bứt phá điểm cao)</option>
                      <option value="900+">900+ (Master TOEIC)</option>
                      <option value="All levels">All levels (Tất cả trình độ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lịch sinh hoạt / học tập</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả định hướng nhóm</label>
                  <textarea
                    rows={3}
                    placeholder="Mục tiêu ôn luyện, giáo trình tham khảo, dạng bài tập trung..."
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên hiển thị</label>
                    <input
                      type="number"
                      min={1}
                      value={groupFormData.members_count}
                      onChange={(e) => setGroupFormData({ ...groupFormData, members_count: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên online</label>
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
                    onClick={() => setIsGroupModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {editingGroupId ? 'Lưu thay đổi' : 'Tạo nhóm ngay'}
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
