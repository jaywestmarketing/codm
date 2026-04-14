import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  History, 
  BarChart3, 
  Settings, 
  Play, 
  Square, 
  Save, 
  Trash2, 
  ChevronRight,
  Cpu,
  ShieldCheck,
  Zap,
  RefreshCcw
} from 'lucide-react';
import { GameSimulator, GameEvent } from './components/GameSimulator';
import { PatternAnalyzer } from './components/PatternAnalyzer';
import { GeminiInsight } from './components/GeminiInsight';
import { cn } from './lib/utils';

interface Recording {
  id: string;
  name: string;
  timestamp: number;
  events: GameEvent[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'recorder' | 'library' | 'analysis'>('recorder');
  const [isRecording, setIsRecording] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<GameEvent[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  // Load recordings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fps_recordings');
    if (saved) setRecordings(JSON.parse(saved));
  }, []);

  const saveRecording = () => {
    if (currentEvents.length === 0) return;
    const newRecording: Recording = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Session_${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      events: currentEvents
    };
    const updated = [newRecording, ...recordings];
    setRecordings(updated);
    localStorage.setItem('fps_recordings', JSON.stringify(updated));
    setCurrentEvents([]);
    setIsRecording(false);
    setActiveTab('library');
  };

  const deleteRecording = (id: string) => {
    const updated = recordings.filter(r => r.id !== id);
    setRecordings(updated);
    localStorage.setItem('fps_recordings', JSON.stringify(updated));
    if (selectedRecording?.id === id) setSelectedRecording(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-cyan-500/30">
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 bg-[#09090b] border-r border-zinc-800 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Cpu size={24} className="text-black" />
        </div>
        
        <div className="flex flex-col gap-4">
          {[
            { id: 'recorder', icon: Gamepad2, label: 'Recorder' },
            { id: 'library', icon: History, label: 'Library' },
            { id: 'analysis', icon: BarChart3, label: 'Analysis' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative",
                activeTab === tab.id ? "bg-zinc-800 text-cyan-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              <tab.icon size={20} />
              <span className="absolute left-16 px-2 py-1 bg-zinc-800 text-[10px] font-mono rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <button className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300">
            <Settings size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-16 min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-mono font-bold tracking-tighter uppercase">
              FPS_Pattern_Automator <span className="text-zinc-600 font-normal">v2.4.0</span>
            </h1>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400">
              <ShieldCheck size={10} className="text-emerald-500" />
              SYSTEM_SECURE
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Status</span>
              <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                LIVE_FEED_ACTIVE
              </span>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'recorder' && (
              <motion.div
                key="recorder"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto"
              >
                {/* Simulator View */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <GameSimulator 
                    isRecording={isRecording}
                    isAutonomous={isAutonomous}
                    recordedEvents={selectedRecording?.events || []}
                    onEvent={(e) => setCurrentEvents(prev => [...prev, e])}
                    onFinishAutonomous={() => setIsAutonomous(false)}
                  />
                </div>

                {/* Controls & Real-time Data */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Session Controls</h2>
                      <Zap size={14} className="text-cyan-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          if (isRecording) saveRecording();
                          else {
                            setCurrentEvents([]);
                            setIsRecording(true);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-center gap-3 py-4 rounded-xl font-mono text-xs font-bold transition-all",
                          isRecording 
                            ? "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20" 
                            : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                        )}
                      >
                        {isRecording ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        {isRecording ? 'STOP_RECORDING' : 'START_RECORDING'}
                      </button>

                      <button
                        disabled={!selectedRecording || isRecording}
                        onClick={() => setIsAutonomous(!isAutonomous)}
                        className={cn(
                          "flex items-center justify-center gap-3 py-4 rounded-xl font-mono text-xs font-bold transition-all border",
                          isAutonomous
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
                        )}
                      >
                        <RefreshCcw size={16} className={isAutonomous ? "animate-spin" : ""} />
                        {isAutonomous ? 'STOP_AUTO' : 'RUN_AUTO'}
                      </button>
                    </div>

                    {/* Real-time Event Log */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">Event_Stream</span>
                        <span className="text-[10px] font-mono text-zinc-400">{currentEvents.length} Captured</span>
                      </div>
                      <div className="h-48 bg-black/40 rounded-lg border border-zinc-800/50 p-3 font-mono text-[10px] overflow-y-auto flex flex-col-reverse gap-1">
                        {currentEvents.slice(-20).map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-zinc-500">
                            <span className="text-cyan-500/50">[{new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                            <span className="text-zinc-300 uppercase">{e.type}</span>
                            <span>AT ({e.x.toFixed(1)}, {e.y.toFixed(1)})</span>
                          </div>
                        ))}
                        {currentEvents.length === 0 && (
                          <div className="h-full flex items-center justify-center text-zinc-700 italic">
                            Waiting for input stream...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Analysis Preview */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">Neural Health</h2>
                    <div className="flex flex-col gap-4">
                      {[
                        { label: 'Input Latency', value: '1.2ms', color: 'text-emerald-500' },
                        { label: 'Pattern Consistency', value: '94.2%', color: 'text-cyan-500' },
                        { label: 'AI Confidence', value: '0.98', color: 'text-cyan-500' },
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{stat.label}</span>
                          <span className={cn("text-[10px] font-mono font-bold", stat.color)}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-mono font-bold uppercase tracking-tighter">Session_Library</h2>
                  <span className="text-xs font-mono text-zinc-500">{recordings.length} Saved Sessions</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {recordings.map((rec) => (
                    <div 
                      key={rec.id}
                      className={cn(
                        "group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between hover:border-zinc-700 transition-all cursor-pointer",
                        selectedRecording?.id === rec.id && "border-cyan-500/50 bg-cyan-500/[0.02]"
                      )}
                      onClick={() => {
                        setSelectedRecording(rec);
                        setActiveTab('analysis');
                      }}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 transition-colors">
                          <History size={24} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-tight">{rec.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            {new Date(rec.timestamp).toLocaleString()} • {rec.events.length} Events
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecording(rec.id);
                          }}
                          className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight size={20} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                  {recordings.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-700 gap-4">
                      <History size={48} strokeWidth={1} />
                      <p className="font-mono text-sm uppercase tracking-widest">No sessions recorded yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-6xl mx-auto flex flex-col gap-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-mono font-bold uppercase tracking-tighter">Pattern_Analysis</h2>
                    <span className="text-xs font-mono text-zinc-500 uppercase">
                      {selectedRecording ? `Analyzing: ${selectedRecording.name}` : 'No session selected'}
                    </span>
                  </div>
                  {selectedRecording && (
                    <button 
                      onClick={() => setActiveTab('recorder')}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded-lg font-mono text-[10px] font-bold uppercase hover:bg-cyan-400 transition-all"
                    >
                      <Play size={12} fill="currentColor" />
                      LOAD_INTO_SIMULATOR
                    </button>
                  )}
                </div>

                {selectedRecording ? (
                  <>
                    <GeminiInsight events={selectedRecording.events} />
                    <PatternAnalyzer events={selectedRecording.events} />
                  </>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-700 gap-4 border-2 border-dashed border-zinc-800 rounded-3xl">
                    <BarChart3 size={48} strokeWidth={1} />
                    <p className="font-mono text-sm uppercase tracking-widest">Select a session from the library to analyze</p>
                    <button 
                      onClick={() => setActiveTab('library')}
                      className="mt-4 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-lg font-mono text-[10px] uppercase hover:bg-zinc-700 transition-all"
                    >
                      Open Library
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
