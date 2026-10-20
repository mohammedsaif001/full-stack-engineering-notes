import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface VoteData {
  itemId: string;
  itemType: "question" | "answer";
  voteType: "upvote" | "downvote";
}

export const useVote = () => {
  const { data: session } = useSession();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ itemId, itemType, voteType }: VoteData) => {
      if (!session?.user) {
        router.push("/auth/signin");
        throw new Error("Authentication required");
      }

      const endpoint =
        itemType === "question"
          ? `/api/questions/${itemId}/vote`
          : `/api/answers/${itemId}/vote`;

      return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          userId: session.user.id,
          voteType,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Vote recorded!");
    },
    onError: (error) => {
      console.error("Failed to vote:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to vote";
      toast.error(errorMessage);
    },
  });
};