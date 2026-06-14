import React, { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    // Only stop loading if auth is done establishing admin status
    if (!authLoading && loading) {
      if (session && isAdmin) {
        console.log("[Auth] Setup complete, user is admin. Redirecting...");
      } else {
        console.log("[Auth] Auth check complete. Not an admin or not logged in.");
      }
      setLoading(false);
    }
  }, [session, authLoading, isAdmin, loading]);

  if (session && isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Check admin status is handled in AuthProvider, but we wait for it
      // via the useEffect above.
    } catch (e) {
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md border-0 shadow-lg px-2 py-4 sm:px-4">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-widest uppercase">
            Luxe Fashion
          </CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@luxefashion.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        {session && !isAdmin && (
          <CardFooter className="flex-col gap-2">
            <p className="text-sm text-red-500 text-center w-full">
              Access Denied: You do not have administrator privileges.
            </p>
            <Button variant="ghost" className="w-full" onClick={() => signOut()}>
              Sign out and try another account
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
