"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { QuestionWithAuthor } from "@/lib/api";
import { useQuestions } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";

export default function QuestionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, error } = useQuestions(currentPage);

  if (isLoading) {
    return <div>Loading questions...</div>;
  }

  if (error) {
    return <div>Error loading questions</div>;
  }

  const questions: QuestionWithAuthor[] = data?.data?.questions || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            All Questions
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.data?.pagination?.total || 0} questions
          </p>
        </div>
        <Link href="/questions/ask" className="w-full md:w-auto">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full">
            Ask Question
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className="bg-card border border-border rounded p-6 hover:shadow-sm transition-shadow"
          >
            <Link href={`/questions/${question.id}`}>
              <h2 className="text-xl font-semibold mb-2 text-card-foreground hover:text-muted-foreground transition-colors">
                {question.title}
              </h2>
            </Link>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {question.body.substring(0, 200)}...
            </p>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {question.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="font-medium">{question.votes} votes</span>
                <span>{question.views} views</span>
                {question.aiAnswerGenerated && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs"
                  >
                    AI Answer
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">
                  asked {formatDistanceToNow(new Date(question.createdAt))} ago
                </span>
                <span className="font-medium text-foreground">
                  {question.author?.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No questions yet. Be the first to ask!
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* Page numbers */}
              {Array.from(
                { length: Math.min(pagination.totalPages, 5) },
                (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
              )}

              {/* Ellipsis for pages beyond 5 */}
              {pagination.totalPages > 5 &&
                currentPage < pagination.totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1)
                    )
                  }
                  className={
                    currentPage === pagination.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
