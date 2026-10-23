import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FASTAPI_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Play, CheckCircle, AlertCircle, RefreshCw,
  Mic, Clock, BarChart3, ChevronDown, ChevronUp, Loader2, ExternalLink
} from 'lucide-react';



interface QuestionScore {
  question_index: number;
  score: number;
  feedback?: string;
}

interface AutoInterviewResult {
  interview_id: string;
  candidate_name: string;
  total_questions: number;
  questions_asked: number;
  questions_answered: number;
  followups_generated: number;
  average_score: number;
  scores: number[];
  started_at: string;
  completed_at: string;
  status: string;
}

interface AutoInterviewProps {
  resumeFile?: File | null;
  resumeText?: string;
  analysis?: any;
}

const INTERVIEW_STEPS = [
  { id: 1, label: 'Profile Setup', desc: 'Initialize candidate benchmark' },
  { id: 2, label: 'Generate Questions', desc: 'AI generates tailored questions' },
  { id: 3, label: 'AI Evaluation', desc: 'Auto benchmark Q&A with scoring' },
  { id: 4, label: 'Screening Report', desc: 'Scores & feedback' },
];

const AutoInterview: React.FC<AutoInterviewProps> = ({ resumeFile, resumeText, analysis }) => {
  const [step, setStep] = useState(0); // 0=form, 1=scheduling, 2=questions, 3=conducting, 4=done
  const [error, setError] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [result, setResult] = useState<AutoInterviewResult | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [interviewType, setInterviewType] = useState('technical');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const activeFile = resumeFile || localFile;

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runAutoInterview = async () => {
    if (!jobTitle.trim() || !candidateName.trim()) {
      setError('Job Title aur Candidate Name required hai.');
      return;
    }
    setError(null);
    setStep(1);
    setStatusMsg('Setting up candidate screening profile...');

    try {
      // Step 1: Initialize screening profile in DB (send_email: false)
      const schedulePayload = {
        candidate_name: candidateName,
        candidate_email: candidateEmail.trim() || 'screening@internal.local',
        job_title: jobTitle,
        job_id: 'auto_job_001',
        hr_email: hrEmail.trim() || 'hr@company.com',
        hr_id: 'hr_001',
        scheduled_datetime: new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: 45,
        interview_type: interviewType,
        auto_start_bot: false,
        send_email: false, // Internal Pre-screening mode: no email will be sent
        notes: jobDesc,
      };

      const schedRes = await fetch(FASTAPI_ENDPOINTS.scheduleInterview, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulePayload),
      });
      const schedData = await schedRes.json();

      if (!schedData.success || !schedData.data?.interview_id) {
        throw new Error(schedData.errors?.[0]?.message || 'Interview schedule failed');
      }

      const iId = schedData.data.interview_id;
      setInterviewId(iId);
      setStep(2);
      setStatusMsg('Generating AI questions from job description...');
      await sleep(1000);

      // Step 2: Generate Questions
      const genPayload = {
        candidate_id: 'candidate_001',
        job_id: 'auto_job_001',
        interview_id: iId,
        resume_data: { text: resumeText || '', analysis: analysis || {} },
        job_description: { title: jobTitle, description: jobDesc, type: interviewType },
        threshold_percentage: 70.0,
        technical_count: 4,
        behavioral_count: 3,
        scenario_count: 2,
      };

      await fetch(FASTAPI_ENDPOINTS.generateQuestions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genPayload),
      });

      setStep(3);
      setStatusMsg('Conducting automated interview... (This may take 2-3 minutes)');

      // Step 3: Auto-conduct
      const conductRes = await fetch(FASTAPI_ENDPOINTS.autoConductInterview(iId), {
        method: 'POST',
      });
      const conductData = await conductRes.json();

      if (!conductData.success) {
        throw new Error(conductData.error?.message || 'Interview conduct failed');
      }

      setResult(conductData.data);
      setStep(4);
      setStatusMsg('Interview complete!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error. Is FastAPI running on port 8001?');
      setStep(0);
    }
  };

  const ScoreBar = ({ score, max = 10 }: { score: number; max?: number }) => {
    const pct = (score / max) * 100;
    const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-700 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-bold text-white w-12 text-right">{score.toFixed(1)}/{max}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Stepper */}
      {step > 0 && step < 4 && (
        <div className="flex items-center gap-2 mb-4">
          {INTERVIEW_STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i < step ? 'bg-green-500/20 text-green-400' : i === step - 1 ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' : 'bg-slate-700 text-slate-500'}`}>
                {i < step ? <CheckCircle size={12} /> : <Loader2 size={12} className={i === step - 1 ? 'animate-spin' : ''} />}
                {s.label}
              </div>
              {i < INTERVIEW_STEPS.length - 1 && <div className={`flex-1 h-px ${i < step - 1 ? 'bg-green-500' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* FORM — Step 0 */}
        {step === 0 && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <Brain className="text-cyan-400" size={20} />
                    AI Candidate Pre-Screening & Benchmark
                  </CardTitle>
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Internal HR Screening
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Candidate ke resume aur job profile ko evaluate karke benchmark score calculate karta hai (No email sent to candidate).
                </p>
                <div className="mt-2 p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
                  <span>🎙️ Real candidate ka voice interview schedule karna hai?</span>
                  <a
                    href="/interactive-interview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-cyan-200 hover:text-white inline-flex items-center gap-1"
                  >
                    Live Voice Room <ExternalLink size={11} />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Candidate Name *</label>
                    <Input placeholder="Ali Hassan" className="bg-slate-700 border-slate-600 text-white"
                      value={candidateName} onChange={e => setCandidateName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Candidate Email (Optional)</label>
                    <Input type="email" placeholder="candidate@email.com (Optional)" className="bg-slate-700 border-slate-600 text-white"
                      autoComplete="off"
                      value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} />
                    <p className="text-[11px] text-slate-400 mt-1">Internal reference only • No email will be sent to candidate.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Job Title *</label>
                    <Input placeholder="Backend Engineer" className="bg-slate-700 border-slate-600 text-white"
                      value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Interview Type</label>
                    <Select value={interviewType} onValueChange={setInterviewType}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">🖥️ Technical</SelectItem>
                        <SelectItem value="behavioral">🧠 Behavioral</SelectItem>
                        <SelectItem value="ai_assisted">🤖 AI Assisted (Full)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Job Description</label>
                  <Textarea placeholder="Describe the role requirements, responsibilities, and required skills..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                    value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">HR / Recruiter Email</label>
                  <Input type="email" placeholder="hr@company.com" className="bg-slate-700 border-slate-600 text-white"
                    autoComplete="off"
                    value={hrEmail} onChange={e => setHrEmail(e.target.value)} />
                  <p className="text-[11px] text-slate-400 mt-1">Optional. Recruiter will receive a confirmation notification.</p>
                </div>

                {!resumeFile && (
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Resume PDF (if not uploaded above)</label>
                    <Input type="file" accept=".pdf" className="bg-slate-700 border-slate-600 text-white"
                      onChange={e => setLocalFile(e.target.files?.[0] || null)} />
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p>{error}</p>
                      <p className="text-xs text-red-300 mt-1">Make sure FastAPI is running: <code>uvicorn main:app --port 8001</code></p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={runAutoInterview}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-semibold py-2.5"
                >
                  <Play size={16} className="mr-2" />
                  ⚡ Run AI Candidate Pre-Screening
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* LOADING — Steps 1-3 */}
        {step > 0 && step < 4 && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 text-center space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  <div className="absolute inset-3 rounded-full border-4 border-blue-500/20 border-b-blue-500 animate-spin" style={{ animationDirection: 'reverse' }} />
                  <Brain className="absolute inset-0 m-auto text-white" size={28} />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{statusMsg}</p>
                  <p className="text-slate-400 text-sm mt-1">Please wait, AI is working...</p>
                </div>
                {interviewId && (
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded-lg px-4 py-2 inline-block">
                      <p className="text-slate-400 text-xs">Interview ID</p>
                      <code className="text-cyan-400 text-sm">{interviewId}</code>
                    </div>
                    <div>
                      <a
                        href={`/interactive-interview?id=${interviewId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                      >
                        <Mic size={14} /> Join Live Voice Interview Room Instead <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RESULTS — Step 4 */}
        {step === 4 && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Interview Complete! 🎉</h3>
                    <p className="text-slate-400 text-sm">{result.candidate_name} — {jobTitle}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${result.average_score >= 7 ? 'text-green-400' : result.average_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {result.average_score.toFixed(1)}
                    </div>
                    <p className="text-slate-400 text-sm">avg score / 10</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Total Questions', value: result.total_questions, icon: '📋' },
                    { label: 'Asked', value: result.questions_asked, icon: '❓' },
                    { label: 'Answered', value: result.questions_answered, icon: '✅' },
                    { label: 'Follow-ups', value: result.followups_generated, icon: '🔄' },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-700/50 rounded-xl p-3 text-center">
                      <div className="text-2xl mb-1">{m.icon}</div>
                      <div className="text-xl font-bold text-white">{m.value}</div>
                      <div className="text-xs text-slate-400">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Overall score bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Overall Performance</span>
                    <span className={`font-semibold ${result.average_score >= 7 ? 'text-green-400' : result.average_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {result.average_score >= 7 ? 'Excellent' : result.average_score >= 5 ? 'Average' : 'Needs Improvement'}
                    </span>
                  </div>
                  <Progress value={(result.average_score / 10) * 100} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Per-Question Scores */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-cyan-400" />
                  Per-Question Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.scores.map((score, idx) => (
                  <div key={idx} className="bg-slate-700/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300 font-medium">Question {idx + 1}</span>
                      <Badge className={score >= 7 ? 'bg-green-500/20 text-green-400' : score >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>
                        {score >= 7 ? 'Strong' : score >= 5 ? 'Moderate' : 'Weak'}
                      </Badge>
                    </div>
                    <ScoreBar score={score} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Verdict */}
            <Card className={`border ${result.average_score >= 7 ? 'bg-green-500/10 border-green-500/30' : result.average_score >= 5 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {result.average_score >= 7
                  ? <CheckCircle className="text-green-400 shrink-0" size={24} />
                  : <AlertCircle className={`shrink-0 ${result.average_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`} size={24} />}
                <div>
                  <p className="font-semibold text-white">
                    {result.average_score >= 7 ? '✅ Recommended for Next Round'
                      : result.average_score >= 5 ? '⚠️ Consider with Reservation'
                      : '❌ Not Recommended'}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Based on {result.questions_answered} answered questions with average score {result.average_score.toFixed(1)}/10
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <a
                href={`/interactive-interview?id=${result.interview_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 shadow-lg">
                  <Mic size={16} className="mr-2" /> Take Live Voice Interview (Give Answers with Mic) <ExternalLink size={14} className="ml-1.5" />
                </Button>
              </a>

              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => { setStep(0); setResult(null); setInterviewId(null); setError(null); }}
              >
                <RefreshCw size={16} className="mr-2" /> New Interview
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutoInterview;
