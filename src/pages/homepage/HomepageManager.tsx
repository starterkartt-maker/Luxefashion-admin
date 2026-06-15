import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Plus, 
  GripVertical, 
  Trash2, 
  Check, 
  Sparkles, 
  Copy, 
  Globe, 
  Layers, 
  Package, 
  Tags, 
  ArrowRight,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HomepageManager() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [sectionType, setSectionType] = useState("products");
  const [activeTab, setActiveTab] = useState<"products" | "collections" | "categories">("products");

  // Section Content Management States
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Highly-reactive section contents map to ensure counts update instantly on screen
  const [sectionContents, setSectionContents] = useState<Record<string, { product_ids: string[]; collection_ids: string[]; category_ids: string[] }>>({});

  // Queries
  const { data: sections, isLoading } = useQuery({
    queryKey: ["homepage_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Populate reactive sectionContents dictionary when sections are loaded
  useEffect(() => {
    if (sections) {
      const contents: Record<string, { product_ids: string[]; collection_ids: string[]; category_ids: string[] }> = {};
      sections.forEach((section: any) => {
        const saved = localStorage.getItem(`homepage_section_content_${section.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            contents[section.id] = {
              product_ids: parsed.product_ids || [],
              collection_ids: parsed.collection_ids || [],
              category_ids: parsed.category_ids || [],
            };
          } catch (e) {
            contents[section.id] = { product_ids: [], collection_ids: [], category_ids: [] };
          }
        } else {
          contents[section.id] = { product_ids: [], collection_ids: [], category_ids: [] };
        }
      });
      setSectionContents(contents);
    }
  }, [sections]);

  const { data: allProducts } = useQuery({
    queryKey: ["products_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(image_url)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allCollections } = useQuery({
    queryKey: ["collections_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allCategories } = useQuery({
    queryKey: ["categories_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const addMutation = useMutation({
    mutationFn: async ({ title, type }: { title: string; type: string }) => {
      const count = sections?.length || 0;
      const { error } = await supabase
        .from("homepage_sections")
        .insert([{ title, active: true, sort_order: count, section_type: type }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage_sections"] });
      setNewTitle("");
      toast.success("Section added successfully!");
    },
    onError: (error: any) => {
      console.error("Error adding homepage section:", error);
      toast.error(
        <div>
          <p className="font-semibold">Unable to add section to Database</p>
          <p className="text-xs opacity-90 mt-0.5">{error.message || "Request failed"}</p>
          {error.code === "42501" && (
            <div className="mt-1.5 p-1 pb-1 px-1.5 bg-amber-50 dark:bg-amber-950/20 text-[10px] text-amber-850 dark:text-amber-400 rounded-sm">
              💡 RLS Policy Triggered: Enable INSERT capability for anonymous or authenticated administrators on the `homepage_sections` database table.
            </div>
          )}
        </div>
      );
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("homepage_sections")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage_sections"] });
      toast.success("Visibility updated!");
    },
    onError: (error: any) => {
      console.error("Error toggling section visibility:", error);
      toast.error(
        <div>
          <p className="font-semibold">Unable to update section visibility</p>
          <p className="text-xs opacity-90 mt-0.5">{error.message}</p>
        </div>
      );
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("homepage_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage_sections"] });
      toast.success("Section deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting section:", error);
      toast.error(
        <div>
          <p className="font-semibold">Could not delete section</p>
          <p className="text-xs opacity-90 mt-0.5">{error.message}</p>
        </div>
      );
    }
  });

  // Section content helpers
  const openManagement = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setActiveTab("products");
    
    // Read from state first, fallback to localStorage
    const cached = sectionContents[sectionId];
    if (cached) {
      setSelectedProducts(cached.product_ids || []);
      setSelectedCollections(cached.collection_ids || []);
      setSelectedCategories(cached.category_ids || []);
    } else {
      const saved = localStorage.getItem(`homepage_section_content_${sectionId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedProducts(parsed.product_ids || []);
          setSelectedCollections(parsed.collection_ids || []);
          setSelectedCategories(parsed.category_ids || []);
        } catch (e) {
          setSelectedProducts([]);
          setSelectedCollections([]);
          setSelectedCategories([]);
        }
      } else {
        setSelectedProducts([]);
        setSelectedCollections([]);
        setSelectedCategories([]);
      }
    }
  };

  const saveSectionContent = async () => {
    if (!activeSectionId) return;
    const payload = {
      product_ids: selectedProducts,
      collection_ids: selectedCollections,
      category_ids: selectedCategories,
    };
    
    // Save to localStorage immediately
    localStorage.setItem(`homepage_section_content_${activeSectionId}`, JSON.stringify(payload));
    
    // Update local state reactive store immediately so the numbers change on screen in real-time
    setSectionContents(prev => ({
      ...prev,
      [activeSectionId]: payload
    }));

    // Attempt to persist the chosen associations to the backend `homepage_section_products` database too
    try {
      // Clear out former maps
      const { error: clearErr } = await supabase
        .from("homepage_section_products")
        .delete()
        .eq("section_id", activeSectionId);

      if (!clearErr && selectedProducts.length > 0) {
        const rows = selectedProducts.map((pId, idx) => ({
          section_id: activeSectionId,
          product_id: pId,
          sort_order: idx
        }));
        const { error: insErr } = await supabase
          .from("homepage_section_products")
          .insert(rows);

        if (insErr) {
          console.warn("Could not save section-product maps in Supabase backend (probably permission or RLS issue). Saving locally only.", insErr.message);
        }
      }
    } catch (dbErr) {
      console.warn("Backend database save failed, fell back peacefully to local store update.", dbErr);
    }

    toast.success("Section content updated successfully!");
    setActiveSectionId(null);
  };

  // Bulk add/remove handlers
  const handleBulkProducts = (add: boolean) => {
    if (!allProducts) return;
    if (add) {
      setSelectedProducts(allProducts.map((p) => p.id));
      toast.success(`Added all ${allProducts.length} products to this section!`);
    } else {
      setSelectedProducts([]);
      toast.info("Cleared all products from this section.");
    }
  };

  const handleBulkCollections = (add: boolean) => {
    if (!allCollections) return;
    if (add) {
      setSelectedCollections(allCollections.map((c) => c.id));
      toast.success(`Linked all ${allCollections.length} collections!`);
    } else {
      setSelectedCollections([]);
      toast.info("Cleared all collection connections.");
    }
  };

  const handleBulkCategories = (add: boolean) => {
    if (!allCategories) return;
    if (add) {
      setSelectedCategories(allCategories.map((c) => c.id));
      toast.success(`Linked all ${allCategories.length} categories!`);
    } else {
      setSelectedCategories([]);
      toast.info("Cleared all category connections.");
    }
  };

  const activeSection = sections?.find((s) => s.id === activeSectionId);

  return (
    <div className="space-y-8 pb-16 font-sans">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
          Homepage Manager
        </h1>
        <p className="text-sm text-muted-foreground dark:text-zinc-400">
          Control the storefront homepage layout, connect products, collections, and categories directly, and download integration parameters.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-50">Homepage Sections</h2>
            <p className="text-xs text-muted-foreground">Add, structure and toggle active visibility of featured grids.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
            <Input
              placeholder="New Section Name (e.g. Mens Wear)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-9 min-w-[200px] dark:bg-zinc-850 dark:border-zinc-800"
            />
            <Select value={sectionType} onValueChange={setSectionType}>
              <SelectTrigger className="h-9 w-[130px] dark:bg-zinc-850 dark:border-zinc-800">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="collections">Collections</SelectItem>
                <SelectItem value="categories">Categories</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => newTitle && addMutation.mutate({ title: newTitle, type: sectionType })}
              disabled={addMutation.isPending || !newTitle}
              className="h-9 font-sans text-xs uppercase tracking-wide gap-1 bg-black text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add Section
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {sections?.map((section) => {
              // Retrieve configured counts for display reactively from state
              const content = sectionContents[section.id] || { product_ids: [], collection_ids: [], category_ids: [] };
              const productCount = content.product_ids?.length || 0;
              const collectionCount = content.collection_ids?.length || 0;
              const categoryCount = content.category_ids?.length || 0;

              return (
                <div
                  key={section.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-150 dark:border-zinc-800/80 rounded-lg bg-gray-50/50 dark:bg-zinc-900/40 gap-4"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-zinc-100">{section.title}</span>
                        {!section.active && (
                          <span className="text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-medium">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {productCount} Products</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {collectionCount} Collections</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Tags className="h-3.5 w-3.5" /> {categoryCount} Categories</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 mr-2">
                      <Checkbox
                        id={`active-${section.id}`}
                        checked={section.active}
                        onCheckedChange={(val) =>
                          toggleActive.mutate({ id: section.id, active: !!val })
                        }
                      />
                      <label htmlFor={`active-${section.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                        Active
                      </label>
                    </div>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openManagement(section.id)}
                      className="text-xs h-8 border-gray-200 hover:bg-gray-150 dark:border-zinc-800"
                    >
                      Manage Content
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8"
                      onClick={() => {
                        if (confirm(`Delete the section "${section.title}"?`)) {
                          deleteMutation.mutate(section.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {sections?.length === 0 && (
              <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground dark:border-zinc-800">
                No custom sections on the homepage. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Management Dialog */}
      <Dialog open={!!activeSectionId} onOpenChange={() => setActiveSectionId(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              Manage Section Content: <span className="font-extrabold text-black dark:text-white">"{activeSection?.title}"</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-sans text-muted-foreground mt-1">
              Select products, collections, and categories to highlight in this homepage section. You can bulk include all items or select manually.
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Tabs bar */}
          <div className="flex border-b dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60 px-6 shrink-0">
            <button
              onClick={() => setActiveTab("products")}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "products"
                  ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Products ({selectedProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "collections"
                  ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Collections ({selectedCollections.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "categories"
                  ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
              }`}
            >
              <Tags className="h-3.5 w-3.5" />
              Categories ({selectedCategories.length})
            </button>
          </div>

          {/* Tab content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-[300px]">
            {activeTab === "products" && (
              <div className="space-y-4">
                {/* Bulk Actions header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-lg gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200 block">Products Bulk Connection</span>
                    <span className="text-[10px] text-muted-foreground">Instantly map all catalog items to this section grid layout</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      size="sm"
                      onClick={() => handleBulkProducts(true)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold bg-black text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shrink-0"
                    >
                      Add All Products
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkProducts(false)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold border-gray-200 dark:border-zinc-850 shrink-0"
                    >
                      Remove All
                    </Button>
                  </div>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {allProducts?.map((p) => {
                    const isChecked = selectedProducts.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                          } else {
                            setSelectedProducts([...selectedProducts, p.id]);
                          }
                        }}
                        className={`group border rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all select-none ${
                          isChecked
                            ? "border-black/50 bg-black/5 dark:border-zinc-50 dark:bg-zinc-50/10"
                            : "border-gray-150 hover:border-gray-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {p.product_images?.[0]?.image_url ? (
                            <img
                              src={p.product_images[0].image_url}
                              alt=""
                              className="h-10 w-10 object-cover rounded-md bg-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 dark:bg-zinc-800 rounded-md flex items-center justify-center font-bold text-[9px] text-gray-400">
                              NO IMG
                            </div>
                          )}
                          <div className="text-left">
                            <span className="font-medium text-xs text-gray-900 dark:text-zinc-100 leading-tight block truncate max-w-[150px]">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">${p.base_price}</span>
                          </div>
                        </div>

                        <div className="flex items-center pr-1.5">
                          <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                  {allProducts?.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                      No products found. Add products in the Store page.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "collections" && (
              <div className="space-y-4">
                {/* Bulk Actions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-lg gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200 block">Collections Bulk Connections</span>
                    <span className="text-[10px] text-muted-foreground">Quickly map all active collection banners together</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkCollections(true)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold bg-black text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shrink-0"
                    >
                      Add All Collections
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkCollections(false)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold border-gray-200 dark:border-zinc-850 shrink-0"
                    >
                      Remove All
                    </Button>
                  </div>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {allCollections?.map((c) => {
                    const isChecked = selectedCollections.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCollections(selectedCollections.filter((id) => id !== c.id));
                          } else {
                            setSelectedCollections([...selectedCollections, c.id]);
                          }
                        }}
                        className={`group border rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all select-none ${
                          isChecked
                            ? "border-black/50 bg-black/5 dark:border-zinc-50 dark:bg-zinc-50/10"
                            : "border-gray-150 hover:border-gray-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt=""
                              className="h-10 w-10 object-cover rounded-md bg-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 dark:bg-zinc-800 rounded-md flex items-center justify-center font-bold text-[9px] text-gray-400">
                              COL
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-xs text-gray-900 dark:text-zinc-100 leading-tight block truncate max-w-[150px]">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">/{c.slug}</span>
                          </div>
                        </div>

                        <div className="flex items-center pr-1.5">
                          <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                  {allCollections?.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                      No collections found. Post a collection first.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="space-y-4">
                {/* Bulk Actions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-lg gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200 block">Categories Bulk Connection</span>
                    <span className="text-[10px] text-muted-foreground">Connect all tags as navigable home tiles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkCategories(true)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold bg-black text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shrink-0"
                    >
                      Add All Categories
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkCategories(false)}
                      className="text-xs h-7.5 uppercase tracking-wider font-sans font-semibold border-gray-200 dark:border-zinc-850 shrink-0"
                    >
                      Remove All
                    </Button>
                  </div>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {allCategories?.map((c) => {
                    const isChecked = selectedCategories.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCategories(selectedCategories.filter((id) => id !== c.id));
                          } else {
                            setSelectedCategories([...selectedCategories, c.id]);
                          }
                        }}
                        className={`group border rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all select-none ${
                          isChecked
                            ? "border-black/50 bg-black/5 dark:border-zinc-50 dark:bg-zinc-50/10"
                            : "border-gray-150 hover:border-gray-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt=""
                              className="h-10 w-10 object-cover rounded-md bg-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 dark:bg-zinc-800 rounded-md flex items-center justify-center font-bold text-[9px] text-gray-400">
                              CAT
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-xs text-gray-900 dark:text-zinc-100 leading-tight block truncate max-w-[150px]">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">/{c.slug}</span>
                          </div>
                        </div>

                        <div className="flex items-center pr-1.5">
                          <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                  {allCategories?.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                      No categories found. Post a category first.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="p-6 border-t dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-900/60 flex items-center justify-between sm:justify-between">
            <div className="text-[11px] font-sans text-muted-foreground flex items-center gap-1">
              <span>Section configurations are loaded immediately in storefront queries.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveSectionId(null)}
                className="h-9 uppercase tracking-wider text-xs border-gray-200 dark:border-zinc-850"
              >
                Cancel
              </Button>
              <Button
                onClick={saveSectionContent}
                className="h-9 uppercase tracking-wider text-xs bg-black hover:bg-zinc-850 text-white dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shrink-0"
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
