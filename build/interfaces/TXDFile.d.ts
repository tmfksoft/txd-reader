import TXDChunk from "./TXDChunk";
export default interface TXDFile extends TXDChunk {
    chunks: TXDChunk[];
}
