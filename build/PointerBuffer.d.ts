export default class PointerBuffer {
    protected data: Uint8Array;
    pointer: number;
    pointerHistory: number[];
    size: number;
    private view;
    get rawData(): Uint8Array<ArrayBufferLike>;
    get hasMore(): boolean;
    constructor(data: Uint8Array);
    pointerCheck(dataSize: number): void;
    readUint32(): number;
    readUint16(): number;
    readUint8(): number;
    readSection(length: number): Uint8Array;
    readString(length: number): string;
    readChunks(length: number): Uint8Array[];
    forward(length: number): void;
    rewind(): void;
}
