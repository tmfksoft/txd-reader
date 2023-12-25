import RGBA from "../RGBA";

export default interface DXT1Block {
	transparency: Buffer, // 8 bytes
	color0: number,
	color1: number,
	colorData: Buffer,
}