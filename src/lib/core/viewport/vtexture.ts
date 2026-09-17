import {
	RGBA_S3TC_DXT3_Format,
	RGBA_S3TC_DXT5_Format,
	RGB_S3TC_DXT1_Format,
	// RGB_ETC1_Format,
	// RGB_BPTC_SIGNED_Format,
	// RGB_BPTC_UNSIGNED_Format,
	CompressedTexture,
	DataTexture,
	FileLoader,
	Loader,
	SRGBColorSpace,
	NearestFilter,
	LinearFilter,
	type Texture,
	type CompressedPixelFormat,
} from 'three';
import Vtf, { VFormats, type VImageEither } from 'vtf-js';

const formatMap: Partial<Record<VFormats, { format: CompressedPixelFormat, size: number }>> = {
	[VFormats.DXT1]: { format: RGB_S3TC_DXT1_Format, size: 8 },
	[VFormats.DXT3]: { format: RGBA_S3TC_DXT3_Format, size: 16 },
	[VFormats.DXT5]: { format: RGBA_S3TC_DXT5_Format, size: 16 },
};

export class VTFLoader extends Loader<DataTexture | CompressedTexture> {
	
	setFlags(texture: Texture) {
		texture.colorSpace = SRGBColorSpace;
		texture.magFilter = NearestFilter;
		texture.minFilter = LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	async parseImage(image: VImageEither) {
		if (image.isEncoded && image.format in formatMap) {
			const compressedFormat = formatMap[image.format]!;
			const texture = new CompressedTexture([{
				data: image.data,
				width: image.width,
				height: image.height
			}], image.width, image.height, compressedFormat.format);
			return this.setFlags(texture);
		}
		else {
			const imageRawU8 = image.decode().coerce(Uint8Array);
			const texture = new DataTexture(imageRawU8.data, imageRawU8.width, imageRawU8.height);
			return this.setFlags(texture);
		}
	}

	async parse(buffer: ArrayBuffer) {
		const vtf = await Vtf.decode(buffer, { noClone: true, onDemand: true });
		const image = vtf.body.getRawImage(0, 0, 0, 0);
		return this.parseImage(image);
	}

	async load(url: string) {
		const loader = new FileLoader( this.manager );

		loader.setPath( this.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );

		const buffer = await loader.loadAsync(url) as ArrayBuffer;
		return this.parse(buffer);
	}
}