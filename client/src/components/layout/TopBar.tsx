import { useNavigate, NavLink } from "react-router-dom";
import { Plane } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function TopBar() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();

  const [profileUrl, setProfileUrl] = useState<string | undefined>(
    user?.profilePicture
  );

  useEffect(() => {
    let active = true;
    if (!isLoggedIn) {
      setProfileUrl(undefined);
      return;
    }
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        const u = res.data?.user;
        if (active) setProfileUrl(u?.profilePicture || user?.profilePicture);
      } catch {
        // ignore, fallback will render
      }
    })();
    return () => {
      active = false;
    };
  }, [isLoggedIn, user?.profilePicture]);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/planning", label: "Planning" },
    { to: "/my-trips", label: "My Trips" },
    { to: "/community", label: "Community" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/90 border-b border-border/60">
      <div className="w-full px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-semibold text-primary focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient shadow-sm">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg tracking-wider">GlobeTrotter</span>
          </button>
        </div>
        <div className="flex items-center gap-5">
          {isLoggedIn ? (
            <>
              <Button
                className="text-black bg-transparent hover:bg-muted"
                onClick={() => navigate("/Home")}
              >
                Home
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none rounded-md hover:bg-muted px-2 py-1">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profileUrl || ""} alt="User avatar" />
                      <AvatarFallback>
                        {(
                          user?.firstName?.[0] ||
                          user?.lastName?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block text-sm font-medium max-w-[140px] truncate">
                      {user?.firstName || user?.email || "Profile"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate("/", { replace: true });
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                className="text-black bg-transparent hover:bg-muted"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
              <Button
                className="bg-hero-gradient hover:opacity-90"
                onClick={() => navigate("/register")}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
