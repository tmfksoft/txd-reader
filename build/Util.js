"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
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
    static setPixel(x, y, colour, pixelData) {
        const pixelIndex = (y * pixelData.width + x) * 4;
        pixelData.data[pixelIndex] = colour.R;
        pixelData.data[pixelIndex + 1] = colour.G;
        pixelData.data[pixelIndex + 2] = colour.B;
        pixelData.data[pixelIndex + 3] = colour.A;
    }
    // Creates an empty pixel data object filled with 0's
    static createPixelData(width, height) {
        const pixelData = new Array(width * height * 4).fill(0);
        return {
            width, height,
            data: pixelData
        };
    }
    static toPNG(pixelData) {
        return __awaiter(this, void 0, void 0, function* () {
            const sharpImage = (0, sharp_1.default)(Buffer.from(pixelData.data), {
                raw: {
                    width: pixelData.width,
                    height: pixelData.height,
                    channels: 4,
                }
            });
            const png = sharpImage.png();
            const pngBuf = yield png.toBuffer();
            return pngBuf;
        });
    }
}
exports.default = Util;
//# sourceMappingURL=Util.js.map