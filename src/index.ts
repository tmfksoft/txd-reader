import path from 'path';
import fs, { read } from 'fs';
import TXDChunk from './interfaces/TXDChunk';
import TXDFile from './interfaces/TXDFile';
import TXDInfo from './interfaces/TXDInfo';
import PointerBuffer from './PointerBuffer';
import Texture from './interfaces/Texture';
import TextureData from './interfaces/TextureData';
import ExtraInfo from './interfaces/ExtraInfo';
import Converter from './Converter';
class TXDReader {

	public rawData: PointerBuffer;
	public textureList: string[] = [];
	public parsed: TXDFile;

	public RWVER: { [key: number]: string } = {
		0x0003FFFF:	"3.0.0.3",
		0x0800FFFF:	"3.?.?.?",
		0x00000310:	"3.1.0.0",
		0x0C02FFFF:	"3.3.0.2",
		0x1003FFFF:	"3.4.0.3",
		0x1803FFFF:	"3.6.0.3",
	};
	public DXVER: { [key: number]: string} = {
		894720068: "Dxt5",
		877942852: "Dxt4",
		861165636: "Dxt3",
		844388420: "Dxt2",
		827611204: "Dxt1",
	};


	constructor(protected data: Buffer) {
		this.rawData = new PointerBuffer(data);
		this.parsed = this.parseFile();
		this.populateTextureList();
	}

	public getTexture(textureName: string): Texture | null {
		for (let ch of this.parsed.chunks) {
			if (ch.id !== 0x15) continue;

			const textureChunk = ch as Texture;
			if (textureChunk.chunks.length <= 0) continue;

			if (textureChunk.chunks[0].id === 0x01) {
				const textureDataChunk = textureChunk.chunks[0] as TextureData;
				if (textureName.toLowerCase() === textureDataChunk.texture_name.toLowerCase()) {
					return textureChunk;
				}
			}
		}
		return null;
	}

	public hasTexture(name: string) {
		const tex = this.getTexture(name);
		if (tex) {
			return true;
		}
		return false;
	}

	public getPNG(name: string): Buffer | null {
		const tex = this.getTexture(name);
		if (!tex) {
			return null;
		}
		return Converter.convert(tex);
	}

	private populateTextureList() {
		this.textureList = [];
		for (let ch of this.parsed.chunks) {
			if (ch.id !== 0x15) continue;

			const textureChunk = ch as Texture;
			if (textureChunk.chunks.length <= 0) continue;

			if (textureChunk.chunks[0].id === 0x01) {
				const textureDataChunk = textureChunk.chunks[0] as TextureData;
				this.textureList.push(textureDataChunk.texture_name);
			}
		}
	}

	private parseFile(): TXDFile {

		const txdFile: TXDFile = {
			id: 0x16,
			chunk_size: -1,
			rw_version: -1,
			chunks: [],
			metadata: {
				chunkType: "File",
			},
		};


		txdFile.id = this.rawData.readUint32();

		txdFile.chunk_size = this.rawData.readUint32();

		// Should take into account null padding and such.
		// Skip for now.
		// if (txdFile.chunk_size !== (data.length - 12)) {
		// 	console.warn(`TXD File may be corrupted! ${txdFile.chunk_size} !== ${(data.length - 12)}`);
		// }

		txdFile.rw_version = this.rawData.readUint32();

		const infoChunk = this.parseChunk(this.rawData, false) as TXDInfo;

		if (!infoChunk) {
			throw new Error("Missing TXD File Info Chunk!");
		}

		txdFile.chunks.push(infoChunk);

		for (let textureIndex = 0; textureIndex < infoChunk.count; textureIndex++) {
			console.log(`Reading Texture ${(textureIndex+1)}/${infoChunk.count}`);

			const newChunk = this.parseChunk(this.rawData, false);
			if (!newChunk) {
				break;
			}

			txdFile.chunks.push(newChunk);
		}

		return txdFile;
	}

	private parseChunk(data: PointerBuffer, hadInfo: boolean): TXDChunk | null {
		let chunk : TXDChunk = {
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
			
			if (typeof this.RWVER[chunk.rw_version] !== "undefined") {
				chunk.metadata.rwVersion = this.RWVER[chunk.rw_version];
			}
	
			const infoChunk = chunk as TXDInfo;
	
			// Texture count.
			infoChunk.count = data.readUint16();
	
			// Unknown data
			infoChunk.unknown = data.readUint16();
	
			
			return infoChunk;
		}
		
		if (chunk.id === 0x15) {
			chunk.metadata.chunkType = "TXD Texture";
			// TXD Texture
	
			const textureChunk = chunk as Texture;
			
			textureChunk.chunk_size = data.readUint32();
			textureChunk.rw_version = data.readUint32();
	
			// Contains multiple chunks.
			const dataChunk = this.parseChunk(data, true);
			const extraInfo = this.parseChunk(data, true);
	
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
			
			const textureData = chunk as TextureData;
	
			textureData.chunk_size = data.readUint32();
			textureData.rw_version = data.readUint32();
	
			textureData.version = data.readUint32();
	
			textureData.filter_flags = data.readUint32();
			textureData.texture_name = data.readString(32);
			textureData.alpha_name = data.readString(32); // ok
	
			textureData.alpha_flags = data.readUint32();
			textureData.direct3d_texture_format = data.readUint32();
	
			if (typeof this.DXVER[textureData.direct3d_texture_format] !== "undefined") {
				textureData.metadata.direct3dTextureFormat = this.DXVER[textureData.direct3d_texture_format];
			} else {
				if (textureData.direct3d_texture_format === 21) {
					textureData.metadata.direct3dTextureFormat = "RGBA32";
				} else if (textureData.direct3d_texture_format === 22) {
					textureData.metadata.direct3dTextureFormat = "RGB32";
				} else if (textureData.direct3d_texture_format === 0x00) {
					if (textureData.flags & 1) {
						textureData.metadata.direct3dTextureFormat = "S3TC DXT1";
					}
				} else {
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
			for (let mm=0; mm < (textureData.mipmap_count - 1); mm++) {
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
			const extraInfoChunk = chunk as ExtraInfo;
			
			extraInfoChunk.chunk_size = data.readUint32();
			extraInfoChunk.rw_version = data.readUint32();
			extraInfoChunk.data = data.readSection(extraInfoChunk.chunk_size);
	
			return extraInfoChunk;
		} 
	
		console.warn(`Unrecognised chunk ID ${chunk.id}`);
	
		return null;
		
	}
}
export default TXDReader;