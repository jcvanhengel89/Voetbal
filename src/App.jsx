import { useState, useEffect, useCallback } from 'react';
import { clearAppStorage, storageKey } from './lib/storage';
import { FORMATIONS, TEAM_COLORS, getFreshPlayers, formatTime, getBench, getField, getScorers, Icons } from './lib/game.jsx';
import { useWakeLock } from './hooks/useWakeLock';
import { useThrottledStorage } from './hooks/useThrottledStorage';
import { FieldView, StatsView, SetupView, ConfettiExplosion, PlayerToken } from './components/views';
import { parseBackupFile } from './lib/backup';

function App() {
        const [players, setPlayers] = useThrottledStorage(storageKey('players'), getFreshPlayers(), 5000);
        const [timer, setTimer] = useThrottledStorage(storageKey('timer'), 0, 5000);
        const [history, setHistory] = useThrottledStorage(storageKey('history'), [], 5000);
        const [score, setScore] = useThrottledStorage(storageKey('score'), { home: 0, away: 0 }, 5000);
        const [quarter, setQuarter] = useThrottledStorage(storageKey('quarter'), 1, 5000);
        const [formation, setFormation] = useThrottledStorage(storageKey('formation'), '6v6', 5000);
        
        const [archive, setArchive] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey('archive')) || '[]'); } catch { return []; }});
        const [opponent, setOpponent] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey('opponent')) || JSON.stringify({ name: 'Tegenstander', colorId: 'blue' })); } catch { return { name: 'Tegenstander', colorId: 'blue' }; }});

        const [isRunning, setIsRunning] = useState(false);
        const [selectedId, setSelectedId] = useState(null);
        const [view, setView] = useState('field');
        const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
        const handleSortChange = useCallback((key, direction) => setSortConfig({ key, direction }), []);

        const [showGoalModal, setShowGoalModal] = useState(false);
        const [showUndoGoalModal, setShowUndoGoalModal] = useState(false);
        const [showEndModal, setShowEndModal] = useState(false);
        const [showConfetti, setShowConfetti] = useState(false);
        const [confirmDialog, setConfirmDialog] = useState(null);

        useWakeLock(isRunning);

        useEffect(() => localStorage.setItem(storageKey('archive'), JSON.stringify(archive)), [archive]);
        useEffect(() => localStorage.setItem(storageKey('opponent'), JSON.stringify(opponent)), [opponent]);

        const safeOpponent = opponent || { name: 'Tegenstander', colorId: 'blue' };
        const oppColor = TEAM_COLORS.find(c => c.id === safeOpponent.colorId) || TEAM_COLORS[0];
        
        const currentPositions = FORMATIONS[formation].positions;

        const handleOpponentNameChange = useCallback((n) => setOpponent(o => ({ ...o, name: n })), [setOpponent]);
        const handleOpponentColorChange = useCallback((c) => setOpponent(o => ({ ...o, colorId: c })), [setOpponent]);
        const handleRemovePlayer = useCallback((id) => setConfirmDialog({ message: 'Weet je zeker dat je deze speler wilt wissen?', onConfirm: () => setPlayers(curr => curr.filter(p => p.id !== id)) }), [setPlayers]);
        const handleChangePlayerName = useCallback((id, n) => setPlayers(curr => curr.map(p => p.id === id ? { ...p, name: n } : p)), [setPlayers]);
        const handleTogglePresence = useCallback((id) => setPlayers(curr => curr.map(p => p.id === id ? { ...p, present: !p.present, pos: !p.present ? p.pos : null } : p)), [setPlayers]);
        const handleAddPlayer = useCallback(() => setPlayers(curr => [...curr, { id: Date.now(), name: 'Nieuw', pos: null, benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: {k:0,def:0,mid:0,att:0} }]), [setPlayers]);
        
        const handleFormationChange = useCallback((newFormat) => {
            setFormation(newFormat);
            const newPositions = FORMATIONS[newFormat].positions;
            setPlayers(curr => curr.map(p => {
                if (p.pos && !newPositions[p.pos]) {
                    return { ...p, pos: null };
                }
                return p;
            }));
        }, [setFormation, setPlayers]);

        const handleExportData = useCallback(() => {
            const backupData = {
                version: 'voetbal_v3',
                date: new Date().toISOString(),
                data: { players, archive, opponent, history, score, quarter, formation }
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `coach_app_backup_${new Date().toLocaleDateString('nl-NL')}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
        }, [players, archive, opponent, history, score, quarter, formation]);

        const handleImportData = useCallback((e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = parseBackupFile(event.target.result);
                    if (confirm('Let op: Dit overschrijft je huidige status met de data uit de backup. Doorgaan?')) {
                        setPlayers(parsed.players);
                        setArchive(parsed.archive);
                        setOpponent(parsed.opponent);
                        setHistory(parsed.history);
                        setScore(parsed.score);
                        setQuarter(parsed.quarter);
                        setFormation(parsed.formation);
                        alert('Backup succesvol hersteld!');
                    }
                } catch (err) {
                    alert(err instanceof Error ? err.message : 'Fout bij het inladen van bestand.');
                } finally {
                    e.target.value = '';
                }
            };
            reader.readAsText(file);
        }, [setPlayers, setArchive, setOpponent, setHistory, setScore, setQuarter, setFormation]);

        const handleInteraction = useCallback((targetId, targetPos = null) => {
            if (selectedId === null) {
                if (targetId) setSelectedId(targetId);
                return;
            }
            if (selectedId === targetId) {
                setSelectedId(null);
                return;
            }

            setPlayers(currentPlayers => {
                const p1Idx = currentPlayers.findIndex(p => p.id === selectedId);
                if (p1Idx === -1) return currentPlayers;

                const newPlayers = [...currentPlayers];
                if (!targetId && targetPos) {
                    newPlayers[p1Idx] = { ...newPlayers[p1Idx], pos: targetPos };
                    return newPlayers;
                }

                const p2Idx = currentPlayers.findIndex(p => p.id === targetId);
                if (p2Idx === -1) return currentPlayers;

                const p1 = newPlayers[p1Idx];
                const p2 = newPlayers[p2Idx];

                const tmpPos = p1.pos;
                newPlayers[p1Idx] = { ...p1, pos: p2.pos };
                newPlayers[p2Idx] = { ...p2, pos: tmpPos };
                
                return newPlayers;
            });

            const p1 = players.find(p => p.id === selectedId);
            const p2 = players.find(p => p.id === targetId);
            
            if (p1 && p2 && ((p1.pos === null && p2.pos !== null) || (p1.pos !== null && p2.pos === null))) {
                 if (isRunning || quarter > 1) { 
                    const outP = p1.pos !== null ? p1 : p2;
                    const inP = p1.pos === null ? p1 : p2;
                    setHistory(h => [{ id: Date.now(), time: formatTime(timer), q: quarter, in: inP.name, out: outP.name }, ...h]);
                    setPlayers(curr => curr.map(p => p.id === outP.id ? { ...p, benchCount: p.benchCount + 1 } : p));
                 }
            } else if (!targetId && targetPos) {
                setSelectedId(null);
                return;
            }
            setSelectedId(null);
        }, [selectedId, players, isRunning, quarter, timer, setPlayers, setHistory]);

        useEffect(() => {
            if (!isRunning) return;
            const interval = setInterval(() => {
                setTimer(t => t + 1);
                setPlayers(curr => curr.map(p => {
                    if (!p.present) return p;
                    if (p.pos === null) return { ...p, benchTime: p.benchTime + 1 };
                    
                    const posInfo = currentPositions[p.pos];
                    if (!posInfo) return p;

                    const posType = posInfo.type || 'mid';
                    const stats = p.posStats || { k:0, def:0, mid:0, att:0 };
                    return { 
                        ...p, 
                        playTime: p.playTime + 1,
                        posStats: { ...stats, [posType]: stats[posType] + 1 }
                    };
                }));
            }, 1000);
            return () => clearInterval(interval);
        }, [isRunning, setTimer, setPlayers, currentPositions]);

        useEffect(() => {
            if (showConfetti) {
                const t = setTimeout(() => setShowConfetti(false), 3000);
                return () => clearTimeout(t);
            }
        }, [showConfetti]);

        const toggleTimer = useCallback(() => {
            if (!isRunning && timer === 0 && quarter === 1) {
                setPlayers(prev => prev.map(p => p.pos === null && p.present ? { ...p, benchCount: p.benchCount + 1 } : p));
            }
            setIsRunning(prev => !prev);
        }, [isRunning, timer, quarter, setPlayers]);

        const registerGoal = (playerId) => {
            setScore(s => ({ ...s, home: s.home + 1 }));
            if (playerId) setPlayers(curr => curr.map(p => p.id === playerId ? { ...p, goals: p.goals + 1 } : p));
            setShowGoalModal(false);
            setShowConfetti(true);
        };

        const removeGoal = (playerId) => {
            setScore(s => ({ ...s, home: Math.max(0, s.home - 1) }));
            if (playerId) setPlayers(curr => curr.map(p => p.id === playerId ? { ...p, goals: Math.max(0, p.goals - 1) } : p));
            setShowUndoGoalModal(false);
        };

        const copyReport = () => {
            let resultText = 'Gelijkspel 🤝';
            if (score.home > score.away) resultText = 'Winst! 🏆';
            else if (score.home < score.away) resultText = 'Helaas..';
            const scorers = getScorers(players).map(p => `${p.name} (${p.goals}x)`).join(', ');
            const report = `⚽ *WEDSTRIJDVERSLAG JO9-10* ⚽\n\n🆚 Tegen: ${safeOpponent.name}\n📊 *Eindstand:* ${score.home} - ${score.away} (${resultText})\n\n🎯 *Doelpunten:* ${scorers || 'Geen'}\n\nToppers! 💪`;
            navigator.clipboard.writeText(report).then(() => alert('Gekopieerd!')).catch(() => prompt('Kopieer handmatig:', report));
        };

        const performReset = useCallback(() => {
            setIsRunning(false);
            setScore({ home: 0, away: 0 });
            setTimer(0);
            setQuarter(1);
            setHistory([]);
            setOpponent({ name: 'Tegenstander', colorId: 'blue' }); 
            setPlayers(curr => curr.map(p => ({ 
                ...p, 
                goals: 0, 
                benchTime: 0, 
                playTime: 0, 
                benchCount: 0, 
                posStats: { k:0, def:0, mid:0, att:0 } 
            })));
            setSelectedId(null);
        }, [setPlayers, setScore, setTimer, setQuarter, setHistory, setOpponent]);

        const resetMatch = () => {
            setConfirmDialog({
                message: '⚠ Let op: Je wist hiermee ALLES van DEZE wedstrijd (ook de tegenstander). Het seizoensarchief blijft wel bewaard.',
                isDestructive: true,
                onConfirm: () => performReset()
            });
        };

        const factoryReset = () => {
            setConfirmDialog({
                message: '☠️ FABRIEKSINSTELLINGEN ☠️\n\nWeet je dit heel zeker? Alle spelers, instellingen en de volledige historie worden onherroepelijk gewist.',
                isDestructive: true,
                onConfirm: () => { clearAppStorage(); location.reload(); }
            });
        };
        
        const archiveMatch = () => {
             setConfirmDialog({
                 message: '💾 Wedstrijd succesvol afronden, opslaan in het archief en het veld resetten voor de volgende keer?',
                 onConfirm: () => {
                     const matchData = {
                        id: Date.now(),
                        date: new Date().toLocaleDateString('nl-NL'),
                        opponent: safeOpponent.name,
                        score,
                        colorId: safeOpponent.colorId,
                        playerStats: players.map(p => ({ name: p.name, goals: p.goals, playTime: p.playTime, posStats: p.posStats }))
                    };
                    setArchive(prev => [matchData, ...prev]);
                    performReset(); 
                    setShowEndModal(false);
                    setView('season');
                 }
             });
        };

        const benchPlayers = getBench(players);

        return (
            // Flex-container layout met expliciete 100dvh min-height voor perfecte iOS integratie, en overflow-y-auto toegestaan.
            <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto relative bg-slate-50 shadow-2xl overflow-y-auto overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {showConfetti && <ConfettiExplosion />}

                {/* MODALS (Light Mode) */}
                {(showGoalModal || showUndoGoalModal || showEndModal || confirmDialog) && (
                    <div className="absolute inset-0 z-[60] bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s]">
                        <div className="bg-white rounded-3xl shadow-2xl w-full p-6 border border-slate-100">
                            {showGoalModal && (
                                <>
                                    <h3 className="text-3xl font-black text-center mb-6 text-emerald-500 uppercase tracking-wider font-mono">Goal! ⚽</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">
                                        {getField(players).map(p => (
                                            <button key={p.id} onClick={() => registerGoal(p.id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-4 rounded-xl border border-emerald-200 active:scale-95 transition-all">{p.name}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => registerGoal(null)} className="w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold mb-2 text-slate-700 transition-colors">Overig / Eigen Goal</button>
                                    <button onClick={() => setShowGoalModal(false)} className="w-full text-slate-400 font-medium text-sm py-2 hover:text-slate-600 transition-colors">Annuleren</button>
                                </>
                            )}
                            {showUndoGoalModal && (
                                <>
                                    <h3 className="text-xl font-bold text-center mb-4 text-red-500">Goal Correctie</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {getScorers(players).map(p => (
                                            <button key={p.id} onClick={() => removeGoal(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 py-3 border border-red-200 rounded-xl font-bold transition-colors">{p.name} ({p.goals})</button>
                                        ))}
                                    </div>
                                    <button onClick={() => removeGoal(null)} className="w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold mb-2 text-slate-700 transition-colors">Overig</button>
                                    <button onClick={() => setShowUndoGoalModal(false)} className="w-full text-slate-400 font-medium text-sm py-2 hover:text-slate-600 transition-colors">Annuleren</button>
                                </>
                            )}
                            {showEndModal && (
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-slate-800 mb-1 uppercase">Wedstrijd Einde</h2>
                                    <div className="text-md text-slate-500 mb-6 font-medium">vs {safeOpponent.name}</div>
                                    <div className="text-6xl font-mono font-bold mb-8 tracking-widest bg-slate-50 text-slate-800 rounded-2xl py-5 border border-slate-100 shadow-inner">{score.home} - {score.away}</div>
                                    <button onClick={copyReport} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-sm mb-3 flex items-center justify-center gap-2 text-lg hover:bg-emerald-600 transition-colors"><Icons.ClipboardCheck /> Verslag Kopiëren</button>
                                    <button onClick={archiveMatch} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold shadow-sm mb-3 flex items-center justify-center gap-2 text-lg hover:bg-indigo-600 transition-colors"><Icons.Save /> Opslaan & Archiveren</button>
                                    <button onClick={() => setShowEndModal(false)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-slate-500 font-semibold hover:bg-slate-50 transition-colors">Terug naar Veld</button>
                                </div>
                            )}
                            {confirmDialog && (
                                <div className="text-center">
                                    <h3 className={`text-xl font-bold mb-4 ${confirmDialog.isDestructive ? 'text-red-500' : 'text-slate-800'}`}>Bevestiging</h3>
                                    <p className="text-slate-600 mb-8 text-sm font-medium whitespace-pre-line leading-relaxed">{confirmDialog.message}</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-colors shadow-sm ${confirmDialog.isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>Ja, doorgaan</button>
                                        <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Annuleren</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TOPBAR - Rustige 2-polige layout (Tijd links, Score rechts) */}
                <div className="flex-none h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 z-50 flex items-center justify-between shadow-sm">
                    
                    {/* Linker Anker: Kwart & Tijd */}
                    <div className="flex flex-col items-start justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Kwart {quarter}</span>
                        <div className={`text-3xl font-mono font-black tracking-tight leading-none ${timer >= 600 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>{formatTime(timer)}</div>
                    </div>

                    {/* Rechter Anker: Tegenstander & Scorebord */}
                    <div className="flex flex-col items-end justify-center">
                        <div className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px] leading-none mb-1.5 uppercase tracking-wide">
                            Nwk <span className="text-slate-300 font-normal mx-0.5">vs</span> {safeOpponent.name}
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-full border border-slate-200 px-1.5 py-1 shadow-sm">
                            <div className="flex items-center gap-1">
                                <button onClick={() => score.home > 0 && setShowUndoGoalModal(true)} className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center font-bold active:scale-90 transition-transform"><Icons.Minus size={14} /></button>
                                <span className="w-7 text-center text-xl font-black text-slate-800 font-mono">{score.home}</span>
                                <button onClick={() => setShowGoalModal(true)} className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm active:scale-90 transition-transform"><Icons.Plus size={16} /></button>
                            </div>
                            <span className="text-slate-300 mx-1.5 text-lg font-light">|</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setScore(s => ({ ...s, away: Math.max(0, s.away - 1) }))} className={`w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:${oppColor.text} flex items-center justify-center font-bold active:scale-90 transition-transform`}><Icons.Minus size={14} /></button>
                                <span className={`w-7 text-center text-xl font-black ${oppColor.text} font-mono`}>{score.away}</span>
                                <button onClick={() => setScore(s => ({ ...s, away: s.away + 1 }))} className={`w-7 h-7 rounded-full ${oppColor.bg} text-white flex items-center justify-center font-bold shadow-sm active:scale-90 transition-transform`}><Icons.Plus size={16} /></button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 relative overflow-hidden bg-slate-50 w-full min-h-[450px]">
                    {view === 'field' && <FieldView players={players} selectedId={selectedId} onSlotClick={handleInteraction} formation={formation} />}
                    {view === 'stats' && <StatsView players={players} sortConfig={sortConfig} onChangeSort={handleSortChange} />}
                    
                    {view === 'log' && (
                        <div className="absolute inset-0 overflow-y-auto p-4 max-w-md mx-auto">
                             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Wissel Logboek</h2>
                             <div className="space-y-2">{history.map(h => (
                                <div key={h.id} className="bg-white border border-slate-200 p-3.5 rounded-xl flex justify-between items-center text-slate-700 shadow-sm">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">Q{h.q} {h.time}</span>
                                    <div className="text-sm font-medium"><span className="text-red-500">{h.out}</span> <span className="text-slate-300 mx-1">➜</span> <span className="text-emerald-500">{h.in}</span></div>
                                </div>
                             ))}</div>
                        </div>
                    )}
                    
                    {view === 'season' && (
                         <div className="absolute inset-0 overflow-y-auto p-4 max-w-md mx-auto">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Archief ({archive.length})</h2>
                            <div className="space-y-3">
                                {archive.map(m => (
                                    <div key={m.id} className="bg-white p-4 rounded-2xl flex flex-col gap-2 border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center"><span className="text-slate-400 font-medium text-xs">{m.date}</span><span className="text-sm font-bold text-slate-700">vs {m.opponent}</span></div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Uitslag</span>
                                            <span className={`font-mono font-black text-lg ${m.score.home > m.score.away ? 'text-emerald-500' : m.score.home < m.score.away ? 'text-red-500' : 'text-slate-500'}`}>{m.score.home} - {m.score.away}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}

                    {view === 'setup' && (
                        <SetupView
                            players={players}
                            opponent={safeOpponent}
                            formation={formation}
                            onFormationChange={handleFormationChange}
                            onOpponentNameChange={handleOpponentNameChange}
                            onOpponentColorChange={handleOpponentColorChange}
                            onRemovePlayer={handleRemovePlayer}
                            onChangePlayerName={handleChangePlayerName}
                            onTogglePresence={handleTogglePresence}
                            onAddPlayer={handleAddPlayer}
                            onCopyReport={copyReport}
                            onResetMatch={resetMatch}
                            onFactoryReset={factoryReset}
                            onExportData={handleExportData}
                            onImportData={handleImportData}
                        />
                    )}
                </div>

                {/* FOOTER - Met 5 tabbladen, setup knop is hier nu onderdeel van */}
                <div className="flex-none bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
                    
                    {/* Tabbladen Navigatie (Altijd zichtbaar) */}
                    <div className="flex border-b border-slate-100">
                        {[
                            { id: 'field', label: 'Veld', icon: Icons.Trophy }, 
                            { id: 'stats', label: 'Stats', icon: Icons.ClipboardCheck }, 
                            { id: 'log', label: 'Log', icon: Icons.Clock }, 
                            { id: 'season', label: 'Seizoen', icon: Icons.History },
                            { id: 'setup', label: 'Opties', icon: Icons.Settings }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setView(tab.id)} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${view === tab.id ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                                <tab.icon size={18} /><span className="text-[9px] font-bold uppercase tracking-widest truncate w-full text-center px-1">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Wisselbank & Knoppen (Alleen zichtbaar bij actieve coaching tabs) */}
                    {(view === 'field' || view === 'stats' || view === 'log') && (
                        <div className="p-4 pt-3">
                            <div className="mb-2 px-1 flex justify-between items-end">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wisselbank ({benchPlayers.length})</span>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide min-h-[80px]">
                                {benchPlayers.length > 0 ? benchPlayers.map(p => (
                                    <div key={p.id} onClick={() => handleInteraction(p.id)} className="flex-shrink-0 cursor-pointer">
                                        <PlayerToken name={p.name} initials={getInitials(p.name)} goals={p.goals} isSelected={p.id === selectedId} benchTime={p.benchTime} showBenchTimer />
                                    </div>
                                )) : <div className="w-full text-center text-slate-400 font-medium text-xs py-4 border-2 border-dashed border-slate-200 rounded-xl">Iedereen staat in het veld!</div>}
                            </div>
                            <div className="flex gap-3 mt-3">
                                <button onClick={toggleTimer} className={`flex-1 py-4 rounded-xl font-bold text-sm shadow-sm border flex items-center justify-center gap-2 transform active:scale-95 transition-all ${isRunning ? 'bg-white border-amber-200 text-amber-600 ring-2 ring-amber-100' : 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30 shadow-lg hover:bg-emerald-600'}`}>
                                    {isRunning ? <><Icons.Pause size={18} /> PAUZE</> : <><Icons.Play size={18} /> START</>}
                                </button>
                                <button onClick={() => {
                                    if (quarter === 4) {
                                        setShowEndModal(true);
                                    } else {
                                        setConfirmDialog({
                                            message: `Volgend kwart (Kwart ${quarter + 1}) starten?\n\nDe tijd wordt gereset naar 00:00.`,
                                            onConfirm: () => { setQuarter(q => q + 1); setTimer(0); setIsRunning(false); }
                                        });
                                    }
                                }} className={`px-6 py-3 rounded-xl font-bold text-[10px] shadow-sm flex flex-col items-center justify-center leading-none transform active:scale-95 transition-all border ${quarter === 4 ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    {quarter === 4 ? <span className="text-xs">EINDE</span> : <><span className="mb-0.5"><Icons.FastForward size={14} /></span>KWART</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Vulling/Feedback voor Archief Modus, geen knoppen */}
                    {view === 'season' && (
                        <div className="text-center text-xs font-medium text-slate-400 py-5">Archief Modus</div>
                    )}
                </div>
            </div>
        );
    }


export default App;
