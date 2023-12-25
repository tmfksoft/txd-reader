/// <reference types="node" />
import Texture from "./interfaces/Texture";
import TextureData from "./interfaces/TextureData";
export default class Converter {
    static convert(texture: Texture): Buffer;
    static fromBGRA(textureData: TextureData): Buffer;
    static fromPAL8(textureData: TextureData): Buffer;
    static fromDXT1(textureData: TextureData): Buffer;
    static fromDXT3(textureData: TextureData): Buffer;
}
