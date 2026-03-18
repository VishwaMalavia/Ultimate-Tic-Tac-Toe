import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NameEntry() {
  const loc = useLocation();
  const navigate = useNavigate();
  const rawMode = loc.state?.mode || 'two';
  const mode = rawMode;
  const [tempNames, setTempNames] = useState({ p1: '', p2: '' });
  const [roomCode, setRoomCode] = useState('');

  function startLocal() { navigate('/game', { state: { mode: (mode === 'online-create' || mode === 'online-join') ? 'online' : mode, tempNames } }); }
  function createRoomFlow() { navigate('/lobby', { state: { intent: 'create', name: tempNames.p1 } }); }
  function joinRoomFlow() { navigate('/lobby', { state: { intent: 'join', name: tempNames.p1, roomCode: roomCode } }); }

  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center animate-slide-up">
      <div className="glass-panel p-8 w-full max-w-md border-t border-l border-white/20 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          {mode === 'computer' ? 'Enter Your Name' : mode === 'two' ? 'Enter Both Names' : mode === 'online-create' ? 'Create Room' : 'Join Room'}
        </h2>

        <div className="flex flex-col gap-5">
          {(mode === 'computer' || mode === 'online-create' || mode === 'online-join') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-300 ml-1">Your Name</label>
              <input value={tempNames.p1} onChange={e => setTempNames({ ...tempNames, p1: e.target.value })} placeholder="e.g. Alex" className="glass-input p-3 w-full" />
            </div>
          )}

          {mode === 'two' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-300 ml-1">Player 1</label>
                <input value={tempNames.p1} onChange={e => setTempNames({ ...tempNames, p1: e.target.value })} placeholder="X Player Name" className="glass-input p-3 w-full" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-300 ml-1">Player 2</label>
                <input value={tempNames.p2} onChange={e => setTempNames({ ...tempNames, p2: e.target.value })} placeholder="O Player Name" className="glass-input p-3 w-full" />
              </div>
            </>
          )}

          {mode === 'online-join' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-indigo-400 ml-1">Room Code</label>
              <input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="e.g. ABCD1" className="glass-input p-3 w-full uppercase font-mono tracking-wider" />
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 mt-6">
            <button onClick={() => navigate('/')} className="glass-button flex-1 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 text-sm font-semibold w-full">
              Back
            </button>

            {mode === 'online-create' && (
              <button onClick={createRoomFlow} className="glass-button flex-[2] py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:shadow-[0_0_15px_rgba(251,113,133,0.5)] text-sm font-semibold">
                Create Room
              </button>
            )}

            {mode === 'online-join' && (
              <button onClick={joinRoomFlow} className="glass-button flex-[2] py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-[0_0_15px_rgba(129,140,248,0.5)] text-sm font-semibold">
                Join Match
              </button>
            )}

            {(mode === 'computer' || mode === 'two') && (
              <button onClick={startLocal} className="glass-button flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] text-sm font-semibold">
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
