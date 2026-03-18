
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from './socket';

export default function Lobby() {
  const loc = useLocation();
  const navigate = useNavigate();
  const intent = loc.state?.intent;
  const name = loc.state?.name || 'Player';
  const joinCode = loc.state?.roomCode || null;

  const [roomCode, setRoomCode] = useState(joinCode || '');
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('connecting');

  const roomCodeRef = useRef(roomCode);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const requestSent = useRef(false);

  useEffect(() => {
    setStatus(socket.connected ? 'connected' : 'connecting');

    const onConnect = () => {
      setStatus('connected');

      // If we already successfully connected and got a roomCode, and the socket just reconnected:
      if (roomCodeRef.current) {
        socket.emit('join_room', { roomCode: roomCodeRef.current, name }, (res) => {
          if (!res?.ok) {
            setStatus('error'); alert('Disconnected and could not rejoin room'); navigate('/');
          }
        });
        return;
      }

      if (requestSent.current) return;
      requestSent.current = true;

      if (intent === 'create') {
        socket.emit('create_room', { name }, (res) => {
          if (res?.ok) { setRoomCode(res.roomCode); setPlayers(res.players || []); setStatus('waiting'); }
          else { setStatus('error'); alert('Could not create room'); navigate('/'); }
        });
      } else {
        socket.emit('join_room', { roomCode: joinCode, name }, (res) => {
          if (res?.ok) { setRoomCode(res.roomCode); setPlayers(res.players || []); setStatus('waiting'); }
          else { setStatus('error'); alert(res?.error || 'Could not join room'); navigate('/'); }
        });
      }
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    const onRoomUpdate = (playersList) => { setPlayers(playersList || []); };
    const onStartGame = ({ players }) => {
      setStatus('started');
      const mapping = {}; players.forEach(p => mapping[p.sign] = p.name);
      const myPlayer = players.find(p => p.id === socket.id);
      navigate('/game', { state: { mode: 'online', roomCode: roomCodeRef.current, playerMapping: mapping, mySign: myPlayer?.sign } });
    };

    socket.on('room_update', onRoomUpdate);
    socket.on('start_game', onStartGame);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_update', onRoomUpdate);
      socket.off('start_game', onStartGame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 min-h-screen flex flex-col items-center justify-center animate-slide-up">
      <div className="glass-panel p-8 w-full max-w-md border-t border-l border-white/20 transition-shadow duration-300 shadow-[0_0_30px_rgba(255,255,255,0.05)] text-center">

        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]">
            Room Lobby
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Share this code with your friend</p>
        </div>

        <div className="mb-8">
          <div className="inline-block bg-slate-800/60 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl shadow-inner text-4xl font-mono font-bold tracking-[0.2em] text-indigo-400 select-all cursor-pointer hover:bg-slate-800/80 transition-colors">
            {roomCode || "•••••"}
          </div>
        </div>

        <div className="bg-slate-800/40 border border-white/10 p-5 rounded-xl text-left mb-6 shadow-sm">
          <div className="font-semibold text-slate-300 mb-3 flex items-center justify-between">
            <span>Connected Players</span>
            <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg">{players.length}/2</span>
          </div>
          <ul className="flex flex-col gap-2">
            {players.map((p, idx) => (
              <li key={idx} className="flex items-center gap-3 bg-slate-800/60 p-2.5 rounded-lg border border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {p.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-slate-200">{p}</span>
              </li>
            ))}
            {players.length < 2 && (
              <li className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-slate-600 opacity-60">
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-ping"></span>
                </div>
                <span className="font-medium text-slate-400 italic">Waiting...</span>
              </li>
            )}
          </ul>
        </div>

        <div className="mb-6 h-6 flex items-center justify-center">
          {status === 'waiting' && <div className="text-sm font-semibold text-indigo-400 animate-pulse flex items-center gap-2"><span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span> Waiting for opponent...</div>}
          {status === 'started' && <div className="text-sm font-bold text-emerald-400 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span> Starting match!</div>}
          {status === 'error' && <div className="text-sm font-bold text-rose-400">Connection error</div>}
        </div>

        <div className="flex w-full">
          <button onClick={() => { if (socket.connected) socket.emit('leave_room', { roomCode }); navigate('/'); }} className="glass-button w-full py-3 bg-white/10 text-white hover:bg-white/20 text-sm font-semibold border border-white/20">
            Cancel & Leave
          </button>
        </div>
      </div>
    </div>
  );
}
