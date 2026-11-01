import { type PropsWithChildren } from "react";
import { useSegments } from "expo-router";

import { PrivateContentGate } from "@/components/auth-gate";
import { AppScreen } from "@/components/app-ui";
import { usePerformAuth } from "@/lib/perform-auth";

const PRIVATE_ROOTS = new Set(["rehearse", "results", "payments", "practice-questions", "audience-simulation", "script"]);

export function PrivateRouteBoundary({ children }: PropsWithChildren) {
  const { ready, isAuthenticated } = usePerformAuth();
  const segments = useSegments();
  const isPrivateRoute = segments.some((segment) => PRIVATE_ROOTS.has(segment));
  if (isPrivateRoute && (!ready || !isAuthenticated)) {
    return <AppScreen><PrivateContentGate title="Private access required." body="Log in before opening private rehearsal material, payment verification, results, or account-only tools." /></AppScreen>;
  }
  return children;
}
