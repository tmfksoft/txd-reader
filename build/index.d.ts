import TXDFile from './interfaces/TXDFile';
import PointerBuffer from './PointerBuffer';
import Texture from './interfaces/Texture';
import PixelData from './interfaces/PixelData';
import TXDTexture from './TXDTexture';
declare class TXDReader {
    protected data: Uint8Array;
    rawData: PointerBuffer;
    textureList: string[];
    parsed: TXDFile;
    RWVER: {
        [key: number]: string;
    };
    DXVER: {
        [key: number]: string;
    };
    constructor(data: Uint8Array);
    getTexture(textureName: string): Texture | null;
    hasTexture(name: string): boolean;
    getTextures(): TXDTexture[];
    getPixelData(name: string): PixelData | null;
    private populateTextureList;
    private parseFile;
    private parseChunk;
}
export default TXDReader;
