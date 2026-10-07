import { DateTime } from 'luxon';

// Simple centered clock for the 64×32 matrix:
//   y=11:  big time  "9:41 PM"   (bold, amber)   ← centered
//   y=23:  date      "WED JUN 25" (small, gray)  ← centered

// Bold font (squeezed_bold_7.bdf) per-glyph advance widths, used to center the
// time string. Digits are variable-width (3–6px), so a fixed estimate misplaces
// it — these are the real DWIDTH values from the BDF.
const BOLD_W = {
    '0': 5, '1': 4, '2': 5, '3': 5, '4': 6, '5': 5, '6': 6, '7': 5, '8': 6, '9': 6,
    ':': 3, ' ': 3, 'A': 6, 'P': 6, 'M': 8,
};
const boldWidth = (s) => [...s].reduce((w, ch) => w + (BOLD_W[ch] ?? 5), 0);

// small_font.bdf (Teeny Tiny Pixls) is a fixed 4px advance per glyph.
const smallWidth = (s) => s.length * 4;

const centerX = (width) => Math.max(0, Math.round((64 - width) / 2));

export const clock = () => {
    const now = DateTime.now().setZone('America/Chicago');

    const time = now.toFormat('h:mm');                  // 12-hour, no leading zero
    const ampm = now.toFormat('a').toUpperCase();       // AM / PM
    const timeFull = `${time} ${ampm}`;
    const date = now.toFormat('ccc LLL d').toUpperCase(); // e.g. "WED JUN 25"

    return [
        { t: 't', v: timeFull, x: centerX(boldWidth(timeFull)), y: 11, c: '0xFFCC00', b: true },
        { t: 't', v: date,     x: centerX(smallWidth(date)),    y: 23, c: '0x8a8a8a' },
    ];
};
