import TXDChunk from "./TXDChunk";

export default interface TextureData extends TXDChunk {
	version: number,
	filter_flags: number,
	texture_name: string, // Technically number[]
	alpha_name: string, // Technically number[]
	alpha_flags: number,
	direct3d_texture_format: number,
	width: number,
	height: number,
	depth: number,
	mipmap_count: number,
	texcode_type: number,
	flags: number,
	palette: Buffer,
	data_size: number,
	data: Buffer,
	mipmaps: { 
		data_size: number,
		data: Buffer,
	}[],
}