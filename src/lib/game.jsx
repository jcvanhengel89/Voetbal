import React from 'react';

export const APP_VERSION = '3.0.0';
    
    const FORMATIONS = {
        '6v6': {
            label: '6 vs 6 (Standaard)',
            positions: {
                k:  { label: 'K',   top: 88, left: 50, type: 'k' },
                lv: { label: 'LV',  top: 68, left: 20, type: 'def' },
                rv: { label: 'RV',  top: 68, left: 80, type: 'def' },
                m:  { label: 'MID', top: 45, left: 50, type: 'mid' },
                la: { label: 'LA',  top: 22, left: 20, type: 'att' },
                ra: { label: 'RA',  top: 22, left: 80, type: 'att' },
            }
        },
        '7v7': {
            label: '7 vs 7 (Extra Verdediger)',
            positions: {
                k:  { label: 'K',   top: 88, left: 50, type: 'k' },
                lv: { label: 'LV',  top: 68, left: 15, type: 'def' },
                cv: { label: 'CV',  top: 73, left: 50, type: 'def' },
                rv: { label: 'RV',  top: 68, left: 85, type: 'def' },
                m:  { label: 'MID', top: 45, left: 50, type: 'mid' },
                la: { label: 'LA',  top: 22, left: 20, type: 'att' },
                ra: { label: 'RA',  top: 22, left: 80, type: 'att' },
            }
        },
        '8v8': {
            label: '8 vs 8 (Dubbel Middenveld)',
            positions: {
                k:  { label: 'K',   top: 88, left: 50, type: 'k' },
                lv: { label: 'LV',  top: 73, left: 15, type: 'def' },
                cv: { label: 'CV',  top: 78, left: 50, type: 'def' },
                rv: { label: 'RV',  top: 73, left: 85, type: 'def' },
                lm: { label: 'LM',  top: 50, left: 30, type: 'mid' },
                rm: { label: 'RM',  top: 50, left: 70, type: 'mid' },
                la: { label: 'LA',  top: 25, left: 20, type: 'att' },
                ra: { label: 'RA',  top: 25, left: 80, type: 'att' },
            }
        }
    };

    const TEAM_COLORS = [
        { id: 'blue',   bg: 'bg-blue-500',   text: 'text-blue-600',   border: 'border-blue-500' },
        { id: 'red',    bg: 'bg-red-500',    text: 'text-red-600',    border: 'border-red-500' },
        { id: 'green',  bg: 'bg-emerald-500',text: 'text-emerald-600',border: 'border-emerald-500' },
        { id: 'yellow', bg: 'bg-amber-400',  text: 'text-amber-600',  border: 'border-amber-400' },
        { id: 'purple', bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
        { id: 'orange', bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' },
        { id: 'black',  bg: 'bg-slate-800',  text: 'text-slate-700',  border: 'border-slate-800' },
        { id: 'white',  bg: 'bg-white',      text: 'text-slate-400',  border: 'border-slate-300' },
    ];

    const INITIAL_PLAYERS = [
        { id: 1, name: 'Levi',     pos: 'k',  benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 2, name: 'Sem',      pos: 'lv', benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 3, name: 'Seff',     pos: 'rv', benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 4, name: 'Xavi',     pos: 'm',  benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 5, name: 'Tygo',     pos: 'la', benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 6, name: 'Yara',     pos: 'ra', benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 7, name: 'Mohamed',  pos: null, benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 8, name: 'Ali',      pos: null, benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
        { id: 9, name: 'Yikshith', pos: null, benchTime: 0, playTime: 0, benchCount: 0, goals: 0, present: true, posStats: { k:0, def:0, mid:0, att:0 } },
    ];

    // --------------------------------------------------------------------
    // CUSTOM HOOKS
    // --------------------------------------------------------------------

    
const getFreshPlayers = () => JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    const getInitials = (name) => (name ? name.substring(0, 2).toUpperCase() : '??');
    const getBench = (players) => players.filter(p => p.pos === null && p.present);
    const getField = (players) => players.filter(p => p.pos !== null && p.present);
    const getScorers = (players) => players.filter(p => p.goals > 0 && p.present);

    const Icon = ({ path, color = 'currentColor', size = 20, className = '' }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {path}
        </svg>
    );

    const Icons = {
        Trophy: (p) => <Icon {...p} path={<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>} />,
        Clock: (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
        RotateCcw: (p) => <Icon {...p} path={<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>} />,
        Save: (p) => <Icon {...p} path={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} />,
        Upload: (p) => <Icon {...p} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />,
        Settings: (p) => <Icon {...p} path={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>} />,
        Users: (p) => <Icon {...p} path={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
        History: (p) => <Icon {...p} path={<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></>} />,
        ClipboardCheck: (p) => <Icon {...p} path={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/><path d="M14 13.5l2 2 4-4"/></>} />,
        Play: (p) => <Icon {...p} path={<polygon points="5 3 19 12 5 21 5 3"/>} />,
        Pause: (p) => <Icon {...p} path={<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>} />,
        FastForward: (p) => <Icon {...p} path={<><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></>} />,
        Plus: (p) => <Icon {...p} path={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
        Minus: (p) => <Icon {...p} path={<line x1="5" y1="12" x2="19" y2="12"/>} />,
        X: (p) => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
        AlertTriangle: (p) => <Icon {...p} path={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
        Swords: (p) => <Icon {...p} path={<><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></>} />,
        Palette: (p) => <Icon {...p} path={<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>} />,
        Layout: (p) => <Icon {...p} path={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></>} />,
    };

    // --------------------------------------------------------------------
    // COMPONENTEN (Light Mode Aangepast)
    // --------------------------------------------------------------------

    
export { FORMATIONS, TEAM_COLORS, INITIAL_PLAYERS, getFreshPlayers, formatTime, getInitials, getBench, getField, getScorers, Icons };
