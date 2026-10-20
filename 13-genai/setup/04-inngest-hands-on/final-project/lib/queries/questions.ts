import {
  apiRequest,
  queryKeys,
  type AnswerWithAuthor,
  type QuestionWithAuthor,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

// API response types
export interface QuestionsResponse {
  data: {
    questions: QuestionWithAuthor[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface QuestionResponse {
  data: QuestionWithAuthor & {
    answers?: AnswerWithAuthor[];
  };
}

// Query functions
const getQuestions = async (
  page: number = 1,
  limit: number = 20
): Promise<QuestionsResponse> =>
  apiRequest(`/api/questions?page=${page}&limit=${limit}`);

const getQuestion = async (id: string): Promise<QuestionResponse> =>
  apiRequest(`/api/questions/${id}`);

// Query hooks
export const useQuestions = (page: number = 1) => {
  return useQuery({
    queryKey: queryKeys.questions.list({ page, limit: 20 }),
    queryFn: () => getQuestions(page),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useQuestion = (id: string) => {
  return useQuery({
    queryKey: queryKeys.questions.detail(id),
    queryFn: () => getQuestion(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
