"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const canvas_1 = __importDefault(require("canvas"));
const PointerBuffer_1 = __importDefault(require("./PointerBuffer"));
const Util_1 = __importDefault(require("./Util"));
// Returning the raw PNG Buffer
class Converter {
    static convert(texture) {
        if (texture.chunks.length <= 0) {
            throw new Error("Texture doesn't contain any data chunks!");
        }
        const textureData = texture.chunks[0];
        const texFormat = textureData.direct3d_texture_format;
        if (texFormat === 21 || texFormat === 22) {
            // BGRA
            return this.fromBGRA(textureData);
        }
        if (texFormat === 0 && textureData.flags === 0) {
            // PAL 8
            return this.fromPAL8(textureData);
        }
        if (texFormat === 827611204) {
            // DXT1
            return this.fromDXT1(textureData);
        }
        if (texFormat === 861165636) {
            // DXT3
            return this.fromDXT3(textureData);
        }
        // Unknown format
        throw new Error(`Unknown Format ${texFormat}!`);
    }
    static fromBGRA(textureData) {
        const canvas = canvas_1.default.createCanvas(textureData.width, textureData.height);
        const ctx = canvas.getContext("2d");
        const texData = new PointerBuffer_1.default(textureData.data);
        const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < canvasData.data.length; i += 4) {
            const col = {
                B: texData.readUint8(),
                G: texData.readUint8(),
                R: texData.readUint8(),
                A: texData.readUint8(),
            };
            canvasData.data[i] = col.R; // R
            canvasData.data[i + 1] = col.G; // G
            canvasData.data[i + 2] = col.B; // B
            canvasData.data[i + 3] = col.A;
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        return rawImage;
    }
    static fromPAL8(textureData) {
        const canvas = canvas_1.default.createCanvas(textureData.width, textureData.height);
        const ctx = canvas.getContext("2d");
        const texData = new PointerBuffer_1.default(textureData.data);
        const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const paletteData = new PointerBuffer_1.default(textureData.palette);
        const palette = [];
        const pChunks = paletteData.readChunks(4);
        for (let paletteChunk of pChunks) {
            palette.push({
                R: paletteChunk[0],
                G: paletteChunk[1],
                B: paletteChunk[2],
                A: paletteChunk[3],
            });
        }
        for (let i = 0; i < canvasData.data.length; i += 4) {
            const col = palette[texData.readUint8()];
            if (typeof col === "undefined") {
                console.error("Missing Palette Colour!");
            }
            canvasData.data[i] = col.R; // R
            canvasData.data[i + 1] = col.G; // G
            canvasData.data[i + 2] = col.B; // B
            canvasData.data[i + 3] = col.A; // A
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        return rawImage;
    }
    static fromDXT1(textureData) {
        const canvas = canvas_1.default.createCanvas(textureData.width, textureData.height);
        const ctx = canvas.getContext("2d");
        const texData = new PointerBuffer_1.default(textureData.data);
        const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rawBlocks = texData.readChunks(8);
        const blocks = [];
        for (let b of rawBlocks) {
            const smartBlock = new PointerBuffer_1.default(b);
            blocks.push({
                color0: smartBlock.readUint16(),
                color1: smartBlock.readUint16(),
                colorData: smartBlock.readSection(4),
            });
        }
        console.log(`Read ${blocks.length} blocks.`);
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const dxtBlock = blocks[blockIndex];
            const dxtPalette = Util_1.default.interpolate565(dxtBlock.color0, dxtBlock.color1);
            const index0 = (dxtBlock.colorData[0] & 0b11000000) >> 6;
            const index1 = (dxtBlock.colorData[0] & 0b00110000) >> 4;
            const index2 = (dxtBlock.colorData[0] & 0b00001100) >> 2;
            const index3 = (dxtBlock.colorData[0] & 0b00000011);
            const index4 = (dxtBlock.colorData[1] & 0b11000000) >> 6;
            const index5 = (dxtBlock.colorData[1] & 0b00110000) >> 4;
            const index6 = (dxtBlock.colorData[1] & 0b00001100) >> 2;
            const index7 = (dxtBlock.colorData[1] & 0b00000011);
            const index8 = (dxtBlock.colorData[2] & 0b11000000) >> 6;
            const index9 = (dxtBlock.colorData[2] & 0b00110000) >> 4;
            const index10 = (dxtBlock.colorData[2] & 0b00001100) >> 2;
            const index11 = (dxtBlock.colorData[2] & 0b00000011);
            const index12 = (dxtBlock.colorData[3] & 0b11000000) >> 6;
            const index13 = (dxtBlock.colorData[3] & 0b00110000) >> 4;
            const index14 = (dxtBlock.colorData[3] & 0b00001100) >> 2;
            const index15 = (dxtBlock.colorData[3] & 0b00000011);
            const blockX = blockIndex % Math.ceil(textureData.width / 4) * 4;
            const blockY = Math.floor(blockIndex / Math.ceil(textureData.width / 4)) * 4;
            Util_1.default.setPixel(blockX + 3, blockY + 0, dxtPalette[index0], canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 0, dxtPalette[index1], canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 0, dxtPalette[index2], canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 0, dxtPalette[index3], canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 1, dxtPalette[index4], canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 1, dxtPalette[index5], canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 1, dxtPalette[index6], canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 1, dxtPalette[index7], canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 2, dxtPalette[index8], canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 2, dxtPalette[index9], canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 2, dxtPalette[index10], canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 2, dxtPalette[index11], canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 3, dxtPalette[index12], canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 3, dxtPalette[index13], canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 3, dxtPalette[index14], canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 3, dxtPalette[index15], canvasData);
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        return rawImage;
    }
    static fromDXT3(textureData) {
        const canvas = canvas_1.default.createCanvas(textureData.width, textureData.height);
        const ctx = canvas.getContext("2d");
        const texData = new PointerBuffer_1.default(textureData.data);
        const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rawBlocks = texData.readChunks(16);
        const blocks = [];
        for (let b of rawBlocks) {
            const smartBlock = new PointerBuffer_1.default(b);
            blocks.push({
                transparency: smartBlock.readSection(8),
                color0: smartBlock.readUint16(),
                color1: smartBlock.readUint16(),
                colorData: smartBlock.readSection(4),
            });
        }
        console.log(`Read ${blocks.length} blocks.`);
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const dxtBlock = blocks[blockIndex];
            const dxtPalette = Util_1.default.interpolate565(dxtBlock.color0, dxtBlock.color1);
            const transparencyGrid = [
                // Y: 0
                [
                    (dxtBlock.transparency[0] & 0b11110000) >> 4,
                    (dxtBlock.transparency[0] & 0b00001111),
                    (dxtBlock.transparency[1] & 0b11110000) >> 4,
                    (dxtBlock.transparency[1] & 0b00001111), // X: 3
                ],
                // Y: 1
                [
                    (dxtBlock.transparency[2] & 0b11110000) >> 4,
                    (dxtBlock.transparency[2] & 0b00001111),
                    (dxtBlock.transparency[3] & 0b11110000) >> 4,
                    (dxtBlock.transparency[3] & 0b00001111), // X: 3
                ],
                // Y: 2
                [
                    (dxtBlock.transparency[4] & 0b11110000) >> 4,
                    (dxtBlock.transparency[4] & 0b00001111),
                    (dxtBlock.transparency[5] & 0b11110000) >> 4,
                    (dxtBlock.transparency[5] & 0b00001111), // X: 3
                ],
                // Y: 3
                [
                    (dxtBlock.transparency[6] & 0b11110000) >> 4,
                    (dxtBlock.transparency[6] & 0b00001111),
                    (dxtBlock.transparency[7] & 0b11110000) >> 4,
                    (dxtBlock.transparency[7] & 0b00001111), // X: 3
                ],
            ];
            // Row 0
            const index0 = (dxtBlock.colorData[0] & 0b11000000) >> 6;
            const index1 = (dxtBlock.colorData[0] & 0b00110000) >> 4;
            const index2 = (dxtBlock.colorData[0] & 0b00001100) >> 2;
            const index3 = (dxtBlock.colorData[0] & 0b00000011);
            // Row 1
            const index4 = (dxtBlock.colorData[1] & 0b11000000) >> 6;
            const index5 = (dxtBlock.colorData[1] & 0b00110000) >> 4;
            const index6 = (dxtBlock.colorData[1] & 0b00001100) >> 2;
            const index7 = (dxtBlock.colorData[1] & 0b00000011);
            // Row 2
            const index8 = (dxtBlock.colorData[2] & 0b11000000) >> 6;
            const index9 = (dxtBlock.colorData[2] & 0b00110000) >> 4;
            const index10 = (dxtBlock.colorData[2] & 0b00001100) >> 2;
            const index11 = (dxtBlock.colorData[2] & 0b00000011);
            // Row 3
            const index12 = (dxtBlock.colorData[3] & 0b11000000) >> 6;
            const index13 = (dxtBlock.colorData[3] & 0b00110000) >> 4;
            const index14 = (dxtBlock.colorData[3] & 0b00001100) >> 2;
            const index15 = (dxtBlock.colorData[3] & 0b00000011);
            const blockX = blockIndex % Math.ceil(textureData.width / 4) * 4;
            const blockY = Math.floor(blockIndex / Math.ceil(textureData.width / 4)) * 4;
            Util_1.default.setPixel(blockX + 3, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index0]), { A: (transparencyGrid[0][2] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index1]), { A: (transparencyGrid[0][3] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index2]), { A: (transparencyGrid[0][0] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index3]), { A: (transparencyGrid[0][1] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index4]), { A: (transparencyGrid[1][2] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index5]), { A: (transparencyGrid[1][3] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index6]), { A: (transparencyGrid[1][0] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index7]), { A: (transparencyGrid[1][1] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index8]), { A: (transparencyGrid[2][2] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index9]), { A: (transparencyGrid[2][3] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index10]), { A: (transparencyGrid[2][0] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index11]), { A: (transparencyGrid[2][1] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 3, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index12]), { A: (transparencyGrid[3][2] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 2, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index13]), { A: (transparencyGrid[3][3] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 1, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index14]), { A: (transparencyGrid[3][0] * 17) }), canvasData);
            Util_1.default.setPixel(blockX + 0, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index15]), { A: (transparencyGrid[3][1] * 17) }), canvasData);
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        return rawImage;
    }
}
exports.default = Converter;
//# sourceMappingURL=Converter.js.map