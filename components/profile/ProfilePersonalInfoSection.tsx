"use client";

import React, { useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/profile/profile-ui";
import { cn } from "@/lib/utils";

const LANGUAGES = ["English", "Sinhala", "Tamil"] as const;

type EditField = "photo" | "name" | "phone" | "language";

interface ProfilePersonalInfoSectionProps {
  displayName: string;
  phoneNumber: string;
  language: string;
  photoUrl: string | null;
  onSaveName: (name: string) => Promise<void>;
  onSavePhone: (phone: string) => void;
  onSaveLanguage: (language: string) => void;
  onSavePhoto: (dataUrl: string) => void;
}

async function cropProfilePhoto(file: File): Promise<string> {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not edit this photo");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const draw = (source: CanvasImageSource, width: number, height: number) => {
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  };

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      draw(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } else {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read this photo"));
      };
      img.src = url;
    });
    draw(source, source.naturalWidth, source.naturalHeight);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

function EditActions({
  dirty,
  saving,
  onDiscard,
  onSave,
}: {
  dirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const locked = !dirty || Boolean(saving);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={locked}
        onClick={onDiscard}
        className="h-12 rounded-xl border-neutral-200 bg-white text-[15px] font-semibold text-neutral-900 shadow-none hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40"
      >
        Discard
      </Button>
      <Button
        type="button"
        disabled={locked}
        onClick={onSave}
        className="h-12 rounded-xl bg-neutral-950 text-[15px] font-semibold text-white shadow-none hover:bg-neutral-800 active:bg-neutral-900 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function InfoRow({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 py-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-neutral-500">{label}</span>
        <span
          className={cn(
            "mt-1 block truncate text-[16px]",
            value ? "font-medium text-neutral-950" : "text-neutral-400"
          )}
        >
          {value || placeholder}
        </span>
      </span>
      <Pencil className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
    </button>
  );
}

export default function ProfilePersonalInfoSection({
  displayName,
  phoneNumber,
  language,
  photoUrl,
  onSaveName,
  onSavePhone,
  onSaveLanguage,
  onSavePhoto,
}: ProfilePersonalInfoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<EditField | null>(null);
  const [draftName, setDraftName] = useState(displayName);
  const [draftPhone, setDraftPhone] = useState(phoneNumber);
  const [draftLanguage, setDraftLanguage] = useState(language);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);

  const openField = (field: EditField) => {
    if (field === "name") setDraftName(displayName);
    if (field === "phone") setDraftPhone(phoneNumber);
    if (field === "language") setDraftLanguage(language);
    if (field === "photo") setDraftPhoto(null);
    setActiveField(field);
  };

  const closeField = () => {
    if (saving) return;
    setActiveField(null);
    setDraftPhoto(null);
  };

  const nameDirty = draftName.trim() !== displayName.trim();
  const phoneDirty = draftPhone.trim() !== phoneNumber.trim();
  const languageDirty = draftLanguage !== language;
  const photoDirty = Boolean(draftPhoto);

  const handleSaveName = async () => {
    const next = draftName.trim();
    if (!next) {
      toast.error("Please enter your name");
      return;
    }
    setSaving(true);
    try {
      await onSaveName(next);
      setActiveField(null);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = () => {
    const next = draftPhone.trim();
    if (!next) {
      toast.error("Please enter your phone number");
      return;
    }
    onSavePhone(next);
    toast.success("Phone number updated");
    setActiveField(null);
  };

  const handleSaveLanguage = () => {
    onSaveLanguage(draftLanguage);
    toast.success("Language preference saved");
    setActiveField(null);
  };

  const handleSavePhoto = () => {
    if (!draftPhoto) return;
    onSavePhoto(draftPhoto);
    toast.success("Profile photo updated");
    setDraftPhoto(null);
    setActiveField(null);
  };

  const handlePhotoPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo to continue");
      return;
    }
    setReadingPhoto(true);
    try {
      const cropped = await cropProfilePhoto(file);
      setDraftPhoto(cropped);
    } catch {
      toast.error("Could not use that photo");
    } finally {
      setReadingPhoto(false);
    }
  };

  const titles: Record<EditField, string> = {
    photo: "Profile photo",
    name: "Name",
    phone: "Phone number",
    language: "Language",
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-8 hidden text-[22px] font-semibold tracking-tight text-neutral-950 lg:block">
        Personal info
      </h1>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => openField("photo")}
          aria-label="Edit profile photo"
          className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          <ProfileAvatar src={photoUrl} alt="" />
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-white ring-4 ring-white">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
        </button>
      </div>

      <div className="mt-8 divide-y divide-neutral-100 border-y border-neutral-100">
        <InfoRow
          label="Name"
          value={displayName}
          placeholder="Add your name"
          onClick={() => openField("name")}
        />
        <InfoRow
          label="Phone number"
          value={phoneNumber}
          placeholder="Add your phone number"
          onClick={() => openField("phone")}
        />
        <InfoRow
          label="Language"
          value={language}
          placeholder="Choose a language"
          onClick={() => openField("language")}
        />
      </div>

      <Dialog open={activeField !== null} onOpenChange={(open) => { if (!open) closeField(); }}>
        <DialogContent className="max-h-[min(85dvh,560px)] w-[calc(100%-2rem)] max-w-[400px] gap-5 overflow-y-auto rounded-2xl border-neutral-200 p-5 shadow-2xl sm:p-6">
          <div>
            {activeField && (
              <DialogHeader className="space-y-0 pr-8 text-left">
                <DialogTitle className="text-lg font-semibold tracking-tight text-neutral-950">
                  {titles[activeField]}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {activeField === "photo"
                    ? "Choose a profile photo. It is cropped to a circle."
                    : `Update your ${titles[activeField].toLowerCase()}.`}
                </DialogDescription>
              </DialogHeader>
            )}

            {activeField === "photo" && (
              <div className="mt-5">
                <div className="flex justify-center">
                  <ProfileAvatar src={draftPhoto || photoUrl} alt="" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => void handlePhotoPick(event)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={readingPhoto || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 h-12 w-full rounded-xl border-neutral-200 text-[15px] font-semibold shadow-none hover:bg-neutral-50"
                >
                  {readingPhoto ? "Preparing photo…" : "Choose photo"}
                </Button>
                <div className="mt-3">
                  <EditActions
                    dirty={photoDirty}
                    saving={saving}
                    onDiscard={closeField}
                    onSave={handleSavePhoto}
                  />
                </div>
              </div>
            )}

            {activeField === "name" && (
              <div className="mt-5">
                <input
                  id="profile-name"
                  aria-label="Name"
                  value={draftName}
                  autoComplete="name"
                  onChange={(event) => setDraftName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-base text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white"
                  placeholder="Your name"
                />
                <div className="mt-5">
                  <EditActions
                    dirty={nameDirty}
                    saving={saving}
                    onDiscard={closeField}
                    onSave={() => void handleSaveName()}
                  />
                </div>
              </div>
            )}

            {activeField === "phone" && (
              <div className="mt-5">
                <input
                  id="profile-phone"
                  aria-label="Phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={draftPhone}
                  onChange={(event) => setDraftPhone(event.target.value)}
                  className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-base text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:bg-white"
                  placeholder="Phone number"
                />
                <div className="mt-5">
                  <EditActions
                    dirty={phoneDirty}
                    saving={saving}
                    onDiscard={closeField}
                    onSave={handleSavePhone}
                  />
                </div>
              </div>
            )}

            {activeField === "language" && (
              <div className="mt-5">
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  {LANGUAGES.map((option) => {
                    const selected = draftLanguage === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDraftLanguage(option)}
                        className={cn(
                          "flex h-12 w-full items-center justify-between border-b border-neutral-100 px-4 text-left text-[15px] last:border-b-0",
                          selected ? "bg-neutral-50 font-semibold text-neutral-950" : "text-neutral-700"
                        )}
                      >
                        {option}
                        {selected && <Check className="h-4 w-4" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5">
                  <EditActions
                    dirty={languageDirty}
                    saving={saving}
                    onDiscard={closeField}
                    onSave={handleSaveLanguage}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
