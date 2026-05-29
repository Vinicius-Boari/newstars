import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SheetsStore {
  abas: string[];
  addAba: (name: string) => void;
  removeAba: (name: string) => void;
}

export const useSheetsStore = create<SheetsStore>()(
  persist(
    (set) => ({
      abas: ["ABRIL", "PEDIDOS DE MAIO"],
      addAba: (name) =>
        set((state) => ({
          abas: state.abas.includes(name) ? state.abas : [...state.abas, name],
        })),
      removeAba: (name) =>
        set((state) => ({
          abas: state.abas.filter((a) => a !== name),
        })),
    }),
    {
      name: "sheets-storage",
    },
  ),
);
