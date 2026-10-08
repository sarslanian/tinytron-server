// ESPN college football fetch (FBS only) — parsing lives in fetch/football.js

import { createWeekFetcher, getScoreboard, shiftDateKey } from './football.js';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

// ESPN conference IDs: ACC, Big 12, Big Ten, SEC
export const POWER4_CONFERENCES = ['1', '4', '5', '8'];

// Independents treated as Power 4 (ESPN team IDs): Notre Dame
export const POWER4_INDEPENDENTS = ['87'];

// ── Scoreboard ──────────────────────────────────────────────────────────────
//
// ESPN's default scoreboard is the current CFB week (Monday–Sunday), so on
// Sunday it still holds the week that just ended. The window on top of that:
//   Mon–Sat — today's games (any state) + the rest of the week's upcoming games
//   Sunday  — everything from the past week (the finals recap) + today

// groups=80 is FBS; the default (no groups) only returns featured games
export const fetchCFBGames = createWeekFetcher('CFB', async ({ key, weekday }) => {
    const data = await getScoreboard(`${ESPN_BASE}/scoreboard?groups=80&limit=300`);
    const [from, to] = weekday === 'SUN' ? [shiftDateKey(key, -6), key] : [key, shiftDateKey(key, 6)];
    return { events: data.events || [], from, to };
});

// ── FBS team list (for the web team picker) ─────────────────────────────────

let _teams = null;
let _teamsTime = 0;
const TEAMS_TTL = 24 * 60 * 60 * 1000;

const CONFERENCE_NAMES = {
    acc: 'ACC', big12: 'Big 12', big10: 'Big Ten', sec: 'SEC', American: 'American',
    usa: 'C-USA', ind: 'Independent', midam: 'MAC', mwest: 'Mountain West',
    pac12: 'Pac-12', belte: 'Sun Belt', beltw: 'Sun Belt',
};

export const fetchCFBTeams = async () => {
    const now = Date.now();
    if (_teams && (now - _teamsTime) < TEAMS_TTL) return _teams;

    try {
        const res = await fetch('https://site.api.espn.com/apis/v2/sports/football/college-football/standings?group=80');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const teams = [];
        const seen = new Set();
        const walk = (group) => {
            for (const entry of group.standings?.entries || []) {
                const t = entry.team;
                if (!t || seen.has(t.id)) continue;
                seen.add(t.id);
                const conf = group.abbreviation || group.name || '';
                teams.push({
                    id: String(t.id),
                    abbr: t.abbreviation,
                    name: t.displayName,
                    conference: CONFERENCE_NAMES[conf] || conf,
                });
            }
            (group.children || []).forEach(walk);
        };
        walk(data);
        teams.sort((a, b) => a.name.localeCompare(b.name));
        _teams = teams;
        _teamsTime = now;
        return teams;
    } catch (err) {
        console.error('[CFB] Team list fetch error:', err);
        return _teams || [];
    }
};
