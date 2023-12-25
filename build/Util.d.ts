import RGBA from "./interfaces/RGBA";
import Canvas from 'canvas';
export default class Util {
    static from565(RGB565: number): RGBA;
    static lerp(start: number, end: number, t: number): number;
    static lerpColor(color1: RGBA, color2: RGBA, t: number): {
        R: number;
        G: number;
        B: number;
        A: number;
    };
    static interpolate565(color0: number, color1: number): RGBA[];
    static setPixel(x: number, y: number, colour: RGBA, imageData: Canvas.ImageData): void;
}
