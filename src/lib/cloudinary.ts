/**
 * Cloudinary Image Upload Service for SAHAYAK Campus Lost & Found
 * 
 * Supports uploading photos of lost and found belongings and proof documents
 * directly to Cloudinary.
 */

export interface CloudinaryUploadResult {
  url: string;
  publicId?: string;
  source: 'cloudinary' | 'local_optimized';
}

/**
 * Checks whether Cloudinary credentials are provided via environment variables.
 */
export function isCloudinaryConfigured(): boolean {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  return Boolean(cloudName && uploadPreset);
}

/**
 * Compresses an image file before upload or fallback (compacted to prevent localStorage quota exhaustion)
 */
async function compressImage(file: File, maxWidth = 800, quality = 0.68): Promise<Blob | File> {
  return new Promise((resolve) => {
    // If not an image, return raw file
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts File or Blob to Base64 Data URL
 */
function fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to convert file to data URL'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Uploads an image to Cloudinary.
 * If Cloudinary is configured, sends to the official API.
 * If not configured or if the request fails, provides a compressed fallback.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder = 'sahayak_cu_items'
): Promise<CloudinaryUploadResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG, WEBP).');
  }

  // File size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size should be less than 10MB.');
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Optimize image
  const compressed = await compressImage(file, 1280, 0.85);

  // If Cloudinary credentials are fully configured, attempt direct Cloudinary upload
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) {
          return {
            url: data.secure_url,
            publicId: data.public_id,
            source: 'cloudinary',
          };
        }
      } else {
        const errorText = await response.text();
        console.warn('Cloudinary upload returned non-200, falling back to optimized storage:', errorText);
      }
    } catch (error) {
      console.warn('Network error uploading to Cloudinary, falling back to local optimization:', error);
    }
  }

  // Graceful fallback to optimized data URL so student reports are never blocked
  const localDataUrl = await fileToDataUrl(compressed);
  return {
    url: localDataUrl,
    source: 'local_optimized',
  };
}
