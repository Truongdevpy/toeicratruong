const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('toeic_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('toeic_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('toeic_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi yêu cầu: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { email: string; password: string; full_name: string }) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) =>
    request<any>('/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Onboarding
  submitOnboarding: (data: {
    study_purpose: string;
    target_score: number;
    daily_minutes: number;
    focus_skills: string[];
  }) =>
    request<any>('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Placement Test
  getPlacementQuestions: (testType = 'full') =>
    request<{ test_type: string; total_questions: number; duration_minutes: number; questions: any[] }>(
      `/placement-test/questions?test_type=${testType}`
    ),
  submitPlacementTest: (data: { test_type: string; answers: Record<string, string>; time_spent_seconds?: number }) =>
    request<any>('/placement-test/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLatestPlacementResult: () => request<any>('/placement-test/latest'),

  // Learning Path
  getLearningPath: () => request<any>('/learning-path'),
  updateLearningNode: (nodeId: number, data: { status?: string; progress_pct?: number; completed_lessons?: number }) =>
    request<any>(`/learning-path/node/${nodeId}/update`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  recalculateLearningPath: () =>
    request<any>('/learning-path/recalculate', {
      method: 'POST',
    }),

  // Dashboard
  getDashboardOverview: () => request<any>('/dashboard/overview'),

  // Tests & Mock Tests (168 authentic tests)
  getTests: (params: { site?: string; test_type?: string; collection_id?: string; difficulty?: string; part?: number; search?: string; sort?: string; limit?: number; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.site) query.set('site', params.site);
    if (params.test_type) query.set('test_type', params.test_type);
    if (params.collection_id) query.set('collection_id', params.collection_id);
    if (params.difficulty) query.set('difficulty', params.difficulty);
    if (params.part !== undefined) query.set('part', String(params.part));
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.page) query.set('page', String(params.page));
    return request<any>(`/tests?${query.toString()}`);
  },
  getTestDetail: (testId: string) => request<any>(`/tests/${testId}`),
  submitTest: (testId: string, data: { user_answers: Record<string, string>; time_spent_seconds?: number; mode?: string; target_part?: number; question_ids?: string[] }) =>
    request<any>(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMockTests: (params = {}) => api.getTests(params),
  getMockTestDetail: (testId: string) => api.getTestDetail(testId),
  submitMockTest: (testId: string, data: any) =>
    request<any>(`/mock-tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Practice by Part (Parts 1 to 7)
  getPracticeByPart: (part: number, params: { level?: string; category?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.level) query.set('level', params.level);
    if (params.category) query.set('category', params.category);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<any>(`/practice/part/${part}?${query.toString()}`);
  },
  getListeningPractice: (part = 1, difficulty = 'all') =>
    api.getPracticeByPart(part, { level: difficulty !== 'all' ? difficulty : undefined }),
  getReadingPractice: (part = 5, difficulty = 'all') =>
    api.getPracticeByPart(part, { level: difficulty !== 'all' ? difficulty : undefined }),
  submitPracticeAnswer: (data: { question_id: string; selected_option: string; time_spent_sec?: number }) =>
    request<any>('/practice/submit-answer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dictation
  getDictationSets: (params: { part?: string; collection?: string; limit?: number; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.part) query.set('part', params.part);
    if (params.collection) query.set('collection', params.collection);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.page) query.set('page', String(params.page));
    return request<any>(`/dictation/sets?${query.toString()}`);
  },
  getDictationSetItems: (setId: string) => request<any>(`/dictation/sets/${setId}`),
  getDictationChallenges: (params: { part?: number; difficulty?: string; limit?: number; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.part) query.set('part', String(params.part));
    if (params.difficulty) query.set('difficulty', params.difficulty);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.page) query.set('page', String(params.page));
    return request<any>(`/dictation/challenges?${query.toString()}`);
  },
  checkDictation: (data: { challenge_id?: string; question_id?: string; user_text: string; target_text?: string; mode?: string }) =>
    request<any>('/dictation/check', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Flashcards
  getFlashcards: (filterType = 'all', topic = 'all') => {
    const params = new URLSearchParams();
    if (filterType) params.set('filter_type', filterType);
    if (topic && topic !== 'all') params.set('topic', topic);
    return request<any>(`/practice/flashcards?${params.toString()}`);
  },
  reviewFlashcard: (data: { word_id?: string; word?: string; rating: string; [key: string]: any }) =>
    request<any>('/practice/flashcards/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addToFlashcards: (data: { word: string; meaning?: string; ipa?: string; part_of_speech?: string; example?: string; audio_url?: string; source_context?: string }) =>
    request<any>('/practice/flashcards/add', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeFromFlashcards: (data: { word?: string; card_id?: number }) =>
    request<any>('/practice/flashcards/remove', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Vocabulary (5,165 words bank)
  getVocabulary: (params: { search?: string; part?: string; category?: string; level?: string; limit?: number; page?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.part) query.set('part', params.part);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.level && params.level !== 'all') query.set('level', params.level);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.page !== undefined) query.set('page', String(params.page));
    else if (params.offset !== undefined && params.limit) query.set('page', String(Math.floor(params.offset / params.limit) + 1));
    return request<any>(`/vocabulary?${query.toString()}`);
  },

  // Grammar (38 topics, 174 subtopics)
  getGrammarTopics: () => request<any>('/grammar'),
  getGrammarTopicDetail: (topicId: string) => request<any>(`/grammar/${topicId}`),

  // Speaking & Writing Tests
  getSWTests: (params: { test_type?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.test_type) query.set('test_type', params.test_type);
    return request<any>(`/sw/tests?${query.toString()}`);
  },
  getSWTestDetail: (testId: string) => request<any>(`/sw/tests/${testId}`),

  // Shadowing Speaking Video Lessons
  getShadowingLessons: (params: {
    category?: string;
    accent?: string;
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.accent) query.set('accent', params.accent);
    if (params.level) query.set('level', params.level);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<any>(`/sw/shadowing-lessons?${query.toString()}`);
  },
  getShadowingLessonDetail: (lessonId: string) =>
    request<any>(`/sw/shadowing-lessons/${lessonId}`),
  evaluateShadowing: (data: {
    target_text: string;
    user_speech: string;
    lesson_id?: string;
    sentence_index?: number;
  }) =>
    request<any>('/sw/shadowing-evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  gradeSWQuestion: (data: {
    test_type: 'speaking' | 'writing';
    question_number: number;
    prompt?: string;
    context?: string;
    user_answer: string;
    audio_url?: string;
  }) =>
    request<any>('/sw/grade-question', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  gradeSWTest: (data: {
    test_type: 'speaking' | 'writing';
    test_name: string;
    answers: Array<{
      question_number: number;
      prompt?: string;
      context?: string;
      user_answer: string;
    }>;
  }) =>
    request<any>('/sw/grade-test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Tutor
  chatWithTutor: (data: { message: string; action?: string; conversation_id?: number }) =>
    request<any>('/ai-tutor/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTutorConversations: () => request<any>('/ai-tutor/conversations'),
  getTutorMessages: (convId: number) => request<any>(`/ai-tutor/conversations/${convId}/messages`),
  createTutorConversation: (title?: string) =>
    request<any>('/ai-tutor/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  deleteTutorConversation: (convId: number) =>
    request<any>(`/ai-tutor/conversations/${convId}`, {
      method: 'DELETE',
    }),
  getTutorMemory: () => request<any>('/ai-tutor/memory'),
  updateTutorMemory: (data: { target_score?: number; weak_areas?: string[] | string; ai_memory_notes?: string }) =>
    request<any>('/ai-tutor/memory', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  resetTutorMemory: () => request<any>('/ai-tutor/memory/reset', { method: 'DELETE' }),

  // Study Groups (Group A)
  getStudyGroups: () => request<{ total: number; groups: any[] }>('/community/groups'),
  joinStudyGroup: (groupId: number) => request<any>(`/community/groups/${groupId}/join`, { method: 'POST' }),
  leaveStudyGroup: (groupId: number) => request<any>(`/community/groups/${groupId}/leave`, { method: 'POST' }),
  getAdminStudyGroups: () => request<{ total: number; groups: any[] }>('/admin/groups'),
  createAdminStudyGroup: (data: any) =>
    request<any>('/admin/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminStudyGroup: (groupId: number, data: any) =>
    request<any>(`/admin/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminStudyGroup: (groupId: number) =>
    request<any>(`/admin/groups/${groupId}`, {
      method: 'DELETE',
    }),

  // Admin Mock Tests & Questions Management (Thêm / Xóa / Sửa / Tìm kiếm Đề thi & Câu hỏi)
  adminGetTests: (params: { search?: string; test_type?: string; collection_id?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.test_type && params.test_type !== 'all') query.set('test_type', params.test_type);
    if (params.collection_id && params.collection_id !== 'all') query.set('collection_id', params.collection_id);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ total: number; page: number; limit: number; tests: any[] }>(`/admin/tests?${query.toString()}`);
  },
  adminCreateTest: (data: any) =>
    request<any>('/admin/tests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminUpdateTest: (testId: string, data: any) =>
    request<any>(`/admin/tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminDeleteTest: (testId: string) =>
    request<any>(`/admin/tests/${testId}`, {
      method: 'DELETE',
    }),
  adminGetTestQuestions: (testId: string, params: { part?: number; search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.part !== undefined && params.part !== null) query.set('part', params.part.toString());
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ test_meta: any; total_questions: number; filtered_total: number; page: number; limit: number; questions: any[] }>(`/admin/tests/${testId}/questions?${query.toString()}`);
  },
  adminAddTestQuestion: (testId: string, data: any) =>
    request<any>(`/admin/tests/${testId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminUpdateTestQuestion: (testId: string, qIdx: string, data: any) =>
    request<any>(`/admin/tests/${testId}/questions/${qIdx}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminDeleteTestQuestion: (testId: string, qIdx: string) =>
    request<any>(`/admin/tests/${testId}/questions/${qIdx}`, {
      method: 'DELETE',
    }),

  // Study Time Breakdown (Group A)
  getStudyTimeBreakdown: (period: 'all' | 'day' | 'week' | 'month' = 'all') =>
    request<any>(`/statistics/study-time?period=${period}`),

  // Public User Profile (Group C)
  getPublicProfile: (userId: number, isUserId: boolean = true) => request<any>(`/leaderboard/user/${userId}/profile?is_user_id=${isUserId}`),

  // Google OAuth (Group E)
  googleAuth: (payloadOrCredential: string | { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => {
    const payload = typeof payloadOrCredential === 'string'
      ? { credential: payloadOrCredential }
      : payloadOrCredential;
    return request<any>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Vocabulary Spaced Repetition (Group D)
  getVocabularyReviewDue: () => request<any>('/vocabulary/review-due'),
  submitVocabularyReview: (data: { word_id: string; grade: number }) =>
    request<any>('/vocabulary/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLearnedVocabulary: () => request<any>('/vocabulary/learned'),

  // Statistics
  getStatisticsSummary: () => request<any>('/statistics/summary'),
  getWeeklyReport: () => request<any>('/statistics/weekly-report'),

  // Community
  getCommunityPosts: () => request<any>('/community/posts'),
  createCommunityPost: (data: { title: string; content: string; category?: string }) =>
    request<any>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addPostComment: (postId: number, data: { content: string }) =>
    request<any>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  likePost: (postId: number) =>
    request<any>(`/community/posts/${postId}/like`, {
      method: 'POST',
    }),

  // Achievements & Notifications
  getAchievements: () => request<any>('/achievements'),
  getNotifications: () => request<any>('/notifications'),
  markAllNotificationsRead: () =>
    request<any>('/notifications/mark-all-read', {
      method: 'POST',
    }),

  // Admin
  getAdminMetrics: () => request<any>('/admin/metrics'),
  getAdminRevenue: () => request<any>('/admin/revenue'),
  getAdminUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) query.set('search', params.search.trim());
    const qs = query.toString();
    return request<any>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  updateUserRole: (userId: number, role: string) =>
    request<any>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  loginDemo: (role: 'student' | 'vip' | 'admin' = 'student') =>
    request<any>('/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  toggleUserVip: (userId: number) =>
    request<any>(`/admin/users/${userId}/toggle-vip`, {
      method: 'POST',
    }),
  updateAdminUser: (userId: number, data: any) =>
    request<any>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  createAdminUser: (data: any) =>
    request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleUserStatus: (userId: number, is_active: boolean) =>
    request<any>(`/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ is_active }),
    }),
  getAIReviewQueue: (status = 'all') => request<any>(`/admin/ai-review-queue?status=${status}`),
  updateAIQuestionStatus: (itemId: number, action: 'approve' | 'reject') =>
    request<any>(`/admin/ai-review-queue/${itemId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  generateAIQuestion: (data: { skill?: string; topic?: string; difficulty?: string }) =>
    request<any>('/admin/generate-ai-question', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Leaderboard (Bảng Xếp Hạng)
  getLeaderboard: (params: { category?: string; period?: string; league?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.period) query.set('period', params.period);
    if (params.league && params.league !== 'all') query.set('league', params.league);
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    return request<any>(`/leaderboard?${query.toString()}`);
  },
  cheerLeaderboardUser: (profileId: number) =>
    request<any>(`/leaderboard/cheer/${profileId}`, {
      method: 'POST',
    }),
  getLeaderboardRules: () => request<any>('/leaderboard/rules'),

  // Translate & Dictionary Lookup (Phase 6)
  translateLookup: (data: { text: string; sentence?: string; source_lang?: string; target_lang?: string }) =>
    request<any>('/translate/lookup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Learning & Practice History (Lịch sử làm đề, làm câu hỏi & đánh dấu câu đã làm đúng)
  getTestHistory: (params: { limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return request<any>(`/history/tests?${query.toString()}`);
  },
  getTestAttemptDetail: (attemptId: number | string) => request<any>(`/history/tests/${attemptId}`),
  deleteTestAttempt: (attemptId: number | string) =>
    request<any>(`/history/tests/${attemptId}`, {
      method: 'DELETE',
    }),
  getQuestionHistory: (params: { part?: number; is_correct?: boolean; limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.part !== undefined) query.set('part', String(params.part));
    if (params.is_correct !== undefined) query.set('is_correct', String(params.is_correct));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return request<any>(`/history/questions?${query.toString()}`);
  },
  recordQuestionAttempt: (data: {
    question_id: string;
    test_id?: string;
    question_number?: number;
    part?: number;
    section?: string;
    topic?: string;
    question_text?: string;
    selected_option?: string;
    correct_option?: string;
    is_correct: boolean;
    time_spent_sec?: number;
  }) =>
    request<any>('/history/record-question', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // Gemini AI Admin Management & Key Pool
  getAdminGeminiKeys: () => request<any>('/admin/gemini-keys'),
  updateAdminGeminiKeys: (keys: string) =>
    request<any>('/admin/gemini-keys', {
      method: 'POST',
      body: JSON.stringify({ keys }),
    }),
  testAdminGeminiKeys: (key?: string) =>
    request<any>('/admin/gemini-keys/test', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),
  deleteAdminGeminiKey: (key: string) =>
    request<any>('/admin/gemini-keys', {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    }),
  updateAdminGeminiModels: (models: string[]) =>
    request<any>('/admin/gemini-models', {
      method: 'POST',
      body: JSON.stringify({ models }),
    }),

  // AI Practice Grading & Diagnostic (Gemini DeepTutor)
  aiGradePractice: (data: {
    skill: string;
    part: number;
    title: string;
    answers: Array<{
      question_number: number;
      question_text?: string;
      selected_option?: string;
      correct_option?: string;
      is_correct: boolean;
      explanation?: string;
    }>;
  }) =>
    request<any>('/practice/ai-grade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCorrectQuestions: () => request<any>('/history/correct-questions'),
  getHistorySummary: () => request<any>('/history/summary'),

  // Payments & VIP Subscription
  getVipPlans: () => request<{ status: string; plans: any[] }>('/payments/plans'),
  getPublicBankInfo: () => request<any>('/payments/bank-info'),
  createVipOrder: (planId: string) =>
    request<any>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),
  getOrderDetails: (orderId: number) => request<any>(`/payments/order/${orderId}`),
  checkTransactionStatus: (transactionCode: string) =>
    request<any>(`/payments/status/${encodeURIComponent(transactionCode)}`),
  checkOrderNow: (orderId: number) =>
    request<any>(`/payments/check-now/${orderId}`, {
      method: 'POST',
    }),
  getUserPaymentHistory: () => request<{ status: string; payments: any[] }>('/payments/history'),

  // Admin Banking & Payments
  getAdminBankingConfig: () => request<any>('/admin/banking/config'),
  updateAdminBankingConfig: (data: any) =>
    request<any>('/admin/banking/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  testAdminBankingFetch: (payload?: any) =>
    request<any>('/admin/banking/test-fetch', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  syncAdminBanking: () =>
    request<any>('/admin/banking/sync', {
      method: 'POST',
    }),
  getAdminBankingTransactions: (limit: number = 50) =>
    request<{ status: string; total: number; transactions: any[] }>(`/admin/banking/transactions?limit=${limit}`),
  getAdminBankingStats: () => request<any>('/admin/banking/stats'),
  adminApprovePayment: (paymentId: number) =>
    request<any>(`/admin/payments/${paymentId}/approve`, {
      method: 'POST',
    }),
  // Admin Question Pool CRUD (Kho câu hỏi tổng)
  getAdminQuestionStats: () => request<any>('/admin/questions/stats'),
  getAdminPoolQuestions: (params: { part?: number; search?: string; topic?: string; difficulty?: number; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.part !== undefined && params.part !== null) query.set('part', params.part.toString());
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.topic && params.topic.trim()) query.set('topic', params.topic.trim());
    if (params.difficulty !== undefined) query.set('difficulty', params.difficulty.toString());
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return request<{ total: number; page: number; limit: number; questions: any[] }>(`/admin/questions/pool?${query.toString()}`);
  },
  createAdminPoolQuestion: (data: any) =>
    request<any>('/admin/questions/pool', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminPoolQuestion: (questionId: string, data: any) =>
    request<any>(`/admin/questions/pool/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdminPoolQuestion: (questionId: string) =>
    request<any>(`/admin/questions/pool/${questionId}`, {
      method: 'DELETE',
    }),

};
