import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getProducts,
  deleteProduct,
  updateProductStatus,
} from "@/lib/api/products";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // wait, didn't add switch. I will use checkbox or add switch.
import { Loader2, MoreHorizontal, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import HomepageSectionSelector from "@/components/HomepageSectionSelector";
import { supabase } from "@/lib/supabase";

export default function ProductsList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [homeSelectProductId, setHomeSelectProductId] = useState<string | null>(null);

  // Load homepage sections to match active homepage placements on product rows
  const { data: homeSections } = useQuery({
    queryKey: ["homepage_sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const getProductPlacements = (productId: string) => {
    if (!homeSections) return [];
    return homeSections.filter((section) => {
      const saved = localStorage.getItem(`homepage_section_content_${section.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return (parsed.product_ids || []).includes(productId);
        } catch (e) {
          return false;
        }
      }
      return false;
    });
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateProductStatus(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product");
    },
  });

  const filteredProducts =
    products?.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.slug?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product inventory and variants.
          </p>
        </div>
        <Link to="/products/new" className={cn(buttonVariants(), "uppercase tracking-wide text-xs")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-md border text-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product: any) => {
                const totalStock =
                  product.variants?.reduce(
                    (acc: number, v: any) => acc + (v.stock || 0),
                    0,
                  ) || 0;

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <span className="block font-semibold">{product.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {product.featured && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-gray-100 dark:bg-zinc-850 text-gray-800 dark:text-zinc-200">
                              Featured
                            </Badge>
                          )}
                          {getProductPlacements(product.id).map((sec) => (
                            <span 
                              key={sec.id} 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/45"
                              title={`Visible in homepage section: ${sec.title}`}
                            >
                              <Sparkles className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
                              {sec.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name || "-"}</TableCell>
                    <TableCell>₹{product.base_price}</TableCell>
                    <TableCell>
                      {totalStock > 0 ? (
                        <span>{totalStock} in stock</span>
                      ) : (
                        <span className="text-red-500 font-medium">
                          Out of stock
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem render={<Link to={`/products/${product.id}`} />}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: product.id,
                                updates: { active: !product.active },
                              })
                            }
                          >
                            {product.active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 cursor-pointer"
                            onClick={() => setHomeSelectProductId(product.id)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Home Screen Visibility
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => setDeleteId(product.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Product"
        description="Are you sure you want to delete this product? All image records, metadata, and variants associated with this product will also be deleted."
        isDeleting={deleteMutation.isPending}
      />

      <Dialog open={!!homeSelectProductId} onOpenChange={(open) => !open && setHomeSelectProductId(null)}>
        <DialogContent className="sm:max-w-md dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Home Screen Placement</DialogTitle>
            <DialogDescription>
              Assign <strong>{products?.find((x: any) => x.id === homeSelectProductId)?.name}</strong> directly to homepage sections.
            </DialogDescription>
          </DialogHeader>
          {homeSelectProductId && (
            <div className="py-4">
              <HomepageSectionSelector itemId={homeSelectProductId} type="products" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
