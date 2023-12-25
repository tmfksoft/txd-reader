/// <reference types="node" />
import TXDFile from './interfaces/TXDFile';
import PointerBuffer from './PointerBuffer';
import Texture from './interfaces/Texture';
declare class TXDReader {
    protected data: Buffer;
    rawData: PointerBuffer;
    textureList: string[];
    parsed: TXDFile;
    RWVER: {
        [key: number]: string;
    };
    DXVER: {
        [key: number]: string;
    };
    constructor(data: Buffer);
    getTexture(textureName: string): Texture | null;
    hasTexture(name: string): boolean;
    getPNG(name: string): Buffer | null;
    private populateTextureList;
    private parseFile;
    private parseChunk;
}
export default TXDReader;
