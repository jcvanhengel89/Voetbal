import { useMemo, memo } from 'react';
import { APP_VERSION, FORMATIONS, TEAM_COLORS, formatTime, getInitials, getField, getScorers, Icons } from '../lib/game.jsx';

export const PlayerToken = memo(({ name, initials, isSelected, goals, benchTime = 0, showBenchTimer = false, role = null }) => {
        let timerClass = 'bg-white text-slate-600 border-slate-200';
        if (benchTime > 300) {
            timerClass = 'bg-red-50 text-red-600 border-red-200 animate-pulse';
        } else if (benchTime > 240) {
            timerClass = 'bg-orange-50 text-orange-600 border-orange-200';
        }

        // Bepaal de kleuren op basis van selectie en veld-rol
        let tokenBg = 'bg-white';
        let tokenBorder = 'border-slate-400 shadow-sm';
        let tokenText = 'text-slate-700';

        if (isSelected) {
            tokenBg = 'bg-indigo-50';
            tokenBorder = 'border-indigo-400 ring-4 ring-indigo-100';
            tokenText = 'text-indigo-700';
        } else if (role === 'k') {
            tokenBg = 'bg-amber-100';
            tokenBorder = 'border-amber-400 shadow-sm';
            tokenText = 'text-amber-800';
        }

        return (
            <div className={`relative flex flex-col items-center justify-center transition-all duration-200 ${isSelected ? 'scale-110 z-50' : 'scale-100 z-10'}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center relative border-2 ${tokenBg} ${tokenBorder}`}>
                    <span className={`font-bold text-sm tracking-wide ${tokenText}`}>{initials}</span>
                    {goals > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">{goals}</div>
                    )}
                    {showBenchTimer && (
                        <div className={`absolute -bottom-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shadow-sm z-10 whitespace-nowrap ${timerClass}`}>{formatTime(benchTime)}</div>
                    )}
                </div>
                <div className="mt-2 bg-slate-700 border border-slate-600 rounded-full px-2.5 py-0.5 max-w-[80px] truncate text-center shadow-sm">
                    <span className="text-[10px] font-semibold text-slate-50">{name}</span>
                </div>
            </div>
        );
    });

    export const FieldView = memo(({ players, selectedId, onSlotClick, formation }) => {
        const positions = FORMATIONS[formation].positions;

        return (
            <div className="absolute inset-0 p-4 flex items-center justify-center min-h-[450px]">
                {/* Lichter, frisser veld */}
                <div className="w-full h-full max-w-md relative bg-emerald-500 rounded-2xl border-4 border-white shadow-sm overflow-hidden select-none">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-300 via-transparent to-transparent"></div>
                    <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 40px)' }}></div>
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/40"></div>
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute top-0 left-1/2 w-32 h-16 border-2 border-t-0 border-white/40 -translate-x-1/2 rounded-b-xl"></div>
                    <div className="absolute bottom-0 left-1/2 w-32 h-16 border-2 border-b-0 border-white/40 -translate-x-1/2 rounded-t-xl"></div>

                    {Object.entries(positions).map(([key, coords]) => {
                        const player = players.find(p => p.pos === key && p.present);
                        const isSelected = player && player.id === selectedId;

                        return (
                            <div
                                key={key}
                                onClick={() => onSlotClick(player ? player.id : null, key)}
                                className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center cursor-pointer touch-manipulation"
                                style={{ top: `${coords.top}%`, left: `${coords.left}%` }}
                            >
                                {player ? (
                                    <PlayerToken
                                        name={player.name}
                                        initials={getInitials(player.name)}
                                        goals={player.goals}
                                        isSelected={isSelected}
                                        role={coords.type}
                                    />
                                ) : (
                                    <div className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${selectedId ? 'bg-white/30 border-white animate-pulse' : 'border-white/40 hover:bg-white/10'}`}>
                                        <span className="text-[10px] font-bold text-white/60">{coords.label}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    });

    export const StatsView = memo(({ players, sortConfig, onChangeSort }) => {
        const sortedPlayers = useMemo(() => {
            const list = [...players].filter(p => p.present);
            if (!sortConfig.key) return list;
            return list.sort((a, b) => {
                if (sortConfig.key === 'name') {
                    return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                }
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === bVal) return 0;
                const cmp = aVal > bVal ? 1 : -1;
                return sortConfig.direction === 'asc' ? cmp : -cmp;
            });
        }, [players, sortConfig]);

        return (
            <div className="absolute inset-0 overflow-y-auto p-4 max-w-md mx-auto">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Live Statistieken</h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-3 pl-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onChangeSort('name', 'asc')}>Naam</th>
                                <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onChangeSort('goals', 'desc')}>Goal</th>
                                <th className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onChangeSort('benchTime', 'desc')}>Bank</th>
                                <th className="p-3 pr-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onChangeSort('playTime', 'desc')}>Veld</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {sortedPlayers.map(p => {
                                const stats = p.posStats || { k:0, def:0, mid:0, att:0 };
                                const totalPosTime = stats.k + stats.def + stats.mid + stats.att;
                                
                                return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 pl-4">
                                        <div className="font-medium">{p.name}</div>
                                        {totalPosTime > 0 && (
                                            <div className="flex w-full max-w-[80px] h-1.5 mt-1.5 rounded-full overflow-hidden bg-slate-100">
                                                {stats.k > 0 && <div style={{width: `${(stats.k/totalPosTime)*100}%`}} className="bg-yellow-400" title="Keeper" />}
                                                {stats.def > 0 && <div style={{width: `${(stats.def/totalPosTime)*100}%`}} className="bg-blue-400" title="Verdediging" />}
                                                {stats.mid > 0 && <div style={{width: `${(stats.mid/totalPosTime)*100}%`}} className="bg-emerald-400" title="Middenveld" />}
                                                {stats.att > 0 && <div style={{width: `${(stats.att/totalPosTime)*100}%`}} className="bg-red-400" title="Aanval" />}
                                            </div>
                                        )}
                                    </td>
                                    <td className={`text-center font-bold align-top pt-3 ${p.goals > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{p.goals || '-'}</td>
                                    <td className={`text-right font-mono align-top pt-3 ${p.pos === null ? 'text-orange-500 font-bold' : ''}`}>{formatTime(p.benchTime)}</td>
                                    <td className="text-right pr-4 font-mono text-slate-400 align-top pt-3">{formatTime(p.playTime)}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex gap-4 text-[10px] text-slate-500 justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Keeper</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Verd.</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Midden</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"></span>Aanval</span>
                </div>
            </div>
        );
    });

    export const SetupView = memo(({ players, opponent, formation, onFormationChange, onOpponentNameChange, onOpponentColorChange, onRemovePlayer, onChangePlayerName, onTogglePresence, onCopyReport, onResetMatch, onFactoryReset, onAddPlayer, onExportData, onImportData }) => (
        <div className="absolute inset-0 overflow-y-auto p-4 max-w-md mx-auto bg-slate-50 z-20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                <Icons.Settings size={22} /> Instellingen
            </h2>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Icons.Swords size={14} /> Wedstrijd Info</h3>
                <div className="space-y-5">
                    
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2 flex items-center gap-1.5">
                            <Icons.Layout size={14} /> Formatie
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(FORMATIONS).map(([key, data]) => (
                                <button
                                    key={key}
                                    onClick={() => onFormationChange(key)}
                                    className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                        formation === key
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            {FORMATIONS[formation].label}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">Naam Tegenstander</label>
                        <input value={opponent.name} onChange={e => onOpponentNameChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" placeholder="Bijv. VV Katwijk" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2 flex items-center gap-1.5"><Icons.Palette size={14} /> Shirt Kleur</label>
                        <div className="flex gap-3 flex-wrap">
                            {TEAM_COLORS.map(c => (
                                <button key={c.id} onClick={() => onOpponentColorChange(c.id)} className={`w-8 h-8 rounded-full ${c.bg} shadow-sm border-2 ${opponent.colorId === c.id ? 'border-slate-800 scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`} title={c.id} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Icons.Users size={14} /> Spelers ({players.filter(p => p.present).length}/{players.length})</h3>
                <div className="space-y-2">
                    {players.map(p => (
                        <div key={p.id} className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex items-center gap-2 transition-colors focus-within:border-indigo-200 focus-within:bg-indigo-50/30">
                            <button onClick={() => onRemovePlayer(p.id)} className="w-8 h-8 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><Icons.X size={16} /></button>
                            <input value={p.name} onChange={e => onChangePlayerName(p.id, e.target.value)} className="bg-transparent flex-1 px-2 py-1 font-medium text-slate-700 focus:outline-none" />
                            <button onClick={() => onTogglePresence(p.id)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase transition-all shadow-sm ${p.present ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{p.present ? 'Aanwezig' : 'Afwezig'}</button>
                        </div>
                    ))}
                    <button onClick={onAddPlayer} className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 text-slate-500 font-medium rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"><Icons.Plus size={16} /> Speler Toevoegen</button>
                </div>
            </div>
            
            <div className="space-y-3 pb-8">
                <button onClick={onCopyReport} className="w-full bg-emerald-500 hover:bg-emerald-600 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-sm transition-colors"><Icons.ClipboardCheck size={18} /> Kopieer Verslag</button>
                <button onClick={onResetMatch} className="w-full bg-slate-800 hover:bg-slate-900 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-sm transition-colors"><Icons.RotateCcw size={18} /> Reset Huidige Wedstrijd</button>
                
                <div className="flex gap-3">
                    <button onClick={onExportData} className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-slate-600 text-xs uppercase transition-colors">
                        <Icons.Save size={16} /> Backup
                    </button>
                    <label className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-slate-600 text-xs uppercase cursor-pointer transition-colors">
                        <Icons.Upload size={16} /> Laad in
                        <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                    </label>
                </div>

                <button onClick={onFactoryReset} className="w-full text-red-500 hover:bg-red-50 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 mt-4 transition-colors"><Icons.AlertTriangle size={14} /> Totale Fabrieksreset</button>
                
                {/* Zichtbaar Versienummer */}
                <div className="mt-8 text-center text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1">
                    <Icons.Settings size={10} /> Versie: {APP_VERSION}
                </div>
            </div>
        </div>
    ));

    export const ConfettiExplosion = memo(() => {
        const particles = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + '%',
            bg: ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#6366F1'][Math.floor(Math.random() * 5)],
            delay: Math.random() * 0.5 + 's',
            duration: (Math.random() * 1 + 2) + 's',
            rotation: Math.random() * 360 + 'deg',
        })), []);
        return (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-[100]">
                {particles.map(p => (
                    <div key={p.id} className="absolute w-2.5 h-2.5 rounded-sm shadow-sm" style={{ left: p.left, top: '-20px', backgroundColor: p.bg, animation: `fall ${p.duration} linear forwards`, animationDelay: p.delay, transform: `rotate(${p.rotation})` }} />
                ))}
            </div>
        );
    });

    // --------------------------------------------------------------------
    // HOOFDAPP
    // --------------------------------------------------------------------

    