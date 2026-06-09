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
        { type: 'text', text: game.awayTeam.abbr, x: 1, y: 4, color: game.awayTeam.color, font: 'Atadore' },
        { type: 'text', text: awayRecord, x: rightAlignX(awayRecord), y: 4, color: '0x888888', font: 'Atadore' },
    );

    // Home row
    elements.push(
        { type: 'text', text: game.homeTeam.abbr, x: 1, y: 10, color: game.homeTeam.color, font: 'Atadore' },
        { type: 'text', text: homeRecord, x: rightAlignX(homeRecord), y: 10, color: '0x888888', font: 'Atadore' },
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
        type: 'text', text: timeStr, x: timeX, y: 20, color: '0x0088BB', font: 'Atadore',
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
    { type: 'text', text: game.awayTeam.abbr, x: 0,  y: awayY, color: game.awayTeam.color, font: 'Atadore' },
    { type: 'text', text: scoreText(game.awayTeam.score), x: 24, y: awayY, color: '0xFFCC00', font: 'Atadore' },
    { type: 'text', text: game.homeTeam.abbr, x: 0,  y: homeY, color: game.homeTeam.color, font: 'Atadore' },
    { type: 'text', text: scoreText(game.homeTeam.score), x: 24, y: homeY, color: '0xFFCC00', font: 'Atadore' },
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
    return [{ type: 'text', text, x: rightAlignX(text), y: 9, color, font: 'Atadore' }];
};

// -- Base diamond (right side) --
const BASE_COORDS = {
    second: { x: 51, y: 19 },
    third:  { x: 43, y: 24 },
    first:  { x: 59, y: 24 },
    home:   { x: 51, y: 29 },
};

const BASE_ON   = '0xFFCC00'; // occupied — yellow
const BASE_OFF  = '0x2e2410'; // empty — dim amber
const BASE_HOME = '0xffffff'; // home plate always white

const createDiamond = (bases) => {
    const elements = [];

    const drawBase = (coord, color, isEmpty) => {
        elements.push({
            type: 'shape', shape: 'rect', fill: color,
            start_x: coord.x, start_y: coord.y, width: 2, height: 2,
        });
        if (isEmpty) {
            elements.push({
                type: 'shape', shape: 'rect', fill: '0x1a1508',
                start_x: coord.x + 1, start_y: coord.y + 1, width: 1, height: 1,
            });
        }
    };

    const drawBase2x2 = (coord, on) => drawBase(coord, on ? BASE_ON : BASE_OFF, !on);

    drawBase2x2(BASE_COORDS.second, bases?.second);
    drawBase2x2(BASE_COORDS.third,  bases?.third);
    drawBase2x2(BASE_COORDS.first,  bases?.first);

    // Home plate (always white, no inner dot)
    elements.push({
        type: 'shape', shape: 'rect', fill: BASE_HOME,
        start_x: BASE_COORDS.home.x, start_y: BASE_COORDS.home.y, width: 2, height: 2,
    });

    // Connecting lines between base midpoints (dim)
    const mid = (coord) => ({ x: coord.x + 1, y: coord.y + 1 });
    const LINE_COLOR = '0x1a1a1a';

    const drawLine = (a, b) => {
        const ma = mid(a), mb = mid(b);
        const dx = mb.x - ma.x, dy = mb.y - ma.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let i = 1; i < steps; i++) {
            const px = Math.round(ma.x + dx * i / steps);
            const py = Math.round(ma.y + dy * i / steps);
            // Skip if inside a base rect
            const inBase = Object.values(BASE_COORDS).some(c =>
                px >= c.x && px < c.x + 2 && py >= c.y && py < c.y + 2
            );
            if (!inBase) {
                elements.push({
                    type: 'shape', shape: 'rect', fill: LINE_COLOR,
                    start_x: px, start_y: py, width: 1, height: 1,
                });
            }
        }
    };

    drawLine(BASE_COORDS.second, BASE_COORDS.third);
    drawLine(BASE_COORDS.third,  BASE_COORDS.home);
    drawLine(BASE_COORDS.home,   BASE_COORDS.first);
    drawLine(BASE_COORDS.first,  BASE_COORDS.second);

    return elements;
};

// -- Count dots (left side) --
const DOT_START_X = 1;
const DOT_SPACING = 4;

const COUNT_COLORS = {
    ball:   '0x00CC00',
    strike: '0xFF4400',
    out:    '0xffffff',
    empty:  '0x222222',
};

const createCountDots = (balls, strikes, outs) => {
    const elements = [];
    const row = (count, max, onColor, y) => {
        for (let i = 0; i < max; i++) {
            elements.push({
                type: 'shape', shape: 'rect',
                fill: i < count ? onColor : COUNT_COLORS.empty,
                start_x: DOT_START_X + i * DOT_SPACING,
                start_y: y,
                width: 3, height: 2,
            });
        }
    };
    row(balls   ?? 0, 4, COUNT_COLORS.ball,   22);
    row(strikes ?? 0, 3, COUNT_COLORS.strike, 26);
    row(outs    ?? 0, 3, COUNT_COLORS.out,    30);
    return elements;
};

// ── Final layout ──────────────────────────────────────────────────────────────
//
//  y=3:   [AWAY abbr]  ←left    [final score]  x=24
//  y=7:   [FIN / F/N]  →right-aligned  (dim)
//  y=11:  [HOME abbr]  ←left    [final score]  x=24
//  y=20:  away line score
//  y=27:  home line score

// Mini 3×5 bitmap font for line score digits
const MINI_DIGITS = {
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6': [[1,1,0],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
    '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[0,1,1]],
    '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
};

const drawMiniDigit = (char, originX, originY, color) => {
    const bitmap = MINI_DIGITS[char] || MINI_DIGITS['-'];
    const elements = [];
    for (let row = 0; row < bitmap.length; row++) {
        for (let col = 0; col < bitmap[row].length; col++) {
            if (bitmap[row][col]) {
                elements.push({
                    type: 'shape', shape: 'rect', fill: color,
                    start_x: originX + col, start_y: originY + row, width: 1, height: 1,
                });
            }
        }
    }
    return elements;
};

const createLineScore = (innings, awayColor, homeColor) => {
    const elements = [];
    const n = innings.length;
    if (n === 0) return elements;

    const PAD = 3;
    const AVAILABLE = 64 - PAD * 2; // 58px

    innings.forEach((inn, i) => {
        const colCenter = Math.round(PAD + (i + 0.5) * AVAILABLE / n) - 1;
        const originX = colCenter - 1; // 3px wide digit, center it

        const awayVal = inn.awayRuns ?? null;
        const homeVal = inn.homeRuns ?? null;

        const awayChar = awayVal === null ? '-' : String(Math.min(awayVal, 9));
        const homeChar = homeVal === null ? '-' : String(Math.min(homeVal, 9));

        const awayDim = awayVal === 0 || awayVal === null ? '0x242424' : awayColor;
        const homeDim = homeVal === 0 || homeVal === null ? '0x242424' : homeColor;

        elements.push(...drawMiniDigit(awayChar, originX, 20, awayDim));
        elements.push(...drawMiniDigit(homeChar, originX, 27, homeDim));
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
    { type: 'text', text: 'MLB',      x: 22, y: 5,  color: '0x0066CC', font: 'Atadore' },
    { type: 'text', text: 'NO GAMES', x: 2,  y: 14, color: '0xffffff', font: 'Atadore' },
    { type: 'text', text: 'TODAY',    x: 14, y: 23, color: '0x888888', font: 'Atadore' },
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
