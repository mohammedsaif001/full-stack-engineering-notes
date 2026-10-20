import type { AnswerWithQuestion, Question, UserProfile } from "@/lib/api";
import { apiRequest, queryKeys } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

// API response types
export interface UserProfileApiResponse {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: Date;
  };
  profile: UserProfile | null;
  questions: Question[];
  answers: AnswerWithQuestion[];
}

export interface UserResponse {
  data: UserProfileApiResponse;
}

// Query functions
const getUser = async (id: string): Promise<UserResponse> =>
  apiRequest(`/api/users/${id}`);

// Query hooks
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
