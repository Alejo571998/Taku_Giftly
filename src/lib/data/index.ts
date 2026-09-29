import { env } from "@/lib/env";
import type { DataStore } from "@/lib/data/store";
import { LocalDataStore } from "@/lib/data/local-store";
import { SupabaseDataStore } from "@/lib/data/supabase-store";

let store: DataStore | null = null;

export function getDataStore(): DataStore {
  if (!store) {
    store = env.hasSupabase
      ? new SupabaseDataStore()
      : new LocalDataStore();
  }
  return store;
}