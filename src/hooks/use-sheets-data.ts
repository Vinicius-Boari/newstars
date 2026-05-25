import { useQuery } from "@tanstack/react-query";
import { fetchAllSheets, type QuinzenaData } from "@/lib/sheets";
import { fetchExcelData } from "@/lib/microsoft-excel";
import { useSettings } from "@/lib/settings-context";

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
  const q = useQuery({
    queryKey: ["sheets", connectorType, connectorType === "google" ? sheetId : excelUrl],
    queryFn: () => connectorType === "google" ? fetchAllSheets(sheetId) : fetchExcelData(),
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