import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, Upload, Trash2 } from "lucide-react";

const campaignSchema = z.object({
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  button_text: z.string().optional().nullable(),
  redirect_url: z.string().optional().nullable(),
  active: z.boolean(),
});

type FormData = z.infer<typeof campaignSchema>;

export default function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { active: true },
  });

  const active = watch("active");

  useEffect(() => {
    if (!isNew) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) {
        setValue("title", data.title);
        setValue("subtitle", data.subtitle);
        setValue("button_text", data.button_text);
        setValue("redirect_url", data.redirect_url);
        setValue("active", data.active);
        setImage(data.image_url || null);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-banners")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("campaign-banners")
        .getPublicUrl(fileName);
      setImage(data.publicUrl);
      toast.success("Image uploaded temporarily. Save to persist.");
    } catch (e: any) {
      toast.error(e.message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!image) {
      toast.error("Campaign banner image is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...data, image_url: image };
      if (isNew) {
        const { error } = await supabase.from("campaigns").insert([payload]);
        if (error) throw error;
        toast.success("Campaign created");
        navigate("/campaigns");
      } else {
        const { error } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Campaign saved");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/campaigns")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isNew ? "New Campaign" : "Edit Campaign"}
        </h1>
      </div>

      <div className="bg-white p-6 border rounded-md shadow-sm space-y-6">
        <div className="space-y-4">
          <Label className="text-red-500">Banner Image *</Label>
          <div className="flex flex-col gap-4">
            {image ? (
              <div className="relative group w-full h-48 border rounded-md overflow-hidden bg-gray-50">
                <img
                  src={image}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setImage(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground bg-gray-50">
                <span className="text-xs">No banner image</span>
              </div>
            )}

            <div>
              <Button
                variant="outline"
                type="button"
                className="relative cursor-pointer"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {image ? "Change Banner" : "Upload Banner"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingImage}
                />
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: 1920x800px (Desktop), 800x1200px (Mobile)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register("title")} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input {...register("subtitle")} />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input {...register("button_text")} />
          </div>
          <div className="space-y-2">
            <Label>Redirect URL</Label>
            <Input
              {...register("redirect_url")}
              placeholder="e.g. /collections/summer-2026"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(val) => setValue("active", !!val)}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active Campaign
            </Label>
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="uppercase tracking-wide text-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{" "}
            Save Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
