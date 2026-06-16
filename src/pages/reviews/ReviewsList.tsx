import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ReviewsList() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          product:products(name)
        `)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      const userIds = Array.from(new Set(reviewsData.map((r: any) => r.user_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, phone, full_name")
          .in("id", userIds);

        if (profilesError) {
          console.warn("Could not load profiles for reviews:", profilesError.message);
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
        }
      }

      return reviewsData.map((r: any) => ({
        ...r,
        profile: profilesMap[r.user_id] || {
          email: r.email || "guest@example.com",
          full_name: r.reviewer_name || "Guest Customer",
        },
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Moderate product reviews submitted by customers.
        </p>
      </div>

      <div className="bg-white rounded-md border text-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="max-w-[300px]">Review</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
           <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500 font-semibold">
                  Error loading reviews: {(error as any).message || String(error)}
                </TableCell>
              </TableRow>
            ) : reviews?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">
                          {r.profile?.full_name || "Guest Customer"}
                        </span>
                        {r.verified_purchase && (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-green-500"
                            title="Verified Purchase"
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.profile?.email || "No email available"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{r.product?.name || "Deleted Product"}</TableCell>
                  <TableCell>
                    <div className="flex text-amber-450 drop-shadow-sm">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < r.rating ? "fill-current" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[320px]"
                  >
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 break-words whitespace-pre-wrap leading-relaxed">
                      {r.review_text || r.comment || <span className="italic text-muted-foreground text-[11px]">No comment left</span>}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
        title="Delete Review"
        description="Are you sure you want to delete this customer review? It will be permanently deleted and no longer visible on the storefront."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
