// Shared ESPN football fetch + normalization (used by fetch/cfb.js and fetch/nfl.js)

// Long network names → something that fits the 64px matrix
const TV_LABELS = {
    'SEC Network': 'SECN',
    'ACC Network': 'ACCN',
    'Big Ten Network': 'BTN',
    'CBS Sports Network': 'CBSSN',
    'ESPN2': 'ESPN2',
    'ESPNU': 'ESPNU',
    'ESPN+': 'ESPN+',
    'FOX': 'FOX',
    'Fox': 'FOX',
    'FS1': 'FS1',
    'Peacock': 'PEACOCK',
    'The CW Network': 'CW',
    'CW Network': 'CW',
    'NBC': 'NBC',
    'ABC': 'ABC',
    'CBS': 'CBS',
    'ESPN': 'ESPN',
    'Prime Video': 'PRIME',
    'NFL Net': 'NFLN',
    'NFL Network': 'NFLN',
    'Netflix': 'NETFLIX',
    'YouTube': 'YOUTUBE',
};

// A date in Central Time as { key: 'YYYY-MM-DD', weekday: 'SAT' }
export const getCTDate = (date = new Date()) => {
    // en-CA formats as YYYY-MM-DD
    const key = date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const weekday = date.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).toUpperCase();
    return { key, weekday };
};

// Shift a 'YYYY-MM-DD' key by whole days (string compare works on these keys)
export const shiftDateKey = (key, days) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

// ── LED color handling ──────────────────────────────────────────────────────
// ESPN team colors are print colors (navy, maroon, black) that look muddy or
// invisible on the matrix. Pick the more saturated of primary/alternate, then
// push it to full brightness while keeping the hue.

const hexToHsv = (hex) => {
    const n = parseInt(hex, 16);
    const r = ((n >> 16) & 0xff) / 255, g = ((n >> 8) & 0xff) / 255, b = (n & 0xff) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
        if (max === r)      h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else                h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
};

const hsvToHex = ({ h, s, v }) => {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const [r, g, b] =
        h < 60  ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
        h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const to = (f) => Math.round((f + m) * 255);
    return '0x' + ((to(r) << 16) | (to(g) << 8) | to(b)).toString(16).padStart(6, '0').toUpperCase();
};

export const ledColor = (primary, alternate) => {
    const candidates = [primary, alternate]
        .filter(c => /^[0-9a-f]{6}$/i.test(c || ''))
        .map(hexToHsv);
    // Prefer a real hue; black/white/gray only if the team has nothing else
    const colorful = candidates.filter(c => c.s >= 0.3 && c.v >= 0.12);
    if (colorful.length === 0) return '0xCCCCCC';
    let best = colorful[0];
    // Brown is just dark orange — brightened it turns salmon, so use the alternate (usually gold)
    const isBrown = (c) => c.h >= 10 && c.h < 45 && c.v < 0.5;
    if (isBrown(best) && colorful[1]) best = colorful[1];
    // Crimson, cardinal and maroon sit just short of red with some blue mixed in.
    // The matrix has no gamma correction, so that blue reads as pink/magenta — snap to pure red.
    if (best.h >= 320 || best.h < 10) return hsvToHex({ h: 0, s: 1, v: 0.93 });
    // Full saturation tops out a bit below 255 to match the rest of the app's palette
    return hsvToHex({ h: best.h, s: Math.min(1, best.s * 1.1), v: 0.93 });
};

// Two LED colors read as the same on the matrix: both gray, or hues within 25°
const colorsClash = (a, b) => {
    const x = hexToHsv(a.slice(2)), y = hexToHsv(b.slice(2));
    if (x.s < 0.3 || y.s < 0.3) return x.s < 0.3 && y.s < 0.3;
    const d = Math.abs(x.h - y.h);
    return Math.min(d, 360 - d) < 25;
};

// ── Parsing ─────────────────────────────────────────────────────────────────

const normalizeStatus = (type) => {
    switch (type?.name) {
        case 'STATUS_SCHEDULED':    return 'pre';
        case 'STATUS_HALFTIME':     return 'half';
        case 'STATUS_END_PERIOD':   return 'end';
        case 'STATUS_FINAL':        return 'final';
        case 'STATUS_POSTPONED':    return 'postponed';
        case 'STATUS_CANCELED':     return 'cancelled';
        case 'STATUS_DELAYED':
        case 'STATUS_RAIN_DELAY':   return 'delayed';
    }
    if (type?.state === 'in')   return 'live';
    if (type?.state === 'post') return 'final';
    return 'pre';
};

const formatKickoffCT = (iso) => {
    try {
        return new Date(iso).toLocaleTimeString('en-US', {
            timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true,
        });
    } catch {
        return '';
    }
};

// "3rd & 7" → "3RD&7", "1st & Goal" → "1ST&G"
const compactDownDistance = (text) => {
    if (!text) return null;
    return text.toUpperCase().replace(/\s*&\s*/, '&').replace('GOAL', 'G');
};

// Ball spot on a fixed 0–100 axis: 0 = away goal line (left), 100 = home goal line (right).
// possessionText is "<side abbr> <yard>" (e.g. "UGA 25") or "50" at midfield.
const ballSpot = (possessionText, away, home) => {
    if (!possessionText) return null;
    const m = possessionText.trim().match(/^(\S+)?\s*(\d{1,2})$/);
    if (!m) return null;
    const yard = parseInt(m[2], 10);
    if (yard === 50 || !m[1]) return 50;
    if (m[1] === away.abbr) return yard;
    if (m[1] === home.abbr) return 100 - yard;
    return null;
};

const parseTeam = (c) => {
    const rank = c.curatedRank?.current;
    return {
        id: String(c.team?.id ?? ''),
        abbr: (c.team?.abbreviation || '???').toUpperCase(),
        name: c.team?.displayName || '',
        conferenceId: String(c.team?.conferenceId ?? ''),
        rank: rank >= 1 && rank <= 25 ? rank : null,
        score: c.score ?? null,
        record: c.records?.find(r => r.type === 'total')?.summary ?? null,
        color: ledColor(c.team?.color, c.team?.alternateColor),
        altColor: ledColor(c.team?.alternateColor),
        winner: !!c.winner,
    };
};

export const parseEvent = (event) => {
    const comp = event.competitions?.[0];
    if (!comp) return null;
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    const home = comp.competitors?.find(c => c.homeAway === 'home');
    if (!away || !home) return null;

    const awayTeam = parseTeam(away);
    const homeTeam = parseTeam(home);
    // Lots of teams land on the same red — if both rows would look alike, the home team
    // switches to its alternate (white/gray when the alternate has no real hue)
    if (colorsClash(awayTeam.color, homeTeam.color) && !colorsClash(awayTeam.color, homeTeam.altColor)) {
        homeTeam.color = homeTeam.altColor;
    }
    const status = normalizeStatus(comp.status?.type);
    const sit = comp.situation || {};

    // Possession + field position only mean something while the ball is live
    let possession = null, spot = null, lineToGain = null, downText = null, redZone = false;
    if (status === 'live' && sit.possession) {
        possession = String(sit.possession) === awayTeam.id ? 'away'
                   : String(sit.possession) === homeTeam.id ? 'home' : null;
        spot = ballSpot(sit.possessionText, awayTeam, homeTeam);
        redZone = !!sit.isRedZone;
        if (sit.down > 0) {
            downText = compactDownDistance(sit.shortDownDistanceText);
            const goalToGo = /GOAL/i.test(sit.shortDownDistanceText || '');
            if (spot !== null && possession && sit.distance > 0 && !goalToGo) {
                // Away attacks right (toward the home end zone), home attacks left
                const dir = possession === 'away' ? 1 : -1;
                lineToGain = Math.max(0, Math.min(100, spot + dir * sit.distance));
            }
        }
    }

    const tbd = /TBD|TBA/i.test(comp.status?.type?.shortDetail || '');

    return {
        id: event.id,
        date: event.date,
        dateKeyCT: getCTDate(new Date(event.date)).key,
        weekday: getCTDate(new Date(event.date)).weekday,
        status,
        period: comp.status?.period ?? 0,
        clock: comp.status?.displayClock || null,
        kickoff: tbd ? 'TBD' : formatKickoffCT(event.date),
        tv: (() => {
            const name = comp.broadcasts?.[0]?.names?.[0];
            if (!name) return null;
            return TV_LABELS[name] || name.toUpperCase().slice(0, 8);
        })(),
        awayTeam,
        homeTeam,
        possession,
        spot,
        lineToGain,
        downText,
        redZone,
    };
};

// ── Scoreboard fetching ─────────────────────────────────────────────────────

export const getScoreboard = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
};

const LIVE_TTL = 30_000;        // a game is on (or about to be)
const IDLE_TTL = 5 * 60_000;    // nothing happening

const ACTIVE = ['live', 'half', 'end', 'delayed'];

// Wraps a league's loader with the shared day-window filter and cache.
// loadEvents({ key, weekday }) → { events, from, to } where from/to are CT date keys.
export const createWeekFetcher = (tag, loadEvents) => {
    let cache = null, cacheTime = 0, cacheDate = null, cacheTTL = 0;

    return async () => {
        const now = Date.now();
        const today = getCTDate();
        if (cache && cacheDate === today.key && (now - cacheTime) < cacheTTL) {
            return cache;
        }

        try {
            const { events, from, to } = await loadEvents(today);
            console.log(`[${tag}] Fetched (showing ${from} to ${to} CT)`);
            const games = events
                .map(parseEvent)
                .filter(g => g && g.dateKeyCT >= from && g.dateKeyCT <= to)
                .map(g => ({ ...g, isToday: g.dateKeyCT === today.key }));
            console.log(`[${tag}] ${games.length} games in window`);

            const soon = now + 10 * 60_000;
            const active = games.some(g => ACTIVE.includes(g.status) || (g.status === 'pre' && Date.parse(g.date) <= soon));
            cache = games;
            cacheTime = now;
            cacheDate = today.key;
            cacheTTL = active ? LIVE_TTL : IDLE_TTL;
            return games;
        } catch (err) {
            console.error(`[${tag}] Fetch error:`, err.name === 'AbortError' ? 'Request timed out' : err);
            // null (not []) so callers can tell "fetch failed" apart from "no games";
            // a stale cache from a previous day is worse than no data
            return cacheDate === today.key ? cache : null;
        }
    };
};
