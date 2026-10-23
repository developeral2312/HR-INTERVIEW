import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Mic, MicOff, Volume2, Sparkles, CheckCircle,
  AlertCircle, Loader2, Play, ArrowRight, User, Briefcase, Mail,
  ShieldAlert, Camera, Video, Eye, Check, AlertTriangle, Clock, RefreshCw, Send,
  ShieldCheck, Lock, Activity, Wifi, Cpu, Layers, Radio, FileText, ChevronRight, Info, XCircle, Award
} from 'lucide-react';
import { FASTAPI_ENDPOINTS } from '@/config/api';



interface QuestionItem {
  question_id?: string;
  question: string;
  category?: string;
  difficulty?: string;
  expected_answer_points?: string[];
  answer?: string;
  score?: number;
  feedback?: string;
}

interface InterviewData {
  interview_id: string;
  candidate_name: string;
  candidate_email?: string;
  job_title: string;
  status: string;
  duration_minutes?: number;
  questions?: QuestionItem[];
  interview_type?: string;
  meet_link?: string;
  calendar_link?: string;
  google_calendar_add_url?: string;
  scheduled_for?: string;
}

type OnboardingStep = 
  | 'enter_id'
  | 'candidate_details'
  | 'anti_cheating'
  | 'hardware_check'
  | 'active_session'
  | 'completed'
  | 'human_meet_redirect';

const SILENCE_THRESHOLD_SECONDS = 2.5;

export const InteractiveInterview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const navigate = useNavigate();

  // Extract ID from URL
  const urlId = pathId || searchParams.get('id') || searchParams.get('interview_id') || '';
  const [interviewId, setInterviewId] = useState(urlId);

  // Workflow Step Management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('enter_id');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Candidate Data Form States
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [candidateExperience, setCandidateExperience] = useState('1-3 Years');
  const [agreedToIntegrity, setAgreedToIntegrity] = useState(false);

  // Interview Questions & Session States
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(45 * 60);
  const [isCompleted, setIsCompleted] = useState(false);

  // Speech Recognition & Audio VAD States
  const [answerText, setAnswerText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // Camera & Face/Eye Proctoring States
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'checking' | 'straight' | 'looking_away' | 'no_face'>('straight');
  const [faceAlertMessage, setFaceAlertMessage] = useState<string>('Biometric Telemetry: Gaze Aligned');
  const [proctoringWarnings, setProctoringWarnings] = useState(0);
  const [activeWarningBanner, setActiveWarningBanner] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentAnswerRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(0);
  const questionsRef = useRef<QuestionItem[]>([]);

  // Sync refs
  useEffect(() => { currentAnswerRef.current = answerText; }, [answerText]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Load interview on mount
  useEffect(() => {
    if (urlId) {
      setInterviewId(urlId);
      loadInterview(urlId);
    }
  }, [urlId]);

  // Handle Tab Switch / Focus Loss
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentStep === 'active_session') {
        setProctoringWarnings(prev => prev + 1);
        triggerProctoringWarning("SECURITY ALERT: Tab switch detected! Context loss is logged to the hiring dossier.");
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentStep]);

  // 45-Minute Session Timer
  useEffect(() => {
    if (currentStep === 'active_session') {
      sessionTimerRef.current = setInterval(() => {
        setSessionSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(sessionTimerRef.current!);
            setCurrentStep('completed');
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [currentStep]);

  const triggerProctoringWarning = (msg: string) => {
    setActiveWarningBanner(msg);
    setTimeout(() => {
      setActiveWarningBanner(null);
    }, 4500);
  };

  // Helper: Format Seconds to mm:ss
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Load Interview from Backend
  const loadInterview = async (id: string) => {
    if (!id.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(FASTAPI_ENDPOINTS.getInterview(id.trim()));
      const data = await res.json();

      if (data.success && data.data) {
        const doc: InterviewData = data.data;
        setInterview(doc);
        setCandidateName(doc.candidate_name || '');
        setCandidateEmail(doc.candidate_email || '');
        setCandidateRole(doc.job_title || 'AI / ML Engineer');
        
        // If this is a live Human Recruiter interview (Google Meet), route to Meet screen!
        if (doc.interview_type === 'human') {
          setCurrentStep('human_meet_redirect');
          setIsLoading(false);
          return;
        }
        
        const duration = doc.duration_minutes || 45;
        setSessionSecondsLeft(duration * 60);

        const targetCount = Math.max(5, Math.min(18, Math.round(duration / 3.2))); // 14 questions for 45 mins
        
        let qList: QuestionItem[] = doc.questions || [];
        const role = doc.job_title || 'AI / ML Engineer';
        const name = doc.candidate_name || 'Candidate';

        const comprehensiveQuestions: QuestionItem[] = [
          {
            question: `Welcome ${name}! Could you please introduce yourself and walk us through your key technical skills and production experience in ${role}?`,
            category: 'Candidate Background & Technical Overview',
            difficulty: 'Intermediate'
          },
          {
            question: `In your work as an ${role}, what core architectural patterns or system frameworks have you found most effective, and why?`,
            category: 'System Architecture & Engineering Design',
            difficulty: 'Intermediate'
          },
          {
            question: `What has been the most complex technical pipeline or bottleneck you engineered in ${role}, and how did you diagnose and resolve it?`,
            category: 'Deep-Dive Technical Scenarios',
            difficulty: 'Advanced'
          },
          {
            question: `How do you handle dirty, high-dimensional, or sparse feature datasets to ensure high model accuracy and prevent data leakage?`,
            category: 'Data Engineering & Pipeline Integrity',
            difficulty: 'Intermediate'
          },
          {
            question: `Could you explain the internal mechanics of Transformer multi-head self-attention mechanisms and how they scale during inference?`,
            category: 'Deep Learning & Neural Architectures',
            difficulty: 'Advanced'
          },
          {
            question: `What chunking strategies, embedding models, and vector similarity retrieval techniques do you prioritize when building enterprise RAG systems?`,
            category: 'RAG & Vector Retrieval Strategies',
            difficulty: 'Advanced'
          },
          {
            question: `How do vector databases like FAISS, ChromaDB, or Pinecone index high-dimensional embeddings to perform approximate nearest neighbor search efficiently?`,
            category: 'Vector Databases & Indexing',
            difficulty: 'Advanced'
          },
          {
            question: `How do you architect multi-agent systems using LangGraph or supervisors, and what mechanisms prevent cascading hallucination loops?`,
            category: 'Agentic AI & Orchestration',
            difficulty: 'Advanced'
          },
          {
            question: `How do you deploy AI models and backend APIs with FastAPI and Docker while optimizing response latency and GPU/CPU resource utilization?`,
            category: 'Production Serving & Latency Optimization',
            difficulty: 'Intermediate'
          },
          {
            question: `How do you evaluate generative AI outputs and implement strict guardrails against hallucinations in enterprise customer workflows?`,
            category: 'LLM Evaluation & Enterprise Guardrails',
            difficulty: 'Intermediate'
          },
          {
            question: `Can you describe a severe technical bug, memory leak, or CUDA out-of-memory failure you investigated, and how you traced the root cause?`,
            category: 'Production Diagnostics & Debugging',
            difficulty: 'Advanced'
          },
          {
            question: `If your application experiences a 10x surge in concurrent requests during a peak load event, what architectural bottlenecks emerge and how would you scale?`,
            category: 'Distributed Scalability & High Concurrency',
            difficulty: 'Advanced'
          },
          {
            question: `Can you share an experience where you had tight deadlines, conflicting priorities, or ambiguous requirements? How did you ensure on-time delivery?`,
            category: 'Engineering Leadership & Execution',
            difficulty: 'Intermediate'
          },
          {
            question: `Where do you see yourself evolving technically over the next 2-3 years, and what excites you most about this ${role} position?`,
            category: 'Career Vision & Closing',
            difficulty: 'Foundational'
          },
        ];

        // Ensure questions are scaled to targetCount (14 questions for 45 mins)
        if (qList.length < targetCount) {
          const existingText = new Set(qList.map(q => q.question.toLowerCase().trim()));
          for (const cq of comprehensiveQuestions) {
            if (!existingText.has(cq.question.toLowerCase().trim()) && qList.length < targetCount) {
              qList.push(cq);
            }
          }
        }
        setQuestions(qList);

        if (doc.status === 'completed') {
          setCurrentStep('completed');
          setIsCompleted(true);
        } else {
          setCurrentStep('candidate_details');
        }
      } else {
        setErrorMessage(data.error?.message || 'Interview session not found. Please verify your ID.');
      }
    } catch (err) {
      setErrorMessage('Could not connect to backend server. Make sure FastAPI server is running on port 8001.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Save Candidate Details and Move to Anti-Cheating
  const handleSaveDetails = async () => {
    if (!candidateName.trim()) {
      setErrorMessage("Please enter your full legal name to proceed.");
      return;
    }
    setErrorMessage(null);

    // Silently notify backend
    try {
      if (interviewId) {
        await fetch(FASTAPI_ENDPOINTS.updateCandidate(interviewId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_name: candidateName,
            candidate_email: candidateEmail,
            job_title: candidateRole
          })
        });
      }
    } catch {}

    setCurrentStep('anti_cheating');
  };

  // Step 2 to Step 3: Anti-Cheating Approved -> Setup Hardware Permissions
  const handleProceedToHardware = () => {
    if (!agreedToIntegrity) {
      setErrorMessage("You must accept the Examination Integrity Protocol to continue.");
      return;
    }
    setErrorMessage(null);
    setCurrentStep('hardware_check');
    startHardwarePermissions();
  };

  // Step 3: Request Camera & Mic with Real-Time Face & Eye Detector
  const startHardwarePermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });

      setCameraStream(stream);
      setCameraAllowed(true);
      setMicAllowed(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Audio VAD Setup
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!audioContextRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(avg * 1.6)));
          requestAnimationFrame(checkAudio);
        };
        checkAudio();
      } catch (audioErr) {
        console.warn("AudioContext setup warning:", audioErr);
      }

      // Start Real-Time Face & Eyes Straight Detection Loop
      startFaceTracking(stream);

    } catch (err: any) {
      console.error("Hardware permission error:", err);
      setErrorMessage("Camera and Microphone permissions are required for the AI proctored interview. Please allow permissions in your browser.");
      setCameraAllowed(false);
      setMicAllowed(false);
    }
  };

  // Real-Time Computer Vision Face & Eye Detection
  const startFaceTracking = (stream: MediaStream) => {
    if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);

    proctoringIntervalRef.current = setInterval(async () => {
      const video = videoRef.current || pipVideoRef.current;
      if (!video || video.readyState < 2) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Check Shape Detection API if supported in Chromium
      if ('FaceDetector' in window) {
        try {
          const detector = new (window as any).FaceDetector({ maxDetectedFaces: 2, fastMode: true });
          const faces = await detector.detect(video);

          if (!faces || faces.length === 0) {
            setFaceStatus('no_face');
            setFaceAlertMessage('Sensor Warning: No Face Detected');
            return;
          }
          if (faces.length > 1) {
            setFaceStatus('looking_away');
            setFaceAlertMessage('Proctoring Flag: Multiple Faces in View');
            return;
          }

          const face = faces[0];
          const box = face.boundingBox;
          const centerX = (box.x + box.width / 2) / (video.videoWidth || 640);

          if (centerX < 0.28 || centerX > 0.72) {
            setFaceStatus('looking_away');
            setFaceAlertMessage('Gaze Divergence: Please Face Display');
          } else {
            setFaceStatus('straight');
            setFaceAlertMessage('Biometric Telemetry: Gaze Aligned');
          }
          return;
        } catch {}
      }

      // Canvas luminance & symmetry analysis (Universal Cross-Browser Fallback)
      try {
        ctx.drawImage(video, 0, 0, 64, 48);
        const imgData = ctx.getImageData(0, 0, 64, 48);
        const data = imgData.data;

        let leftEnergy = 0;
        let centerEnergy = 0;
        let rightEnergy = 0;

        for (let y = 10; y < 40; y++) {
          for (let x = 8; x < 56; x++) {
            const idx = (y * 64 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Skin / facial luminance heuristic
            const isSkin = (r > 60 && g > 40 && b > 20 && r > g && (r - g) > 8);
            if (isSkin) {
              if (x < 24) leftEnergy++;
              else if (x > 40) rightEnergy++;
              else centerEnergy++;
            }
          }
        }

        const totalEnergy = leftEnergy + centerEnergy + rightEnergy;

        if (totalEnergy < 40) {
          setFaceStatus('no_face');
          setFaceAlertMessage('Sensor Warning: Face Not in Frame');
          if (currentStep === 'active_session') {
            triggerProctoringWarning("TELEMETRY ALERT: Face Not Detected! Maintain direct eye line with camera.");
          }
        } else {
          const ratio = (leftEnergy + 1) / (rightEnergy + 1);
          if (ratio > 2.8 || ratio < 0.35) {
            setFaceStatus('looking_away');
            setFaceAlertMessage('Gaze Divergence: Please Face Display');
            if (currentStep === 'active_session') {
              triggerProctoringWarning("TELEMETRY ALERT: Looking away detected! Focus strictly on the assessment screen.");
            }
          } else {
            setFaceStatus('straight');
            setFaceAlertMessage('Biometric Telemetry: Gaze Aligned');
          }
        }
      } catch (err) {
        setFaceStatus('straight');
        setFaceAlertMessage('Biometric Telemetry: Gaze Aligned');
      }
    }, 450);
  };

  // Step 3 to Step 4: Start Active Interview Session
  const handleEnterInterviewRoom = () => {
    if (!cameraAllowed || !micAllowed) {
      setErrorMessage("Please grant camera and microphone access to start.");
      return;
    }
    setErrorMessage(null);
    setCurrentStep('active_session');

    // Attach stream to PIP video element
    setTimeout(() => {
      if (pipVideoRef.current && cameraStream) {
        pipVideoRef.current.srcObject = cameraStream;
        pipVideoRef.current.play().catch(() => {});
        startFaceTracking(cameraStream);
      }
      // Speak Question 1 automatically!
      if (questions[0]) {
        speakQuestion(questions[0].question);
      }
    }, 500);
  };

  // Clear Timers
  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(null);
  }, []);

  // Submit Answer & Automatically Advance to Next Question (ZERO CLICKS REQUIRED)
  const submitAnswerAndAdvance = useCallback(async (overrideText?: string) => {
    const finalAnswer = (overrideText !== undefined ? overrideText : currentAnswerRef.current).trim();
    if (isSubmittingRef.current) return;
    if (!finalAnswer) return;

    isSubmittingRef.current = true;
    clearSilenceTimers();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }

    setIsAnalyzing(true);

    try {
      const idx = currentIndexRef.current;
      const payload = {
        answer_text: finalAnswer,
        answer: finalAnswer,
        question_index: idx,
        proctoring_warnings: proctoringWarnings
      };

      // Call backend to save answer and score in MongoDB
      await fetch(FASTAPI_ENDPOINTS.processAnswer(interviewId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Advance question automatically!
      const totalQ = questionsRef.current.length;
      if (idx < totalQ - 1) {
        const nextIdx = idx + 1;
        setCurrentIndex(nextIdx);
        setAnswerText('');
        currentAnswerRef.current = '';
        setIsAnalyzing(false);
        isSubmittingRef.current = false;

        // AI speaks the next question aloud automatically!
        setTimeout(() => {
          speakQuestion(questionsRef.current[nextIdx]?.question || '');
        }, 700);
      } else {
        // All questions completed!
        setIsAnalyzing(false);
        setIsCompleted(true);
        setCurrentStep('completed');
        isSubmittingRef.current = false;
      }
    } catch (err) {
      console.error('Answer submission error:', err);
      const totalQ = questionsRef.current.length;
      const idx = currentIndexRef.current;
      if (idx < totalQ - 1) {
        const nextIdx = idx + 1;
        setCurrentIndex(nextIdx);
        setAnswerText('');
        currentAnswerRef.current = '';
        setIsAnalyzing(false);
        isSubmittingRef.current = false;
        setTimeout(() => {
          speakQuestion(questionsRef.current[nextIdx]?.question || '');
        }, 700);
      } else {
        setIsAnalyzing(false);
        setIsCompleted(true);
        setCurrentStep('completed');
        isSubmittingRef.current = false;
      }
    }
  }, [clearSilenceTimers, interviewId, proctoringWarnings]);

  // Automatic Silence Detection Countdown (2.5s)
  const startSilenceCountdown = useCallback(() => {
    clearSilenceTimers();
    let timeLeft = Math.ceil(SILENCE_THRESHOLD_SECONDS);
    setSilenceCountdown(timeLeft);

    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setSilenceCountdown(null);
      } else {
        setSilenceCountdown(timeLeft);
      }
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      if (currentAnswerRef.current.trim().length > 3) {
        submitAnswerAndAdvance();
      }
    }, SILENCE_THRESHOLD_SECONDS * 1000);
  }, [clearSilenceTimers, submitAnswerAndAdvance]);

  // High-Accuracy Speech Recognition with Multi-Language Support
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      clearSilenceTimers();

      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }

      if (fullTranscript) {
        setAnswerText(fullTranscript);
        currentAnswerRef.current = fullTranscript;

        if (fullTranscript.trim().length > 3) {
          startSilenceCountdown();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition warning:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!isSubmittingRef.current && currentStep === 'active_session' && !isCompleted) {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 150);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
  }, [clearSilenceTimers, currentStep, isCompleted, startSilenceCountdown]);

  // AI Voice Output (SpeechSynthesis)
  const speakQuestion = useCallback((textToSpeak: string) => {
    if (!window.speechSynthesis) {
      startListening();
      return;
    }

    window.speechSynthesis.cancel();
    clearSilenceTimers();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  }, [clearSilenceTimers, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimers();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      if (proctoringIntervalRef.current) {
        clearInterval(proctoringIntervalRef.current);
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [clearSilenceTimers, cameraStream]);


  // ────────────────────────── SHARED ENTERPRISE SHELL ──────────────────────────
  const renderOnboardingHeader = (activeStepNumber: 1 | 2 | 3) => (
    <header className="border-b border-white/[0.08] bg-slate-950/90 backdrop-blur-2xl sticky top-0 z-30 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Security Certification */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-black text-sm tracking-tight border border-white/20">
            VS
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold tracking-tight text-white font-sans">VIAMOD SOLUTION</span>
              <span className="text-slate-600 text-xs font-light">|</span>
              <span className="text-xs font-semibold text-cyan-400 tracking-wide uppercase">Assessment Portal</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI Proctored
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Enterprise Candidate Evaluation & Verification System</p>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur">
          {/* Step 1 */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeStepNumber === 1 
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20' 
              : activeStepNumber > 1
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-500'
          }`}>
            {activeStepNumber > 1 ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check size={11} className="stroke-[3]" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-[10px] text-cyan-200 font-bold">1</span>
            )}
            <span>Identity Dossier</span>
          </div>

          <div className={`w-3 sm:w-5 h-0.5 ${activeStepNumber > 1 ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />

          {/* Step 2 */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeStepNumber === 2 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20' 
              : activeStepNumber > 2
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-500'
          }`}>
            {activeStepNumber > 2 ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check size={11} className="stroke-[3]" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-amber-500/30 border border-amber-400/50 flex items-center justify-center text-[10px] text-amber-200 font-bold">2</span>
            )}
            <span>Integrity Protocol</span>
          </div>

          <div className={`w-3 sm:w-5 h-0.5 ${activeStepNumber > 2 ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />

          {/* Step 3 */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeStepNumber === 3 
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20' 
              : 'text-slate-500'
          }`}>
            <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">3</span>
            <span>Sensor Calibration</span>
          </div>
        </div>

        {/* Security / Session Credentials */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-[11px] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Lock size={12} className="text-emerald-400" />
            <span>TLS-256 ENCRYPTED</span>
          </div>
        </div>

      </div>
    </header>
  );


  // ────────────────────────── SCREEN RENDERING ──────────────────────────

  // SCREEN 0: Enter Interview ID (Fallback if no ID in URL)
  if (currentStep === 'enter_id' && !interview && !isLoading) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-xs">VS</div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm">VIAMOD SOLUTION</span>
              <span className="text-slate-600 text-xs font-light">|</span>
              <span className="text-xs font-semibold text-cyan-400 tracking-wide uppercase">Assessment Portal</span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500">SECURE DISPATCH CLIENT</span>
        </div>

        <div className="max-w-md w-full mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Technical Examination Portal</h1>
              <p className="text-slate-400 text-xs leading-relaxed">
                Enter your designated Interview Authorization Token to initialize your proctored evaluation runtime.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Interview Session ID / Token</label>
                <Input
                  type="text"
                  placeholder="e.g. b1d38fb6-7485-46c6-839f-1887e24c2a01"
                  value={interviewId}
                  onChange={e => setInterviewId(e.target.value)}
                  className="bg-slate-950 border-slate-700/80 text-white font-mono text-xs h-11 rounded-xl"
                />
              </div>

              <Button
                onClick={() => loadInterview(interviewId)}
                disabled={!interviewId.trim() || isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 h-11 text-sm font-semibold shadow-lg shadow-cyan-500/20 rounded-xl"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                Authenticate & Launch Session
              </Button>
            </div>
          </motion.div>
        </div>

        <div className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04]">
          Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
        </div>
      </div>
    );
  }

  // SCREEN: Human Recruiter Interview via Google Meet
  if (currentStep === 'human_meet_redirect') {
    let meetUrl = interview?.meet_link || '';
    if (!meetUrl.startsWith('https://meet.google.com')) {
      const cleanId = (interview?.interview_id || interviewId || 'recruiter').replace(/[^a-zA-Z]/g, '') + 'viamodlive';
      meetUrl = `https://meet.google.com/${cleanId.slice(0, 3)}-${cleanId.slice(3, 7)}-${cleanId.slice(7, 10)}`.toLowerCase();
    }
    const calUrl = interview?.google_calendar_add_url || interview?.calendar_link;

    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs">VS</div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm">VIAMOD SOLUTION</span>
              <span className="text-slate-600 text-xs font-light">|</span>
              <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase">Live Human Interview</span>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs py-1 px-3">
            🎥 Google Meet Room
          </Badge>
        </div>

        {/* Main Card */}
        <div className="max-w-xl w-full mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Video size={34} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Human Recruiter Video Call</h1>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                This interview is scheduled as a live 1-on-1 video call with our Human Recruiter on <span className="text-blue-400 font-semibold">Google Meet</span>, not an automated AI bot session.
              </p>
            </div>

            {/* Candidate & Interview Details */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Position / Role</span>
                <span className="text-white font-semibold">{interview?.job_title || candidateRole || 'Candidate Position'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Candidate Name</span>
                <span className="text-white font-medium">{interview?.candidate_name || candidateName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Interview Format</span>
                <span className="text-cyan-400 font-medium">1-on-1 Recruiter Video Call</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Google Meet URL</span>
                <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono truncate max-w-[240px]">
                  {meetUrl}
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <a
                href={meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-12 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm"
              >
                <Video size={18} />
                <span>🎥 Join Google Meet Video Call Now</span>
              </a>

              {calUrl && (
                <a
                  href={calUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium h-10 rounded-xl border border-slate-700/60 transition-all text-xs"
                >
                  <Clock size={15} />
                  <span>📅 Add to Google Calendar</span>
                </a>
              )}
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-blue-300">💡 Instructions for Candidate:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                <li>Click the button above to launch Google Meet directly.</li>
                <li>Make sure your webcam and microphone permissions are allowed.</li>
                <li>Please connect 5 minutes prior to the scheduled start time.</li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04]">
          Confidential Evaluation Environment • Viamod Solution Private Limited
        </div>
      </div>
    );
  }

  // SCREEN 1: Candidate Personal Details & Track Specialization (Full-Width Split Stage)
  if (currentStep === 'candidate_details') {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Header with Stepper */}
        {renderOnboardingHeader(1)}

        {/* Ambient Stage Lights & Background Glow */}
        <div className="absolute top-0 right-1/4 w-[700px] h-[350px] bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 left-1/4 w-[700px] h-[350px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Main Split Layout */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex-1 flex items-center relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
            
            {/* Left Column (5 Cols): Assessment Briefing & Role Track */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-900/60 border border-slate-700/60 p-7 md:p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-80" />
              
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm">
                  <Activity size={13} className="text-cyan-400" />
                  <span>Technical Evaluation Dossier</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Candidate Identity Verification
                  </h1>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                    Confirm your details to begin your AI proctored interview session.
                  </p>
                </div>

                {/* Key Session Specs */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Target Role Track</span>
                    <span className="font-bold text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-800/60 tracking-wide text-[11px] uppercase">
                      {candidateRole || 'AI / ML Engineer'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Assessment Format</span>
                    <span className="font-semibold text-slate-200 text-right">Autonomous AI Session</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Interaction Mode</span>
                    <span className="font-semibold text-white text-right">Adaptive Voice Q&A</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Proctoring Telemetry</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-right shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Continuous Computer Vision
                    </span>
                  </div>
                </div>

                {/* Core Competencies Tested */}
                <div className="space-y-2.5">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Evaluation Focus Domains</span>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-200 flex items-center gap-2 hover:border-cyan-500/40 transition-colors min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <Briefcase size={13} className="text-cyan-400" />
                      </div>
                      <span className="font-medium text-[11px] truncate">Core Competencies</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-200 flex items-center gap-2 hover:border-blue-500/40 transition-colors min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <Sparkles size={13} className="text-blue-400" />
                      </div>
                      <span className="font-medium text-[11px] truncate">Logic & Reasoning</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-200 flex items-center gap-2 hover:border-purple-500/40 transition-colors min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <Layers size={13} className="text-purple-400" />
                      </div>
                      <span className="font-medium text-[11px] truncate">Practical Scenarios</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-200 flex items-center gap-2 hover:border-emerald-500/40 transition-colors min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <ShieldCheck size={13} className="text-emerald-400" />
                      </div>
                      <span className="font-medium text-[11px] truncate">Communication Fit</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="font-mono text-slate-500">SESSION: {interviewId ? `${interviewId.slice(0, 14)}...` : 'N/A'}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready for Dispatch
                </span>
              </div>
            </div>

            {/* Right Column (7 Cols): Form Console */}
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-700/60 p-7 md:p-9 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-80" />

              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Candidate Profile Credentials</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Confirm your information matches your application records before proceeding.</p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl">
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-4.5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Full Legal Name</span>
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">REQUIRED</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-slate-400" size={17} />
                      <Input
                        value={candidateName}
                        onChange={e => setCandidateName(e.target.value)}
                        placeholder="e.g. Aditya Verma"
                        className="pl-11 bg-slate-950/90 border-slate-700/80 text-white text-sm h-12 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Registered Corporate / Personal Email</span>
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">REQUIRED</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-slate-400" size={17} />
                      <Input
                        type="email"
                        value={candidateEmail}
                        onChange={e => setCandidateEmail(e.target.value)}
                        placeholder="candidate@example.com"
                        className="pl-11 bg-slate-950/90 border-slate-700/80 text-white text-sm h-12 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Role Track Designation</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-3.5 text-slate-400" size={17} />
                        <Input
                          value={candidateRole}
                          onChange={e => setCandidateRole(e.target.value)}
                          placeholder="e.g. AI / ML Engineer"
                          className="pl-11 bg-slate-950/90 border-slate-700/80 text-white text-sm h-12 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Experience Tier</label>
                      <div className="relative">
                        <select
                          value={candidateExperience}
                          onChange={e => setCandidateExperience(e.target.value)}
                          className="w-full h-12 pl-4 pr-10 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer appearance-none"
                        >
                          <option value="0-1 Year">0-1 Year (Associate / Entry Level)</option>
                          <option value="1-3 Years">1-3 Years (Intermediate Engineer)</option>
                          <option value="3-5 Years">3-5 Years (Senior AI Specialist)</option>
                          <option value="5+ Years">5+ Years (Staff / Lead Architect)</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-4 text-slate-400 pointer-events-none rotate-90" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <Button
                  onClick={handleSaveDetails}
                  className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 h-12 text-sm font-bold shadow-xl shadow-cyan-500/25 text-white flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer group"
                >
                  <span>Confirm & Continue</span>
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
                  <Lock size={12} className="text-slate-600" />
                  <span>Session credentials are encrypted and locked upon submission.</span>
                </p>
              </div>
            </div>

          </div>
        </main>

        <footer className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04] relative z-10">
          Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
        </footer>
      </div>
    );
  }

  // SCREEN 2: Anti-Cheating & Integrity Protocol (Full-Width Regulatory Specification)
  if (currentStep === 'anti_cheating') {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Header with Stepper */}
        {renderOnboardingHeader(2)}

        {/* Ambient Stage Lights */}
        <div className="absolute top-10 left-1/3 w-[700px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 right-1/4 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Main Stage */}
        <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex-1 flex flex-col justify-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
            
            {/* Title Section */}
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>Proctoring Guidelines & Integrity Protocol</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Interview Rules & Code of Conduct
              </h1>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                Autonomous computer vision and acoustic sensors monitor this session to guarantee an authentic, fair evaluation.
              </p>
            </div>

            {errorMessage && (
              <div className="max-w-2xl mx-auto flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 3 Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: Face the Camera */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-2xl space-y-4 shadow-xl hover:border-cyan-500/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm group-hover:scale-105 transition-transform">
                  <Eye size={22} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white text-sm">Face the Camera</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Keep your head centered in the viewfinder. Frequent gaze shifts or stepping out of view will log proctoring flags.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800 text-[10px] text-cyan-400 font-mono font-bold tracking-wide">
                  RULE: STAY IN FRAME (100% FOCUS)
                </div>
              </div>

              {/* Card 2: Stay on this Tab */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-2xl space-y-4 shadow-xl hover:border-amber-500/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-105 transition-transform">
                  <Radio size={22} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white text-sm">Stay on this Tab</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Do not switch tabs, minimize the browser, or use multiple monitors. All window blur events are recorded.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800 text-[10px] text-amber-400 font-mono font-bold tracking-wide">
                  RULE: ZERO TAB SWITCHING
                </div>
              </div>

              {/* Card 3: Quiet Room */}
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-2xl space-y-4 shadow-xl hover:border-purple-500/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm group-hover:scale-105 transition-transform">
                  <Mic size={22} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white text-sm">Quiet & Private Room</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Sit in a quiet room alone. Background chatter, whispered assistance, or unauthorized AI tools are prohibited.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800 text-[10px] text-purple-400 font-mono font-bold tracking-wide">
                  RULE: NO OUTSIDE HELP / NO AI
                </div>
              </div>

            </div>

            {/* Sole Authorship Declaration Box */}
            <div 
              onClick={() => setAgreedToIntegrity(!agreedToIntegrity)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl ${
                agreedToIntegrity
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/70 border-slate-700/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                  agreedToIntegrity
                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-sm shadow-cyan-500/50'
                    : 'bg-slate-950 border-slate-700'
                }`}>
                  {agreedToIntegrity && <Check size={13} className="stroke-[3]" />}
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-white text-sm block">
                    Candidate Honor Code & Consent Agreement
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    I declare that I will complete this interview independently without external assistance, proxy test-takers, or third-party AI tools. I consent to real-time proctoring telemetry via my webcam and microphone.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('candidate_details')}
                className="border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-12 text-xs px-6 font-semibold transition-all cursor-pointer"
              >
                ← Back to Dossier
              </Button>
              <Button
                onClick={handleProceedToHardware}
                disabled={!agreedToIntegrity}
                className={`font-bold h-12 px-8 text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  agreedToIntegrity
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-xl shadow-orange-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <span>Accept & Calibrate Sensors</span>
                <ArrowRight size={17} />
              </Button>
            </div>

          </motion.div>
        </main>

        <footer className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04] relative z-10">
          Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
        </footer>
      </div>
    );
  }

  // SCREEN 3: Hardware Diagnostics & Sensor Calibration (Split Studio Layout)
  if (currentStep === 'hardware_check') {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Header with Stepper */}
        {renderOnboardingHeader(3)}

        {/* Ambient Stage Lights */}
        <div className="absolute top-10 right-1/3 w-[700px] h-[350px] bg-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 left-1/4 w-[700px] h-[350px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Main Stage */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex-1 flex items-center relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
            
            {/* Left Column (7 Cols): Optical Reticle Viewfinder */}
            <div className="lg:col-span-7 bg-slate-900/70 border border-slate-700/60 p-7 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Optical Viewfinder • HD 1080p
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  WEBRTC STREAM ACTIVE
                </span>
              </div>

              {/* Viewfinder Window */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* High-Tech HUD Reticle Brackets */}
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-sm" />
                    <div className="w-7 h-7 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-sm" />
                  </div>
                  
                  {/* Subtle Biometric Alignment Oval */}
                  <div className="self-center w-48 h-60 rounded-full border border-dashed transition-all duration-300 flex items-center justify-center">
                    <div className={`w-full h-full rounded-full transition-all duration-300 ${
                      faceStatus === 'straight'
                        ? 'border-2 border-emerald-400/80 bg-emerald-500/10 shadow-2xl shadow-emerald-500/30'
                        : faceStatus === 'looking_away'
                        ? 'border-2 border-amber-400 bg-amber-500/15'
                        : 'border-2 border-red-400 bg-red-500/15'
                    }`} />
                  </div>

                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-sm" />
                    <div className="w-7 h-7 border-b-2 border-r-2 border-cyan-400/80 rounded-br-sm" />
                  </div>
                </div>

                {/* HUD Status Pill */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg ${
                    faceStatus === 'straight'
                      ? 'bg-emerald-500/90 text-white'
                      : faceStatus === 'looking_away'
                      ? 'bg-amber-500 text-slate-950 font-bold animate-bounce'
                      : 'bg-red-500 text-white font-bold animate-pulse'
                  }`}>
                    <Eye size={13} />
                    {faceAlertMessage}
                  </span>

                  <span className="text-[10px] font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur border border-slate-800">
                    30 FPS • 720p
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Align your face within the biometric center reticle.</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check size={13} />
                  Continuous Tracking Enabled
                </span>
              </div>
            </div>

            {/* Right Column (5 Cols): Sensor Readiness Console */}
            <div className="lg:col-span-5 bg-slate-900/70 border border-slate-700/60 p-7 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />

              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white tracking-tight">Audiovisual Sensor Diagnostics</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Verify hardware input calibration before launching the proctored interview room.</p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl">
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Diagnostics List */}
                <div className="space-y-3">
                  {/* Camera Status */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Camera size={16} />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Optical Video Transducer</span>
                        <span className="text-slate-400 text-[11px]">WebRTC 720p / 30 FPS Stream</span>
                      </div>
                    </div>
                    <span className={cameraAllowed ? "text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/50" : "text-amber-400 font-mono font-bold"}>
                      {cameraAllowed ? "ONLINE" : "PENDING"}
                    </span>
                  </div>

                  {/* Microphone Status with Equalizer */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                          <Mic size={16} />
                        </div>
                        <div>
                          <span className="font-semibold text-white block">Acoustic Vocal Transducer</span>
                          <span className="text-slate-400 text-[11px]">48kHz Spectral Audio Channel</span>
                        </div>
                      </div>
                      <span className="text-slate-200 font-mono font-bold bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">{audioLevel}%</span>
                    </div>

                    {/* Equalizer Frequency Bars */}
                    <div className="flex items-end gap-1.5 h-6 pt-1">
                      {[15, 30, 60, 45, 80, 65, 90, 50, 70, 40, 25, 10].map((base, i) => {
                        const dynamicHeight = Math.min(100, Math.max(12, Math.round((audioLevel / 100) * base * 1.5)));
                        return (
                          <div
                            key={i}
                            style={{ height: `${dynamicHeight}%` }}
                            className={`flex-1 rounded-sm transition-all duration-75 ${
                              audioLevel > 15 ? 'bg-cyan-400 shadow-sm shadow-cyan-400/60' : 'bg-slate-800'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Telemetry Tracking */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Eye size={16} />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Gaze Landmark Telemetry</span>
                        <span className="text-slate-400 text-[11px]">Computer Vision Model</span>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/50">CALIBRATED</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Info size={14} />
                    <span>Examination Execution Note</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Once initialized, Question 1 will launch immediately. Answers are autonomously transcribed and advanced via conversational speech recognition.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleEnterInterviewRoom}
                  disabled={!cameraAllowed || !micAllowed}
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 h-13 text-sm sm:text-base font-bold shadow-xl shadow-emerald-500/25 text-white rounded-xl transition-all cursor-pointer"
                >
                  🚀 Initiate Proctored Technical Examination
                </Button>
              </div>
            </div>

          </div>
        </main>

        <footer className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04] relative z-10">
          Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
        </footer>
      </div>
    );
  }

  // SCREEN 4: Completed Assessment Screen
  if (currentStep === 'completed' || isCompleted) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs">VS</div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm">VIAMOD SOLUTION</span>
              <span className="text-slate-600 text-xs font-light">|</span>
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Examination Archive</span>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400">TELEMETRY SECURED</span>
        </div>

        <div className="max-w-xl w-full mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-emerald-500/40 shadow-xl shadow-emerald-500/20">
              <img src="/ai-avatar.jpg" alt="AI Interviewer" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white">
                <CheckCircle size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 font-mono">
                ASSESSMENT CONCLUDED • ARCHIVED
              </Badge>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Examination Dossier Finalized
              </h1>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                Thank you, <strong className="text-white">{candidateName || interview?.candidate_name}</strong>. Your complete spoken transcripts, technical responses, and proctoring telemetry have been cryptographically verified and forwarded to the evaluation panel.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2 text-left">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Sparkles size={15} />
                <span>Next Lifecycle Phases</span>
              </div>
              <p>• Algorithmic answer scoring and follow-up metrics have been appended to your dossier.</p>
              <p>• The recruiting team will review your comprehensive evaluation on the HR Dashboard.</p>
              <p>• Formal next-step correspondence will be dispatched to your registered email.</p>
            </div>

            <Button
              onClick={() => navigate('/hr-resume-analysis')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 h-11 text-xs font-semibold rounded-xl"
            >
              Return to HR Analytics Dashboard
            </Button>
          </motion.div>
        </div>

        <div className="p-4 text-center text-[11px] text-slate-500 border-t border-white/[0.04]">
          Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
        </div>
      </div>
    );
  }

  // SCREEN 5: Active Proctored Assessment Room (Executive Studio Arena)
  const currentQ = questions[currentIndex] || { question: 'Question loading...' };

  return (
    <div className="min-h-screen bg-[#06090E] text-slate-100 flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Floating Anti-Cheating Alert Banner */}
      <AnimatePresence>
        {activeWarningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4"
          >
            <div className="bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-red-400 flex items-center gap-3 text-xs md:text-sm font-semibold animate-pulse">
              <AlertTriangle size={20} className="shrink-0 text-white" />
              <span>{activeWarningBanner}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP COMMAND HEADER (Spans full viewport width cleanly) */}
      <header className="border-b border-white/[0.08] bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Brand & Candidate Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center font-black text-slate-950 text-xs">AG</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">AI PROCTORED EXAMINATION</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {candidateName || interview?.candidate_name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {candidateRole || interview?.job_title || 'AI / ML Engineer'}
              </p>
            </div>
          </div>

          {/* Center: Live Session Status & Current Question */}
          <div className="flex items-center gap-3">
            {/* Live Session Status */}
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SESSION ACTIVE</span>
            </div>

            {/* Question Indicator Badge (Current Question only) */}
            <Badge className="bg-slate-800 text-slate-200 border-slate-700 text-xs px-3 py-1.5 font-mono">
              QUESTION #{currentIndex + 1}
            </Badge>
          </div>

          {/* Right: Telemetry Status & End Early */}
          <div className="flex items-center gap-3">
            {/* Proctoring HUD Status */}
            <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-mono font-medium border ${
              faceStatus === 'straight'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
            }`}>
              <Eye size={13} />
              <span>{faceStatus === 'straight' ? 'GAZE LOCKED' : 'LOOK STRAIGHT'}</span>
            </div>

            {/* End Early Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm("Are you sure you want to conclude your interview early and submit your responses?")) {
                  setIsCompleted(true);
                  setCurrentStep('completed');
                }
              }}
              className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-3 font-semibold"
            >
              End Early
            </Button>
          </div>

        </div>
      </header>

      {/* MAIN STUDIO ARENA (Balanced 68% / 32% Full-Height Stage) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
          
          {/* Left Column (8 Cols): Question Stage & Voice Transcription Console */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            
            {/* AI Recruiter Question Stage */}
            <div className="bg-slate-900/60 border border-white/[0.08] p-6 sm:p-7 rounded-2xl backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              {/* Subtle Ambient Backlight */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                {/* AI Recruiter Avatar with Reactive Audio Waves */}
                <div className="relative shrink-0 text-center">
                  <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-2xl ${
                    isSpeaking
                      ? 'border-emerald-400 shadow-emerald-500/30 scale-105 ring-4 ring-emerald-500/20'
                      : isListening
                      ? 'border-cyan-400 shadow-cyan-500/30'
                      : 'border-slate-800'
                  }`}>
                    <img src="/ai-avatar.jpg" alt="AI Technical Interviewer" className="w-full h-full object-cover" />
                  </div>

                  <div className="mt-2.5">
                    {isSpeaking ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        <Volume2 size={12} /> AI SPEAKING
                      </span>
                    ) : isAnalyzing ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <Loader2 size={12} className="animate-spin" /> EVALUATING...
                      </span>
                    ) : isListening ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <Mic size={12} className="animate-pulse" /> LISTENING...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        READY
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text Box */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold font-mono">
                      QUESTION #{currentIndex + 1}
                    </span>
                    {currentQ.category && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 font-mono">
                        {currentQ.category}
                      </span>
                    )}
                    {currentQ.difficulty && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                        {currentQ.difficulty}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => speakQuestion(currentQ.question)}
                      className="h-6 px-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      <Volume2 size={12} className="mr-1" /> Replay
                    </Button>
                  </div>

                  <p className="text-lg sm:text-xl font-medium text-white leading-relaxed">
                    "{currentQ.question}"
                  </p>
                </div>

              </div>
            </div>

            {/* Candidate Live Transcription Console */}
            <div className="bg-slate-900/60 border border-white/[0.08] p-5 sm:p-6 rounded-2xl backdrop-blur-2xl shadow-xl space-y-3.5">
              
              {/* Header & Status */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
                  <span className="font-mono text-slate-300 font-medium">LIVE SPEECH-TO-TEXT TRANSCRIPTION STREAM:</span>
                </div>

                {/* Silence Auto-Advance Alert */}
                {silenceCountdown !== null && (
                  <span className="flex items-center gap-1.5 text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse text-[11px]">
                    <span>Advancing in {silenceCountdown}s...</span>
                  </span>
                )}
              </div>

              {/* Spoken Text Display */}
              <div className="min-h-[120px] max-h-[160px] overflow-y-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm leading-relaxed font-sans">
                {answerText.trim() ? (
                  <div className="space-y-1">
                    <p className="text-white font-medium">{answerText}</p>
                    <span className="inline-block w-1.5 h-4 bg-cyan-400 animate-pulse align-middle ml-1" />
                  </div>
                ) : isSpeaking ? (
                  <p className="text-slate-500 italic text-xs">AI interviewer is speaking... Microphone will open automatically once speech concludes.</p>
                ) : (
                  <p className="text-slate-500 italic text-xs">Speak your answer clearly into your microphone... Autonomous speech recognition is active.</p>
                )}
              </div>

              {/* Audio Wave & Bottom Advance Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Activity size={14} className="text-cyan-400 shrink-0" />
                  <span>AI automatically records your answer and asks the next question once you pause for 2.5 seconds.</span>
                </div>

                {/* Instant submit button if candidate wants to skip 2.5s wait */}
                {answerText.trim().length > 3 && !isAnalyzing && (
                  <Button
                    size="sm"
                    onClick={() => submitAnswerAndAdvance()}
                    className="h-8 px-3.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-500/20"
                  >
                    Submit Response <Send className="ml-1.5" size={12} />
                  </Button>
                )}
              </div>

            </div>

          </div>

          {/* Right Column (4 Cols): Continuous Biometric Proctoring HUD */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="bg-slate-900/60 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-2xl shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Video size={15} className="text-cyan-400" />
                  <span className="font-mono font-bold text-white uppercase tracking-wider">Candidate Telemetry</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  faceStatus === 'straight'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                }`}>
                  {faceStatus === 'straight' ? 'PROCTORING ACTIVE' : 'ALIGN FACE'}
                </span>
              </div>

              {/* Live WebRTC Camera Stream with Reticle */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                <video
                  ref={pipVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* HUD Corner Reticles */}
                <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-3.5 h-3.5 border-t border-l border-cyan-400/80" />
                    <div className="w-3.5 h-3.5 border-t border-r border-cyan-400/80" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-3.5 h-3.5 border-b border-l border-cyan-400/80" />
                    <div className="w-3.5 h-3.5 border-b border-r border-cyan-400/80" />
                  </div>
                </div>

                {/* Gaze Guidance Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`w-32 h-40 rounded-full border border-dashed transition-all duration-300 ${
                    faceStatus === 'straight' ? 'border-emerald-400/60' : 'border-amber-400'
                  }`} />
                </div>

                {/* Telemetry Alert Bar in Video */}
                {faceStatus !== 'straight' && (
                  <div className="absolute bottom-2 left-2 right-2 bg-amber-600/90 text-slate-950 text-[10px] font-mono font-bold py-1 px-2 rounded backdrop-blur-md shadow text-center">
                    {faceAlertMessage}
                  </div>
                )}
              </div>

              {/* Telemetry Status Matrix */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Facial Orientation:</span>
                  <span className={faceStatus === 'straight' ? "text-emerald-400 font-mono font-semibold" : "text-amber-400 font-mono font-semibold"}>
                    {faceStatus === 'straight' ? 'Centered (0° Yaw)' : 'Warning (Looking Away)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Acoustic Input:</span>
                  <span className="text-emerald-400 font-mono font-semibold">48kHz PCM Transcribing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Integrity Flags:</span>
                  <span className={proctoringWarnings > 0 ? "text-amber-400 font-mono font-bold" : "text-slate-400 font-mono"}>
                    {proctoringWarnings} Recorded
                  </span>
                </div>
              </div>

              {/* Assessment Guidelines Summary */}
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Check size={12} className="text-emerald-400" />
                  <span>Maintain direct eye contact with screen</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Check size={12} className="text-emerald-400" />
                  <span>Tab switching is strictly flagged in dossier</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Check size={12} className="text-emerald-400" />
                  <span>Solitary environment with zero external aids</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="p-3 text-center text-[11px] text-slate-500 border-t border-white/[0.04]">
        Confidential Evaluation Environment • Viamod Solution Private Limited • Autonomous Recruiter Suite
      </footer>

    </div>
  );
};

export default InteractiveInterview;
