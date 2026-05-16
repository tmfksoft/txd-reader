import TXDReader from ".";
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const txdDir = path.join(__dirname, "..", "txd");
const outDir = path.join(__dirname, "..", "out");

async function processTXD(filePath: string) {
	const name = path.basename(filePath, '.txd');
	const fileOutDir = path.join(outDir, name);
	fs.mkdirSync(fileOutDir, { recursive: true });

	const txd = new TXDReader(new Uint8Array(fs.readFileSync(filePath)));
	const textures = txd.getTextures();
	console.log(`[${name}] ${textures.length} textures`);

	for (const tex of textures) {
		try {
			const { width, height, data } = tex.getPixelData();
			const pngBuf = await sharp(data, {
				raw: { width, height, channels: 4 },
			}).png().toBuffer();
			fs.writeFileSync(path.join(fileOutDir, `${tex.name}.png`), pngBuf as unknown as Uint8Array);
		} catch (e) {
			console.warn(`  [${tex.name}] failed: ${(e as Error).message}`);
		}
	}
}

async function start() {
	const files = fs.readdirSync(txdDir).filter(f => f.toLowerCase().endsWith('.txd'));
	if (files.length === 0) {
		console.warn("No TXD files found in", txdDir);
		return;
	}
	for (const file of files) {
		await processTXD(path.join(txdDir, file));
	}
}

start();
