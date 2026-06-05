// MLB Stats API fetch + normalization layer

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

// Static team ID → abbreviation map (API team.id → short abbr for LED display)
export const MLB_TEAM_MAP = {
    109: { abbr: 'ARI', name: 'Arizona Diamondbacks' },
    144: { abbr: 'ATL', name: 'Atlanta Braves' },
    110: { abbr: 'BAL', name: 'Baltimore Orioles' },
    111: { abbr: 'BOS', name: 'Boston Red Sox' },
    112: { abbr: 'CHC', name: 'Chicago Cubs' },
    145: { abbr: 'CWS', name: 'Chicago White Sox' },
    113: { abbr: 'CIN', name: 'Cincinnati Reds' },
    114: { abbr: 'CLE', name: 'Cleveland Guardians' },
    115: { abbr: 'COL', name: 'Colorado Rockies' },
    116: { abbr: 'DET', name: 'Detroit Tigers' },
    117: { abbr: 'HOU', name: 'Houston Astros' },
    118: { abbr: 'KC',  name: 'Kansas City Royals' },
    108: { abbr: 'LAA', name: 'Los Angeles Angels' },
    119: { abbr: 'LAD', name: 'Los Angeles Dodgers' },
    146: { abbr: 'MIA', name: 'Miami Marlins' },
    158: { abbr: 'MIL', name: 'Milwaukee Brewers' },
    142: { abbr: 'MIN', name: 'Minnesota Twins' },
    121: { abbr: 'NYM', name: 'New York Mets' },
    147: { abbr: 'NYY', name: 'New York Yankees' },
    133: { abbr: 'OAK', name: 'Athletics' },
    143: { abbr: 'PHI', name: 'Philadelphia Phillies' },
    134: { abbr: 'PIT', name: 'Pittsburgh Pirates' },
    135: { abbr: 'SD',  name: 'San Diego Padres' },
    137: { abbr: 'SF',  name: 'San Francisco Giants' },
    136: { abbr: 'SEA', name: 'Seattle Mariners' },
    138: { abbr: 'STL', name: 'St. Louis Cardinals' },
    139: { abbr: 'TB',  name: 'Tampa Bay Rays' },
    140: { abbr: 'TEX', name: 'Texas Rangers' },
    141: { abbr: 'TOR', name: 'Toronto Blue Jays' },
    120: { abbr: 'WSH', name: 'Washington Nationals' },
};

// MLB team colors optimized for LED matrix visibility
export const MLB_COLORS = {
    'ARI': '0xCC6600',
    'ATL': '0xCC0000',
    'BAL': '0xFF6600',
    'BOS': '0xCC0000',
    'CHC': '0x0066CC',
    'CWS': '0x888888',
    'CIN': '0xCC0000',
    'CLE': '0xCC0000',
    'COL': '0x9900CC',
    'DET': '0x0066CC',
    'HOU': '0xFF6600',
    'KC':  '0x0066CC',
    'LAA': '0xCC0000',
    'LAD': '0x0066CC',
    'MIA': '0x00CCCC',
    'MIL': '0xFF9900',
    'MIN': '0xCC0000',
    'NYM': '0x0066CC',
    'NYY': '0xCCCCCC',
    'OAK': '0x00CC00',
    'PHI': '0xCC0000',
    'PIT': '0xFFCC00',
    'SD':  '0xCC9933',
    'SF':  '0xFF6600',
    'SEA': '0x0066CC',
    'STL': '0xCC0000',
    'TB':  '0x0066CC',
    'TEX': '0x0066CC',
    'TOR': '0x0066CC',
    'WSH': '0xCC0000',
};

// Get today's date string in Pacific Time (YYYY-MM-DD)
const getPTDateString = () => {
    const now = new Date();
    const ptTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const y = ptTime.getFullYear();
    const m = String(ptTime.getMonth() + 1).padStart(2, '0');
    const d = String(ptTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Normalize abstractGameState + detailedState → simple status string
const normalizeStatus = (status) => {
    const abs = status?.abstractGameState;
    const detail = status?.detailedState || '';
    if (abs === 'Final') return 'final';
    if (abs === 'Live') {
        if (detail.includes('Delayed')) return 'delayed';
        if (detail.includes('Suspended')) return 'suspended';
        return 'live';
    }
    return 'pre'; // Preview / Scheduled / Postponed etc.
};

// Convert UTC game time to Pacific display time (e.g. "7:10 PM")
const formatGameTimePT = (gameDate) => {
    try {
        const d = new Date(gameDate);
        return d.toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '';
    }
};

// Parse a single game object from the API response into normalized GameData
const parseGame = (game) => {
    const teamInfo = (teamData) => {
        const id = teamData?.team?.id;
        const mapped = MLB_TEAM_MAP[id] || { abbr: '???', name: teamData?.team?.name || '???' };
        return {
            id,
            abbr: mapped.abbr,
            name: mapped.name,
            score: teamData?.score ?? null,
            color: MLB_COLORS[mapped.abbr] || '0xffffff',
        };
    };

    const away = teamInfo(game.teams?.away);
    const home = teamInfo(game.teams?.home);
    const ls = game.linescore || {};
    const status = normalizeStatus(game.status);

    // Per-inning data (for potential line score use later)
    const innings = (ls.innings || []).map(inn => ({
        num: inn.num,
        awayRuns: inn.away?.runs ?? null,
        homeRuns: inn.home?.runs ?? null,
    }));

    return {
        gamePk: game.gamePk,
        status,
        detailedState: game.status?.detailedState || '',
        delayReason: game.status?.reason || null,
        gameTime: formatGameTimePT(game.gameDate),
        awayTeam: away,
        homeTeam: home,
        inning: ls.currentInning || null,
        inningState: (ls.inningState || '').toLowerCase(), // 'top','middle','bottom','end'
        balls: ls.balls ?? null,
        strikes: ls.strikes ?? null,
        outs: ls.outs ?? null,
        bases: {
            first:  !!(ls.offense?.first),
            second: !!(ls.offense?.second),
            third:  !!(ls.offense?.third),
        },
        innings,
    };
};

// Cache
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 30_000;

export const fetchMLBGames = async () => {
    const now = Date.now();
    if (_cache && (now - _cacheTime) < CACHE_TTL) {
        return _cache;
    }

    const dateStr = getPTDateString();
    const url = `${MLB_BASE}/schedule?sportId=1&date=${dateStr}&hydrate=linescore`;

    try {
        console.log(`[MLB] Fetching schedule for PT date: ${dateStr}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const games = (data.dates?.[0]?.games || []).map(parseGame);
        console.log(`[MLB] Fetched ${games.length} games`);
        _cache = games;
        _cacheTime = now;
        return games;
    } catch (err) {
        console.error('[MLB] Fetch error:', err);
        return _cache || [];
    }
};
