import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarIcon,
  MapPin,
  Camera,
  Mountain,
  Utensils,
  Waves,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

const NewTrip = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // If this page is reused for editing, parent can pass an existing trip id via location.state.tripId
  const editingTripId = (location.state as any)?.tripId as string | undefined;
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [destination, setDestination] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(
    null
  );
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const suggestions = [
    { id: 1, title: "Beach Paradise", icon: Waves, image: "🏖️" },
    { id: 2, title: "Mountain Adventure", icon: Mountain, image: "⛰️" },
    { id: 3, title: "City Explorer", icon: Building2, image: "🏙️" },
    { id: 4, title: "Cultural Journey", icon: Camera, image: "🏛️" },
    { id: 5, title: "Food Tour", icon: Utensils, image: "🍜" },
    { id: 6, title: "Nature Trek", icon: MapPin, image: "🌲" },
  ];

  const toggleSuggestion = (id: number) => {
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (startDate && endDate && destination) {
      const chosen = suggestions
        .filter((s) => selectedSuggestions.includes(s.id))
        .map((s) => s.title);
      navigate("/itinerary", {
        state: {
          startDate,
          endDate,
          startTime,
          endTime,
          destination,
          suggestions: chosen,
          coverPhotoFile,
          visibility, // pass selected visibility
        },
      });
    }
  };

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen w-full bg-background">
        <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-40 border-r bg-card overflow-y-auto">
          <AppSidebar disableCollapse />
        </div>
        <div className="flex-1 overflow-y-auto ml-64 bg-gradient-to-br from-background via-background to-secondary/10">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-foreground">
                  {editingTripId ? "Edit Trip Details" : "Create a New Trip"}
                </h1>
                <div className="text-2xl font-bold text-primary">
                  GlobeTrotter
                </div>
              </div>
              {editingTripId && (
                <div className="flex gap-3 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/edit-trip/${editingTripId}`)}
                  >
                    Go to Advanced Edit
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Trip Planning Form */}
            <Card className="mb-8 shadow-travel border-border/50">
              <CardContent className="p-8">
                <h2 className="text-xl font-semibold mb-6 text-foreground">
                  Plan a new trip
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cover Image */}
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="cover"
                      className="text-sm font-medium text-foreground"
                    >
                      Cover Image (optional)
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="cover"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setCoverPhotoFile(file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setCoverPhotoPreview(url);
                          } else {
                            setCoverPhotoPreview(null);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {coverPhotoPreview && (
                        <img
                          src={coverPhotoPreview}
                          alt="Preview"
                          className="h-16 w-24 object-cover rounded-md border"
                        />
                      )}
                    </div>
                  </div>
                  {/* Visibility toggle - full width */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-foreground">
                      Visibility
                    </Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant={
                          visibility === "private" ? "default" : "outline"
                        }
                        onClick={() => setVisibility("private")}
                      >
                        Private
                      </Button>
                      <Button
                        type="button"
                        variant={
                          visibility === "public" ? "default" : "outline"
                        }
                        onClick={() => setVisibility("public")}
                      >
                        Public
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {visibility === "public"
                          ? "Anyone with the link can view."
                          : "Only you can view."}
                      </span>
                    </div>
                  </div>
                  {/* Start Date & Time */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="startDate"
                      className="text-sm font-medium text-foreground"
                    >
                      Start Date:
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-2 transition-all duration-300",
                            !startDate && "text-muted-foreground",
                            "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-card border-border shadow-float"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="bg-card"
                          classNames={{
                            months:
                              "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption:
                              "flex justify-center pt-1 relative items-center text-foreground",
                            caption_label: "text-sm font-semibold text-primary",
                            nav: "space-x-1 flex items-center",
                            nav_button: cn(
                              "h-8 w-8 bg-transparent p-0 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            ),
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell:
                              "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative hover:bg-accent/50 rounded-md transition-colors",
                            day: "h-9 w-9 p-0 font-normal hover:bg-primary/10 rounded-md transition-all duration-200",
                            day_selected:
                              "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm",
                            day_today:
                              "bg-accent text-accent-foreground font-semibold rounded-md",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-30",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="mt-2">
                      <Label
                        htmlFor="startTime"
                        className="text-sm font-medium text-foreground"
                      >
                        Start Time (optional)
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* End Date & Time */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="endDate"
                      className="text-sm font-medium text-foreground"
                    >
                      End Date:
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="endDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-2 transition-all duration-300",
                            !endDate && "text-muted-foreground",
                            "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border shadow-float">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          disabled={(date) =>
                            startDate ? date < startDate : false
                          }
                          className="bg-card"
                          classNames={{
                            months:
                              "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption:
                              "flex justify-center pt-1 relative items-center text-foreground",
                            caption_label: "text-sm font-semibold text-primary",
                            nav: "space-x-1 flex items-center",
                            nav_button: cn(
                              "h-8 w-8 bg-transparent p-0 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            ),
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell:
                              "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative hover:bg-accent/50 rounded-md transition-colors",
                            day: "h-9 w-9 p-0 font-normal hover:bg-primary/10 rounded-md transition-all duration-200",
                            day_selected:
                              "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm",
                            day_today:
                              "bg-accent text-accent-foreground font-semibold rounded-md",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-30",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="mt-2">
                      <Label
                        htmlFor="endTime"
                        className="text-sm font-medium text-foreground"
                      >
                        End Time (optional)
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Select Place - full width */}
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="place"
                      className="text-sm font-medium text-foreground"
                    >
                      Select a Place:
                    </Label>
                    <Input
                      id="place"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Enter destination"
                      className="border-2 transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions Section */}
            <Card className="shadow-travel border-border/50">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold mb-6 text-foreground">
                  Suggestion for Places to Visit/Activities to perform
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {suggestions.map((suggestion) => {
                    const active = selectedSuggestions.includes(suggestion.id);
                    return (
                      <Card
                        key={suggestion.id}
                        onClick={() => toggleSuggestion(suggestion.id)}
                        className={cn(
                          "cursor-pointer transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-accent/5",
                          active
                            ? "ring-2 ring-primary shadow-float scale-105 border-primary"
                            : "hover:shadow-float hover:scale-105 hover:border-primary/50"
                        )}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl mb-3">
                            {suggestion.image}
                          </div>
                          <h4 className="font-medium text-sm text-foreground">
                            {suggestion.title}
                          </h4>
                          {active && (
                            <div className="mt-2 text-xs text-primary font-medium">
                              Selected
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleNext}
                    disabled={!startDate || !endDate || !destination}
                    className="px-8 py-2 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-travel"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default NewTrip;
