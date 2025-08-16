import { useState } from "react";
import {
  Plane,
  PlusCircle,
  MapPin,
  Users,
  User,
  Settings,
  Calendar,
  Home,
  LayoutDashboard,
  Bot,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Plan Trip", url: "/new-trip", icon: Calendar },
  { title: "My Trips", url: "/my-trips", icon: MapPin },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

// AI Planner navigation item
const aiPlannerItem = { title: "AI Planner", url: "/plan-ai", icon: Bot };

export function AppSidebar({
  disableCollapse = false,
}: { disableCollapse?: boolean } = {}) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const isCollapsed = disableCollapse ? false : state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/10 text-primary font-medium border-none border-primary"
      : "hover:bg-muted/50";

  // Auth guard: block navigation if not logged in
  const guardNav = (e: React.MouseEvent, url: string) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate("/login", { state: { from: { pathname: url } } });
    }
  };

  // Helper (can be called externally) to navigate duplicating a trip object
  // Usage example elsewhere: navigate('/new-trip', { state: { duplicateTrip: trip } });
  // Leaving here as reference.
  // const duplicateTrip = (trip: any) => navigate('/new-trip', { state: { duplicateTrip: trip } });

  return (
    <>
      <Sidebar
        className={isCollapsed ? "w-16" : "w-64"}
        collapsible={disableCollapse ? "none" : "icon"}
        positionMode="sticky"
      >
        <SidebarContent className="bg-card flex flex-col h-full">
          <div className="flex-1 overflow-y-auto ml-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className={getNavCls}
                          onClick={(e) => guardNav(e, item.url)}
                        >
                          <item.icon className="h-10 w-10" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* AI Planner Section */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={aiPlannerItem.url}
                        end
                        className={getNavCls}
                        onClick={(e) => guardNav(e, aiPlannerItem.url)}
                      >
                        <aiPlannerItem.icon className="h-10 w-10" />
                        {!isCollapsed && <span>{aiPlannerItem.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
          {!disableCollapse && (
            <div className="p-3 border-t mt-auto">
              <SidebarTrigger
                className="w-full justify-center"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              />
            </div>
          )}
        </SidebarContent>
      </Sidebar>
    </>
  );
}
