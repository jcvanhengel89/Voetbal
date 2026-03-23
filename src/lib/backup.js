import { FORMATIONS, INITIAL_PLAYERS } from './game.jsx';

const defaultOpponent = { name: 'Tegenstander', colorId: 'blue' };
const validFormationKeys = Object.keys(FORMATIONS);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = (value) => JSON.parse(JSON.stringify(value));

function sanitizePlayer(player, index) {
  const fallback = clone(INITIAL_PLAYERS[index] ?? INITIAL_PLAYERS[0]);
  const source = isObject(player) ? player : {};
  const posStats = isObject(source.posStats) ? source.posStats : {};

  return {
    id: typeof source.id === 'number' ? source.id : Date.now() + index,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : fallback.name,
    pos: typeof source.pos === 'string' || source.pos === null ? source.pos : null,
    benchTime: Number.isFinite(source.benchTime) ? Math.max(0, source.benchTime) : 0,
    playTime: Number.isFinite(source.playTime) ? Math.max(0, source.playTime) : 0,
    benchCount: Number.isFinite(source.benchCount) ? Math.max(0, source.benchCount) : 0,
    goals: Number.isFinite(source.goals) ? Math.max(0, source.goals) : 0,
    present: typeof source.present === 'boolean' ? source.present : true,
    posStats: {
      k: Number.isFinite(posStats.k) ? Math.max(0, posStats.k) : 0,
      def: Number.isFinite(posStats.def) ? Math.max(0, posStats.def) : 0,
      mid: Number.isFinite(posStats.mid) ? Math.max(0, posStats.mid) : 0,
      att: Number.isFinite(posStats.att) ? Math.max(0, posStats.att) : 0,
    },
  };
}

function sanitizeArchiveEntry(entry) {
  if (!isObject(entry)) return null;
  const score = isObject(entry.score) ? entry.score : {};
  return {
    id: typeof entry.id === 'number' ? entry.id : Date.now(),
    date: typeof entry.date === 'string' ? entry.date : new Date().toLocaleDateString('nl-NL'),
    opponent: typeof entry.opponent === 'string' && entry.opponent.trim() ? entry.opponent.trim() : defaultOpponent.name,
    colorId: typeof entry.colorId === 'string' ? entry.colorId : defaultOpponent.colorId,
    score: {
      home: Number.isFinite(score.home) ? Math.max(0, score.home) : 0,
      away: Number.isFinite(score.away) ? Math.max(0, score.away) : 0,
    },
    playerStats: Array.isArray(entry.playerStats) ? entry.playerStats : [],
  };
}

export function parseBackupFile(rawText) {
  const imported = JSON.parse(rawText);
  if (!isObject(imported) || !isObject(imported.data)) {
    throw new Error('Ongeldig backupbestand: data ontbreekt.');
  }

  const data = imported.data;
  const players = Array.isArray(data.players) && data.players.length
    ? data.players.map(sanitizePlayer)
    : clone(INITIAL_PLAYERS);

  const archive = Array.isArray(data.archive)
    ? data.archive.map(sanitizeArchiveEntry).filter(Boolean)
    : [];

  const opponent = isObject(data.opponent)
    ? {
        name: typeof data.opponent.name === 'string' && data.opponent.name.trim() ? data.opponent.name.trim() : defaultOpponent.name,
        colorId: typeof data.opponent.colorId === 'string' ? data.opponent.colorId : defaultOpponent.colorId,
      }
    : defaultOpponent;

  const history = Array.isArray(data.history) ? data.history.filter(isObject) : [];
  const score = isObject(data.score)
    ? {
        home: Number.isFinite(data.score.home) ? Math.max(0, data.score.home) : 0,
        away: Number.isFinite(data.score.away) ? Math.max(0, data.score.away) : 0,
      }
    : { home: 0, away: 0 };

  const quarter = Number.isInteger(data.quarter) ? Math.min(4, Math.max(1, data.quarter)) : 1;
  const formation = validFormationKeys.includes(data.formation) ? data.formation : '6v6';

  return { players, archive, opponent, history, score, quarter, formation };
}
