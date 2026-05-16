export default interface DXT3Block {
	transparency: Uint8Array, // 8 bytes
	color0: number,
	color1: number,
	colorData: Uint8Array,
}