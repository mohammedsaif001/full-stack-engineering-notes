import { useQuery } from "@tanstack/react-query";
import { queryKeys, apiRequest, type QuestionWithAuthor, type AnswerWithAuthor, type User } from "@/lib/api";

// API response types
export interface SearchResponse {
  data: {
    questions: QuestionWithAuthor[];
    answers: AnswerWithAuthor[];
    users: User[];
  };
}

// Query functions
const search = async (query: string): Promise<SearchResponse> =>
  apiRequest(`/api/search?q=${encodeURIComponent(query)}`);

// Query hooks
export const useSearch = (query: string) => {
  return useQuery({
    queryKey: queryKeys.questions.search(query),
    queryFn: () => search(query),
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};