"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Camera, ChevronRight, Edit2, ArrowLeft, Plus, Trash2, MapPin, HomeIcon, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddressSelector from "@/components/AddressSelector";
import toast from "react-hot-toast";
import { getCurrentUser, updateUserProfile, getUserAddresses, addUserAddress, updateUserAddress, deleteUserAddress, setDefaultAddress, registerUser } from "@/lib/api";

interface SavedAddress {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
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

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: "",
    phoneNumber: "",
    email: "",
    language: "English"
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [savedLocations, setSavedLocations] = useState<SavedAddress[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  // Load user profile from backend
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        
        
        setLoadingProfile(true);
        try {
          const profileData = await getCurrentUser(true);
          setUserProfile(profileData);
          setSavedLocations(profileData.addresses || []);
          
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

  if (loading || loadingProfile) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Or a message indicating no access
  }

  const menuItems = [
    { label: "Profile", key: "profile" },
    { label: "Security", key: "security" },
    { label: "Privacy & Data", key: "privacy" },
    { label: "Saved Locations", key: "saved-locations" },
  ];

  // Extract first name from email or display name
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateUserProfile({
        name: formData.personalInfo,
        is_delivery: userProfile?.is_delivery || true
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      // Reload profile data
      const updatedProfile = await getCurrentUser(true);
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      personalInfo: user.displayName || user.email?.split('@')[0] || 'User',
      phoneNumber: user.phoneNumber || "+948153516",
      email: user.email || "ChamithW@gmail.com",
      language: "English"
    });
    setIsEditing(false);
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordSave = () => {
    // Here you would typically validate and save the password
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }
    console.log("Changing password:", passwordData);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswordForm(false);
  };

  const handlePasswordCancel = () => {
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswordForm(false);
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
        is_default: savedLocations.length === 0
      });
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      setSavedLocations(addresses);
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
        longitude: addressData.coordinates.lng
      });
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      setSavedLocations(addresses);
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
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      setSavedLocations(addresses);
      toast.success("Address deleted successfully!");
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultLocation = async (id: number) => {
    try {
      await setDefaultAddress(id);
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      setSavedLocations(addresses);
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

  const getAddressIcon = (address: string) => {
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes('home') || lowerAddress.includes('house')) {
      return <HomeIcon className="h-5 w-5 text-blue-600" />;
    } else if (lowerAddress.includes('office') || lowerAddress.includes('work')) {
      return <BriefcaseBusiness className="h-5 w-5 text-green-600" />;
    }
    return <MapPin className="h-5 w-5 text-gray-600" />;
  };

  const fields = [
    {
      key: "personalInfo",
      label: "Personal info",
      value: formData.personalInfo,
      type: "text"
    },
    {
      key: "phoneNumber", 
      label: "Phone Number",
      value: formData.phoneNumber,
      type: "tel"
    },
    {
      key: "email",
      label: "Email", 
      value: formData.email,
      type: "email"
    },
    {
      key: "language",
      label: "Language",
      value: formData.language,
      type: "select",
      options: ["English"]
    }
  ];

  // If security is active, show the security view
  if (activeSection === "security") {
    return (
      <Container className="py-0">
        <div className="flex min-h-screen bg-gray-50">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <nav className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      activeSection === item.key
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white p-8">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>
              
              {!showPasswordForm ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-4 flex items-center justify-between transition-colors duration-200 shadow-sm"
                  >
                    <span className="text-black font-medium text-left">Password</span>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <button className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-4 flex items-center justify-between transition-colors duration-200 shadow-sm">
                    <span className="text-black font-medium text-left">Recovery Phone</span>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <button className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-4 flex items-center justify-between transition-colors duration-200 shadow-sm">
                    <span className="text-black font-medium text-left">Sign out all devices</span>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                      className="w-full bg-transparent text-gray-600 text-sm border-none outline-none"
                      placeholder="Enter current password"
                    />
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                      className="w-full bg-transparent text-gray-600 text-sm border-none outline-none"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                      className="w-full bg-transparent text-gray-600 text-sm border-none outline-none"
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handlePasswordSave}
                      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Save Password
                    </button>
                    <button
                      onClick={handlePasswordCancel}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // If saved locations is active, show the locations view
  if (activeSection === "saved-locations") {
    return (
      <Container className="py-0">
        <div className="flex min-h-screen bg-gray-50">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <nav className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      activeSection === item.key
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white p-8">
            <div className="max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Saved Locations</h1>
              </div>
              
              {savedLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved locations</h3>
                  <p className="text-gray-500 mb-4">Add your first location to get started</p>
                  <Button
                    onClick={() => {
                      setEditingAddress(null);
                      setIsAddressSelectorOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Location
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setEditingAddress(null);
                        setIsAddressSelectorOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Location
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {savedLocations.map((location) => (
                    <Card key={location.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getAddressIcon(location.address)}
                            <CardTitle className="text-lg">Address {location.id}</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAddress(location)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLocation(location.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {location.is_default && (
                          <Badge variant="default" className="w-fit">
                            Default
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3">{location.address}</p>
                        {!location.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultLocation(location.id)}
                            className="w-full"
                          >
                            Set as Default
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // If privacy is active, show the privacy view
  if (activeSection === "privacy") {
    return (
      <Container className="py-0">
        <div className="flex min-h-screen bg-gray-50">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <nav className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      activeSection === item.key
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white p-8">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy & Data Settings</h1>
              <p className="text-gray-600">Privacy and data settings will be implemented here.</p>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // If personal info is active, show the detailed view
  if (activeSection === "profile") {
    return (
      <Container className="py-0">
        <div className="flex min-h-screen bg-gray-50">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
              
              <nav className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      activeSection === item.key
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white p-8">
            <div className="max-w-2xl">
              {/* Profile Picture Section */}
              <div className="flex items-start gap-6 mb-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center shadow-sm">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Edit2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="bg-gray-100 rounded-lg p-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                          {field.label}
                        </label>
                        {isEditing ? (
                          field.type === "select" ? (
                            <select
                              value={field.value}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              className="w-full bg-transparent text-gray-600 text-sm border-none outline-none"
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={field.value}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              className="w-full bg-transparent text-gray-600 text-sm border-none outline-none"
                            />
                          )
                        ) : (
                          <span className="text-gray-600 text-sm">{field.value}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="ml-4 p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
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
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-4 flex items-center justify-between transition-colors duration-200 shadow-sm"
              onClick={() => setActiveSection(item.key)}
            >
              <span className="text-black font-medium text-left">
                {item.label}
              </span>
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
