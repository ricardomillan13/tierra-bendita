import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'El archivo debe ser una imagen',
          variant: 'destructive',
        });
        return null;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'La imagen no debe superar 5MB',
          variant: 'destructive',
        });
        return null;
      }
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Error al subir imagen',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Error al subir la imagen',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const { error } = await supabase.storage
        .from('product-images')
        .remove([fileName]);
      
      if (error) {
        console.error('Delete error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
  };
}
