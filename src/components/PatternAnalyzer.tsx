import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { GameEvent } from './GameSimulator';
import { Activity, Target, MousePointer2 } from 'lucide-react';

interface PatternAnalyzerProps {
  events: GameEvent[];
}

export const PatternAnalyzer: React.FC<PatternAnalyzerProps> = ({ events }) => {
  const clickEvents = events.filter(e => e.type === 'click');
  const joystickEvents = events.filter(e => e.type === 'joystick');
  const swipeEvents = events.filter(e => e.type === 'swipe');
  
  // Prepare data for the movement chart
  const movementData = events.map((e, i) => ({
    time: i,
    x: e.x,
    y: e.y,
    type: e.type
  }));

  // Prepare data for the heat map (scatter)
  const heatData = clickEvents.map(e => ({
    x: e.x,
    y: e.y,
    z: 100
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Movement Trajectory */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-zinc-500" />
            <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Input Stream Analysis</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[-100, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '10px' }}
                  itemStyle={{ color: '#a1a1aa' }}
                />
                <Line type="monotone" dataKey="x" stroke="#06b6d4" strokeWidth={1} dot={false} name="X-Axis" />
                <Line type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={1} dot={false} name="Y-Axis" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Precision Heatmap */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-zinc-500" />
            <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Action Heatmap (Clicks/Swipes)</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" dataKey="x" name="X" unit="%" hide domain={[0, 100]} />
                <YAxis type="number" dataKey="y" name="Y" unit="%" hide domain={[0, 100]} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '10px' }} />
                <Scatter name="Clicks" data={heatData} fill="#ef4444" />
                <Scatter name="Swipes" data={swipeEvents.map(e => ({ x: e.x, y: e.y, z: 50 }))} fill="#06b6d4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Joystick Inputs', value: joystickEvents.length, icon: MousePointer2 },
          { label: 'Swipe Actions', value: swipeEvents.length, icon: Activity },
          { label: 'Click Density', value: clickEvents.length, icon: Target },
          { label: 'Total Frames', value: events.length, icon: Activity },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg flex flex-col items-center">
            <stat.icon size={12} className="text-zinc-600 mb-1" />
            <span className="text-[8px] font-mono text-zinc-500 uppercase mb-1">{stat.label}</span>
            <span className="text-lg font-mono text-white">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
