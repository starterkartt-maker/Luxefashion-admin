import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search } from "lucide-react";

export default function CustomersList() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading, error, isError } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      // 1. Fetch raw profiles list
      let profileList: any[] = [];
      try {
        const { data, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (profileErr) {
          console.warn("Failed to select from profiles table directly:", profileErr);
        } else {
          profileList = data || [];
        }
      } catch (e) {
        console.warn("Profiles fetch thrown:", e);
      }

      // 2. Fetch orders list with profiles to merge and find profiles that are attached to active orders
      let ordersList: any[] = [];
      try {
        const { data, error: ordersErr } = await supabase
          .from("orders")
          .select(`
            *,
            profile:profiles(*)
          `);
        
        if (ordersErr) {
          console.warn("Failed to select from orders table:", ordersErr);
        } else {
          ordersList = data || [];
        }
      } catch (e) {
        console.warn("Orders fetch thrown:", e);
      }

      // 3. Merge profiles and orders data so that we build a comprehensive customer list
      // Map of profile ID -> profile object
      const profileMap = new Map<string, any>();

      // Store fetched profiles first
      profileList.forEach((prof: any) => {
        profileMap.set(prof.id, {
          ...prof,
          orders: []
        });
      });

      // Link profiles from orders
      ordersList.forEach((order: any) => {
        const prof = order.profile;
        const profileId = order.profile_id || order.user_id || prof?.id;
        
        if (profileId) {
          if (!profileMap.has(profileId)) {
            profileMap.set(profileId, {
              id: profileId,
              first_name: prof?.first_name || "Guest",
              last_name: prof?.last_name || "Customer",
              email: prof?.email || "no-email@example.com",
              phone: prof?.phone || "",
              created_at: prof?.created_at || order.created_at,
              orders: []
            });
          }
          
          const existing = profileMap.get(profileId);
          const hasOrder = existing.orders.some((o: any) => o.id === order.id);
          if (!hasOrder) {
            existing.orders.push({
              id: order.id,
              total_amount: order.total_amount,
              created_at: order.created_at
            });
          }
        }
      });

      return Array.from(profileMap.values());
    },
  });

  const filteredCustomers =
    customers?.filter(
      (c: any) =>
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.last_name?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Manage your customer base and view their lifetime values.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers..."
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
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-red-500 bg-red-50/50 p-4">
                  <div className="max-w-md mx-auto text-xs space-y-1">
                    <p className="font-semibold">Failed to load customer list.</p>
                    <p className="text-gray-500 font-mono text-[10px]">{(error as any)?.message || String(error)}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c: any) => {
                const totalOrders = c.orders?.length || 0;
                const totalSpent =
                  c.orders?.reduce(
                    (sum: number, o: any) => sum + (o.total_amount || 0),
                    0,
                  ) || 0;
                const initials =
                  (
                    (c.first_name?.[0] || "") + (c.last_name?.[0] || "")
                  ).toUpperCase() ||
                  c.email?.[0]?.toUpperCase() ||
                  "?";

                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-100 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {c.first_name} {c.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell className="text-right">{totalOrders}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{totalSpent.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
