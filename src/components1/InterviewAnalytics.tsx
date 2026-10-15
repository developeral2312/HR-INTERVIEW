import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FASTAPI_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, RefreshCw, AlertCircle, CheckCircle,
  Clock, Mic, Brain, FileText, TrendingUp
} from 'lucide-react';

interface AnalyticsReport {
  session_id?: string;
  interview_id?: string;
  candidate_name?: string;
  job_title?: string;
  total_questions?: number;
  questions_asked?: number;
  questions_answered?: number;
  followups_generated?: number;
  average_score?: number;
  scores?: number[];
  started_at?: string;
  completed_at?: string;
  status?: string;
  turns?: { total?: number; successful?: number };
  latency?: {
    stt?: { avg?: number; min?: number; max?: number };
    llm?: { avg?: number; min?: number; max?: number };
    tts?: { avg?: number; min?: number; max?: number };
  };
  quality?: { avg_score?: number };
  transcript?: string;
}

interface InterviewAnalyticsProps {
  interviewId?: string;
}

const InterviewAnalytics: React.FC<InterviewAnalyticsProps> = ({ interviewId: propId }) => {
  const [inputId, setInputId] = useState(propId || '');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    const id = inputId.trim();
    if (!id) { setError('Interview ID ya Session ID enter karo.'); return; }
    setLoading(true);
    setError(null);
    setReport(null);

    const urls = [
      FASTAPI_ENDPOINTS.getAnalyticsReport(id),
      FASTAPI_ENDPOINTS.getInterview(id),
    ];

    let found = false;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const payload = data.data || data;
        if (payload && (payload.average_score !== undefined || payload.status !== undefined)) {
          setReport(payload);
          found = true;
          break;
        }
      } catch {}
    }

    if (!found) {
      setError('No analytics found. Make sure the interview was conducted and ID is correct.');
    }
    setLoading(false);
  };

  const ScoreBar = ({ score, max = 10, label }: { score: number; max?: number; label?: string }) => {
    const pct = (score / max) * 100;
    const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="space-y-1">
        {label && <div className="flex justify-between text-xs text-slate-400"><span>{label}</span><span>{score.toFixed(1)}/{max}</span></div>}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
          {!label && <span className="text-sm font-bold text-white w-12 text-right">{score.toFixed(1)}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <BarChart3 className="text-cyan-400" size={20} />
            Interview Analytics
          </CardTitle>
          <p className="text-slate-400 text-sm">Interview ID ya Session ID se report fetch karo</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="e.g. interview_abc123 or session_xyz"
              className="bg-slate-700 border-slate-600 text-white flex-1"
              value={inputId}
              onChange={e => setInputId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAnalytics()}
            />
            <Button
              onClick={fetchAnalytics}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Fetch Report'}
            </Button>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm mt-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {report.candidate_name || 'Candidate'}'s Interview Report
                  </h3>
                  <p className="text-slate-400 text-sm mt-0.5">{report.job_title || 'Position'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={
                      report.status === 'completed' ? 'bg-green-500/20 text-green-400'
                        : report.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-500/20 text-slate-400'
                    }>
                      {report.status || 'Unknown'}
                    </Badge>
                    {report.interview_id && (
                      <span className="text-xs text-slate-500">ID: {report.interview_id}</span>
                    )}
                  </div>
                </div>
                {report.average_score !== undefined && (
                  <div className="text-right">
                    <div className={`text-5xl font-bold ${report.average_score >= 7 ? 'text-green-400' : report.average_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {report.average_score.toFixed(1)}
                    </div>
                    <p className="text-slate-400 text-xs">avg / 10</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {(report.total_questions || report.questions_asked) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Questions', value: report.total_questions ?? '—', icon: <FileText size={18} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                { label: 'Questions Asked', value: report.questions_asked ?? '—', icon: <Mic size={18} className="text-purple-400" />, bg: 'bg-purple-500/10' },
                { label: 'Answered', value: report.questions_answered ?? '—', icon: <CheckCircle size={18} className="text-green-400" />, bg: 'bg-green-500/10' },
                { label: 'Follow-ups', value: report.followups_generated ?? '—', icon: <RefreshCw size={18} className="text-orange-400" />, bg: 'bg-orange-500/10' },
              ].map(m => (
                <Card key={m.label} className={`${m.bg} border-slate-700`}>
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-2">{m.icon}</div>
                    <div className="text-2xl font-bold text-white">{m.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {report.scores && report.scores.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-cyan-400" />
                  Per-Question Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.scores.map((score, idx) => (
                  <div key={idx} className="bg-slate-700/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Question {idx + 1}</span>
                      <span className={`text-sm font-bold ${score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {score.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.latency && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Clock size={18} className="text-yellow-400" />
                  AI Pipeline Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: '🎤 STT', data: report.latency.stt },
                    { label: '🧠 LLM', data: report.latency.llm },
                    { label: '🔊 TTS', data: report.latency.tts },
                  ].map(({ label, data }) => data && (
                    <div key={label} className="bg-slate-700/40 rounded-lg p-3 text-center">
                      <p className="text-sm font-medium text-slate-300 mb-2">{label}</p>
                      <p className="text-lg font-bold text-white">{data.avg?.toFixed(0) ?? '—'}ms</p>
                      <p className="text-xs text-slate-500">avg</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.average_score !== undefined && (
            <Card className={`border ${report.average_score >= 7 ? 'bg-green-500/10 border-green-500/30' : report.average_score >= 5 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {report.average_score >= 7
                  ? <CheckCircle className="text-green-400 shrink-0" size={24} />
                  : <AlertCircle className={`shrink-0 ${report.average_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`} size={24} />}
                <div>
                  <p className="font-semibold text-white">
                    {report.average_score >= 7 ? '✅ Strongly Recommended'
                      : report.average_score >= 5 ? '⚠️ Consider with Conditions'
                        : '❌ Not Recommended'}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Average Score: {report.average_score.toFixed(1)}/10
                    {report.started_at && ` • ${new Date(report.started_at).toLocaleDateString()}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {report.transcript && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">📝 Interview Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {report.transcript}
                </pre>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default InterviewAnalytics;
