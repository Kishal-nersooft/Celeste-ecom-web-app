"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  ChevronRight,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Monitor,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  ProfilePageHeader,
  SectionBlock,
  SettingsRow,
  ProfileSectionSeparator,
} from "@/components/profile/profile-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  clearOtherLoginSessions,
  DESIGN_DEMO_LOGIN_SESSION,
  getStoredLoginSessions,
  recordCurrentLoginSession,
} from "@/lib/device-session";

interface ProfileSecuritySectionProps {
  user: User;
  recoveryPhone?: string;
}

type SecurityDialog =
  | null
  | "passkeys"
  | "password"
  | "authenticator"
  | "twoStep"
  | "recoveryPhone"
  | "signOutAll";

const SOCIAL_PROVIDERS = [
  { id: "google.com", label: "Google", brandClass: "text-[#4285F4]" },
  { id: "apple.com", label: "Apple", brandClass: "text-gray-900" },
] as const;

export default function ProfileSecuritySection({
  user,
  recoveryPhone,
}: ProfileSecuritySectionProps) {
  const [activeDialog, setActiveDialog] = useState<SecurityDialog>(null);
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [sessions, setSessions] = useState(() => getStoredLoginSessions());
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [recoveryPhoneInput, setRecoveryPhoneInput] = useState(
    recoveryPhone || user.phoneNumber || ""
  );

  const linkedProviders = useMemo(() => {
    const ids = new Set(user.providerData.map((p) => p.providerId));
    return SOCIAL_PROVIDERS.map((p) => ({
      ...p,
      connected: ids.has(p.id),
    }));
  }, [user.providerData]);

  const hasPasswordProvider = user.providerData.some(
    (p) => p.providerId === "password"
  );
  const hasPhoneProvider = user.providerData.some((p) => p.providerId === "phone");
  const displayPhone = recoveryPhone || user.phoneNumber || "Not set";

  const refreshSessions = useCallback(() => {
    recordCurrentLoginSession();
    setSessions(getStoredLoginSessions());
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const showComingSoon = (feature: string) => {
    toast(`${feature} is coming soon for Celeste accounts.`, { icon: "🔒" });
  };

  const handlePasswordSave = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    toast.success("Password updated");
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setActiveDialog(null);
  };

  const handleRecoveryPhoneSave = () => {
    if (!recoveryPhoneInput.trim()) {
      toast.error("Enter a valid phone number");
      return;
    }
    toast.success("Recovery phone saved");
    setActiveDialog(null);
  };

  const handleDisconnectSocial = (label: string, connected: boolean) => {
    if (!connected) {
      showComingSoon(`Connecting ${label}`);
      return;
    }
    toast(`Disconnecting ${label} will be available soon.`, { icon: "ℹ️" });
  };

  const handleSignOutAll = () => {
    clearOtherLoginSessions();
    refreshSessions();
    setActiveDialog(null);
    toast.success("Other sessions cleared (UI preview only)");
  };

  // Design preview: real current device + demo row until backend session API exists.
  const loginActivitySessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
    const hasDemo = sorted.some((s) => s.id === DESIGN_DEMO_LOGIN_SESSION.id);
    if (!hasDemo && sorted.length > 0) {
      return [...sorted, DESIGN_DEMO_LOGIN_SESSION];
    }
    return sorted.length > 0 ? sorted : [DESIGN_DEMO_LOGIN_SESSION];
  }, [sessions]);

  return (
    <div className="max-w-2xl">
      <ProfilePageHeader
        title="Security"
        description="Manage how you sign in and protect your Celeste account."
      />

      <SectionBlock
        title="Logging in to Celeste"
        description="Choose and manage sign-in methods for your account."
      >
        <SettingsRow
          icon={Fingerprint}
          title="Passkeys"
          description="Passkeys are easier and more secure than passwords."
          onClick={() => setActiveDialog("passkeys")}
        />
        <SettingsRow
          icon={KeyRound}
          title="Password"
          actionLabel={
            hasPasswordProvider ? "Change" : hasPhoneProvider ? "Phone sign-in" : "Add"
          }
          onClick={() => setActiveDialog("password")}
        />
      </SectionBlock>

      <ProfileSectionSeparator />

      <SectionBlock title="Extra protection">
        <SettingsRow
          icon={ShieldCheck}
          title="Authenticator app"
          description="Set up your authenticator app to add an extra layer of security."
          onClick={() => setActiveDialog("authenticator")}
        />
        <SettingsRow
          icon={ShieldCheck}
          title="2-step verification"
          description="Add additional security to your account with 2-step verification."
          actionLabel={twoStepEnabled ? "On" : "Off"}
          onClick={() => setActiveDialog("twoStep")}
        />
        <SettingsRow
          icon={Smartphone}
          title="Recovery phone"
          description="Add a backup phone number to access your account."
          actionLabel={displayPhone !== "Not set" ? displayPhone : undefined}
          onClick={() => {
            setRecoveryPhoneInput(displayPhone !== "Not set" ? displayPhone : "");
            setActiveDialog("recoveryPhone");
          }}
        />
      </SectionBlock>

      <ProfileSectionSeparator />

      <SectionBlock
        title="Connected social apps"
        description="Manage connected apps to sign in to your Celeste account."
      >
        {linkedProviders.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                {provider.label.charAt(0)}
              </div>
              <div>
                <p className={`font-medium ${provider.brandClass}`}>{provider.label}</p>
                <p className="text-xs text-gray-500">
                  {provider.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={provider.connected ? "outline" : "default"}
              size="sm"
              className={provider.connected ? "" : "bg-black hover:bg-gray-800"}
              onClick={() => handleDisconnectSocial(provider.label, provider.connected)}
            >
              {provider.connected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        ))}
        {user.providerData.some((p) => p.providerId === "phone") && (
          <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone number</p>
                <p className="text-xs text-gray-500">{displayPhone}</p>
              </div>
            </div>
            <Badge variant="secondary">Primary</Badge>
          </div>
        )}
      </SectionBlock>

      <ProfileSectionSeparator />

      <SectionBlock
        title="Login activity"
        description="You're logged in or have been logged in on these devices within the last 30 days. Multiple logins from the same device may appear."
      >
        <div className="space-y-0">
          {loginActivitySessions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No recent login activity recorded.</p>
          ) : (
            loginActivitySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Monitor className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{session.label}</p>
                    {session.isCurrent && (
                      <Badge variant="default" className="mt-1 mb-1 text-xs">
                        Your current login
                      </Badge>
                    )}
                    {session.subtitle && (
                      <p className="text-sm text-gray-500">{session.subtitle}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-0.5">{session.platform}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveDialog("signOutAll")}
          className="mt-4 w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Sign out all devices</p>
              <p className="text-sm text-gray-500">All except your current login</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      </SectionBlock>

      {/* Passkeys */}
      <Dialog open={activeDialog === "passkeys"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passkeys</DialogTitle>
            <DialogDescription>
              Sign in with Face ID, Touch ID, or your device PIN — no password to remember.
              Passkey support for Celeste is coming soon.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Passkeys")}>
              Get notified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog open={activeDialog === "password"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password</DialogTitle>
            <DialogDescription>
              {hasPhoneProvider && !hasPasswordProvider
                ? "Your account uses phone verification to sign in. You can add a password as a backup sign-in method when this feature launches."
                : "Update the password for your Celeste account."}
            </DialogDescription>
          </DialogHeader>
          {hasPhoneProvider && !hasPasswordProvider ? (
            <p className="text-sm text-gray-600">
              Primary sign-in: <span className="font-medium">{displayPhone}</span>
            </p>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </Button>
            {hasPhoneProvider && !hasPasswordProvider ? (
              <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Password sign-in")}>
                Notify me
              </Button>
            ) : (
              <Button className="bg-black hover:bg-gray-800" onClick={handlePasswordSave}>
                Save password
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authenticator */}
      <Dialog open={activeDialog === "authenticator"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authenticator app</DialogTitle>
            <DialogDescription>
              Use an app like Google Authenticator or Authy to generate one-time codes when you
              sign in. Setup will be available in a future update.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Authenticator app")}>
              Set up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2-step verification */}
      <Dialog open={activeDialog === "twoStep"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>2-step verification</DialogTitle>
            <DialogDescription>
              When enabled, you&apos;ll confirm sign-in with a code sent to your phone or
              authenticator app in addition to your usual sign-in method.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">2-step verification</span>
            <Button
              type="button"
              variant={twoStepEnabled ? "default" : "outline"}
              size="sm"
              className={twoStepEnabled ? "bg-black hover:bg-gray-800" : ""}
              onClick={() => {
                if (!twoStepEnabled) {
                  showComingSoon("2-step verification");
                  return;
                }
                setTwoStepEnabled(false);
                toast.success("2-step verification turned off");
              }}
            >
              {twoStepEnabled ? "On" : "Turn on"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery phone */}
      <Dialog open={activeDialog === "recoveryPhone"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery phone</DialogTitle>
            <DialogDescription>
              Use this number to recover your account if you lose access to your primary sign-in
              method.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="recovery-phone">Phone number</Label>
            <Input
              id="recovery-phone"
              type="tel"
              value={recoveryPhoneInput}
              onChange={(e) => setRecoveryPhoneInput(e.target.value)}
              placeholder="+94 7X XXX XXXX"
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={handleRecoveryPhoneSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign out all */}
      <Dialog open={activeDialog === "signOutAll"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out all devices</DialogTitle>
            <DialogDescription>
              This is a UI preview only. Clearing other sessions here updates the sample list on
              this device. Account-wide sign-out will be available when session management is
              connected to the backend.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleSignOutAll()}
            >
              Sign out all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
