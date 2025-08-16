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
  Sparkles,
  Bot,
} from "lucide-react";
import { format } from "date-fns";
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
import { GoogleGenAI } from "@google/genai";

interface Section {
  id: number;
  title: string;
  description: string;
  dateRange: string;
  budget: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

const PlanAi = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    startDate,
    endDate,
    destination,
    suggestions = [],
    coverPhotoFile = null,
    duplicateTrip,
    editTrip,
  } = location.state || {};
  const { addTrip, updateTrip } = useTrips(); // Remove 'as any'

  // NEW: derive editing + suggestions EARLY (fix TDZ usage in generateAIContent)
  const isEditing = !!editTrip?.id;
  const activeSuggestions =
    editTrip?.suggestions || duplicateTrip?.suggestions || suggestions;

  // AI-related state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

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

  const [localDestination, setLocalDestination] = useState<string>(
    destination || ""
  );
  const [tripTitle, setTripTitle] = useState(
    destination || localDestination
      ? (destination || localDestination) + " AI Trip"
      : "AI Generated Trip"
  );
  const [overallBudget, setOverallBudget] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([
    {
      id: 1,
      title: "AI Section 1:",
      description:
        "This section will be populated by AI recommendations.\nAI will suggest activities, accommodation, or travel details",
      dateRange: defaultDateRange,
      budget: "",
      startDate: tripStartDate,
      endDate: tripEndDate,
    },
  ]);

  // Gemini AI Integration with structured response
  const generateAIContent = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setAiError(null);
    setAiResponse("");

    const safeExtractText = (result: any): string => {
      try {
        // New SDK pattern: result.response.text()
        if (result?.response && typeof result.response.text === "function") {
          const t = result.response.text();
          if (typeof t === "string") return t;
        }
        // Some builds: await result.response then .text()
        if (
          result?.response &&
          typeof result.response === "object" &&
          typeof result.response.text === "function"
        ) {
          return result.response.text();
        }
        // Direct property
        if (typeof result?.text === "string") return result.text;
        if (typeof result?.output_text === "string") return result.output_text;
        // Candidate path
        const cand =
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof cand === "string") return cand;
        // Raw parts array
        const parts0 = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof parts0 === "string") return parts0;
      } catch (e) {
        console.warn("[AI] text extraction error", e);
      }
      return "";
    };

    const extractJson = (raw: string): any | null => {
      if (!raw) return null;
      // Try fenced or first { .. last }
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      let body = fence ? fence[1] : raw;
      // Trim leading junk before first {
      const first = body.indexOf("{");
      const last = body.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        body = body.slice(first, last + 1);
      }
      // Cleanup common trailing commas
      body = body
        .replace(/\r/g, "")
        .replace(/,\s*([}\]])/g, "$1")
        .trim();
      try {
        return JSON.parse(body);
      } catch (e) {
        console.warn(
          "[AI] primary JSON parse failed, attempting aggressive cleanup",
          e
        );
        // Aggressive: collapse whitespace & remove stray backticks
        let cleaned = body
          .replace(/```/g, "")
          .replace(/^[^{]+/, "")
          .replace(/[^}]+$/, "")
          .replace(/\s+/g, " ");
        try {
          return JSON.parse(cleaned);
        } catch (e2) {
          console.error("[AI] JSON parse failed after cleanup", e2);
          return null;
        }
      }
    };

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
      if (!apiKey) {
        setAiError("Missing Gemini API key (VITE_GEMINI_API_KEY).");
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const currentPlanPreview = sections.map((s) => ({
        id: s.id,
        title: s.title,
        startDate: s.startDate
          ? s.startDate.toISOString().substring(0, 10)
          : null,
        endDate: s.endDate ? s.endDate.toISOString().substring(0, 10) : null,
        dateRange: s.dateRange,
        budget: s.budget ? parseFloat(s.budget) || 0 : 0,
        description: s.description,
      }));

      const tripMeta = {
        destination: destination || "Not specified",
        startDate: tripStartDate?.toISOString().substring(0, 10) || null,
        endDate: tripEndDate?.toISOString().substring(0, 10) || null,
        overallBudget: overallBudget ? Number(overallBudget) : null,
        interests: activeSuggestions || [], // changed
        participants: 1,
        currentTitle: tripTitle,
        currentDescription: description || "",
      };

      const structuredPrompt = `You are an expert travel planner. Create a detailed, researched travel itinerary.

USER REQUEST: "${aiPrompt}"

CURRENT TRIP CONTEXT:
${JSON.stringify(tripMeta, null, 2)}

CURRENT SECTIONS TO IMPROVE/REPLACE:
${JSON.stringify(currentPlanPreview, null, 2)}

OUTPUT ONLY THIS JSON STRUCTURE (no extra text):
{
  "tripTitle": "Updated trip title based on user request",
  "description": "2-3 sentence trip overview",
  "estimatedBudget": 1500,
  "sections": [
    {
      "title": "Day 1: Arrival and City Exploration",
      "description": "Detailed itinerary with specific venues, times, and activities. Include practical information like opening hours and approximate costs.",
      "estimatedCost": 300,
      "startDate": "2024-01-15",
      "endDate": "2024-01-15",
      "places": [
        {"name": "Central Park", "url": "https://www.centralparknyc.org"},
        {"name": "Metropolitan Museum", "url": "https://www.metmuseum.org"}
      ],
      "dining": [
        {"name": "Local Restaurant Name", "url": "https://restaurant-website.com"}
      ],
      "sources": [
        {"title": "NYC Tourism Board", "url": "https://www.nycgo.com"}
      ]
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations.`;

      // Call model (use consistent model id)
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          {
            role: "user",
            parts: [{ text: structuredPrompt }],
          },
        ],
      });

      const rawText = safeExtractText(result);
      if (!rawText) {
        setAiError("AI returned no text content.");
        setAiResponse("No content generated.");
        return;
      }
      setAiResponse(rawText);

      const aiData = extractJson(rawText);
      if (!aiData) {
        setAiError("Failed to parse AI JSON. Try refining your prompt.");
        return;
      }

      // Apply top-level fields
      if (aiData.tripTitle) setTripTitle(String(aiData.tripTitle));
      if (aiData.description) setDescription(String(aiData.description));
      if (aiData.estimatedBudget != null)
        setOverallBudget(String(Number(aiData.estimatedBudget) || 0));

      // Sections mapping
      if (Array.isArray(aiData.sections) && aiData.sections.length > 0) {
        const newSections: Section[] = aiData.sections.map(
          (section: any, index: number) => {
            let sectionStartDate = tripStartDate;
            let sectionEndDate = tripEndDate;

            // Use provided dates if valid
            const parsedStart = section.startDate
              ? new Date(section.startDate)
              : null;
            const parsedEnd = section.endDate
              ? new Date(section.endDate)
              : null;
            if (parsedStart && !isNaN(parsedStart.getTime()))
              sectionStartDate = parsedStart;
            if (parsedEnd && !isNaN(parsedEnd.getTime()))
              sectionEndDate = parsedEnd;

            // Distribute if multiple sections & trip window exists
            if (tripStartDate && tripEndDate && aiData.sections.length > 1) {
              const totalDays =
                Math.ceil(
                  (tripEndDate.getTime() - tripStartDate.getTime()) / 86400000
                ) + 1;
              const daysPerSection = Math.max(
                1,
                Math.floor(totalDays / aiData.sections.length)
              );
              const startDay = index * daysPerSection;
              const endDay = Math.min(
                startDay + daysPerSection - 1,
                totalDays - 1
              );
              sectionStartDate = new Date(
                tripStartDate.getTime() + startDay * 86400000
              );
              sectionEndDate = new Date(
                tripStartDate.getTime() + endDay * 86400000
              );
            }

            const places = Array.isArray(section.places) ? section.places : [];
            const dining = Array.isArray(section.dining) ? section.dining : [];
            const sources = Array.isArray(section.sources)
              ? section.sources
              : [];
            const extraBlocks: string[] = [];
            if (places.length)
              extraBlocks.push(
                `🏛️ Places to Visit:\n${places
                  .map((p: any) => `• ${p.name}${p.url ? ` (${p.url})` : ""}`)
                  .join("\n")}`
              );
            if (dining.length)
              extraBlocks.push(
                `🍽️ Dining Options:\n${dining
                  .map((d: any) => `• ${d.name}${d.url ? ` (${d.url})` : ""}`)
                  .join("\n")}`
              );
            if (sources.length)
              extraBlocks.push(
                `📚 Sources:\n${sources
                  .map((s: any) => `• ${s.title || s.url}: ${s.url}`)
                  .join("\n")}`
              );

            const fullDesc = [
              section.description || "AI-generated content",
              ...extraBlocks,
            ]
              .filter(Boolean)
              .join("\n\n");

            let dateRange = defaultDateRange;
            if (sectionStartDate && sectionEndDate) {
              dateRange =
                sectionStartDate.toDateString() ===
                sectionEndDate.toDateString()
                  ? format(sectionStartDate, "MMM d, yyyy")
                  : `${format(sectionStartDate, "MMM d")} - ${format(
                      sectionEndDate,
                      "MMM d, yyyy"
                    )}`;
            }

            return {
              id: index + 1,
              title: section.title || `AI Section ${index + 1}`,
              description: fullDesc,
              dateRange,
              budget: String(section.estimatedCost ?? 0),
              startDate: sectionStartDate,
              endDate: sectionEndDate,
            };
          }
        );
        setSections(newSections);
      } else {
        setAiError("AI did not return any sections.");
      }
    } catch (err: any) {
      console.error("[AI] Generation failed:", err);
      setAiError(
        err?.message
          ? `AI generation failed: ${err.message}`
          : "AI generation failed due to an unknown error."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Improved fallback manual parsing function
  const parseResponseManually = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const newSections: Section[] = [];
    let currentSection: Partial<Section> = {};
    let sectionId = 1;

    // Calculate date increments for daily sections
    const dayIncrement = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    let currentDate = tripStartDate ? new Date(tripStartDate) : new Date();

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Look for section headers (Day 1, Day 2, etc.)
      if (
        trimmedLine.match(
          /^(Day \d+|Section \d+|Accommodation|Transportation|Activities|Dining)/i
        )
      ) {
        if (currentSection.title) {
          // Calculate dates for the previous section
          const sectionStartDate = new Date(currentDate);
          const sectionEndDate = new Date(currentDate);

          // If it's a daily section, increment the date
          if (currentSection.title.match(/^Day \d+/i)) {
            currentDate = new Date(currentDate.getTime() + dayIncrement);
          }

          const dateRange =
            sectionStartDate.toDateString() === sectionEndDate.toDateString()
              ? format(sectionStartDate, "MMM d, yyyy")
              : `${format(sectionStartDate, "MMM d")} - ${format(
                  sectionEndDate,
                  "MMM d, yyyy"
                )}`;

          newSections.push({
            id: sectionId++,
            title: currentSection.title,
            description: currentSection.description || "AI-generated content",
            dateRange,
            budget: extractBudget(currentSection.description || "").toString(),
            startDate: sectionStartDate,
            endDate: sectionEndDate,
          });
        }
        currentSection = {
          title: trimmedLine,
          description: "",
        };
      } else if (currentSection.title && trimmedLine.length > 10) {
        currentSection.description =
          (currentSection.description || "") +
          (currentSection.description ? "\n" : "") +
          trimmedLine;
      }
    });

    // Add the last section
    if (currentSection.title) {
      const sectionStartDate = new Date(currentDate);
      const sectionEndDate = tripEndDate
        ? new Date(tripEndDate)
        : new Date(currentDate);

      const dateRange =
        sectionStartDate.toDateString() === sectionEndDate.toDateString()
          ? format(sectionStartDate, "MMM d, yyyy")
          : `${format(sectionStartDate, "MMM d")} - ${format(
              sectionEndDate,
              "MMM d, yyyy"
            )}`;

      newSections.push({
        id: sectionId,
        title: currentSection.title,
        description: currentSection.description || "AI-generated content",
        dateRange,
        budget: extractBudget(currentSection.description || "").toString(),
        startDate: sectionStartDate,
        endDate: sectionEndDate,
      });
    }

    if (newSections.length > 0) {
      setSections(newSections);
    }
  };

  // Helper function to extract budget from text
  const extractBudget = (text: string): number => {
    const budgetMatches = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    if (budgetMatches) {
      return parseFloat(budgetMatches[0].replace("$", "").replace(",", ""));
    }
    return 0;
  };

  // Function to populate sections from AI response (placeholder)
  const populateSectionsFromAI = () => {
    // This function is already handled in the generateAIContent function
    // when parsing the AI response, so this is just a placeholder
    console.log("Sections already populated from AI response");
  };

  // Function to add a new section
  const addSection = () => {
    const newId = Math.max(...sections.map((s) => s.id)) + 1;
    const newSection: Section = {
      id: newId,
      title: `AI Section ${newId}`,
      description:
        "This section will be populated by AI recommendations.\nAI will suggest activities, accommodation, or travel details",
      dateRange: defaultDateRange,
      budget: "",
      startDate: tripStartDate,
      endDate: tripEndDate,
    };
    setSections([...sections, newSection]);
  };

  // Function to remove a section
  const removeSection = (id: number) => {
    if (sections.length === 1) return;
    setSections(sections.filter((section) => section.id !== id));
  };

  // Function to move section up or down
  const moveSection = (id: number, direction: "up" | "down") => {
    const currentIndex = sections.findIndex((section) => section.id === id);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    [newSections[currentIndex], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[currentIndex],
    ];

    setSections(newSections);
  };

  // Improved updateSection function with better date handling
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
          field === "budget"
        ) {
          updated[field] = value as string;
        } else if (field === "startDate" || field === "endDate") {
          updated[field] = value as Date | null;

          // Update dateRange when dates change
          const sd =
            field === "startDate" ? (value as Date | null) : section.startDate;
          const ed =
            field === "endDate" ? (value as Date | null) : section.endDate;

          updated.startDate = sd;
          updated.endDate = ed;

          if (sd && ed) {
            // Ensure end date is not before start date
            if (ed < sd) {
              updated.startDate = ed;
              updated.endDate = sd;
            }

            // Format date range
            if (
              updated.startDate!.toDateString() ===
              updated.endDate!.toDateString()
            ) {
              updated.dateRange = format(updated.startDate!, "MMM d, yyyy");
            } else {
              updated.dateRange = `${format(
                updated.startDate!,
                "MMM d"
              )} - ${format(updated.endDate!, "MMM d, yyyy")}`;
            }
          } else if (sd) {
            updated.dateRange = `${format(sd, "MMM d, yyyy")} - ...`;
          } else if (ed) {
            updated.dateRange = `... - ${format(ed, "MMM d, yyyy")}`;
          } else {
            updated.dateRange = "";
          }
        } else if (field === "dateRange") {
          updated[field] = value as string;
        }

        return updated;
      })
    );
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
  // Fix date validation to be more lenient
  const sectionDateIssues = sections.some((s) => {
    if (!tripStartDate || !tripEndDate || !s.startDate || !s.endDate)
      return false; // only validate when full window exists
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (s.startDate.getTime() < tripStartDate.getTime() - oneDayMs) return true;
    if (s.endDate.getTime() > tripEndDate.getTime() + oneDayMs) return true;
    if (s.endDate < s.startDate) return true;
    return false;
  });

  // Destination value preference
  const effectiveDestination = destination || localDestination;

  const canSave = (() => {
    if (!effectiveDestination.trim()) return false;
    if (!tripTitle || !tripTitle.trim()) return false;
    if (!sections.every((s) => s.title && s.title.trim())) return false;
    if (sectionDateIssues) return false;
    return true;
  })();

  // Active suggestions (original / duplicate / edit)
  // Duplicate Trip effect
  useEffect(() => {
    if (editTrip) {
      // EDIT MODE
      const e = editTrip;
      setLocalDestination(e.destination || "");
      setTripTitle(e.title || "AI Generated Trip");
      if (e.description) setDescription(e.description);
      if (e.plannedBudget != null) setOverallBudget(String(e.plannedBudget));
      if (Array.isArray(e.sections) && e.sections.length) {
        setSections(
          e.sections.map((s: any, idx: number) => {
            const sd = s.startDate ? new Date(s.startDate) : tripStartDate;
            const ed = s.endDate ? new Date(s.endDate) : tripEndDate;
            return {
              id: idx + 1,
              title: s.title || `AI Section ${idx + 1}`,
              description: s.description || "",
              dateRange:
                s.dateRange ||
                (sd && ed
                  ? sd.toDateString() === ed.toDateString()
                    ? format(sd, "MMM d, yyyy")
                    : `${format(sd, "MMM d")} - ${format(ed, "MMM d, yyyy")}`
                  : defaultDateRange),
              budget: s.budget != null ? String(s.budget) : "",
              startDate: sd,
              endDate: ed,
            } as Section;
          })
        );
      }
      return; // do not also run duplicate branch
    }
    if (duplicateTrip) {
      const dupDest = duplicateTrip.destination || "";
      setLocalDestination(dupDest);
      setTripTitle((duplicateTrip.title || dupDest || "Trip") + " (Copy)");
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
            return {
              id: idx + 1,
              title: (s.title || `AI Section ${idx + 1}`) + " (Copy)",
              description: s.description || "",
              dateRange:
                s.dateRange ||
                (sd && ed
                  ? sd.toDateString() === ed.toDateString()
                    ? format(sd, "MMM d, yyyy")
                    : `${format(sd, "MMM d")} - ${format(ed, "MMM d, yyyy")}`
                  : defaultDateRange),
              budget:
                s.budget != null
                  ? String(s.budget)
                  : s.estimatedCost != null
                  ? String(s.estimatedCost)
                  : "",
              startDate: sd,
              endDate: ed,
            } as Section;
          })
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrip, duplicateTrip]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-40 border-r bg-card overflow-y-auto">
          <AppSidebar disableCollapse />
        </div>
        <div className="flex-1 ml-64 overflow-y-auto">
          <div className="p-6">
            {/* Header & Meta */}
            <div className="mb-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Bot className="h-8 w-8 text-primary" />
                    AI Itinerary Builder
                  </h1>
                  {sectionDateIssues && (
                    <div className="flex items-center gap-1 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" /> Date issues
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-primary">
                  GlobeTrotter AI
                </div>
              </div>

              {/* AI Generation Section */}
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Trip Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Describe your ideal trip</Label>
                    <Textarea
                      placeholder="e.g., I want a romantic 5-day trip with good restaurants, cultural activities, and a budget of $2000. Include visits to famous landmarks and local cuisine experiences."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateAIContent}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="flex-1 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating AI Itinerary...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Itinerary
                        </>
                      )}
                    </Button>
                  </div>
                  {aiResponse && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label>AI Generated Content</Label>
                        <Button
                          onClick={() => setAiResponse("")}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="p-4 bg-background rounded-md border max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm">
                          {aiResponse}
                        </pre>
                      </div>
                    </div>
                  )}
                  {aiError && (
                    <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
                      <p className="text-sm font-medium">AI Error:</p>
                      <p className="text-sm">{aiError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-5 grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Trip Title</Label>
                    <Input
                      value={tripTitle}
                      onChange={(e) => setTripTitle(e.target.value)}
                      placeholder="e.g. AI-Planned Bali Escape"
                    />
                  </div>
                  {/* Destination (editable only if not pre-supplied) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Destination</Label>
                    <Input
                      value={effectiveDestination}
                      onChange={(e) => {
                        if (!destination) {
                          setLocalDestination(e.target.value);
                          // auto-update title if still default
                          setTripTitle((prev) =>
                            prev.startsWith("AI Generated Trip") ||
                            prev.endsWith(" AI Trip")
                              ? e.target.value
                                ? e.target.value + " AI Trip"
                                : "AI Generated Trip"
                              : prev
                          );
                        }
                      }}
                      disabled={!!destination}
                      placeholder="Enter destination"
                      className={destination ? "bg-muted/40" : ""}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">
                      Description (optional)
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="AI-generated trip summary..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  {/* ...existing code for dates and budget... */}
                  <div className="space-y-2">
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

            {/* Selected Suggestions Summary */}
            {activeSuggestions.length > 0 && (
              <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="p-4">
                  <div className="text-sm flex flex-wrap gap-2">
                    {activeSuggestions.map((s: string) => (
                      <span
                        key={s}
                        className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sections */}
            <div className="space-y-6">
              {sections.map((section) => (
                <Card
                  key={section.id}
                  className="shadow-travel border-border/50 hover:shadow-float transition-all duration-300"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg text-foreground flex-1">
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            updateSection(section.id, "title", e.target.value)
                          }
                          className="font-semibold text-lg border-none p-0 h-auto bg-transparent focus:bg-accent/10 rounded-md"
                        />
                      </CardTitle>
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
                        placeholder="AI will populate this section with travel recommendations..."
                      />
                    </div>

                    {/* ...existing code for date and budget inputs... */}
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
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
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
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
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
                Add AI Section
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
                    console.log(
                      isEditing
                        ? "🔄 Updating AI trip..."
                        : "💾 Saving AI trip..."
                    );

                    // Show immediate feedback
                    const button = document.querySelector(
                      "[data-save-button]"
                    ) as HTMLButtonElement;
                    if (button && isEditing) {
                      button.textContent = "Updating...";
                      button.disabled = true;
                    }

                    const sectionDates = sections
                      .map((s) => s.startDate)
                      .filter((d): d is Date => !!d && !isNaN(d.getTime()));
                    const sectionEndDates = sections
                      .map((s) => s.endDate)
                      .filter((d): d is Date => !!d && !isNaN(d.getTime()));
                    const fallbackStart = sectionDates.length
                      ? new Date(
                          Math.min(...sectionDates.map((d) => d.getTime()))
                        )
                      : new Date();
                    const fallbackEnd = sectionEndDates.length
                      ? new Date(
                          Math.max(...sectionEndDates.map((d) => d.getTime()))
                        )
                      : fallbackStart;

                    const finalStart = startDate
                      ? typeof startDate === "string"
                        ? new Date(startDate)
                        : startDate
                      : fallbackStart;
                    const finalEnd = endDate
                      ? typeof endDate === "string"
                        ? new Date(endDate)
                        : endDate
                      : fallbackEnd;

                    const effectiveDestinationFinal =
                      effectiveDestination && effectiveDestination.trim()
                        ? effectiveDestination.trim()
                        : "Unnamed Destination";

                    try {
                      const tripSections = sections.map((s) => ({
                        id: s.id,
                        title: s.title.trim() || `AI Section ${s.id}`,
                        description: s.description,
                        dateRange: s.dateRange,
                        budget: parseFloat(s.budget) || 0,
                        startDate: s.startDate
                          ? s.startDate.toISOString().substring(0, 10)
                          : undefined,
                        endDate: s.endDate
                          ? s.endDate.toISOString().substring(0, 10)
                          : undefined,
                      }));

                      if (isEditing && updateTrip && editTrip?.id) {
                        // UPDATE EXISTING TRIP
                        const updateData = {
                          title:
                            tripTitle.trim() ||
                            effectiveDestinationFinal + " AI Trip",
                          destination: effectiveDestinationFinal,
                          startDate: finalStart.toISOString().split("T")[0],
                          endDate: finalEnd.toISOString().split("T")[0],
                          participants: editTrip?.participants || 1,
                          suggestions: activeSuggestions,
                          sections: tripSections,
                          plannedBudget: parsedOverallBudget || undefined,
                          description: description.trim() || undefined,
                          visibility: editTrip?.visibility || "private",
                        };

                        console.log("📦 Updating trip with data:", updateData);
                        Promise.resolve(updateTrip(editTrip.id, updateData))
                          .then((updated: any) => {
                            if (updated) {
                              console.log(
                                "✅ Trip updated successfully!",
                                updated
                              );
                              if (button) {
                                button.textContent = "Updated! ✓";
                                button.style.backgroundColor = "#10b981";
                                setTimeout(() => {
                                  navigate(`/trip/${updated.id}`);
                                }, 800);
                              } else if (updated.id) {
                                navigate(`/trip/${updated.id}`);
                              }
                            } else {
                              throw new Error("Update returned null");
                            }
                          })
                          .catch((err) => {
                            console.error("Update failed", err);
                            throw err;
                          });
                      } else {
                        // CREATE NEW TRIP
                        const tripData = {
                          title:
                            tripTitle.trim() ||
                            effectiveDestinationFinal + " AI Trip",
                          destination: effectiveDestinationFinal,
                          startDate: finalStart.toISOString().split("T")[0],
                          endDate: finalEnd.toISOString().split("T")[0],
                          participants: 1,
                          suggestions: activeSuggestions,
                          sections: tripSections,
                          coverPhotoFile: coverPhotoFile || undefined,
                          plannedBudget: parsedOverallBudget || undefined,
                          description: description.trim() || undefined,
                          visibility: "private" as const,
                        };

                        console.log(
                          "📦 Creating new trip with data:",
                          tripData
                        );
                        const created = addTrip(tripData);
                        console.log("✅ Trip created successfully!", created);
                        navigate(`/trip/${created?.id || "/my-trips"}`);
                      }
                    } catch (error) {
                      console.error("❌ Save/Update failed:", error);

                      // Reset button state
                      if (button) {
                        button.textContent = isEditing
                          ? "Update Trip"
                          : "Save AI Itinerary";
                        button.disabled = false;
                        button.style.backgroundColor = "";
                      }

                      alert(
                        `Failed to ${
                          isEditing ? "update" : "save"
                        } trip. Please try again.`
                      );
                    }
                  }}
                  data-save-button
                  className="px-8 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-travel"
                >
                  {isEditing ? "🔄 Update Trip" : "💾 Save AI Itinerary"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlanAi;
