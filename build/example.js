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
const sharp_1 = __importDefault(require("sharp"));
const txdDir = path_1.default.join(__dirname, "..", "txd");
const outDir = path_1.default.join(__dirname, "..", "out");
function processTXD(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = path_1.default.basename(filePath, '.txd');
        const fileOutDir = path_1.default.join(outDir, name);
        fs_1.default.mkdirSync(fileOutDir, { recursive: true });
        const txd = new _1.default(new Uint8Array(fs_1.default.readFileSync(filePath)));
        const textures = txd.getTextures();
        console.log(`[${name}] ${textures.length} textures`);
        for (const tex of textures) {
            try {
                const { width, height, data } = tex.getPixelData();
                const pngBuf = yield (0, sharp_1.default)(data, {
                    raw: { width, height, channels: 4 },
                }).png().toBuffer();
                fs_1.default.writeFileSync(path_1.default.join(fileOutDir, `${tex.name}.png`), pngBuf);
            }
            catch (e) {
                console.warn(`  [${tex.name}] failed: ${e.message}`);
            }
        }
    });
}
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = fs_1.default.readdirSync(txdDir).filter(f => f.toLowerCase().endsWith('.txd'));
        if (files.length === 0) {
            console.warn("No TXD files found in", txdDir);
            return;
        }
        for (const file of files) {
            yield processTXD(path_1.default.join(txdDir, file));
        }
    });
}
start();
//# sourceMappingURL=example.js.map