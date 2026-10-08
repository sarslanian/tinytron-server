// Screensaver mode — the device animates a sprite sheet stored on CIRCUITPY
// (see tinytron/tools/make_nyan.py). We only tell it which sheet to play:
// p = path on device, n = frame count, ms = frame duration.
export function screensaver() {
    return [{ t: 'a', p: '/nyan.bmp', n: 8, ms: 100 }];
}
