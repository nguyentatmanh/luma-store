import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../common/errors.js';

export function createImageStorage(directory) {
  return {
    async save(file) {
      if (!file) throw new AppError(422, 'IMAGE_REQUIRED', 'Chọn một ảnh JPEG, PNG hoặc WebP.');
      let output;
      try {
        const image = sharp(file.buffer, { limitInputPixels: 20000000, failOn: 'warning' });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
          throw new Error('Unsupported image');
        }
        output = await image.rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 }).toBuffer();
      } catch {
        throw new AppError(422, 'INVALID_IMAGE', 'Ảnh không hợp lệ. Dùng JPEG, PNG hoặc WebP tĩnh, tối đa 20 triệu điểm ảnh.');
      }
      await mkdir(directory, { recursive: true });
      const filename = randomUUID() + '.webp';
      await writeFile(path.join(directory, filename), output);
      return filename;
    },
    async remove(filename) {
      // Only server-generated basenames reach this method.
      if (!/^[a-f0-9-]{36}\.webp$/.test(filename)) return;
      try { await unlink(path.join(directory, filename)); }
      catch (error) {
        if (error.code !== 'ENOENT') console.error(JSON.stringify({ event: 'image_cleanup', message: error.message }));
      }
    },
  };
}
