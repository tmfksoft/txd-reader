import Converter from './Converter';
import PixelData from './interfaces/PixelData';
import Texture from './interfaces/Texture';
import TextureData from './interfaces/TextureData';

export default class TXDTexture {
	readonly name: string;
	readonly alphaName: string;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly format: string;
	readonly mipmapCount: number;

	private readonly chunk: Texture;

	constructor(chunk: Texture) {
		this.chunk = chunk;
		const data = chunk.chunks[0] as TextureData;
		this.name = data.texture_name;
		this.alphaName = data.alpha_name;
		this.width = data.width;
		this.height = data.height;
		this.depth = data.depth;
		this.format = (data.metadata.direct3dTextureFormat as string) ?? 'Unknown';
		this.mipmapCount = data.mipmap_count;
	}

	getPixelData(): PixelData {
		return Converter.convert(this.chunk);
	}

	getMipmap(level: number): PixelData {
		return Converter.convertMipmap(this.chunk, level);
	}
}
