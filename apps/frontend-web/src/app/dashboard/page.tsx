"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStoredToken } from "@/lib/auth-storage";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
    } else {
      router.replace("/expedientes");
    }
  }, [router]);

  return (
    <main className="grid min-h-screen
      place-items-center bg-brand-neutral px-6">
      <p className="text-sm font-medium
        text-brand-muted" role="status">
        Redirigiendo...
      </p>
    </main>
  );
}
