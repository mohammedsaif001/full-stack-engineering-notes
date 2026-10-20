import { apiRequest } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// Image upload types (POST/PUT operations)
export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  key: string;
}

export interface S3UploadRequest {
  presignedUrl: string;
  file: File;
}

// Mutation functions
const getPresignedUrl = async (
  data: PresignedUrlRequest
): Promise<PresignedUrlResponse> =>
  apiRequest("/api/upload/presigned-url", {
    method: "POST",
    body: JSON.stringify(data),
  });

const uploadToS3 = async ({
  presignedUrl,
  file,
}: S3UploadRequest): Promise<void> => {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to S3");
  }
};

export const useUploadImage = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      // Get presigned URL from our API
      const result = await getPresignedUrl({
        fileName: file.name,
        fileType: file.type,
      });

      const { presignedUrl, key } = result;

      // Upload file to S3 using the presigned URL
      await uploadToS3({ presignedUrl, file });

      return key;
    },
    onError: (error) => {
      console.error("Failed to upload image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(errorMessage);
    },
  });
};
