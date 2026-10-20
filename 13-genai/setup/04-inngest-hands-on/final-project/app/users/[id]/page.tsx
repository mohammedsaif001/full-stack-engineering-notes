"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();

  const { data, isLoading, error } = useUser(userId);

  if (isLoading) {
    return <div className="max-w-5xl mx-auto">Loading profile...</div>;
  }

  if (error || !data?.data) {
    return <div className="max-w-5xl mx-auto">Error loading profile</div>;
  }

  const { user, profile, questions, answers } = data.data;

  return (
    <div className="max-w-5xl mx-auto">
      {/* User Header */}
      <div className="bg-card p-6 sm:p-8 mb-8 rounded shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 flex-1">
            <div className="flex justify-center sm:justify-start">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || "User avatar"}
                />
                <AvatarFallback className="text-2xl bg-muted text-foreground">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-outfit text-3xl font-bold mb-2 text-card-foreground">
                {user.name || "Unknown User"}
              </h1>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {profile?.reputation || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Reputation</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {profile?.questionsCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {profile?.answersCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Answers</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-card-foreground">
                    {user.createdAt
                      ? `${formatDistanceToNow(new Date(user.createdAt))} ago`
                      : "Unknown"}
                  </div>
                  <div className="text-sm text-muted-foreground">Member for</div>
                </div>
              </div>

              {profile && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {profile.location && (
                    <span className="text-muted-foreground">
                      📍 {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline hover:no-underline"
                    >
                      🔗 {profile.website}
                    </a>
                  )}
                  {profile.githubHandle && (
                    <a
                      href={`https://github.com/${profile.githubHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline hover:no-underline"
                    >
                      🐙 {profile.githubHandle}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          {session?.user?.id === userId && (
            <div className="flex justify-end lg:justify-start">
              <Button variant="outline" asChild>
                <Link href="/settings/profile">Edit Profile</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* User Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card p-6 border border-border rounded">
          <h2 className="font-heading text-xl font-bold mb-4 text-card-foreground">
            Questions
          </h2>
          <div className="text-3xl font-bold text-card-foreground mb-2">
            {profile?.questionsCount || 0}
          </div>
          <p className="text-sm text-muted-foreground">Total questions asked</p>
        </div>

        <div className="bg-card p-6 border border-border rounded">
          <h2 className="font-heading text-xl font-bold mb-4 text-card-foreground">
            Answers
          </h2>
          <div className="text-3xl font-bold text-card-foreground mb-2">
            {profile?.answersCount || 0}
          </div>
          <p className="text-sm text-muted-foreground">Total answers provided</p>
        </div>
      </div>

      {/* User's Recent Questions */}
      {questions && questions.length > 0 && (
        <div className="bg-card p-6 border border-border rounded mb-6 mt-6">
          <h2 className="font-heading text-xl font-bold mb-4 text-card-foreground">
            Recent Questions
          </h2>
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                className="pb-4 border-b border-border last:border-b-0"
              >
                <Link href={`/questions/${question.id}`}>
                  <h3 className="font-medium text-card-foreground mb-2 hover:text-primary cursor-pointer">
                    {question.title}
                  </h3>
                </Link>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{question.votes || 0} votes</span>
                  <span>{question.views || 0} views</span>
                  <span>
                    {formatDistanceToNow(new Date(question.createdAt))} ago
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's Recent Answers */}
      {answers && answers.length > 0 && (
        <div className="bg-card p-6 border border-border rounded mt-6">
          <h2 className="font-heading text-xl font-bold mb-4 text-card-foreground">
            Recent Answers
          </h2>
          <div className="space-y-4">
            {answers.map((answer) => (
              <div
                key={answer.id}
                className="pb-4 border-b border-border last:border-b-0"
              >
                <div className="text-sm text-muted-foreground mb-2">
                  Answered on:{" "}
                  {answer.question?.id && (
                    <Link
                      href={`/questions/${answer.question.id}`}
                      className="font-medium text-card-foreground hover:text-primary underline"
                    >
                      {answer.question.title}
                    </Link>
                  )}
                  {!answer.question?.id && (
                    <span className="font-medium text-card-foreground">
                      {answer.question?.title}
                    </span>
                  )}
                </div>
                <div className="text-card-foreground mb-2 line-clamp-3">
                  {answer.content}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{answer.votes || 0} votes</span>
                  <span>
                    {formatDistanceToNow(new Date(answer.createdAt))} ago
                  </span>
                  {answer.isAccepted && (
                    <span className="text-green-600 font-medium">✓ Accepted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
