"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Converter_1 = __importDefault(require("./Converter"));
class TXDTexture {
    constructor(chunk) {
        var _a;
        this.chunk = chunk;
        const data = chunk.chunks[0];
        this.name = data.texture_name;
        this.alphaName = data.alpha_name;
        this.width = data.width;
        this.height = data.height;
        this.depth = data.depth;
        this.format = (_a = data.metadata.direct3dTextureFormat) !== null && _a !== void 0 ? _a : 'Unknown';
        this.mipmapCount = data.mipmap_count;
    }
    getPixelData() {
        return Converter_1.default.convert(this.chunk);
    }
}
exports.default = TXDTexture;
//# sourceMappingURL=TXDTexture.js.map