// API configuration for the application

// Flask backend (port 5000) - Basic features
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// FastAPI backend (port 8001) - Advanced AI features
export const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8001';

// Flask API endpoints (existing features)
export const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/api/analyze`,
  qa: `${API_BASE_URL}/api/qa`,
  questions: `${API_BASE_URL}/api/questions`,
  improve: `${API_BASE_URL}/api/improve`,
  improvedResume: `${API_BASE_URL}/api/improved-resume`,
  generateMessage: `${API_BASE_URL}/api/generate-message`,
  processAction: `${API_BASE_URL}/api/process-action`,
  sendAcceptance: `${API_BASE_URL}/api/send-acceptance`,
  downloadCsv: `${API_BASE_URL}/api/download-csv`,
  testExtraction: `${API_BASE_URL}/api/extract-text`,
  testSimilarity: `${API_BASE_URL}/api/test-similarity`,
  predictSalary: `${API_BASE_URL}/api/predict-salary`,
  predictJobPossibility: `${API_BASE_URL}/api/predict-job-possibility`,
};

// FastAPI endpoints (advanced AI features - main.py port 8001)
export const FASTAPI_ENDPOINTS = {
  // Resume Analysis
  analyzeResume: `${FASTAPI_BASE_URL}/api/analyze`,

  // Interview Scheduling
  scheduleInterview: `${FASTAPI_BASE_URL}/api/interviews/schedule`,
  getInterview: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}`,
  getInterviewStatus: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/status/${id}`,

  // Question Generation (Advanced)
  generateQuestions: `${FASTAPI_BASE_URL}/api/questions/generate`,
  getQuestions: (interviewId: string) => `${FASTAPI_BASE_URL}/api/questions/${interviewId}`,
  submitAnswer: `${FASTAPI_BASE_URL}/api/questions/answer`,
  questionAnalytics: (interviewId: string) => `${FASTAPI_BASE_URL}/api/questions/analytics/${interviewId}`,

  // Interview Conduct
  startInteractive: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/start-interactive`,
  conductInterview: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/conduct`,
  processAnswer: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/process-answer`,
  updateCandidate: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/update-candidate`,
  autoConductInterview: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/auto-conduct`,
  resetInterview: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/reset`,
  speakQuestion: (id: string) => `${FASTAPI_BASE_URL}/api/interviews/${id}/speak`,

  // STT (Speech-to-Text)
  sttTranscribe: `${FASTAPI_BASE_URL}/api/stt/transcribe`,
  sttTranscribeFile: `${FASTAPI_BASE_URL}/api/stt/transcribe/file`,
  sttStreamChunk: `${FASTAPI_BASE_URL}/api/stt/stream/chunk`,
  sttTranscript: (sessionId: string) => `${FASTAPI_BASE_URL}/api/stt/transcript/${sessionId}`,
  sttHealth: `${FASTAPI_BASE_URL}/api/stt/health`,

  // TTS (Text-to-Speech)
  ttsSpeak: `${FASTAPI_BASE_URL}/api/tts/speak`,
  ttsStream: `${FASTAPI_BASE_URL}/api/tts/stream`,
  ttsGet: (id: string) => `${FASTAPI_BASE_URL}/api/tts/${id}`,

  // Meet Bot
  botJoin: `${FASTAPI_BASE_URL}/api/bot/join-meeting`,
  botLeave: (botId: string) => `${FASTAPI_BASE_URL}/api/bot/leave-meeting/${botId}`,
  botStatus: (botId: string) => `${FASTAPI_BASE_URL}/api/bot/${botId}`,

  // Google Meet Integration
  meetStart: `${FASTAPI_BASE_URL}/api/meet/start`,
  meetStop: `${FASTAPI_BASE_URL}/api/meet/stop`,
  meetStatus: (sessionId: string) => `${FASTAPI_BASE_URL}/api/meet/status/${sessionId}`,
  meetTranscript: (sessionId: string) => `${FASTAPI_BASE_URL}/api/meet/transcript/${sessionId}`,
  meetTrigger: (interviewId: string) => `${FASTAPI_BASE_URL}/api/meet/trigger/${interviewId}`,

  // Meet Interview (Full Flow)
  meetInterviewStart: `${FASTAPI_BASE_URL}/api/meet-interview/start`,
  meetInterviewStatus: (id: string) => `${FASTAPI_BASE_URL}/api/meet-interview/status/${id}`,

  // Orchestration (Real-time STT → LLM → TTS)
  orchestrationStart: `${FASTAPI_BASE_URL}/api/orchestration/start`,
  orchestrationProcessTurn: `${FASTAPI_BASE_URL}/api/orchestration/process-turn`,
  orchestrationEnd: (sessionId: string) => `${FASTAPI_BASE_URL}/api/orchestration/end/${sessionId}`,
  orchestrationGet: (sessionId: string) => `${FASTAPI_BASE_URL}/api/orchestration/${sessionId}`,

  // Analytics (Post-Interview)
  analyzeSession: (sessionId: string) => `${FASTAPI_BASE_URL}/api/analytics/analyze/${sessionId}`,
  getAnalyticsReport: (sessionId: string) => `${FASTAPI_BASE_URL}/api/analytics/report/${sessionId}`,

  // Dashboard
  dashboardMetrics: `${FASTAPI_BASE_URL}/api/dashboard/metrics`,
  activeSessions: `${FASTAPI_BASE_URL}/api/dashboard/sessions/active`,
  sessionDetail: (sessionId: string) => `${FASTAPI_BASE_URL}/api/dashboard/session/${sessionId}`,
  dashboardWs: `${FASTAPI_BASE_URL.replace('http', 'ws')}/api/dashboard/ws`,

  // ML Predictions (FastAPI version)
  predictSalary: `${FASTAPI_BASE_URL}/api/predict-salary`,
  predictJobPossibility: `${FASTAPI_BASE_URL}/api/predict-job-possibility`,

  // Resume Upload (FastAPI)
  uploadResume: `${FASTAPI_BASE_URL}/api/resumes/upload`,

  // Auth
  authLogin: `${FASTAPI_BASE_URL}/api/auth/login`,
  authRegister: `${FASTAPI_BASE_URL}/api/auth/register`,
  authUser: (uid: string) => `${FASTAPI_BASE_URL}/api/auth/user/${uid}`,
  authUsersRole: (role: string) => `${FASTAPI_BASE_URL}/api/auth/users/role/${role}`,
  authUpdateRole: (uid: string) => `${FASTAPI_BASE_URL}/api/auth/user/${uid}/role`,
  authDeleteUser: (userId: string) => `${FASTAPI_BASE_URL}/api/auth/user/${userId}`,

  // Security
  createSession: `${FASTAPI_BASE_URL}/api/security/session/create`,
  verifySession: `${FASTAPI_BASE_URL}/api/security/session/verify`,

  // WebSocket
  audioWs: (interviewId: string) => `${FASTAPI_BASE_URL.replace('http', 'ws')}/ws/audio/${interviewId}`,
};