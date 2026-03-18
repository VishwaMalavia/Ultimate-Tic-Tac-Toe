// 
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  useEffect(() => {
    localStorage.removeItem("utt_saved_game");
  }, []);

  function start(mode) { navigate('/names', { state: { mode } }); }
  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center animate-slide-up">
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]">
          Ultimate Tic-Tac-Toe
        </h1>
        <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto">
          Experience the classic game reinvented with strategic depth.
        </p>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-3 w-full max-w-5xl">
        <div className="glass-panel p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:-translate-y-2 border-t border-l border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-[0_0_15px_rgba(99,102,241,0.6)]">
            🤖
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">VS Computer</h2>
          <p className="text-sm text-slate-300 mb-8 flex-grow">Challenge the AI in a strategic battle of wits.</p>
          <button onClick={() => start('computer')} className="glass-button w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-[0_0_15px_rgba(129,140,248,0.5)]">
            Play Solo
          </button>
        </div>

        <div className="glass-panel p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:-translate-y-2 border-t border-l border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-[0_0_15px_rgba(16,185,129,0.6)]">
            👥
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Local 2 Player</h2>
          <p className="text-sm text-slate-300 mb-8 flex-grow">Pass and play with a friend on the same device.</p>
          <button onClick={() => start('two')} className="glass-button w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-[0_0_15px_rgba(52,211,153,0.5)]">
            Play Local
          </button>
        </div>

        <div className="glass-panel p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:-translate-y-2 border-t border-l border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-[0_0_15px_rgba(244,63,94,0.6)]">
            🌐
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Play With Friend</h2>
          <p className="text-sm text-slate-300 mb-8 flex-grow">Create or join a room to play over the internet.</p>
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <button onClick={() => start('online-create')} className="glass-button flex-1 px-3 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-[0_0_15px_rgba(251,113,133,0.5)] text-sm w-full">
              Create
            </button>
            <button onClick={() => start('online-join')} className="glass-button flex-1 px-3 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 text-sm w-full">
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
