import { useState, useEffect, useRef } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { api } from "@/lib/api";

export default function Profile() {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    profilePicture: "", // added
    preferences: {
      budget: "",
      travelStyle: "",
      preferredActivities: [] as string[],
    },
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // new: avatar state and input ref
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await api.get("/api/auth/me");
        const u = res.data.user || {};
        const name: string = u.name || "";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const first = user?.firstName || parts[0] || "";
        const last =
          user?.lastName || (parts.length > 1 ? parts.slice(1).join(" ") : "");
        setUserData({
          name,
          firstName: first,
          lastName: last,
          email: u.email || user?.email || "",
          phone: u.phone || user?.phone || "",
          country: u.country || user?.country || "",
          profilePicture: u.profilePicture || "", // added
          preferences: {
            budget: u.preferences?.budget || "",
            travelStyle: u.preferences?.travelStyle || "",
            preferredActivities: Array.isArray(
              u.preferences?.preferredActivities
            )
              ? u.preferences.preferredActivities
              : [],
          },
        });
      } catch (e: any) {
        console.error("[Profile] /me fetch failed", e);
        setLoadError(e?.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // new: preview cleanup
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handlePickAvatar = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // compose full name
      const name = [
        userData.firstName,
        userData.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      // send multipart always (safe for both text and file)
      const form = new FormData();
      form.append("name", name || userData.name || "");
      form.append("phone", userData.phone || "");
      form.append("country", userData.country || "");
      form.append(
        "preferences",
        JSON.stringify({
          budget: userData.preferences.budget || "",
          travelStyle: userData.preferences.travelStyle || "",
          preferredActivities: userData.preferences.preferredActivities || [],
        })
      );
      if (avatarFile) {
        form.append("profilePicture", avatarFile);
      }

      const res = await api.put("/api/auth/profile", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data?.user || {};
      setUserData((prev) => ({
        ...prev,
        name: updated.name || prev.name,
        email: updated.email || prev.email,
        phone: updated.phone || prev.phone,
        country: updated.country || prev.country,
        profilePicture: updated.profilePicture || prev.profilePicture,
        preferences: {
          budget: updated.preferences?.budget || prev.preferences.budget,
          travelStyle:
            updated.preferences?.travelStyle || prev.preferences.travelStyle,
          preferredActivities: Array.isArray(updated.preferences?.preferredActivities)
            ? updated.preferences.preferredActivities
            : prev.preferences.preferredActivities,
        },
      }));
      setAvatarFile(null);
      setAvatarPreview(null);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      await refreshUserData();
    } catch (err: any) {
      console.error("[Profile] update failed", err);
      toast({
        title: "Update failed",
        description: err?.response?.data?.error || "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar disableCollapse />

        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex-1 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">My Profile</h1>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                {/* new: avatar block */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={avatarPreview || userData.profilePicture || ""}
                        alt="Profile picture"
                      />
                      <AvatarFallback>
                        {(userData.firstName?.[0] || userData.name?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handlePickAvatar}
                      disabled={!isEditing}
                      className="absolute -bottom-2 -right-2 inline-flex items-center justify-center rounded-full border bg-primary text-primary-foreground h-8 w-8 shadow disabled:opacity-50"
                      title={isEditing ? "Change photo" : "Edit to change photo"}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Upload a square image (JPG, PNG, WebP, max 5MB).
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {loading && (
                  <div className="text-sm text-muted-foreground mb-4">
                    {isEditing ? "Saving..." : "Loading profile..."}
                  </div>
                )}
                {loadError && (
                  <div className="text-sm text-destructive mb-4">
                    {loadError}
                  </div>
                )}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={userData.firstName}
                        onChange={(e) =>
                          setUserData({
                            ...userData,
                            firstName: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={userData.lastName}
                        onChange={(e) =>
                          setUserData({ ...userData, lastName: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) =>
                        setUserData({ ...userData, email: e.target.value })
                      }
                      disabled={true} // Email usually can't be changed easily
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={userData.phone}
                      onChange={(e) =>
                        setUserData({ ...userData, phone: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={userData.country}
                      onChange={(e) =>
                        setUserData({ ...userData, country: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  {isEditing && (
                    <Button type="submit" className="w-full bg-hero-gradient" disabled={loading}>
                      Save Changes
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
            {userData.preferences.budget && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Budget:</span>{" "}
                    {userData.preferences.budget}
                  </div>
                  <div>
                    <span className="font-medium">Travel Style:</span>{" "}
                    {userData.preferences.travelStyle}
                  </div>
                  {userData.preferences.preferredActivities.length > 0 && (
                    <div>
                      <span className="font-medium">Activities:</span>{" "}
                      {userData.preferences.preferredActivities.join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
