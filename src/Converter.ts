import Texture from "./interfaces/Texture";
import TextureData from "./interfaces/TextureData";
import PointerBuffer from './PointerBuffer';
import RGBA from './interfaces/RGBA';
import DXT1Block from './interfaces/formats/DXT1Block';
import Util from './Util';
import DXT3Block from './interfaces/formats/DXT3Block';
import PixelData from "./interfaces/PixelData";

export default class Converter {

	static convert(texture: Texture): PixelData {
		return this.convertLevel(texture, 0);
	}

	static convertMipmap(texture: Texture, level: number): PixelData {
		return this.convertLevel(texture, level);
	}

	private static convertLevel(texture: Texture, level: number): PixelData {
		if (texture.chunks.length <= 0) {
			throw new Error("Texture doesn't contain any data chunks!");
		}
		const textureData = texture.chunks[0] as TextureData;

		let slice: TextureData;
		if (level === 0) {
			slice = textureData;
		} else {
			const mipIndex = level - 1;
			if (mipIndex >= textureData.mipmaps.length) {
				throw new Error(`Mipmap level ${level} does not exist (${textureData.mipmaps.length} additional level(s) available)`);
			}
			const mip = textureData.mipmaps[mipIndex];
			slice = {
				...textureData,
				data: mip.data,
				data_size: mip.data_size,
				width: Math.max(1, textureData.width >> level),
				height: Math.max(1, textureData.height >> level),
			};
		}

		const texFormat = slice.direct3d_texture_format;

		// Explicit FourCCs are unambiguous wherever they appear.
		if (texFormat === 827611204) { // 'DXT1'
			return this.fromDXT1(slice);
		}

		if (texFormat === 861165636) { // 'DXT3'
			return this.fromDXT3(slice);
		}

		// D3DFMT_A8R8G8B8 / D3DFMT_X8R8G8B8 - always 32bpp.
		if (texFormat === 21 || texFormat === 22) {
			return this.fromBGRA(slice);
		}

		const dxt1Size = Math.ceil(slice.width / 4) * Math.ceil(slice.height / 4) * 8;
		const dxt3Size = Math.ceil(slice.width / 4) * Math.ceil(slice.height / 4) * 16;

		// Everything else is a GTA III / Vice City style header, where this
		// field isn't a D3D format at all - it's a plain "has alpha" flag, so
		// it only ever holds 0 or 1 and says nothing about the pixel layout.
		// The bit depth is what actually describes that, and it's reliable:
		// the parser only reads a palette when depth is 8.
		//
		// Dispatching on the format field instead used to send III's 32bpp
		// textures through the paletted decoder and its 8bpp textures through
		// the 32bpp one - half of GTA III's textures failed to decode.
		if (slice.depth === 8) {
			if (slice.data_size === slice.width * slice.height) {
				return this.fromPAL8(slice);
			}
		}

		if (slice.depth === 16) {
			if (slice.data_size === slice.width * slice.height * 2) {
				return this.from16Bit(slice);
			}
		}

		if (slice.depth === 32) {
			if (slice.data_size === slice.width * slice.height * 4) {
				return this.fromBGRA(slice);
			}
		}

		// Compressed data can carry any nominal depth, so fall back to
		// matching the payload size against the block-compressed layouts.
		if (slice.data_size === dxt1Size) {
			return this.fromDXT1(slice);
		}

		if (slice.data_size === dxt3Size) {
			return this.fromDXT3(slice);
		}

		throw new Error(
			`Unable to identify texture layout: format field ${texFormat}, depth ${slice.depth}, ` +
			`${slice.width}x${slice.height}, data_size ${slice.data_size} ` +
			`(expected ${slice.width * slice.height} paletted, ${slice.width * slice.height * 4} 32bpp, ` +
			`${dxt1Size} DXT1 or ${dxt3Size} DXT3)`,
		);
	}

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
	static from16Bit(textureData: TextureData): PixelData {
		const texData = new PointerBuffer(textureData.data);
		const pixelData = Util.createPixelData(textureData.width, textureData.height);

		const formatCode = (textureData.alpha_flags >> 8) & 0x0F;

		// Widen a 4/5/6 bit channel to 8 bits by repeating its high bits into
		// the gap, so full-scale input maps to full-scale output.
		const from5 = (v: number) => (v << 3) | (v >> 2);
		const from6 = (v: number) => (v << 2) | (v >> 4);
		const from4 = (v: number) => (v << 4) | v;

		for (let i = 0; i < pixelData.data.length; i += 4) {
			const value = texData.readUint16();

			let R: number, G: number, B: number, A: number;
			if (formatCode === 2) { // 565 - no alpha channel
				R = from5((value >> 11) & 0x1F);
				G = from6((value >> 5) & 0x3F);
				B = from5(value & 0x1F);
				A = 255;
			} else if (formatCode === 3) { // 4444
				A = from4((value >> 12) & 0x0F);
				R = from4((value >> 8) & 0x0F);
				G = from4((value >> 4) & 0x0F);
				B = from4(value & 0x0F);
			} else { // 1555, and 555 which is the same minus the alpha bit
				A = (formatCode === 7) ? 255 : (((value >> 15) & 0x01) ? 255 : 0);
				R = from5((value >> 10) & 0x1F);
				G = from5((value >> 5) & 0x1F);
				B = from5(value & 0x1F);
			}

			pixelData.data[i] = R;
			pixelData.data[i + 1] = G;
			pixelData.data[i + 2] = B;
			pixelData.data[i + 3] = A;
		}

		return pixelData;
	}

	static fromBGRA(textureData: TextureData): PixelData {
		const texData = new PointerBuffer(textureData.data);
		const pixelData = Util.createPixelData(textureData.width, textureData.height);

		for (let i=0; i<pixelData.data.length; i+=4) {
			const col = {
				B: texData.readUint8(),
				G: texData.readUint8(),
				R: texData.readUint8(),
				A: texData.readUint8(),
			};
			pixelData.data[i] = col.R;
			pixelData.data[i+1] = col.G;
			pixelData.data[i+2] = col.B;
			pixelData.data[i+3] = col.A;
		}

		return pixelData;
	}

	static fromPAL8(textureData: TextureData): PixelData {
		const pixelData = Util.createPixelData(textureData.width, textureData.height);
		const texData = new PointerBuffer(textureData.data);

		const paletteData = new PointerBuffer(textureData.palette);
		const palette: RGBA[] = [];

		const pChunks = paletteData.readChunks(4);
		for (let paletteChunk of pChunks) {
			palette.push({
				R: paletteChunk[0],
				G: paletteChunk[1],
				B: paletteChunk[2],
				A: paletteChunk[3],
			});
		}

		for (let i=0; i<pixelData.data.length; i+=4) {
			const col = palette[texData.readUint8()];
			if (typeof col === "undefined") {
				console.error("Missing Palette Colour!")
			}
			pixelData.data[i] = col.R;
			pixelData.data[i+1] = col.G;
			pixelData.data[i+2] = col.B;
			pixelData.data[i+3] = col.A;
		}

		return pixelData;
	}
	static fromDXT1(textureData: TextureData): PixelData {
		
		const pixelData = Util.createPixelData(textureData.width, textureData.height);
		const texData = new PointerBuffer(textureData.data);

		const rawBlocks = texData.readChunks(8);
		const blocks: DXT1Block[] = [];

		for (let b of rawBlocks) {
			const smartBlock = new PointerBuffer(b);
			blocks.push({
				color0: smartBlock.readUint16(),
				color1: smartBlock.readUint16(),
				colorData: smartBlock.readSection(4),
			});
		}

		//console.log(`Read ${blocks.length} blocks.`);

		for (let blockIndex=0; blockIndex<blocks.length; blockIndex++) {
			const dxtBlock = blocks[blockIndex];
			
			const dxtPalette = Util.interpolate565(dxtBlock.color0, dxtBlock.color1);

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

			Util.setPixel(blockX + 3 , blockY + 0, dxtPalette[index0], pixelData);
			Util.setPixel(blockX + 2 , blockY + 0, dxtPalette[index1], pixelData);
			Util.setPixel(blockX + 1 , blockY + 0, dxtPalette[index2], pixelData);
			Util.setPixel(blockX + 0 , blockY + 0, dxtPalette[index3], pixelData);

			Util.setPixel(blockX + 3 , blockY + 1, dxtPalette[index4], pixelData);
			Util.setPixel(blockX + 2 , blockY + 1, dxtPalette[index5], pixelData);
			Util.setPixel(blockX + 1 , blockY + 1, dxtPalette[index6], pixelData);
			Util.setPixel(blockX + 0 , blockY + 1, dxtPalette[index7], pixelData);

			Util.setPixel(blockX + 3 , blockY + 2, dxtPalette[index8], pixelData);
			Util.setPixel(blockX + 2 , blockY + 2, dxtPalette[index9], pixelData);
			Util.setPixel(blockX + 1 , blockY + 2, dxtPalette[index10], pixelData);
			Util.setPixel(blockX + 0 , blockY + 2, dxtPalette[index11], pixelData);

			Util.setPixel(blockX + 3 , blockY + 3, dxtPalette[index12], pixelData);
			Util.setPixel(blockX + 2 , blockY + 3, dxtPalette[index13], pixelData);
			Util.setPixel(blockX + 1 , blockY + 3, dxtPalette[index14], pixelData);
			Util.setPixel(blockX + 0 , blockY + 3, dxtPalette[index15], pixelData);

		}

		return pixelData;

	}
	static fromDXT3(textureData: TextureData): PixelData {
		const pixelData = Util.createPixelData(textureData.width, textureData.height);
		const texData = new PointerBuffer(textureData.data);

		const rawBlocks = texData.readChunks(16);
		const blocks: DXT3Block[] = [];

		for (let b of rawBlocks) {
			const smartBlock = new PointerBuffer(b);
			blocks.push({
				transparency: smartBlock.readSection(8),
				color0: smartBlock.readUint16(),
				color1: smartBlock.readUint16(),
				colorData: smartBlock.readSection(4),
			});
		}

		//console.log(`Read ${blocks.length} blocks.`);

		for (let blockIndex=0; blockIndex<blocks.length; blockIndex++) {
			const dxtBlock = blocks[blockIndex];
			
			const dxtPalette = Util.interpolate565(dxtBlock.color0, dxtBlock.color1);

			const transparencyGrid = [
				// Y: 0
				[
					(dxtBlock.transparency[0] & 0b11110000) >> 4,	// X: 0
					(dxtBlock.transparency[0] & 0b00001111),		// X: 1
					(dxtBlock.transparency[1] & 0b11110000) >> 4,	// X: 2
					(dxtBlock.transparency[1] & 0b00001111),		// X: 3
				],

				// Y: 1
				[
					(dxtBlock.transparency[2] & 0b11110000) >> 4,	// X: 0
					(dxtBlock.transparency[2] & 0b00001111),		// X: 1
					(dxtBlock.transparency[3] & 0b11110000) >> 4,	// X: 2
					(dxtBlock.transparency[3] & 0b00001111),		// X: 3
				],

				// Y: 2
				[
					(dxtBlock.transparency[4] & 0b11110000) >> 4,	// X: 0
					(dxtBlock.transparency[4] & 0b00001111),		// X: 1
					(dxtBlock.transparency[5] & 0b11110000) >> 4,	// X: 2
					(dxtBlock.transparency[5] & 0b00001111),		// X: 3
				],

				// Y: 3
				[
					(dxtBlock.transparency[6] & 0b11110000) >> 4,	// X: 0
					(dxtBlock.transparency[6] & 0b00001111),		// X: 1
					(dxtBlock.transparency[7] & 0b11110000) >> 4,	// X: 2
					(dxtBlock.transparency[7] & 0b00001111),		// X: 3
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

			Util.setPixel(blockX + 3 , blockY + 0, { ...dxtPalette[index0], A: (transparencyGrid[0][2] * 17) }, pixelData);
			Util.setPixel(blockX + 2 , blockY + 0, { ...dxtPalette[index1], A: (transparencyGrid[0][3] * 17) }, pixelData);
			Util.setPixel(blockX + 1 , blockY + 0, { ...dxtPalette[index2], A: (transparencyGrid[0][0] * 17) }, pixelData);
			Util.setPixel(blockX + 0 , blockY + 0, { ...dxtPalette[index3], A: (transparencyGrid[0][1] * 17) }, pixelData);

			Util.setPixel(blockX + 3 , blockY + 1, { ...dxtPalette[index4], A: (transparencyGrid[1][2] * 17) }, pixelData);
			Util.setPixel(blockX + 2 , blockY + 1, { ...dxtPalette[index5], A: (transparencyGrid[1][3] * 17) }, pixelData);
			Util.setPixel(blockX + 1 , blockY + 1, { ...dxtPalette[index6], A: (transparencyGrid[1][0] * 17) }, pixelData);
			Util.setPixel(blockX + 0 , blockY + 1, { ...dxtPalette[index7], A: (transparencyGrid[1][1] * 17) }, pixelData);

			Util.setPixel(blockX + 3 , blockY + 2, { ...dxtPalette[index8], A: (transparencyGrid[2][2] * 17) }, pixelData);
			Util.setPixel(blockX + 2 , blockY + 2, { ...dxtPalette[index9], A: (transparencyGrid[2][3] * 17) }, pixelData);
			Util.setPixel(blockX + 1 , blockY + 2, { ...dxtPalette[index10], A: (transparencyGrid[2][0] * 17) }, pixelData);
			Util.setPixel(blockX + 0 , blockY + 2, { ...dxtPalette[index11], A: (transparencyGrid[2][1] * 17) }, pixelData);

			Util.setPixel(blockX + 3 , blockY + 3, { ...dxtPalette[index12], A: (transparencyGrid[3][2] * 17) }, pixelData);
			Util.setPixel(blockX + 2 , blockY + 3, { ...dxtPalette[index13], A: (transparencyGrid[3][3] * 17) }, pixelData);
			Util.setPixel(blockX + 1 , blockY + 3, { ...dxtPalette[index14], A: (transparencyGrid[3][0] * 17) }, pixelData);
			Util.setPixel(blockX + 0 , blockY + 3, { ...dxtPalette[index15], A: (transparencyGrid[3][1] * 17) }, pixelData);

		}
		
		return pixelData;

	}
}