import axios from "axios";
import {
  Farm,
  TractorEntry,
  KhatEntry,
  SeedEntry,
  AushadEntry,
  WorkerEntry,
  HarvestEntry,
  MilkEntry,
  DairyExpense,
  OtherExpense,
} from "../types";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

const normalize = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(normalize);
  }

  const { _id, id, ...rest } = data;
  const normalizedId = _id?.toString() || id;

  // Recursively normalize children
  const result: any = { id: normalizedId, ...rest };
  Object.keys(rest).forEach((key) => {
    if (
      Array.isArray(rest[key]) ||
      (rest[key] && typeof rest[key] === "object")
    ) {
      result[key] = normalize(rest[key]);
    }
  });

  return result;
};

export const storage = {
  getFarms: async (): Promise<Farm[]> => {
    const res = await api.get("/farms");
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveFarm: async (name: string, year: string): Promise<Farm> => {
    const res = await api.post("/farms", { name, year });
    return normalize(res.data);
  },
  updateFarm: async (id: string, name: string, year: string): Promise<Farm> => {
    const res = await api.put(`/farms/${id}`, { name, year });
    return normalize(res.data);
  },
  deleteFarm: async (id: string): Promise<any> => {
    const res = await api.delete(`/farms/${id}`);
    return res.data;
  },
  getTractorEntries: async (farmId?: string): Promise<TractorEntry[]> => {
    const path = farmId ? `/tractor/${farmId}` : "/tractor";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveTractorEntry: async (
    entry: Omit<
      TractorEntry,
      | "id"
      | "createdAt"
      | "parentId"
      | "isEdited"
      | "updatedAt"
      | "totalPaidAmount"
      | "remainingAmount"
    >,
  ): Promise<TractorEntry> => {
    const res = await api.post("/tractor", entry);
    return normalize(res.data);
  },
  editTractorEntry: async (id: string, data: any): Promise<TractorEntry> => {
    // We use PUT /tractor/:id for revisioning in the new backend
    const res = await api.put(`/tractor/${id}`, data);
    return normalize(res.data);
  },
  getTractorHistory: async (id: string): Promise<TractorEntry[]> => {
    const res = await api.get(`/tractor/${id}/history`);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  getGlobalSummary: async () => {
    const res = await api.get("/summary");
    return normalize(res.data);
  },
  getKhatEntries: async (farmId?: string): Promise<KhatEntry[]> => {
    const path = farmId ? `/khat/${farmId}` : "/khat";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  getKhatHistory: async (id: string): Promise<KhatEntry[]> => {
    const res = await api.get(`/khat/${id}/history`);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveKhatEntry: async (entry: any): Promise<KhatEntry> => {
    const res = await api.post("/khat", entry);
    return normalize(res.data);
  },
  updateKhatEntry: async (id: string, entry: any): Promise<KhatEntry> => {
    const res = await api.put(`/khat/${id}`, entry);
    return normalize(res.data);
  },
  deleteKhatEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/khat/${id}`);
    return res.data;
  },
  getSeedEntries: async (farmId?: string): Promise<SeedEntry[]> => {
    const path = farmId ? `/seeds/${farmId}` : "/seeds";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  getSeedHistory: async (id: string): Promise<SeedEntry[]> => {
    const res = await api.get(`/seeds/history/${id}`);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveSeedEntry: async (entry: any): Promise<SeedEntry> => {
    const res = await api.post("/seeds", entry);
    return normalize(res.data);
  },
  updateSeedEntry: async (id: string, entry: any): Promise<SeedEntry> => {
    const res = await api.put(`/seeds/${id}`, entry);
    return normalize(res.data);
  },
  deleteSeedEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/seeds/${id}`);
    return res.data;
  },
  getAushadEntries: async (farmId?: string): Promise<AushadEntry[]> => {
    const path = farmId ? `/aushad/${farmId}` : "/aushad";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  getAushadHistory: async (id: string): Promise<AushadEntry[]> => {
    const res = await api.get(`/aushad/history/${id}`);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveAushadEntry: async (entry: any): Promise<AushadEntry> => {
    const res = await api.post("/aushad", entry);
    return normalize(res.data);
  },
  updateAushadEntry: async (id: string, entry: any): Promise<AushadEntry> => {
    const res = await api.put(`/aushad/${id}`, entry);
    return normalize(res.data);
  },
  deleteAushadEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/aushad/${id}`);
    return res.data;
  },
  getWorkerEntries: async (farmId?: string): Promise<WorkerEntry[]> => {
    const path = farmId ? `/worker/${farmId}` : "/worker";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  getWorkerHistory: async (id: string): Promise<WorkerEntry[]> => {
    const res = await api.get(`/worker/history/${id}`);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveWorkerEntry: async (entry: any): Promise<WorkerEntry> => {
    const res = await api.post("/worker", entry);
    return normalize(res.data);
  },
  updateWorkerEntry: async (id: string, entry: any): Promise<WorkerEntry> => {
    const res = await api.put(`/worker/${id}`, entry);
    return normalize(res.data);
  },
  deleteWorkerEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/worker/${id}`);
    return res.data;
  },
  getHarvestEntries: async (farmId?: string): Promise<HarvestEntry[]> => {
    const path = farmId ? `/harvest/${farmId}` : "/harvest";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveHarvestEntry: async (entry: any): Promise<HarvestEntry> => {
    const res = await api.post("/harvest", entry);
    return normalize(res.data);
  },
  updateHarvestEntry: async (id: string, entry: any): Promise<HarvestEntry> => {
    const res = await api.put(`/harvest/${id}`, entry);
    return normalize(res.data);
  },
  deleteHarvestEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/harvest/${id}`);
    return res.data;
  },
  getMilkEntries: async (): Promise<MilkEntry[]> => {
    const res = await api.get("/milk");
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveMilkEntry: async (entry: any): Promise<MilkEntry> => {
    const res = await api.post("/milk", entry);
    return normalize(res.data);
  },
  updateMilkEntry: async (id: string, entry: any): Promise<MilkEntry> => {
    const res = await api.put(`/milk/${id}`, entry);
    return normalize(res.data);
  },
  deleteMilkEntry: async (id: string): Promise<any> => {
    const res = await api.delete(`/milk/${id}`);
    return res.data;
  },
  getDairyExpenses: async (): Promise<DairyExpense[]> => {
    const res = await api.get("/dairy-expense");
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveDairyExpense: async (entry: any): Promise<DairyExpense> => {
    const res = await api.post("/dairy-expense", entry);
    return normalize(res.data);
  },
  updateDairyExpense: async (id: string, entry: any): Promise<DairyExpense> => {
    const res = await api.put(`/dairy-expense/${id}`, entry);
    return normalize(res.data);
  },
  deleteDairyExpense: async (id: string): Promise<any> => {
    const res = await api.delete(`/dairy-expense/${id}`);
    return res.data;
  },
  deleteDairyYearData: async (year: number): Promise<any> => {
    const res = await api.delete(`/dairy/year/${year}`);
    return res.data;
  },
  getOtherExpenses: async (farmId?: string): Promise<OtherExpense[]> => {
    const path = farmId ? `/other-expenses/${farmId}` : "/other-expenses";
    const res = await api.get(path);
    const data = normalize(res.data);
    return Array.isArray(data) ? data : [];
  },
  saveOtherExpense: async (entry: any): Promise<OtherExpense> => {
    const res = await api.post("/other-expenses", entry);
    return normalize(res.data);
  },
  updateOtherExpense: async (id: string, entry: any): Promise<OtherExpense> => {
    const res = await api.put(`/other-expenses/${id}`, entry);
    return normalize(res.data);
  },
  deleteOtherExpense: async (id: string): Promise<any> => {
    const res = await api.delete(`/other-expenses/${id}`);
    return res.data;
  },
  bulkPayment: async (
    type: string,
    data: {
      farmId: string;
      year: number;
      amount: number;
      note?: string;
      date?: string;
    },
  ) => {
    const res = await api.post(`/${type}/bulk-payment`, data);
    return res.data;
  },
};
