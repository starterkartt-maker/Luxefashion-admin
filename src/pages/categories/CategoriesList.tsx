import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
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
import { Loader2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesList() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">Categories</h1>
          <p className="text-sm text-muted-foreground dark:text-zinc-400">
            Manage your product categories (e.g. Men, Women, Shoes).
          </p>
        </div>
        <Link to="/categories/new" className={cn(buttonVariants(), "uppercase tracking-wide text-xs bg-black text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200")}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-250 dark:border-zinc-800 text-sm overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-zinc-900/50">
            <TableRow className="border-b border-gray-250 dark:border-zinc-800">
              <TableHead className="py-3 text-gray-700 dark:text-zinc-300">Image</TableHead>
              <TableHead className="py-3 text-gray-700 dark:text-zinc-300">Name</TableHead>
              <TableHead className="py-3 text-gray-700 dark:text-zinc-300">Slug</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground dark:text-zinc-500"
                >
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((c: any) => (
                <TableRow key={c.id} className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-850/45">
                  <TableCell>
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-10 h-10 object-cover rounded-md bg-gray-100 dark:bg-zinc-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-zinc-800" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-gray-950 dark:text-zinc-150">{c.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-zinc-400 font-mono text-xs">/{c.slug}</TableCell>
                  <TableCell align="right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-zinc-800" />}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-zinc-900 dark:border-zinc-800">
                        <DropdownMenuLabel className="dark:text-zinc-300">Actions</DropdownMenuLabel>
                        <DropdownMenuItem render={<Link to={`/categories/${c.id}`} />} className="dark:hover:bg-zinc-800 dark:text-zinc-200">
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="dark:bg-zinc-800" />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400 dark:hover:bg-red-950/20"
                          onClick={() => setDeleteId(c.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
        title="Delete Category"
        description="Are you sure you want to delete this category? All products using this category will no longer have it set as their primary category."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
