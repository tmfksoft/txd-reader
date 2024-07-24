/// <reference types="node" />
import Texture from "./interfaces/Texture";
import TextureData from "./interfaces/TextureData";
export default class Converter {
    static convert(texture: Texture): Promise<Buffer>;
    static fromBGRA(textureData: TextureData): Promise<Buffer>;
    static fromPAL8(textureData: TextureData): Promise<Buffer>;
    static fromDXT1(textureData: TextureData): Promise<Buffer>;
    static fromDXT3(textureData: TextureData): Promise<Buffer>;
}
