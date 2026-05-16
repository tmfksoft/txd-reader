import Texture from "./interfaces/Texture";
import TextureData from "./interfaces/TextureData";
import PixelData from "./interfaces/PixelData";
export default class Converter {
    static convert(texture: Texture): PixelData;
    static fromBGRA(textureData: TextureData): PixelData;
    static fromPAL8(textureData: TextureData): PixelData;
    static fromDXT1(textureData: TextureData): PixelData;
    static fromDXT3(textureData: TextureData): PixelData;
}
