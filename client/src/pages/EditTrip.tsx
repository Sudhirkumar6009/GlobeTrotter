import { useParams, useNavigate } from "react-router-dom";
import { useTrips } from "@/context/TripContext";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface EditableSection {
  id: number;
  title: string;
  description: string;
  dateRange: string;
  budget: number;
}

export default function EditTrip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, updateTrip } = useTrips();
  const trip = useMemo(() => trips.find((t) => t.id === id), [trips, id]);

  const [title, setTitle] = useState(trip?.title || "");
  const [description, setDescription] = useState(trip?.description || "");
  const [sections, setSections] = useState<EditableSection[]>(() =>
    (trip?.sections || []).map((s) => ({ ...s }))
  );

  if (!trip) {
    return <div className="p-6">Trip not found.</div>;
  }

  if (trip.status === "completed") {
    return <div className="p-6">Completed trips cannot be edited.</div>;
  }

  const addSection = () => {
    const nextId = sections.length
      ? Math.max(...sections.map((s) => s.id)) + 1
      : 1;
    setSections((prev) => [
      ...prev,
      {
        id: nextId,
        title: `New Section ${nextId}`,
        description: "",
        dateRange: trip.startDate + " - " + trip.endDate,
        budget: 0,
      },
    ]);
  };

  const updateSection = (id: number, patch: Partial<EditableSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const removeSection = (id: number) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    updateTrip(trip.id, { title, description, sections });
    navigate("/my-trips");
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold">Edit Trip</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Trip Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Button size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" />
                Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.id} className="p-4 border rounded-md space-y-3">
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={sec.title}
                      onChange={(e) =>
                        updateSection(sec.id, { title: e.target.value })
                      }
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSection(sec.id)}
                      disabled={sections.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={sec.description}
                    onChange={(e) =>
                      updateSection(sec.id, { description: e.target.value })
                    }
                  />
                  <div className="flex gap-4">
                    <Input
                      type="text"
                      className="flex-1"
                      value={sec.dateRange}
                      onChange={(e) =>
                        updateSection(sec.id, { dateRange: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      className="w-40"
                      value={sec.budget}
                      onChange={(e) =>
                        updateSection(sec.id, {
                          budget: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sections yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
