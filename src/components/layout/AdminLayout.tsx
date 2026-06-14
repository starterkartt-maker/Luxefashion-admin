import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { Loader } from "@/components/ui/loader";
import {
  LayoutDashboard,
  Package,
  Layers,
  Tags,
  Image as ImageIcon,
  Megaphone,
  ShoppingCart,
  Users,
  Star,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Collections", href: "/collections", icon: Layers },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Homepage", href: "/homepage", icon: ImageIcon },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Reviews", href: "/reviews", icon: Star },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AdminLayout() {
  const { session, isAdmin, isLoading, signOut } = useAuth();
  const location = useLocation();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen">
        <Loader />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfb] dark:bg-zinc-950 text-foreground">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
        <div className="flex items-center h-16 shrink-0 px-6 border-b border-gray-100 dark:border-zinc-850">
          <h1 className="text-lg font-semibold tracking-widest uppercase text-gray-900 dark:text-zinc-50">
            Luxe Fashion
          </h1>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  isActive
                    ? "bg-black text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-zinc-50",
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                )}
              >
                <item.icon
                  className={cn(
                    isActive
                      ? "text-white dark:text-zinc-950"
                      : "text-gray-400 group-hover:text-black dark:group-hover:text-zinc-50",
                    "flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
          {/* Theme switcher */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800/80">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-400">Theme</span>
            <div className="flex items-center bg-gray-200/60 dark:bg-zinc-800 rounded-md p-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "p-1 rounded-md transition-all",
                  theme === "light"
                    ? "bg-white text-yellow-500 shadow-xs"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                )}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-1 rounded-md transition-all",
                  theme === "dark"
                    ? "bg-zinc-950 text-blue-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 w-full h-full">
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
