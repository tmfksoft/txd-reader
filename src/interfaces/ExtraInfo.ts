import TXDChunk from "./TXDChunk";

export default interface ExtraInfo extends TXDChunk {
	data: Uint8Array,
}