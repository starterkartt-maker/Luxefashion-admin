import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileText,
  IndianRupee,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_full_stats"],
    queryFn: async () => {
      // Fetch core aggregates
      const [
        { data: ordersData },
        { count: customersCount },
        { count: productsCount },
        { data: lowStockVariants },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, created_at, status")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase
          .from("product_variants")
          .select("id, sku, stock, product:products(name)")
          .lt("stock", 10)
          .order("stock", { ascending: true })
          .limit(5),
      ]);

      const orders = ordersData || [];
      const revenue = orders.reduce(
        (acc, order) => acc + (order.total_amount || 0),
        0,
      );

      // Calculate revenue over time (last 7 days mapping)
      const revenueMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        revenueMap[format(subDays(new Date(), i), "MMM dd")] = 0;
      }

      orders.forEach((order) => {
        if (order.created_at) {
          const dateStr = format(parseISO(order.created_at), "MMM dd");
          if (revenueMap[dateStr] !== undefined) {
            revenueMap[dateStr] += order.total_amount || 0;
          }
        }
      });

      const chartData = Object.keys(revenueMap).map((date) => ({
        date,
        revenue: revenueMap[date],
      }));

      const recentOrders = orders.slice(0, 5);

      return {
        revenue,
        ordersCount: orders.length,
        customersCount: customersCount || 0,
        productsCount: productsCount || 0,
        chartData,
        recentOrders,
        lowStockVariants: lowStockVariants || [],
      };
    },
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {data?.revenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.ordersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.customersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.productsCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>7-day revenue performance</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#eee"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#888" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#888" }}
                  tickFormatter={(v) => `₹${v}`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    `₹${value.toFixed(2)}`,
                    "Revenue",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#000"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#000" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent orders.
                  </p>
                ) : (
                  data?.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          Order #{order.id.substring(0, 6)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(order.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          ₹{order.total_amount?.toFixed(2)}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] uppercase"
                        >
                          {order.status || "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.lowStockVariants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Inventory is healthy.
                  </p>
                ) : (
                  data?.lowStockVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between"
                    >
                      <div className="truncate pr-4">
                        <p className="text-sm font-medium truncate">
                          {(variant.product as any)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {variant.sku}
                        </p>
                      </div>
                      <Badge
                        variant={
                          variant.stock === 0 ? "destructive" : "secondary"
                        }
                      >
                        {variant.stock} left
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
