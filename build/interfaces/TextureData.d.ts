import TXDChunk from "./TXDChunk";
export default interface TextureData extends TXDChunk {
    version: number;
    filter_flags: number;
    texture_name: string;
    alpha_name: string;
    alpha_flags: number;
    direct3d_texture_format: number;
    width: number;
    height: number;
    depth: number;
    mipmap_count: number;
    texcode_type: number;
    flags: number;
    palette: Uint8Array;
    data_size: number;
    data: Uint8Array;
    mipmaps: {
        data_size: number;
        data: Uint8Array;
    }[];
}
