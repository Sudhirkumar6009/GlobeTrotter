// Authentication service for API calls
import { api } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// Match the backend's expected fields
export interface RegisterData {
  name: string;  // Backend expects a single name field
  email: string;
  phone: string;
  country: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UserData {
  id: string;
  firstName?: string; // May be absent if backend only returns a single name field
  lastName?: string;  // May be absent
  name?: string;      // Backend combined name fallback
  email: string;
  phone?: string;
  country?: string;
}

export interface AuthResponse {
  token: string; // Token is now required for a successful auth response
  user: UserData;
}

// Frontend origin used by server CORS configuration
export const FRONTEND_ORIGIN = 'http://localhost:8080';

// Cookie expiration - 7 days
const COOKIE_EXPIRATION_DAYS = 7;

// Function to set authentication cookie
export function setAuthCookie(token: string): void {
  if (!token) {
    console.error('[Auth] Attempted to set empty token');
    return;
  }
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRATION_DAYS);

  // Fix: avoid forcing Secure on http (was causing cookie not to be saved -> redirect loop)
  const secureFlag = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? '; Secure' : '';
  // Use Lax to allow normal navigations while still giving CSRF protection similar to default.
  document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
  
  // Debug: verify cookie was set
  setTimeout(() => {
    const savedToken = getAuthTokenFromCookie();
    console.log('[Auth] Cookie set verification:', {
      tokenLength: token?.length,
      saved: !!savedToken,
      savedLength: savedToken?.length
    });
  }, 100);
}

// Function to get authentication token from cookie
export function getAuthTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token') {
      return value;
    }
  }
  return null;
}

// Function to clear auth cookie
export function clearAuthCookie(): void {
  const past = new Date(0).toUTCString();
  const secureFlag = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? '; Secure' : '';
  document.cookie = `auth_token=; expires=${past}; path=/; SameSite=Lax${secureFlag}`;
}

// Updated authentication check to be simple and token-based
export function isAuthenticated(): boolean {
  const token = getAuthTokenFromCookie();
  return !!token;
}

// Register a new user
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    console.log('[Auth] Register request payload (sanitized):', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      country: data.country,
    });
    const response = await api.post('/api/auth/signup', data);
    console.log('[Auth] Register response:', response.data);

    if (!response.data.token) {
      console.error('[Auth] No token received in signup response');
      throw new Error('Registration failed: No authentication token received from server.');
    }

    setAuthCookie(response.data.token);
    return response.data;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      console.error('[Auth] Register error raw:', err.response?.data || error);
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    } else {
      console.error('[Auth] Register error raw:', error);
      throw new Error('Registration failed');
    }
  }
}

// Simplified login function to strictly require a token, like signup
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  try {
    console.log('[Auth] Login request for:', data.email);
  // Ensure consistent /api prefix (backend routes mounted at /api/auth)
  const response = await api.post('/api/auth/login', data);
    console.log('[Auth] Login response:', response.data);
    
    // Critical Change: Enforce that the login response MUST contain a token.
    if (!response.data.token) {
      console.error('[Auth] No token received in login response. Server must return a token.');
      throw new Error('Authentication failed: Server did not provide an authentication token.');
    }
    
    setAuthCookie(response.data.token);
    return response.data;
  } catch (error: unknown) {
    // Axios shape guards
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const err = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
      console.error('[Auth] Login error response:', err.response?.status, err.response?.data);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      throw new Error(serverMsg || (err.response?.status === 401 ? 'Invalid credentials' : 'Login failed'));
    }
    if (typeof error === 'object' && error !== null && 'request' in error) {
      console.error('[Auth] Network / CORS issue:', error);
      throw new Error('Network error. Check that the server is running and CORS/proxy is configured.');
    }
    console.error('[Auth] Unexpected login error:', error);
    throw new Error('Unexpected login error');
  }
}

// Logout user
// Logout: clear the auth cookie – cookie exists only while logged in.
export function logoutUser(): void {
  clearAuthCookie();
}

// Get current user data - requires a token
export async function getCurrentUser(): Promise<UserData | null> {
  const token = getAuthTokenFromCookie();
  if (!token) {
    console.log('[Auth] Cannot get user, no token found.');
    return null;
  }
  
  try {
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
  } catch (error) {
    console.error('[Auth] getCurrentUser failed:', error);
    return null;
  }
}

// Simplified token verification
export async function verifyToken(token: string = getAuthTokenFromCookie() || ''): Promise<boolean> {
  if (!token) {
    return false;
  }
  
  try {
    const apiPath = '/api/auth/verify';
    const res = await api.post(apiPath, { token });
    return res.data.valid === true;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return false;
  }
}

// Simplified initialization - requires a token
export async function initializeAuth(): Promise<UserData | null> {
  const token = getAuthTokenFromCookie();
  if (!token) {
    return null;
  }
  
  const isValid = await verifyToken(token);
  if (!isValid) {
    clearAuthCookie();
    return null;
  }
  
  return await getCurrentUser();
}

// Simplified verification - requires a token
export async function verifyAndFetchUser(): Promise<UserData | null> {
  const token = getAuthTokenFromCookie();
  if (!token) {
    return null;
  }

  const ok = await verifyToken(token);
  if (!ok) {
    clearAuthCookie();
    return null;
  }
  
  return await getCurrentUser();
}

// This function is no longer needed with the simplified token-only logic, but kept for compatibility
export async function checkSessionAuth(): Promise<UserData | null> {
  console.log('[Auth] Checking authentication via verifyAndFetchUser...');
  return verifyAndFetchUser();
}

// NOTE: Radix Dialog accessibility warning is unrelated to this auth service; fix applied in dialog component/wrapper.

// NOTE: Login redirect loop fix: previously cookie used SameSite=Strict; Secure (rejected on http://localhost). Now Secure is conditional & SameSite=Lax.

// Reset password (requires user auth token via interceptor)
export async function resetPassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post('/api/auth/reset-password', { oldPassword, newPassword });
  return res.data;
}