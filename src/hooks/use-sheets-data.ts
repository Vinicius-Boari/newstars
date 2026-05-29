import { useQuery } from "@tanstack/react-query";
import { fetchAllSheets, type QuinzenaData } from "@/lib/sheets";
import { fetchExcelData } from "@/lib/microsoft-excel";
import { useSettings } from "@/lib/settings-context";
import { useSheetsStore } from "./use-sheets-store";

export interface SheetsDataResult {
  data: QuinzenaData[] | undefined;
  previousData: QuinzenaData[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  dataUpdatedAt: number;
  refetch: () => void;
}

export function useSheetsData(): SheetsDataResult {
  const { sheetId, excelUrl, connectorType, refreshMs } = useSettings();
  const { abas } = useSheetsStore();
  const q = useQuery({
    queryKey: ["sheets", connectorType, connectorType === "google" ? sheetId : excelUrl, abas],
    queryFn: () => connectorType === "google" ? fetchAllSheets(sheetId, abas) : fetchExcelData(abas),
    refetchInterval: refreshMs,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  return {
    data: q.data,
    previousData: q.data,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    dataUpdatedAt: q.dataUpdatedAt,
    refetch: () => void q.refetch(),
  };
}