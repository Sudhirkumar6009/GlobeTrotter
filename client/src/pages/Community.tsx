import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Community() {
  const [name, setName] = useState("");
  const { toast } = useToast();

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar disableCollapse />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-primary">
                Create Community
              </h1>
            </div>
            <Card className="border-border/60 shadow-travel">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Community Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="communityName">Community Name</Label>
                  <Input
                    id="communityName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Solo Travelers"
                  />
                </div>
                <Button
                  disabled={!name.trim()}
                  onClick={() => {
                    toast({
                      title: "Community Created",
                      description: `"${name.trim()}" placeholder saved (not persisted yet).`,
                    });
                    setName("");
                  }}
                  className="w-full"
                >
                  Save
                </Button>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              (Data persistence for communities not yet implemented.)
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
