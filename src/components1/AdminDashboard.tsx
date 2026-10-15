import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FASTAPI_ENDPOINTS } from '@/config/api';
import { Activity, Server, Users, Clock, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SystemMetrics {
  uptime_seconds?: number;
  active_sessions?: number;
  total_interviews?: number;
  latency?: {
    stt_avg_ms?: number;
    llm_avg_ms?: number;
    tts_avg_ms?: number;
  };
  stt_health?: { status: string };
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsRes, sessionsRes] = await Promise.all([
        fetch(FASTAPI_ENDPOINTS.dashboardMetrics),
        fetch(FASTAPI_ENDPOINTS.activeSessions)
      ]);
      
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.data || data);
      }
      
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setActiveSessions(data.data || []);
      }
    } catch (err) {
      setError('Failed to connect to FastAPI backend. Ensure server is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Use WebSocket for real-time updates if available
    try {
      const ws = new WebSocket(FASTAPI_ENDPOINTS.dashboardWs);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics') setMetrics(data.data);
          if (data.type === 'sessions') setActiveSessions(data.data);
        } catch (e) {}
      };
      return () => ws.close();
    } catch (e) {
      // Fallback to polling
      const interval = setInterval(fetchMetrics, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="text-cyan-400" /> System Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Real-time AI Interview Orchestration Metrics</p>
        </div>
        <div className="flex items-center gap-4">
          {error ? (
            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50 px-3 py-1">
              <AlertCircle size={14} className="mr-2" /> Offline
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-3 py-1">
              <Activity size={14} className="mr-2 animate-pulse" /> Live
            </Badge>
          )}
          <button onClick={fetchMetrics} className="p-2 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 flex items-center gap-3">
          <AlertCircle />
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">Active Sessions</p>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={20} /></div>
              </div>
              <p className="text-4xl font-bold text-white">{metrics?.active_sessions || activeSessions.length}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">Total Interviews</p>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Activity size={20} /></div>
              </div>
              <p className="text-4xl font-bold text-white">{metrics?.total_interviews || 0}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">STT Health</p>
                <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Zap size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics?.stt_health?.status === 'ok' ? 'Online ✅' : 'Unknown ⚠️'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">System Uptime</p>
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><Clock size={20} /></div>
              </div>
              <p className="text-2xl font-bold text-white">
                {metrics?.uptime_seconds ? `${(metrics.uptime_seconds / 3600).toFixed(1)} hrs` : '0 hrs'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Latency Monitor */}
        <Card className="bg-slate-900 border-slate-800 col-span-1">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Zap className="text-yellow-400" size={18} /> Avg Pipeline Latency
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Speech to Text (STT)</span>
                <span className="text-white font-medium">{metrics?.latency?.stt_avg_ms?.toFixed(0) || 0} ms</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (metrics?.latency?.stt_avg_ms || 0) / 10)}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">LLM Processing</span>
                <span className="text-white font-medium">{metrics?.latency?.llm_avg_ms?.toFixed(0) || 0} ms</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (metrics?.latency?.llm_avg_ms || 0) / 30)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Text to Speech (TTS)</span>
                <span className="text-white font-medium">{metrics?.latency?.tts_avg_ms?.toFixed(0) || 0} ms</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (metrics?.latency?.tts_avg_ms || 0) / 10)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions List */}
        <Card className="bg-slate-900 border-slate-800 col-span-1 lg:col-span-2">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Activity className="text-cyan-400" size={18} /> Live Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeSessions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic">
                No active interview sessions right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {activeSessions.map((session, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div>
                      <h4 className="text-white font-medium">{session.candidate_name || 'Unknown Candidate'}</h4>
                      <p className="text-xs text-slate-400 mt-1">ID: {session.interview_id || session.session_id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-300 capitalize">{session.interview_type || 'Voice'}</p>
                        <p className="text-xs text-cyan-400">{session.turns?.total || 0} turns</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                        In Progress
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
