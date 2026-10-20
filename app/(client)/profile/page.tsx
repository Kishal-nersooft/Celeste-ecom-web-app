"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ChevronRight, Lock, ShieldCheck, User } from "lucide-react";
import ProfileSecuritySection from "@/components/profile/ProfileSecuritySection";
import ProfilePersonalInfoSection from "@/components/profile/ProfilePersonalInfoSection";
import ProfilePrivacySection from "@/components/profile/ProfilePrivacySection";
import {
  ProfileAccountLayout,
  ProfileAvatar,
  PROFILE_MENU_ITEMS,
  type ProfileSectionKey,
} from "@/components/profile/profile-ui";
import { ProfileSectionSkeleton } from "@/components/profile/profile-skeletons";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import toast from "react-hot-toast";
import { getCurrentUser, updateUserProfile } from "@/lib/api";

function readProfilePhone(profile: unknown, firebasePhone?: string | null): string {
  if (firebasePhone?.trim()) return firebasePhone.trim();
  if (!profile || typeof profile !== "object") return "";
  const record = profile as Record<string, unknown>;
  for (const key of ["phone_number", "phone", "phoneNumber", "mobile"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_delivery: boolean;
}

const PROFILE_SECTIONS = PROFILE_MENU_ITEMS.map((item) => item.key);
type ProfileSection = ProfileSectionKey;

const MOBILE_MENU_ICONS = {
  profile: User,
  security: ShieldCheck,
  privacy: Lock,
} as const;

const ProfilePage = () => {
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    personalInfo: "",
    phoneNumber: "",
    language: "English"
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/profile"));
    }
  }, [isGuest, router]);

  const navigateToSection = (section: ProfileSection | null) => {
    const next = section ? `/profile?section=${encodeURIComponent(section)}` : "/profile";
    if (section) router.push(next);
    else router.replace(next);
  };

  const leaveProfile = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const sectionParam = searchParams.get("section");
  const activeSection: ProfileSection | null = PROFILE_SECTIONS.includes(sectionParam as ProfileSection)
    ? (sectionParam as ProfileSection)
    : null;

  // Load user profile from backend
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        
        
        setLoadingProfile(true);
        try {
          const profileData = await getCurrentUser(true);
          setUserProfile(profileData);
          
          setPhotoUrl((current) => current || user.photoURL || null);
          setFormData((prev) => ({
            personalInfo: profileData.name || user.displayName || user.email?.split('@')[0] || 'User',
            phoneNumber: readProfilePhone(profileData, user.phoneNumber) || prev.phoneNumber,
            language: prev.language || "English"
          }));
        } catch (error) {
          console.error('Error loading user profile:', error);
          
          // Fallback to Firebase user data
          setPhotoUrl((current) => current || user.photoURL || null);
          setFormData((prev) => ({
            personalInfo: user.displayName || user.email?.split('@')[0] || 'User',
            phoneNumber: readProfilePhone(null, user.phoneNumber) || prev.phoneNumber,
            language: prev.language || "English"
          }));
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  if (unresolved) {
    return <AuthRetryScreen />;
  }

  if (loading || loadingProfile) {
    return <ProfileSectionSkeleton section={activeSection} />;
  }

  if (!user) {
    return null; // Or a message indicating no access
  }

  // Extract first name from email or display name
  const displayName =
    userProfile?.name ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "User";

  const handleSaveName = async (name: string) => {
    await updateUserProfile({
      name,
      is_delivery: userProfile?.is_delivery ?? true,
    });
    toast.success("Profile updated successfully!");
    const updatedProfile = await getCurrentUser(true);
    setUserProfile(updatedProfile);
    setFormData((prev) => ({ ...prev, personalInfo: name }));
  };

  if (activeSection) {
    return (
      <>
        <ProfileAccountLayout
          activeSection={activeSection}
          onNavigate={(section) => navigateToSection(section)}
          onBack={() => navigateToSection(null)}
        >
          {activeSection === "security" && (
            <ProfileSecuritySection user={user} recoveryPhone={formData.phoneNumber} />
          )}
          {activeSection === "profile" && (
            <ProfilePersonalInfoSection
              displayName={formData.personalInfo || displayName}
              phoneNumber={formData.phoneNumber}
              language={formData.language}
              photoUrl={photoUrl}
              onSaveName={handleSaveName}
              onSavePhone={(phone) =>
                setFormData((prev) => ({ ...prev, phoneNumber: phone }))
              }
              onSaveLanguage={(language) =>
                setFormData((prev) => ({ ...prev, language }))
              }
              onSavePhoto={setPhotoUrl}
            />
          )}
          {activeSection === "privacy" && <ProfilePrivacySection />}
        </ProfileAccountLayout>
      </>
    );
  }

  // Default profile overview
  return (
    <>
    <Container className="py-6 lg:py-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={leaveProfile}
          aria-label="Go back"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </button>
        <h1 className="text-left text-[22px] font-semibold tracking-tight text-neutral-950">
          Celeste Profile
        </h1>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <ProfileAvatar src={photoUrl} alt="" />
        <p className="mt-4 text-center text-xl font-semibold tracking-tight text-neutral-950">
          {formData.personalInfo || displayName}
        </p>
        <p className="mt-1 text-center text-sm text-neutral-500">
          {formData.phoneNumber || "No phone number"}
        </p>
      </div>

      <nav className="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {PROFILE_MENU_ITEMS.map((item) => {
          const Icon = MOBILE_MENU_ICONS[item.key];
          return (
            <button
              key={item.key}
              type="button"
              className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3.5 text-left last:border-b-0 hover:bg-neutral-50 active:bg-neutral-100"
              onClick={() => navigateToSection(item.key)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-medium text-neutral-950">{item.label}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
            </button>
          );
        })}
      </nav>
    </Container>
    </>
  );
};

export default ProfilePage;
