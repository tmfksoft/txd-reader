// A basic Buffer wrapper to provide more complex pointer operations.

export default class PointerBuffer {

	// Uses the history to get the pointer location
	// It's slow but cool.
	public pointer: number = 0;
	public pointerHistory: number[] = [];

	public get hasMore() {
		if (this.pointer === this.data.length) {
			console.log("Has more === false");
			return false;
		}
		return true;
	}

	constructor(protected data: Buffer) {}

	pointerCheck(dataSize: number) {
		if (this.pointer + dataSize > this.data.length) {
			throw new Error(`Attempting to read past end of buffer! ${(this.pointer + dataSize)} > ${this.data.length}`);
		}
	}

	readUint32() {
		this.pointerCheck(4);
		const num = this.data.readUint32LE(this.pointer);
		this.forward(4);
		return num;
	}

	readUint16() {
		this.pointerCheck(2);
		const num = this.data.readUint16LE(this.pointer);
		this.forward(2);
		return num;
	}

	readUint8() {
		this.pointerCheck(1);
		const num = this.data.readUint8(this.pointer);
		this.forward(1);
		return num;
	}

	readSection(length: number) {
		this.pointerCheck(length);
		const section = this.data.subarray(this.pointer, this.pointer + length);
		this.forward(length);
		return section;
	}

	readString(length: number) {
		// Trims null bytes
		const str = this.readSection(length);
		return str.toString().split(String.fromCharCode(0x00)).join("");
	}

	readChunks(length: number) {
		let chunks: Buffer[] = [];
		const chunkCount = Math.floor((this.data.length - this.pointer) / length);
		for (let i=0; i<chunkCount; i++) {
			const chunk = this.readSection(length);
			chunks.push(chunk);
		}
		return chunks;
	}

	forward(length: number) {
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