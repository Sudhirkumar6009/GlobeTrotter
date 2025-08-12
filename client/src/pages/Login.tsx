import { LoginForm } from "@/components/auth/LoginForm";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { loginUser, setAuthCookie, initializeAuth } from "@/lib/authService";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { refreshUserData, optimisticLogin } = useAuth();

  // Get the intended destination if redirected from a protected route
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    // This effect checks if the user is already logged in when they visit the login page.
    const verifyUserStatus = async () => {
      console.log("[Login Page] Checking for existing session...");
      const user = await initializeAuth(); // This function verifies the token and gets user data.

      if (user) {
        console.log("[Login Page] Active session found. Redirecting to dashboard.");
        navigate("/dashboard", { replace: true }); // Use replace to prevent user from navigating back to login
      } else {
        // If no user is found, it's safe to show the login form.
        console.log("[Login Page] No active session. Displaying login form.");
        setIsLoading(false);
      }
    };

    verifyUserStatus();
  }, [navigate]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      console.log("Attempting login with:", { email });
      const response = await loginUser({ email, password });

      // Store the authentication token and optimistically mark logged in
      setAuthCookie(response.token);
      // Immediately mark logged in with returned user if provided
      optimisticLogin(response.user);
      console.log(
        "Token stored, optimistic login with user -> navigating then refreshing"
      );
      // Navigate first for instant header swap
      navigate(from, { replace: true });
      // Then refresh user data silently (don't block UX)
      refreshUserData().then((u) => {
        console.log("User data after async refresh (post-login):", u);
      });

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in to GlobeTrotter.",
      });

      // Redirect to the intended destination or dashboard
      console.log("Redirected to:", from);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description:
          error instanceof Error
            ? error.message
            : "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // While checking, show a loading indicator to prevent the form from flashing.
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not loading and not redirected, show the actual login page content.
  return <LoginForm onLogin={handleLogin} isLoading={isLoading} />;
}
