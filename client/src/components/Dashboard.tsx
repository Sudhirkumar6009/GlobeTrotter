import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkSessionAuth, UserData } from '../lib/authService';
import { useTrips } from '@/context/TripContext';
import { TripCard } from '@/components/dashboard/TripCard';
import { Button } from '@/components/ui/button';

// NOTE: This component variant remains for legacy usage.
// Prefer importing from pages/Dashboard.tsx which now
// handles trip reloading & "My Plans" consistency.

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { trips, reloadTrips, loading: tripsLoading, error: tripsError } = useTrips();

  useEffect(() => {
    async function checkAuth() {
      console.log('[Dashboard] Starting authentication check');
      setLoading(true);
      
      try {
        // Use checkSessionAuth which works for both token and session-based auth
        const userData = await checkSessionAuth();
        console.log('[Dashboard] Auth check result:', !!userData);
        
        if (userData) {
          setUser(userData);
          setAuthError(null);
        } else {
          console.log('[Dashboard] No valid session found, redirecting to login');
          setAuthError('Please log in to access the dashboard');
          navigate('/login');
        }
      } catch (err) {
        console.error('[Dashboard] Auth check failed:', err);
        setAuthError('Error checking authentication');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [navigate]);
  
  // NEW: after auth success, ensure trips loaded
  useEffect(() => {
    if (user && !tripsLoading && trips.length === 0) {
      reloadTrips();
    }
  }, [user, trips.length, tripsLoading, reloadTrips]);

  // NEW: derive user's trips (include optimistic trips without userId)
  const myTrips = useMemo(() => {
    if (!user) return [];
    return trips.filter(t => !t.userId || t.userId === user.id);
  }, [trips, user]);

  // Combined loading state
  if (loading || tripsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>Loading your dashboard...</div>
      </div>
    );
  }
  
  if (authError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-red-500 mb-4">{authError}</p>
        <button 
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Login
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        {user && (
          <p className="text-sm text-muted-foreground">
            Welcome, {user.firstName} {user.lastName} ({user.email})
          </p>
        )}
      </div>

      {/* NEW: My Plans section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Plans</h2>
          <Button size="sm" onClick={() => navigate('/new-trip')}>
            Create Trip
          </Button>
        </div>

        {tripsError && (
            <div className="text-sm text-destructive">
              {tripsError}{' '}
              <button
                onClick={() => reloadTrips()}
                className="underline font-medium"
              >
                Retry
              </button>
            </div>
        )}

        {!tripsError && myTrips.length === 0 && (
          <div className="border border-dashed rounded-md p-6 text-sm text-muted-foreground flex flex-col items-center gap-3">
            <span>No trips yet. Start planning your first adventure.</span>
            <Button size="sm" onClick={() => navigate('/new-trip')}>
              Plan a Trip
            </Button>
          </div>
        )}

        {myTrips.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myTrips
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onView={(id) => navigate(`/trip/${id}`)}
                />
              ))}
          </div>
        )}
      </section>

      {/* ...existing code... (you can append other legacy dashboard content below) */}
    </div>
  );
}
