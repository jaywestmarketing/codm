import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Target, Scan } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DetectedEntity {
  id: string;
  type: 'enemy' | 'ui_element' | 'target';
  subtype?: 'SCOUT' | 'TANK' | 'SNIPER';
  x: number;
  y: number;
  vx: number;
  vy: number;
  confidence: number;
  label: string;
  threatLevel: number; // 0 to 1, higher is more critical
}

interface VisionEngineProps {
  isActive: boolean;
  onDetection?: (entities: DetectedEntity[]) => void;
}

export const VisionEngine: React.FC<VisionEngineProps> = ({ isActive, onDetection }) => {
  const [entities, setEntities] = useState<DetectedEntity[]>([]);
  const [scanLineY, setScanLineY] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setEntities([]);
      return;
    }

    const interval = setInterval(() => {
      setEntities(prev => {
        const next = prev.map(e => {
          let newVx = e.vx;
          let newVy = e.vy;

          // Realistic movement patterns based on subtype
          if (e.type === 'enemy') {
            switch (e.subtype) {
              case 'SCOUT':
                // Erratic, fast zig-zag
                newVx += (Math.random() - 0.5) * 2;
                newVy += (Math.random() - 0.5) * 2;
                break;
              case 'TANK':
                // Slow, steady momentum
                newVx += (Math.random() - 0.5) * 0.2;
                newVy += (Math.random() - 0.5) * 0.2;
                break;
              case 'SNIPER':
                // Very little movement
                newVx *= 0.9;
                newVy *= 0.9;
                break;
            }
          } else {
            newVx += (Math.random() - 0.5) * 0.5;
            newVy += (Math.random() - 0.5) * 0.5;
          }

          // Cap velocity
          const maxV = e.subtype === 'SCOUT' ? 4 : 1.5;
          newVx = Math.max(-maxV, Math.min(maxV, newVx));
          newVy = Math.max(-maxV, Math.min(maxV, newVy));

          return {
            ...e,
            x: e.x + newVx,
            y: e.y + newVy,
            vx: newVx,
            vy: newVy,
            threatLevel: Math.min(1, Math.max(0, e.threatLevel + (Math.random() - 0.5) * 0.05))
          };
        }).filter(e => e.x > 0 && e.x < 100 && e.y > 0 && e.y < 100);

        if (next.length < 5 && Math.random() > 0.6) {
          const isEnemy = Math.random() > 0.3;
          const subtypes: ('SCOUT' | 'TANK' | 'SNIPER')[] = ['SCOUT', 'TANK', 'SNIPER'];
          const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
          
          let baseThreat = 0.1;
          if (isEnemy) {
            if (subtype === 'SCOUT') baseThreat = 0.4;
            if (subtype === 'TANK') baseThreat = 0.7;
            if (subtype === 'SNIPER') baseThreat = 0.95;
          }

          next.push({
            id: Math.random().toString(36).substr(2, 9),
            type: isEnemy ? 'enemy' : 'ui_element',
            subtype: isEnemy ? subtype : undefined,
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            confidence: 0.85 + Math.random() * 0.14,
            label: isEnemy ? `ENEMY_${subtype}` : 'HUD_ELEMENT',
            threatLevel: baseThreat
          });
        }
        
        return next;
      });
      
      setScanLineY(prev => (prev + 2) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  // Sync entities with parent component via callback
  useEffect(() => {
    if (onDetection && isActive) {
      onDetection(entities);
    }
  }, [entities, onDetection, isActive]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {isActive && (
        <>
          {/* Scan Line */}
          <motion.div 
            className="absolute left-0 right-0 h-[2px] bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            animate={{ top: `${scanLineY}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />

          {/* Detections */}
          <AnimatePresence>
            {entities.map(entity => (
              <motion.div
                key={entity.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
              >
                <div className={
                  `relative border-2 p-1 flex flex-col items-start gap-1
                  ${entity.type === 'enemy' ? 'border-red-500/60 bg-red-500/10' : 'border-cyan-500/30 bg-cyan-500/5'}`
                }>
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-current" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-current" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-current" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-current" />

                  <div className="flex items-center gap-1">
                    {entity.type === 'enemy' ? <Target size={8} className="text-red-500" /> : <Scan size={8} className="text-cyan-500" />}
                    <span className="text-[6px] font-mono text-white uppercase">{entity.label}</span>
                  </div>
                  <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300",
                        entity.threatLevel > 0.7 ? "bg-red-500" : "bg-cyan-500"
                      )} 
                      style={{ width: `${entity.threatLevel * 100}%` }} 
                    />
                  </div>
                  <span className="text-[5px] font-mono text-white/50">CONF: {(entity.confidence * 100).toFixed(1)}%</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* HUD Elements */}
          <div className="absolute top-12 right-6 flex flex-col items-end gap-1">
            <div className="text-[8px] font-mono text-cyan-500/50">VISION_ENGINE: v2.4.1</div>
            <div className="text-[8px] font-mono text-cyan-500/50">MARKERS: {entities.length}</div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
              <div className="text-[8px] font-mono text-cyan-500/50">ANALYZING_FRAME_DATA...</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
