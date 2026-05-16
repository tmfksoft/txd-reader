"use strict";
// A basic Buffer wrapper to provide more complex pointer operations.
Object.defineProperty(exports, "__esModule", { value: true });
class PointerBuffer {
    get rawData() {
        return this.data;
    }
    get hasMore() {
        if (this.pointer === this.data.length) {
            //console.log("Has more === false");
            return false;
        }
        return true;
    }
    constructor(data) {
        this.data = data;
        // Uses the history to get the pointer location
        // It's slow but cool.
        this.pointer = 0;
        this.pointerHistory = [];
        this.size = 0;
        this.size = data.length;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    pointerCheck(dataSize) {
        if (this.pointer + dataSize > this.data.length) {
            throw new Error(`Attempting to read past end of buffer! ${(this.pointer + dataSize)} > ${this.data.length}`);
        }
    }
    readUint32() {
        this.pointerCheck(4);
        const num = this.view.getUint32(this.pointer, true);
        this.forward(4);
        return num;
    }
    readUint16() {
        this.pointerCheck(2);
        const num = this.view.getUint16(this.pointer, true);
        this.forward(2);
        return num;
    }
    readUint8() {
        this.pointerCheck(1);
        const num = this.view.getUint8(this.pointer);
        this.forward(1);
        return num;
    }
    readSection(length) {
        this.pointerCheck(length);
        const section = this.data.subarray(this.pointer, this.pointer + length);
        this.forward(length);
        return section;
    }
    readString(length) {
        const rawBytes = this.readSection(length);
        const nullIdx = rawBytes.indexOf(0);
        const bytes = nullIdx > 0 ? rawBytes.subarray(0, nullIdx) : rawBytes;
        return new TextDecoder('utf-8').decode(bytes);
    }
    readChunks(length) {
        let chunks = [];
        const chunkCount = Math.floor((this.data.length - this.pointer) / length);
        for (let i = 0; i < chunkCount; i++) {
            const chunk = this.readSection(length);
            chunks.push(chunk);
        }
        return chunks;
    }
    // Forwards the pointer without read operations.
    forward(length) {
        this.pointer += length;
        this.pointerHistory.push(length);
    }
    // Undoes the last read
    rewind() {
        const lastRead = this.pointerHistory[this.pointerHistory.length - 1];
        this.pointer -= lastRead;
        this.pointerHistory.push(-lastRead);
    }
}
exports.default = PointerBuffer;
//# sourceMappingURL=PointerBuffer.js.map