import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target as TargetIcon, Crosshair, Play, Square, RefreshCcw, Zap, Fingerprint, Move } from 'lucide-react';
import { cn } from '../lib/utils';
import { VisionEngine, DetectedEntity } from './VisionEngine';

export interface GameEvent {
  x: number;
  y: number;
  timestamp: number;
  type: 'click' | 'move' | 'joystick' | 'swipe';
  data?: any;
}

interface GameSimulatorProps {
  isRecording: boolean;
  isAutonomous: boolean;
  onEvent: (event: GameEvent) => void;
  recordedEvents: GameEvent[];
  onFinishAutonomous?: () => void;
}

export const GameSimulator: React.FC<GameSimulatorProps> = ({
  isRecording,
  isAutonomous,
  onEvent,
  recordedEvents,
  onFinishAutonomous
}) => {
  const [score, setScore] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [touches, setTouches] = useState<{ id: number, x: number, y: number }[]>([]);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const prevDetectionsRef = useRef<Record<string, { x: number, y: number, vx: number, vy: number, t: number }>>({});

  // Reactive Combat AI (Full Automation)
  useEffect(() => {
    if (!isAutonomous) return;

    const combatInterval = setInterval(() => {
      // Prioritize targets by threat level and subtype
      const sortedEnemies = [...detectedEntities]
        .filter(e => e.type === 'enemy')
        .sort((a, b) => b.threatLevel - a.threatLevel);

      const enemy = sortedEnemies[0];
      if (enemy) {
        const now = Date.now();
        const prev = prevDetectionsRef.current[enemy.id];
        let targetX = enemy.x;
        let targetY = enemy.y;

        // Advanced Predictive logic: estimate velocity and acceleration
        if (prev) {
          const dt = (now - prev.t) / 1000; // time in seconds
          if (dt > 0) {
            // Current velocity from VisionEngine or calculated
            const currentVx = enemy.vx || (enemy.x - prev.x) / dt;
            const currentVy = enemy.vy || (enemy.y - prev.y) / dt;
            
            // Calculate acceleration
            const ax = (currentVx - prev.vx) / dt;
            const ay = (currentVy - prev.vy) / dt;
            
            // Predict 150ms into the future using: s = ut + 0.5at^2
            const t_pred = 0.15;
            targetX += (currentVx * t_pred) + (0.5 * ax * Math.pow(t_pred, 2));
            targetY += (currentVy * t_pred) + (0.5 * ay * Math.pow(t_pred, 2));

            // Update tracking ref with current velocity for next frame's acceleration calc
            prevDetectionsRef.current[enemy.id] = { 
              x: enemy.x, 
              y: enemy.y, 
              vx: currentVx, 
              vy: currentVy, 
              t: now 
            };
          }
        } else {
          // Initialize tracking
          prevDetectionsRef.current[enemy.id] = { 
            x: enemy.x, 
            y: enemy.y, 
            vx: enemy.vx || 0, 
            vy: enemy.vy || 0, 
            t: now 
          };
        }

        // Smooth snapping (Lerp) - Snipers require faster snapping
        const lerpFactor = enemy.subtype === 'SNIPER' ? 0.5 : 0.3;
        setCursorPos(curr => ({
          x: curr.x + (targetX - curr.x) * lerpFactor,
          y: curr.y + (targetY - curr.y) * lerpFactor
        }));
        
        // Fire!
        const dist = Math.sqrt(Math.pow(cursorPos.x - targetX, 2) + Math.pow(cursorPos.y - targetY, 2));
        if (dist < 5) {
          setScore(s => s + 100);
        }
      } else {
        prevDetectionsRef.current = {};
      }
    }, 32); // Increased frequency for better tracking

    return () => clearInterval(combatInterval);
  }, [isAutonomous, detectedEntities, cursorPos]);

  // Autonomous Playback (Pattern Replication)
  useEffect(() => {
    if (!isAutonomous || recordedEvents.length === 0) {
      setAutoIndex(0);
      return;
    }

    if (autoIndex >= recordedEvents.length) {
      onFinishAutonomous?.();
      return;
    }

    const currentEvent = recordedEvents[autoIndex];
    const nextEvent = recordedEvents[autoIndex + 1];
    
    const delay = nextEvent ? nextEvent.timestamp - currentEvent.timestamp : 100;

    const timer = setTimeout(() => {
      if (currentEvent.type === 'click' || currentEvent.type === 'swipe') {
        setCursorPos({ x: currentEvent.x, y: currentEvent.y });
        if (currentEvent.type === 'click') {
          setScore(s => s + 100);
        }
      }
      setAutoIndex(prev => prev + 1);
    }, Math.min(delay, 500)); // Cap delay for smoother playback

    return () => clearTimeout(timer);
  }, [isAutonomous, autoIndex, recordedEvents, onFinishAutonomous]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAutonomous || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Track multi-touch for visual feedback
      const newTouches = Array.from(e.touches).map((t: React.Touch) => ({
        id: t.identifier,
        x: ((t.clientX - rect.left) / rect.width) * 100,
        y: ((t.clientY - rect.top) / rect.height) * 100
      }));
      setTouches(newTouches);
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    if (e.type === 'mousemove' || e.type === 'touchmove') {
      if (x > 40) { // Only look if touching right side
        if (!lockedTargetId) {
          setCursorPos({ x, y });
        }
        if (isRecording && Math.random() > 0.8) { // Throttle move events
          onEvent({ x, y, timestamp: Date.now(), type: 'swipe' });
        }
      }
    }

    if (e.type === 'mousedown' || e.type === 'touchstart') {
      if (x > 40) { // Only shoot if touching right side
        setScore(s => s + 100);
        const event: GameEvent = { x, y, timestamp: Date.now(), type: 'click' };
        if (isRecording) onEvent(event);
      }
    }
  };

  const handleJoystick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAutonomous) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx);
    
    setJoystickPos({
      x: (Math.cos(angle) * dist),
      y: (Math.sin(angle) * dist)
    });
    setIsJoystickActive(true);

    if (isRecording && Math.random() > 0.7) {
      onEvent({ x: dx, y: dy, timestamp: Date.now(), type: 'joystick' });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[9/16] max-h-[70vh] bg-[#09090b] border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl select-none touch-none"
      onMouseDown={handleInteraction}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      onTouchEnd={() => setTouches([])}
    >
      {/* Phone Notch Simulation */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#18181b] rounded-b-2xl z-50 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-800" />
        <div className="w-12 h-1 rounded-full bg-zinc-800" />
      </div>

      {/* Game Content Simulation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#18181b_0%,_#09090b_100%)]">
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        {/* Targets */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-12 h-12 border-2 border-red-500/30 rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{ 
                  left: `${20 + Math.sin(i + Date.now()/1000) * 30}%`, 
                  top: `${20 + Math.cos(i + Date.now()/1000) * 30}%` 
                }}
              >
                <div className="w-6 h-6 bg-red-500/20 rounded-full border border-red-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Vision Engine Overlay */}
      <VisionEngine 
        isActive={isRecording || isAutonomous} 
        onDetection={setDetectedEntities}
      />

      {/* Virtual Joystick */}
      <div 
        className="absolute bottom-16 left-12 w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center z-40"
        onMouseDown={handleJoystick}
        onTouchStart={handleJoystick}
        onMouseMove={isJoystickActive ? handleJoystick : undefined}
        onTouchMove={isJoystickActive ? handleJoystick : undefined}
        onMouseUp={() => { setIsJoystickActive(false); setJoystickPos({ x: 0, y: 0 }); }}
        onTouchEnd={() => { setIsJoystickActive(false); setJoystickPos({ x: 0, y: 0 }); }}
      >
        <motion.div 
          className="w-10 h-10 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center"
          animate={{ x: joystickPos.x, y: joystickPos.y }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          <Move size={16} className="text-zinc-400" />
        </motion.div>
      </div>

      {/* Swipe Area Indicator */}
      <div className="absolute inset-y-0 right-0 w-[60%] bg-white/[0.02] border-l border-white/5 flex items-center justify-center">
        <span className="text-[8px] font-mono text-zinc-700 rotate-90 tracking-[0.5em] uppercase">Look_Swipe_Zone</span>
      </div>

      {/* Touch Visuals */}
      {touches.map(touch => (
        <motion.div
          key={touch.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          className="absolute w-12 h-12 border-2 border-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${touch.x}%`, top: `${touch.y}%` }}
        />
      ))}

      {/* Crosshair / Cursor */}
      <motion.div 
        className="absolute z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        animate={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
        transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.5 }}
      >
        <div className={cn(
          "relative w-10 h-10 flex items-center justify-center transition-colors",
          isAutonomous ? "text-cyan-400" : "text-white"
        )}>
          <div className="absolute inset-0 border border-current rounded-full opacity-20 animate-ping" />
          <Crosshair size={24} strokeWidth={1.5} />
          {isAutonomous && (
            <div className="absolute -top-8 bg-cyan-500 px-1.5 py-0.5 rounded text-[8px] font-bold text-black font-mono flex flex-col items-center">
              <span>NEURAL_COMBAT_AI</span>
              <span className="text-[6px] opacity-70">TARGET_TRACKING_ACTIVE</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* HUD */}
      <div className="absolute top-10 left-6 flex flex-col gap-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase">Mode: <span className={isAutonomous ? "text-cyan-400" : "text-emerald-400"}>{isAutonomous ? 'Autonomous' : 'Manual'}</span></div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase">Score: <span className="text-white">{score.toString().padStart(6, '0')}</span></div>
        
        {/* Target Lock Control */}
        <button
          onClick={() => {
            if (lockedTargetId) {
              setLockedTargetId(null);
            } else {
              // Find nearest enemy target to crosshair
              const nearest = detectedEntities
                .filter(e => e.type === 'enemy')
                .map(e => ({
                  ...e,
                  dist: Math.sqrt(Math.pow(e.x - cursorPos.x, 2) + Math.pow(e.y - cursorPos.y, 2))
                }))
                .filter(e => e.dist < 20) // Proximity threshold
                .sort((a, b) => a.dist - b.dist)[0];
              
              if (nearest) setLockedTargetId(nearest.id);
            }
          }}
          className={cn(
            "mt-2 flex items-center gap-2 px-2 py-1 rounded border font-mono text-[8px] transition-all",
            lockedTargetId 
              ? "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
          )}
        >
          <TargetIcon size={10} className={lockedTargetId ? "animate-pulse" : ""} />
          {lockedTargetId ? 'TARGET_LOCKED' : 'LOCK_TARGET'}
        </button>
      </div>

      {isRecording && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full z-50">
          <Fingerprint size={14} className="text-red-500" />
          <span className="text-[10px] font-mono text-red-500">MAPPING_JOYSTICK_&_SWIPE...</span>
        </div>
      )}
    </div>
  );
};
