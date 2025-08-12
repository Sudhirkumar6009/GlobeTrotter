import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  verifyAndFetchUser,
  isAuthenticated,
  UserData,
} from "../lib/authService";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TripCard } from "@/components/dashboard/TripCard";
import { useTrips } from "@/context/TripContext";
import {
  Search,
  Plus,
  Plane,
  MapPin,
  Calendar,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import heroTravelImage from "@/assets/hero-travel.jpg";
import { useAuth } from "@/context/AuthContext";

// Removed mockTrips: real trips loaded from backend via TripContext

const topDestinations = [
  { name: "Bali, Indonesia", trips: 234, trending: true },
  { name: "Santorini, Greece", trips: 189, trending: false },
  { name: "Tokyo, Japan", trips: 167, trending: true },
  { name: "Iceland", trips: 145, trending: false },
];

interface DashboardProps {
  guestMode?: boolean;
}

export default function Dashboard({ guestMode = false }: DashboardProps) {
  const { user } = useAuth();
  const {
    trips,
    refreshStatuses,
    reloadTrips,
    loading: tripsLoading,
    error: tripsError,
  } = useTrips(); // replaced destructure
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      console.log("[Dashboard] Checking authentication");
      // First, quick client-side check
      if (!isAuthenticated()) {
        console.log("[Dashboard] Not authenticated via client check");
        navigate("/login");
        return;
      }

      try {
        // Then verify with server and get user data
        console.log("[Dashboard] Fetching user data from server");
        const fetchedUserData = await verifyAndFetchUser();
        console.log("[Dashboard] User data result:", !!fetchedUserData);

        if (fetchedUserData) {
          setUserData(fetchedUserData);
          setLoading(false);
        } else {
          // Important: Only redirect if actually not authenticated
          console.log("[Dashboard] No user data, redirecting to login");
          setAuthError("Authentication failed. Please login again.");
          navigate("/login");
        }
      } catch (err) {
        console.error("[Dashboard] Auth verification error:", err);
        setAuthError("Error verifying your session");
        setLoading(false);
      }
    }

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // After user verified, if no trips yet and not already loading, force reload
    if (!guestMode && userData && !tripsLoading && trips.length === 0) {
      reloadTrips();
    }
  }, [guestMode, userData, trips.length, tripsLoading, reloadTrips]);

  const handleViewTrip = (tripId: string) => {
    console.log("Viewing trip:", tripId);
  };

  useEffect(() => {
    const id = setInterval(() => refreshStatuses(), 60 * 60 * 1000); // hourly status refresh
    return () => clearInterval(id);
  }, [refreshStatuses]);

  // Only the current user's trips
  const myTrips = useMemo(() => {
    if (!user?.id) return [];
    return trips.filter((t) => !t.userId || t.userId === user.id);
  }, [trips, user?.id]);

  const filteredTrips = useMemo(() => {
    return myTrips.filter((trip) => {
      const matchesSearch =
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || trip.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [myTrips, searchQuery, filterStatus]);

  const { countriesVisitedCount, upcomingCount } = useMemo(() => {
    const destinationSet = new Set<string>();
    let upcoming = 0;
    myTrips.forEach((t) => {
      if (t.destination) {
        t.destination
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((d) => destinationSet.add(d));
      }
      if (t.status === "upcoming") upcoming += 1;
    });
    return {
      countriesVisitedCount: destinationSet.size,
      upcomingCount: upcoming,
    };
  }, [myTrips]);

  if (loading || tripsLoading) {
    return <div>Loading your dashboard...</div>;
  }

  if (authError) {
    return (
      <div>
        <p>{authError}</p>
        <button onClick={() => navigate("/login")}>Go to Login</button>
      </div>
    );
  }

  // Only show sidebar when authenticated
  const showSidebar = isAuthenticated();

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        {showSidebar && <AppSidebar disableCollapse />}
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">
                  Travel Dashboard
                </h1>
                <Button
                  className="bg-hero-gradient hover:opacity-90"
                  onClick={() => navigate("/new-trip")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Trip
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6">
            <h1 className="text-2xl font-bold">
              {guestMode
                ? "Welcome to GlobeTrotter"
                : `Welcome, ${
                    userData?.firstName ||
                    userData?.id ||
                    userData?.name ||
                    "Traveler"
                  }`}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {guestMode
                ? "Log in or register to access your personalized travel tools."
                : "Your personalized travel dashboard."}
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Hero Banner */}
            <Card className="relative overflow-hidden border-0 shadow-hero">
              <div
                className="h-64 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${heroTravelImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="p-8 text-white">
                    <h2 className="text-4xl font-bold mb-2">
                      Plan Your Next Adventure
                    </h2>
                    <p className="text-xl mb-6 text-white/90">
                      Discover amazing destinations and create unforgettable
                      memories
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate("/new-trip")}
                      className="bg-white text-primary hover:bg-white/90"
                    >
                      <Plane className="h-5 w-5 mr-2" />
                      Start Planning
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {countriesVisitedCount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {countriesVisitedCount === 1
                          ? "Destination"
                          : "Destinations"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">{upcomingCount}</p>
                      <p className="text-sm text-muted-foreground">
                        Upcoming {upcomingCount === 1 ? "Trip" : "Trips"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-secondary-dark" />
                    <div>
                      <p className="text-2xl font-bold">{myTrips.length}</p>
                      <p className="text-sm text-muted-foreground">
                        Total Trips
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">
                        $
                        {myTrips
                          .reduce(
                            (sum, t) =>
                              sum + (t.budget || t.plannedBudget || 0),
                            0
                          )
                          .toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Budget
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* My Trips Section - Responsive Cards */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h3 className="text-xl font-semibold">My Trips</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search trips..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10"
                      />
                    </div>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {tripsError && (
                  <div className="text-sm text-destructive">
                    {tripsError}{" "}
                    <button
                      onClick={() => reloadTrips()}
                      className="underline font-medium"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTrips.length > 0 ? (
                    filteredTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onView={(id) => navigate(`/trip/${id}`)}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
                      {myTrips.length === 0
                        ? "You haven't created any trips yet. Click New Trip to start."
                        : "No trips match your filters."}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Destinations Sidebar */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Trending Destinations</h3>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {topDestinations.map((destination, index) => (
                      <div
                        key={destination.name}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {destination.name}
                            </span>
                            {destination.trending && (
                              <Badge variant="secondary" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Hot
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {destination.trips} trips planned
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
