import React, { useEffect, useState } from 'react';
import {
  Award,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Headphones,
  BookOpen,
  BarChart3,
  Target
} from 'lucide-react';
import { api } from '../services/api';

interface PlacementResultPageProps {
  onNavigate: (path: string) => void;
}

export const PlacementResultPage: React.FC<PlacementResultPageProps> = ({ onNavigate }) => {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      try {
        const data = await api.getLatestPlacementResult();
        setResult(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadResult();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">AI đang phân tích dữ liệu bài làm của bạn...</p>
        </div>
      </div>
    );
  }

  const estimatedScore = result?.estimated_score || 575;
  const listeningScore = result?.listening_score || 280;
  const readingScore = result?.reading_score || 295;
  const skills = result?.skills_pct || {
    listening: 42,
    reading: 76,
    grammar: 48,
    vocabulary: 62,
    speaking: 55,
    writing: 60,
  };
  const strengths = result?.strengths || ['Reading Part 5 Basic Grammar', 'Listening Part 1 Photos', 'Everyday Vocabulary'];
  const weakAreas = result?.weak_areas || ['Listening Part 3 (Conversations)', 'Word Form (Suffixes)', 'Reading Part 7 (Passages)'];
  const errorPatterns = result?.error_patterns || [];
  const partAnalysis = result?.part_analysis || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header & Congratulation */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã hoàn thành Đánh giá năng lực
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            HỒ SƠ NĂNG LỰC TIẾNG ANH (ENGLISH PROFILE)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Dưới đây là kết quả phân tích chuẩn xác từ hệ thống chẩn đoán và khuyến nghị của AI cho lộ trình cá nhân hóa của bạn.
          </p>
        </div>

        {/* Score Summary Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Estimated Total Score */}
            <div className="text-center pb-4 md:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Điểm TOEIC Dự đoán
              </span>
              <div className="text-5xl font-black text-blue-600 mt-2 tracking-tight">
                {estimatedScore}
              </div>
              <span className="text-xs font-medium text-slate-400 mt-1 block">Thang điểm chuẩn 10 - 990</span>
            </div>

            {/* Listening Breakdown */}
            <div className="text-center py-4 md:py-0">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <Headphones className="w-4 h-4 text-blue-600" />
                Listening Score
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {listeningScore} <span className="text-xs font-normal text-slate-400">/ 495</span>
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-2 inline-block">
                Độ chính xác: {skills.listening}%
              </span>
            </div>

            {/* Reading Breakdown */}
            <div className="text-center pt-4 md:pt-0">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Reading Score
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {readingScore} <span className="text-xs font-normal text-slate-400">/ 495</span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2 inline-block">
                Độ chính xác: {skills.reading}%
              </span>
            </div>
          </div>
        </div>

        {/* Skill Percentages & Strengths/Weaknesses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 6 Skill Breakdown Bars */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Phân tích độ chính xác theo kỹ năng
            </h3>

            <div className="space-y-3.5 pt-1">
              {[
                { name: 'Listening', pct: skills.listening, color: 'bg-blue-600' },
                { name: 'Reading', pct: skills.reading, color: 'bg-emerald-600' },
                { name: 'Grammar (Ngữ pháp)', pct: skills.grammar, color: 'bg-indigo-600' },
                { name: 'Vocabulary (Từ vựng)', pct: skills.vocabulary, color: 'bg-amber-500' },
                { name: 'Speaking Foundation', pct: skills.speaking, color: 'bg-slate-500' },
                { name: 'Writing Foundation', pct: skills.writing, color: 'bg-slate-400' },
              ].map((sk, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{sk.name}</span>
                    <span className="font-bold text-slate-900">{sk.pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${sk.color} rounded-full transition-all duration-500`} style={{ width: `${sk.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Weak Areas */}
          <div className="lg:col-span-6 space-y-6">
            {/* Strengths Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Điểm mạnh nổi bật (Strengths)
              </h3>
              <div className="space-y-2">
                {strengths.map((st: string, idx: number) => (
                  <div key={idx} className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                    {st}
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Areas Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Điểm yếu cần ưu tiên khắc phục (Weak Areas)
              </h3>
              <div className="space-y-2">
                {weakAreas.map((wa: string, idx: number) => (
                  <div key={idx} className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                    {wa}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Diagnostic Analysis & Error Patterns */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Chẩn đoán mô thức lỗi sai & Khuyến nghị điều chỉnh lộ trình
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {errorPatterns.map((ep: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{ep.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    ep.severity === 'Cao' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Mức độ: {ep.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{ep.description}</p>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-blue-700 font-medium">
                  💡 {ep.recommendation}
                </div>
              </div>
            ))}
          </div>

          {/* AI Conclusion Box */}
          <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Kết luận của Trợ lý AI:</strong> {result?.ai_summary || 'Hệ thống đã nhận diện được các phần điểm còn thiếu và đã thiết lập lộ trình thích ứng riêng cho bạn.'}
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/placement-test')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Làm lại bài đánh giá
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/learning-path')}
              className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Khám phá Lộ trình dành riêng cho bạn
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
