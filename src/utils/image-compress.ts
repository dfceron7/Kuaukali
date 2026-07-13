/**
 * Compresses a base64 image string to reduce its size to under 100-200KB.
 * It uses HTML Canvas to resize and compress to JPEG format with a quality parameter.
 * Returns the original string if it is not an image (e.g. PDF) or if compression fails.
 */
export function compressBase64Image(
  base64Str: string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    // If it's not an image (e.g., PDF) or is very small (less than 50KB), don't touch it
    if (!base64Str.startsWith("data:image/") || base64Str.length < 50000) {
      return resolve(base64Str);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Resize keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(base64Str);
        }

        // Fill background with white to handle transparent PNGs when converting to JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Draw and compress to jpeg
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        console.log(
          `📸 [Image Compress] Compressed from ${(base64Str.length / 1024).toFixed(1)}KB to ${(compressedBase64.length / 1024).toFixed(1)}KB`
        );
        resolve(compressedBase64);
      } catch (err) {
        console.warn("⚠️ [Image Compress] Error during compression, using original image:", err);
        resolve(base64Str);
      }
    };

    img.onerror = (err) => {
      console.warn("⚠️ [Image Compress] Failed to load image for compression:", err);
      resolve(base64Str);
    };
  });
}
