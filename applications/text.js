// 64×32 matrix text mode.
// Always word-wraps to fit the display. Shows up to 3 lines statically.
// When there are more than 3 lines, scrolls vertically (one line per tick).

const BOLD_W = {
    '0': 5, '1': 4, '2': 5, '3': 5, '4': 6, '5': 5, '6': 6, '7': 5,
    '8': 6, '9': 6, ':': 3, ' ': 3, '.': 3, '!': 3, '?': 5, '-': 4,
    'A': 6, 'B': 6, 'C': 5, 'D': 6, 'E': 5, 'F': 5, 'G': 6, 'H': 6,
    'I': 3, 'J': 4, 'K': 6, 'L': 5, 'M': 8, 'N': 6, 'O': 6, 'P': 6,
    'Q': 7, 'R': 6, 'S': 5, 'T': 6, 'U': 6, 'V': 6, 'W': 8, 'X': 6,
    'Y': 6, 'Z': 6,
    'a': 5, 'b': 5, 'c': 4, 'd': 5, 'e': 5, 'f': 4, 'g': 5, 'h': 5,
    'i': 2, 'j': 3, 'k': 5, 'l': 2, 'm': 8, 'n': 5, 'o': 5, 'p': 5,
    'q': 5, 'r': 4, 's': 4, 't': 4, 'u': 5, 'v': 5, 'w': 7, 'x': 5,
    'y': 5, 'z': 4,
};

const textWidth = (str, bold) =>
    bold
        ? [...str].reduce((w, ch) => w + (BOLD_W[ch] ?? 5), 0)
        : str.length * 4;

const DISPLAY_W  = 64;
const DISPLAY_H  = 32;
const LINE_H     = 10;   // px between line baselines

// Y baselines for 1–3 static lines, visually centered in 32 px.
const STATIC_Y = {
    1: [16],
    2: [10, 22],
    3: [6, 16, 26],
};

// Top baseline for the first line when scrolling.
const SCROLL_Y_BASE = 6;

// Wrap text into lines that fit DISPLAY_W.
// Respects user newlines, then word-wraps each paragraph.
function wrapLines(text, bold) {
    const lines = [];
    for (const para of text.split('\n')) {
        const words = para.split(/\s+/).filter(Boolean);
        if (words.length === 0) { lines.push(''); continue; }
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (textWidth(candidate, bold) <= DISPLAY_W) {
                current = candidate;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
    }
    return lines.length ? lines : [''];
}

let state = {
    text:    'TINYTRON',
    color:   '0xFFCC00',
    bold:    false,
    scrollY: 0,   // current vertical scroll offset in pixels
};

export function setText({ text, color, bold }) {
    state.text    = (text  !== undefined) ? String(text)  : state.text;
    state.color   = (color !== undefined) ? color          : state.color;
    state.bold    = (bold  !== undefined) ? Boolean(bold)  : state.bold;
    state.scrollY = 0;
}

export function getText() {
    return { text: state.text, color: state.color, bold: state.bold };
}

export function textMode() {
    const { text, color, bold } = state;
    const lines = wrapLines(text, bold);

    if (lines.length <= 3) {
        // Static: center each line horizontally, center the block vertically.
        const ys = STATIC_Y[lines.length];
        return lines.map((line, i) => {
            const w = textWidth(line, bold);
            const x = Math.max(0, Math.round((DISPLAY_W - w) / 2));
            return { t: 't', v: line, x, y: ys[i], c: color, ...(bold ? { b: true } : {}) };
        });
    }

    // Vertical scroll: emit only lines in or near the visible window.
    const scrollY   = state.scrollY;
    const totalH    = lines.length * LINE_H;
    state.scrollY   = (scrollY + LINE_H) % totalH;   // advance one line per tick

    const items = [];
    for (let i = 0; i < lines.length; i++) {
        const y = SCROLL_Y_BASE + i * LINE_H - scrollY;
        if (y > -LINE_H && y <= DISPLAY_H) {
            const w = textWidth(lines[i], bold);
            const x = Math.max(0, Math.round((DISPLAY_W - w) / 2));
            items.push({ t: 't', v: lines[i], x, y, c: color, ...(bold ? { b: true } : {}) });
        }
    }
    return items;
}
