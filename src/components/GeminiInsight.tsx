import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { GameEvent } from './GameSimulator';

interface GeminiInsightProps {
  events: GameEvent[];
}

export const GeminiInsight: React.FC<GeminiInsightProps> = ({ events }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzePattern = async () => {
    if (events.length === 0) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Summarize events for the prompt
      const summary = events.map(e => `[${e.type}] at (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this FPS player movement and click pattern data: ${summary.slice(0, 2000)}. 
        Provide a brief, technical analysis of the player's style (e.g., aggressive, twitchy, methodical). 
        Mention any detectable patterns in their target acquisition. Keep it under 100 words. 
        Format as a technical report.`,
      });

      setInsight(response.text || "No insight generated.");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setInsight("Error analyzing pattern. Please ensure API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-cyan-400" />
          <h3 className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Neural Pattern Analysis</h3>
        </div>
        <button
          onClick={analyzePattern}
          disabled={loading || events.length === 0}
          className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-mono text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          GENERATE INSIGHT
        </button>
      </div>

      <div className="min-h-[100px] flex items-center justify-center">
        {insight ? (
          <div className="text-[12px] font-mono text-zinc-300 leading-relaxed border-l-2 border-cyan-500/30 pl-4 py-2">
            {insight}
          </div>
        ) : (
          <div className="text-[12px] font-mono text-zinc-600 italic text-center">
            {events.length === 0 
              ? "Record a pattern to begin analysis..." 
              : "Click 'Generate Insight' for AI-driven behavioral analysis."}
          </div>
        )}
      </div>
    </div>
  );
};
