/**
 * FileUploadService handles uploading files to Firebase Storage.
 * Currently uses a mock implementation returning fake URLs to avoid 
 * setting up complex storage rules during rapid development.
 */
export const fileUploadService = {
  upload: async (file: File, path: string): Promise<string> => {
    console.log(`[Mock] Uploading ${file.name} to ${path}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return a mock URL or a data URI for images so they render
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        } else {
          resolve(`https://mock-storage.com/${path}/${file.name}`);
        }
      }, 500);
    });
  },

  delete: async (fileUrl: string): Promise<void> => {
    console.log(`[Mock] Deleting file at ${fileUrl}`);
    return new Promise((resolve) => setTimeout(resolve, 300));
  },

  preview: (fileUrl: string): void => {
    if (fileUrl.startsWith('data:') || fileUrl.startsWith('http')) {
      window.open(fileUrl, '_blank');
    } else {
      console.log(`[Mock] Cannot preview non-URL format: ${fileUrl}`);
    }
  },

  download: (fileUrl: string, fileName: string): void => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
