import sharp from 'sharp';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 85;
const PNG_EFFORT = 6;

/**
 * Redimensionne et compresse une image (Buffer) pour alléger les exports PDF.
 * Conserve le format d'entrée (PNG → PNG, JPEG → JPEG) si possible.
 */
export async function compressImageBuffer(
  input: Buffer,
  mimeOrExt: string
): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const isPng = mimeOrExt === 'image/png' || mimeOrExt === 'png' || mimeOrExt.endsWith('.png');
  const ext = isPng ? 'png' : 'jpg';
  const mime = isPng ? 'image/png' : 'image/jpeg';

  const pipeline = sharp(input)
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true });

  const buffer = isPng
    ? await pipeline.png({ effort: PNG_EFFORT }).toBuffer()
    : await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();

  return { buffer, mime, ext };
}
