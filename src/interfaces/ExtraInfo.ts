import TXDChunk from "./TXDChunk";

export default interface ExtraInfo extends TXDChunk {
	data: Buffer,
}