import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, Calendar, Users } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const handleClose = () => {
    // Mark the modal as shown in localStorage
    localStorage.setItem("welcomeModalShown", "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-0 bg-hero-gradient p-0">
        <div className="relative overflow-hidden rounded-lg">
          <div className="bg-hero-gradient p-8 text-center text-white">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <h1 className="mb-2 text-3xl font-bold">Welcome to GlobeTrotter</h1>
              <p className="text-lg text-white/90">
                Your journey to extraordinary adventures starts here
              </p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
                <MapPin className="h-4 w-4" />
                <span>Discover Destinations</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
                <Calendar className="h-4 w-4" />
                <span>Plan Itineraries</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
                <Users className="h-4 w-4" />
                <span>Share Experiences</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
                <Plane className="h-4 w-4" />
                <span>Track Budgets</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full bg-white text-primary hover:bg-white/90"
                onClick={handleClose}
              >
                Start Planning Your Adventure
              </Button>
              <p className="text-xs text-white/70">
                Ready to explore the world? Let's create unforgettable memories together.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}