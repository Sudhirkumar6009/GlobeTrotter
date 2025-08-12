import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Check,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useTrips } from "@/context/TripContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

const Planning = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addTrip } = useTrips();
  const [isCreating, setIsCreating] = useState(false);

  const tripData = location.state;

  useEffect(() => {
    if (!tripData) {
      navigate("/new-trip");
    }
  }, [tripData, navigate]);

  if (!tripData) {
    return <div>Loading...</div>;
  }

  const handleCreateTrip = async () => {
    setIsCreating(true);
    try {
      const createdTrip = addTrip(tripData);
      navigate(`/trip/${createdTrip.id}`);
    } catch (error) {
      console.error("Failed to create trip:", error);
      alert("Failed to create trip. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const totalSectionBudget =
    tripData.sections?.reduce(
      (sum: number, section: any) => sum + (section.budget || 0),
      0
    ) || 0;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
        <AppSidebar disableCollapse />
        <div className="flex-1">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <h1 className="text-3xl font-bold text-foreground">
                  Review Your Trip
                </h1>
              </div>
              <p className="text-muted-foreground">
                Review your trip details before creating it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Trip Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    Trip Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{tripData.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {tripData.destination}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(tripData.startDate), "PPP")} -{" "}
                        {format(new Date(tripData.endDate), "PPP")}
                      </p>
                      {(tripData.startTime || tripData.endTime) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tripData.startTime || "Start"} -{" "}
                          {tripData.endTime || "End"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium">
                      {tripData.participants} participants
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        $
                        {(
                          tripData.plannedBudget || totalSectionBudget
                        ).toLocaleString()}
                      </p>
                      {tripData.plannedBudget &&
                        totalSectionBudget !== tripData.plannedBudget && (
                          <p className="text-xs text-muted-foreground">
                            Section total: $
                            {totalSectionBudget.toLocaleString()}
                          </p>
                        )}
                    </div>
                  </div>

                  {tripData.description && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        {tripData.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggestions */}
              {tripData.suggestions && tripData.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tripData.suggestions.map(
                        (suggestion: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {suggestion}
                          </Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sections */}
            {tripData.sections && tripData.sections.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Trip Sections</h2>
                <div className="space-y-4">
                  {tripData.sections.map((section: any, index: number) => (
                    <Card key={section.id || index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {section.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-3">
                          {section.description}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          {section.dateRange && (
                            <div>
                              <span className="font-medium">Dates:</span>
                              <p className="text-muted-foreground">
                                {section.dateRange}
                              </p>
                            </div>
                          )}
                          {section.budget > 0 && (
                            <div>
                              <span className="font-medium">Budget:</span>
                              <p className="text-muted-foreground">
                                ${section.budget.toLocaleString()}
                              </p>
                            </div>
                          )}
                          {!section.allDay &&
                            (section.startTime || section.endTime) && (
                              <div>
                                <span className="font-medium">Time:</span>
                                <p className="text-muted-foreground">
                                  {section.startTime || "Start"} -{" "}
                                  {section.endTime || "End"}
                                </p>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-12 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isCreating}
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleCreateTrip}
                disabled={isCreating}
                className="px-8 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary"
              >
                {isCreating ? "Creating Trip..." : "Create Trip"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Planning;
