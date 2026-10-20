"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { updateProfile } from "@/app/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export function ProfileEditForm() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await updateProfile({
        bio: formData.get("bio") as string,
        location: formData.get("location") as string,
        website: formData.get("website") as string,
        githubHandle: formData.get("githubHandle") as string,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message || "Profile updated successfully" });
        // Invalidate user profile cache to refresh data
        if (session?.user?.id) {
          queryClient.invalidateQueries({ queryKey: ["users", "detail", session.user.id] });
        }
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself..."
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Maximum 500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="San Francisco, CA"
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">
              Maximum 100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://yourwebsite.com"
            />
            <p className="text-sm text-muted-foreground">
              Include full URL (https://...)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubHandle">GitHub Username</Label>
            <Input
              id="githubHandle"
              name="githubHandle"
              placeholder="yourusername"
              maxLength={39}
            />
            <p className="text-sm text-muted-foreground">
              Just your GitHub username, not the full URL
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}