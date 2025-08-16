import { useState, useMemo, useRef, useEffect } from "react";
import { WelcomeModal } from "@/components/WelcomeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Plane,
  MapPin,
  Calendar,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import heroTravelImage from "@/assets/hero-travel.jpg";
import { useTrips } from "@/context/TripContext";
import { TripCard } from "@/components/dashboard/TripCard";
import { fetchPublicTrips } from "@/lib/tripService";
import { Trip } from "@/context/TripContext";

export default function Home() {
  const { isLoggedIn, user, logout } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(!isLoggedIn);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const navigate = useNavigate();
  const { trips } = useTrips();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [publicTrips, setPublicTrips] = useState<Trip[]>([]);
  const [loadingPublicTrips, setLoadingPublicTrips] = useState(true);
  const [publicTripsError, setPublicTripsError] = useState<string | null>(null);

  // Robust loader with retry + timeout. Avoids infinite spinner if first attempt fails or hangs.
  useEffect(() => {
    const hasRunRef = { current: false } as { current: boolean };
    if (hasRunRef.current) return; // guards against double-invoke in StrictMode
    hasRunRef.current = true;

    let cancelled = false;
    let attempts = 0;

    const mapBackend = (backendTrips: any[]): Trip[] =>
      backendTrips
        .map((bt: any) => {
          try {
            return {
              id: bt._id || bt.id,
              title: bt.name || bt.title || "Untitled Trip",
              destination: bt.destination || bt.name || bt.title || "Unknown",
              startDate: bt.startDate
                ? String(bt.startDate).substring(0, 10)
                : "",
              endDate: bt.endDate ? String(bt.endDate).substring(0, 10) : "",
              startTime: bt.startTime,
              endTime: bt.endTime,
              status: ((): any => {
                if (!bt.startDate || !bt.endDate) return "upcoming";
                const now = new Date();
                const s = new Date(bt.startDate);
                const e = new Date(bt.endDate);
                if (now < s) return "upcoming";
                if (now > e) return "completed";
                return "ongoing";
              })(),
              budget: bt.budget ?? bt.plannedBudget ?? 0,
              plannedBudget: bt.plannedBudget,
              participants: bt.participants || 1,
              suggestions: Array.isArray(bt.suggestions) ? bt.suggestions : [],
              sections: Array.isArray(bt.sections)
                ? bt.sections.map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    dateRange: s.dateRange,
                    budget: s.budget || 0,
                    allDay: s.allDay,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    startDate: s.startDate
                      ? String(s.startDate).substring(0, 10)
                      : undefined,
                    endDate: s.endDate
                      ? String(s.endDate).substring(0, 10)
                      : undefined,
                  }))
                : [],
              createdAt: bt.createdAt || new Date().toISOString(),
              updatedAt: bt.updatedAt,
              coverPhoto: bt.coverPhoto,
              image: bt.coverPhoto,
              description: bt.description,
              userId:
                typeof bt.userId === "object" && bt.userId?._id
                  ? bt.userId._id
                  : bt.userId,
              visibility: bt.visibility,
            } as Trip;
          } catch (e) {
            console.warn("Failed to map public trip", bt, e);
            return null;
          }
        })
        .filter(Boolean) as Trip[];

    const load = async () => {
      attempts += 1;
      setLoadingPublicTrips(true);
      setPublicTripsError(null);
      try {
        // Timeout after 8s to avoid stuck spinner
        const timeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000)
        );
        const backendTrips: any[] = (await Promise.race([
          fetchPublicTrips(),
          timeout,
        ])) as any[];
        if (cancelled) return;
        const mapped = mapBackend(backendTrips);
        setPublicTrips(mapped);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.response?.status === 429
            ? "Rate limited loading public trips. Please retry in a moment."
            : err?.message === "timeout"
            ? "Public trips request timed out."
            : "Failed to load public trips.";
        setPublicTripsError(msg);
        // Backoff retry (max 2 auto retries)
        if (attempts < 3) {
          const delay = 500 * attempts; // simple incremental backoff
          setTimeout(() => {
            if (!cancelled) load();
          }, delay);
          return;
        }
      } finally {
        if (!cancelled) setLoadingPublicTrips(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // All trips belonging to the logged-in user
  const userTrips = useMemo(() => {
    if (!isLoggedIn || !user) return [];
    let owned = trips.filter((trip) => trip.userId === user.id);
    if (owned.length === 0) {
      const orphan = trips.filter((t) => !t.userId);
      if (orphan.length) owned = orphan; // fallback include orphan trips
    }
    return owned;
  }, [trips, isLoggedIn, user]);

  // Show ALL public trips (any status, any owner) including freshly created ones in context
  const homeDisplayTrips = useMemo(() => {
    const map = new Map<string, Trip>();
    // from fetched public list
    publicTrips
      .filter((t) => t.visibility === "public")
      .forEach((t) => map.set(t.id, t));
    // include user's context trips that are public (covers immediate post-creation before refetch)
    trips
      .filter((t) => t.visibility === "public")
      .forEach((t) => {
        if (!map.has(t.id)) map.set(t.id, t);
      });
    const merged = Array.from(map.values());
    if (merged.length)
      console.log("[Home] Merged public trips:", merged.length);
    return merged;
  }, [publicTrips, trips]);

  // Previous (completed / past end date) trips for user
  const previousTrips = useMemo(() => {
    const now = new Date();
    return userTrips.filter(
      (t) => t.status === "completed" || new Date(t.endDate) < now
    );
  }, [userTrips]);

  const filteredTrips = useMemo(() => {
    let list = [...homeDisplayTrips];

    // Enhanced search functionality
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const destinationMatch = t.destination.toLowerCase().includes(q);
        const descriptionMatch = (t.description || "")
          .toLowerCase()
          .includes(q);
        const activitiesMatch = t.suggestions?.some((suggestion) =>
          suggestion.toLowerCase().includes(q)
        );
        const sectionsMatch = t.sections?.some(
          (section) =>
            section.title.toLowerCase().includes(q) ||
            section.description.toLowerCase().includes(q)
        );
        return (
          titleMatch ||
          destinationMatch ||
          descriptionMatch ||
          activitiesMatch ||
          sectionsMatch
        );
      });
    }

    // Category/Status filtering
    if (filterBy !== "all") {
      if (
        filterBy === "adventure" ||
        filterBy === "culture" ||
        filterBy === "beach" ||
        filterBy === "city" ||
        filterBy === "nature"
      ) {
        list = list.filter((t) =>
          t.suggestions?.some((suggestion) =>
            suggestion.toLowerCase().includes(filterBy.toLowerCase())
          )
        );
      } else {
        list = list.filter((t) => t.status === filterBy);
      }
    }

    // Enhanced sorting functionality
    switch (sortBy) {
      case "newest":
        list.sort((a, b) => {
          const ca = b.createdAt || "";
          const cb = a.createdAt || "";
          if (!ca && !cb) return 0;
          return ca.localeCompare(cb);
        });
        break;
      case "price-high":
        list.sort((a, b) => {
          const budgetA = a.budget > 0 ? a.budget : a.plannedBudget || 0;
          const budgetB = b.budget > 0 ? b.budget : b.plannedBudget || 0;
          return budgetB - budgetA;
        });
        break;
      case "price-low":
        list.sort((a, b) => {
          const budgetA = a.budget > 0 ? a.budget : a.plannedBudget || 0;
          const budgetB = b.budget > 0 ? b.budget : b.plannedBudget || 0;
          return budgetA - budgetB;
        });
        break;
      case "rating":
        list.sort(
          (a, b) => (b.suggestions?.length || 0) - (a.suggestions?.length || 0)
        );
        break;
      case "duration":
        list.sort((a, b) => {
          const durationA =
            new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
          const durationB =
            new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
          return durationB - durationA;
        });
        break;
      case "start-date":
        list.sort((a, b) => {
          const sa = a.startDate || "";
          const sb = b.startDate || "";
          return sa.localeCompare(sb);
        });
        break;
      case "participants":
        list.sort((a, b) => (b.participants || 0) - (a.participants || 0));
        break;
      default:
        break;
    }

    return list;
  }, [homeDisplayTrips, searchQuery, filterBy, sortBy]);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-background">
      {!isLoggedIn && (
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      <main className="w-full space-y-16">
        {/* Hero Banner */}
        <Card className="relative overflow-hidden border-0 shadow-hero rounded-none">
          <div className="relative h-[675px] w-full">
            <img
              src={heroTravelImage}
              alt="Travel"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="w-full space-y-6 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow">
                  Discover Your Next Adventure
                </h1>
                <p className="text-lg md:text-xl text-white/90">
                  Create personalized itineraries, manage budgets and craft
                  memories with a professional trip planner.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 shadow-lg"
                    onClick={() =>
                      navigate(isLoggedIn ? "/new-trip" : "/login")
                    }
                  >
                    <Plus className="h-5 w-5 mr-2" /> Plan a Trip
                  </Button>
                  {isLoggedIn ? (
                    <Button
                      onClick={() => navigate("/dashboard")}
                      size="lg"
                      variant="outline"
                      className="border-white/70 text-white bg-transparent hover:bg-white/10"
                    >
                      Dashboard
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/70 text-white bg-transparent hover:bg-white/10"
                    >
                      Explore Destinations
                    </Button>
                  )}
                </div>
              </div>
              {/* Overlay search */}
              <div className="mt-12 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
                <div className="bg-transparent/10 backdrop-blur rounded-xl shadow-xl p-2 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                  <div className="flex-1 relative flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search destinations, activities, sections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-12 text-base"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && searchQuery.trim()) {
                            const element =
                              document.getElementById("all-trips");
                            if (element) {
                              const elementPosition =
                                element.getBoundingClientRect().top +
                                window.pageYOffset;
                              const offsetPosition = elementPosition - 100; // 100px above for professional spacing
                              window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth",
                              });
                            }
                          }
                        }}
                      />
                    </div>
                    {/* Smooth appearing search button */}
                    <div
                      className={`transition-all duration-300 ease-in-out ${
                        searchQuery.trim()
                          ? "opacity-100 translate-x-0 w-auto"
                          : "opacity-0 translate-x-4 w-0 overflow-hidden"
                      }`}
                    >
                      <Button
                        size="lg"
                        className="h-12 px-6 bg-primary text-white hover:bg-primary/90 whitespace-nowrap transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95"
                        onClick={() => {
                          if (searchQuery.trim()) {
                            const element =
                              document.getElementById("all-trips");
                            if (element) {
                              const elementPosition =
                                element.getBoundingClientRect().top +
                                window.pageYOffset;
                              const offsetPosition = elementPosition - 100; // 100px above for professional spacing
                              window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth",
                              });
                            }
                          }
                        }}
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-full md:w-48 h-12 text-base">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="culture">Culture</SelectItem>
                      <SelectItem value="beach">Beach</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48 h-12 text-base">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-high">
                        Budget High → Low
                      </SelectItem>
                      <SelectItem value="price-low">
                        Budget Low → High
                      </SelectItem>
                      <SelectItem value="rating">Most Suggestions</SelectItem>
                      <SelectItem value="duration">Longest Duration</SelectItem>
                      <SelectItem value="start-date">Start Date</SelectItem>
                      <SelectItem value="participants">Participants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Removed separate search card (integrated in hero) */}

        {/* All Trips (Real User-Created) */}
        <div
          className="space-y-6 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14"
          id="all-trips"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">All Public Trips</h3>
            <Button
              variant="outline"
              onClick={() => navigate(isLoggedIn ? "/new-trip" : "/login")}
            >
              Create Trip
            </Button>
          </div>
          {loadingPublicTrips ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <p className="text-muted-foreground">Loading public trips...</p>
              </CardContent>
            </Card>
          ) : publicTripsError ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center space-y-4">
                <p className="text-destructive text-sm">{publicTripsError}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // force re-run loader by resetting state & calling fetch directly
                    setPublicTripsError(null);
                    setLoadingPublicTrips(true);
                    fetchPublicTrips()
                      .then((data: any[]) => {
                        const mapped = data ? (data as any[]) : [];
                        // reuse mapping by updating state via a mini mapper call
                        setPublicTrips((prev) =>
                          prev.length ? prev : (mapped as any)
                        );
                      })
                      .finally(() => setLoadingPublicTrips(false));
                  }}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredTrips.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center space-y-4">
                {publicTrips.length === 0 ? (
                  <>
                    <p className="text-muted-foreground">
                      No public trips available at the moment.
                    </p>
                    {isLoggedIn && (
                      <Button
                        onClick={() => navigate("/new-trip")}
                        className="bg-hero-gradient hover:opacity-90"
                      >
                        Create a Trip
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      No trips match your current filters.
                    </p>
                    <Button
                      onClick={() => {
                        setSearchQuery("");
                        setFilterBy("all");
                        setSortBy("newest");
                      }}
                    >
                      Reset Filters
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="flex items-center justify-end gap-2 mb-2">
                {filteredTrips.length > 4 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        scrollerRef.current?.scrollBy({
                          left: -1 * (scrollerRef.current?.clientWidth || 600),
                          behavior: "smooth",
                        })
                      }
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        scrollerRef.current?.scrollBy({
                          left: scrollerRef.current?.clientWidth || 600,
                          behavior: "smooth",
                        })
                      }
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div
                ref={scrollerRef}
                className="grid grid-flow-col auto-cols-[minmax(280px,25%)] md:auto-cols-[minmax(320px,25%)] xl:auto-cols-[minmax(360px,25%)] gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {filteredTrips.map((trip) => (
                  <div key={trip.id} className="snap-start">
                    <TripCard
                      trip={trip}
                      onView={(id) => navigate(`/trip/${id}`)}
                      hideEditControls
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Previous Trips (Only for logged-in users) */}
        {isLoggedIn && (
          <div className="space-y-6 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">My Previous Trips</h3>
              {userTrips.length > 0 && (
                <Button variant="outline" onClick={() => navigate("/my-trips")}>
                  View All My Trips
                </Button>
              )}
            </div>
            {previousTrips.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-10 text-center space-y-4">
                  <p className="text-muted-foreground">
                    You have no previous trips yet.
                  </p>
                  {userTrips.length === 0 ? (
                    <Button
                      onClick={() => navigate("/new-trip")}
                      className="bg-hero-gradient hover:opacity-90"
                    >
                      Plan Your First Trip
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-7 xl:gap-8">
                {previousTrips.slice(0, 6).map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onView={(id) => navigate(`/trip/${id}`)}
                    hideEditControls
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <Card className="bg-hero-gradient text-white rounded-none mx-0">
          <CardContent className="p-8 text-center">
            <Plane className="h-16 w-16 mx-auto mb-4 opacity-80" />
            <h4 className="text-2xl font-bold mb-2">
              Ready for Your Next Adventure?
            </h4>
            <p className="text-lg mb-6 text-white/90">
              Join thousands of travelers creating amazing memories around the
              world
            </p>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={handleRegister}
            >
              <Plus className="h-5 w-5 mr-2" />
              Start Planning Today
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
