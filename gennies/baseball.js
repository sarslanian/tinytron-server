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

// Right-align v: small_font.bdf (Teeny Tiny Pixls) DWIDTH=4px per char
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
        { t: 't', v: game.awayTeam.abbr, x: 1, y: 4, c: game.awayTeam.color },
        { t: 't', v: awayRecord, x: rightAlignX(awayRecord), y: 4, c: '0x888888' },
    );

    // Home row
    elements.push(
        { t: 't', v: game.homeTeam.abbr, x: 1, y: 10, c: game.homeTeam.color },
        { t: 't', v: homeRecord, x: rightAlignX(homeRecord), y: 10, c: '0x888888' },
    );

    // Separator
    elements.push({
        t: 's', f: '0x2a2a2a',
        x: 0, y: 17, w:64, h:1,
    });

    // Game time (CT)
    const timeStr = game.gameTime ? `${game.gameTime} CT` : 'TBD';
    const timeX = Math.max(0, Math.round((64 - timeStr.length * 4) / 2));
    elements.push({
        t: 't', v: timeStr, x: timeX, y: 20, c: '0x0088BB',
    });

    // Starting pitchers
    const MAX_SP = 6;
    const awayStarter = game.awayTeam.starter ? game.awayTeam.starter.slice(0, MAX_SP) : null;
    const homeStarter = game.homeTeam.starter ? game.homeTeam.starter.slice(0, MAX_SP) : null;

    if (awayStarter) {
        elements.push({
            t: 't', v: awayStarter,
            x: Math.max(0, 29 - awayStarter.length * 4),
            y: 29,
            c: dimColor(game.awayTeam.color, 0.55),
        });
    }

    // Center divider dot
    elements.push({
        t: 's', f: '0x333333',
        x: 31, y: 29, w:1, h:1,
    });

    if (homeStarter) {
        elements.push({
            t: 't', v: homeStarter,
            x: 34,
            y: 29,
            c: dimColor(game.homeTeam.color, 0.55),
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
    { t: 't', v: game.awayTeam.abbr, x: 1,  y: awayY, c: game.awayTeam.color },
    { t: 't', v: scoreText(game.awayTeam.score), x: 24, y: awayY, c: '0xFFCC00' },
    { t: 't', v: game.homeTeam.abbr, x: 1,  y: homeY, c: game.homeTeam.color },
    { t: 't', v: scoreText(game.homeTeam.score), x: 24, y: homeY, c: '0xFFCC00' },
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
    const x = Math.max(0, Math.round(47 - text.length * 2));
    return [{ t: 't', v: text, x, y: 9, c: color }];
};

// -- Base diamond (right side) --
const BASE_COORDS = {
    second: { x: 46, y: 16 },
    third:  { x: 40, y: 22 },
    first:  { x: 52, y: 22 },
    home:   { x: 46, y: 28 },
};

const createDiamond = (bases) => {
    const elements = [];

    const drawBase = (coord, occupied) => {
        if (occupied) {
            elements.push({
                t: 's', f: '0xFFCC00',
                x: coord.x, y: coord.y, w:3, h:3,
            });
        } else {
            elements.push({
                t: 's', f: '0xffffff',
                x: coord.x, y: coord.y, w:3, h:3,
            });
            elements.push({
                t: 's', f: '0x000000',
                x: coord.x + 1, y: coord.y + 1, w:1, h:1,
            });
        }
    };

    drawBase(BASE_COORDS.second, bases?.second);
    drawBase(BASE_COORDS.third,  bases?.third);
    drawBase(BASE_COORDS.first,  bases?.first);

    // Home plate: white 3×3, no center dot
    elements.push({
        t: 's', f: '0xffffff',
        x: BASE_COORDS.home.x, y: BASE_COORDS.home.y, w:3, h:3,
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
            const sx = DOT_START_X + i * DOT_SPACING;
            if (i < count) {
                elements.push({ t: 's', f: activeColor, x: sx, y: y, w:3, h:3 });
            } else {
                elements.push({ t: 's', f: '0xffffff', x: sx, y: y, w:3, h:3 });
                elements.push({ t: 's', f: '0x000000', x: sx + 1, y: y + 1, w:1, h:1 });
            }
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

        const awayDim = awayVal === null ? '0x444444' : awayVal === 0 ? '0x888888' : awayColor;
        const homeDim = homeVal === null ? '0x444444' : homeVal === 0 ? '0x888888' : homeColor;

        elements.push({ t: 't', v: awayChar, x: originX, y: 22, c: awayDim });
        elements.push({ t: 't', v: homeChar, x: originX, y: 29, c: homeDim });
    });

    return elements;
};

const createFinalDisplay = (game) => {
    const elements = [];

    // Scoreboard — same y positions as live view
    elements.push(...createScoreboard(game, 4, 14));

    // FINAL label — centered in right half of display
    const extraInnings = game.innings?.length > 9 ? game.innings.length : null;
    const finText = extraInnings ? `F/${extraInnings}` : 'FINAL';
    const finX = Math.round(48 - finText.length * 2);
    elements.push({ t: 't', v: finText, x: finX, y: 9, c: '0x444444' });

    // Line score
    if (game.innings?.length > 0) {
        elements.push(...createLineScore(game.innings, game.awayTeam.color, game.homeTeam.color));
    }

    return elements;
};

// ── No-games display ──────────────────────────────────────────────────────────

export const createNoGamesDisplay = () => [
    { t: 't', v: 'MLB',      x: 22, y: 5,  c: '0x0066CC' },
    { t: 't', v: 'NO GAMES', x: 2,  y: 14, c: '0xffffff' },
    { t: 't', v: 'TODAY',    x: 14, y: 23, c: '0x888888' },
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
