import { apiClient } from "./client";
import { CharityData, CauseData, QueryOptions, ApiResponse } from "./types";
import { ErrorHandler } from "@/utils/errorBoundary";

/**
 * Fetches a list of charities from the API.
 *
 * @param options - Query options such as pagination or filters.
 * @returns A promise that resolves to an ApiResponse containing an array of CharityData.
 */
export async function getCharities(
  options: QueryOptions = {},
): Promise<ApiResponse<CharityData[]>> {
  try {
    return await apiClient.get<CharityData[]>("/charities", options);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch charities");
  }
}

/**
 * Retrieves charity information for the given ID.
 *
 * @param id The unique identifier of the charity.
 * @returns A promise resolving to an ApiResponse containing the charity data.
 */
export async function getCharity(
  id: string,
): Promise<ApiResponse<CharityData>> {
  try {
    return await apiClient.get<CharityData>(`/charities/${id}`);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch charity");
  }
}

/**
 * Fetches a list of causes from the API.
 *
 * @param options - Options to customize the API query.
 * @returns A promise that resolves to the API response containing an array of CauseData.
 */
export async function getCauses(
  options: QueryOptions = {},
): Promise<ApiResponse<CauseData[]>> {
  try {
    return await apiClient.get<CauseData[]>("/causes", options);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch causes");
  }
}

/**
 * Fetches a cause by its ID.
 * @param id The unique identifier of the cause to fetch.
 * @returns A promise that resolves to the API response containing the cause data.
 */
export async function getCause(id: string): Promise<ApiResponse<CauseData>> {
  try {
    return await apiClient.get<CauseData>(`/causes/${id}`);
  } catch (error) {
    return ErrorHandler.handle(error, "Failed to fetch cause");
  }
}

/**
 * Fetches causes for a given charity.
 *
 * @param charityId - The ID of the charity for which to fetch causes.
 * @param options - Optional query options for the API request.
 * @returns A promise resolving to the API response containing an array of CauseData.
 */
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
