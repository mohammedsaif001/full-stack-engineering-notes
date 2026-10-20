"use client";

import { ImageDisplay } from "@/components/image-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { VoteButtons } from "@/components/vote-buttons";
import { useSession } from "@/lib/auth/client";
import { useCreateAnswer, useAcceptAnswer, useDeleteAnswer } from "@/lib/mutations";
import { useQuestion } from "@/lib/queries";
import { submitAnswerSchema } from "@/lib/validations/question";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form type used only in this component
interface SubmitAnswerFormData {
  content: string;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [answerToDelete, setAnswerToDelete] = useState<number | null>(null);

  const { data: session } = useSession();
  const { data, isLoading, error } = useQuestion(questionId);
  const createAnswerMutation = useCreateAnswer();
  const acceptAnswerMutation = useAcceptAnswer();
  const deleteAnswerMutation = useDeleteAnswer();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SubmitAnswerFormData>({
    resolver: zodResolver(submitAnswerSchema),
    defaultValues: {
      content: "",
    },
  });

  const onSubmitAnswer = async (formData: SubmitAnswerFormData) => {
    try {
      await createAnswerMutation.mutateAsync({
        questionId,
        content: formData.content,
      });

      // Reset form on successful submission
      reset();
    } catch {
      // Error is already handled by mutation's onError (shows toast)
    }
  };

  const handleAcceptAnswer = async (answerId: number) => {
    try {
      await acceptAnswerMutation.mutateAsync({
        answerId,
        questionId,
      });
    } catch (err: unknown) {
      console.error("Failed to accept answer:", err);
    }
  };

  const handleDeleteAnswerClick = (answerId: number) => {
    setAnswerToDelete(answerId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAnswerConfirm = async () => {
    if (answerToDelete === null) return;

    try {
      await deleteAnswerMutation.mutateAsync({
        answerId: answerToDelete,
        questionId,
      });
      setDeleteDialogOpen(false);
      setAnswerToDelete(null);
    } catch (err: unknown) {
      console.error("Failed to delete answer:", err);
    }
  };

  if (isLoading) {
    return <div>Loading question...</div>;
  }

  if (error) {
    return <div>Error loading question</div>;
  }

  const question = data?.data;

  if (!question) {
    return <div>Question not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Question */}
      <div className="bg-card border border-border rounded p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-6 md:flex-row md:gap-6">
          <div className="flex justify-center md:block md:pt-1">
            <VoteButtons
              itemId={question.id}
              itemType="question"
              initialVotes={question.votes}
            />
          </div>

          <div className="flex-1">
            <h1 className="font-heading text-3xl font-bold mb-4 text-card-foreground">
              {question.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
              <span>
                Asked {formatDistanceToNow(new Date(question.createdAt))} ago
              </span>
              <span>{question.views} views</span>
            </div>

            <div className="prose prose-brand max-w-none mb-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code(props: React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
                    const { className, children, inline } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-4"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono"
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {question.body}
              </ReactMarkdown>
            </div>

            {/* Display question images */}
            <ImageDisplay imageKeys={question.images} />

            <div className="flex items-center gap-2">
              {question.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Asked by</span>
                <span className="font-medium text-foreground">
                  {question.author.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold mb-4 text-card-foreground">
          {question.answers?.length || 0} Answer
          {(question.answers?.length || 0) !== 1 ? "s" : ""}
        </h2>

        <div className="space-y-4">
          {question.answers?.map((answer) => {
            const isQuestionAuthor = session?.user?.id === question.author.id;
            const isAnswerAuthor = answer.author?.id === session?.user?.id;
            const canAccept =
              isQuestionAuthor && !isAnswerAuthor && !answer.isAiGenerated;

            return (
              <div
                key={answer.id}
                className={`bg-card border rounded p-4 sm:p-6 ${
                  answer.isAccepted
                    ? "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                    : "border-border"
                }`}
              >
                <div className="flex flex-col gap-6 md:flex-row md:gap-6">
                  <div className="flex flex-col items-center gap-2 md:pt-1">
                    <VoteButtons
                      itemId={answer.id}
                      itemType="answer"
                      initialVotes={answer.votes}
                    />
                    {canAccept && (
                      <Button
                        variant={answer.isAccepted ? "default" : "ghost"}
                        size="icon"
                        onClick={() => handleAcceptAnswer(answer.id)}
                        disabled={acceptAnswerMutation.isPending}
                        className={`w-10 h-10 rounded-full ${
                          answer.isAccepted
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600"
                        }`}
                        title={
                          answer.isAccepted ? "Unaccept answer" : "Accept answer"
                        }
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    {answer.isAccepted && (
                      <div className="mb-4">
                        <Badge
                          variant="outline"
                          className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                        >
                          ✓ Accepted Answer
                        </Badge>
                      </div>
                    )}
                    {answer.isAiGenerated && (
                      <div className="mb-4">
                        <Badge
                          variant="outline"
                          className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                        >
                          AI-Generated Answer
                        </Badge>
                      </div>
                    )}

                    <div className="prose prose-brand max-w-none mb-4 sm:pr-6">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          code(props: React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
                            const { className, children, inline } = props;
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md my-4"
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono"
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {answer.content}
                      </ReactMarkdown>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Answered{" "}
                          {formatDistanceToNow(new Date(answer.createdAt))} ago
                        </span>
                        {answer.author && (
                          <span className="text-sm font-medium text-foreground">
                            {answer.author.name}
                          </span>
                        )}
                      </div>
                      {isAnswerAuthor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAnswerClick(answer.id)}
                          disabled={deleteAnswerMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 self-start sm:self-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Answer Form */}
      <div className="bg-card border border-border rounded p-6">
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">
          Your Answer
        </h3>

        <form onSubmit={handleSubmit(onSubmitAnswer)}>
          <div className="mb-4">
            <Label htmlFor="content">
              Answer<span className="text-red-500 ml-1">*</span>
            </Label>
            <MarkdownEditor
              value={watch("content") || ""}
              onChange={(value) => setValue("content", value)}
              placeholder="Write your answer here... You can use markdown formatting like **bold**, *italic*, `code`, and more"
              minHeight="200px"
              className="mt-2"
            />
            {errors.content && (
              <p className="text-sm text-red-500 mt-1">
                {errors.content.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || createAnswerMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isSubmitting || createAnswerMutation.isPending
              ? "Submitting..."
              : "Submit Answer"}
          </Button>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Answer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this answer? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAnswerConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
