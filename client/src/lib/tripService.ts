import { api } from './api';
const TRIPS_BASE = '/api/trips';

export interface BackendTripSection {
  id: number;
  title: string;
  description: string;
  dateRange: string;
  budget: number;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
}

export interface BackendTrip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverPhoto?: string;
  status: string;
  participants: number;
  suggestions: string[];
  sections: BackendTripSection[];
  computedBudget?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTripPayload {
  name: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  participants?: number;
  suggestions?: string[];
  sections?: any[];
  plannedBudget?: number;
  budget?: number;
  visibility?: 'public' | 'private';
}

export const pingHealth = async (): Promise<boolean> => {
  try {
    const res = await api.get('/api/health');
    return res.status === 200;
  } catch {
    return false;
  }
};

export const fetchTrips = async () => {
  try {
    const { data } = await api.get(TRIPS_BASE);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[tripService] fetchTrips error', e);
    return [];
  }
};

export const createTrip = async (payload: CreateTripPayload, coverPhotoFile?: File | null) => {
  try {
    if (coverPhotoFile) {
      const form = new FormData();
      form.append('coverPhoto', coverPhotoFile);
      Object.entries(payload).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (Array.isArray(v) || typeof v === 'object') form.append(k, JSON.stringify(v));
        else form.append(k, String(v));
      });
      const { data } = await api.post(TRIPS_BASE, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    }
    const { data } = await api.post(TRIPS_BASE, payload);
    return data;
  } catch (e) {
    console.error('[tripService] createTrip error', e);
    throw e;
  }
};

export const updateTrip = async (id: string, payload: Partial<CreateTripPayload>) => {
  const { data } = await api.put(`${TRIPS_BASE}/${id}`, payload);
  return data;
};

export const deleteTrip = async (id: string) => {
  const { data } = await api.delete(`${TRIPS_BASE}/${id}`);
  return data;
};

export const fetchTripById = async (id: string) => {
  try {
    const { data } = await api.get(`${TRIPS_BASE}/${id}`);
    return data;
  } catch (e: any) {
    // On unauthorized/forbidden or other failures, attempt public endpoint
    try {
      const { data } = await api.get(`${TRIPS_BASE}/public/${id}`);
      return data;
    } catch (pubErr) {
      throw e;
    }
  }
};

export const fetchPublicTrips = async () => {
  try {
    // Request a high limit to fetch all public trips
    const { data } = await api.get(`${TRIPS_BASE}/public?limit=1000`);
    return data.trips || data || [];
  } catch (e) {
    console.warn('[tripService] fetchPublicTrips error', e);
    return [];
  }
};
