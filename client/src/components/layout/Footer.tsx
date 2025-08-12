import { Link, useNavigate } from "react-router-dom";
import { Plane } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const { isLoggedIn } = useAuth();
  return (
    <footer className="border-t backdrop-blur supports-[backdrop-filter]:bg-card/70 text-sm">
      <div className="mx-auto w-full pr-40 pl-40">
        {isLoggedIn ? (
          <div className="w-full flex flex-col">
            <div className="w-full flex flex-row items-end justify-between py-6">
              {/* Logo */}
              <div className="flex flex-col items-start">
                <button
                  onClick={() => navigate("/")}
                  className="flex pb-10 items-center gap-2 font-semibold text-primary focus:outline-none"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hero-gradient shadow">
                    <Plane className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl tracking-wider font-bold">
                    GlobeTrotter
                  </span>
                </button>
              </div>
              {/* Product & Company Columns */}
              <div className="flex flex-row gap-16">
                <div className="flex flex-col items-start">
                  <h4 className="font-semibold text-foreground text-base mb-2">
                    Product
                  </h4>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        to="/dashboard"
                        className="hover:text-foreground transition-colors"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/new-trip"
                        className="hover:text-foreground transition-colors"
                      >
                        Plan a Trip
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/my-trips"
                        className="hover:text-foreground transition-colors"
                      >
                        My Trips
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/community"
                        className="hover:text-foreground transition-colors"
                      >
                        Community
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="font-semibold text-foreground text-base mb-2">
                    Company
                  </h4>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        to="/profile"
                        className="hover:text-foreground transition-colors"
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/settings"
                        className="hover:text-foreground transition-colors"
                      >
                        Settings
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="w-full border-t border-muted" />
            <div className="w-full text-xs text-muted-foreground text-center py-2">
              <span>© {year} GlobeTrotter. All rights reserved.</span>
              <span className="mx-2">|</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                MIT Licensed
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            <div className="w-full flex flex-row items-end justify-between py-6">
              {/* Logo */}
              <div className="flex flex-col items-start">
                <button
                  onClick={() => navigate("/")}
                  className="flex pb-4 items-center gap-2 font-semibold text-primary focus:outline-none"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hero-gradient shadow">
                    <Plane className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl tracking-wider font-bold">
                    GlobeTrotter
                  </span>
                </button>
              </div>
              {/* Product Column Only */}
              <div className="flex flex-row gap-16">
                <div className="flex flex-col items-start pb-3">
                  <ul className="space-y-3">
                    <li>
                      <Link
                        to="/login"
                        className="hover:text-foreground transition-colors font-semibold"
                      >
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/register"
                        className="hover:text-foreground transition-colors font-semibold"
                      >
                        Get Started
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="w-full border-t border-muted" />
            <div className="w-full text-xs text-muted-foreground text-center py-5">
              <span>© {year} GlobeTrotter. All rights reserved.</span>
              <span className="mx-2">|</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                MIT Licensed
              </span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
