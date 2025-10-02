import { create } from 'zustand';
import { FollowUp, FollowUpFilters, FollowUpLog } from '@/types/followup';

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FollowupStoreState {
  followups: FollowUp[];
  filters: Required<Pick<FollowUpFilters, 'status'>> & Omit<FollowUpFilters, 'status'>;
  pagination?: PaginationMeta;
  loading: boolean;
  error?: string;
}

interface FollowupStoreActions {
  setFilters: (filters: Partial<FollowUpFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  fetchFollowups: () => Promise<void>;
  addFollowup: (followup: FollowUp) => void;
  updateFollowup: (id: string, updates: Partial<FollowUp>) => void;
  addLog: (followupId: string, log: FollowUpLog) => void;
}

function toSearchParams(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (v instanceof Date) {
      params.set(k, v.toISOString());
    } else {
      params.set(k, String(v));
    }
  });
  return params.toString();
}

export const useFollowupStore = create<FollowupStoreState & FollowupStoreActions>((set, get) => ({
  followups: [],
  filters: { status: 'active', page: 1, pageSize: 20, sortBy: 'followupDate', sortOrder: 'asc' },
  loading: false,

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters, page: 1 } }),
  setPage: (page) => set({ filters: { ...get().filters, page } }),
  setPageSize: (pageSize) => set({ filters: { ...get().filters, pageSize, page: 1 } }),

  fetchFollowups: async () => {
    try {
      set({ loading: true, error: undefined, followups: [] });
      const f = get().filters;
      const qs = toSearchParams(f);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const next = '?' + qs;
        if (url.search !== next) {
          url.search = qs;
          window.history.replaceState({}, '', url.toString());
        }
      }
      const res = await fetch(`/api/followups?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      set({ followups: json.data, pagination: json.pagination, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message || 'Unknown error' });
    }
  },

  addFollowup: (followup) => set({ followups: [followup, ...get().followups] }),

  updateFollowup: (id, updates) => set({
    followups: get().followups.map(f => (f.id === id ? { ...f, ...updates } : f)),
  }),

  addLog: (followupId, _log) => {
    set({
      followups: get().followups.map(f => (f.id === followupId ? { ...f, updatedAt: new Date() } as FollowUp : f)),
    });
  },
}));
