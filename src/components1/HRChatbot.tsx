import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { extractTextFromPdf } from './ResumeAnalysis';
import { API_ENDPOINTS, FASTAPI_ENDPOINTS } from '@/config/api';
import { ResumeQA } from './ResumeQA';
import { InterviewQuestions } from './InterviewQuestions';
import AutoInterview from './AutoInterview';
import InterviewAnalytics from './InterviewAnalytics';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Spinner from "@/components/ui/spinner";
import { useNavigate } from 'react-router-dom';


import StartAnimation from '@/components/ui/StartAnimation';
import ParticleBackground from '@/components/ui/ParticleBackground';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { detectIntent } from '@/services/intentDetection';
import '@/lib/pdfWorker';
import { auth } from '@/lib/firebase';
import { 
  Sparkles, 
  LogOut, 
  FileText, 
  HelpCircle, 
  BrainCircuit, 
  Layers, 
  Calendar, 
  Bot, 
  BarChart3, 
  Video, 
  Send, 
  X, 
  ArrowRight, 
  User, 
  Zap, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface Message {
  type: 'user' | 'ai';
  content: string;
}

interface HRChatbotProps {
  onSelectFunction: (functionName: string) => void;
}

interface Question {
  type: string;
  difficulty: string;
  question: string;
}

const IT_ROLES = [
  'AI/ML Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'DevOps Engineer',
  'Data Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'UI Developer'
];

const ROLE_REQUIREMENTS: { [key: string]: string[] } = {
  'AI/ML Engineer': [
    'Python',
    'Machine Learning',
    'Deep Learning',
    'TensorFlow/PyTorch',
    'Data Analysis',
    'Statistics',
    'MLOps',
    'Big Data'
  ],
  'Frontend Engineer': [
    'React',
    'JavaScript',
    'HTML/CSS',
    'TypeScript',
    'State Management',
    'Responsive Design',
    'Web Performance',
    'UI/UX Principles'
  ],
  'Backend Engineer': [
    'Node.js',
    'Python',
    'Java',
    'SQL',
    'REST APIs',
    'Microservices',
    'Database Design',
    'System Architecture'
  ],
  'Full Stack Engineer': [
    'Frontend Development',
    'Backend Development',
    'Database Management',
    'API Design',
    'System Architecture',
    'DevOps Practices',
    'Testing',
    'Security'
  ],
  'DevOps Engineer': [
    'CI/CD',
    'Docker',
    'Kubernetes',
    'AWS/Azure/GCP',
    'Infrastructure as Code',
    'Monitoring',
    'Logging',
    'Security'
  ],
  'Data Engineer': [
    'Python',
    'SQL',
    'ETL',
    'Data Warehousing',
    'Big Data',
    'Data Modeling',
    'Data Pipeline',
    'Data Quality'
  ],
  'Data Scientist': [
    'Python',
    'Machine Learning',
    'Statistics',
    'Data Analysis',
    'SQL',
    'Data Visualization',
    'Deep Learning',
    'Big Data'
  ],
  'Product Manager': [
    'Product Strategy',
    'Market Research',
    'User Stories',
    'Agile',
    'Analytics',
    'Stakeholder Management',
    'Roadmap Planning',
    'Product Metrics'
  ],
  'UX Designer': [
    'User Research',
    'Wireframing',
    'Prototyping',
    'Visual Design',
    'Interaction Design',
    'Design Systems',
    'Accessibility',
    'User Testing'
  ],
  'UI Developer': [
    'HTML/CSS',
    'JavaScript',
    'React',
    'UI Components',
    'Responsive Design',
    'Cross-browser',
    'Performance',
    'Accessibility'
  ]
};

const API_ENDPOINTS_WITH_CAREERPATH = {
  ...API_ENDPOINTS,
  careerpath: '/api/careerpath'
};

const HRChatbot: React.FC<HRChatbotProps> = ({ onSelectFunction }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>(''); // Store extracted text
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [numQuestions, setNumQuestions] = useState('5');
  const [questionTypes, setQuestionTypes] = useState(['technical', 'behavioral']);
  const [multipleResumes, setMultipleResumes] = useState<File[]>([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── New state for Schedule Interview ──
  const [schedCandidateName, setSchedCandidateName] = useState('');
  const [schedCandidateEmail, setSchedCandidateEmail] = useState('');
  const [schedJobTitle, setSchedJobTitle] = useState('');
  const [schedHrEmail, setSchedHrEmail] = useState('');
  const [schedDatetime, setSchedDatetime] = useState('');
  const [schedDuration, setSchedDuration] = useState('45');
  const [schedInterviewType, setSchedInterviewType] = useState('ai_assisted');
  const [schedCustomMeetLink, setSchedCustomMeetLink] = useState('');
  const [schedResult, setSchedResult] = useState<any>(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  // ── New state for Salary Prediction Benchmark ──
  const [salaryExperience, setSalaryExperience] = useState('');
  const [salaryEducation, setSalaryEducation] = useState('');
  const [salaryJobLevel, setSalaryJobLevel] = useState('');
  const [salaryIndustry, setSalaryIndustry] = useState('');
  const [salaryLocation, setSalaryLocation] = useState('Urban');
  const [salaryCurrency, setSalaryCurrency] = useState<'INR' | 'USD'>('INR');
  const [isExtractingSalary, setIsExtractingSalary] = useState(false);
  const [extractedCandidateName, setExtractedCandidateName] = useState('');

  // ── Handle Schedule Interview ──
  const handleScheduleInterview = async () => {
    if (!schedCandidateName || !schedJobTitle || !schedDatetime) {
      setSchedError('Candidate name, job title, aur date/time required hai.');
      return;
    }
    if (!schedCandidateEmail || !schedCandidateEmail.includes('@')) {
      setSchedError('Valid candidate/employee email address zaroori hai.');
      return;
    }
    setSchedLoading(true);
    setSchedError(null);
    setSchedResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s max timeout

    try {
      const payload = {
        candidate_name: schedCandidateName,
        candidate_email: schedCandidateEmail,
        job_title: schedJobTitle,
        job_id: 'hr_job_001',
        hr_email: schedHrEmail || 'hr@company.com',
        hr_id: 'hr_001',
        scheduled_datetime: new Date(schedDatetime).toISOString(),
        duration_minutes: Number(schedDuration) || 45,
        interview_type: schedInterviewType,
        auto_start_bot: schedInterviewType !== 'human',
      };
      const res = await fetch(FASTAPI_ENDPOINTS.scheduleInterview, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      setSchedResult(data);
      if (data.success && data.data) {
        const portalUrl = `/interactive-interview?id=${data.data?.interview_id}`;
        let linkDetails = '';
        if (schedInterviewType === 'human') {
          linkDetails = `🎥 Google Meet: ${data.data?.meet_link}`;
        } else if (schedInterviewType === 'technical') {
          linkDetails = `💻 Technical Assessment Room: ${window.location.origin}${portalUrl}`;
        } else {
          linkDetails = `🤖 AI Interview Room: ${window.location.origin}${portalUrl}`;
        }
        setMessages(prev => [...prev, {
          type: 'ai',
          content: `✅ Interview scheduled (${schedInterviewType.toUpperCase()})!\nInterview ID: ${data.data?.interview_id}\nCandidate: ${schedCandidateName} (${schedCandidateEmail})\n${linkDetails}\nEmail to Candidate: ${data.data?.email_sent ? '✅ Sent' : '⚠️ Failed'}`,
        }]);
      } else {
        const errMsg = data.errors?.[0]?.message || 'Interview scheduling failed. Please check details.';
        setSchedError(errMsg);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setSchedError('Request timeout: Server ne response dene me zyaada waqt liya. Kripya page refresh karein.');
      } else {
        setSchedError('FastAPI server se connect nahi ho saka. Port 8001 pe server run hai?');
      }
    } finally {
      setSchedLoading(false);
    }
  };

  // ── Auto-Extract Candidate Details from Resume for Salary Benchmark ──
  const handleAutoExtractSalary = async (targetFile?: File) => {
    const file = targetFile || resumeFile;
    if (!file && !resumeText) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: '⚠️ Please upload a candidate resume PDF first to extract salary details.'
      }]);
      return;
    }

    setIsExtractingSalary(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Extracting candidate profile from resume & calculating ${salaryCurrency} market salary benchmark...`
    }]);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('resume', file);
      }
      if (resumeText) {
        formData.append('resume_text', resumeText);
      }
      formData.append('currency', salaryCurrency);
      formData.append('location', salaryLocation || 'Urban');

      const endpoint = FASTAPI_ENDPOINTS.predictSalaryFromResume || API_ENDPOINTS.predictSalaryFromResume;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract candidate profile from resume');
      }

      const prof = data.candidate_profile;
      const pred = data.prediction;

      // Populate sidebar inputs with extracted parameters
      setSalaryExperience(prof.years_experience.toString());
      setSalaryEducation(prof.education_level);
      setSalaryJobLevel(prof.job_level);
      setSalaryIndustry(prof.industry);
      setExtractedCandidateName(prof.candidate_name || '');

      const isINR = salaryCurrency === 'INR';
      const mainSalary = isINR
        ? `₹${(pred.predicted_salary_inr || pred.predicted_salary).toLocaleString('en-IN')} / year (${pred.lpa || ((pred.predicted_salary_inr || pred.predicted_salary)/100000).toFixed(1)} LPA)`
        : `$${(pred.predicted_salary_usd || pred.predicted_salary).toLocaleString('en-US')} / year`;

      const rangeText = isINR
        ? `₹${pred.min_salary_inr?.toLocaleString('en-IN') || (pred.min_salary).toLocaleString('en-IN')} - ₹${pred.max_salary_inr?.toLocaleString('en-IN') || (pred.max_salary).toLocaleString('en-IN')} (${((pred.min_salary_inr || pred.min_salary)/100000).toFixed(1)} - ${((pred.max_salary_inr || pred.max_salary)/100000).toFixed(1)} LPA)`
        : `$${pred.min_salary_usd?.toLocaleString('en-US') || pred.min_salary?.toLocaleString('en-US')} - $${pred.max_salary_usd?.toLocaleString('en-US') || pred.max_salary?.toLocaleString('en-US')}`;

      const featureImportanceText = pred.feature_importance 
        ? Object.entries(pred.feature_importance)
            .map(([feature, importance]) => `  • ${feature}: ${importance}%`)
            .join('\n')
        : '';

      const formattedMessage = `
✅ Candidate Resume Analyzed: ${prof.candidate_name}
==================================================
💰 Predicted Annual Salary (${salaryCurrency}): ${mainSalary}
📊 Competitive Salary Range: ${rangeText}
🎯 Model Confidence: ${((pred.confidence || 0.89) * 100).toFixed(1)}%

🌍 Cross-Market Benchmark:
-------------------------
• Indian Market (INR): ₹${pred.predicted_salary_inr ? pred.predicted_salary_inr.toLocaleString('en-IN') : 'N/A'} / yr (${pred.lpa || 'N/A'} LPA)
• Global / US (USD): $${pred.predicted_salary_usd ? pred.predicted_salary_usd.toLocaleString('en-US') : 'N/A'} / yr

👤 Extracted Candidate Profile:
------------------------------
• Candidate Name: ${prof.candidate_name}
• Total Experience: ${prof.years_experience} Years
• Education Level: ${prof.education_level}
• Target Job Level: ${prof.job_level}
• Primary Industry: ${prof.industry}
• Location Tier: ${salaryLocation || 'Urban'}
${prof.skills && prof.skills.length > 0 ? `• Key Skills: ${prof.skills.slice(0, 6).join(', ')}` : ''}

Key Salary Factors (Feature Importance):
----------------------------------------
${featureImportanceText}

✨ Form fields in sidebar are auto-populated. You can adjust values and recalculate at any time.
      `;

      setMessages(prev => [...prev, {
        type: 'ai',
        content: formattedMessage.trim()
      }]);

    } catch (err: any) {
      console.error('Salary resume auto-extraction error:', err);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error extracting salary benchmark from resume: ${err.message}. You can manually enter details in the right sidebar.`
      }]);
    } finally {
      setIsExtractingSalary(false);
    }
  };

  // ── Handle Salary Prediction Benchmark ──
  const handleSalaryPrediction = async () => {
    if (!salaryExperience || !salaryEducation || !salaryJobLevel || !salaryIndustry || !salaryLocation) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: 'Please provide all required candidate details: years of experience, education level, job level, industry, and location.'
      }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Calculating ${salaryCurrency} market salary benchmark for ${salaryJobLevel} in ${salaryIndustry} (${salaryExperience} yrs exp, ${salaryEducation})`
    }]);

    try {
      const years_experience = parseFloat(salaryExperience);
      if (isNaN(years_experience) || years_experience < 0) {
        throw new Error('Please enter a valid positive number for years of experience');
      }

      const formData = new FormData();
      formData.append('years_experience', years_experience.toString());
      formData.append('education_level', salaryEducation);
      formData.append('job_level', salaryJobLevel);
      formData.append('industry', salaryIndustry);
      formData.append('location', salaryLocation);
      formData.append('currency', salaryCurrency);

      const response = await fetch(API_ENDPOINTS.predictSalary, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      const { predicted_salary, confidence, feature_importance } = result;
      const isINR = (salaryCurrency === 'INR');
      
      const formatted_salary = isINR
        ? `₹${(result.predicted_salary_inr || predicted_salary).toLocaleString('en-IN')} / year (${result.lpa || ((result.predicted_salary_inr || predicted_salary)/100000).toFixed(1)} LPA)`
        : `$${(result.predicted_salary_usd || predicted_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const rangeText = isINR
        ? `₹${result.min_salary_inr?.toLocaleString('en-IN') || result.min_salary?.toLocaleString('en-IN')} - ₹${result.max_salary_inr?.toLocaleString('en-IN') || result.max_salary?.toLocaleString('en-IN')} (${((result.min_salary_inr || result.min_salary)/100000).toFixed(1)} - ${((result.max_salary_inr || result.max_salary)/100000).toFixed(1)} LPA)`
        : `$${result.min_salary_usd?.toLocaleString('en-US') || result.min_salary?.toLocaleString('en-US')} - $${result.max_salary_usd?.toLocaleString('en-US') || result.max_salary?.toLocaleString('en-US')}`;

      const featureImportanceText = feature_importance 
        ? Object.entries(feature_importance)
            .map(([feature, importance]) => `  • ${feature}: ${importance}%`)
            .join('\n')
        : '';

      const formattedMessage = `
Candidate Market Salary Benchmark (${salaryCurrency}):
---------------------------------------------------
💰 Predicted Annual Salary: ${formatted_salary}
📊 Realistic Market Range: ${rangeText}
🎯 Model Confidence: ${((confidence || 0.89) * 100).toFixed(1)}%

🌍 Market Comparison:
--------------------
• Indian Market (INR): ₹${result.predicted_salary_inr ? result.predicted_salary_inr.toLocaleString('en-IN') : 'N/A'} / yr (${result.lpa || 'N/A'} LPA)
• Global / US (USD): $${result.predicted_salary_usd ? result.predicted_salary_usd.toLocaleString('en-US') : 'N/A'} / yr

Candidate Profile:
-----------------
${extractedCandidateName ? `• Candidate: ${extractedCandidateName}\n` : ''}• Experience: ${years_experience} Years
• Education: ${salaryEducation}
• Job Level: ${salaryJobLevel}
• Industry: ${salaryIndustry}
• Location Tier: ${salaryLocation}

Key Salary Factors (Feature Importance):
----------------------------------------
${featureImportanceText}

✨ Calibrated with Enterprise Compensation Model & Labor Market Analytics
      `;

      setMessages(prev => [...prev, {
        type: 'ai',
        content: formattedMessage.trim()
      }]);
    } catch (error) {
      console.error('Salary benchmark prediction error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error calculating salary benchmark: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (showChatbot) {
      setMessages([{
        type: 'ai',
        content: 'Hello! I can help you with various resume-related tasks. Please select a function:'
      }]);
    }
  }, [showChatbot]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!inputMessage.trim() || isProcessing) return;

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: inputMessage }]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Detect intent from user input
      const { intent, response } = await detectIntent(inputMessage, true);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { type: 'ai', content: response }]);

      // If intent is detected with high confidence, automatically select the feature
      if (intent) {
        // Map intent to function name
        const functionMap: { [key: string]: string } = {
          'resume_analysis': 'analysis',
          'resume_qa': 'qa',
          'interview_questions': 'questions',
          'multiple_resume': 'multiple',
          'resume_improvement': 'improvement',
          'salary_prediction': 'salary'
        };

        const functionName = functionMap[intent];
        if (functionName) {
          handleFunctionSelect(functionName);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: "I'm having trouble understanding your request. Please try again or select a feature from the buttons above."
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    }
  };

  const handleFunctionSelect = (functionName: string) => {
    if (selectedFunction === functionName) {
      setSelectedFunction(null);
      return;
    }
    
    setSelectedFunction(functionName);
    onSelectFunction(functionName);

    if (functionName === 'multiple') {
      navigate('/resumeAnalyzer');
    }
  };

  const displayMessages = messages.filter(
    m => !m.content.startsWith('Selected feature:') && !m.content.startsWith('Selected function:')
  );

  const navFeatures = [
    { id: 'analysis', label: 'Resume Analysis', icon: FileText, tooltip: 'Deep match candidate resume against job description.' },
    { id: 'qa', label: 'Resume Q&A', icon: HelpCircle, tooltip: 'Ask direct semantic questions about candidate resume.' },
    { id: 'questions', label: 'Interview Questions', icon: BrainCircuit, tooltip: 'Generate tailored interview questions with difficulty levels.' },
    { id: 'multiple', label: 'Screen 100s', icon: Layers, tooltip: 'Bulk screening and ranking for large resume sets.' },
    { id: 'schedule', label: 'Schedule Interview', icon: Calendar, tooltip: 'Create live AI interview room and dispatch candidate email invitation.' },
    { id: 'auto-interview', label: 'AI Pre-Screening', icon: Bot, tooltip: 'Instant AI candidate screening & benchmark simulation for HR (No email sent).' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, tooltip: 'Confidential scorecard and evaluations for HR recruiters.' },
    { id: 'salary', label: 'Salary Benchmark', icon: DollarSign, tooltip: 'Predict market salary benchmark based on candidate experience, education, and role.' },
    { id: 'meet-bot', label: 'Deploy Meet Bot', icon: Video, tooltip: 'Dispatch AI interviewer bot into Google Meet rooms.' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      setResumeText(''); // Clear stored text when new file is uploaded
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  const handleMultipleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setMultipleResumes(files);
      setMessages(prev => [...prev, {
        type: 'user',
        content: `Uploaded ${files.length} resumes for analysis`
      }]);
    }
  };

  const handleMultipleResumeAnalysis = async () => {
    if (multipleResumes.length === 0) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: 'Please upload at least one resume.'
      }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Analyzing ${multipleResumes.length} resumes`
    }]);

    try {
      const formData = new FormData();
      multipleResumes.forEach((file, index) => {
        formData.append(`resume_${index}`, file);
      });

      const response = await fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.[0]?.msg || errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      const analysisResult = `
Multiple Resume Analysis Results:
------------------------------
Total Resumes Analyzed: ${multipleResumes.length}

Summary:
${data.summary || 'No summary available'}

Top Candidates:
${data.top_candidates ? data.top_candidates.map((candidate: any, index: number) => 
  `${index + 1}. ${candidate.name || `Resume ${index + 1}`} - Match Score: ${candidate.match_score}%`
).join('\n') : 'No candidate data available'}
      `;

      setMessages(prev => [...prev, {
        type: 'ai',
        content: analysisResult
      }]);
    } catch (error) {
      console.error('Multiple resume analysis error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error analyzing resumes: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleAnalyzeResume = async () => {
    if (!resumeFile || !jobTitle || !jobDescription) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: 'Please provide all required information: resume file, job title, and job description.'
      }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Analyzing resume for ${jobTitle} position`
    }]);

    try {
      // Extract text from PDF once and store it for Q&A (non-blocking)
      if (!resumeText) {
        try {
          const extractedText = await extractTextFromPdf(resumeFile);
          setResumeText(extractedText);
          console.log('✅ Resume text extracted and stored for Q&A:', extractedText.length, 'characters');
        } catch (extractError) {
          console.warn('⚠️ Frontend PDF extraction failed (will extract on backend):', extractError);
          // Don't throw error - backend will extract the PDF for analysis
          // We'll try to extract again when Q&A is used
        }
      }

      const formData = new FormData();
      // Backend expects 'resume' + job_description + threshold
      formData.append('job_description', jobDescription);
      formData.append('threshold', String(50));
      formData.append('resume', resumeFile);

      const response = await fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.[0]?.msg || errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Handle both Flask (data.results array) and FastAPI (data is the result object) formats
      const first = Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : (data?.match_score !== undefined ? data : undefined);
      const rawScore = first?.similarity ?? first?.match_score ?? 0;
      const matchScore = typeof rawScore === 'number'
        ? (rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore))
        : 0;
      const matchingSkills = Array.isArray(first?.matching_skills) ? first.matching_skills : [];
      const missingSkills = Array.isArray(first?.missing_skills) ? first.missing_skills : [];
      let strengthsArr = (Array.isArray(first?.strengths) ? first.strengths : [])
        .filter((s: string) => s && !s.toLowerCase().includes('unable to generate'));
      if (strengthsArr.length === 0 && matchingSkills.length > 0) {
        strengthsArr = [
          `Demonstrated proficiency in ${matchingSkills.slice(0, 3).join(', ')}`,
          'Relevant professional experience aligned with core role requirements',
          'Solid operational execution and team collaboration track record'
        ];
      }

      let improvements = (Array.isArray(first?.areas_for_improvement)
        ? first.areas_for_improvement
        : (Array.isArray(first?.improvement_areas) ? first.improvement_areas : []))
        .filter((a: string) => a && !a.toLowerCase().includes('unable to generate'));
      // Fallback: derive from missing skills or best practice recommendations
      if (!improvements || improvements.length === 0) {
        if (Array.isArray(missingSkills) && missingSkills.length > 0) {
          improvements = missingSkills.map((skill: string) => `Strengthen ${skill} with hands-on projects and practice`);
        } else {
          improvements = [
            'Continue deepening advanced technical and domain methodologies',
            'Acquire targeted professional certifications for emerging toolsets'
          ];
        }
      }

      const analysisResult = `
Resume Analysis Results:
------------------------
Match Score: ${matchScore}%

Matching Skills:
${matchingSkills.map((skill: string) => `- ${skill}`).join('\n')}

Missing Skills:
${missingSkills.map((skill: string) => `- ${skill}`).join('\n')}

Strengths:
${strengthsArr.map((strength: string) => `- ${strength}`).join('\n')}

Areas for Improvement:
${improvements.map((area: string) => `- ${area}`).join('\n')}
      `;

      setMessages(prev => [...prev, {
        type: 'ai',
        content: analysisResult
      }]);
    } catch (error) {
      console.error('Analysis error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error analyzing resume: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQASubmit = async () => {
    if (!resumeFile || !question) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: 'Please provide both resume and question.'
      }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Question: ${question}`
    }]);

    try {
      // Use stored resume text or extract if not available
      let textToUse = resumeText;
      let sendFile = false;
      
      if (!textToUse) {
        console.log('⚠️ Resume text not found in state, attempting to extract from PDF...');
        try {
          textToUse = await extractTextFromPdf(resumeFile);
          setResumeText(textToUse);
          console.log('✅ Resume text extracted successfully:', textToUse.length, 'characters');
        } catch (extractError) {
          console.warn('⚠️ Frontend extraction failed, will send PDF to backend:', extractError);
          // Instead of throwing error, we'll send the file to backend
          sendFile = true;
        }
      } else {
        console.log('✅ Using stored resume text:', textToUse.length, 'characters');
      }

      if (sendFile) {
        // Flask QA endpoint expects JSON only (resume_text + question)
        // If we failed to extract text on the frontend, abort with guidance
        throw new Error('Resume text extraction failed. Please try again or upload a clearer PDF.');
      }

      const formData = new FormData();
      if (sendFile) {
        formData.append('resume_file', resumeFile);
      } else {
        formData.append('resume_text', textToUse || '');
      }
      formData.append('question', question);

      const response = await fetch(API_ENDPOINTS.qa, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.[0]?.msg || errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Format the answer if it's an array of bullet points
      const formattedAnswer = Array.isArray(data.answer) 
        ? data.answer.join('\n')
        : data.answer || 'I apologize, but I could not generate an answer for your question. Please try rephrasing your question.';

      setMessages(prev => [...prev, {
        type: 'ai',
        content: formattedAnswer
      }]);
    } catch (error) {
      console.error('Q&A error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error processing question: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsAnalyzing(false);
      setQuestion(''); // Clear the question input after submission
    }
  };

  const handleInterviewQuestions = async () => {
    if (!resumeFile) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: 'Please upload a resume first.'
      }]);
      return;
    }

    setIsAnalyzing(true);
    setMessages(prev => [...prev, {
      type: 'user',
      content: `Generating ${numQuestions} ${difficulty} interview questions (${questionTypes.join(', ')})`
    }]);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('difficulty', difficulty);
      formData.append('num_questions', numQuestions);
      formData.append('question_types', JSON.stringify(questionTypes));

      const response = await fetch(API_ENDPOINTS.questions, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.[0]?.msg || errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Format the questions for display
      const formattedQuestions = data.questions.map((q: Question, index: number) => `
Question ${index + 1} (${q.type}, ${q.difficulty}):
${q.question}
      `).join('\n');

      setMessages(prev => [...prev, {
        type: 'ai',
        content: formattedQuestions
      }]);
    } catch (error) {
      console.error('Questions generation error:', error);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Error generating questions: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderResumeUpload = () => (
    <div>
      <label className="text-white mb-2 block">Resume (PDF)</label>
      <Input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="text-white"
      />
    </div>
  );

  const renderInputSection = () => {
    switch (selectedFunction) {
      case 'analysis':
        return (
          <div className="space-y-4">
            {renderResumeUpload()}
            <div>
              <label className="text-white mb-2 block">Job Title</label>
              <Input 
                placeholder="Enter job title" 
                className="text-white"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-white mb-2 block">Job Description</label>
              <Input 
                placeholder="Enter job description" 
                className="text-white"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleAnalyzeResume}
              disabled={isAnalyzing || !resumeFile}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
            </Button>
          </div>
        );

      case 'qa':
        return (
          <div className="space-y-4">
            {renderResumeUpload()}
            <div>
              <label className="text-white mb-2 block">Your Question</label>
              <Input 
                placeholder="Ask a question about the resume" 
                className="text-white"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQASubmit()}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleQASubmit}
              disabled={isAnalyzing || !resumeFile || !question.trim()}
            >
              {isAnalyzing ? 'Processing...' : 'Ask Question'}
            </Button>
          </div>
        );

      case 'questions':
        return (
          <div className="space-y-4">
            {renderResumeUpload()}
            <div>
              <label className="text-white mb-2 block">Number of Questions</label>
              <Select value={numQuestions} onValueChange={setNumQuestions}>
                <SelectTrigger className="text-white">
                  <SelectValue placeholder="Select number of questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-white mb-2 block">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="text-white">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-white mb-2 block">Question Types</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="technical"
                    checked={questionTypes.includes('technical')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'technical']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'technical'));
                      }
                    }}
                  />
                  <label htmlFor="technical" className="text-white">Technical</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="behavioral"
                    checked={questionTypes.includes('behavioral')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'behavioral']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'behavioral'));
                      }
                    }}
                  />
                  <label htmlFor="behavioral" className="text-white">Behavioral</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="situational"
                    checked={questionTypes.includes('situational')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'situational']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'situational'));
                      }
                    }}
                  />
                  <label htmlFor="situational" className="text-white">Situational</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="problem-solving"
                    checked={questionTypes.includes('problem-solving')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'problem-solving']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'problem-solving'));
                      }
                    }}
                  />
                  <label htmlFor="problem-solving" className="text-white">Problem Solving</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="leadership"
                    checked={questionTypes.includes('leadership')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'leadership']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'leadership'));
                      }
                    }}
                  />
                  <label htmlFor="leadership" className="text-white">Leadership</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="culture-fit"
                    checked={questionTypes.includes('culture-fit')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionTypes(prev => [...prev, 'culture-fit']);
                      } else {
                        setQuestionTypes(prev => prev.filter(t => t !== 'culture-fit'));
                      }
                    }}
                  />
                  <label htmlFor="culture-fit" className="text-white">Culture Fit</label>
                </div>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={handleInterviewQuestions}
              disabled={isAnalyzing || !resumeFile || questionTypes.length === 0}
            >
              {isAnalyzing ? 'Generating...' : 'Generate Questions'}
            </Button>
          </div>
        );

      case 'multiple':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-white mb-2 block">Multiple Resumes (PDF)</label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleMultipleFileChange}
                className="text-white"
                multiple
              />
            </div>
            <div>
              <label className="text-white mb-2 block">Job Title</label>
              <Input 
                placeholder="Enter job title" 
                className="text-white"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-white mb-2 block">Job Description</label>
              <Input 
                placeholder="Enter job description" 
                className="text-white"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              onClick={handleMultipleResumeAnalysis}
              disabled={isAnalyzing || multipleResumes.length === 0}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Multiple Resumes'}
            </Button>
          </div>
        );

      // ── Schedule Interview ──
      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-white mb-1 block text-sm">Candidate Name *</label>
              <Input placeholder="Ali Hassan" className="text-white bg-slate-800 border-slate-600"
                value={schedCandidateName} onChange={e => setSchedCandidateName(e.target.value)} />
            </div>
            <div>
              <label className="text-white mb-1 block text-sm">Candidate Email *</label>
              <Input type="email" placeholder="candidate@email.com" className="text-white bg-slate-800 border-slate-600"
                autoComplete="off"
                value={schedCandidateEmail} onChange={e => setSchedCandidateEmail(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Candidate's email where interview invitation & calendar invite (.ics) will be sent.</p>
            </div>
            <div>
              <label className="text-white mb-1 block text-sm">Job Title *</label>
              <Input placeholder="Backend Engineer" className="text-white bg-slate-800 border-slate-600"
                value={schedJobTitle} onChange={e => setSchedJobTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-white mb-1 block text-sm">HR / Recruiter Email</label>
              <Input type="email" placeholder="hr@company.com" className="text-white bg-slate-800 border-slate-600"
                autoComplete="off"
                value={schedHrEmail} onChange={e => setSchedHrEmail(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Optional. Recruiter will receive a confirmation copy.</p>
            </div>
            <div>
              <label className="text-white mb-1 block text-sm">Date & Time *</label>
              <Input type="datetime-local" className="text-white bg-slate-800 border-slate-600"
                value={schedDatetime} onChange={e => setSchedDatetime(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-white mb-1 block text-sm">Duration (mins)</label>
                <Input type="number" className="text-white bg-slate-800 border-slate-600"
                  value={schedDuration} onChange={e => setSchedDuration(e.target.value)} />
              </div>
              <div>
                <label className="text-white mb-1 block text-sm">Type</label>
                <Select value={schedInterviewType} onValueChange={setSchedInterviewType}>
                  <SelectTrigger className="text-white bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_assisted">🤖 AI Assisted</SelectItem>
                    <SelectItem value="technical">💻 Technical</SelectItem>
                    <SelectItem value="human">👤 Human</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {schedError && (
              <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{schedError}</div>
            )}
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              onClick={handleScheduleInterview} disabled={schedLoading}>
              {schedLoading ? <><Spinner className="mr-2 h-4 w-4" /> Scheduling...</> : '📅 Schedule + Generate Meet Link'}
            </Button>
            {schedResult?.success && schedResult.data && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
                <p className="text-green-400 font-semibold text-sm">✅ Interview Scheduled Successfully!</p>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <p>ID: <code className="text-cyan-400">{schedResult.data.interview_id}</code></p>
                  <p>Candidate: <span className="text-white font-medium">{schedCandidateName}</span> (<span className="text-cyan-300 font-medium">{schedCandidateEmail}</span>)</p>
                  
                  <div className="flex flex-wrap gap-2 pt-1 pb-1">
                    {schedInterviewType === 'human' ? (
                      <a href={schedResult.data.meet_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold hover:bg-blue-600/40 transition-colors">
                        🎥 Join Google Meet
                      </a>
                    ) : schedInterviewType === 'technical' ? (
                      <a href={`/interactive-interview?id=${schedResult.data.interview_id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-600/40 transition-colors">
                        💻 Open Technical Assessment Room
                      </a>
                    ) : (
                      <a href={`/interactive-interview?id=${schedResult.data.interview_id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold hover:bg-cyan-500/30 transition-colors">
                        🚀 Open AI Interview Room
                      </a>
                    )}
                    {(schedResult.data.google_calendar_add_url || schedResult.data.calendar_link) && (
                      <a href={schedResult.data.google_calendar_add_url || schedResult.data.calendar_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-semibold hover:bg-blue-500/30 transition-colors">
                        📅 Add to Google Calendar
                      </a>
                    )}
                  </div>
                  
                  <p className="text-emerald-400 font-medium">
                    {schedResult.data.email_sent ? `✅ Invitation & Calendar Invite sent to ${schedCandidateEmail}` : '⚠️ Failed to send candidate email'}
                  </p>
                  {schedHrEmail && <p className="text-slate-400">HR Notification: Confirmation copy sent to {schedHrEmail}</p>}
                </div>
              </div>
            )}
          </div>
        );

      // ── Auto Interview ──
      case 'auto-interview':
        return (
          <div className="h-full">
            <AutoInterview
              resumeFile={resumeFile}
              resumeText={resumeText}
              analysis={null}
            />
          </div>
        );

      // ── Analytics ──
      case 'analytics':
        return (
          <div className="h-full">
            <InterviewAnalytics />
          </div>
        );

      // ── Meet Bot ──
      case 'meet-bot':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-white mb-1 block text-sm">Google Meet Link</label>
              <Input 
                placeholder="https://meet.google.com/xxx-xxxx-xxx" 
                className="text-white bg-slate-800 border-slate-600"
                id="meet-bot-link"
              />
            </div>
            <div>
              <label className="text-white mb-1 block text-sm">Bot Name (Optional)</label>
              <Input 
                placeholder="AI Interviewer Bot" 
                className="text-white bg-slate-800 border-slate-600"
                id="meet-bot-name"
              />
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600"
              onClick={async () => {
                const link = (document.getElementById('meet-bot-link') as HTMLInputElement).value;
                const name = (document.getElementById('meet-bot-name') as HTMLInputElement).value;
                if (!link) return alert('Enter a Meet link first!');
                
                try {
                  const res = await fetch(FASTAPI_ENDPOINTS.botJoin, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ meeting_url: link, bot_name: name || 'AI Interviewer' })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert('Bot deployment requested! ID: ' + (data.bot_id || data.message || 'Success'));
                  } else {
                    alert('Error deploying bot: ' + JSON.stringify(data));
                  }
                } catch(err) {
                  alert('Network error connecting to FastAPI bot manager.');
                }
              }}
            >
              🚀 Send Bot to Meeting
            </Button>
          </div>
        );

      // ── Salary Prediction / Benchmark ──
      case 'salary':
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
              💡 Calculate realistic, industry-calibrated salary benchmarks for candidates based on real-world compensation analytics.
            </div>

            {/* Resume Auto-Extraction Section */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-teal-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Resume-Based Auto Benchmark</span>
                </span>
                <span className="text-[10px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/20 font-medium">
                  AI Powered
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Upload or use candidate resume to auto-detect experience, education, job level, and calculate realistic benchmark.
              </p>

              {resumeFile ? (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-teal-200 bg-teal-950/40 border border-teal-800/50 rounded-lg p-2 flex items-center justify-between">
                    <span className="truncate max-w-[200px]">📄 {resumeFile.name}</span>
                    <span className="text-[10px] text-teal-400 font-semibold">Active</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleAutoExtractSalary()}
                    disabled={isExtractingSalary || isAnalyzing}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-semibold text-xs py-2 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {isExtractingSalary ? (
                      <>
                        <Spinner className="h-3.5 w-3.5 mr-1" /> Analyzing Resume & Benchmark...
                      </>
                    ) : (
                      '⚡ Auto-Extract & Predict from this Resume'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="text-[11px] text-slate-300 mb-1 block">Upload Candidate Resume (PDF)</label>
                  <Input
                    type="file"
                    accept=".pdf"
                    className="text-white text-xs bg-slate-800 border-slate-700"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setResumeFile(f);
                        setPdfUrl(URL.createObjectURL(f));
                        await handleAutoExtractSalary(f);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div>
              <label className="text-white mb-1.5 block text-xs font-semibold">Compensation Market & Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSalaryCurrency('INR')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    salaryCurrency === 'INR'
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)]'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  🇮🇳 INR (₹ LPA - India)
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryCurrency('USD')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    salaryCurrency === 'USD'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  🌐 USD ($ - US/Global)
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                Candidate Profile Parameters
              </span>
              <div>
                <label className="text-white mb-1.5 block text-xs font-medium">Years of Experience</label>
                <Input 
                  type="number"
                  placeholder="e.g. 1" 
                  className="text-white bg-slate-800 border-slate-700 text-xs"
                  value={salaryExperience}
                  onChange={(e) => setSalaryExperience(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-white mb-1.5 block text-xs font-medium">Education Level</label>
              <Select value={salaryEducation} onValueChange={setSalaryEducation}>
                <SelectTrigger className="text-white bg-slate-800 border-slate-700 text-xs">
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="Associate">Associate (Diploma / 2-Year)</SelectItem>
                  <SelectItem value="Bachelor">Bachelor (B.Tech / B.E / B.Sc / BCA)</SelectItem>
                  <SelectItem value="Master">Master (M.Tech / MCA / MBA / MS)</SelectItem>
                  <SelectItem value="PhD">PhD / Doctorate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white mb-1.5 block text-xs font-medium">Job Level</label>
              <Select value={salaryJobLevel} onValueChange={setSalaryJobLevel}>
                <SelectTrigger className="text-white bg-slate-800 border-slate-700 text-xs">
                  <SelectValue placeholder="Select job level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="Entry-level">Entry-level (0-2 Years)</SelectItem>
                  <SelectItem value="Mid-level">Mid-level (2-5 Years)</SelectItem>
                  <SelectItem value="Senior">Senior (5-10 Years)</SelectItem>
                  <SelectItem value="Executive">Executive / Lead (10+ Years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white mb-1.5 block text-xs font-medium">Industry</label>
              <Select value={salaryIndustry} onValueChange={setSalaryIndustry}>
                <SelectTrigger className="text-white bg-slate-800 border-slate-700 text-xs">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="Technology">Technology / IT</SelectItem>
                  <SelectItem value="Finance">Finance & Banking</SelectItem>
                  <SelectItem value="Healthcare">Healthcare & Pharma</SelectItem>
                  <SelectItem value="Education">Education & EdTech</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Retail">Retail & E-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white mb-1.5 block text-xs font-medium">Location Tier</label>
              <Select value={salaryLocation} onValueChange={setSalaryLocation}>
                <SelectTrigger className="text-white bg-slate-800 border-slate-700 text-xs">
                  <SelectValue placeholder="Select location tier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="Urban">Urban (Tier-1 Metro: Bangalore, Mumbai, Delhi, NCR, Pune, Hyd)</SelectItem>
                  <SelectItem value="Suburban">Suburban (Tier-2 Cities: Jaipur, Ahmedabad, Chandigarh, Indore)</SelectItem>
                  <SelectItem value="Rural">Rural / Tier-3 / Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-semibold py-2.5 rounded-xl shadow-lg transition-all text-xs"
              onClick={handleSalaryPrediction}
              disabled={isAnalyzing || isExtractingSalary || !salaryExperience || !salaryEducation || !salaryJobLevel || !salaryIndustry || !salaryLocation}
            >
              {isAnalyzing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Calculating Benchmark...
                </>
              ) : (
                `💰 Calculate ${salaryCurrency} Market Benchmark`
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Main Left / Chat / Dashboard View */}
      <div className={`flex flex-col ${selectedFunction ? 'w-[64%] xl:w-[68%]' : 'w-full'} relative transition-all duration-300`}>
        <ParticleBackground />

        {/* Modern Glassmorphic Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg overflow-hidden">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between px-3 md:px-5 py-2 gap-2">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                    VIAMOD SOLUTION
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 rounded uppercase">
                    AI AGENT
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Pills - Auto-managed space with NO scrollbars */}
            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-center gap-1 xl:gap-1.5 py-0.5 px-1 overflow-hidden">
              <TooltipProvider delayDuration={100}>
                {navFeatures.map((item) => {
                  const Icon = item.icon;
                  const isActive = selectedFunction === item.id;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleFunctionSelect(item.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] xl:text-xs font-medium transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/30 to-indigo-600/30 border border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                              : 'text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-850 border border-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 border border-white/10 text-slate-200 p-2.5 max-w-xs text-xs shadow-xl">
                        <p>{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Live engine pill */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live</span>
              </div>

              {/* HR Profile badge */}
              <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/70 border border-white/10 text-slate-300 text-xs">
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[8px]">
                  HR
                </div>
                <span className="font-medium text-[11px]">Recruiter</span>
              </div>

              {/* LOGOUT BUTTON */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all shadow-sm"
                title="Sign out from HR Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <ScrollArea className="h-full flex-1">
            <div className="p-4 md:p-6 space-y-4">
              {/* If no active conversation or fresh screen, show Executive Command Center Hub */}
              {displayMessages.length <= 1 && !isAnalyzing && (
                <div className="max-w-5xl mx-auto py-8 px-2 flex flex-col items-center text-center">
                  {/* Glowing pill badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Autonomous Talent Intelligence Suite</span>
                  </div>

                  {/* Main Heading */}
                  <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                    Enterprise <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">AI Recruitment Command</span> Center
                  </h1>
                  <p className="text-slate-400 max-w-2xl text-xs md:text-sm mb-8 leading-relaxed font-normal">
                    Screen candidates with ATS intelligence, schedule automated AI interviews with direct email invitations, conduct hands-free voice interviews, and inspect confidential recruiter scorecards.
                  </p>

                  {/* 5 Feature Launch Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full text-left mb-8">
                    {/* Card 1: Schedule Interview */}
                    <div 
                      onClick={() => handleFunctionSelect('schedule')}
                      className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-cyan-400/50 p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                            Auto-Invite
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-cyan-300 transition-colors">
                          Schedule AI Interview
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Generate AI interview session link and auto-send invitation to candidate email.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-cyan-400 font-semibold">
                        <span>Launch Scheduler</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Card 2: Auto Voice Interview */}
                    <div 
                      onClick={() => handleFunctionSelect('auto-interview')}
                      className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-400/50 p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                            <Bot className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                            Real Voice
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-indigo-300 transition-colors">
                          Auto AI Interviewer
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Conduct hands-free voice interviews with interactive humanoid bot avatar.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-indigo-400 font-semibold">
                        <span>Open Live Room</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Card 3: Resume Screening */}
                    <div 
                      onClick={() => handleFunctionSelect('analysis')}
                      className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-emerald-400/50 p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            ATS Parser
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-emerald-300 transition-colors">
                          Resume Analysis
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Parse candidate tech stack, calculate job fit score, and identify skill gaps.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-emerald-400 font-semibold">
                        <span>Analyze Resume</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Card 4: Interview Analytics */}
                    <div 
                      onClick={() => handleFunctionSelect('analytics')}
                      className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-amber-400/50 p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Confidential
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-amber-300 transition-colors">
                          Talent Analytics
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Review candidate scores, audio transcript answers, and hiring recommendation.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-amber-400 font-semibold">
                        <span>View Scorecards</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Card 5: Salary Benchmark */}
                    <div 
                      onClick={() => handleFunctionSelect('salary')}
                      className="group cursor-pointer rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-teal-400/50 p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(20,184,166,0.15)] hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                            ML Model
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-teal-300 transition-colors">
                          Salary Benchmark
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Predict competitive market salary benchmarks with XGBoost machine learning model.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-teal-400 font-semibold">
                        <span>Predict Salary</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Suggestion Chips */}
                  <div className="w-full">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>One-Click Copilot Prompts</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[
                        "Schedule AI interview for Full Stack Developer",
                        "Predict market salary benchmark for 5 years Senior Tech Lead",
                        "Generate 10 technical questions for Data Scientist",
                        "Screen multiple candidate resumes for React Lead",
                        "Show latest candidate interview scorecard"
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputMessage(prompt);
                          }}
                          className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span className="text-cyan-400 font-bold">✦</span>
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {isAnalyzing && (
                <div className="flex items-center space-x-2 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 max-w-md mx-auto">
                  <Spinner className="h-4 w-4" />
                  <span className="text-xs font-medium">AI Copilot is analyzing and generating response...</span>
                </div>
              )}

              {displayMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} px-2`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-900 border border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    }`}>
                      {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg border border-blue-400/20'
                          : 'bg-slate-900/90 backdrop-blur-md border border-white/10 text-slate-100 shadow-xl'
                      }`}
                    >
                      {message.type === 'ai' ? (
                        <div className="space-y-2">
                          {message.content.split('\n').map((line, lineIndex) => {
                            if (line.endsWith(':') && ['Results:', 'Content:', 'Details:', 'Breakdown:'].some(header => line.includes(header))) {
                              return (
                                <div key={lineIndex} className="text-sm font-bold text-cyan-300 border-b border-cyan-500/20 pb-1 mb-2">
                                  {line}
                                </div>
                              );
                            }
                            if (line.startsWith('- ')) {
                              return (
                                <div key={lineIndex} className="flex items-start space-x-2 mb-1">
                                  <span className="text-cyan-400 font-bold">•</span>
                                  <span>{line.substring(2)}</span>
                                </div>
                              );
                            }
                            if (line.match(/^\d+\./)) {
                              return (
                                <div key={lineIndex} className="flex items-start space-x-2">
                                  <span className="text-blue-400 font-semibold">{line.match(/^\d+\./)[0]}</span>
                                  <span>{line.substring(line.indexOf('.') + 1)}</span>
                                </div>
                              );
                            }
                            if (line.match(/[A-Z\s]{4,}/) || line.includes('$') || line.includes('%')) {
                              return (
                                <div key={lineIndex} className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20 text-cyan-200">
                                  {line}
                                </div>
                              );
                            }
                            return <div key={lineIndex}>{line}</div>;
                          })}
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Floating Bottom Input Dock */}
          <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent relative z-20">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/10 focus-within:border-cyan-500/50 shadow-2xl transition-all">
                <div className="pl-3 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type message or select a feature above..."
                  className="flex-1 bg-transparent border-0 text-white placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs md:text-sm"
                  disabled={isProcessing}
                />
                <Button
                  type="submit"
                  disabled={isProcessing || !inputMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold px-4 rounded-xl shadow-lg transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Spinner className="mr-1.5 h-3.5 w-3.5" />
                      <span className="text-xs">Processing...</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Drawer Panel with Close X */}
      {selectedFunction && (
        <div className="w-[36%] xl:w-[32%] border-l border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl relative z-20 flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  {selectedFunction === 'analysis' && 'Resume Analysis'}
                  {selectedFunction === 'qa' && 'Resume Q&A'}
                  {selectedFunction === 'questions' && 'Interview Questions'}
                  {selectedFunction === 'multiple' && 'Multiple Resumes'}
                  {selectedFunction === 'schedule' && 'Schedule AI Interview'}
                  {selectedFunction === 'auto-interview' && 'AI Candidate Pre-Screening'}
                  {selectedFunction === 'analytics' && 'Interview Analytics'}
                  {selectedFunction === 'salary' && 'Salary Prediction & Market Benchmark'}
                  {selectedFunction === 'meet-bot' && 'Deploy Meet Bot'}
                </h2>
                <p className="text-[10px] text-slate-400">Enterprise AI Recruitment</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFunction(null)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Drawer Body Scroll */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Input Section */}
              <div className="space-y-4">
                {renderInputSection()}
              </div>
              
              {/* Resume Preview Section */}
              {pdfUrl && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Resume Document Preview</span>
                  </h3>
                  <iframe
                    src={pdfUrl}
                    className="w-full h-96 border border-slate-700 rounded-xl shadow-lg"
                    title="PDF Preview"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default HRChatbot; 