import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Calendar as CalendarIcon,
  DollarSign,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Clock,
  ArrowRight,
  GripVertical,
  Sparkles,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useTrips } from "@/context/TripContext";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Switch } from "@/components/ui/switch";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { api } from "@/lib/api";

dayjs.extend(customParseFormat);

interface Section {
  id: number;
  title: string;
  description: string;
  dateRange: string; // formatted summary string
  budget: string;
  startDate?: Date | null;
  endDate?: Date | null;
  allDay?: boolean;
  startTime?: Dayjs | null;
  endTime?: Dayjs | null;
}

const Itinerary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    startDate,
    endDate,
    startTime,
    endTime,
    destination,
    suggestions = [],
    coverPhotoFile = null,
    duplicateTrip,
    editTrip,
  } = location.state || {};
  const { addTrip, updateTrip } = useTrips(); // Remove 'as any'

  // NEW: early flags (remove later duplicate activeSuggestions decl)
  const isEditing = !!editTrip?.id;
  const activeSuggestions =
    editTrip?.suggestions || duplicateTrip?.suggestions || suggestions;

  // Attempt to derive default date objects from trip-level dates if available
  const tripStartDate: Date | null = startDate ? new Date(startDate) : null;
  const tripEndDate: Date | null = endDate ? new Date(endDate) : null;

  const defaultDateRange =
    tripStartDate && tripEndDate
      ? `${format(tripStartDate, "MMM d")} - ${format(
          tripEndDate,
          "MMM d, yyyy"
        )}`
      : "";

  const [tripTitle, setTripTitle] = useState(
    destination ? destination + " Trip" : "New Trip"
  );
  const [overallBudget, setOverallBudget] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  // Time pickers moved into sections; no trip-level time window

  const [sections, setSections] = useState<Section[]>([
    {
      id: 1,
      title: "Section 1:",
      description:
        "All the necessary information about this section.\nThis can be anything like travel section, hotel or any other activity",
      dateRange: defaultDateRange,
      budget: "",
      startDate: tripStartDate,
      endDate: tripEndDate,
      allDay: true,
      startTime: null,
      endTime: null,
    },
  ]);

  // Drag and drop state
  const [draggedSection, setDraggedSection] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<number | null>(null);
  const [autoScrollInterval, setAutoScrollInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any | null>(null);

  // Extract visibility passed from previous step if any
  const { visibility = "private" } = location.state || {};

  const addSection = () => {
    const newSection: Section = {
      id: sections.length + 1,
      title: `Section ${sections.length + 1}:`,
      description:
        "All the necessary information about this section.\nThis can be anything like travel section, hotel or any other activity",
      dateRange: defaultDateRange,
      budget: "",
      startDate: tripStartDate,
      endDate: tripEndDate,
    };
    setSections((prev) => [...prev, newSection]);
  };

  const removeSection = (id: number) => {
    if (sections.length === 1) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const moveSection = (id: number, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const clone = [...prev];
      const [item] = clone.splice(index, 1);
      clone.splice(target, 0, item);
      return clone.map((s, i) => ({ ...s, id: i + 1 }));
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: number) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", sectionId.toString());

    // Add ghost image styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSection(null);
    setDragOverSection(null);

    // Clear auto-scroll interval
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }

    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, targetSectionId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(targetSectionId);

    // Auto-scroll logic
    const viewportHeight = window.innerHeight;
    const scrollThreshold = 100; // pixels from edge to trigger scroll
    const scrollSpeed = 10; // pixels per scroll step

    const clientY = e.clientY;

    // Clear existing auto-scroll
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }

    // Check if we need to scroll up
    if (clientY < scrollThreshold) {
      const interval = setInterval(() => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 0) {
          window.scrollBy(0, -scrollSpeed);
        } else {
          clearInterval(interval);
          setAutoScrollInterval(null);
        }
      }, 16); // ~60fps
      setAutoScrollInterval(interval);
    }
    // Check if we need to scroll down
    else if (clientY > viewportHeight - scrollThreshold) {
      const interval = setInterval(() => {
        const currentScroll = window.pageYOffset;
        const maxScroll =
          document.documentElement.scrollHeight - viewportHeight;
        if (currentScroll < maxScroll) {
          window.scrollBy(0, scrollSpeed);
        } else {
          clearInterval(interval);
          setAutoScrollInterval(null);
        }
      }, 16); // ~60fps
      setAutoScrollInterval(interval);
    }
  };

  const handleDragLeave = () => {
    // Only clear dragOverSection, keep auto-scroll for smooth movement
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: number) => {
    e.preventDefault();
    const draggedId = draggedSection;

    // Clear auto-scroll interval
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }

    if (draggedId && draggedId !== targetSectionId) {
      setSections((prev) => {
        const draggedIndex = prev.findIndex((s) => s.id === draggedId);
        const targetIndex = prev.findIndex((s) => s.id === targetSectionId);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        const clone = [...prev];
        const [draggedItem] = clone.splice(draggedIndex, 1);
        clone.splice(targetIndex, 0, draggedItem);

        // Re-index sections
        return clone.map((s, i) => ({ ...s, id: i + 1 }));
      });
    }

    setDraggedSection(null);
    setDragOverSection(null);
  };

  const toggleSectionAllDay = (id: number, checked: boolean) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              allDay: checked,
              startTime: checked ? null : s.startTime,
              endTime: checked ? null : s.endTime,
            }
          : s
      )
    );
  };

  const updateSectionTime = (
    id: number,
    which: "start" | "end",
    value: Dayjs | null
  ) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s } as Section;
        if (which === "start") next.startTime = value;
        else next.endTime = value;
        return next;
      })
    );
  };

  const updateSection = (
    id: number,
    field: keyof Section,
    value: string | Date | null
  ) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== id) return section;
        const updated: Section = { ...section };
        if (
          field === "title" ||
          field === "description" ||
          field === "dateRange" ||
          field === "budget"
        ) {
          updated[field] = value as string;
        } else if (field === "startDate" || field === "endDate") {
          updated[field] = value as Date | null;
        }
        if (field === "startDate" || field === "endDate") {
          const sd =
            field === "startDate"
              ? (value as Date | null)
              : section.startDate || null;
          const ed =
            field === "endDate"
              ? (value as Date | null)
              : section.endDate || null;
          updated.startDate = sd;
          updated.endDate = ed;
          if (sd && ed) {
            if (ed < sd) {
              // swap if user picked in reverse order
              updated.startDate = ed;
              updated.endDate = sd;
            }
            updated.dateRange = `${format(
              updated.startDate!,
              "MMM d"
            )} - ${format(updated.endDate!, "MMM d, yyyy")}`;
          } else if (sd) {
            updated.dateRange = `${format(sd, "MMM d, yyyy")} - ...`;
          } else if (ed) {
            updated.dateRange = `... - ${format(ed, "MMM d, yyyy")}`;
          }
        }
        return updated;
      })
    );
  };

  const applyAISections = (newSections: any[], mode: "replace" | "append") => {
    setSections((prev) => {
      const converted = newSections.map((s, idx) => {
        // FIX: Ensure AI sections have valid dates within trip bounds
        let startDate = s.startDate ? new Date(s.startDate) : null;
        let endDate = s.endDate ? new Date(s.endDate) : null;

        // If dates are invalid or missing, use trip dates
        if (!startDate || !endDate) {
          startDate = tripStartDate;
          endDate = tripEndDate;
        }

        // Ensure dates are within trip bounds
        if (tripStartDate && startDate && startDate < tripStartDate) {
          startDate = new Date(tripStartDate);
        }
        if (tripEndDate && endDate && endDate > tripEndDate) {
          endDate = new Date(tripEndDate);
        }

        return {
          id: mode === "append" ? prev.length + idx + 1 : idx + 1,
          title:
            s.title ||
            `Section ${mode === "append" ? prev.length + idx + 1 : idx + 1}:`,
          description: s.description || "",
          dateRange: s.dateRange || "",
          budget: typeof s.budget === "number" ? String(s.budget) : "",
          startDate,
          endDate,
          allDay: s.allDay ?? true,
          startTime: null,
          endTime: null,
        };
      });
      return mode === "append" ? [...prev, ...converted] : converted;
    });
  };

  const generateAIPlan = async () => {
    if (!startDate || !endDate || !destination) {
      alert("Destination and date range required before AI planning.");
      return;
    }
    if (
      sections.length > 1 ||
      (sections[0] && sections[0].description.trim() !== "")
    ) {
      const proceed = window.confirm(
        "Replace existing sections with AI generated plan? Click Cancel to append instead."
      );
      var mode: "replace" | "append" = proceed ? "replace" : "append";
    } else {
      mode = "replace";
    }

    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);

    try {
      // Enhanced request body with full context
      const body = {
        destination,
        startDate:
          typeof startDate === "string"
            ? startDate
            : new Date(startDate).toISOString().substring(0, 10),
        endDate:
          typeof endDate === "string"
            ? endDate
            : new Date(endDate).toISOString().substring(0, 10),
        suggestions: activeSuggestions,
        overallBudget: parseFloat(overallBudget) || undefined,
        style: "balanced",
        // Add current context for refinement
        currentTitle: tripTitle,
        currentDescription: description,
        currentSections: sections.map((s) => ({
          title: s.title,
          description: s.description,
          budget: parseFloat(s.budget) || 0,
          dateRange: s.dateRange,
        })),
        startTime,
        endTime,
      };

      console.log("📤 Sending AI request body:", body);

      const { data } = await api.post("/api/ai/plan", body);

      console.log("📥 Received AI response:", data);

      if (!data || !Array.isArray(data.sections)) {
        throw new Error("Invalid AI response structure");
      }

      if (data.sections.length === 0) {
        throw new Error("AI returned no sections");
      }

      applyAISections(data.sections, mode);
      setAiSummary(data.summary || null);

      console.log("✅ AI sections applied successfully");
    } catch (e: any) {
      console.error("💥 AI Plan error:", e);
      const errorMsg =
        e?.response?.data?.error || e.message || "AI generation failed";
      setAiError(errorMsg);

      // If backend fails, show user-friendly message
      if (errorMsg.includes("500")) {
        setAiError(
          "AI service temporarily unavailable. Please try again later."
        );
      }
    } finally {
      setAiLoading(false);
    }
  };

  const totalBudget = sections.reduce(
    (total, section) => total + (parseFloat(section.budget) || 0),
    0
  );
  const parsedOverallBudget = parseFloat(overallBudget) || 0;
  const overBudget =
    parsedOverallBudget > 0 && totalBudget > parsedOverallBudget;
  const budgetProgress =
    parsedOverallBudget > 0
      ? Math.min(100, (totalBudget / parsedOverallBudget) * 100)
      : 0;
  const sectionTimeIssues = sections.some(
    (s) =>
      !s.allDay && s.startTime && s.endTime && s.endTime.isBefore(s.startTime)
  );
  // FIX: Same date validation fix as PlanAi
  const sectionDateIssues = sections.some((s) => {
    // Skip validation if trip dates are not set
    if (!tripStartDate || !tripEndDate) return false;

    // Check if section dates are outside trip bounds
    if (s.startDate && s.startDate < tripStartDate) return true;
    if (s.endDate && s.endDate > tripEndDate) return true;
    if (s.startDate && s.endDate && s.endDate < s.startDate) return true;

    return false;
  });
  const canSave =
    !!destination &&
    !!tripTitle &&
    sections.every((s) => s.title.trim()) &&
    !sectionDateIssues &&
    !sectionTimeIssues;

  // Duplicate Trip effect
  useEffect(() => {
    if (editTrip) {
      setTripTitle(
        editTrip.title || (destination ? destination + " Trip" : "Trip")
      );
      if (editTrip.description) setDescription(editTrip.description);
      if (editTrip.plannedBudget != null)
        setOverallBudget(String(editTrip.plannedBudget));
      if (Array.isArray(editTrip.sections) && editTrip.sections.length) {
        setSections(
          editTrip.sections.map((s: any, idx: number) => {
            const sd = s.startDate ? new Date(s.startDate) : tripStartDate;
            const ed = s.endDate ? new Date(s.endDate) : tripEndDate;
            const dateRange =
              s.dateRange ||
              (sd && ed
                ? sd.toDateString() === ed.toDateString()
                  ? format(sd, "MMM d, yyyy")
                  : `${format(sd, "MMM d")} - ${format(ed, "MMM d, yyyy")}`
                : defaultDateRange);
            return {
              id: idx + 1,
              title: s.title || `Section ${idx + 1}`,
              description: s.description || "",
              dateRange,
              budget: s.budget != null ? String(s.budget) : "",
              startDate: sd,
              endDate: ed,
              allDay: s.allDay ?? true,
              startTime: s.startTime
                ? dayjs(`2000-01-01T${s.startTime}`)
                : null,
              endTime: s.endTime ? dayjs(`2000-01-01T${s.endTime}`) : null,
            } as Section;
          })
        );
      }
      return;
    }
    if (duplicateTrip) {
      if (duplicateTrip.title) {
        setTripTitle((duplicateTrip.title || "Trip") + " (Copy)");
      }
      if (duplicateTrip.description) setDescription(duplicateTrip.description);
      if (duplicateTrip.plannedBudget != null)
        setOverallBudget(String(duplicateTrip.plannedBudget));
      if (
        Array.isArray(duplicateTrip.sections) &&
        duplicateTrip.sections.length
      ) {
        setSections(
          duplicateTrip.sections.map((s: any, idx: number) => {
            const sd = s.startDate ? new Date(s.startDate) : tripStartDate;
            const ed = s.endDate ? new Date(s.endDate) : tripEndDate;
            const dateRange =
              s.dateRange ||
              (sd && ed
                ? sd.toDateString() === ed.toDateString()
                  ? format(sd, "MMM d, yyyy")
                  : `${format(sd, "MMM d")} - ${format(ed, "MMM d, yyyy")}`
                : defaultDateRange);
            return {
              id: idx + 1,
              title: (s.title || `Section ${idx + 1}`) + " (Copy)",
              description: s.description || "",
              dateRange,
              budget: s.budget != null ? String(s.budget) : "",
              startDate: sd,
              endDate: ed,
              allDay: s.allDay !== undefined ? s.allDay : true,
              startTime: s.startTime
                ? dayjs(`2000-01-01T${s.startTime}`)
                : null,
              endTime: s.endTime ? dayjs(`2000-01-01T${s.endTime}`) : null,
            } as Section;
          })
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrip, duplicateTrip]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
        <AppSidebar disableCollapse />
        <div className="flex-1">
          <div className="p-6">
            {/* Header & Meta */}
            <div className="mb-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold text-foreground">
                    Itinerary Builder
                  </h1>
                  {sectionDateIssues && (
                    <div className="flex items-center gap-1 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" /> Date issues
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={aiLoading}
                    onClick={generateAIPlan}
                    className="flex items-center gap-2"
                    title="Generate itinerary with AI"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Plan
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Card className="border-border/60">
                <CardContent className="p-5 grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Trip Title</Label>
                    <Input
                      value={tripTitle}
                      onChange={(e) => setTripTitle(e.target.value)}
                      placeholder="e.g. Bali Escape"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Destination</Label>
                    <Input
                      value={destination || ""}
                      disabled
                      className="bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">
                      Description (optional)
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief summary of the trip..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-sm font-medium">Trip Dates</Label>
                    <div className="text-sm text-muted-foreground">
                      {tripStartDate && tripEndDate
                        ? `${format(tripStartDate, "PPP")} → ${format(
                            tripEndDate,
                            "PPP"
                          )}`
                        : "Not specified"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Overall Budget (optional)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-10"
                        value={overallBudget}
                        onChange={(e) => setOverallBudget(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {parsedOverallBudget > 0 && (
                      <div className="mt-1">
                        <div className="h-2 w-full rounded bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              overBudget ? "bg-destructive" : "bg-primary"
                            )}
                            style={{ width: budgetProgress + "%" }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                          <span>${totalBudget.toFixed(2)}</span>
                          <span>${parsedOverallBudget.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {aiError && (
              <div className="mb-6 p-4 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                {aiError}
              </div>
            )}
            {aiSummary && (
              <div className="mb-6 p-4 rounded-md border border-primary/30 bg-primary/5 text-xs md:text-sm leading-relaxed">
                <div className="font-medium mb-1">
                  AI Plan Summary for {aiSummary.destination}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span>
                    Days: <strong>{aiSummary.days}</strong>
                  </span>
                  <span>
                    Activities Sampled:{" "}
                    <strong>{aiSummary.activitiesSampled}</strong>
                  </span>
                  <span>
                    Style: <strong>{aiSummary.styleApplied}</strong>
                  </span>
                  {aiSummary.totalPlannedBudget > 0 && (
                    <span>
                      Total Est. Budget: $
                      <strong>{aiSummary.totalPlannedBudget}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-6">
              {sections.map((section) => (
                <Card
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section.id)}
                  className={cn(
                    "shadow-travel border-border/50 hover:shadow-float transition-all duration-300 cursor-move",
                    draggedSection === section.id && "opacity-50 scale-95",
                    dragOverSection === section.id &&
                      draggedSection !== section.id &&
                      "border-primary/50 bg-primary/5 scale-102"
                  )}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Drag Handle */}
                        <div className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg text-foreground flex-1">
                          <Input
                            value={section.title}
                            onChange={(e) =>
                              updateSection(section.id, "title", e.target.value)
                            }
                            className="font-semibold text-lg border-none p-0 h-auto bg-transparent focus:bg-accent/10 rounded-md"
                          />
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={section.id === 1}
                          onClick={() => moveSection(section.id, "up")}
                          title="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={section.id === sections.length}
                          onClick={() => moveSection(section.id, "down")}
                          title="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeSection(section.id)}
                          disabled={sections.length === 1}
                          title="Delete Section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Textarea
                        value={section.description}
                        onChange={(e) =>
                          updateSection(
                            section.id,
                            "description",
                            e.target.value
                          )
                        }
                        className="min-h-[80px] border-2 transition-all duration-300 hover:border-primary/50 focus:border-primary resize-none"
                        placeholder="Describe activities, accommodation, or other details for this section..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Dates:
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal border-2 flex-1",
                                  !section.startDate && "text-muted-foreground",
                                  "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {section.startDate
                                  ? format(section.startDate, "PPP")
                                  : "Start Date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-card border-border shadow-float"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={section.startDate}
                                onSelect={(d) =>
                                  updateSection(
                                    section.id,
                                    "startDate",
                                    d || null
                                  )
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal border-2 flex-1",
                                  !section.endDate && "text-muted-foreground",
                                  "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {section.endDate
                                  ? format(section.endDate, "PPP")
                                  : "End Date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 bg-card border-border shadow-float"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={section.endDate}
                                onSelect={(d) =>
                                  updateSection(
                                    section.id,
                                    "endDate",
                                    d || null
                                  )
                                }
                                disabled={(date) =>
                                  section.startDate
                                    ? date < section.startDate
                                    : false
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {section.dateRange && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />{" "}
                            {section.dateRange}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Budget of this section:
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={section.budget}
                            onChange={(e) =>
                              updateSection(
                                section.id,
                                "budget",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="pl-10 border-2 transition-all duration-300 hover:border-primary/50 focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Section-level Time Window */}
                    <div className="mt-2 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Clock className="h-4 w-4 text-primary" /> Time Window
                          (optional)
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            All day
                          </span>
                          <Switch
                            checked={section.allDay ?? true}
                            onCheckedChange={(checked) =>
                              toggleSectionAllDay(section.id, checked)
                            }
                            aria-label="Toggle all day for this section"
                          />
                        </div>
                      </div>
                      {!section.allDay && (
                        <div className="mt-3">
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="flex-1">
                                <Label className="text-xs mb-1 block">
                                  Start
                                </Label>
                                <TimePicker
                                  ampm
                                  format="hh:mm a"
                                  value={section.startTime ?? null}
                                  onChange={(val) =>
                                    updateSectionTime(section.id, "start", val)
                                  }
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                    },
                                  }}
                                />
                              </div>
                              <div className="hidden sm:flex items-center justify-center pt-6 text-muted-foreground">
                                <ArrowRight className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs mb-1 block">
                                  End
                                </Label>
                                <TimePicker
                                  ampm
                                  format="hh:mm a"
                                  value={section.endTime ?? null}
                                  onChange={(val) =>
                                    updateSectionTime(section.id, "end", val)
                                  }
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          </LocalizationProvider>
                          {section.startTime &&
                            section.endTime &&
                            section.endTime.isBefore(section.startTime) && (
                              <p className="mt-2 text-xs text-destructive">
                                End time is before start time. Please adjust.
                              </p>
                            )}
                          {!section.startTime && !section.endTime && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Specify times if your trip has a preferred
                              start/end window.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add Section Button */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={addSection}
                variant="outline"
                className="border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another Section
              </Button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mt-12 py-4 border-t border-border/60">
              <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                <span>Total Sections: {sections.length}</span>
                <span>Section Budget Sum: ${totalBudget.toFixed(2)}</span>
                {parsedOverallBudget > 0 && (
                  <span
                    className={cn(overBudget && "text-destructive font-medium")}
                  >
                    Overall Budget: ${parsedOverallBudget.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/planning")}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!canSave}
                  onClick={() => {
                    if (!destination) {
                      alert("Destination required");
                      return;
                    }

                    console.log(
                      isEditing ? "🔄 Updating trip..." : "💾 Creating trip..."
                    );

                    // Show immediate feedback
                    const button = document.querySelector(
                      "[data-save-button]"
                    ) as HTMLButtonElement;
                    if (button && isEditing) {
                      button.textContent = "Updating...";
                      button.disabled = true;
                    }

                    const baseStart =
                      typeof startDate === "string"
                        ? new Date(startDate)
                        : startDate || sections[0].startDate || new Date();
                    const baseEnd =
                      typeof endDate === "string"
                        ? new Date(endDate)
                        : endDate ||
                          sections[sections.length - 1].endDate ||
                          baseStart;

                    const tripSections = sections.map((s) => ({
                      id: s.id,
                      title: s.title.trim() || `Section ${s.id}`,
                      description: s.description,
                      dateRange: s.dateRange,
                      budget: parseFloat(s.budget) || 0,
                      allDay: s.allDay ?? true,
                      startTime: s.startTime
                        ? s.startTime.format("HH:mm")
                        : undefined,
                      endTime: s.endTime
                        ? s.endTime.format("HH:mm")
                        : undefined,
                      startDate: s.startDate
                        ? s.startDate.toISOString().substring(0, 10)
                        : undefined,
                      endDate: s.endDate
                        ? s.endDate.toISOString().substring(0, 10)
                        : undefined,
                    }));

                    const calculatedTotalBudget = tripSections.reduce(
                      (sum, s) => sum + (s.budget || 0),
                      0
                    );

                    try {
                      if (isEditing && updateTrip && editTrip?.id) {
                        // UPDATE EXISTING TRIP
                        const updateData = {
                          title: tripTitle.trim() || destination + " Trip",
                          destination,
                          startDate: baseStart.toISOString().split("T")[0],
                          endDate: baseEnd.toISOString().split("T")[0],
                          participants: editTrip?.participants || 1,
                          suggestions: activeSuggestions,
                          sections: tripSections,
                          plannedBudget:
                            parsedOverallBudget || calculatedTotalBudget || 0,
                          description: description.trim() || undefined,
                          startTime: startTime || undefined,
                          endTime: endTime || undefined,
                          visibility: editTrip?.visibility || "private",
                        };

                        console.log("📦 Updating trip with data:", updateData);
                        const updated = updateTrip(editTrip.id, updateData);

                        if (updated) {
                          console.log("✅ Trip updated successfully!", updated);
                          // Show success feedback
                          if (button) {
                            button.textContent = "Updated! ✓";
                            button.style.backgroundColor = "#10b981";
                            setTimeout(() => {
                              navigate("/my-trips");
                            }, 1000);
                          } else {
                            navigate("/my-trips");
                          }
                        } else {
                          throw new Error("Update returned null");
                        }
                      } else {
                        // CREATE NEW TRIP
                        const tripData = {
                          title: tripTitle.trim() || destination + " Trip",
                          destination,
                          startDate: baseStart.toISOString().split("T")[0],
                          endDate: baseEnd.toISOString().split("T")[0],
                          participants: 1,
                          suggestions: activeSuggestions,
                          sections: tripSections,
                          coverPhotoFile: coverPhotoFile || null,
                          plannedBudget:
                            parsedOverallBudget || calculatedTotalBudget || 0,
                          description: description.trim() || undefined,
                          startTime: startTime || undefined,
                          endTime: endTime || undefined,
                          visibility: visibility || "private",
                        };

                        console.log(
                          "📦 Creating new trip with data:",
                          tripData
                        );
                        const createdTrip = addTrip(tripData);
                        console.log(
                          "✅ Trip created successfully!",
                          createdTrip
                        );
                        navigate("/my-trips");
                      }
                    } catch (error) {
                      console.error(
                        `Failed to ${isEditing ? "update" : "create"} trip:`,
                        error
                      );

                      // Reset button state
                      if (button) {
                        button.textContent = isEditing
                          ? "Update Trip"
                          : "Create Trip";
                        button.disabled = false;
                        button.style.backgroundColor = "";
                      }

                      alert(
                        `Failed to ${
                          isEditing ? "update" : "create"
                        } trip. Please try again.`
                      );
                    }
                  }}
                  data-save-button
                  className="px-8 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-travel"
                >
                  {isEditing ? "🔄 Update Trip" : "💾 Create Trip"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Itinerary;
