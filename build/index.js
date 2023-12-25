"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const PointerBuffer_1 = __importDefault(require("./PointerBuffer"));
const canvas_1 = __importDefault(require("canvas"));
const RWVER = {
    0x0003FFFF: "3.0.0.3",
    0x0800FFFF: "3.?.?.?",
    0x00000310: "3.1.0.0",
    0x0C02FFFF: "3.3.0.2",
    0x1003FFFF: "3.4.0.3",
    0x1803FFFF: "3.6.0.3",
};
const DXVER = {
    894720068: "Dxt5",
    877942852: "Dxt4",
    861165636: "Dxt3",
    844388420: "Dxt2",
    827611204: "Dxt1",
};
const inputFile = "txd/vehicle.txd";
const filePath = path_1.default.join(__dirname, "..", inputFile);
const rawData = fs_1.default.readFileSync(filePath);
console.log(`Read ${rawData.length} bytes from ${inputFile}`);
// Yoinked from ChatGPT...
function from565(RGB565) {
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
function lerp(start, end, t) {
    return Math.round(start + t * (end - start));
}
function lerpColor(color1, color2, t) {
    const r = lerp(color1.R, color2.R, t);
    const g = lerp(color1.G, color2.G, t);
    const b = lerp(color1.B, color2.B, t);
    const a = lerp(color1.A, color2.A, t);
    return { R: r, G: g, B: b, A: a };
}
function interpolate565(color0, color1) {
    const c0 = from565(color0);
    const c1 = from565(color1);
    const colors = [];
    colors.push(lerpColor(c0, c1, 0));
    colors.push(lerpColor(c0, c1, 1));
    if (color0 > color1) {
        // Add 2 colours
        colors.push(lerpColor(c0, c1, 0.33));
        colors.push(lerpColor(c0, c1, 0.67));
    }
    else {
        // Add 1 colour
        // Add transparency
        colors.push(lerpColor(c0, c1, 0.5));
        colors.push({ R: 0, G: 0, B: 0, A: 0 });
    }
    return colors;
}
function setPixel(x, y, colour, imageData) {
    const pixelIndex = (y * imageData.width + x) * 4;
    imageData.data[pixelIndex] = colour.R;
    imageData.data[pixelIndex + 1] = colour.G;
    imageData.data[pixelIndex + 2] = colour.B;
    imageData.data[pixelIndex + 3] = colour.A;
}
function saveTexture(chunk) {
    const textureData = chunk.chunks[0];
    const textureName = textureData.texture_name;
    const texData = new PointerBuffer_1.default(textureData.data);
    const canvas = canvas_1.default.createCanvas(textureData.width, textureData.height);
    const ctx = canvas.getContext("2d");
    const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const texFormat = textureData.direct3d_texture_format;
    if (texFormat === 21 || texFormat === 22) {
        // RGBA and RGB both are stored as BGRA
        console.log("BGRA");
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
        fs_1.default.writeFileSync(`out/${textureName}.png`, rawImage);
    }
    else if (texFormat === 0 && textureData.flags === 0) {
        // Palette based format?
        // Seems to be known as PAL8
        console.info("PAL8");
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
        fs_1.default.writeFileSync(`out/${textureName}.png`, rawImage);
    }
    else if (texFormat === 827611204) {
        // Dxt1 or Dxt11
        console.info("DXT1");
        // 4 bit = 1 Pixel Colour
        // Flags 8?
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
            const dxtPalette = interpolate565(dxtBlock.color0, dxtBlock.color1);
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
            setPixel(blockX + 3, blockY + 0, dxtPalette[index0], canvasData);
            setPixel(blockX + 2, blockY + 0, dxtPalette[index1], canvasData);
            setPixel(blockX + 1, blockY + 0, dxtPalette[index2], canvasData);
            setPixel(blockX + 0, blockY + 0, dxtPalette[index3], canvasData);
            setPixel(blockX + 3, blockY + 1, dxtPalette[index4], canvasData);
            setPixel(blockX + 2, blockY + 1, dxtPalette[index5], canvasData);
            setPixel(blockX + 1, blockY + 1, dxtPalette[index6], canvasData);
            setPixel(blockX + 0, blockY + 1, dxtPalette[index7], canvasData);
            setPixel(blockX + 3, blockY + 2, dxtPalette[index8], canvasData);
            setPixel(blockX + 2, blockY + 2, dxtPalette[index9], canvasData);
            setPixel(blockX + 1, blockY + 2, dxtPalette[index10], canvasData);
            setPixel(blockX + 0, blockY + 2, dxtPalette[index11], canvasData);
            setPixel(blockX + 3, blockY + 3, dxtPalette[index12], canvasData);
            setPixel(blockX + 2, blockY + 3, dxtPalette[index13], canvasData);
            setPixel(blockX + 1, blockY + 3, dxtPalette[index14], canvasData);
            setPixel(blockX + 0, blockY + 3, dxtPalette[index15], canvasData);
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        fs_1.default.writeFileSync(`out/${textureName}.png`, rawImage);
    }
    else if (texFormat === 861165636) {
        // DXT3
        console.info("DXT3");
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
            const dxtPalette = interpolate565(dxtBlock.color0, dxtBlock.color1);
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
            setPixel(blockX + 3, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index0]), { A: (transparencyGrid[0][2] * 17) }), canvasData);
            setPixel(blockX + 2, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index1]), { A: (transparencyGrid[0][3] * 17) }), canvasData);
            setPixel(blockX + 1, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index2]), { A: (transparencyGrid[0][0] * 17) }), canvasData);
            setPixel(blockX + 0, blockY + 0, Object.assign(Object.assign({}, dxtPalette[index3]), { A: (transparencyGrid[0][1] * 17) }), canvasData);
            setPixel(blockX + 3, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index4]), { A: (transparencyGrid[1][2] * 17) }), canvasData);
            setPixel(blockX + 2, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index5]), { A: (transparencyGrid[1][3] * 17) }), canvasData);
            setPixel(blockX + 1, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index6]), { A: (transparencyGrid[1][0] * 17) }), canvasData);
            setPixel(blockX + 0, blockY + 1, Object.assign(Object.assign({}, dxtPalette[index7]), { A: (transparencyGrid[1][1] * 17) }), canvasData);
            setPixel(blockX + 3, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index8]), { A: (transparencyGrid[2][2] * 17) }), canvasData);
            setPixel(blockX + 2, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index9]), { A: (transparencyGrid[2][3] * 17) }), canvasData);
            setPixel(blockX + 1, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index10]), { A: (transparencyGrid[2][0] * 17) }), canvasData);
            setPixel(blockX + 0, blockY + 2, Object.assign(Object.assign({}, dxtPalette[index11]), { A: (transparencyGrid[2][1] * 17) }), canvasData);
            setPixel(blockX + 3, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index12]), { A: (transparencyGrid[3][2] * 17) }), canvasData);
            setPixel(blockX + 2, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index13]), { A: (transparencyGrid[3][3] * 17) }), canvasData);
            setPixel(blockX + 1, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index14]), { A: (transparencyGrid[3][0] * 17) }), canvasData);
            setPixel(blockX + 0, blockY + 3, Object.assign(Object.assign({}, dxtPalette[index15]), { A: (transparencyGrid[3][1] * 17) }), canvasData);
        }
        ctx.putImageData(canvasData, 0, 0);
        const rawImage = canvas.toBuffer();
        fs_1.default.writeFileSync(`out/${textureName}.png`, rawImage);
    }
    else {
        console.warn(`Unknown Texture format ${textureData.direct3d_texture_format}! Couldn't save ${textureName}`);
        fs_1.default.writeFileSync(`out/${textureName}.raw`, textureData.data);
    }
}
function parseFile(data) {
    const txdData = new PointerBuffer_1.default(data);
    const txdFile = {
        id: 0x16,
        chunk_size: -1,
        rw_version: -1,
        chunks: [],
        metadata: {
            chunkType: "File",
        },
    };
    txdFile.id = txdData.readUint32();
    txdFile.chunk_size = txdData.readUint32();
    if (txdFile.chunk_size !== (data.length - 12)) {
        console.warn(`TXD File may be corrupted! ${txdFile.chunk_size} !== ${(data.length - 12)}`);
    }
    txdFile.rw_version = txdData.readUint32();
    const infoChunk = parseChunk(txdData, false);
    if (!infoChunk) {
        throw new Error("Missing TXD File Info Chunk!");
    }
    txdFile.chunks.push(infoChunk);
    for (let textureIndex = 0; textureIndex < infoChunk.count; textureIndex++) {
        console.log(`Reading Texture ${(textureIndex + 1)}/${infoChunk.count}`);
        const newChunk = parseChunk(txdData, false);
        if (!newChunk) {
            break;
        }
        txdFile.chunks.push(newChunk);
    }
    return txdFile;
}
function parseChunk(data, hadInfo) {
    let chunk = {
        id: -1,
        chunk_size: 0,
        rw_version: 0,
        chunks: [],
        metadata: {},
    };
    // Read the chunk id.
    chunk.id = data.readUint32();
    console.log(`Chunk ID: ${chunk.id}`);
    if (chunk.id === 0x01 && !hadInfo) {
        chunk.metadata.chunkType = "TXD Info";
        // TXD Info
        chunk.chunk_size = data.readUint32();
        chunk.rw_version = data.readUint32();
        if (typeof RWVER[chunk.rw_version] !== "undefined") {
            chunk.metadata.rwVersion = RWVER[chunk.rw_version];
        }
        const infoChunk = chunk;
        // Texture count.
        infoChunk.count = data.readUint16();
        // Unknown data
        infoChunk.unknown = data.readUint16();
        return infoChunk;
    }
    if (chunk.id === 0x15) {
        chunk.metadata.chunkType = "TXD Texture";
        // TXD Texture
        const textureChunk = chunk;
        textureChunk.chunk_size = data.readUint32();
        textureChunk.rw_version = data.readUint32();
        // Contains multiple chunks.
        const dataChunk = parseChunk(data, true);
        const extraInfo = parseChunk(data, true);
        if (!dataChunk) {
            throw new Error("Error reading TXD Texture. Missing data chunk!");
        }
        console.log(dataChunk);
        if (!extraInfo) {
            throw new Error("Error reading TXD Texture. Missing info chunk!");
        }
        textureChunk.chunks = [
            dataChunk,
            extraInfo,
        ];
        return textureChunk;
    }
    if (chunk.id === 0x01) {
        chunk.metadata.chunkType = "Texture Data";
        // Texture Data.. this is more complex and matches TXD Info ID...?
        const textureData = chunk;
        textureData.chunk_size = data.readUint32();
        textureData.rw_version = data.readUint32();
        textureData.version = data.readUint32();
        textureData.filter_flags = data.readUint32();
        textureData.texture_name = data.readString(32);
        textureData.alpha_name = data.readString(32); // ok
        textureData.alpha_flags = data.readUint32();
        textureData.direct3d_texture_format = data.readUint32();
        if (typeof DXVER[textureData.direct3d_texture_format] !== "undefined") {
            textureData.metadata.direct3dTextureFormat = DXVER[textureData.direct3d_texture_format];
        }
        else {
            if (textureData.direct3d_texture_format === 21) {
                textureData.metadata.direct3dTextureFormat = "RGBA32";
            }
            else if (textureData.direct3d_texture_format === 22) {
                textureData.metadata.direct3dTextureFormat = "RGB32";
            }
            else if (textureData.direct3d_texture_format === 0x00) {
                if (textureData.flags & 1) {
                    textureData.metadata.direct3dTextureFormat = "S3TC DXT1";
                }
            }
            else {
                textureData.metadata.direct3dTextureFormat = "Unknown";
            }
        }
        textureData.width = data.readUint16();
        textureData.height = data.readUint16();
        textureData.depth = data.readUint8();
        textureData.mipmap_count = data.readUint8();
        textureData.texcode_type = data.readUint8();
        textureData.flags = data.readUint8();
        // Only includes a palette if its 8 Bit?
        const paletteSize = (textureData.depth == 8 ? 256 * 4 : 0);
        textureData.metadata.paletteSize = paletteSize;
        textureData.palette = data.readSection(paletteSize);
        textureData.data_size = data.readUint32();
        textureData.data = data.readSection(textureData.data_size);
        textureData.mipmaps = [];
        // Now to read mipmaps!
        for (let mm = 0; mm < (textureData.mipmap_count - 1); mm++) {
            const dataSize = data.readUint32();
            console.log(`Mipmap ${mm}: Size: ${dataSize}`);
            textureData.mipmaps.push({
                data_size: dataSize,
                data: data.readSection(dataSize)
            });
        }
        return textureData;
    }
    if (chunk.id === 0x03) {
        chunk.metadata.chunkType = "TXD Extra Info";
        // TXD Extra Info
        const extraInfoChunk = chunk;
        extraInfoChunk.chunk_size = data.readUint32();
        extraInfoChunk.rw_version = data.readUint32();
        extraInfoChunk.data = data.readSection(extraInfoChunk.chunk_size);
        return extraInfoChunk;
    }
    console.warn(`Unrecognised chunk ID ${chunk.id}`);
    return null;
}
const parsed = parseFile(rawData);
fs_1.default.writeFileSync("out.json", JSON.stringify(parsed, null, '\t'));
console.log('\n\n\n');
let textureNames = [];
for (let chunk of parsed.chunks) {
    if (chunk.id == 21) {
        const texture = chunk;
        saveTexture(texture);
        for (let ct of chunk.chunks) {
            if (ct.id == 0x01) {
                const tData = ct;
                textureNames.push(tData.texture_name);
            }
        }
    }
    else if (chunk.id == 0x01) {
        const infoChunk = chunk;
        console.log(`Contains ${infoChunk.count} textures.`);
    }
}
console.log(`Read ${textureNames.length} textures..?`);
console.log(textureNames);
//# sourceMappingURL=index.js.map