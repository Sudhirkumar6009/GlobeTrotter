import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, RefreshCw, AlertCircle, Edit, Eye, Copy, Trash2, MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripCard } from "@/components/dashboard/TripCard";
import { useTrips } from "@/context/TripContext";

export default function MyTrips() {
  const { trips, loading, error } = useTrips();
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
    const isAITrip = trip.title?.includes('AI') || 
                     trip.sections?.some(s => s.title?.includes('AI')) ||
                     (trip.sections?.length || 0) <= 3;

    if (isAITrip) {
      navigate('/plan-ai', { 
        state: { 
          editTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || []
        } 
      });
    } else {
      navigate('/itinerary', { 
        state: { 
          editTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || []
        } 
      });
    }
  };

  const handleDuplicateTrip = (trip: Trip) => {
    const isAITrip = trip.title?.includes('AI') || 
                     trip.sections?.some(s => s.title?.includes('AI')) ||
                     (trip.sections?.length || 0) <= 3;

    if (isAITrip) {
      navigate('/plan-ai', { 
        state: { 
          duplicateTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || []
        } 
      });
    } else {
      navigate('/itinerary', { 
        state: { 
          duplicateTrip: trip,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
          suggestions: trip.suggestions || []
        } 
      });
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || trip.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar disableCollapse />

        <main className="flex-1 overflow-auto">
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
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                All Trips ({loading ? "..." : trips.length})
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

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-lg text-muted-foreground">
                    Loading your trips...
                  </p>
                </div>
              ) : trips.length === 0 ? (
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
                  <TripCard key={trip.id} trip={trip} onView={handleViewTrip} />
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
