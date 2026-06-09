// Baseball matrix display generator — 64×32 LED matrix
//
// Three states:
//   pre   — team abbr + record, game time (CT), starting pitchers
//   live  — scoreboard, inning label, BSO dots (left), base diamond (right)
//   final — scoreboard, FIN label, per-inning line score

// ── Helpers ─────────────────────────────────────────────────────────────────

const inningPrefix = (state) => {
    switch ((state || '').toLowerCase()) {
        case 'top':    return 'TOP';
        case 'bottom': return 'BOT';
        case 'middle': return 'MID';
        case 'end':    return 'END';
        default:       return '';
    }
};

const scoreText = (score) =>
    (score === null || score === undefined) ? '-' : String(score);

// Dim a hex color string (e.g. '0xCC0000') by a 0–1 factor
const dimColor = (hexStr, factor) => {
    const n = parseInt(hexStr.replace('0x', ''), 16);
    const r = Math.round(((n >> 16) & 0xff) * factor);
    const g = Math.round(((n >>  8) & 0xff) * factor);
    const b = Math.round(( n        & 0xff) * factor);
    return '0x' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

// Right-align text: small_font.bdf (Teeny Tiny Pixls) DWIDTH=4px per char
const rightAlignX = (text, maxX = 63) => Math.max(0, maxX - text.length * 4 + 1);

// ── Pre-game layout ───────────────────────────────────────────────────────────
//
//  y=2:   [AWAY abbr]  ←left          [W-L record]  →right-aligned
//  y=10:  [HOME abbr]  ←left          [W-L record]  →right-aligned
//  y=17:  ─── separator ───
//  y=20:  [game time "7:05 PM CT"]  ←centered
//  y=27:  [away starter]←left-half  ·  [home starter]→right-half

const createPreGameDisplay = (game) => {
    const elements = [];

    const awayRecord = (game.awayTeam.wins !== null && game.awayTeam.losses !== null)
        ? `${game.awayTeam.wins}-${game.awayTeam.losses}` : '-';
    const homeRecord = (game.homeTeam.wins !== null && game.homeTeam.losses !== null)
        ? `${game.homeTeam.wins}-${game.homeTeam.losses}` : '-';

    // Away row
    elements.push(
        { type: 'text', text: game.awayTeam.abbr, x: 1, y: 4, color: game.awayTeam.color },
        { type: 'text', text: awayRecord, x: rightAlignX(awayRecord), y: 4, color: '0x888888' },
    );

    // Home row
    elements.push(
        { type: 'text', text: game.homeTeam.abbr, x: 1, y: 10, color: game.homeTeam.color },
        { type: 'text', text: homeRecord, x: rightAlignX(homeRecord), y: 10, color: '0x888888' },
    );

    // Separator
    elements.push({
        type: 'shape', shape: 'rect', fill: '0x2a2a2a',
        start_x: 0, start_y: 17, width: 64, height: 1,
    });

    // Game time (CT)
    const timeStr = game.gameTime ? `${game.gameTime} CT` : 'TBD';
    const timeX = Math.max(0, Math.round((64 - timeStr.length * 4) / 2));
    elements.push({
        type: 'text', text: timeStr, x: timeX, y: 20, color: '0x0088BB',
    });

    // Starting pitchers
    const MAX_SP = 6;
    const awayStarter = game.awayTeam.starter ? game.awayTeam.starter.slice(0, MAX_SP) : null;
    const homeStarter = game.homeTeam.starter ? game.homeTeam.starter.slice(0, MAX_SP) : null;

    if (awayStarter) {
        elements.push({
            type: 'text', text: awayStarter,
            x: Math.max(0, 29 - awayStarter.length * 4),
            y: 29,
            color: dimColor(game.awayTeam.color, 0.55),
            font: 'Atadore',
        });
    }

    // Center divider dot
    elements.push({
        type: 'shape', shape: 'rect', fill: '0x333333',
        start_x: 31, start_y: 29, width: 1, height: 1,
    });

    if (homeStarter) {
        elements.push({
            type: 'text', text: homeStarter,
            x: 34,
            y: 29,
            color: dimColor(game.homeTeam.color, 0.55),
            font: 'Atadore',
        });
    }

    return elements;
};

// ── Live layout ───────────────────────────────────────────────────────────────
//
//  y=4:   [AWAY abbr]  x=0    [away score]  x=24
//  y=9:   [inning "TOP 6"]  →right-aligned
//  y=14:  [HOME abbr]  x=0    [home score]  x=24
//  y=19+: [BSO dots left]   [base diamond right]

// -- Scoreboard (live/final shared) --
const createScoreboard = (game, awayY, homeY) => [
    { type: 'text', text: game.awayTeam.abbr, x: 0,  y: awayY, color: game.awayTeam.color },
    { type: 'text', text: scoreText(game.awayTeam.score), x: 24, y: awayY, color: '0xFFCC00' },
    { type: 'text', text: game.homeTeam.abbr, x: 0,  y: homeY, color: game.homeTeam.color },
    { type: 'text', text: scoreText(game.homeTeam.score), x: 24, y: homeY, color: '0xFFCC00' },
];

// -- Inning label --
const createInningLabel = (game) => {
    let text = '';
    let color = '0xffffff';

    if (game.status === 'live') {
        const prefix = inningPrefix(game.inningState);
        text  = prefix ? `${prefix} ${game.inning}` : String(game.inning || '');
    } else if (game.status === 'delayed') {
        text  = 'DLY';  color = '0xFFCC00';
    } else if (game.status === 'suspended') {
        text  = 'SUS';  color = '0xFF6600';
    }

    if (!text) return [];
    return [{ type: 'text', text, x: rightAlignX(text), y: 9, color }];
};

// -- Base diamond (right side) --
const BASE_COORDS = {
    second: { x: 51, y: 16 },
    third:  { x: 43, y: 22 },
    first:  { x: 59, y: 22 },
    home:   { x: 51, y: 28 },
};

const createDiamond = (bases) => {
    const elements = [];

    const drawBase = (coord, occupied) => {
        if (occupied) {
            elements.push({
                type: 'shape', shape: 'rect', fill: '0xFFCC00',
                start_x: coord.x, start_y: coord.y, width: 3, height: 3,
            });
        } else {
            elements.push({
                type: 'shape', shape: 'rect', fill: '0xffffff',
                start_x: coord.x, start_y: coord.y, width: 3, height: 3,
            });
            elements.push({
                type: 'shape', shape: 'rect', fill: '0x000000',
                start_x: coord.x + 1, start_y: coord.y + 1, width: 1, height: 1,
            });
        }
    };

    drawBase(BASE_COORDS.second, bases?.second);
    drawBase(BASE_COORDS.third,  bases?.third);
    drawBase(BASE_COORDS.first,  bases?.first);

    // Home plate: white 3×3, no center dot
    elements.push({
        type: 'shape', shape: 'rect', fill: '0xffffff',
        start_x: BASE_COORDS.home.x, start_y: BASE_COORDS.home.y, width: 3, height: 3,
    });

    return elements;
};

// -- Count dots (left side) --
const DOT_START_X = 1;
const DOT_SPACING = 4;

const createCountDots = (balls, strikes, outs) => {
    const elements = [];
    // emptySlots: how many white dots show when count=0.
    // Extra slot (4th ball, 3rd strike/out) only appears when active.
    const row = (count, emptySlots, activeColor, y) => {
        const total = Math.max(count, emptySlots);
        for (let i = 0; i < total; i++) {
            elements.push({
                type: 'shape', shape: 'rect',
                fill: i < count ? activeColor : '0xffffff',
                start_x: DOT_START_X + i * DOT_SPACING, start_y: y, width: 3, height: 3,
            });
        }
    };
    row(balls   ?? 0, 3, '0x00CC00', 20);
    row(strikes ?? 0, 2, '0xFFCC00', 24);
    row(outs    ?? 0, 2, '0xFF4400', 28);
    return elements;
};

// ── Final layout ──────────────────────────────────────────────────────────────
//
//  y=3:   [AWAY abbr]  ←left    [final score]  x=24
//  y=7:   [FIN / F/N]  →right-aligned  (dim)
//  y=11:  [HOME abbr]  ←left    [final score]  x=24
//  y=20:  away line score
//  y=27:  home line score

const createLineScore = (innings, awayColor, homeColor) => {
    const elements = [];
    const n = innings.length;
    if (n === 0) return elements;

    const PAD = 3, AVAILABLE = 58;

    innings.forEach((inn, i) => {
        const colCenter = Math.round(PAD + (i + 0.5) * AVAILABLE / n) - 1;
        const originX = Math.max(0, colCenter - 1);

        const awayVal = inn.awayRuns ?? null;
        const homeVal = inn.homeRuns ?? null;

        const awayChar = awayVal === null ? '-' : String(Math.min(awayVal, 9));
        const homeChar = homeVal === null ? '-' : String(Math.min(homeVal, 9));

        const awayDim = awayVal === 0 || awayVal === null ? '0x242424' : awayColor;
        const homeDim = homeVal === 0 || homeVal === null ? '0x242424' : homeColor;

        elements.push({ type: 'text', text: awayChar, x: originX, y: 20, color: awayDim });
        elements.push({ type: 'text', text: homeChar, x: originX, y: 27, color: homeDim });
    });

    return elements;
};

const createFinalDisplay = (game) => {
    const elements = [];

    // Scoreboard
    elements.push(...createScoreboard(game, 3, 11));

    // FIN / F/extra label
    const extraInnings = game.innings?.length > 9 ? game.innings.length : null;
    const finText = extraInnings ? `F/${extraInnings}` : 'FIN';
    elements.push({
        type: 'text', text: finText,
        x: rightAlignX(finText),
        y: 7,
        color: '0x444444',
        font: 'Atadore',
    });

    // Line score
    if (game.innings?.length > 0) {
        elements.push(...createLineScore(game.innings, game.awayTeam.color, game.homeTeam.color));
    }

    return elements;
};

// ── No-games display ──────────────────────────────────────────────────────────

export const createNoGamesDisplay = () => [
    { type: 'text', text: 'MLB',      x: 22, y: 5,  color: '0x0066CC' },
    { type: 'text', text: 'NO GAMES', x: 2,  y: 14, color: '0xffffff' },
    { type: 'text', text: 'TODAY',    x: 14, y: 23, color: '0x888888' },
];

// ── Main entry point ──────────────────────────────────────────────────────────

export const createGameDisplay = (game) => {
    if (game.status === 'pre') {
        return createPreGameDisplay(game);
    }
    if (game.status === 'final') {
        return createFinalDisplay(game);
    }

    // live, delayed, suspended
    const elements = [
        ...createScoreboard(game, 4, 14),
        ...createInningLabel(game),
        ...createDiamond(game.bases),
    ];

    if (game.status === 'live' && game.balls !== null) {
        elements.push(...createCountDots(game.balls, game.strikes, game.outs));
    }

    return elements;
};
