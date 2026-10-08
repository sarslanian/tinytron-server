import { fetchNFLGames } from '../fetch/nfl.js';
import { createFootballDisplays } from '../gennies/football.js';

const { createGameDisplay, createNoGamesDisplay, createNoDataDisplay } = createFootballDisplays({ league: 'NFL', timedOT: true });

const GAME_DISPLAY_TIME = 8_000; // 8 seconds per game

// Rotation state
let games = [];
let rotationStartTime = 0;
let currentGameIndex = 0;

const STATUS_ORDER = { live: 0, end: 0, half: 0, delayed: 0, pre: 1, final: 2, postponed: 3, cancelled: 3 };

// Live games first, then upcoming by kickoff, then finals in the order they were played
const sortGames = (list) => [...list].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || new Date(a.date) - new Date(b.date)
);

export const nfl = async () => {
    const now = Date.now();

    const allGames = await fetchNFLGames();
    if (!allGames) {
        games = [];
        return createNoDataDisplay();
    }

    const newGames = sortGames(allGames);

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
        console.log(`[NFL] Now showing: ${g.awayTeam.abbr} @ ${g.homeTeam.abbr} (${g.status}) [${currentGameIndex + 1}/${games.length}]`);
    }

    return createGameDisplay(games[currentGameIndex]);
};
