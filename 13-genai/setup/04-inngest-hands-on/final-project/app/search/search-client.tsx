"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type QuestionWithAuthor } from "@/lib/api";
import { useSearch } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Debounced search query
  const { data: searchResults, isLoading, error } = useSearch(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (query.trim().length < 2) {
      toast.error("Search query must be at least 2 characters");
      return;
    }

    setSearchQuery(query);
    router.push(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
  };

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-heading text-3xl font-bold mb-6 text-foreground">
        Search Questions
      </h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="text"
            placeholder="Search for questions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 w-full"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </Button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          Failed to search. Please try again.
        </div>
      )}

      {searchQuery && !isLoading && searchResults && (
        <p className="text-sm text-muted-foreground mb-4">
          Found {searchResults.data.questions.length} result
          {searchResults.data.questions.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="space-y-4">
        {searchResults?.data.questions.map((result: QuestionWithAuthor) => (
          <Link key={result.id} href={`/questions/${result.id}`}>
            <div className="bg-card border border-border rounded p-4 hover:shadow-sm transition-shadow">
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                {result.title}
              </h3>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {result.body.substring(0, 200)}...
              </p>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="font-medium">{result.votes} votes</span>
                <span>{result.views} views</span>
                <span>asked by {result.author.name}</span>
                <span>
                  {formatDistanceToNow(new Date(result.createdAt))} ago
                </span>
              </div>
            </div>
          </Link>
        ))}

        {searchQuery &&
          !isLoading &&
          searchResults &&
          searchResults.data.questions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try different keywords or ask a new question
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
