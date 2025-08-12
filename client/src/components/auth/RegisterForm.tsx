import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Lock, Phone, Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { RegisterData } from "@/lib/authService";
import { PhoneInput, CountryIso2 } from "react-international-phone";
import "react-international-phone/style.css";

// Country data mapping ISO codes to full names
const countryMap: Record<string, string> = {
  us: "United States",
  in: "India",
  uk: "United Kingdom",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
  jp: "Japan",
  es: "Spain",
  it: "Italy",
  br: "Brazil",
  mx: "Mexico",
  sg: "Singapore",
  za: "South Africa",
  ae: "United Arab Emirates",
};

// Get ISO code from country name (fuzzy match)
const getIsoFromCountryName = (name: string): string | null => {
  const lowerName = name.toLowerCase();

  // Direct match
  for (const [iso, countryName] of Object.entries(countryMap)) {
    if (countryName.toLowerCase() === lowerName) {
      return iso;
    }
  }

  // Partial match
  for (const [iso, countryName] of Object.entries(countryMap)) {
    if (
      countryName.toLowerCase().includes(lowerName) ||
      lowerName.includes(countryName.toLowerCase())
    ) {
      return iso;
    }
  }

  return null;
};

interface RegisterFormProps {
  onRegister: (data: any) => void;
  isSubmitting?: boolean;
}

export function RegisterForm({
  onRegister,
  isSubmitting = false,
}: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    countryText: "", // Added for direct text input
    password: "",
    confirmPassword: "",
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [selectedCountry, setSelectedCountry] = useState<CountryIso2>("US");

  // Effect to update country value when country text changes
  useEffect(() => {
    const iso = getIsoFromCountryName(formData.countryText);
    if (iso) {
      updateFormData("country", iso);
    } else {
      updateFormData("country", formData.countryText.toLowerCase());
    }
  }, [formData.countryText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset validation errors
    setValidationErrors({});

    // Validate form
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      // Remove all non-digit characters for validation
      const digitsOnly = formData.phone.replace(/\D/g, "");
      if (digitsOnly.length < 8) {
        errors.phone = "Phone number is too short";
      } else if (digitsOnly.length > 15) {
        errors.phone = "Phone number is too long";
      }
    }

    if (!formData.countryText.trim()) {
      errors.countryText = "Country is required";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    console.log("Form data before submission:", formData);

    // Submit form if validation passes
    onRegister({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      country: formData.country,
      password: formData.password,
    });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hero-gradient p-4">
      <Card className="w-full max-w-2xl shadow-hero">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Join GlobeTrotter
          </CardTitle>
          <p className="text-muted-foreground">
            Create your account and start your journey
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className={
                    validationErrors.firstName ? "text-destructive" : ""
                  }
                >
                  First Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      updateFormData("firstName", e.target.value)
                    }
                    className={`pl-10 ${
                      validationErrors.firstName
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.firstName && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className={
                    validationErrors.lastName ? "text-destructive" : ""
                  }
                >
                  Last Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    className={`pl-10 ${
                      validationErrors.lastName
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.lastName && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={validationErrors.email ? "text-destructive" : ""}
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`pl-10 ${
                    validationErrors.email
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {validationErrors.email && (
                <p className="text-xs text-destructive mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Phone and Country section - side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Country Input - Left Side */}
              <div className="space-y-2">
                <Label
                  htmlFor="countryText"
                  className={
                    validationErrors.countryText ? "text-destructive" : ""
                  }
                >
                  Country
                </Label>
                <div className="relative">
                  <Flag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="countryText"
                    placeholder="Enter your country"
                    value={formData.countryText}
                    onChange={(e) =>
                      updateFormData("countryText", e.target.value)
                    }
                    className={`pl-10 border-none ${
                      validationErrors.countryText
                        ? "focus-visible:ring-destructive"
                        : ""
                    }`}
                    style={{
                      borderBottom: validationErrors.countryText
                        ? "1px solid rgb(239, 68, 68)"
                        : "1px solid hsl(var(--input))",
                      borderRadius: 0,
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.countryText && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.countryText}
                  </p>
                )}
              </div>

              {/* Phone Number - Right Side */}
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className={validationErrors.phone ? "text-destructive" : ""}
                >
                  Phone Number
                </Label>
                <div className="phone-input-wrapper">
                  <PhoneInput
                    defaultCountry="us"
                    value={formData.phone}
                    onChange={(phone) => updateFormData("phone", phone)}
                    className={`
                      ${validationErrors.phone ? "phone-input-error" : ""}
                    `}
                    disabled={isSubmitting}
                    style={{
                      border: "none",
                      borderBottom: validationErrors.phone
                        ? "1px solid rgb(239, 68, 68)"
                        : "1px solid hsl(var(--input))",
                      borderRadius: 0,
                    }}
                    inputStyle={{
                      backgroundColor: "transparent",
                      borderLeft: "none",
                    }}
                    countrySelectorStyleProps={{
                      buttonStyle: {
                        border: "none",
                        background: "transparent",
                      },
                    }}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className={
                    validationErrors.password ? "text-destructive" : ""
                  }
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    className={`pl-10 ${
                      validationErrors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className={
                    validationErrors.confirmPassword ? "text-destructive" : ""
                  }
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      updateFormData("confirmPassword", e.target.value)
                    }
                    className={`pl-10 ${
                      validationErrors.confirmPassword
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-hero-gradient hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
