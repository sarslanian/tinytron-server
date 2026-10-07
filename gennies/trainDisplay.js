import { DateTime } from 'luxon';

const destMapping = {
    Kimball: 'KMBL',
    Linden:  'LNDN',
    Loop:    'LOOP',
};

const generateTrainDisplay = (data) => {
    if (!data?.ctatt?.eta) {
        return [{ t: 't', v: "No data", x: 1, y: 14, c: "0xFF0000" }];
    }

    const rawEta = data.ctatt.eta;
    const etaData = Array.isArray(rawEta) ? rawEta : [rawEta];

    const kmbl = [];
    const lndn = [];
    const loop = []; // { v, route }

    etaData.forEach(eta => {
        const dest = destMapping[eta.destNm] ?? eta.destNm;
        const parsed = DateTime.fromFormat(eta.arrT[0], 'yyyyMMdd HH:mm:ss', { zone: 'America/Chicago' });
        if (!parsed.isValid) return;

        const mins = Math.round(parsed.diff(DateTime.now().setZone('America/Chicago'), 'minutes').minutes);
        const display = mins <= 0 ? 'D' : String(mins);
        const route = (eta.rt?.[0] ?? '').toLowerCase();

        if (dest === 'KMBL') kmbl.push(display);
        else if (dest === 'LNDN') lndn.push(display);
        else if (dest === 'LOOP') loop.push({ v: display, route });
    });

    const BROWN  = '0x8B4513';
    const PURPLE = '0x9933cc';
    const CYAN   = '0x00d4ff';
    const WHITE  = '0xffffff';

    const routeColor = (route) => route === 'p' || route === 'purp' ? PURPLE : BROWN;

    const payload = [
        { t: 's', f: BROWN,  x: 1, y: 1,  w: 2, h: 9 },
        { t: 's', f: PURPLE, x: 1, y: 11, w: 2, h: 9 },
        { t: 's', f: CYAN,   x: 1, y: 22, w: 2, h: 9 },
    ];

    // ── KMBL ─────────────────────────────────────────────────────────────────
    payload.push({ t: 't', v: 'KMBL', b: true, x: 5, y: 6,  c: BROWN });
    payload.push({ t: 't', v: kmbl[0] ?? '--', b: true, x: 31, y: 6,  c: WHITE });
    if (kmbl[1]) payload.push({ t: 't', v: kmbl[1], x: 43, y: 6,  c: BROWN });
    if (kmbl[2]) payload.push({ t: 't', v: kmbl[2], x: 54, y: 6,  c: BROWN });

    // ── LNDN ─────────────────────────────────────────────────────────────────
    payload.push({ t: 't', v: 'LNDN', b: true, x: 5, y: 16, c: PURPLE });
    payload.push({ t: 't', v: lndn[0] ?? '--', b: true, x: 31, y: 16, c: WHITE });
    if (lndn[1]) payload.push({ t: 't', v: lndn[1], x: 43, y: 16, c: PURPLE });

    // ── LOOP — times colored by their route ───────────────────────────────────
    payload.push({ t: 't', v: 'LOOP', b: true, x: 5, y: 27, c: CYAN });
    payload.push({ t: 't', v: loop[0]?.v ?? '--', b: true, x: 31, y: 27, c: loop[0] ? routeColor(loop[0].route) : WHITE });
    if (loop[1]) payload.push({ t: 't', v: loop[1].v, x: 43, y: 27, c: routeColor(loop[1].route) });
    if (loop[2]) payload.push({ t: 't', v: loop[2].v, x: 54, y: 27, c: routeColor(loop[2].route) });

    return payload;
};

export { generateTrainDisplay };
