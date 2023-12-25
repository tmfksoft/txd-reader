import Metadata from "./Metadata";

export default interface TXDChunk {
	id: number,
	chunk_size: number,
	rw_version: number,
	chunks: TXDChunk[],
	metadata: Metadata,
}