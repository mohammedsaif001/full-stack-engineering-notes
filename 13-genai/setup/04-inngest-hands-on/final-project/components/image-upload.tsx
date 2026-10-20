"use client";

import { Button } from "@/components/ui/button";
import { useUploadImage } from "@/lib/mutations";
import { useImageUrls } from "@/lib/queries";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Component props type used only in this component
interface ImageUploadProps {
  maxImages?: number;
  onImagesChange: (imageUrls: string[]) => void;
  existingImages?: string[];
}

export function ImageUpload({
  maxImages = 4,
  onImagesChange,
  existingImages = [],
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = useUploadImage();

  // Use our centralized query hook to get all image URLs
  const imageQueries = useImageUrls(images);

  // Convert the array of query results to a key-value map
  const imageUrls = useMemo(() => {
    const urls: { [key: string]: string } = {};
    imageQueries.forEach((query, index) => {
      if (query.data && images[index]) {
        urls[images[index]] = query.data.url;
      }
    });
    return urls;
  }, [imageQueries, images]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map((file) =>
        uploadImageMutation.mutateAsync(file)
      );
      const uploadedUrls = await Promise.all(uploadPromises);

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onImagesChange(newImages);
      toast.success("Images uploaded successfully!");
    } catch {
      // Error is already handled by mutation's onError (shows toast)
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
          disabled={
            uploading ||
            uploadImageMutation.isPending ||
            images.length >= maxImages
          }
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={
            uploading ||
            uploadImageMutation.isPending ||
            images.length >= maxImages
          }
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images ({images.length}/{maxImages})
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Max {maxImages} images
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((imageKey, index) => {
            const imageUrl = imageUrls[imageKey];
            return (
              <div key={index} className="relative group">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`Upload ${index + 1}`}
                    width={200}
                    height={200}
                    className="rounded-lg object-cover w-full h-32"
                    onError={() => {
                      console.error("Image failed to load:", imageKey);
                    }}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
