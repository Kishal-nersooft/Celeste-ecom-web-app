"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Trash2,
  Bell,
  Eye,
  Cookie,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
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

type PrivacyDialog =
  | null
  | "data-sharing"
  | "marketing"
  | "download"
  | "delete"
  | "cookies"
  | "visibility";

export default function ProfilePrivacySection() {
  const [activeDialog, setActiveDialog] = useState<PrivacyDialog>(null);
  const [marketingOn, setMarketingOn] = useState(true);
  const [dataSharingOn, setDataSharingOn] = useState(false);

  const showComingSoon = (feature: string) => {
    toast(`${feature} will be available soon.`, { icon: "ℹ️" });
  };

  return (
    <div className="max-w-2xl">
      <ProfilePageHeader
        title="Privacy & data"
        description="Control how Celeste uses your data and what you share with us."
      />

      <SectionBlock
        title="Your data"
        description="See what we collect and how you can manage it."
      >
        <SettingsRow
          icon={FileText}
          title="Privacy policy"
          description="Read how Celeste collects, uses, and protects your information."
          actionLabel="View"
          onClick={() => showComingSoon("Privacy policy")}
        />
        <SettingsRow
          icon={Download}
          title="Download your data"
          description="Get a copy of the personal data associated with your account."
          onClick={() => setActiveDialog("download")}
        />
        <SettingsRow
          icon={Trash2}
          title="Delete account"
          description="Permanently remove your account and personal data from Celeste."
          onClick={() => setActiveDialog("delete")}
        />
      </SectionBlock>

      <ProfileSectionSeparator />

      <SectionBlock title="Preferences" description="Choose what you receive and what others can see.">
        <SettingsRow
          icon={Share2}
          title="Data sharing"
          description="Share anonymized usage data to help improve Celeste."
          actionLabel={dataSharingOn ? "On" : "Off"}
          onClick={() => setActiveDialog("data-sharing")}
        />
        <SettingsRow
          icon={Bell}
          title="Marketing communications"
          description="Offers, promotions, and product updates by email or SMS."
          actionLabel={marketingOn ? "On" : "Off"}
          onClick={() => setActiveDialog("marketing")}
        />
        <SettingsRow
          icon={Eye}
          title="Profile visibility"
          description="Who can see your name on shared orders or referrals."
          onClick={() => setActiveDialog("visibility")}
        />
        <SettingsRow
          icon={Cookie}
          title="Cookie preferences"
          description="Manage analytics and advertising cookies on Celeste Web."
          onClick={() => setActiveDialog("cookies")}
        />
      </SectionBlock>

      <Dialog open={activeDialog === "download"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download your data</DialogTitle>
            <DialogDescription>
              We will prepare a file with your profile, orders, and addresses. You will receive a
              link when it is ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={() => {
                showComingSoon("Data export");
                setActiveDialog(null);
              }}
            >
              Request download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This permanently deletes your Celeste account, order history, and saved addresses.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                showComingSoon("Account deletion");
                setActiveDialog(null);
              }}
            >
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "data-sharing"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data sharing</DialogTitle>
            <DialogDescription>
              Help us improve Celeste by sharing anonymized app usage data. We never sell your
              personal information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">Share usage data</span>
            <Button
              type="button"
              variant={dataSharingOn ? "default" : "outline"}
              size="sm"
              className={dataSharingOn ? "bg-black hover:bg-gray-800" : ""}
              onClick={() => {
                setDataSharingOn((v) => !v);
                toast.success(dataSharingOn ? "Data sharing turned off" : "Data sharing turned on");
              }}
            >
              {dataSharingOn ? "On" : "Off"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "marketing"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marketing communications</DialogTitle>
            <DialogDescription>
              Receive offers and updates from Celeste. You can unsubscribe at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-900">Email & SMS offers</span>
            <Button
              type="button"
              variant={marketingOn ? "default" : "outline"}
              size="sm"
              className={marketingOn ? "bg-black hover:bg-gray-800" : ""}
              onClick={() => {
                setMarketingOn((v) => !v);
                toast.success(marketingOn ? "Marketing turned off" : "Marketing turned on");
              }}
            >
              {marketingOn ? "On" : "Off"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "visibility"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile visibility</DialogTitle>
            <DialogDescription>
              Control whether your first name appears on shared order links or referral invites.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Profile visibility")}>
              Manage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "cookies"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which optional cookies Celeste Web can use for analytics and personalization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Close
            </Button>
            <Button className="bg-black hover:bg-gray-800" onClick={() => showComingSoon("Cookie settings")}>
              Manage cookies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
