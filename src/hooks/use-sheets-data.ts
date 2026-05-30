import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllSheets, type QuinzenaData } from "@/lib/sheets";
import { fetchExcelData } from "@/lib/microsoft-excel";
import { useSettings } from "@/lib/settings-context";
import { getSheets, addSheet, removeSheet } from "./use-sheets-server";
import { toast } from "sonner";

export interface SheetsDataResult {
  data: QuinzenaData[] | undefined;
  previousData: QuinzenaData[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  dataUpdatedAt: number;
  refetch: () => void;
  addAba: (name: string) => Promise<void>;
  removeAba: (name: string) => Promise<void>;
}

export function useSheetsData(): SheetsDataResult {
  const queryClient = useQueryClient();
  const { sheetId, excelUrl, connectorType, refreshMs } = useSettings();

  const { data: abas = [] } = useQuery({
    queryKey: ["sheets-names"],
    queryFn: () => getSheets(),
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => addSheet(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheets-names"] });
      toast.success("Aba adicionada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar aba");
      console.error(error);
    }
  });

  const removeMutation = useMutation({
    mutationFn: (name: string) => removeSheet(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheets-names"] });
      toast.success("Aba removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover aba");
      console.error(error);
    }
  });

  const q = useQuery({
    queryKey: ["sheets", connectorType, connectorType === "google" ? sheetId : excelUrl, abas],
    queryFn: () => connectorType === "google" ? fetchAllSheets(sheetId, abas) : fetchExcelData(abas),
    refetchInterval: refreshMs,
    refetchOnWindowFocus: false,
    staleTime: 0,
    enabled: abas.length > 0,
  });

  return {
    data: q.data,
    previousData: q.data,
    isLoading: q.isLoading || addMutation.isPending || removeMutation.isPending,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    dataUpdatedAt: q.dataUpdatedAt,
    refetch: () => void q.refetch(),
    addAba: async (name: string) => {
      await addMutation.mutateAsync(name);
    },
    removeAba: async (name: string) => {
      await removeMutation.mutateAsync(name);
    },
  };
}