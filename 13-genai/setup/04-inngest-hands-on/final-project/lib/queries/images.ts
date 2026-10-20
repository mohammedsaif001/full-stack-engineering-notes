import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest, queryKeys } from "@/lib/api";

// Image display types (GET operations)
export interface ImageUrlRequest {
  key: string;
}

export interface ImageUrlResponse {
  url: string;
}

// Query function
const getImageUrl = async ({ key }: ImageUrlRequest): Promise<ImageUrlResponse> =>
  apiRequest("/api/upload/image-url", {
    method: "POST",
    body: JSON.stringify({ key }),
  });

export const useImageUrl = (key: string) => {
  return useQuery({
    queryKey: queryKeys.images.url(key),
    queryFn: () => getImageUrl({ key }),
    enabled: !!key,
    staleTime: 1000 * 60 * 60, // 1 hour - image URLs don't change frequently
  });
};

export const useImageUrls = (keys: string[]) => {
  return useQueries({
    queries: keys.map((key) => ({
      queryKey: queryKeys.images.url(key),
      queryFn: () => getImageUrl({ key }),
      enabled: !!key,
      staleTime: 1000 * 60 * 60, // 1 hour
    })),
  });
};