'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, Send, ArrowRight } from 'lucide-react';

interface Message {
  text: string;
  isUser: boolean;
}

interface ChatbotProps {
  messages?: string[];
  delay?: number;
  startDelay?: number;
  restartDelay?: number;
  loop?: boolean;
}

export default function Chatbot({
  messages = [
    "Hello! I'm your Viamod AI Recruiter & Talent Assistant. How can I assist you today? 👋",
    "I'd like to analyze this full-stack candidate's resume and generate interview questions.",
    "Analyzing resume... Found 6+ years React/Node.js experience, 94% job match score! Would you like me to start the proctored technical interview session? ⚡",
    "Yes, generate 5 technical questions and begin proctoring.",
    "Ready! Proctoring telemetry engaged (voice audio, gaze tracking, IDE sync). Launching candidate session now. 🚀"
  ],
  delay = 1400,
  startDelay = 800,
  restartDelay = 4000,
  loop = true
}: ChatbotProps) {
  const navigate = useNavigate();
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= messages.length) {
      if (loop) {
        const resetTimer = setTimeout(() => {
          setChatMessages([]);
          setCurrentIndex(0);
        }, restartDelay);
        return () => clearTimeout(resetTimer);
      }
      return;
    }

    const isNextMessageFromUser = currentIndex % 2 !== 0;

    if (isNextMessageFromUser) {
      setIsUserTyping(true);
      setIsTyping(false);
    } else {
      setIsTyping(true);
      setIsUserTyping(false);
    }

    const messageDelay = currentIndex === 0 ? startDelay : delay;

    const messageTimeout = setTimeout(() => {
      setIsTyping(false);
      setIsUserTyping(false);
      setChatMessages(prev => [
        ...prev,
        {
          text: messages[currentIndex],
          isUser: currentIndex % 2 !== 0
        }
      ]);
      setCurrentIndex(prev => prev + 1);
    }, messageDelay);

    return () => clearTimeout(messageTimeout);
  }, [currentIndex, messages, delay, startDelay, restartDelay, loop]);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-slate-950/80 border border-white/10 shadow-2xl backdrop-blur-2xl">
      {/* Window Title Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mac window dots */}
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Bot size={13} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white tracking-tight">Viamod AI Talent Agent</p>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400">Live Voice & NLP Active</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>Try Demo</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="h-80 sm:h-96 p-4 overflow-y-auto flex flex-col space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-3.5 text-xs sm:text-sm leading-relaxed ${
                message.isUser
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-2xl rounded-tr-xs'
                  : 'bg-slate-900/90 text-slate-200 border border-white/[0.08] shadow-md rounded-2xl rounded-tl-xs'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Bot typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900/90 border border-white/[0.08] px-3.5 py-2.5 rounded-2xl rounded-tl-xs flex items-center space-x-1.5 shadow-sm">
              <span className="text-[10px] text-cyan-400 font-mono mr-1">AI Thinking</span>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {/* User typing indicator */}
        {isUserTyping && (
          <div className="flex justify-end">
            <div className="bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 rounded-2xl rounded-tr-xs flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-400">Recruiter typing</span>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Simulated Interactive Input Footer */}
      <div className="p-3 bg-slate-900/70 border-t border-white/[0.06]">
        <div 
          onClick={() => navigate('/login')}
          className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 text-xs cursor-pointer transition-all group"
        >
          <span className="truncate pr-2">Ask candidate evaluation question or parse resume...</span>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 group-hover:from-cyan-400 group-hover:to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm transition-all">
            <Send size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
