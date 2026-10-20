"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/client";
import { useVote } from "@/lib/mutations";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Component props type used only in this component
interface VoteButtonsProps {
  itemId: number;
  itemType: "question" | "answer";
  initialVotes: number;
  userVote?: "upvote" | "downvote" | null;
}

export function VoteButtons({
  itemId,
  itemType,
  initialVotes,
  userVote: initialUserVote,
}: VoteButtonsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState(initialUserVote);

  const voteMutation = useVote();

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    try {
      // Wait for API response which includes updated vote counts
      const response = (await voteMutation.mutateAsync({
        itemId: itemId.toString(), // Convert number to string for API
        itemType,
        voteType,
      })) as { votes: number; userVote: "upvote" | "downvote" | null };

      // Update local state with values from API response
      setVotes(response.votes);
      setUserVote(response.userVote);
    } catch {
      // Error is already handled by mutation's onError (shows toast)
      // No alert, no console.error - just let the toast handle it
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote("upvote")}
        disabled={voteMutation.isPending}
        className={userVote === "upvote" ? "text-primary" : ""}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>

      <span
        className={`font-semibold ${votes > 0 ? "text-green-600" : votes < 0 ? "text-red-600" : ""}`}
      >
        {votes}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote("downvote")}
        disabled={voteMutation.isPending}
        className={userVote === "downvote" ? "text-primary" : ""}
      >
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
