import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface AutoAuthGateProps {
  children: (ctx: { isLoggedIn: boolean }) => ReactNode;
}

export function AutoAuthGate({ children }: AutoAuthGateProps) {
  const { loading, isLoggedIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children({ isLoggedIn })}</>;
}
