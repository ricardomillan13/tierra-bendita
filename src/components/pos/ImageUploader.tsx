import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ImageUploaderProps {
  currentImage: string | null;
  onImageChange: (url: string | null) => void;
}

export function ImageUploader({ currentImage, onImageChange }: ImageUploaderProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading } = useImageUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      onImageChange(url);
    }
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onImageChange(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      {currentImage ? (
        <div className="relative">
          <div className="w-full h-32 rounded-lg overflow-hidden bg-secondary">
            <img
              src={currentImage}
              alt="Product preview"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-4">Sin imagen</p>
          
          <div className="flex gap-2 justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Subir archivo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              URL
            </Button>
          </div>
        </div>
      )}

      {showUrlInput && !currentImage && (
        <div className="flex gap-2">
          <Input
            placeholder="https://ejemplo.com/imagen.jpg"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
          />
          <Button type="button" onClick={handleUrlSubmit} disabled={!urlValue.trim()}>
            Añadir
          </Button>
        </div>
      )}

      {!currentImage && !showUrlInput && (
        <p className="text-xs text-muted-foreground text-center">
          Formatos: JPG, PNG, GIF • Máximo 5MB
        </p>
      )}
    </div>
  );
}
