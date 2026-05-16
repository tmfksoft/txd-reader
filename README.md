# @majesticfudgie/txd-reader

A zero-dependency library for reading RenderWare TXD texture archive files, as used in GTA III, Vice City, and San Andreas.

Works in both **Node.js** and the **browser**. The library decodes textures to raw RGBA pixel data — image encoding (PNG, etc.) is left to the caller.

Supported texture formats: DXT1, DXT3, BGRA32, RGB32, PAL8.

> **AI notice:** This library has been maintained and improved with the assistance of AI (Claude by Anthropic). If you prefer a version with no AI involvement, use [v1.0.3](https://github.com/tmfksoft/txd-reader/tree/3005ba5).

---

## Installation

```bash
npm install @majesticfudgie/txd-reader
```

---

## Usage

### Loading a TXD file

The constructor accepts a `Uint8Array`. In Node.js, wrap `fs.readFileSync` output; in the browser, use `fetch` or a `FileReader`.

```ts
import TXDReader from '@majesticfudgie/txd-reader';

// Node.js
import fs from 'fs';
const txd = new TXDReader(new Uint8Array(fs.readFileSync('file.txd')));

// Browser
const buffer = await fetch('file.txd').then(r => r.arrayBuffer());
const txd = new TXDReader(new Uint8Array(buffer));

// Browser (file input)
const buffer = await file.arrayBuffer(); // file is a File from <input type="file">
const txd = new TXDReader(new Uint8Array(buffer));
```

---

### Listing textures

`getTextures()` returns an array of `TXDTexture` objects. Building this list is cheap — pixel data is not decoded until you call `getPixelData()`.

```ts
const textures = txd.getTextures();

for (const tex of textures) {
    console.log(tex.name);        // e.g. "ws_skidmarks"
    console.log(tex.alphaName);   // e.g. "ws_skidmarksa" (empty string if none)
    console.log(tex.width);       // e.g. 128
    console.log(tex.height);      // e.g. 128
    console.log(tex.format);      // e.g. "DXT1", "DXT3", "BGRA32", "PAL8"
    console.log(tex.depth);       // colour depth in bits
    console.log(tex.mipmapCount); // number of mipmaps stored
}
```

---

### Decoding pixel data

`getPixelData()` decodes the texture and returns raw RGBA pixel data.

```ts
const tex = txd.getTextures()[0];
const { width, height, data } = tex.getPixelData();
// data is a Uint8Array of interleaved R, G, B, A bytes
// length === width * height * 4
```

You can also decode by name via `TXDReader` directly:

```ts
const pixelData = txd.getPixelData('ws_skidmarks'); // PixelData | null
```

---

### Rendering in the browser

```ts
const { width, height, data } = tex.getPixelData();

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
canvas.getContext('2d')!.putImageData(
    new ImageData(new Uint8ClampedArray(data.buffer), width, height),
    0, 0
);
document.body.appendChild(canvas);
```

---

### Saving as PNG in Node.js

The library has no image encoding dependency. Use [sharp](https://sharp.pixelplumbing.com/) or any other library:

```ts
import sharp from 'sharp';

const { width, height, data } = tex.getPixelData();
await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(`${tex.name}.png`);
```

---

## API

### `TXDReader`

```ts
new TXDReader(data: Uint8Array)
```

| Method / Property | Returns | Description |
|---|---|---|
| `getTextures()` | `TXDTexture[]` | All textures in the archive |
| `getTexture(name)` | `Texture \| null` | Raw parsed chunk by name |
| `getPixelData(name)` | `PixelData \| null` | Decoded pixel data by name |
| `textureList` | `string[]` | Texture names in the archive |

### `TXDTexture`

| Property / Method | Type | Description |
|---|---|---|
| `name` | `string` | Texture name |
| `alphaName` | `string` | Associated alpha mask name (empty string if none) |
| `width` | `number` | Width in pixels |
| `height` | `number` | Height in pixels |
| `depth` | `number` | Colour depth in bits |
| `format` | `string` | Texture format (`"DXT1"`, `"DXT3"`, `"BGRA32"`, `"PAL8"`, etc.) |
| `mipmapCount` | `number` | Number of mipmaps stored |
| `getPixelData()` | `PixelData` | Decode and return raw RGBA pixel data |

### `PixelData`

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Width in pixels |
| `height` | `number` | Height in pixels |
| `data` | `Uint8Array` | Raw RGBA bytes, length = `width * height * 4` |
