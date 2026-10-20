"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Edit, Eye } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content...",
  className,
  minHeight = "300px",
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className={cn(
        "border border-border rounded-md overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-muted px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(false)}
            className={cn(
              "h-7 px-2 text-xs",
              !showPreview && "bg-background hover:bg-background"
            )}
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(true)}
            className={cn(
              "h-7 px-2 text-xs",
              showPreview && "bg-background hover:bg-background"
            )}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Markdown supported</div>
      </div>

      {/* Content */}
      <div className="flex" style={{ minHeight }}>
        {!showPreview ? (
          /* Editor */
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 p-3 border-0 resize-none focus:outline-none bg-background text-foreground font-mono text-sm"
            style={{ minHeight }}
          />
        ) : (
          /* Preview */
          <div className="flex-1 p-4 bg-background overflow-auto">
            <div className="prose prose-brand max-w-none">
              {value ? (
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
                  {value}
                </ReactMarkdown>
              ) : (
                <div className="text-muted-foreground italic">
                  Nothing to preview. Start writing in the Edit tab.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
