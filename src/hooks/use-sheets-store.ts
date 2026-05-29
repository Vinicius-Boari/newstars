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
      addAba: (name: string) =>
        set((state: { abas: string[] }) => ({
          abas: state.abas.includes(name) ? state.abas : [...state.abas, name],
        })),
      removeAba: (name: string) =>
        set((state: { abas: string[] }) => ({
          abas: state.abas.filter((a: string) => a !== name),
        })),
    }),
    {
      name: "sheets-storage",
    },
  ),
);
