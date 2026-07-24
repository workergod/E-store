import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, X, User } from 'lucide-react';
import { AppButton } from '../app/AppButton';

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(blob);
    }, 'image/jpeg');
  });
}

export function ProfilePictureUploader({ value, onChange }: { value?: string, onChange: (url: string) => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const showCroppedImage = useCallback(async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImageBase64) {
        onChange(croppedImageBase64); // Pass back the cropped image as base64 string
        setImageSrc(null); // Close cropper
      }
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels, onChange]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-md bg-muted flex items-center justify-center relative z-10">
          {value ? (
            <img src={value} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground opacity-50" />
          )}
        </div>
        <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors z-20 hover:scale-105 active:scale-95">
          <Camera className="h-4 w-4" />
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      <span className="text-xs text-muted-foreground text-center">Click camera icon to<br/>upload profile picture</span>

      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card p-6 rounded-xl shadow-premium w-full max-w-md flex flex-col gap-4 border border-border relative">
            <h3 className="font-semibold text-lg">Crop Profile Picture</h3>
            <button onClick={() => setImageSrc(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            <div className="flex gap-2 justify-end mt-2">
              <AppButton variant="outline" onClick={() => setImageSrc(null)}>Cancel</AppButton>
              <AppButton onClick={showCroppedImage}>Apply Crop</AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
