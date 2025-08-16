import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  AlertCircle,
  Edit,
  Eye,
  Copy,
  Trash2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripCard } from "@/components/dashboard/TripCard";
import { useTrips, Trip } from "@/context/TripContext";
import { useAuth } from "@/context/AuthContext";

export default function MyTrips() {
  const { trips, loading, error, reloadTrips } = useTrips();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Debug: Log trips to see what's being loaded
  useEffect(() => {
    console.log("MyTrips - Total trips loaded:", trips.length);
    console.log("MyTrips - Loading:", loading);
    console.log("MyTrips - Error:", error);
    console.log("MyTrips - Trips data:", trips);
  }, [trips, loading, error]);

  const handleViewTrip = (tripId: string) => {
    navigate(`/trip/${tripId}`);
  };

  const handleEditTrip = (trip: Trip) => {
    // Determine which builder to use
    const isAITrip =
      trip.title?.includes("AI") ||
      trip.sections?.some((s) => s.title?.includes("AI")) ||
      (trip.sections?.length || 0) <= 3;

    if (isAITrip) {
      navigate("/plan-ai", {
        state: {
          editTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || [],
        },
      });
    } else {
      navigate("/itinerary", {
        state: {
          editTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || [],
        },
      });
    }
  };

  const handleDuplicateTrip = (trip: Trip) => {
    const isAITrip =
      trip.title?.includes("AI") ||
      trip.sections?.some((s) => s.title?.includes("AI")) ||
      (trip.sections?.length || 0) <= 3;

    if (isAITrip) {
      navigate("/plan-ai", {
        state: {
          duplicateTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || [],
        },
      });
    } else {
      navigate("/itinerary", {
        state: {
          duplicateTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || [],
        },
      });
    }
  };

  // Restrict to trips created by current user only
  const userKey = (user as any)?.id || (user as any)?._id;
  let ownedTrips = userKey ? trips.filter((t) => t.userId === userKey) : [];
  // Fallback: if backend not returning userId (e.g., newly created just before reload), include trips with no userId so they aren't hidden
  if (userKey && ownedTrips.length === 0) {
    const orphan = trips.filter((t) => !t.userId);
    if (orphan.length) ownedTrips = orphan;
  }
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log("MyTrips user object", user, "derived userKey:", userKey);
    }
  }, [user, userKey]);

  const filteredTrips = ownedTrips.filter((trip) => {
    const matchesSearch =
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || trip.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleRefresh = () => {
    reloadTrips(true); // force backend reload without full page refresh
  };

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen w-full bg-background">
        <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-40 border-r bg-card overflow-y-auto">
          <AppSidebar disableCollapse />
        </div>

        <main className="flex-1 overflow-y-auto ml-64">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">My Trips</h1>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                  <Button
                    className="bg-hero-gradient hover:opacity-90"
                    onClick={() => navigate("/new-trip")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Trip
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="ml-2"
                  >
                    + Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                All Trips ({loading ? "..." : ownedTrips.length})
              </h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10"
                    disabled={loading}
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-lg text-muted-foreground">
                    Loading your trips...
                  </p>
                </div>
              ) : ownedTrips.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground mb-4">
                    You haven't created any trips yet.
                  </p>
                  <Button
                    className="bg-hero-gradient hover:opacity-90"
                    onClick={() => navigate("/new-trip")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trip
                  </Button>
                </div>
              ) : filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => (
                  <div key={trip.id} className="relative">
                    <TripCard trip={trip} onView={handleViewTrip} />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    No trips found matching your filters
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
