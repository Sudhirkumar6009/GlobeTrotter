import { useParams, useNavigate } from "react-router-dom";
import { useTrips } from "@/context/TripContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  ArrowLeft,
  DollarSign,
  List,
  Sparkles,
  Edit,
  Share,
  Users,
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchTripById } from "@/lib/tripService";
import { useAuth } from "@/context/AuthContext";

type UITipSection = {
  id: number;
  title: string;
  description: string;
  dateRange: string;
  budget: number;
};
type UITrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  coverPhoto?: string;
  description?: string;
  suggestions: string[];
  sections: UITipSection[];
  plannedBudget?: number;
  budget?: number;
};

function computeStatus(startDate: string, endDate: string) {
  const now = new Date();
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (now < s) return "upcoming";
  if (now > e) return "completed";
  return "ongoing";
}

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips } = useTrips();
  const { isLoggedIn } = useAuth();
  const tripFromCtx = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  // New: local fetch for guests or when trip is missing from context
  const [remoteTrip, setRemoteTrip] = useState<UITrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (tripFromCtx || !id) return;
    setLoading(true);
    setLoadErr(null);
    (async () => {
      try {
        const bt = await fetchTripById(id);
        const uiTrip: UITrip = {
          id: bt._id,
          title: bt.name,
          destination: (bt as any).destination || bt.name,
          startDate: String(bt.startDate).substring(0, 10),
          endDate: String(bt.endDate).substring(0, 10),
          status: computeStatus(bt.startDate, bt.endDate),
          coverPhoto: bt.coverPhoto,
          description: bt.description,
          suggestions: Array.isArray(bt.suggestions) ? bt.suggestions : [],
          sections: (bt.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            dateRange: s.dateRange,
            budget: s.budget || 0,
          })),
          plannedBudget: (bt as any).plannedBudget,
          budget: (bt as any).budget,
        };
        setRemoteTrip(uiTrip);
      } catch (e: any) {
        setLoadErr(e?.response?.data?.error || "Unable to load trip");
      } finally {
        setLoading(false);
      }
    })();
  }, [tripFromCtx, id]);

  const trip: any = tripFromCtx || remoteTrip;

  if (!trip) {
    if (loading) {
      return (
        <SidebarProvider open defaultOpen>
          <div className="min-h-screen flex w-full bg-background">
            {isLoggedIn && <AppSidebar disableCollapse />}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <h1 className="text-2xl font-bold">Loading trip...</h1>
            </div>
          </div>
        </SidebarProvider>
      );
    }
    return (
      <SidebarProvider open defaultOpen>
        <div className="min-h-screen flex w-full bg-background">
          {isLoggedIn && <AppSidebar disableCollapse />}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <h1 className="text-2xl font-bold">{loadErr || "Trip not found"}</h1>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const dateRangeLabel = `${trip.startDate} → ${trip.endDate}`;
  let totalBudget =
    trip.budget || trip.sections.reduce((sum: number, s: any) => sum + (s.budget || 0), 0);
  if (totalBudget === 0 && trip.plannedBudget) {
    totalBudget = trip.plannedBudget;
  }

  const handleEditTrip = () => {
    // Determine which builder to use based on trip characteristics
    const isAITrip =
      trip.title?.includes("AI") ||
      trip.sections?.some((s) => s.title?.includes("AI")) ||
      trip.sections?.length <= 3; // AI trips typically have fewer sections

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

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        {isLoggedIn && <AppSidebar disableCollapse />}
        <div className="flex-1 bg-gradient-to-br from-background via-background to-secondary/10 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold">{trip.title}</h1>
              </div>
              <Badge variant="secondary" className="text-sm capitalize">
                {trip.status}
              </Badge>
            </div>

            {trip.coverPhoto && (
              <div className="overflow-hidden rounded-lg border border-border/60 shadow-travel">
                <img
                  src={trip.coverPhoto}
                  alt={trip.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {trip.description && (
              <Card className="shadow-travel border-border/60">
                <CardContent className="p-6 text-sm leading-relaxed whitespace-pre-wrap">
                  {trip.description}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-travel border-border/60">
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">Destination</p>
                    <p className="text-muted-foreground">{trip.destination}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">Dates</p>
                    <p className="text-muted-foreground">{dateRangeLabel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">Budget</p>
                    <p className="text-muted-foreground">
                      ${totalBudget.toLocaleString()}
                    </p>
                    {trip.plannedBudget != null && trip.plannedBudget > 0 && (
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Planned: ${trip.plannedBudget.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <List className="h-4 w-4 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium">Sections</p>
                    <p className="text-muted-foreground">
                      {trip.sections.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {trip.suggestions.length > 0 && (
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Selected
                    Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0 pb-4">
                  {trip.suggestions.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Itinerary Sections</h2>
              {trip.sections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sections added.
                </p>
              )}
              <div className="space-y-4">
                {trip.sections.map((section: UITipSection) => (
                  <Card key={section.id} className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center justify-between">
                        <span>{section.title}</span>
                        {section.budget > 0 && (
                          <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> $
                            {section.budget.toLocaleString()}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{" "}
                          {section.dateRange || "—"}
                        </div>
                      </div>
                      {section.description && (
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                          {section.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => navigate("/my-trips")}>
                Back to My Trips
              </Button>
              <Button
                onClick={() => navigate(`/itinerary`, { state: { ...trip } })}
                variant="secondary"
              >
                Duplicate Trip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
