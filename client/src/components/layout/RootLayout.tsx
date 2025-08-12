import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import Footer from "@/components/layout/Footer";

export function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default RootLayout;
