README COMING SOOOON

Here's a quick demo of how to read all the textures from a TXD file and save a PNG to disk per texture:

```
const inputFile = "txd/bballcpark1.txd";

const filePath = path.join(__dirname, "..", inputFile);
const rawData = fs.readFileSync(filePath);

console.log(`Read ${rawData.length} bytes from ${inputFile}`);

const reader = new TXDReader(rawData);

for (let textureName of reader.textureList) {
	const png = reader.getPNG(textureName);
	if (png) {
		fs.writeFileSync(`out/${textureName}.png`, png);
	}
}
```