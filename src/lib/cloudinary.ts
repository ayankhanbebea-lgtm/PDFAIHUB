// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resourceType?: 'raw' | 'image' | 'video' | 'auto';
    publicId?: string;
    format?: string;
  } = {}
): Promise<{ url: string; publicId: string; size: number }> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'pdfai-hub',
      resource_type: options.resourceType || 'raw',
      public_id: options.publicId,
      format: options.format,
      use_filename: true,
      unique_filename: true,
    };

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes,
          });
        }
      })
      .end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

export function getSignedDownloadUrl(publicId: string, expiresIn = 3600): string {
  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    attachment: true,
  });
}
