import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Pencil,
  Link as LinkIcon,
  Globe,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTrips } from "@/context/TripContext";

interface TripCardProps {
  trip: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    status: "current" | "upcoming" | "completed" | "ongoing";
    budget: number;
    participants: number;
    image?: string;
    plannedBudget?: number;
    userId?: string;
  };
  onView: (tripId: string) => void;
}

export function TripCard({ trip, onView }: TripCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { updateTrip } = useTrips();
  const canEdit =
    user &&
    trip.userId &&
    trip.userId === user.id &&
    trip.status !== "completed";
  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return "bg-accent text-accent-foreground";
      case "upcoming":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "ongoing":
        return "bg-secondary-dark text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card
      className="group hover:shadow-travel transition-smooth cursor-pointer"
      onClick={() => onView(trip.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(trip.id);
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg group-hover:text-primary transition-smooth">
              {trip.title}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {trip.destination}
            </div>
          </div>
          <Badge className={getStatusColor(trip.status)}>{trip.status}</Badge>
        </div>
        {trip.image && (
          <div className="mt-3 overflow-hidden rounded-md">
            <img
              src={trip.image}
              alt={trip.title}
              className="h-32 w-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{trip.startDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{trip.participants} people</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {(() => {
              const primary =
                trip.budget > 0
                  ? trip.budget
                  : trip.plannedBudget != null
                  ? trip.plannedBudget
                  : 0;
              const showPlannedSecondary =
                trip.plannedBudget != null &&
                trip.plannedBudget > 0 &&
                trip.budget > 0 &&
                trip.plannedBudget !== trip.budget;
              return (
                <span>
                  ${primary.toLocaleString()}
                  {showPlannedSecondary && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (plan {trip.plannedBudget!.toLocaleString()})
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{trip.endDate}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-smooth"
            onClick={(e) => {
              e.stopPropagation();
              onView(trip.id);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation();
              const base = window.location.origin;
              const url = `${base}/trip/${trip.id}`;
              await navigator.clipboard.writeText(url);
            }}
            title="Copy link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={async (e) => {
                e.stopPropagation();
                const next = trip as any;
                const newVis =
                  (next.visibility || "private") === "private"
                    ? "public"
                    : "private";
                await updateTrip(trip.id, { visibility: newVis as any });
              }}
              title={
                (trip as any).visibility === "public"
                  ? "Make Private"
                  : "Make Public"
              }
            >
              {(trip as any).visibility === "public" ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/trip/${trip.id}/edit`);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
