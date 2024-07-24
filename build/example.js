"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        // This is an example of how to use TXDReader and to test it.
        const filePath = path_1.default.join(__dirname, "..", "txd", "burgsh01_law.txd");
        const outDir = path_1.default.join(__dirname, "..", "out");
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error("No such TXD");
        }
        const fileData = fs_1.default.readFileSync(filePath);
        const txd = new _1.default(fileData);
        console.log(`Read %s textures`, txd.textureList.length, txd.textureList);
        for (let texture of txd.textureList) {
            const pngBuf = yield txd.getPNG(texture);
            if (!pngBuf) {
                console.warn("Failed to read PNG for %s", texture);
                continue;
            }
            fs_1.default.writeFileSync(path_1.default.join(outDir, `${texture}.png`), pngBuf);
        }
    });
}
start();
//# sourceMappingURL=example.js.map