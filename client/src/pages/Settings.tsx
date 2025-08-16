import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "@/lib/authService";

export default function Settings() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!oldPassword) e.oldPassword = "Required";
    if (!newPassword) e.newPassword = "Required";
    else if (newPassword.length < 8) e.newPassword = "Min 8 chars";
    if (confirmNew !== newPassword) e.confirmNew = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword(oldPassword, newPassword);
      toast({
        title: "Password updated",
        description: "Your password was changed successfully.",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmNew("");
      setErrors({});
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.message || "Password reset failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout(); // clears auth state + cookie
    toast({
      title: "Logged out",
      description: "You have been signed out successfully.",
    });
    navigate("/login", { replace: true });
  };

  const fieldError = (k: string) =>
    errors[k] ? (
      <p className="text-xs text-destructive mt-1">{errors[k]}</p>
    ) : null;

  return (
    <SidebarProvider open defaultOpen>
      <div className="min-h-screen w-full bg-background">
        <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-40 border-r bg-card overflow-y-auto">
          <AppSidebar disableCollapse />
        </div>
        <main className="flex-1 overflow-y-auto ml-64">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-primary">Settings</h1>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Notification Settings */}

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentPassword"
                      className={errors.oldPassword ? "text-destructive" : ""}
                    >
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => {
                        setOldPassword(e.target.value);
                        if (errors.oldPassword)
                          setErrors((r) => ({ ...r, oldPassword: "" }));
                      }}
                      disabled={loading}
                    />
                    {fieldError("oldPassword")}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className={errors.newPassword ? "text-destructive" : ""}
                    >
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword)
                          setErrors((r) => ({ ...r, newPassword: "" }));
                      }}
                      disabled={loading}
                    />
                    {fieldError("newPassword")}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmNew"
                      className={errors.confirmNew ? "text-destructive" : ""}
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmNew"
                      type="password"
                      value={confirmNew}
                      onChange={(e) => {
                        setConfirmNew(e.target.value);
                        if (errors.confirmNew)
                          setErrors((r) => ({ ...r, confirmNew: "" }));
                      }}
                      disabled={loading}
                    />
                    {fieldError("confirmNew")}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-hero-gradient hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full"
                >
                  Logout
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
