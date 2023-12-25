import TXDChunk from "./TXDChunk";

export default interface TXDInfo extends TXDChunk {
	id: 0x01,
	count: number,
	unknown: number,
}