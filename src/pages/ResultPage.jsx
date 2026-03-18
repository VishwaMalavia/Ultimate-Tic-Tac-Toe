import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ResultPage() {
  const loc = useLocation();
  const navigate = useNavigate();
  const winner = loc.state?.winner;
  const playerNames = loc.state?.playerNames || {};
  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center animate-slide-up">
      <div className="glass-panel p-10 w-full max-w-lg border-t border-l border-white/20 transition-shadow duration-300 shadow-[0_0_30px_rgba(255,255,255,0.05)] text-center relative overflow-hidden">

        {/* Subtle decorative background glow */}
        <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-30 ${winner === 'X' ? 'bg-indigo-500' : winner === 'O' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
        <div className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 ${winner === 'O' ? 'bg-indigo-500' : winner === 'X' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>

        <h2 className="text-xl font-bold mb-2 tracking-widest uppercase text-slate-400 relative z-10">Match Result</h2>

        {winner ? (
          <div className="mb-10 mt-6 relative z-10">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] ${winner === 'X' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
              <span className="text-6xl font-black text-white drop-shadow-md">{winner}</span>
            </div>
            <div className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] leading-tight">
              {playerNames[winner] || `Player ${winner}`} <br />
              <span className={`text-3xl ${winner === 'X' ? 'text-indigo-400 text-glow' : 'text-emerald-400 text-glow'}`}>Wins!</span>
            </div>
          </div>
        ) : (
          <div className="mb-10 mt-6 relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-inner bg-slate-800 border-4 border-slate-700">
              <span className="text-5xl font-black text-slate-500">?</span>
            </div>
            <div className="text-4xl font-extrabold text-slate-300">
              It's a Draw!
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 justify-center mt-6 relative z-10 w-full">
          <button onClick={() => navigate('/')} className="glass-button flex-1 py-3 px-6 bg-white/10 text-white border border-white/20 hover:bg-white/20 font-semibold w-full">
            Main Menu
          </button>
          <button onClick={() => navigate('/names')} className="glass-button flex-[1.5] py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-[0_0_15px_rgba(129,140,248,0.5)] font-semibold text-lg w-full">
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
