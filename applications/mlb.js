import { fetchMLBGames } from '../fetch/mlb.js';
import { createGameDisplay, createNoGamesDisplay } from '../gennies/baseball.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEAMS_CONFIG = path.join(__dirname, '../config/mlb-teams.json');

const GAME_DISPLAY_TIME = 8_000; // 8 seconds per game

// Rotation state
let games = [];
let rotationStartTime = 0;
let currentGameIndex = 0;

// Load team filter from config file (returns array of team IDs, empty = show all)
const loadTeamFilter = async () => {
    try {
        const raw = await readFile(TEAMS_CONFIG, 'utf8');
        const cfg = JSON.parse(raw);
        return Array.isArray(cfg.teams) ? cfg.teams : [];
    } catch {
        return [];
    }
};

// Sort games: live first, then pre-game (by start time), then finals/delayed/suspended
const sortGames = (gameList) => {
    const order = { live: 0, delayed: 1, suspended: 2, pre: 3, final: 4 };
    return [...gameList].sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
};

export const mlb = async () => {
    const now = Date.now();

    // Fetch + filter games (fetchMLBGames handles its own 30s cache)
    const allGames = await fetchMLBGames();
    const teamFilter = await loadTeamFilter();

    const filtered = teamFilter.length > 0
        ? allGames.filter(g =>
            teamFilter.includes(g.awayTeam.id) ||
            teamFilter.includes(g.homeTeam.id))
        : allGames;

    const newGames = sortGames(filtered);

    if (newGames.length === 0) {
        games = [];
        return createNoGamesDisplay();
    }

    // If game list changed size, recalculate rotation position
    if (games.length !== newGames.length) {
        if (games.length === 0) {
            // First load
            rotationStartTime = now;
            currentGameIndex = 0;
        } else {
            // Game count changed — reset cleanly to avoid index out of bounds
            const timeSinceStart = now - rotationStartTime;
            const totalShown = Math.floor(timeSinceStart / GAME_DISPLAY_TIME);
            currentGameIndex = totalShown % newGames.length;
        }
    }

    games = newGames;

    // Reset rotation start time after complete cycles to prevent counter overflow
    const timeSinceStart = now - rotationStartTime;
    const cycleLength = GAME_DISPLAY_TIME * games.length;
    const totalCycles = Math.floor(timeSinceStart / cycleLength);
    if (totalCycles > 0) {
        rotationStartTime = now - (timeSinceStart % cycleLength);
    }

    // Determine which game to show
    const elapsed = now - rotationStartTime;
    const targetIndex = Math.floor(elapsed / GAME_DISPLAY_TIME) % games.length;

    if (targetIndex !== currentGameIndex) {
        currentGameIndex = targetIndex;
        const g = games[currentGameIndex];
        console.log(`[MLB] Now showing: ${g.awayTeam.abbr} @ ${g.homeTeam.abbr} (${g.status}) [${currentGameIndex + 1}/${games.length}]`);
    }

    return createGameDisplay(games[currentGameIndex]);
};
