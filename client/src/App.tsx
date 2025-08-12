import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AutoAuthGate } from "@/components/auth/AutoAuthGate";
import { Toaster } from "@/components/ui/toaster";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Itinerary from "@/pages/Itinerary";
import MyTrips from "@/pages/MyTrips";
import Planning from "@/pages/Planning";
import Explore from "@/pages/Explore";
import NotFound from "@/pages/NotFound";
import NewTrip from "@/pages/NewTrip";
import TripDetails from "@/pages/TripDetails";
import Community from "@/pages/Community";
import RootLayout from "@/components/layout/RootLayout";
import EditTrip from "@/pages/EditTrip";
import PlanAi from "@/pages/PlanAi";

import "./App.css";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<RootLayout />}>
      <Route index element={<Home />} />
      <Route
        path="dashboard"
        element={
          <AutoAuthGate>
            {({ isLoggedIn }) => <Dashboard guestMode={!isLoggedIn} />}
          </AutoAuthGate>
        }
      />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Settings />} />
      <Route path="my-trips" element={<MyTrips />} />
      <Route path="planning" element={<Planning />} />
      <Route path="community" element={<Community />} />
      <Route path="explore" element={<Explore />} />
      <Route path="itinerary" element={<Itinerary />} />
      <Route path="new-trip" element={<NewTrip />} />
      <Route path="trip/:id" element={<TripDetails />} />
      <Route path="trip/:id/edit" element={<EditTrip />} />
      <Route path="home" element={<Home />} />
      <Route path="404" element={<NotFound />} />
      <Route path="/plan-ai" element={<PlanAi />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
