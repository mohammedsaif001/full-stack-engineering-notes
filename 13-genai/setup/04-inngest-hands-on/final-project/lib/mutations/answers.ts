import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface CreateAnswerData {
  questionId: string;
  content: string;
}

interface AcceptAnswerData {
  answerId: number;
  questionId: string;
}

interface DeleteAnswerData {
  answerId: number;
  questionId: string;
}

interface AcceptAnswerResponse {
  success: boolean;
  message: string;
  accepted: boolean;
}

export const useCreateAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, content }: CreateAnswerData) => {
      return apiRequest(`/api/answers`, {
        method: "POST",
        body: JSON.stringify({
          questionId,
          content,
        }),
      });
    },
    onSuccess: (_, { questionId }) => {
      // Invalidate the specific question to refresh answers
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(questionId) });
      toast.success("Answer submitted successfully!");
    },
    onError: (error) => {
      console.error("Failed to create answer:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit answer";
      toast.error(errorMessage);
    },
  });
};

export const useAcceptAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation<AcceptAnswerResponse, Error, AcceptAnswerData>({
    mutationFn: async ({ answerId }: AcceptAnswerData) => {
      return apiRequest(`/api/answers/${answerId}/accept`, {
        method: "POST",
      });
    },
    onSuccess: (data, { questionId }) => {
      // Invalidate the specific question to refresh answers and acceptance status
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(questionId) });

      // Show different message based on accepted state from response
      if (data.accepted) {
        toast.success("Answer accepted!");
      } else {
        toast.success("Answer unaccepted");
      }
    },
    onError: (error) => {
      console.error("Failed to accept answer:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to accept answer";
      toast.error(errorMessage);
    },
  });
};

export const useDeleteAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answerId }: DeleteAnswerData) => {
      return apiRequest(`/api/answers/${answerId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, { questionId }) => {
      // Invalidate the specific question to refresh the answer list
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(questionId) });
      toast.success("Answer deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete answer:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete answer";
      toast.error(errorMessage);
    },
  });
};