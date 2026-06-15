import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, Sparkles, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function OrdersList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSampleOrders = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Connecting to store database...");

    try {
      // 1. Fetch products to build orders containing real items
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, name, base_price")
        .limit(6);

      if (prodErr) throw new Error("Could not find products catalog: " + prodErr.message);

      if (!products || products.length === 0) {
        toast.error("Please add some products in the Products section before creating sample orders.", { id: toastId });
        setIsGenerating(false);
        return;
      }

      // 2. Fetch or create mock profiles
      let profilesToUse: any[] = [];
      const { data: existingProfs } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .limit(5);

      if (existingProfs && existingProfs.length > 0) {
        profilesToUse = existingProfs;
      } else {
        // Try inserting mock profiles
        const mockCustomers = [
          { name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 98123 45678" },
          { name: "Ananya Sharma", email: "ananya.sharma@example.com", phone: "+91 99123 45678" },
          { name: "Kabir Malhotra", email: "kabir.m@example.com", phone: "+91 97123 45678" }
        ];

        for (const c of mockCustomers) {
          const profileId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
            const r = Math.random() * 16 | 0, v = ch === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

          const { data: newProf, error: profErr } = await supabase
            .from("profiles")
            .insert({
              id: profileId,
              email: c.email,
              full_name: c.name,
              phone: c.phone
            })
            .select()
            .single();

          if (!profErr && newProf) {
            profilesToUse.push(newProf);
          }
        }
      }

      // Ultimate fallback
      if (profilesToUse.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          profilesToUse.push({
            id: user.id,
            email: user.email,
            full_name: "Admin Tester"
          });
        } else {
          profilesToUse.push({
            id: "00000000-0000-0000-0000-000000000000",
            email: "guest@example.com",
            full_name: "Guest Tester"
          });
        }
      }

      toast.loading("Generating 5 realistic orders...", { id: toastId });

      const statuses = ["pending", "confirmed", "shipped", "delivered"];
      const payMethods = ["cod", "razorpay"];

      // 3. Create 5 sample orders
      for (let i = 0; i < 5; i++) {
        const profile = profilesToUse[Math.floor(Math.random() * profilesToUse.length)];
        const itemsCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 items
        
        const selectedProducts: any[] = [];
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        for (let j = 0; j < Math.min(itemsCount, shuffled.length); j++) {
          selectedProducts.push(shuffled[j]);
        }

        let total = 0;
        const itemsPayload = selectedProducts.map(p => {
          const qty = Math.floor(Math.random() * 2) + 1;
          const price = p.base_price || 999;
          total += qty * price;
          return {
            product_id: p.id,
            quantity: qty,
            unit_price: price
          };
        });

        const { data: order, error: ordErr } = await supabase
          .from("orders")
          .insert({
            user_id: profile.id,
            total_amount: total,
            subtotal: total,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            payment_status: "paid",
            payment_method: payMethods[Math.floor(Math.random() * payMethods.length)],
            created_at: new Date(Date.now() - Math.floor(Math.random() * 6) * 86400000).toISOString()
          })
          .select()
          .single();

        if (ordErr) {
          console.warn("Could not insert order: ", ordErr.message);
          continue;
        }

        if (order) {
          const itemsToInsert = itemsPayload.map(item => ({
            ...item,
            order_id: order.id
          }));

          const { error: itemsErr } = await supabase
            .from("order_items")
            .insert(itemsToInsert);

          if (itemsErr) {
            console.warn("Could not insert order items: ", itemsErr.message);
          }
        }
      }

      toast.success("Successfully generated and populated 5 demo orders!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_full_stats"] });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate orders: " + (err.message || String(err)), { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          address:addresses(*),
          items:order_items(*, product:products(name))
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) return [];

      const userIds = Array.from(new Set(ordersData.map((o: any) => o.user_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, phone, full_name, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.warn("Could not load profiles for orders:", profilesError.message);
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.id] = profile;
          });
        }
      }

      return ordersData.map((o: any) => ({
        ...o,
        profile: profilesMap[o.user_id] || {
          email: "guest@example.com",
          full_name: "Guest Customer",
        },
      }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated");
    },
  });

  const filteredOrders =
    orders?.filter(
      (o: any) =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
        o.profile?.full_name?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "shipped":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage and process customer orders.
          </p>
        </div>
        
        {orders && orders.length > 0 && (
          <Button
            onClick={handleGenerateSampleOrders}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            )}
            Populate Demo Orders
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders, emails..."
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
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-80 text-center p-8">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-full border border-amber-200/50 dark:border-amber-900/30">
                      <ShoppingBag className="h-8 w-8 text-amber-600 dark:text-amber-450 animate-bounce" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-gray-900 dark:text-zinc-50 text-base">
                        No orders in the database
                      </h3>
                      <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                        There are currently no rows in your Supabase <code>orders</code> database table. Seed realistic test orders instantly to test order metrics, client invoices, state updates, and overview performance!
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateSampleOrders}
                      disabled={isGenerating}
                      className="bg-black text-white dark:bg-amber-600 dark:hover:bg-amber-700 hover:bg-neutral-800 transition-colors uppercase tracking-wider text-xs font-semibold py-2 px-5 mt-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          Populating orders...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-2 text-yellow-300 animate-pulse" />
                          Generate 5 Sample Orders
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">
                    {o.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {o.profile?.full_name || "Guest Customer"}
                    <div className="text-xs text-muted-foreground">
                      {o.profile?.email}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ₹{o.total_amount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(o.status)}
                    >
                      {o.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <Dialog>
                      <DialogTrigger render={<Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(o)}
                        />}>
                          <Eye className="h-4 w-4 mr-2" /> View
                      </DialogTrigger>
                      {selectedOrder?.id === o.id && (
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="uppercase tracking-widest text-sm flex justify-between items-center pr-4">
                              <span>Order Details</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                #{o.id}
                              </span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-semibold mb-2">
                                  Customer Info
                                </h4>
                                <p>
                                  {o.profile?.full_name || "Guest Customer"}
                                </p>
                                <p className="text-muted-foreground">
                                  {o.profile?.email}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">
                                  Shipping Address
                                </h4>
                                {o.address ? (
                                  <div className="text-muted-foreground">
                                    <p>{o.address.address_line_1}</p>
                                    {o.address.address_line_2 && (
                                      <p>{o.address.address_line_2}</p>
                                    )}
                                    <p>
                                      {o.address.city}, {o.address.state}{" "}
                                      {o.address.postal_code}
                                    </p>
                                    <p>{o.address.country}</p>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground italic">
                                    No address attached
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3 text-sm">
                                Update Status
                              </h4>
                              <Select
                                value={o.status || "pending"}
                                onValueChange={(val) =>
                                  updateStatusMutation.mutate({
                                    id: o.id,
                                    status: val,
                                  })
                                }
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pending
                                  </SelectItem>
                                  <SelectItem value="confirmed">
                                    Confirmed
                                  </SelectItem>
                                  <SelectItem value="packed">Packed</SelectItem>
                                  <SelectItem value="shipped">
                                    Shipped
                                  </SelectItem>
                                  <SelectItem value="delivered">
                                    Delivered
                                  </SelectItem>
                                  <SelectItem value="cancelled">
                                    Cancelled
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3 text-sm">
                                Items Ordered
                              </h4>
                              <div className="border rounded-md divide-y">
                                {o.items?.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center p-3 text-sm"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {item.product?.name ||
                                          `Product ID: ${item.product_id}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground text-[10px] mt-1 space-x-2">
                                        {item.variant_id && (
                                          <span>
                                            Variant:{" "}
                                            {item.variant_id.substring(0, 6)}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p>
                                        {item.quantity} × ₹{item.unit_price ?? item.price ?? 0}
                                      </p>
                                      <p className="font-medium mt-1">
                                        ₹{item.quantity * (item.unit_price ?? item.price ?? 0)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 text-right flex flex-col items-end text-sm">
                                <div className="flex gap-8 py-1">
                                  <span className="text-muted-foreground">
                                    Subtotal
                                  </span>{" "}
                                  <span>₹{o.total_amount}</span>
                                </div>
                                <div className="flex gap-8 py-1">
                                  <span className="text-muted-foreground">
                                    Shipping
                                  </span>{" "}
                                  <span>₹0.00</span>
                                </div>
                                <div className="flex gap-8 py-1 font-bold text-base mt-2 border-t pt-2">
                                  <span>Total</span>{" "}
                                  <span>₹{o.total_amount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
