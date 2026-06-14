import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export default function Settings() {
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Store settings updated successfully.");
    }, 800);
  };

  return (
    <div className="max-w-3xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Store Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your brand assets, contact information, and social links.
        </p>
      </div>

      <div className="bg-white p-8 border rounded-md shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">
              Brand Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input defaultValue="Luxe Fashion" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input defaultValue="Premium Essentials" />
              </div>
              <div className="col-span-2 space-y-4">
                <Label>Store Logo</Label>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 border rounded bg-gray-50 flex items-center justify-center font-bold tracking-widest text-xs uppercase">
                    LUXE
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      type="button"
                      className="relative cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-2" /> Upload Logo
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">
                      Optimal dimensions: 512x512px. Max file size: 2MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input type="email" defaultValue="support@luxefashion.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" defaultValue="+1 (555) 123-4567" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Business Address</Label>
                <Input defaultValue="123 Luxury Avenue, Fashion District, NY 10001" />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Instagram URL</Label>
                <Input defaultValue="https://instagram.com/luxefashion" />
              </div>
              <div className="space-y-2">
                <Label>TikTok URL</Label>
                <Input defaultValue="https://tiktok.com/@luxefashion" />
              </div>
              <div className="space-y-2">
                <Label>Twitter (X) URL</Label>
                <Input placeholder="https://twitter.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Facebook URL</Label>
                <Input placeholder="https://facebook.com/..." />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="uppercase tracking-wide text-xs px-8"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}{" "}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
