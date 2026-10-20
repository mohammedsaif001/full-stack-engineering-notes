"use client";

import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { useCreateQuestion } from "@/lib/mutations";
import { askQuestionSchema } from "@/lib/validations/question";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

// Form type used only in this component
interface AskQuestionFormData {
  title: string;
  body: string;
  images: string[];
}

export default function AskQuestionPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const createQuestionMutation = useCreateQuestion();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AskQuestionFormData>({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: {
      title: "",
      body: "",
      images: [],
    },
  });

  const onSubmit = async (formData: AskQuestionFormData) => {
    try {
      await createQuestionMutation.mutateAsync(formData);
      // Navigation and toast notification handled by mutation
    } catch {
      // Error already handled by mutation's onError (shows toast)
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-bold mb-2 text-foreground">
        Ask a Public Question
      </h1>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">
        Get instant AI-powered answers and community insights
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="title">
            Title<span className="text-red-500 ml-1">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Be specific and imagine you're asking a question to another person
          </p>
          <Input
            id="title"
            placeholder="e.g., How do I use useState in React?"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="body">
            Body<span className="text-red-500 ml-1">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Include all the information someone would need to answer your
            question
          </p>
          <MarkdownEditor
            value={watch("body") || ""}
            onChange={(value) => setValue("body", value)}
            placeholder="Describe your problem in detail... You can use markdown formatting like **bold**, *italic*, `code`, and more"
            minHeight="300px"
          />
          {errors.body && (
            <p className="text-sm text-red-500 mt-1">{errors.body.message}</p>
          )}
        </div>

        <div>
          <Label>Images (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Add up to 4 images to help illustrate your question
          </p>
          <ImageUpload
            maxImages={4}
            onImagesChange={(newImages) => {
              setImages(newImages);
              setValue("images", newImages);
            }}
            existingImages={images}
          />
        </div>

        <div className="bg-card p-4 sm:p-6 border border-border rounded">
          <h3 className="font-semibold mb-2 text-card-foreground">
            What happens next?
          </h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Your question will be posted immediately</li>
            <li>• AI will automatically generate tags</li>
            <li>• You'll receive an AI-generated answer within 30 seconds</li>
            <li>• Community members can also provide additional answers</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            disabled={isSubmitting || createQuestionMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto"
          >
            {isSubmitting || createQuestionMutation.isPending
              ? "Submitting..."
              : "Submit Question"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
