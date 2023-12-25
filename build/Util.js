"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Useful methods
class Util {
    // Yoinked from ChatGPT...
    static from565(RGB565) {
        let red = (RGB565 >> 11) & 0b11111;
        let green = (RGB565 >> 5) & 0b111111;
        let blue = RGB565 & 0b11111;
        red = (red << 3) | (red >> 2);
        green = (green << 2) | (green >> 4);
        blue = (blue << 3) | (blue >> 2);
        return {
            R: red,
            G: green,
            B: blue,
            A: 255,
        };
    }
    static lerp(start, end, t) {
        return Math.round(start + t * (end - start));
    }
    static lerpColor(color1, color2, t) {
        const r = this.lerp(color1.R, color2.R, t);
        const g = this.lerp(color1.G, color2.G, t);
        const b = this.lerp(color1.B, color2.B, t);
        const a = this.lerp(color1.A, color2.A, t);
        return { R: r, G: g, B: b, A: a };
    }
    static interpolate565(color0, color1) {
        const c0 = this.from565(color0);
        const c1 = this.from565(color1);
        const colors = [];
        colors.push(this.lerpColor(c0, c1, 0));
        colors.push(this.lerpColor(c0, c1, 1));
        if (color0 > color1) {
            // Add 2 colours
            colors.push(this.lerpColor(c0, c1, 0.33));
            colors.push(this.lerpColor(c0, c1, 0.67));
        }
        else {
            // Add 1 colour
            // Add transparency
            colors.push(this.lerpColor(c0, c1, 0.5));
            colors.push({ R: 0, G: 0, B: 0, A: 0 });
        }
        return colors;
    }
    static setPixel(x, y, colour, imageData) {
        const pixelIndex = (y * imageData.width + x) * 4;
        imageData.data[pixelIndex] = colour.R;
        imageData.data[pixelIndex + 1] = colour.G;
        imageData.data[pixelIndex + 2] = colour.B;
        imageData.data[pixelIndex + 3] = colour.A;
    }
}
exports.default = Util;
//# sourceMappingURL=Util.js.map