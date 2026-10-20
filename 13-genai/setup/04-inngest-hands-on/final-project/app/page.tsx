import { Button } from "@/components/ui/button";
import { Bot, Tags, Users } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16 md:py-20">
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-foreground leading-tight">
          Get Instant AI-Powered Answers
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Ask any coding question and receive instant AI-generated answers
          powered by GPT-5, plus insights from the community
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/questions/ask">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto"
            >
              Ask a Question
            </Button>
          </Link>
          <Link href="/questions">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Browse Questions
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 mt-16">
        <div className="bg-card p-6 rounded shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Instant AI Answers
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Every question gets an AI-generated answer within seconds using
            GPT-5
          </p>
        </div>

        <div className="bg-card p-6 rounded shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Tags className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Auto-Tagging
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Questions are automatically tagged and categorized by AI
          </p>
        </div>

        <div className="bg-card p-6 rounded shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Community Answers
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get additional insights from experienced developers
          </p>
        </div>
      </div>
    </div>
  );
}
