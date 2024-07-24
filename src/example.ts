import TXDReader from ".";
import fs from 'fs';
import path from 'path';

async function start() {
		
	// This is an example of how to use TXDReader and to test it.
	const filePath = path.join(__dirname, "..", "txd", "burgsh01_law.txd");
	const outDir = path.join(__dirname, "..", "out");

	if (!fs.existsSync(filePath)) {
		throw new Error("No such TXD");
	}

	const fileData = fs.readFileSync(filePath);

	const txd = new TXDReader(fileData);

	console.log(`Read %s textures`, txd.textureList.length, txd.textureList);

	for (let texture of txd.textureList) {
		const pngBuf = await txd.getPNG(texture);
		if (!pngBuf) {
			console.warn("Failed to read PNG for %s", texture);
			continue;
		}
		fs.writeFileSync(path.join(outDir, `${texture}.png`), pngBuf);
	}
}

start();