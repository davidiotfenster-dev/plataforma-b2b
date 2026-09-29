"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Perfil } from "@/lib/types";

export function useMe() {
  return useQuery<Perfil | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<Perfil>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });
}
