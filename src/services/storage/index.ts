import type { CatalogStorage } from "@/services/storage/types";
import {
  isSupabaseConfigured,
} from "@/services/storage/supabase-admin";
import { SupabaseCatalogStorage } from "@/services/storage/supabase-storage";

let instance: CatalogStorage | null = null;

export function getStorage(): CatalogStorage {
  if (!instance) {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    instance = new SupabaseCatalogStorage();
  }
  return instance;
}

export type { CatalogStorage } from "@/services/storage/types";
