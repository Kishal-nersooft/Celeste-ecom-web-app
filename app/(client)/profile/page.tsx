"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Camera, ChevronRight } from "lucide-react";
import AddressSelector from "@/components/AddressSelector";
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
import toast from "react-hot-toast";
import { getCurrentUser, updateUserProfile, getUserAddresses, addUserAddress, updateUserAddress, deleteUserAddress, setDefaultAddress } from "@/lib/api";

interface SavedAddress {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  name?: string;
  ondemand_delivery_available?: boolean;
  created_at: string;
  updated_at: string;
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

const ProfilePage = () => {
  const { user, loading } = useAuth();
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
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnUrl=" + encodeURIComponent("/profile"));
    }
  }, [user, loading, router]);

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
        const storedNames =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("addressNames") || "{}")
            : {};
        const addressesWithNames = addresses.map((addr: SavedAddress) => ({
          ...addr,
          name: addr.name ?? storedNames[addr.id],
        }));
        setSavedLocations(addressesWithNames);
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

  const handleAddAddress = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    try {
      const newAddress = await addUserAddress({
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        is_default: savedLocations.length === 0,
        name: addressData.name,
      });
      
      if (newAddress?.id && addressData.name && typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        storedNames[newAddress.id] = addressData.name;
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
      }

      await loadSavedLocations();
      toast.success("Address saved successfully!");
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to save address');
    }
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
      
      if (addressData.name && typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        storedNames[editingAddress.id] = addressData.name;
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
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
      
      if (typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        delete storedNames[id];
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
      }

      await loadSavedLocations();
      toast.success("Address deleted successfully!");
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultLocation = async (id: number) => {
    try {
      await setDefaultAddress(id);
      
      await loadSavedLocations();
      toast.success("Default address updated!");
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to set default address');
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
    } else {
      handleAddAddress(addressData);
    }
    setIsAddressSelectorOpen(false);
  };

  const openAddLocation = () => {
    setEditingAddress(null);
    setIsAddressSelectorOpen(true);
  };

  if (activeSection) {
    return (
      <>
        <ProfileAccountLayout
          activeSection={activeSection}
          onNavigate={(section) => navigateToSection(section)}
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

        <AddressSelector
          isOpen={isAddressSelectorOpen}
          onClose={() => {
            setIsAddressSelectorOpen(false);
            setEditingAddress(null);
          }}
          onAddressSelect={handleAddressSelect}
          title={editingAddress ? "Edit Address" : "Add New Address"}
          description={
            editingAddress
              ? "Update your address details"
              : "Choose your address by searching or clicking on the map"
          }
        />
      </>
    );
  }

  // Default profile overview
  return (
    <>
    <Container className="py-10">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center pt-8 pb-12">
          {/* Profile Picture Placeholder */}
          <div className="relative w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          
          {/* User Name */}
          <h1 className="text-xl font-bold text-black text-center">
            {displayName}
          </h1>
        </div>

        {/* Menu Items */}
        <div className="space-y-3 px-4">
          {PROFILE_MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-4 flex items-center justify-between transition-colors duration-200 shadow-sm"
              onClick={() => navigateToSection(item.key)}
            >
              <span className="text-black font-medium text-left">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-600" />
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
