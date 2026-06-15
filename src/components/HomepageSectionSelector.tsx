import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface HomepageSectionSelectorProps {
  itemId: string | undefined;
  type: "products" | "collections" | "categories";
  className?: string;
}

export default function HomepageSectionSelector({
  itemId,
  type,
  className = "",
}: HomepageSectionSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});

  // 1. Fetch available homepage sections
  const { data: sections, isLoading } = useQuery({
    queryKey: ["homepage_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate localKey mapping
  const getPayloadKey = () => {
    switch (type) {
      case "products":
        return "product_ids";
      case "collections":
        return "collection_ids";
      case "categories":
        return "category_ids";
    }
  };

  // 2. Load initially selected sections for this item
  useEffect(() => {
    if (!sections || !itemId) return;

    const initialMap: Record<string, boolean> = {};
    const key = getPayloadKey();

    sections.forEach((section: any) => {
      const saved = localStorage.getItem(`homepage_section_content_${section.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const list = parsed[key] || [];
          initialMap[section.id] = list.includes(itemId);
        } catch (e) {
          initialMap[section.id] = false;
        }
      } else {
        initialMap[section.id] = false;
      }
    });

    setSelectedSections(initialMap);
  }, [sections, itemId, type]);

  // Handle section inclusion toggle
  const handleToggle = async (sectionId: string, isChecked: boolean) => {
    if (!itemId) {
      toast.error("Please save the item first before adding it to homepage sections.");
      return;
    }

    const key = getPayloadKey();
    const storedKey = `homepage_section_content_${sectionId}`;
    const saved = localStorage.getItem(storedKey);
    let payload: Record<string, string[]> = {
      product_ids: [],
      collection_ids: [],
      category_ids: [],
    };

    if (saved) {
      try {
        payload = { ...payload, ...JSON.parse(saved) };
      } catch (e) {
        // use default empty arrays
      }
    }

    const currentList = payload[key] || [];
    let newList: string[] = [];

    if (isChecked) {
      if (!currentList.includes(itemId)) {
        newList = [...currentList, itemId];
      } else {
        newList = currentList;
      }
    } else {
      newList = currentList.filter((id) => id !== itemId);
    }

    payload[key] = newList;

    // Save to localStorage immediately
    localStorage.setItem(storedKey, JSON.stringify(payload));

    // Update frontend state reactively
    setSelectedSections((prev) => ({
      ...prev,
      [sectionId]: isChecked,
    }));

    // Invalidate react-query so other screens fetch the updated list if open
    queryClient.invalidateQueries({ queryKey: ["homepage_sections"] });

    // Try to sync with Supabase database if it's a product
    if (type === "products") {
      try {
        const { error: clearErr } = await supabase
          .from("homepage_section_products")
          .delete()
          .eq("section_id", sectionId)
          .eq("product_id", itemId);

        if (!clearErr && isChecked) {
          await supabase.from("homepage_section_products").insert({
            section_id: sectionId,
            product_id: itemId,
            sort_order: newList.indexOf(itemId),
          });
        }
      } catch (err) {
        console.warn("DB syncing failed; relying on browser state.", err);
      }
    }

    toast.success(
      isChecked
        ? `Added successfully to "${sections?.find((s) => s.id === sectionId)?.title}"!`
        : `Removed from "${sections?.find((s) => s.id === sectionId)?.title}"`
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
        <Loader2 className="h-4 w-4 animate-spin text-black dark:text-zinc-50" />
        <span>Loading homepage sections...</span>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
        ⚠️ No homepage sections configured yet. Add some sections in your{" "}
        <span className="font-semibold underline">Homepage Manager</span> to display this item on the frontpage.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
        <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-50">
          Add to Homepage Sections
        </h3>
      </div>
      <p className="text-xs text-muted-foreground dark:text-zinc-400">
        Toggle which homepage container grid/slider you want this item to appear under.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {sections.map((section) => {
          const isChecked = !!selectedSections[section.id];
          return (
            <div
              key={section.id}
              className={`flex items-center space-x-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                isChecked
                  ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/60"
                  : "bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30"
              }`}
              onClick={() => handleToggle(section.id, !isChecked)}
            >
              <Checkbox
                id={`home-sec-${section.id}`}
                checked={isChecked}
                onCheckedChange={(val) => handleToggle(section.id, !!val)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0 pr-1">
                <Label
                  htmlFor={`home-sec-${section.id}`}
                  className="font-medium text-xs text-gray-900 dark:text-zinc-200 block truncate cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {section.title}
                </Label>
                <span className="text-[10px] text-muted-foreground dark:text-zinc-500 font-mono">
                  {section.active ? "● Visible" : "Draft"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
