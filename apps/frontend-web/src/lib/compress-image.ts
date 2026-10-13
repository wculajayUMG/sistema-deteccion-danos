export interface CompressedImage {
  blob: Blob;
  sizeKb: number;
  width: number;
  height: number;
  preview: string;
}

export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.85,
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      let { width, height } = image;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas no disponible'));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Error al comprimir la imagen'));
            return;
          }

          resolve({
            blob,
            sizeKb: Math.round(blob.size / 1024),
            width,
            height,
            preview: canvas.toDataURL('image/jpeg', 0.6),
          });
        },
        'image/jpeg',
        quality,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al cargar la imagen'));
    };

    image.src = objectUrl;
  });
}
