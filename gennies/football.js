// Football matrix display generator (CFB + NFL) — 64×32 LED matrix
//
// Every state shares the same two scoreboard rows:
//   y=5:  [rank] AWAY ............ score/record
//   y=14: [rank] HOME ............ score/record
// and uses the bottom third for state-specific info:
//   pre   — kickoff time (CT, with the day if not today) + TV network
//   live  — period/clock + down & distance, field strip with ball + line to gain
//   final — FINAL (with OT count), loser dimmed

// ── Text metrics ──────────────────────────────────────────────────────────────

// small_font.bdf (Teeny Tiny Pixls) is fixed 4px per char
const smallWidth = (text) => text.length * 4;

// squeezed_bold_7.bdf DWIDTH per glyph
const BOLD_W = {
    ' ': 3, '&': 7, '-': 4, '/': 5,
    '0': 5, '1': 4, '2': 5, '3': 5, '4': 6, '5': 5, '6': 6, '7': 5, '8': 6, '9': 6,
    A: 6, B: 6, C: 5, D: 6, E: 4, F: 4, G: 6, H: 6, I: 3, J: 4, K: 6, L: 4, M: 8,
    N: 7, O: 6, P: 6, Q: 7, R: 6, S: 4, T: 5, U: 6, V: 7, W: 9, X: 6, Y: 7, Z: 5,
};
const boldWidth = (text) => [...text].reduce((w, ch) => w + (BOLD_W[ch] ?? 6), 0);

const centerX = (width) => Math.max(0, Math.round((64 - width) / 2));

// Dim a hex color string (e.g. '0xCC0000') by a 0–1 factor
const dimColor = (hexStr, factor) => {
    const n = parseInt(hexStr.replace('0x', ''), 16);
    const r = Math.round(((n >> 16) & 0xff) * factor);
    const g = Math.round(((n >>  8) & 0xff) * factor);
    const b = Math.round(( n        & 0xff) * factor);
    return '0x' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

// ── Layout constants ──────────────────────────────────────────────────────────

const AWAY_Y = 5;
const HOME_Y = 14;
const ABBR_X = 9;          // rank sits in x=0..7 to the left (leagues without ranks start at x=0)
const POSS_GAP = 31;       // possession marker sits this far right of the abbr (abbr is ≤ ~27px)
const STATUS_Y = 22;
const FIELD_Y = 28;
const FIELD_H = 4;
const FIELD_X = 4;         // end zones are x=0..3 and x=60..63
const FIELD_W = 56;

const SCORE_COLOR = '0xFFCC00';
const DIM = '0x888888';
const RED_ZONE = '0xFF2200';

// ── Shared pieces ─────────────────────────────────────────────────────────────

const abbrX = (opts) => opts.ranked ? ABBR_X : 0;

const teamRow = (team, y, opts, abbrColor = team.color) => {
    const els = [];
    if (team.rank) {
        const r = String(team.rank);
        els.push({ t: 't', v: r, x: 8 - smallWidth(r), y, c: DIM });
    }
    els.push({ t: 't', v: team.abbr, x: abbrX(opts), y, c: abbrColor, b: true });
    return els;
};

const scoreAt = (score, y, color = SCORE_COLOR) => {
    const s = score === null || score === undefined ? '-' : String(score);
    return { t: 't', v: s, x: 64 - boldWidth(s), y, c: color, b: true };
};

const centeredSmall = (text, y, c) => ({ t: 't', v: text, x: centerX(smallWidth(text)), y, c });

const periodLabel = (period) => {
    if (period <= 4) return `Q${period}`;
    const ot = period - 4;
    return ot > 1 ? `${ot}OT` : 'OT';
};

// 0–100 yard axis (0 = away goal line) → pixel column inside the field
const yardToX = (yard) => FIELD_X + Math.min(FIELD_W - 1, Math.round(yard * (FIELD_W - 1) / 100));

const createField = (game) => {
    const els = [
        { t: 's', f: dimColor(game.awayTeam.color, 0.4), x: 0, y: FIELD_Y, w: FIELD_X, h: FIELD_H },
        { t: 's', f: dimColor(game.homeTeam.color, 0.4), x: FIELD_X + FIELD_W, y: FIELD_Y, w: FIELD_X, h: FIELD_H },
        { t: 's', f: '0x003300', x: FIELD_X, y: FIELD_Y, w: FIELD_W, h: FIELD_H },
        { t: 's', f: '0x116611', x: yardToX(50), y: FIELD_Y, w: 1, h: FIELD_H },
    ];
    if (game.lineToGain !== null) {
        els.push({ t: 's', f: SCORE_COLOR, x: yardToX(game.lineToGain), y: FIELD_Y, w: 1, h: FIELD_H });
    }
    if (game.spot !== null) {
        const x = Math.min(FIELD_X + FIELD_W - 2, yardToX(game.spot));
        els.push({ t: 's', f: '0xFFFFFF', x, y: FIELD_Y, w: 2, h: FIELD_H });
    }
    return els;
};

// ── Pre-game ──────────────────────────────────────────────────────────────────

const createPreGameDisplay = (game, opts) => {
    const els = [...teamRow(game.awayTeam, AWAY_Y, opts), ...teamRow(game.homeTeam, HOME_Y, opts)];

    for (const [team, y] of [[game.awayTeam, AWAY_Y], [game.homeTeam, HOME_Y]]) {
        if (team.record) {
            els.push({ t: 't', v: team.record, x: 64 - smallWidth(team.record), y, c: DIM });
        }
    }

    els.push({ t: 's', f: '0x2a2a2a', x: 0, y: 19, w: 64, h: 1 });

    // Today: "2:30 PM CT"; later this week: "SAT 2:30 PM"
    const time = game.kickoff && game.kickoff !== 'TBD' ? game.kickoff : null;
    const kick = game.isToday
        ? (time ? `${time} CT` : 'TIME TBD')
        : `${game.weekday} ${time ?? 'TBD'}`;
    els.push(centeredSmall(kick, 23, '0x0088BB'));
    if (game.tv) els.push(centeredSmall(game.tv, 29, DIM));

    return els;
};

// ── Live (incl. halftime, end of quarter, delays) ────────────────────────────

const createLiveDisplay = (game, opts) => {
    const els = [
        ...teamRow(game.awayTeam, AWAY_Y, opts),
        ...teamRow(game.homeTeam, HOME_Y, opts),
        scoreAt(game.awayTeam.score, AWAY_Y),
        scoreAt(game.homeTeam.score, HOME_Y),
    ];

    if (game.possession) {
        els.push({
            t: 's', f: game.redZone ? RED_ZONE : '0xCC6600',
            x: abbrX(opts) + POSS_GAP, y: (game.possession === 'away' ? AWAY_Y : HOME_Y) - 1, w: 3, h: 3,
        });
    }

    if (game.status === 'half') {
        els.push(centeredSmall('HALFTIME', STATUS_Y, '0xFFFFFF'));
    } else if (game.status === 'end') {
        els.push(centeredSmall(`END ${periodLabel(game.period)}`, STATUS_Y, '0xFFFFFF'));
    } else if (game.status === 'delayed') {
        els.push(centeredSmall('DELAYED', STATUS_Y, SCORE_COLOR));
    } else {
        // College OT is untimed — the clock is meaningless there (NFL OT is timed)
        const left = (game.period > 4 && !opts.timedOT) || !game.clock
            ? periodLabel(game.period)
            : `${periodLabel(game.period)} ${game.clock}`;
        els.push({ t: 't', v: left, x: 0, y: STATUS_Y, c: '0xFFFFFF' });
        if (game.downText) {
            els.push({
                t: 't', v: game.downText, x: 64 - smallWidth(game.downText), y: STATUS_Y,
                c: game.redZone ? RED_ZONE : SCORE_COLOR,
            });
        }
    }

    els.push(...createField(game));
    return els;
};

// ── Final ─────────────────────────────────────────────────────────────────────

const createFinalDisplay = (game, opts) => {
    const els = [];
    const decided = game.awayTeam.winner || game.homeTeam.winner;

    for (const [team, y] of [[game.awayTeam, AWAY_Y], [game.homeTeam, HOME_Y]]) {
        const lost = decided && !team.winner;
        els.push(...teamRow(team, y, opts, lost ? dimColor(team.color, 0.4) : team.color));
        els.push(scoreAt(team.score, y, lost ? '0x666666' : SCORE_COLOR));
    }

    els.push({ t: 's', f: '0x2a2a2a', x: 0, y: 19, w: 64, h: 1 });

    const fin = game.period > 4 ? `FINAL/${periodLabel(game.period)}` : 'FINAL';
    els.push({ t: 't', v: fin, x: centerX(boldWidth(fin)), y: 25, c: '0xAAAAAA', b: true });

    return els;
};

// ── Postponed / cancelled ─────────────────────────────────────────────────────

const createPostponedDisplay = (game, opts) => [
    ...teamRow(game.awayTeam, AWAY_Y, opts),
    ...teamRow(game.homeTeam, HOME_Y, opts),
    { t: 's', f: '0x2a2a2a', x: 0, y: 19, w: 64, h: 1 },
    centeredSmall(game.status === 'cancelled' ? 'CANCELED' : 'POSTPONED', 25, '0xFF4400'),
];

// ── Per-league entry points ───────────────────────────────────────────────────

// league: label for the empty states; timedOT: whether overtime keeps a game clock;
// ranked: whether teams carry poll ranks (reserves the rank column left of the abbr)
export const createFootballDisplays = ({ league, ...opts }) => ({
    createNoDataDisplay: () => [
        centeredSmall(league, 5, '0xCC6600'),
        centeredSmall('NO DATA', 14, '0xFF4400'),
        centeredSmall('RETRYING', 23, DIM),
    ],

    createNoGamesDisplay: () => [
        centeredSmall(league, 5, '0xCC6600'),
        centeredSmall('NO GAMES', 14, '0xffffff'),
        centeredSmall('THIS WEEK', 23, DIM),
    ],

    createGameDisplay: (game) => {
        switch (game.status) {
            case 'pre':       return createPreGameDisplay(game, opts);
            case 'final':     return createFinalDisplay(game, opts);
            case 'postponed':
            case 'cancelled': return createPostponedDisplay(game, opts);
            default:          return createLiveDisplay(game, opts);
        }
    },
});
