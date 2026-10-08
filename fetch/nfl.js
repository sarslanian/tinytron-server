// ESPN NFL fetch — parsing lives in fetch/football.js

import { createWeekFetcher, getScoreboard, shiftDateKey, getCTDate } from './football.js';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

const REGULAR = 2, POST = 3, LAST_REGULAR_WEEK = 18;

// Days from each weekday to the Monday night that closes the NFL week
const DAYS_TO_MONDAY = { WED: 5, THU: 4, FRI: 3, SAT: 2, SUN: 1, MON: 0 };

// The week before/after ESPN's current one, across the regular season ↔ playoffs boundary
const adjacentWeek = ({ number, type }, dir) => {
    if (type === POST && number === 1 && dir < 0) return { week: LAST_REGULAR_WEEK, seasontype: REGULAR };
    if (type === REGULAR && number === LAST_REGULAR_WEEK && dir > 0) return { week: 1, seasontype: POST };
    return { week: number + dir, seasontype: type };
};

// ── Scoreboard ──────────────────────────────────────────────────────────────
//
// Same idea as CFB, shifted to the NFL's Thursday–Monday week. Tuesday is the
// off day after Monday night, so it plays the role CFB's Sunday does:
//   Wed–Mon — today's games (any state) + the rest of the week's upcoming games
//   Tuesday — everything from the past week (the finals recap)
//
// ESPN's default scoreboard flips to the next week early in the week, and the
// API doesn't take date ranges — so when the default week has nothing in the
// window, try the neighboring week instead.

export const fetchNFLGames = createWeekFetcher('NFL', async ({ key, weekday }) => {
    const isRecap = weekday === 'TUE';
    const [from, to] = isRecap
        ? [shiftDateKey(key, -6), key]
        : [key, shiftDateKey(key, DAYS_TO_MONDAY[weekday] ?? 6)];
    const inWindow = (e) => {
        const d = getCTDate(new Date(e.date)).key;
        return d >= from && d <= to;
    };

    const data = await getScoreboard(`${ESPN_BASE}/scoreboard`);
    let events = data.events || [];

    const week = data.week?.number;
    const type = data.season?.type;
    if (!events.some(inWindow) && week && (type === REGULAR || type === POST)) {
        const { week: w, seasontype } = adjacentWeek({ number: week, type }, isRecap ? -1 : 1);
        if (w >= 1) {
            const other = await getScoreboard(`${ESPN_BASE}/scoreboard?week=${w}&seasontype=${seasontype}`);
            events = other.events || [];
        }
    }

    return { events, from, to };
});
