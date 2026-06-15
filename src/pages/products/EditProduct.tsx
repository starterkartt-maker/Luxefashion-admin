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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Upload, Plus, Trash2, Sparkles } from "lucide-react";
import HomepageSectionSelector from "@/components/HomepageSectionSelector";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  category_id: z.string().optional().nullable(),
  collection_id: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  fabric_details: z.string().optional().nullable(),
  care_instructions: z.string().optional().nullable(),
  base_price: z.number().min(0).or(z.string().transform(Number)),
  sale_price: z.number().optional().nullable().or(z.string().transform((v) => (v ? Number(v) : null))),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  active: z.boolean(),
  featured: z.boolean(),
  trending: z.boolean(),
  new_arrival: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  // Media
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variants
  const [variants, setVariants] = useState<any[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      active: true,
      featured: false,
      trending: false,
      new_arrival: false,
      base_price: 0,
    },
  });

  const active = watch("active");
  const featured = watch("featured");
  const trending = watch("trending");
  const new_arrival = watch("new_arrival");
  const categoryId = watch("category_id");
  const collectionId = watch("collection_id");
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
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const [catsRes, colsRes] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("collections").select("id, name"),
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (colsRes.data) setCollections(colsRes.data);

      if (!isNew) {
        setLoading(true);
        const { data: product, error } = await supabase
          .from("products")
          .select("*, product_images(*), product_variants(*)")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (product) {
          Object.keys(productSchema.shape).forEach((key) => {
            if (product[key] !== undefined) setValue(key as any, product[key]);
          });
          setImages(product.product_images || []);
          setVariants(product.product_variants || []);
          setDeletedVariantIds([]);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: any = async (data: ProductFormData) => {
    setSaving(true);
    try {
      if (data.slug) {
        data.slug = data.slug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      let productId = id;
      if (isNew) {
        const { data: newProd, error } = await supabase
          .from("products")
          .insert([data])
          .select()
          .single();
        if (error) throw error;
        productId = newProd.id;
      } else {
        const { error } = await supabase
          .from("products")
          .update(data)
          .eq("id", productId);
        if (error) throw error;
      }

      // Save local/temporary images if any
      const localImages = images.filter((img) => img.isLocal || String(img.id).startsWith("temp_"));
      if (localImages.length > 0) {
        const inserts = localImages.map((img) => ({
          product_id: productId,
          image_url: img.image_url,
        }));
        const { error: imgError } = await supabase
          .from("product_images")
          .insert(inserts);
        if (imgError) throw imgError;
      }

      // Save/Update/Delete Variants in database
      if (deletedVariantIds.length > 0) {
        const { error: delError } = await supabase
          .from("product_variants")
          .delete()
          .in("id", deletedVariantIds);
        if (delError) throw delError;
      }

      const newVariants = variants.filter((v) => !v.id || String(v.id).startsWith("temp_"));
      const existingVariants = variants.filter((v) => v.id && !String(v.id).startsWith("temp_"));

      // 1. Insert New Variants (Auto-create default variant for a new product if none are provided)
      const variantsToInsert = [...newVariants];
      if (isNew && variantsToInsert.length === 0 && existingVariants.length === 0) {
        variantsToInsert.push({
          color: "Standard",
          size: "Regular",
          sku: `SKU-${Math.floor(Math.random() * 90000) + 10000}`,
          stock: 10,
        });
      }

      if (variantsToInsert.length > 0) {
        const inserts = variantsToInsert.map((v) => {
          const parsedStock = parseInt(String(v.stock));
          return {
            product_id: productId,
            color: v.color || null,
            size: v.size || null,
            sku: v.sku || `SKU-${Math.floor(Math.random() * 90000) + 10000}`,
            stock: isNaN(parsedStock) ? 10 : parsedStock,
          };
        });
        const { error: insError } = await supabase
          .from("product_variants")
          .insert(inserts);
        if (insError) throw insError;
      }

      // 2. Update Existing Variants
      if (existingVariants.length > 0) {
        for (const ev of existingVariants) {
          const parsedStock = parseInt(String(ev.stock));
          const { error: updError } = await supabase
            .from("product_variants")
            .update({
              color: ev.color || null,
              size: ev.size || null,
              sku: ev.sku,
              stock: isNaN(parsedStock) ? 0 : parsedStock,
            })
            .eq("id", ev.id);
          if (updError) throw updError;
        }
      }

      toast.success(isNew ? "Product and variants created!" : "Product and variants saved properly");
      if (isNew) {
        navigate(`/products/${productId}`, { replace: true });
      } else {
        fetchFormData();
        setDeletedVariantIds([]);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let uploadBucket = "product-images";
      let uploadResult;

      try {
        const { data: upData, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadResult = upData;
      } catch (err) {
        console.warn("Failed product-images bucket, trying product_images", err);
        try {
          const { data: upData, error: uploadError } = await supabase.storage
            .from("product_images")
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          uploadResult = upData;
          uploadBucket = "product_images";
        } catch (err2) {
          console.warn("Failed product_images bucket, trying collection-images", err2);
          const { data: upData, error: uploadError } = await supabase.storage
            .from("collection-images")
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          uploadResult = upData;
          uploadBucket = "collection-images";
        }
      }

      const { data } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(filePath);

      if (isNew) {
        const tempImage = {
          id: `temp_${Date.now()}_${Math.floor(Math.random() * 1050)}`,
          image_url: data.publicUrl,
          isLocal: true
        };
        setImages([...images, tempImage]);
        toast.success("Image uploaded temporarily. Save product to persist.");
      } else {
        const { data: imageRow, error: insertError } = await supabase
          .from("product_images")
          .insert([{ product_id: id, image_url: data.publicUrl }])
          .select()
          .single();

        if (insertError) throw insertError;
        setImages([...images, imageRow]);
        toast.success("Image uploaded");
      }
    } catch (e: any) {
      toast.error(e.message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      if (String(imageId).startsWith("temp_")) {
        setImages(images.filter((img) => img.id !== imageId));
        toast.success("Image removed");
        return;
      }
      const { error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId);
      if (error) throw error;
      setImages(images.filter((img) => img.id !== imageId));
      toast.success("Image removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Add local variant functions.
  const addVariant = () => {
    const newVar = {
      id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      stock: 0,
      color: "",
      size: ""
    };
    setVariants([...variants, newVar]);
  };

  const updateVariant = (vid: string, field: string, value: any) => {
    setVariants(
      variants.map((v) => (v.id === vid ? { ...v, [field]: value } : v))
    );
  };

  const deleteVariant = (vid: string) => {
    if (vid && !vid.startsWith("temp_")) {
      setDeletedVariantIds([...deletedVariantIds, vid]);
    }
    setVariants(variants.filter((v) => v.id !== vid));
    toast.success("Variant removed from list (Save to persist changes)");
  };

  if (loading)
    return (
      <div className="p-8">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isNew ? "New Product" : "Edit Product"}
        </h1>
      </div>

      <Tabs defaultValue="basic">
        <div className="flex justify-between items-center bg-white p-2 rounded-t-md border border-b-0">
          <TabsList className="bg-transparent">
            <TabsTrigger
              className="data-[state=active]:bg-gray-100"
              value="basic"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-gray-100"
              value="pricing"
            >
              Pricing
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-gray-100"
              value="seo"
            >
              SEO
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-gray-100"
              value="media"
            >
              Media
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-gray-100"
              value="variants"
            >
              Variants
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-gray-100 text-amber-600 dark:text-amber-500 font-semibold"
              value="homepage"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Home Screen
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="uppercase tracking-wide text-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Product
          </Button>
        </div>

        <div className="bg-white p-6 border rounded-b-md shadow-sm">
          <TabsContent value="basic" className="space-y-6 mt-0">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input {...register("name")} />
                {errors.name && (
                  <p className="text-red-500 text-xs">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  {...register("slug")}
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

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId || ""}
                  onValueChange={(val) => setValue("category_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Collection</Label>
                <Select
                  value={collectionId || ""}
                  onValueChange={(val) => setValue("collection_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Short Description</Label>
                <Input {...register("short_description")} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  {...register("description")}
                  className="min-h-[120px]"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Fabric Details</Label>
                <Input {...register("fabric_details")} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Care Instructions</Label>
                <Input {...register("care_instructions")} />
              </div>

              <div className="col-span-2 grid grid-cols-4 gap-4 bg-gray-50 p-4 border rounded-md mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={active}
                    onCheckedChange={(val) => setValue("active", !!val)}
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={featured}
                    onCheckedChange={(val) => setValue("featured", !!val)}
                  />
                  <Label htmlFor="featured" className="cursor-pointer">
                    Featured
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trending"
                    checked={trending}
                    onCheckedChange={(val) => setValue("trending", !!val)}
                  />
                  <Label htmlFor="trending" className="cursor-pointer">
                    Trending
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new_arrival"
                    checked={new_arrival}
                    onCheckedChange={(val) => setValue("new_arrival", !!val)}
                  />
                  <Label htmlFor="new_arrival" className="cursor-pointer">
                    New Arrival
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6 mt-0">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Base Price (₹)</Label>
                <Input type="number" step="0.01" {...register("base_price")} />
              </div>
              <div className="space-y-2">
                <Label>Sale Price (₹)</Label>
                <Input type="number" step="0.01" {...register("sale_price")} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>SEO Title</Label>
                <Input {...register("seo_title")} />
              </div>
              <div className="space-y-2">
                <Label>SEO Description</Label>
                <Textarea {...register("seo_description")} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6 mt-0">
            <div>
              <div className="mb-4">
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
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingImage}
                  />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-md overflow-hidden border"
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-6 mt-0">
              <div className="flex justify-end mb-4">
                <Button type="button" variant="outline" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              <div className="space-y-4">
                {variants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                    No variants added yet.
                  </div>
                ) : (
                  variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-4 p-4 border rounded-md bg-gray-50/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Color</Label>
                        <Input
                          value={variant.color || ""}
                          onChange={(e) =>
                            updateVariant(variant.id, "color", e.target.value)
                          }
                          placeholder="E.g. Black"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Size</Label>
                        <Input
                          value={variant.size || ""}
                          onChange={(e) =>
                            updateVariant(variant.id, "size", e.target.value)
                          }
                          placeholder="E.g. M"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={variant.sku || ""}
                          onChange={(e) =>
                            updateVariant(variant.id, "sku", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label className="text-xs">Stock</Label>
                        <Input
                          type="number"
                          value={variant.stock === undefined || variant.stock === null ? "" : variant.stock}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(
                              variant.id,
                              "stock",
                              val === "" ? "" : parseInt(val)
                            );
                          }}
                        />
                      </div>
                      <div className="pt-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteVariant(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="homepage" className="space-y-6 mt-0">
              {!isNew ? (
                <HomepageSectionSelector itemId={id} type="products" />
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/20 border border-amber-900/10 whitespace-normal">
                  <div className="flex gap-2 items-center text-amber-850 dark:text-amber-400 font-semibold text-xs mb-1">
                    <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                    <span>Configure Homescreen Visibility</span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-zinc-400">
                    Save this product first to enable adding it directly to your Home Screen sections!
                  </p>
                </div>
              )}
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
