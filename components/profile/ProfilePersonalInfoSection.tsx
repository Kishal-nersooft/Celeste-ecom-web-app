"use client";

import React, { useState } from "react";
import { Camera, User, Phone, Mail, Languages } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProfilePageHeader,
  SectionBlock,
  SettingsRow,
  ProfileSectionSeparator,
} from "@/components/profile/profile-ui";

export interface PersonalInfoFormData {
  personalInfo: string;
  phoneNumber: string;
  email: string;
  language: string;
}

type EditField = null | "photo" | "name" | "phone" | "email" | "language";

interface ProfilePersonalInfoSectionProps {
  displayName: string;
  formData: PersonalInfoFormData;
  onFormChange: (field: keyof PersonalInfoFormData, value: string) => void;
  onSaveName: (name: string) => Promise<void>;
}

export default function ProfilePersonalInfoSection({
  displayName,
  formData,
  onFormChange,
  onSaveName,
}: ProfilePersonalInfoSectionProps) {
  const [activeField, setActiveField] = useState<EditField>(null);
  const [draftName, setDraftName] = useState(formData.personalInfo);
  const [draftLanguage, setDraftLanguage] = useState(formData.language);
  const [saving, setSaving] = useState(false);

  const openField = (field: EditField) => {
    if (field === "name") setDraftName(formData.personalInfo);
    if (field === "language") setDraftLanguage(formData.language);
    setActiveField(field);
  };

  const showComingSoon = (label: string) => {
    toast(`${label} will be available soon.`, { icon: "ℹ️" });
    setActiveField(null);
  };

  const handleSaveName = async () => {
    if (!draftName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await onSaveName(draftName.trim());
      onFormChange("personalInfo", draftName.trim());
      setActiveField(null);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLanguage = () => {
    onFormChange("language", draftLanguage);
    toast.success("Language preference saved");
    setActiveField(null);
  };

  return (
    <div className="max-w-2xl">
      <ProfilePageHeader
        title="Personal info"
        description="Manage your profile details and how you appear on Celeste."
      />

      <SectionBlock title="Profile" description="Your photo and display name on Celeste.">
        <div className="flex items-center gap-4 py-4 border-b border-gray-100">
          <div className="relative shrink-0">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <Camera className="w-7 h-7 text-gray-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500 truncate">{formData.email || "No email"}</p>
          </div>
        </div>
        <SettingsRow
          icon={Camera}
          title="Profile photo"
          description="Add or change your profile picture."
          actionLabel="Add photo"
          onClick={() => openField("photo")}
        />
      </SectionBlock>

      <ProfileSectionSeparator />

      <SectionBlock
        title="Account details"
        description="Information used for orders, delivery, and account recovery."
      >
        <SettingsRow
          icon={User}
          title="Name"
          actionLabel={formData.personalInfo}
          onClick={() => openField("name")}
        />
        <SettingsRow
          icon={Phone}
          title="Phone number"
          description="Used to sign in and for delivery updates."
          actionLabel={formData.phoneNumber}
          onClick={() => openField("phone")}
        />
        <SettingsRow
          icon={Mail}
          title="Email"
          description="Receipts and account notifications."
          actionLabel={formData.email || "Add email"}
          onClick={() => openField("email")}
        />
        <SettingsRow
          icon={Languages}
          title="Language"
          description="Preferred language for the app."
          actionLabel={formData.language}
          onClick={() => openField("language")}
        />
      </SectionBlock>

      <Dialog open={activeField === "photo"} onOpenChange={() => setActiveField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
            <DialogDescription>
              Upload a profile photo so couriers and support can recognize your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveField(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Profile photo")}>
              Upload photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeField === "name"} onOpenChange={() => setActiveField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name</DialogTitle>
            <DialogDescription>This name appears on your orders and account.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveField(null)}>
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={() => void handleSaveName()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeField === "phone"} onOpenChange={() => setActiveField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Phone number</DialogTitle>
            <DialogDescription>
              Your number is linked to sign-in. Changing it will be available in a future update.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600 font-medium">{formData.phoneNumber}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveField(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Phone number change")}>
              Change number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeField === "email"} onOpenChange={() => setActiveField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email</DialogTitle>
            <DialogDescription>Add or update the email address for your Celeste account.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">{formData.email || "No email on file"}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveField(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Email update")}>
              {formData.email ? "Update email" : "Add email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeField === "language"} onOpenChange={() => setActiveField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Language</DialogTitle>
            <DialogDescription>Choose your preferred language for Celeste.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="profile-language">Language</Label>
            <select
              id="profile-language"
              value={draftLanguage}
              onChange={(e) => setDraftLanguage(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="English">English</option>
              <option value="Sinhala">Sinhala</option>
              <option value="Tamil">Tamil</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveField(null)}>
              Cancel
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={handleSaveLanguage}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
