import TXDChunk from "./TXDChunk";
export default interface Texture extends TXDChunk {
    chunks: TXDChunk[];
}
