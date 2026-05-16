import PixelData from './interfaces/PixelData';
import Texture from './interfaces/Texture';
export default class TXDTexture {
    readonly name: string;
    readonly alphaName: string;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    readonly format: string;
    readonly mipmapCount: number;
    private readonly chunk;
    constructor(chunk: Texture);
    getPixelData(): PixelData;
}
