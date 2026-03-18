// client/src/pages/GamePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "./socket";

function checkWin(cells) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return null;
}
function isFull(cells) {
  return cells.every((c) => c !== null);
}
const emptyMicro = () => Array(9).fill(null);

export default function GamePage() {
  const loc = useLocation();
  const navigate = useNavigate();

  const savedState = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('utt_saved_game');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const mode = loc.state?.mode || savedState?.mode || "two";
  const tempNames = loc.state?.tempNames || savedState?.tempNames || { p1: "", p2: "" };
  const roomCode = loc.state?.roomCode || savedState?.roomCode || null;
  const playerMapping = loc.state?.playerMapping || savedState?.playerMapping || null; // { X: name, O: name }
  const mySign = loc.state?.mySign || savedState?.mySign || null;

  const [boards, setBoards] = useState(() => savedState?.boards || Array(9).fill(null).map(emptyMicro));
  const [mainWinners, setMainWinners] = useState(() => savedState?.mainWinners || Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState(() => savedState?.currentPlayer || "X");
  const [activeMainBoard, setActiveMainBoard] = useState(() => savedState?.activeMainBoard !== undefined ? savedState.activeMainBoard : null);
  const [ownerDecision, setOwnerDecision] = useState(() => savedState?.ownerDecision || null);
  const [message, setMessage] = useState(() => savedState?.message || "");
  const [playerNames, setPlayerNames] = useState(() => savedState?.playerNames || { X: "Player X", O: "Player O" });
  const [aiLevel, setAiLevel] = useState(() => savedState?.aiLevel || "medium");

  useEffect(() => {
    const gameState = { mode, tempNames, roomCode, playerMapping, mySign, boards, mainWinners, currentPlayer, activeMainBoard, ownerDecision, message, playerNames, aiLevel };
    localStorage.setItem('utt_saved_game', JSON.stringify(gameState));
  }, [mode, tempNames, roomCode, playerMapping, mySign, boards, mainWinners, currentPlayer, activeMainBoard, ownerDecision, message, playerNames, aiLevel]);

  const clickSound = useRef(null),
    winSound = useRef(null);
  useEffect(() => {
    clickSound.current = new Audio("/sounds/click.wav");
    winSound.current = new Audio("/sounds/win.wav");
  }, []);

  // assign names & signs once
  useEffect(() => {
    if (savedState) return;
    const coin = Math.random() < 0.5;
    if (mode === "computer") {
      const human = tempNames.p1?.trim() || "Player";
      const humanSign = coin ? "X" : "O";
      const comp = humanSign === "X" ? "O" : "X";
      setPlayerNames({ [humanSign]: human, [comp]: "Computer" });
      setCurrentPlayer("X");
    } else if (mode === "online" && playerMapping) {
      setPlayerNames({ X: playerMapping.X, O: playerMapping.O });
      setCurrentPlayer("X");
    } else {
      const p1 = tempNames.p1?.trim() || "Player 1";
      const p2 = tempNames.p2?.trim() || "Player 2";
      const p1Sign = coin ? "X" : "O";
      const p2Sign = p1Sign === "X" ? "O" : "X";
      setPlayerNames({ [p1Sign]: p1, [p2Sign]: p2 });
      setCurrentPlayer("X");
    }
    // intentionally only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedState]);

  // online: connect socket for receiving moves if roomCode present
  useEffect(() => {
    if (mode === "online" && roomCode) {
      const onOpponentMove = (move) => {
        // Defensive: ensure move has valid numeric indexes
        if (
          !move ||
          typeof move.microIndex !== "number" ||
          typeof move.cellIndex !== "number" ||
          move.microIndex < 0 ||
          move.microIndex > 8 ||
          move.cellIndex < 0 ||
          move.cellIndex > 8
        ) {
          console.warn("Received invalid move from server:", move);
          return;
        }

        setBoards((prev) => {
          // Defensive copy
          const copy = prev.map((m) => m.slice());
          // Ensure micro board exists
          if (!Array.isArray(copy[move.microIndex])) return prev;
          // If cell already filled, ignore
          if (copy[move.microIndex][move.cellIndex]) return prev;

          // The mark to set is the sign of the player who made the move.
          // Because our local turn state matches the opponent's, currentPlayer is exactly their sign.
          const markToSet = move.sign || currentPlayer;
          copy[move.microIndex][move.cellIndex] = markToSet;

          // After placing, we need to check micro winner and potentially update mainWinners.
          const microWinner = checkWin(copy[move.microIndex]);
          if (microWinner) {
            setMainWinners((prevW) => {
              const next = prevW.slice();
              next[move.microIndex] = microWinner;
              return next;
            });
          }

          // decide next active board
          const nextActive = move.cellIndex;
          const wonBy = (microWinner && nextActive === move.microIndex) ? microWinner : (mainWinners[nextActive] || null);
          const nextPlayer = markToSet === "X" ? "O" : "X";

          if (wonBy) {
            if (wonBy === nextPlayer) {
              // Case A: Box Winner Gets the Turn (The next player already owns the box they were sent to)
              setActiveMainBoard(null);
              setMessage(`Box ${nextActive + 1} already won by ${wonBy}. Free choice for ${wonBy} on their turn.`);
            } else {
              // Case B: Opponent Gets Sent to a Won Box (The box is owned by the player who just played)
              setOwnerDecision({ owner: wonBy, waitingFor: nextPlayer });
              setMessage(`Box ${nextActive + 1} is won by ${wonBy}. Owner must choose which main box ${nextPlayer} should play in next.`);
            }
          } else if (isFull(copy[nextActive])) {
            setActiveMainBoard(null);
            setMessage("Assigned main box is full — free choice for both players.");
          } else {
            setActiveMainBoard(nextActive);
            setMessage("");
          }

          return copy;
        });

        // toggle currentPlayer safely using setter
        setCurrentPlayer((prev) => (prev === "X" ? "O" : "X"));
      };

      const onOpponentAssignedBoard = (choiceIndex) => {
        setActiveMainBoard(choiceIndex);
        setOwnerDecision(null);
        setMessage(`Opponent assigned main box ${choiceIndex + 1} — forced for next player.`);
      };

      socket.on("opponent_move", onOpponentMove);
      socket.on("opponent_assigned_board", onOpponentAssignedBoard);

      return () => {
        socket.off("opponent_move", onOpponentMove);
        socket.off("opponent_assigned_board", onOpponentAssignedBoard);
      };
    }
  }, [mode, roomCode, currentPlayer, mainWinners]);

  function addScore(name) {
    const s = JSON.parse(localStorage.getItem("utt_scores") || "{}");
    s[name] = (s[name] || 0) + 1;
    localStorage.setItem("utt_scores", JSON.stringify(s));
  }

  // helper AI (simple heuristics)
  function findWinningMove(sign, board) {
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const copy = board.slice();
        copy[i] = sign;
        if (checkWin(copy) === sign) return i;
      }
    }
    return -1;
  }

  function chooseAIMove() {
    let allowed = [];
    if (activeMainBoard === null) {
      allowed = boards.map((m, i) => (mainWinners[i] || isFull(m) ? null : i)).filter((v) => v !== null);
    } else {
      if (mainWinners[activeMainBoard] || isFull(boards[activeMainBoard]))
        allowed = boards.map((m, i) => (mainWinners[i] || isFull(m) ? null : i)).filter((v) => v !== null);
      else allowed = [activeMainBoard];
    }
    if (allowed.length === 0) return null;
    const computerSign = Object.keys(playerNames).find((k) => playerNames[k] === "Computer");
    const humanSign = computerSign === "X" ? "O" : "X";

    // "Easy" mode: pure random
    if (aiLevel === "easy") {
      const pb = allowed[Math.floor(Math.random() * allowed.length)];
      const empties = boards[pb].map((c, ci) => (c === null ? ci : -1)).filter((v) => v !== -1);
      return { microIndex: pb, cellIndex: empties[Math.floor(Math.random() * empties.length)] };
    }

    // Medium & Hard: Always take winning move
    for (const b of allowed) {
      const w = findWinningMove(computerSign, boards[b]);
      if (w >= 0) return { microIndex: b, cellIndex: w };
    }

    // Medium & Hard: Always block opponent's winning move
    for (const b of allowed) {
      const bl = findWinningMove(humanSign, boards[b]);
      if (bl >= 0) return { microIndex: b, cellIndex: bl };
    }

    // Hard specific logic: Avoid sending opponent to a free board or a board they can win in
    if (aiLevel === "hard") {
      let safeMoves = [];
      for (const b of allowed) {
        const empties = boards[b].map((c, ci) => (c === null ? ci : -1)).filter((v) => v !== -1);
        for (const cell of empties) {
           const nextBoard = cell;
           // If nextBoard is won or full, opponent gets a free choice over all boards. Avoid!
           if (mainWinners[nextBoard] || isFull(boards[nextBoard])) continue;
           
           // If opponent can win nextBoard immediately upon being sent there. Avoid!
           if (findWinningMove(humanSign, boards[nextBoard]) >= 0) continue;
           
           safeMoves.push({ microIndex: b, cellIndex: cell });
        }
      }
      
      if (safeMoves.length > 0) {
        // Prefer placing in center if it's safe
        const centerSafe = safeMoves.find(m => m.cellIndex === 4);
        if (centerSafe) return centerSafe;
        
        // Otherwise pick random safe move
        return safeMoves[Math.floor(Math.random() * safeMoves.length)];
      }
    }

    // Fallback for Medium (or Hard if no 'safe' moves are left)
    for (const b of allowed) {
      if (!boards[b][4]) return { microIndex: b, cellIndex: 4 };
    }

    const pb = allowed[Math.floor(Math.random() * allowed.length)];
    const empties = boards[pb].map((c, ci) => (c === null ? ci : -1)).filter((v) => v !== -1);
    if (empties.length === 0) return null;
    return { microIndex: pb, cellIndex: empties[Math.floor(Math.random() * empties.length)] };
  }

  // core click handler
  function handleCellClick(microIndex, cellIndex) {
    if (mode === "online" && mySign && currentPlayer !== mySign) return;

    // Defensive guards: make sure indexes are valid numbers and within range
    if (typeof microIndex !== "number" || typeof cellIndex !== "number") return;
    if (microIndex < 0 || microIndex > 8 || cellIndex < 0 || cellIndex > 8) return;

    if (checkWin(mainWinners)) return;
    if (mainWinners[microIndex]) return;
    if (activeMainBoard !== null && activeMainBoard !== microIndex) return;
    if (ownerDecision) return;

    setBoards((prev) => {
      const copy = prev.map((m) => m.slice());
      if (!Array.isArray(copy[microIndex])) return prev;
      if (copy[microIndex][cellIndex]) return prev;

      copy[microIndex][cellIndex] = currentPlayer;
      if (clickSound.current) {
        const playPromise = clickSound.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("Audio play failed:", e));
        }
      }

      const microWinner = checkWin(copy[microIndex]);
      if (microWinner) {
        setMainWinners((prevW) => {
          const next = prevW.slice();
          next[microIndex] = microWinner;
          return next;
        });
      }

      const nextActive = cellIndex;
      const wonBy = (microWinner && nextActive === microIndex) ? microWinner : (mainWinners[nextActive] || null);
      const nextPlayer = currentPlayer === "X" ? "O" : "X";

      if (wonBy) {
        if (wonBy === nextPlayer) {
          // Case A: Box Winner (nextPlayer) already owns the target box. Free choice for nextPlayer.
          setActiveMainBoard(null);
          setMessage(`Box ${nextActive + 1} already won by ${wonBy}. Free choice for ${wonBy} on their turn.`);
        } else {
          // Case B: Opponent (nextPlayer) gets sent to a box owned by the currentPlayer (wonBy).
          // currentPlayer decides which big box opponent must play in.
          setOwnerDecision({ owner: wonBy, waitingFor: nextPlayer });
          setActiveMainBoard(null);
          setMessage(`Box ${nextActive + 1} is won by ${wonBy}. Owner must choose which main box ${nextPlayer} should play in next.`);
        }
      } else if (isFull(copy[nextActive])) {
        setActiveMainBoard(null);
        setMessage("Assigned main box is full — free choice for both players.");
      } else {
        setActiveMainBoard(nextActive);
        setMessage("");
      }

      return copy;
    });

    // send move to server in online mode
    if (mode === "online" && roomCode && socket.connected) {
      socket.emit("make_move", { roomCode, move: { microIndex, cellIndex, sign: currentPlayer } });
    }

    // toggle player
    setCurrentPlayer((prev) => (prev === "X" ? "O" : "X"));
  }

  // computer move
  useEffect(() => {
    if (mode !== "computer") return;
    if (ownerDecision) return; // Wait for owner decision before computer moves

    const computerSign = Object.keys(playerNames).find((k) => playerNames[k] === "Computer");
    if (!computerSign) return;
    if (currentPlayer !== computerSign) return;
    const t = setTimeout(() => {
      const mv = chooseAIMove();
      if (mv) handleCellClick(mv.microIndex, mv.cellIndex);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, boards, activeMainBoard, mainWinners, ownerDecision, playerNames]);

  // computer makes owner decision (Case B)
  useEffect(() => {
    if (mode !== "computer" || !ownerDecision) return;
    const computerSign = Object.keys(playerNames).find((k) => playerNames[k] === "Computer");
    if (ownerDecision.owner === computerSign) {
      const timer = setTimeout(() => {
        // AI picks any non-won, non-full board to assign to opponent
        const allowed = boards.map((m, i) => mainWinners[i] || isFull(m) ? null : i).filter((v) => v !== null);
        if (allowed.length > 0) {
          const pickBoard = allowed[Math.floor(Math.random() * allowed.length)];
          assignByOwner(pickBoard);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [ownerDecision, mode, playerNames, boards, mainWinners]);

  // detect macro winner
  useEffect(() => {
    const winner = checkWin(mainWinners);
    if (winner) {
      if (winSound.current) {
        const playPromise = winSound.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("Audio play failed:", e));
        }
      }
      addScore(playerNames[winner] || winner);
      setTimeout(() => navigate("/result", { state: { winner, playerNames } }), 900);
    } else {
      const isDraw = boards.every((micro, i) => mainWinners[i] || isFull(micro));
      if (isDraw) {
        setTimeout(() => navigate("/result", { state: { winner: null, playerNames } }), 900);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainWinners, boards]);

  function assignByOwner(choiceIndex) {
    if (mode === "online" && mySign && ownerDecision?.owner !== mySign) return;
    setActiveMainBoard(choiceIndex);
    setOwnerDecision(null);
    setMessage(`Owner assigned main box ${choiceIndex + 1} — forced for next player.`);

    if (mode === "online" && roomCode && socket.connected) {
      socket.emit("assign_board", { roomCode, choiceIndex });
    }
  }

  function displayName(sign) {
    return playerNames[sign] || (sign === "X" ? "Player X" : "Player O");
  }

  return (
    <div className="p-4 md:p-6 min-h-screen flex flex-col items-center animate-slide-up">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 max-w-6xl mb-6">
        <h1 className="text-3xl md:text-5xl font-extrabold text-center md:text-left text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]">
          Ultimate Tic-Tac-Toe
        </h1>
        <button onClick={() => { if (socket.connected) socket.emit('leave_room', { roomCode }); navigate('/'); }} className="glass-button px-4 py-2 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20 w-full md:w-auto">
          Quit Match
        </button>
      </div>

      <div className="glass-panel w-full max-w-6xl p-4 md:p-6 mb-6 flex flex-wrap gap-6 items-center justify-between shadow-[0_0_30px_rgba(255,255,255,0.05)] border-t border-l border-white/20">
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Current Turn</div>
          <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2 rounded-xl border border-white/20 shadow-sm">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] ${currentPlayer === "X" ? "bg-gradient-to-br from-indigo-500 to-purple-600 neon-border" : "bg-gradient-to-br from-emerald-400 to-teal-500"}`}
            >
              {currentPlayer}
            </div>
            <div className="font-bold text-slate-200 text-lg">
              {displayName(currentPlayer)}
            </div>
          </div>
        </div>

        {ownerDecision && (
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 bg-slate-900/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] p-3 rounded-2xl border border-amber-500/40 animate-slide-up">
            <div className="text-center md:text-right flex-shrink-0">
              <div className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400 text-sm uppercase tracking-wider mb-0.5">
                👑 Owner Decision
              </div>
              <div className="text-slate-300 text-xs font-medium">
                Choose target block for <span className={ownerDecision.waitingFor === 'X' ? 'text-indigo-400 font-bold' : 'text-emerald-400 font-bold'}>{ownerDecision.waitingFor}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
              {Array.from({ length: 9 }).map((_, i) => {
                const isWon = !!mainWinners[i];
                const isFullBoard = isFull(boards[i]);
                const disabled = isWon || isFullBoard;
                return (
                  <button
                    key={i}
                    onClick={() => { if (!disabled) assignByOwner(i) }}
                    disabled={disabled}
                    className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-sm md:text-base font-bold rounded-lg transition-all duration-300 border ${disabled ? 'opacity-30 grayscale border-white/5 cursor-not-allowed bg-slate-900 text-slate-500' : 'border-white/20 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.5)] hover:bg-amber-500/20 bg-slate-800/80 text-white shadow-sm hover:scale-105'}`}
                  >
                    {isWon ? mainWinners[i] : (isFullBoard ? "D" : (i + 1))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <div className="flex-1 min-w-[300px] text-center px-6 py-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 shadow-sm text-sm font-medium animate-pulse">
            {message}
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col items-center">


          <div className="glass-panel p-3 md:p-5 bg-black/40 backdrop-blur-2xl border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative w-full aspect-square max-w-[700px]">
            <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-2 md:gap-4">
              {boards.map((micro, microIndex) => {
                const isActive = activeMainBoard === null ? true : activeMainBoard === microIndex;
                const isWon = !!mainWinners[microIndex];

                return (
                  <div
                    key={microIndex}
                    className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isActive && !isWon ? "neon-border-forcing bg-slate-800/80 z-10" : "bg-slate-900/40 border border-white/10"} ${isWon ? "opacity-50 grayscale-[50%]" : ""}`}
                  >
                    {isWon && (
                      <div className="mask-won-board z-20 pointer-events-none">
                        <div className={`text-6xl md:text-8xl font-black drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] scale-150 transition-transform ${mainWinners[microIndex] === 'X' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                          {mainWinners[microIndex]}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 grid-rows-3 gap-[1px] md:gap-1 p-1 md:p-2 h-full w-full bg-slate-950/50">
                      {micro.map((cell, cellIndex) => (
                        <button
                          key={cellIndex}
                          onClick={() => ownerDecision ? assignByOwner(microIndex) : handleCellClick(microIndex, cellIndex)}
                          disabled={
                            !!cell ||
                            isWon ||
                            (activeMainBoard !== null && activeMainBoard !== microIndex && !ownerDecision) ||
                            (ownerDecision && ownerDecision.owner !== currentPlayer) || // If ownerDecision is active, only the owner can click
                            (ownerDecision && (isWon || isFull(boards[microIndex]))) // Owner cannot assign to a won or full board
                          }
                          className={`
                            relative flex items-center justify-center 
                            bg-slate-800/80 hover:bg-slate-700/80 transition-all 
                            rounded-sm md:rounded-md cursor-pointer border border-white/5
                            ${!cell && isActive && !isWon && !ownerDecision ? 'hover:bg-indigo-900/60 cursor-pointer shadow-none' : 'cursor-default'}
                            ${cell ? 'bg-slate-900/90 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : ''}
                          `}
                        >
                          {cell && (
                            <span className={`text-2xl md:text-4xl font-extrabold ${cell === 'X' ? 'text-indigo-400' : 'text-emerald-400'} animate-popIn drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                              {cell}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar for Metadata */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          <div className="glass-panel p-6 border-white/20 border-t border-l">
            <h3 className="font-bold text-white text-lg mb-4 border-b border-slate-700 pb-2">Match Participants</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center">X</div>
                  <span className="font-medium text-slate-200">{displayName("X")}</span>
                </div>
                {mySign === "X" && <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]">You</span>}
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center">O</div>
                  <span className="font-medium text-slate-200">{displayName("O")}</span>
                </div>
                {mySign === "O" && <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]">You</span>}
              </div>
            </div>
          </div>

          {mode === 'computer' && (
            <div className="glass-panel p-6 border-white/20 border-t border-l">
              <h3 className="font-bold text-white text-lg mb-3">AI Intelligence</h3>
              <select value={aiLevel} onChange={(e) => setAiLevel(e.target.value)} className="glass-input w-full p-3 font-medium cursor-pointer">
                <option value="easy">Easy (Random)</option>
                <option value="medium">Medium (Blocker)</option>
                <option value="hard">Hard (Strategic)</option>
              </select>
            </div>
          )}
        </aside>
      </div>
    </div >
  );
}
