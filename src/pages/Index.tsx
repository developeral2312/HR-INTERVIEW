import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Brain,
  BarChart3,
  Search,
  ClipboardCheck,
  Clock,
  Shield,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  Moon,
  Sun,
  Bot,
  Zap,
  Sparkles,
  Activity,
  CheckCircle2,
  Layers,
  Lock,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, useInView } from "framer-motion";
import { useTheme } from '../context/ThemeContext';
import Chatbot from '../components/ui/chatbot';

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrollY, setScrollY] = useState(0);

  const homeRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Add useInView hooks
  const isHeroInView = useInView(homeRef, { once: true, margin: "-100px" });
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const isGalleryInView = useInView(galleryRef, { once: true, margin: "-100px" });
  const isAboutInView = useInView(aboutRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  // Add theme context
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      // Handle scroll animations
      const animateElements = document.querySelectorAll('.animate-on-scroll');
      animateElements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        if (elementPosition < screenPosition) {
          element.classList.add('visible');
        }
      });

      // Set active section based on scroll position
      const sections = [
        { ref: homeRef, id: 'home' },
        { ref: featuresRef, id: 'features' },
        { ref: galleryRef, id: 'capabilities' },
        { ref: aboutRef, id: 'about' },
        { ref: contactRef, id: 'contact' }
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const { top } = section.ref.current.getBoundingClientRect();
          if (top <= 120) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    setIsMenuOpen(false);
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetStarted = () => {
    navigate('/login');
  };

  // Enterprise Stats Strip
  const stats = [
    {
      value: '10,000+',
      label: 'AI Interviews Evaluated',
      subtext: 'Across tech stacks',
      icon: <Bot className="w-4 h-4 text-cyan-400" />,
      color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/20'
    },
    {
      value: '75%',
      label: 'Reduced Time-to-Hire',
      subtext: 'From weeks to hours',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20'
    },
    {
      value: '99.4%',
      label: 'Proctoring Integrity Score',
      subtext: 'Automated telemetry',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20'
    },
    {
      value: '<400ms',
      label: 'Voice Response Latency',
      subtext: 'Natural conversations',
      icon: <Activity className="w-4 h-4 text-indigo-400" />,
      color: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20'
    }
  ];

  // Upgraded Features with distinct gradient accents
  const features = [
    {
      icon: <Brain size={24} className="text-violet-400" />,
      tag: 'Neural NLP',
      title: 'AI-Powered Screening',
      description: 'Advanced machine learning models analyze complex technical resumes, extracting verified competencies beyond keyword matching.',
      glow: 'from-violet-500/20 to-indigo-500/20',
      border: 'border-violet-500/30'
    },
    {
      icon: <Bot size={24} className="text-cyan-400" />,
      tag: 'Conversational Voice',
      title: 'Autonomous Technical Interviews',
      description: 'Dynamic conversational AI agents conduct in-depth audio screenings, adapting follow-up questions to the candidate in real-time.',
      glow: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/30'
    },
    {
      icon: <Shield size={24} className="text-emerald-400" />,
      tag: 'Biometric Telemetry',
      title: 'Real-Time Proctoring Shield',
      description: 'Continuous computer-vision eye tracking, tab switch monitoring, and audio anomaly detection guarantee 100% exam integrity.',
      glow: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30'
    },
    {
      icon: <BarChart3 size={24} className="text-amber-400" />,
      tag: 'Predictive Dossier',
      title: 'Executive Analytics Dossier',
      description: 'Generates comprehensive multi-dimensional candidate scorecards with timestamped recordings, code benchmarks, and hiring recommendations.',
      glow: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30'
    },
    {
      icon: <Search size={24} className="text-sky-400" />,
      tag: 'Vector Embeddings',
      title: 'Intelligent Semantic Search',
      description: 'Instantly query your candidate database using natural language to uncover specialized skillsets, architectures, or credentials.',
      glow: 'from-sky-500/20 to-blue-500/20',
      border: 'border-sky-500/30'
    },
    {
      icon: <ClipboardCheck size={24} className="text-rose-400" />,
      tag: 'Fairness Engine',
      title: 'Objective Bias Elimination',
      description: 'Standardized evaluation rubrics and blind scoring benchmarks eliminate unconscious human bias to ensure meritocratic hiring.',
      glow: 'from-rose-500/20 to-pink-500/20',
      border: 'border-rose-500/30'
    }
  ];

  // Upgraded Platform Capabilities
  const capabilities = [
    {
      src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
      tag: 'Voice & Coding Engine',
      title: 'Autonomous Technical Deep-Dives',
      description: 'Full-duplex voice synthesis and real-time code execution environment evaluating architecture, algorithms, and practical debugging.',
      badge: 'Real-Time WebRTC'
    },
    {
      src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80',
      tag: 'Computer Vision',
      title: 'Continuous Multimodal Proctoring',
      description: 'Automated gaze verification, multi-face presence detection, and browser lockdown telemetry logged with second-by-second timestamps.',
      badge: 'Zero False Flags'
    },
    {
      src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
      tag: 'Deep Intelligence',
      title: 'Executive Hiring Dossier & Scorecards',
      description: 'Detailed candidate reports featuring competency matrices, code quality ratings, communication index, and clear hiring verdicts.',
      badge: 'Actionable Insights'
    },
    {
      src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
      tag: 'Vector Engine',
      title: 'Semantic Skill & Portfolio Matching',
      description: 'Transforms unstructured resumes and GitHub repositories into high-dimensional vector spaces for instant, accurate matching.',
      badge: 'Groq + LLaMA-3'
    }
  ];

  return (
    <div className={`min-h-screen relative font-sans overflow-x-hidden ${theme === 'dark'
      ? 'bg-[#070913] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200'
      : 'bg-slate-50 text-slate-900 selection:bg-cyan-500/20'
      }`}>
      {/* Background High-Tech Mesh Lights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-600/15 via-cyan-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[40%] right-[-5%] w-[600px] h-[400px] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-5%] w-[600px] h-[400px] bg-violet-600/10 blur-[150px] rounded-full" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 30
          ? theme === 'dark'
            ? 'bg-[#070913]/85 backdrop-blur-2xl shadow-xl shadow-black/40 border-b border-white/[0.08]'
            : 'bg-white/90 backdrop-blur-2xl shadow-lg border-b border-slate-200/80'
          : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              VS
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                VIAMOD SOLUTION
              </span>
              <span className="text-[10px] text-cyan-400/90 font-bold tracking-widest uppercase -mt-0.5">
                PRIVATE LIMITED
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <ul className="flex space-x-7">
              {[
                { name: 'Home', ref: homeRef, id: 'home' },
                { name: 'Features', ref: featuresRef, id: 'features' },
                { name: 'Capabilities', ref: galleryRef, id: 'capabilities' },
                { name: 'About Us', ref: aboutRef, id: 'about' },
                { name: 'Contact Us', ref: contactRef, id: 'contact' }
              ].map((item) => (
                <li key={item.name}>
                  <button
                    onClick={() => scrollToSection(item.ref)}
                    className={`text-sm font-medium transition-all hover:text-cyan-400 cursor-pointer ${activeSection === item.id
                      ? 'text-cyan-400 font-semibold'
                      : theme === 'dark'
                        ? 'text-slate-300/90'
                        : 'text-slate-600'
                      }`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={`rounded-xl ${theme === 'dark'
                  ? 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-cyan-600 hover:bg-slate-100'
                  }`}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button
                className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                onClick={handleGetStarted}
              >
                Login / Portal
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={`rounded-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`md:hidden ${theme === 'dark'
              ? 'bg-[#070913]/95 backdrop-blur-2xl border-b border-white/[0.08]'
              : 'bg-white/95 backdrop-blur-2xl border-b border-slate-200'
              }`}
          >
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <div className="px-5 py-6 space-y-4">
                <ul className="space-y-3">
                  {[
                    { name: 'Home', ref: homeRef },
                    { name: 'Features', ref: featuresRef },
                    { name: 'Capabilities', ref: galleryRef },
                    { name: 'About Us', ref: aboutRef },
                    { name: 'Contact Us', ref: contactRef }
                  ].map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => scrollToSection(item.ref)}
                        className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark'
                          ? 'text-slate-200 hover:bg-slate-800/80 hover:text-cyan-400'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-cyan-600'
                          }`}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold rounded-xl h-11 shadow-lg shadow-cyan-500/20"
                  onClick={handleGetStarted}
                >
                  Login / Portal
                </Button>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section ref={homeRef} className="pt-36 sm:pt-44 pb-20 px-4 sm:px-6 relative">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* Left Column: Hero Copy */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="lg:w-1/2 space-y-7 text-left"
              >
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-violet-500/10 text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Viamod Autonomous AI Recruiter & Proctoring Platform</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Transform Technical Hiring With{' '}
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                    Autonomous AI
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed max-w-xl">
                  Streamline engineering evaluations with conversational AI voice interviews, real-time proctoring telemetry, vector-based resume scoring, and instantaneous candidate dossiers.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold h-12 px-7 rounded-xl shadow-xl shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => scrollToSection(featuresRef)}
                    className="border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/50 text-slate-200 hover:text-white h-12 px-6 rounded-xl backdrop-blur-md transition-all cursor-pointer"
                  >
                    Explore Features
                  </Button>
                </div>

                {/* Trust Badges Strip */}
                <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time WebRTC Voice</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Continuous Eye Tracking</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Groq LLaMA-3 Accelerated</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Interactive AI Agent Simulator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={isHeroInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 30 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="lg:w-1/2 w-full max-w-lg mx-auto relative"
              >
                {/* Subtle back card glow */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/25 via-blue-600/25 to-indigo-600/25 rounded-3xl blur-2xl opacity-70 pointer-events-none" />

                {/* Status Header Chip */}
                <div className="relative mb-3 flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-slate-300 font-medium">Recruiter AI Agent</span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                    Latency: 320ms • Active
                  </span>
                </div>

                {/* Chatbot Component */}
                <div className="relative">
                  <Chatbot
                    messages={[
                      "Hello! I'm your Viamod AI Recruiter & Technical Screening Agent. How can I assist you today? 👋",
                      "I'd like to analyze this full-stack developer resume and launch a proctored technical interview.",
                      "Processing resume... Found 6+ years React/Node.js experience, 94% role match! Ready to begin the adaptive evaluation? 📝",
                      "Yes, initialize proctoring and start the session.",
                      "Proctoring telemetry active (eye tracking, voice audio, IDE sync). Launching candidate session now. 🚀"
                    ]}
                    delay={1600}
                    startDelay={900}
                    restartDelay={4500}
                  />
                </div>
              </motion.div>
            </div>

            {/* Enterprise Metrics Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
            >
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl bg-slate-900/60 border ${stat.color} backdrop-blur-xl shadow-lg flex flex-col justify-between hover:bg-slate-900/80 transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {stat.value}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {stat.label}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {stat.subtext}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Scroll Indicator */}
            <div className="mt-14 text-center">
              <button
                onClick={() => scrollToSection(featuresRef)}
                aria-label="Scroll down to features"
                className="inline-flex flex-col items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <span className="text-[11px] font-medium tracking-widest uppercase">Explore Capabilities</span>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronDown size={20} />
                </motion.div>
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="py-24 px-4 sm:px-6 relative bg-slate-950/60 border-t border-white/[0.06]">
          <div className="container mx-auto">
            <motion.div
              className="text-center space-y-4 mb-16"
              initial={{ opacity: 0, y: 25 }}
              animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                <Layers className="w-3.5 h-3.5" />
                <span>CORE ENGINEERING MODULES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Engineered for High-Scale Enterprise Hiring
              </h2>
              <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto">
                Replace disconnected screening tools with an end-to-end autonomous evaluation architecture.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 25 }}
                  animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <div className="h-full p-7 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-cyan-500/40 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.glow} border ${feature.border} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          {feature.icon}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full">
                          {feature.tag}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5 group-hover:text-cyan-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-slate-300/80 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-white/[0.06] flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                      <span>Learn technical spec</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Capabilities / Gallery Section */}
        <section ref={galleryRef} className="py-24 px-4 sm:px-6 relative border-t border-white/[0.06]">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={isGalleryInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PLATFORM TELEMETRY IN ACTION</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Precision Intelligence Across Every Stage
              </h2>
              <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto">
                Explore how Viamod Solution automates resume parsing, live proctored coding, and candidate scoring.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {capabilities.map((cap, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isGalleryInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="rounded-2xl overflow-hidden border border-white/[0.08] hover:border-cyan-500/40 bg-slate-900/60 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src={cap.src}
                      alt={cap.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 border border-white/20 text-cyan-300 backdrop-blur-md">
                        {cap.badge}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                        {cap.tag}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {cap.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section ref={aboutRef} className="py-24 px-4 sm:px-6 relative bg-slate-950/70 border-t border-white/[0.06]">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={isAboutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                <Award className="w-3.5 h-3.5" />
                <span>ENTERPRISE TALENT INTELLIGENCE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Empowering Modern Engineering Teams
              </h2>
              <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto">
                Learn how Viamod Solution Private Limited eliminates recruitment bottlenecks with autonomous AI infrastructure.
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <motion.div
                className="lg:w-1/2 w-full"
                initial={{ opacity: 0, x: -30 }}
                animate={isAboutInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                    alt="Viamod Solution Engineering"
                    className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl">
                    <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Enterprise Mission</p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      Viamod Solution Private Limited • Scaling global engineering assessments with 0% bias.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="lg:w-1/2 space-y-6 text-left"
                initial={{ opacity: 0, x: 30 }}
                animate={isAboutInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-white/[0.05] border border-white/10 text-slate-300">
                  ABOUT THE PLATFORM
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  Autonomous Recruiter & Proctored Evaluation Suite
                </h3>
                <p className="text-slate-300/90 leading-relaxed text-sm sm:text-base">
                  <strong className="text-white font-semibold">Viamod Solution Private Limited</strong> was founded with a forward-looking vision: to make technical recruitment seamless, transparent, and accurate through autonomous AI intelligence.
                </p>
                <p className="text-slate-300/90 leading-relaxed text-sm sm:text-base">
                  Our engineering suite integrates autonomous conversational interview bots, real-time proctoring telemetry, dynamic resume parsing, and predictive hiring analytics that eliminate unconscious bias and drastically cut hiring turnaround time.
                </p>
                <p className="text-slate-300/90 leading-relaxed text-sm sm:text-base">
                  We empower organizations to scale their technical evaluations while providing candidates with a fair, adaptive, and immersive interviewing experience.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Button
                    onClick={() => scrollToSection(contactRef)}
                    className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 cursor-pointer"
                  >
                    Contact Enterprise Sales
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGetStarted}
                    className="border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 rounded-xl px-5 cursor-pointer"
                  >
                    Candidate Login
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section ref={contactRef} className="py-24 px-4 sm:px-6 relative border-t border-white/[0.06]">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={isContactInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                <Mail className="w-3.5 h-3.5" />
                <span>SUPPORT & ENTERPRISE INQUIRIES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Get in Touch With Us
              </h2>
              <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto">
                Have questions or need enterprise platform deployment? Reach out directly to our team.
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-10 items-stretch">
              {/* Contact Form */}
              <motion.div
                className="lg:w-1/2 p-8 sm:p-9 rounded-3xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex flex-col justify-between"
                initial={{ opacity: 0, x: -25 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -25 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Send a Direct Inquiry</h3>
                  <p className="text-xs text-slate-400 mb-6">Our enterprise solutions engineers typically respond in &lt;2 hours.</p>

                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Thank you! Your message has been sent to info.supportmod@gmail.com.'); }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-xs font-semibold text-slate-300">Name</label>
                        <input
                          type="text"
                          id="name"
                          className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-xs font-semibold text-slate-300">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="subject" className="block text-xs font-semibold text-slate-300">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        placeholder="Platform inquiry, custom integration, or sales"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="message" className="block text-xs font-semibold text-slate-300">Message</label>
                      <textarea
                        id="message"
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        placeholder="Provide details about your organization or candidate volume..."
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                    >
                      Send Message
                    </Button>
                  </form>
                </div>
              </motion.div>

              {/* Corporate Information Card */}
              <motion.div
                className="lg:w-1/2 p-8 sm:p-9 rounded-3xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex flex-col justify-between space-y-6"
                initial={{ opacity: 0, x: 25 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 25 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-xs font-black">
                      VS
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Viamod Solution Private Limited
                    </h3>
                  </div>
                  <p className="text-slate-400 text-xs mb-6">Corporate Office & Customer Support Desk</p>

                  <div className="space-y-4">
                    {/* Support Email */}
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] hover:border-cyan-500/30 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Official Support Email</p>
                        <a
                          href="mailto:info.supportmod@gmail.com"
                          className="text-sm sm:text-base font-bold text-cyan-300 hover:text-cyan-200 hover:underline transition-colors"
                        >
                          info.supportmod@gmail.com
                        </a>
                      </div>
                    </div>

                    {/* Direct Hotline */}
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] hover:border-blue-500/30 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Direct Hotline</p>
                        <p className="text-sm sm:text-base font-bold text-white">
                          +91 9956665489
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] hover:border-purple-500/30 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Headquarters</p>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                          Lucknow, Uttar Pradesh, India
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Connect With Us</h4>
                      <div className="flex space-x-3">
                        <a
                          href="https://linkedin.com"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="LinkedIn"
                          className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                        >
                          <Linkedin size={16} />
                        </a>
                        <a
                          href="https://twitter.com"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Twitter"
                          className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                        >
                          <Twitter size={16} />
                        </a>
                        <a
                          href="https://github.com"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="GitHub"
                          className="w-9 h-9 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                        >
                          <Github size={16} />
                        </a>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SLA: 2 Hours
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/95 border-t border-white/[0.08] relative z-10">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
                  VS
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  VIAMOD SOLUTION PRIVATE LIMITED
                </h2>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">
                Autonomous Recruiter & Talent Assessment Suite • Support:{' '}
                <a href="mailto:info.supportmod@gmail.com" className="text-cyan-400 hover:underline">
                  info.supportmod@gmail.com
                </a>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm">
              {[
                { name: 'Home', ref: homeRef },
                { name: 'Features', ref: featuresRef },
                { name: 'Capabilities', ref: galleryRef },
                { name: 'About Us', ref: aboutRef },
                { name: 'Contact Us', ref: contactRef }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => scrollToSection(item.ref)}
                  className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <Separator className="my-8 bg-white/[0.08]" />

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <p>© 2025 Viamod Solution Private Limited. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Security & Compliance</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
