// Baseball matrix display generator — 64×32 LED matrix
//
// Layout:
//   Rows  0–13:  Scoreboard  (away row 0-6, home row 7-13)
//   Rows 14–20:  Inning state label + count (B/S/O) for live games
//   Rows 21–31:  Base diamond

// ── Helpers ─────────────────────────────────────────────────────────────────

// Map inningState string to a short prefix for the matrix
const inningPrefix = (state) => {
    switch ((state || '').toLowerCase()) {
        case 'top':    return 'T';
        case 'bottom': return 'B';
        case 'middle': return 'M';
        case 'end':    return 'E';
        default:       return '';
    }
};

// ── Base Diamond ─────────────────────────────────────────────────────────────
//
// Diamond layout (pixel coords on 64×32 canvas):
//
//         2B (x=31, y=22)
//        /              \
//   3B (x=24, y=27)   1B (x=38, y=27)
//        \              /
//         HP (x=31, y=31)  ← home plate (always lit)
//
// Each base is a single pixel; home plate is always white.

const BASE_COORDS = {
    second: { x: 31, y: 22 },
    third:  { x: 24, y: 27 },
    first:  { x: 38, y: 27 },
    home:   { x: 31, y: 31 },
};

const BASE_COLOR_ON  = '0xFFCC00'; // occupied — yellow
const BASE_COLOR_OFF = '0x333333'; // empty — dim grey
const BASE_COLOR_HOME = '0xffffff'; // home plate always white

const createDiamond = (bases) => {
    const elements = [];

    // Draw diamond lines (dim grey connectors)
    // 2B → 1B
    for (let i = 0; i <= 7; i++) {
        elements.push({ type: 'shape', shape: 'rect', fill: '0x222222',
            start_x: BASE_COORDS.second.x + i, start_y: BASE_COORDS.second.y + i, width: 1, height: 1 });
    }
    // 2B → 3B
    for (let i = 0; i <= 7; i++) {
        elements.push({ type: 'shape', shape: 'rect', fill: '0x222222',
            start_x: BASE_COORDS.second.x - i, start_y: BASE_COORDS.second.y + i, width: 1, height: 1 });
    }

    // Base dots (2×2 squares)
    const drawBase = (coord, color) => {
        elements.push({ type: 'shape', shape: 'rect', fill: color,
            start_x: coord.x, start_y: coord.y, width: 2, height: 2 });
    };

    drawBase(BASE_COORDS.second, bases?.second ? BASE_COLOR_ON : BASE_COLOR_OFF);
    drawBase(BASE_COORDS.first,  bases?.first  ? BASE_COLOR_ON : BASE_COLOR_OFF);
    drawBase(BASE_COORDS.third,  bases?.third  ? BASE_COLOR_ON : BASE_COLOR_OFF);
    drawBase(BASE_COORDS.home,   BASE_COLOR_HOME);

    return elements;
};

// ── Count indicator (B · S · O) ──────────────────────────────────────────────
//
// Three rows of small dots at x=50–62, y=22–30
// Balls: green dots (0–3 possible, max 3 lit = full count)
// Strikes: red dots (0–2 possible)
// Outs: white dots (0–2 filled, 3 = side retired)

const DOT_X = 51;
const COUNT_COLORS = {
    ball:   '0x00CC00',
    strike: '0xFF4400',
    out:    '0xffffff',
    empty:  '0x222222',
};

const createCountDots = (balls, strikes, outs) => {
    const elements = [];

    const drawDots = (count, max, color, startY) => {
        for (let i = 0; i < max; i++) {
            elements.push({
                type: 'shape', shape: 'rect',
                fill: i < count ? color : COUNT_COLORS.empty,
                start_x: DOT_X + (i * 3),
                start_y: startY,
                width: 2, height: 2,
            });
        }
    };

    drawDots(balls   ?? 0, 4, COUNT_COLORS.ball,   22);
    drawDots(strikes ?? 0, 3, COUNT_COLORS.strike, 26);
    drawDots(outs    ?? 0, 3, COUNT_COLORS.out,    30);

    return elements;
};

// ── Inning label ──────────────────────────────────────────────────────────────
// Shown at x=44, between the two team rows (y=14)
// e.g. "T3", "B9", "F" (final), "DLY", "SUS", time string for pre-game

const createInningLabel = (game) => {
    const elements = [];
    let label = '';
    let color = '0xffffff';

    if (game.status === 'live') {
        const prefix = inningPrefix(game.inningState);
        label = `${prefix}${game.inning}`;
        color = '0xffffff';
    } else if (game.status === 'delayed') {
        label = 'DLY';
        color = '0xFFCC00';
    } else if (game.status === 'suspended') {
        label = 'SUS';
        color = '0xFF6600';
    } else if (game.status === 'final') {
        label = 'FIN';
        color = '0x888888';
    } else {
        // pre-game — show time
        label = game.gameTime || 'TBD';
        color = '0x0099CC';
    }

    elements.push({
        type: 'text',
        text: label,
        x: 44,
        y: 14,
        color,
        font: 'Atadore',
    });

    return elements;
};

// ── Scoreboard rows ───────────────────────────────────────────────────────────

const scoreText = (score, status) => {
    if (score === null || score === undefined) return '-';
    return String(score);
};

const createScoreboard = (game) => {
    const elements = [];

    // Away team
    elements.push(
        {
            type: 'text',
            text: game.awayTeam.abbr,
            x: 0, y: 0,
            color: game.awayTeam.color,
            font: 'Atadore',
        },
        {
            type: 'text',
            text: scoreText(game.awayTeam.score, game.status),
            x: 26, y: 0,
            color: '0xFFCC00',
            font: 'Atadore',
        }
    );

    // Home team
    elements.push(
        {
            type: 'text',
            text: game.homeTeam.abbr,
            x: 0, y: 8,
            color: game.homeTeam.color,
            font: 'Atadore',
        },
        {
            type: 'text',
            text: scoreText(game.homeTeam.score, game.status),
            x: 26, y: 8,
            color: '0xFFCC00',
            font: 'Atadore',
        }
    );

    return elements;
};

// ── Separator line ────────────────────────────────────────────────────────────

const createSeparator = () => [{
    type: 'shape',
    shape: 'rect',
    fill: '0x333333',
    start_x: 0,
    start_y: 17,
    width: 42,
    height: 1,
}];

// ── No-games display ──────────────────────────────────────────────────────────

export const createNoGamesDisplay = () => [
    {
        type: 'text',
        text: 'MLB',
        x: 22, y: 5,
        color: '0x0066CC',
        font: 'Atadore',
    },
    {
        type: 'text',
        text: 'NO GAMES',
        x: 2, y: 14,
        color: '0xffffff',
        font: 'Atadore',
    },
    {
        type: 'text',
        text: 'TODAY',
        x: 14, y: 23,
        color: '0x888888',
        font: 'Atadore',
    },
];

// ── Main entry point ──────────────────────────────────────────────────────────

export const createGameDisplay = (game) => {
    const elements = [];

    // Scoreboard (teams + scores)
    elements.push(...createScoreboard(game));

    // Inning / status label
    elements.push(...createInningLabel(game));

    // Separator line between scoreboard and diamond area
    elements.push(...createSeparator());

    // Base diamond (always shown — empty bases when pre/final)
    const showLiveData = game.status === 'live' || game.status === 'delayed';
    elements.push(...createDiamond(showLiveData ? game.bases : { first: false, second: false, third: false }));

    // Count dots — only for live games with valid count data
    if (game.status === 'live' && game.balls !== null) {
        elements.push(...createCountDots(game.balls, game.strikes, game.outs));
    }

    return elements;
};
