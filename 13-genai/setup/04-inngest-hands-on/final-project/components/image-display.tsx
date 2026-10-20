"use client";

import { ImageModal } from "@/components/image-modal";
import { useImageUrls } from "@/lib/queries";
import Image from "next/image";
import { useMemo, useState } from "react";

interface ImageDisplayProps {
  imageKeys: string[];
  className?: string;
}

export function ImageDisplay({ imageKeys, className = "" }: ImageDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // Use our centralized query hook to get all image URLs
  const imageQueries = useImageUrls(imageKeys);

  // Convert the array of query results to a key-value map
  const imageUrls = useMemo(() => {
    const urls: { [key: string]: string } = {};
    imageQueries.forEach((query, index) => {
      if (query.data && imageKeys[index]) {
        urls[imageKeys[index]] = query.data.url;
      }
    });
    return urls;
  }, [imageQueries, imageKeys]);

  const openModal = (imageKey: string, index: number) => {
    const imageUrl = imageUrls[imageKey];
    if (imageUrl) {
      setSelectedImage({
        url: imageUrl,
        alt: `Question image ${index + 1}`,
      });
    }
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  if (imageKeys.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 ${className}`}
      >
        {imageKeys.map((imageKey, index) => {
          const imageUrl = imageUrls[imageKey];
          return (
            <div key={index} className="relative group">
              {imageUrl ? (
                <div
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openModal(imageKey, index)}
                >
                  <Image
                    src={imageUrl}
                    alt={`Question image ${index + 1}`}
                    width={200}
                    height={200}
                    className="rounded-lg object-cover w-full h-32"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <svg
                        className="w-4 h-4 text-gray-800"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          onClose={closeModal}
          imageUrl={selectedImage.url}
          alt={selectedImage.alt}
        />
      )}
    </>
  );
}
