import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const initSession = async () => {
    try {
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        await checkAdminStatus(initialSession.user);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Auth init session failed:", err);
      const errMsg = err?.message || String(err);
      if (
        errMsg.toLowerCase().includes("failed to fetch") ||
        errMsg.toLowerCase().includes("networkerror") ||
        errMsg.toLowerCase().includes("fetch")
      ) {
        setConnectionError(errMsg);
      }
      setIsLoading(false);
      setSession(null);
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        try {
          await checkAdminStatus(currentSession.user);
        } catch (err: any) {
          console.error("onAuthStateChange admin check failed:", err);
        }
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (sessionUser: User) => {
    setIsLoading(true);
    let admin = false;

    try {
      // 1. Get current authenticated user to be absolutely sure
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
         console.warn("[Auth] No authenticated user found in checkAdminStatus.");
         setIsAdmin(false);
         setIsLoading(false);
         return;
      }

      // Log the authenticated UID
      console.log("AUTH USER ID:", user.id);

      // Primary check: query admin_users table directly using user_id
      const { data: adminData, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("ADMIN QUERY RESULT:", adminData);
      console.log("ADMIN ERROR:", error);

      if (adminData && !error) {
        admin = true;
      }

      // Fallback: check RPC if table fails
      if (!admin) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc("is_admin");
          console.log("[Auth] Admin query result (RPC):", { rpcData, rpcError });
          if (!rpcError && rpcData) {
            admin = true;
          }
        } catch (e) {
          console.error("[Auth] Error checking RPC is_admin:", e);
        }
      }

    } catch (e) {
      console.error("[Auth] Unexpected error during admin check:", e);
    }

    console.log("[Auth] Final admin status determined:", admin);
    setIsAdmin(admin);
    setIsLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (connectionError) {
    const supabaseUrlEnv = (import.meta as any).env.VITE_SUPABASE_URL || "https://dqhtktvaocnwavvaqzie.supabase.co";
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Database Offline</h2>
            <p className="mt-2 text-sm text-gray-500">
              The application could not establish a connection to your Supabase database.
            </p>
          </div>

          <div className="space-y-4 rounded-lg bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
            <div className="font-semibold text-gray-800 uppercase tracking-wider">Likely Causes & Fixes:</div>
            <ul className="list-disc pl-4 space-y-2">
              <li>
                <strong>Paused Project (Most Common):</strong> In Free tier, Supabase automatically pauses inactive projects after a week of sleep. Log into your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-black font-semibold underline hover:text-neutral-800">Supabase Dashboard</a> and click <strong>"Restore Project"</strong>.
              </li>
              <li>
                <strong>Wrong Variable Credentials:</strong> Make sure your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> are correctly configured inside your Environment Settings.
              </li>
              <li>
                <strong>Local Network Block:</strong> Check if a VPN or corporate proxy is blocking external requests.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setConnectionError(null);
                setIsLoading(true);
                initSession();
              }}
              className="flex w-full justify-center rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus:outline-none transition-colors"
            >
              Retry Connection
            </button>
          </div>

          <div className="text-center font-mono text-[9px] text-gray-400 select-all truncate">
            URL: {supabaseUrlEnv}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ session, user, isAdmin, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
