import { RegisterForm } from "@/components/auth/RegisterForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { registerUser, setAuthCookie, RegisterData } from "@/lib/authService";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUserData, optimisticLogin } = useAuth();

  const handleRegister = async (formData: any) => {
    setIsLoading(true);

    // Combine firstName and lastName into a single name field
    const data: RegisterData = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      country: formData.country,
      password: formData.password,
    };

    console.log("Submitting registration data:", data);

    try {
      const response = await registerUser(data);
      console.log("Registration successful:", response);

      // Store the authentication token and optimistically mark logged in
      setAuthCookie(response.token);
      optimisticLogin();
      console.log("Token stored, optimistic login -> refreshing user data");

      // Update the auth context with the new user data
      const userData = await refreshUserData();
      console.log("User data after refresh (post-registration):", userData);

      toast({
        title: "Welcome to GlobeTrotter!",
        description: "Your account has been created successfully.",
      });

      // Redirect to home after registration (same as login flow)
      console.log("Redirecting to home");
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Registration error:", error);

      toast({
        title: "Registration failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <RegisterForm onRegister={handleRegister} isSubmitting={isLoading} />;
}
