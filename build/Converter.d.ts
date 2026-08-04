import Texture from "./interfaces/Texture";
import TextureData from "./interfaces/TextureData";
import PixelData from "./interfaces/PixelData";
export default class Converter {
    static convert(texture: Texture): PixelData;
    static convertMipmap(texture: Texture, level: number): PixelData;
    private static convertLevel;
    /**
     * Decodes the 16 bit uncompressed layouts.
     *
     * Which one it is comes from RenderWare's raster format rather than
     * being guessed at - the field this reader calls `alpha_flags` is
     * actually rasterFormat, whose bits 8-11 hold the format code (1 =
     * 1555, 2 = 565, 3 = 4444, 7 = 555). GTA III's 16 bit textures are all
     * 1555; the others are handled because they cost nothing to support and
     * Vice City hasn't been checked.
     */
    static from16Bit(textureData: TextureData): PixelData;
    static fromBGRA(textureData: TextureData): PixelData;
    static fromPAL8(textureData: TextureData): PixelData;
    static fromDXT1(textureData: TextureData): PixelData;
    static fromDXT3(textureData: TextureData): PixelData;
}
