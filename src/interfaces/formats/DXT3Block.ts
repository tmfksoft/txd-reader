export default interface DXT3Block {
	transparency: Buffer, // 8 bytes
	color0: number,
	color1: number,
	colorData: Buffer,
}