import { fetchCFBGames, POWER4_CONFERENCES, POWER4_INDEPENDENTS } from '../fetch/cfb.js';
import { createFootballDisplays } from '../gennies/football.js';
import { getCFBConfig } from '../services/cfbConfig.js';

const { createGameDisplay, createNoGamesDisplay, createNoDataDisplay } = createFootballDisplays({ league: 'CFB', timedOT: false, ranked: true });

const GAME_DISPLAY_TIME = 8_000; // 8 seconds per game

// Rotation state
let games = [];
let rotationStartTime = 0;
let currentGameIndex = 0;

const isRanked = (g) => !!(g.awayTeam.rank || g.homeTeam.rank);
const isPower4Team = (t) => POWER4_CONFERENCES.includes(t.conferenceId) || POWER4_INDEPENDENTS.includes(t.id);
const isPower4 = (g) => isPower4Team(g.awayTeam) || isPower4Team(g.homeTeam);

// Best (lowest) rank in the game; unranked matchups sort after ranked ones
const bestRank = (g) => Math.min(g.awayTeam.rank ?? 99, g.homeTeam.rank ?? 99);

const STATUS_ORDER = { live: 0, end: 0, half: 0, delayed: 0, pre: 1, final: 2, postponed: 3, cancelled: 3 };

// Live games first (biggest matchups first), then upcoming by kickoff, then finals
const sortGames = (list) => [...list].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (s !== 0) return s;
    if (a.status === 'pre') {
        const t = new Date(a.date) - new Date(b.date);
        if (t !== 0) return t;
    }
    return bestRank(a) - bestRank(b);
});

const applyFilter = (allGames, { filter, teams }) => {
    if (filter === 'ranked') return allGames.filter(isRanked);
    if (filter === 'teams') {
        const mine = allGames.filter(g => teams.includes(g.awayTeam.id) || teams.includes(g.homeTeam.id));
        // Picked teams have no games in the window (bye week) — show the ranked slate instead of "NO GAMES"
        return mine.length > 0 ? mine : allGames.filter(isRanked);
    }
    // 'all' — Power 4 games, plus ranked Group of 5 teams so "all" is a superset of "ranked"
    return allGames.filter(g => isPower4(g) || isRanked(g));
};

export const cfb = async () => {
    const now = Date.now();

    const allGames = await fetchCFBGames();
    if (!allGames) {
        games = [];
        return createNoDataDisplay();
    }

    const newGames = sortGames(applyFilter(allGames, getCFBConfig()));

    if (newGames.length === 0) {
        games = [];
        return createNoGamesDisplay();
    }

    // If game list changed size, recalculate rotation position
    if (games.length !== newGames.length) {
        if (games.length === 0) {
            rotationStartTime = now;
            currentGameIndex = 0;
        } else {
            const totalShown = Math.floor((now - rotationStartTime) / GAME_DISPLAY_TIME);
            currentGameIndex = totalShown % newGames.length;
        }
    }

    games = newGames;

    // Reset rotation start time after complete cycles to prevent counter overflow
    const timeSinceStart = now - rotationStartTime;
    const cycleLength = GAME_DISPLAY_TIME * games.length;
    if (timeSinceStart >= cycleLength) {
        rotationStartTime = now - (timeSinceStart % cycleLength);
    }

    const elapsed = now - rotationStartTime;
    const targetIndex = Math.floor(elapsed / GAME_DISPLAY_TIME) % games.length;

    if (targetIndex !== currentGameIndex) {
        currentGameIndex = targetIndex;
        const g = games[currentGameIndex];
        console.log(`[CFB] Now showing: ${g.awayTeam.abbr} @ ${g.homeTeam.abbr} (${g.status}) [${currentGameIndex + 1}/${games.length}]`);
    }

    return createGameDisplay(games[currentGameIndex]);
};
