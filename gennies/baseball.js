// Baseball matrix display generator — 64×32 LED matrix
//
// Layout (mirrors NFL conventions):
//   y=5:   Away abbr (x=0)  | away score (x=25) | inning/status (x=44)
//   y=15:  Home abbr (x=0)  | home score (x=25)
//   y=18:  separator line
//   y=20+: base diamond (left) | B/S/O count dots (right, live only)

// ── Helpers ─────────────────────────────────────────────────────────────────

const inningPrefix = (state) => {
    switch ((state || '').toLowerCase()) {
        case 'top':    return 'T';
        case 'bottom': return 'B';
        case 'middle': return 'M';
        case 'end':    return 'E';
        default:       return '';
    }
};

// ── Base Diamond ──────────────────────────────────────────────────────────────
//
// Positioned in the left half of the bottom section (x=8–28, y=20–31)
//
//          2B  (x=18, y=20)
//         /         \
//   3B (x=10, y=25)   1B (x=26, y=25)
//         \         /
//          HP  (x=18, y=30)

const BASE_COORDS = {
    second: { x: 18, y: 20 },
    third:  { x: 10, y: 25 },
    first:  { x: 26, y: 25 },
    home:   { x: 18, y: 30 },
};

const BASE_ON   = '0xFFCC00'; // occupied — yellow
const BASE_OFF  = '0x333333'; // empty — dim grey
const BASE_HOME = '0xffffff'; // home plate always white

const createDiamond = (bases) => {
    const drawBase = (coord, color) => ({
        type: 'shape', shape: 'rect', fill: color,
        start_x: coord.x, start_y: coord.y, width: 2, height: 2,
    });
    return [
        drawBase(BASE_COORDS.second, bases?.second ? BASE_ON : BASE_OFF),
        drawBase(BASE_COORDS.first,  bases?.first  ? BASE_ON : BASE_OFF),
        drawBase(BASE_COORDS.third,  bases?.third  ? BASE_ON : BASE_OFF),
        drawBase(BASE_COORDS.home,   BASE_HOME),
    ];
};

// ── Count dots (B / S / O) ────────────────────────────────────────────────────
//
// Right half of bottom section (x=40–54, y=22–30)
// Row y=22: balls  (green,  max 4)
// Row y=26: strikes (orange, max 3)
// Row y=30: outs    (white,  max 3)

const DOT_START_X = 40;
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

// ── Inning / status label ─────────────────────────────────────────────────────
// Sits at x=44, y=5 — same row as the away team (mirrors NFL's "Q3" position)

const createInningLabel = (game) => {
    let text = '';
    let color = '0xffffff';

    if (game.status === 'live') {
        text  = `${inningPrefix(game.inningState)}${game.inning}`;
        color = '0xffffff';
    } else if (game.status === 'delayed') {
        text  = 'DLY';
        color = '0xFFCC00';
    } else if (game.status === 'suspended') {
        text  = 'SUS';
        color = '0xFF6600';
    } else if (game.status === 'final') {
        text  = 'FIN';
        color = '0x888888';
    } else {
        // pre-game — show PT time
        text  = game.gameTime || 'TBD';
        color = '0x0099CC';
    }

    return [{ type: 'text', text, x: 44, y: 5, color, font: 'Atadore' }];
};

// ── Scoreboard ────────────────────────────────────────────────────────────────

const scoreText = (score) =>
    (score === null || score === undefined) ? '-' : String(score);

const createScoreboard = (game) => [
    // Away row (y=5, same as NFL away row)
    { type: 'text', text: game.awayTeam.abbr, x: 0,  y: 5,  color: game.awayTeam.color, font: 'Atadore' },
    { type: 'text', text: scoreText(game.awayTeam.score), x: 25, y: 5,  color: '0xFFCC00', font: 'Atadore' },
    // Home row (y=15, same as NFL home row)
    { type: 'text', text: game.homeTeam.abbr, x: 0,  y: 15, color: game.homeTeam.color, font: 'Atadore' },
    { type: 'text', text: scoreText(game.homeTeam.score), x: 25, y: 15, color: '0xFFCC00', font: 'Atadore' },
];

// ── Separator ─────────────────────────────────────────────────────────────────

const createSeparator = () => [{
    type: 'shape', shape: 'rect', fill: '0x333333',
    start_x: 0, start_y: 18, width: 42, height: 1,
}];

// ── No-games display ──────────────────────────────────────────────────────────

export const createNoGamesDisplay = () => [
    { type: 'text', text: 'MLB',      x: 22, y: 5,  color: '0x0066CC', font: 'Atadore' },
    { type: 'text', text: 'NO GAMES', x: 2,  y: 14, color: '0xffffff', font: 'Atadore' },
    { type: 'text', text: 'TODAY',    x: 14, y: 23, color: '0x888888', font: 'Atadore' },
];

// ── Main entry point ──────────────────────────────────────────────────────────

export const createGameDisplay = (game) => {
    const elements = [
        ...createScoreboard(game),
        ...createInningLabel(game),
        ...createSeparator(),
        ...createDiamond(
            (game.status === 'live' || game.status === 'delayed')
                ? game.bases
                : { first: false, second: false, third: false }
        ),
    ];

    // Count dots only for live games with valid count data
    if (game.status === 'live' && game.balls !== null) {
        elements.push(...createCountDots(game.balls, game.strikes, game.outs));
    }

    return elements;
};
