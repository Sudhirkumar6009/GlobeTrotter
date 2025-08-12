import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  verifyAndFetchUser,
  getAuthTokenFromCookie,
  logoutUser,
  UserData,
} from "@/lib/authService";

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData | null;
  loading: boolean; // true only during initial silent check
  logout: () => void;
  refreshUserData: () => Promise<UserData | null>;
  verifyTokenAndLoad: () => Promise<void>;
  optimisticLogin: (user?: UserData) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  logout: () => {},
  refreshUserData: async () => null,
  verifyTokenAndLoad: async () => {},
  optimisticLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (data: UserData | null): UserData | null => {
    if (!data) return null;
    if (!data.firstName && !data.lastName && data.name) {
      const parts = data.name.trim().split(/\s+/);
      const firstName = parts.shift() || "";
      const lastName = parts.join(" ");
      return { ...data, firstName, lastName };
    }
    return data;
  };

  const verifyTokenAndLoad = async () => {
    const raw = await verifyAndFetchUser();
    const data = normalizeUser(raw);
    setUser(data);
    setIsLoggedIn(!!data);
  };

  useEffect(() => {
    const init = async () => {
      const token = getAuthTokenFromCookie();
      if (token) {
        // Optimistically mark as logged in so UI (Home header) can switch immediately
        setIsLoggedIn(true);
        await verifyTokenAndLoad();
      }
      setLoading(false);
    };
    init();
  }, []);

  const refreshUserData = async () => {
    const raw = await verifyAndFetchUser();
    const data = normalizeUser(raw);
    if (data) {
      setUser(data);
      setIsLoggedIn(true);
    } else if (!getAuthTokenFromCookie()) {
      setUser(null);
      setIsLoggedIn(false);
    }
    return data;
  };

  const logout = () => {
    logoutUser(); // clears cookie
    setUser(null);
    setIsLoggedIn(false);
  };

  const optimisticLogin = (u?: UserData) => {
    if (u) setUser(normalizeUser(u));
    setIsLoggedIn(true);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        loading,
        logout,
        refreshUserData,
        verifyTokenAndLoad,
        optimisticLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
