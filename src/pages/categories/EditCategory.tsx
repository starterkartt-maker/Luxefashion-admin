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
import { Loader2, ArrowLeft, Upload, Trash2, Sparkles } from "lucide-react";
import HomepageSectionSelector from "@/components/HomepageSectionSelector";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type FormData = z.infer<typeof categorySchema>;

export default function EditCategory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
  });

  const nameVal = watch("name");

  useEffect(() => {
    if (isNew && nameVal && !isSlugManuallyEdited) {
      const generatedSlug = nameVal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [nameVal, isSlugManuallyEdited, isNew, setValue]);

  useEffect(() => {
    if (!isNew) {
      fetchCategory();
    }
  }, [id]);

  const fetchCategory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) {
        setValue("name", data.name);
        setValue("slug", data.slug);
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
        .from("collection-images")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("collection-images")
        .getPublicUrl(fileName);
      setImage(data.publicUrl);
      toast.success("Image uploaded temporarily. Save category to persist.");
    } catch (e: any) {
      toast.error(e.message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { 
        name: data.name, 
        slug: data.slug, 
        image_url: image 
      };
      if (isNew) {
        const { error } = await supabase.from("categories").insert([payload]);
        if (error) throw error;
        toast.success("Category created");
        navigate("/categories");
      } else {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Category saved");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 font-sans text-gray-900 dark:text-zinc-50">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/categories")}
          className="dark:border-zinc-800 dark:bg-zinc-900 border-gray-250"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isNew ? "New Category" : "Edit Category"}
        </h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xs space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-zinc-300">Category Name</Label>
            <Input {...register("name")} className="dark:bg-zinc-850 dark:border-zinc-800" />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-zinc-300">Slug</Label>
            <Input
              {...register("slug")}
              className="dark:bg-zinc-850 dark:border-zinc-800 font-mono text-sm"
              onChange={(e) => {
                if (e.target.value === "") {
                  setIsSlugManuallyEdited(false);
                } else {
                  setIsSlugManuallyEdited(true);
                }
                register("slug").onChange(e);
              }}
            />
            {errors.slug && (
              <p className="text-red-500 text-xs">{errors.slug.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-150 dark:border-zinc-800">
          <Label className="text-gray-700 dark:text-zinc-300">Category Image</Label>
          <div className="flex items-start gap-6">
            {image ? (
              <div className="relative group w-40 h-40 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-950">
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
              <div className="w-40 h-40 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg flex flex-col items-center justify-center text-muted-foreground dark:text-zinc-500 bg-gray-50/50 dark:bg-zinc-950/20">
                <span className="text-xs">No image</span>
              </div>
            )}

            <div>
              <Button
                variant="outline"
                type="button"
                className="relative cursor-pointer dark:border-zinc-800"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {image ? "Change Image" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingImage}
                />
              </Button>
            </div>
          </div>
        </div>

        {!isNew && (
          <div className="pt-6 border-t border-gray-150 dark:border-zinc-800">
            <HomepageSectionSelector itemId={id} type="categories" />
          </div>
        )}

        {isNew && (
          <div className="pt-6 border-t border-gray-150 dark:border-zinc-800 p-4 rounded-xl bg-amber-50/20 border border-amber-900/10">
            <div className="flex gap-2 items-center text-amber-850 dark:text-amber-400 font-semibold text-xs mb-1">
              <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
              <span>Configure Homescreen Visibility</span>
            </div>
            <p className="text-xs text-muted-foreground dark:text-zinc-400">
              Save this category first to enable adding it directly to your Home Screen sections!
            </p>
          </div>
        )}

        <div className="pt-6 border-t border-gray-150 dark:border-zinc-800 flex justify-end">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="uppercase tracking-wide text-xs bg-black text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Category
          </Button>
        </div>
      </div>
    </div>
  );
}
