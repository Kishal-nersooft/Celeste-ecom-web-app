"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Camera, ChevronRight, Lock, MapPin, ShieldCheck, User } from "lucide-react";
import AddressSelector from "@/components/AddressSelector";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import SavedAddressAddFlow from "@/components/saved-address/SavedAddressAddFlow";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import ProfileSecuritySection from "@/components/profile/ProfileSecuritySection";
import ProfilePersonalInfoSection from "@/components/profile/ProfilePersonalInfoSection";
import ProfilePrivacySection from "@/components/profile/ProfilePrivacySection";
import ProfileSavedLocationsSection from "@/components/profile/ProfileSavedLocationsSection";
import {
  ProfileAccountLayout,
  PROFILE_MENU_ITEMS,
  type ProfileSectionKey,
} from "@/components/profile/profile-ui";
import { ProfileSectionSkeleton } from "@/components/profile/profile-skeletons";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import toast from "react-hot-toast";
import { getCurrentUser, updateUserProfile, getUserAddresses, updateUserAddress, deleteUserAddress, setDefaultAddress } from "@/lib/api";
import {
  findSlotAddress,
  forgetAddressName,
  getNamedSavedAddresses,
  getOtherNamedAddresses,
  rememberAddressName,
} from "@/lib/named-addresses";

interface SavedAddress {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  name?: string;
  ondemand_delivery_available?: boolean;
}

const MAX_SAVED_ADDRESSES = 10;

function orderNamedLocations<T extends { id: number; name?: string }>(addresses: T[]): T[] {
  const named = getNamedSavedAddresses(addresses);
  const home = findSlotAddress(named, "home");
  const work = findSlotAddress(named, "work");
  return [
    ...(home ? [home] : []),
    ...(work ? [work] : []),
    ...getOtherNamedAddresses(named, home, work),
  ];
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_delivery: boolean;
  addresses?: SavedAddress[];
}

const PROFILE_SECTIONS = PROFILE_MENU_ITEMS.map((item) => item.key);
type ProfileSection = ProfileSectionKey;

const MOBILE_MENU_ICONS = {
  profile: User,
  security: ShieldCheck,
  privacy: Lock,
  "saved-locations": MapPin,
} as const;

const ProfilePage = () => {
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    personalInfo: "",
    phoneNumber: "",
    email: "",
    language: "English"
  });
  const [savedLocations, setSavedLocations] = useState<SavedAddress[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [addPreset, setAddPreset] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/profile"));
    }
  }, [isGuest, router]);

  const navigateToSection = (section: ProfileSection | null) => {
    const next = section ? `/profile?section=${encodeURIComponent(section)}` : "/profile";
    router.push(next);
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
          
          setFormData({
            personalInfo: profileData.name || user.displayName || user.email?.split('@')[0] || 'User',
            phoneNumber: user.phoneNumber || "+948153516",
            email: profileData.email || user.email || "ChamithW@gmail.com",
            language: "English"
          });
        } catch (error) {
          console.error('Error loading user profile:', error);
          
          // Fallback to Firebase user data
          setFormData({
            personalInfo: user.displayName || user.email?.split('@')[0] || 'User',
            phoneNumber: user.phoneNumber || "+948153516",
            email: user.email || "ChamithW@gmail.com",
            language: "English"
          });
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  const loadSavedLocations = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        setSavedLocations(
          orderNamedLocations(addresses as SavedAddress[]).map((addr) => ({
            ...addr,
            is_default: Boolean(addr.is_default),
          }))
        );
      } else {
        setSavedLocations([]);
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
      setSavedLocations([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadSavedLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
    setIsAddressSelectorOpen(true);
  };

  const handleUpdateAddress = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    if (!editingAddress) return;

    try {
      await updateUserAddress(editingAddress.id, {
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        name: addressData.name,
      });
      
      if (addressData.name) {
        rememberAddressName(editingAddress.id, addressData.name);
      }

      await loadSavedLocations();
      setEditingAddress(null);
      toast.success("Address updated successfully!");
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    try {
      await deleteUserAddress(id);
      forgetAddressName(id);

      await loadSavedLocations();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultLocation = async (id: number) => {
    const previous = savedLocations;
    setSavedLocations((current) =>
      current.map((location) => ({ ...location, is_default: location.id === id }))
    );
    try {
      await setDefaultAddress(id);
    } catch (error) {
      console.error('Error setting default address:', error);
      setSavedLocations(previous);
      toast.error('Failed to set default address');
      return;
    }

    try {
      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        setSavedLocations(
          orderNamedLocations(addresses as SavedAddress[]).map((addr) => ({
            ...addr,
            is_default: Boolean(addr.is_default),
          }))
        );
      }
    } catch (error) {
      console.error('Error refreshing addresses:', error);
    }
  };

  const handleAddressSelect = (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    if (editingAddress) {
      handleUpdateAddress(addressData);
    }
    setIsAddressSelectorOpen(false);
  };

  const openAddLocation = () => {
    if (savedLocations.length >= MAX_SAVED_ADDRESSES) {
      toast.error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses. Delete one to add another.`);
      return;
    }
    setEditingAddress(null);
    setAddPreset("");
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
              displayName={displayName}
              formData={formData}
              onFormChange={(field, value) => handleInputChange(field, value)}
              onSaveName={handleSaveName}
            />
          )}
          {activeSection === "privacy" && <ProfilePrivacySection />}
          {activeSection === "saved-locations" && (
            <ProfileSavedLocationsSection
              locations={savedLocations}
              loading={loadingAddresses}
              onAdd={openAddLocation}
              onEdit={(loc) => {
                const full = savedLocations.find((l) => l.id === loc.id);
                if (full) handleEditAddress(full);
              }}
              onDelete={handleDeleteLocation}
              onSetDefault={handleSetDefaultLocation}
            />
          )}
        </ProfileAccountLayout>

        <Dialog
          open={addPreset !== null}
          onOpenChange={(open) => {
            if (!open) setAddPreset(null);
          }}
        >
          <DialogContent
            mobileAsSheet
            sheetAutoHeight
            sheetResizable
            onDismiss={() => setAddPreset(null)}
            className="max-w-[95vw] p-0 sm:max-w-[600px]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogDescription className="sr-only">
              Search or choose an address to save.
            </DialogDescription>
            {addPreset !== null && (
              <GoogleMapsProvider>
                <SavedAddressAddFlow
                  onBack={() => setAddPreset(null)}
                  onSaved={(addresses) => {
                    setSavedLocations(
                      orderNamedLocations(addresses).map((addr) => ({
                        ...addr,
                        is_default: Boolean(addr.is_default),
                      }))
                    );
                    setAddPreset(null);
                  }}
                  existingAddresses={savedLocations}
                  presetName={addPreset}
                />
              </GoogleMapsProvider>
            )}
          </DialogContent>
        </Dialog>

        <AddressSelector
          isOpen={isAddressSelectorOpen}
          onClose={() => {
            setIsAddressSelectorOpen(false);
            setEditingAddress(null);
          }}
          onAddressSelect={handleAddressSelect}
          title="Edit Address"
          description="Update your address details"
          editingAddress={editingAddress}
        />
      </>
    );
  }

  // Default profile overview
  return (
    <>
    <Container className="py-5 lg:py-10">
      <div className="pb-6 lg:hidden">
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="h-14 w-14 object-cover" />
            ) : (
              <User className="h-6 w-6 text-gray-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-gray-900">{displayName}</h1>
            <p className="truncate text-sm text-gray-500">
              {formData.email || formData.phoneNumber || "Manage your account"}
            </p>
          </div>
        </div>

        <nav className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {PROFILE_MENU_ITEMS.map((item) => {
            const Icon = MOBILE_MENU_ICONS[item.key];
            return (
              <button
                key={item.key}
                type="button"
                className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-left last:border-b-0 active:bg-gray-50"
                onClick={() => navigateToSection(item.key)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-800">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-medium text-gray-900">{item.label}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto hidden min-h-screen max-w-md bg-white lg:block">
        <div className="flex flex-col items-center pt-8 pb-12">
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 shadow-sm">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-center text-xl font-bold text-black">{displayName}</h1>
        </div>

        <div className="space-y-3 px-4">
          {PROFILE_MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="flex w-full items-center justify-between rounded-lg bg-gray-100 px-4 py-4 text-left shadow-sm transition-colors duration-200 hover:bg-gray-200"
              onClick={() => navigateToSection(item.key)}
            >
              <span className="font-medium text-black">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          ))}
        </div>
      </div>
    </Container>

    <AddressSelector
      isOpen={isAddressSelectorOpen}
      onClose={() => {
        setIsAddressSelectorOpen(false);
        setEditingAddress(null);
      }}
      onAddressSelect={handleAddressSelect}
      title={editingAddress ? "Edit Address" : "Add New Address"}
      description={editingAddress ? "Update your address details" : "Choose your address by searching or clicking on the map"}
    />
    </>
  );
};

export default ProfilePage;
