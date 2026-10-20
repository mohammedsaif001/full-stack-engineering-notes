"use client";

import { ProfileEditForm } from "@/components/profile-edit-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 w-full sm:w-auto justify-start sm:justify-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile information and public presence
        </p>
      </div>

      <div className="space-y-6">
        <ProfileEditForm />
      </div>
    </div>
  );
}
