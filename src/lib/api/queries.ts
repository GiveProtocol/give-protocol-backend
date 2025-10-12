import { apiClient } from "./client";
import { CharityData, CauseData, QueryOptions, ApiResponse } from "./types";
import { ErrorHandler } from "@/utils/errorBoundary";

export async function getCharities(
  options: QueryOptions = {},
): Promise<ApiResponse<CharityData[]>> {
  try {
    return await apiClient.get<CharityData[]>("/charities", options);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch charities");
  }
}

export async function getCharity(
  id: string,
): Promise<ApiResponse<CharityData>> {
  try {
    return await apiClient.get<CharityData>(`/charities/${id}`);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch charity");
  }
}

export async function getCauses(
  options: QueryOptions = {},
): Promise<ApiResponse<CauseData[]>> {
  try {
    return await apiClient.get<CauseData[]>("/causes", options);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch causes");
  }
}

export async function getCause(id: string): Promise<ApiResponse<CauseData>> {
  try {
    return await apiClient.get<CauseData>(`/causes/${id}`);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch cause");
  }
}

export async function getCharityCauses(
  charityId: string,
  options: QueryOptions = {},
): Promise<ApiResponse<CauseData[]>> {
  try {
    return await apiClient.get<CauseData[]>(
      `/charities/${charityId}/causes`,
      options,
    );
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch charity causes");
  }
}
