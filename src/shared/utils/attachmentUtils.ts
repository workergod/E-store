import type { PurchaseAttachment } from '../types/PurchaseOrder';

/**
 * Formats byte size into human readable string (e.g. 250 KB, 1.2 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isImageFile(type: string = '', name: string = ''): boolean {
  return (
    type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(name)
  );
}

export function isPdfFile(type: string = '', name: string = ''): boolean {
  return (
    type === 'application/pdf' ||
    /\.pdf$/i.test(name)
  );
}

export const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  const isImg = isImageFile(file.type, file.name);
  if (isImg) {
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Photo "${file.name}" is ${formatFileSize(file.size)}. Maximum allowed photo size is 10 MB.`
      };
    }
  } else {
    if (file.size > MAX_DOCUMENT_SIZE) {
      return {
        valid: false,
        error: `Document "${file.name}" is ${formatFileSize(file.size)}. Maximum allowed limit for PDF / Bill is 2 MB.`
      };
    }
  }
  return { valid: true };
}

/**
 * Downscales and compresses image files using HTML5 Canvas to keep file sizes
 * typically below 300KB while retaining high visual clarity for text and numbers.
 */
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Clean JPEG compression at 0.82 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Processes an uploaded file (bill, invoice, receipt, document):
 * Tries Firebase Storage first, then safely falls back to Data URL with
 * automatic canvas image compression so bills always upload instantly.
 */
export async function processAttachmentFile(file: File, companyId?: string): Promise<PurchaseAttachment> {
  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const uploadedAt = new Date().toISOString();

  let fileUrl = '';
  try {
    const { storage } = await import('../../firebase/storage');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `companies/${companyId || 'cryodeal'}/purchases/${Date.now()}_${safeName}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  } catch (err) {
    // If Firebase storage rules/bucket fail, seamlessly fall back to local Data URL
    console.warn("Storage upload fallback to Data URL:", err);
  }

  if (!fileUrl) {
    if (isImageFile(file.type, file.name)) {
      fileUrl = await compressImageToDataUrl(file);
    } else {
      fileUrl = await readFileAsDataUrl(file);
    }
  }

  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    url: fileUrl,
    uploadedAt
  };
}

/**
 * Triggers browser download for any attachment
 */
export function downloadAttachment(att: PurchaseAttachment): void {
  const link = document.createElement('a');
  link.href = att.url;
  link.download = att.name || 'document';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
