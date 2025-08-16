import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { format } from "date-fns";
import {
  fetchTrips,
  fetchPublicTrips,
  createTrip,
  CreateTripPayload,
  updateTrip as apiUpdateTrip,
  fetchTripById,
} from "@/lib/tripService";
import { useAuth } from "@/context/AuthContext";
import { getAuthTokenFromCookie } from "@/lib/authService"; // NEW (token guard)

export type TripStatus = "upcoming" | "ongoing" | "completed" | "current";

export interface TripSection {
  id: number;
  title: string;
  description: string;
  dateRange: string;
  budget: number; // numeric for easier calculations
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string; // ISO or formatted string used in UI
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: TripStatus;
  budget: number;
  plannedBudget?: number;
  participants: number;
  suggestions: string[]; // selected suggestion titles
  sections: TripSection[];
  createdAt: string;
  updatedAt?: string;
  coverPhoto?: string;
  image?: string; // alias for coverPhoto for card component
  description?: string;
  userId?: string; // backend owner id
  visibility?: "public" | "private";
}

interface TripContextValue {
  trips: Trip[];
  addTrip: (
    trip: Omit<Trip, "id" | "createdAt" | "status" | "budget"> & {
      coverPhotoFile?: File | null;
    }
  ) => Trip;
  refreshStatuses: () => void;
  updateTrip: (id: string, partial: Partial<Trip>) => Promise<void>;
  loading: boolean;
  error: string | null;
  getPublicTrip: (id: string) => Promise<Trip | null>;
  loadPublicTrips: () => Promise<void>;
  reloadTrips: (force?: boolean) => Promise<void>; // allow force reload
  loaded: boolean; // indicates initial attempt completed (success OR failure)
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

function computeStatus(startDate: string, endDate: string): TripStatus {
  const today = new Date();
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (today < s) return "upcoming";
  if (today > e) return "completed";
  return "ongoing"; // or "current" if you want to differentiate
}

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false); // indicates at least one load attempt completed
  const [lastLoadKey, setLastLoadKey] = useState<string | null>(null); // 'guest' or user.id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, user } = useAuth();
  // Compute a stable user key (support legacy _id from /me endpoint or id from login/signup)
  const userKey = (user as any)?.id || (user as any)?._id || undefined;

  // NEW: extracted reusable loader (auth-required)
  const reloadTrips = async (force = false) => {
    if (!isLoggedIn || !userKey) return;
    const token = getAuthTokenFromCookie();
    if (!token) return; // wait until cookie exists

    // If we already loaded for this user and not forced, skip
    if (!force && lastLoadKey === userKey) return;

    setLoading(true);
    setError(null);
    try {
      const backendTrips = await fetchTrips();
      console.log(
        "[TripContext] reloadTrips fetched",
        backendTrips.length,
        "trips from backend"
      );
      const mapped: Trip[] = backendTrips.map(mapBackendTrip);
      console.log("[TripContext] mapped trips sample:", mapped.slice(0, 3));
      const counts = mapped.reduce(
        (acc: any, t) => {
          acc.total++;
          if (t.visibility === "public") acc.public++;
          if (!t.userId) acc.noUserId++;
          return acc;
        },
        { total: 0, public: 0, noUserId: 0 }
      );
      console.log("[TripContext] visibility stats:", counts);
      setTrips(mapped);
      setLastLoadKey(userKey);
    } catch (e) {
      console.error("TripContext: Failed to load trips", e);
      setError("Failed to load trips. Please check your connection.");
      setTrips([]);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Guest mode
    if (!isLoggedIn) {
      // Only (re)load public trips if we have not already loaded as guest
      if (lastLoadKey !== "guest") {
        setLoading(true);
        setError(null);
        loadPublicTripsData().finally(() => {
          setLoaded(true);
          setLoading(false);
          setLastLoadKey("guest");
        });
      }
      return;
    }
    // Logged in: if previously loaded as guest or another user, fetch user-owned trips
    if (userKey && lastLoadKey !== userKey) {
      reloadTrips(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userKey]);

  const refreshStatuses = () => {
    setTrips((prev) =>
      prev.map((t) => ({ ...t, status: computeStatus(t.startDate, t.endDate) }))
    );
  };

  const updateTripLocal = (id: string, partial: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
    );
  };

  const updateTripServer = async (id: string, partial: Partial<Trip>) => {
    // Optimistic update
    updateTripLocal(id, partial);
    const payload: any = {};
    if (partial.title !== undefined) payload.name = partial.title;
    if (partial.startDate !== undefined) payload.startDate = partial.startDate;
    if (partial.endDate !== undefined) payload.endDate = partial.endDate;
    if (partial.startTime !== undefined) payload.startTime = partial.startTime;
    if (partial.endTime !== undefined) payload.endTime = partial.endTime;
    if (partial.description !== undefined)
      payload.description = partial.description;
    if (partial.suggestions !== undefined)
      payload.suggestions = partial.suggestions;
    if (partial.sections !== undefined)
      payload.sections = partial.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        dateRange: s.dateRange,
        budget: s.budget,
        allDay: s.allDay,
        startTime: s.startTime,
        endTime: s.endTime,
        startDate: s.startDate,
        endDate: s.endDate,
      }));
    if (partial.plannedBudget !== undefined)
      payload.plannedBudget = partial.plannedBudget;
    if (partial.visibility) (payload as any).visibility = partial.visibility;
    const updated = await apiUpdateTrip(id, payload);
    // Map backend back to Trip
    const mapped: Trip = {
      id: updated._id,
      title: updated.name,
      destination: (updated as any).destination || updated.name,
      startDate: updated.startDate.substring(0, 10),
      endDate: updated.endDate.substring(0, 10),
      startTime: (updated as any).startTime,
      endTime: (updated as any).endTime,
      status: computeStatus(updated.startDate, updated.endDate),
      budget: (updated as any).budget ?? (updated as any).plannedBudget ?? 0,
      participants: (updated as any).participants || 1,
      suggestions: updated.suggestions || [],
      sections: (updated.sections || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        dateRange: s.dateRange,
        budget: s.budget || 0,
        allDay: s.allDay,
        startTime: s.startTime,
        endTime: s.endTime,
        startDate: s.startDate
          ? String(s.startDate).substring(0, 10)
          : undefined,
        endDate: s.endDate ? String(s.endDate).substring(0, 10) : undefined,
      })),
      createdAt: updated.createdAt,
      coverPhoto: updated.coverPhoto,
      image: updated.coverPhoto,
      plannedBudget: (updated as any).plannedBudget,
      description: updated.description,
      userId: (updated as any).userId,
      visibility: (updated as any).visibility,
    };
    setTrips((prev) => prev.map((t) => (t.id === id ? mapped : t)));
  };

  const addTrip: TripContextValue["addTrip"] = (tripInput) => {
    // Calculate budget properly
    const sectionBudgetSum = tripInput.sections.reduce(
      (sum, s) => sum + (s.budget || 0),
      0
    );
    const finalBudget =
      (tripInput as any).plannedBudget || sectionBudgetSum || 0;

    // Optimistic: create local placeholder with temp id
    const tempId = `temp-${Date.now()}`;
    const optimistic: Trip = {
      id: tempId,
      title: tripInput.title || tripInput.destination,
      destination: tripInput.destination,
      startDate: tripInput.startDate,
      endDate: tripInput.endDate,
      startTime: (tripInput as any).startTime,
      endTime: (tripInput as any).endTime,
      status: computeStatus(tripInput.startDate, tripInput.endDate),
      budget: finalBudget,
      participants: tripInput.participants,
      suggestions: tripInput.suggestions,
      sections: tripInput.sections,
      createdAt: new Date().toISOString(),
      plannedBudget: (tripInput as any).plannedBudget,
      description: (tripInput as any).description,
      visibility: (tripInput as any).visibility || "private",
      userId: userKey, // Set current user as owner
    };

    setTrips((prev) => [optimistic, ...prev]);

    (async () => {
      try {
        const payload: CreateTripPayload = {
          name: tripInput.title || tripInput.destination,
          startDate: tripInput.startDate,
          endDate: tripInput.endDate,
          startTime: (tripInput as any).startTime,
          endTime: (tripInput as any).endTime,
          description: (tripInput as any).description || "",
          participants: tripInput.participants,
          suggestions: tripInput.suggestions,
          sections: tripInput.sections.map((s) => ({
            ...s,
            startDate: s.startDate,
            endDate: s.endDate,
          })),
          plannedBudget: (tripInput as any).plannedBudget || finalBudget,
          budget: finalBudget,
          visibility: (tripInput as any).visibility || "private",
        };

        const created = await createTrip(payload, tripInput.coverPhotoFile);
        const mappedCreated: Trip = {
          id: created._id,
          title: created.name,
          destination: (created as any).destination || created.name,
          startDate: created.startDate.substring(0, 10),
          endDate: created.endDate.substring(0, 10),
          startTime: (created as any).startTime,
          endTime: (created as any).endTime,
          status: computeStatus(created.startDate, created.endDate),
          budget:
            (created as any).budget ??
            (created as any).plannedBudget ??
            finalBudget,
          participants: (created as any).participants || 1,
          suggestions: created.suggestions || [],
          sections: (created.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            dateRange: s.dateRange,
            budget: s.budget || 0,
            allDay: s.allDay,
            startTime: s.startTime,
            endTime: s.endTime,
            startDate: s.startDate
              ? String(s.startDate).substring(0, 10)
              : undefined,
            endDate: s.endDate ? String(s.endDate).substring(0, 10) : undefined,
          })),
          createdAt: created.createdAt,
          coverPhoto: created.coverPhoto,
          image: created.coverPhoto,
          plannedBudget: (created as any).plannedBudget,
          description: created.description,
          userId: (created as any).userId || userKey, // Ensure userId is set
          visibility: (created as any).visibility,
        };
        setTrips((prev) =>
          prev.map((t) => (t.id === tempId ? mappedCreated : t))
        );

        // Force reload to ensure we have the latest data from server
        setTimeout(() => {
          reloadTrips(true);
        }, 500);
        console.log(
          "[TripContext] Trip created & inserted locally:",
          mappedCreated
        );
      } catch (e) {
        console.error("Create trip failed, rolling back", e);
        setTrips((prev) => prev.filter((t) => t.id !== tempId));
        // Re-throw the error so UI can handle it
        throw e;
      }
    })();
    return optimistic;
  };

  // Helper function to map backend trip to frontend Trip
  const mapBackendTrip = (bt: any): Trip => {
    const planned = bt.plannedBudget;
    const userIdNorm =
      typeof bt.userId === "object" && bt.userId?._id
        ? bt.userId._id
        : bt.userId;
    return {
      id: bt._id,
      title: bt.name,
      destination: bt.destination || bt.name,
      startDate: bt.startDate.substring(0, 10),
      endDate: bt.endDate.substring(0, 10),
      startTime: bt.startTime,
      endTime: bt.endTime,
      status: computeStatus(bt.startDate, bt.endDate),
      budget: bt.budget ?? planned ?? 0,
      participants: bt.participants || 1,
      suggestions: bt.suggestions || [],
      sections: (bt.sections || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        dateRange: s.dateRange,
        budget: s.budget || 0,
        allDay: s.allDay,
        startTime: s.startTime,
        endTime: s.endTime,
        startDate: s.startDate
          ? String(s.startDate).substring(0, 10)
          : undefined,
        endDate: s.endDate ? String(s.endDate).substring(0, 10) : undefined,
      })),
      createdAt: bt.createdAt,
      coverPhoto: bt.coverPhoto,
      image: bt.coverPhoto,
      plannedBudget: planned,
      description: bt.description,
      userId: userIdNorm,
      visibility: bt.visibility,
    };
  };

  // Load public trips for guests
  const loadPublicTripsData = async () => {
    try {
      console.log("TripContext: Fetching public trips for guest access");
      const publicTrips = await fetchPublicTrips();
      console.log("TripContext: Received public trips:", publicTrips.length);

      const mapped = publicTrips.map(mapBackendTrip);
      setTrips(mapped);
      setError(null);
      setLastLoadKey("guest");
    } catch (e) {
      console.error("TripContext: Failed to load public trips", e);
      setError("Failed to load public trips.");
      setTrips([]);
    }
  };

  // Get a specific public trip by ID (for shared URLs)
  const getPublicTrip = async (id: string): Promise<Trip | null> => {
    try {
      console.log("TripContext: Fetching public trip by ID:", id);
      const trip = await fetchTripById(id);
      const mapped = mapBackendTrip(trip);

      // Add to trips if not already present (for caching)
      setTrips((prev) => {
        const exists = prev.find((t) => t.id === id);
        return exists ? prev : [mapped, ...prev];
      });

      return mapped;
    } catch (e) {
      console.error("TripContext: Failed to fetch trip by ID", e);
      return null;
    }
  };

  // Public method to load public trips
  const loadPublicTrips = async (): Promise<void> => {
    setLoading(true);
    await loadPublicTripsData();
    setLoading(false);
  };

  // Trip update function
  const updateTrip = (id: string, updates: Partial<Trip>): Trip | null => {
    console.log("🔄 TripContext.updateTrip called:", { id, updates });

    let updatedTrip: Trip | null = null;

    setTrips((prevTrips) => {
      const tripIndex = prevTrips.findIndex((trip) => trip.id === id);
      if (tripIndex === -1) {
        console.error("❌ Trip not found for update:", id);
        return prevTrips;
      }

      const updatedTrips = [...prevTrips];
      const existingTrip = updatedTrips[tripIndex];

      // Merge updates with existing trip, preserving original creation data
      updatedTrip = {
        ...existingTrip,
        ...updates,
        id, // Ensure ID doesn't change
        createdAt: existingTrip.createdAt, // Preserve original creation time
        updatedAt: new Date().toISOString(),
      };

      updatedTrips[tripIndex] = updatedTrip;

      console.log("✅ Trip updated successfully:", updatedTrip);

      // Save to localStorage
      try {
        localStorage.setItem(
          "globetrotter_trips",
          JSON.stringify(updatedTrips)
        );
        console.log("💾 Updated trips saved to localStorage");
      } catch (error) {
        console.error(
          "❌ Failed to save updated trips to localStorage:",
          error
        );
      }

      return updatedTrips;
    });

    return updatedTrip;
  };

  const value: TripContextValue = {
    trips,
    addTrip,
    refreshStatuses,
    updateTrip: updateTripServer,
    loading,
    error,
    getPublicTrip,
    loadPublicTrips,
    reloadTrips,
    loaded,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export const useTrips = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used within TripProvider");
  return ctx;
};
