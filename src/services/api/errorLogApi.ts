import axios from 'axios';
import { ErrorLog, ErrorLogsFilter, ErrorLogsResponse } from '@/types/errorLog';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const getAuthHeaders = (token: string) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const errorLogApi = {
  // Get all error logs with pagination and filters
  getErrorLogs: async (filter: ErrorLogsFilter = {}, token: string): Promise<ErrorLogsResponse> => {
    const params = new URLSearchParams();

    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('pageSize', filter.pageSize.toString());
    if (filter.resolved !== undefined) params.append('resolved', filter.resolved.toString());
    if (filter.search) params.append('search', filter.search);

    const response = await axios.get(`${API_BASE_URL}/api/error-logs?${params.toString()}`, {
      headers: getAuthHeaders(token)
    });
    return response.data.data;
  },

  // Get a single error log by ID
  getErrorLogById: async (id: string, token: string): Promise<ErrorLog> => {
    const response = await axios.get(`${API_BASE_URL}/api/error-logs/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data.data;
  },

  // Mark an error as resolved
  markAsResolved: async (id: string, resolutionNotes: string = '', token: string): Promise<ErrorLog> => {
    const response = await axios.put(
      `${API_BASE_URL}/api/error-logs/${id}/resolve`,
      { resolutionNotes },
      {
        headers: getAuthHeaders(token)
      }
    );
    return response.data.data;
  },

  // Delete an error log
  deleteErrorLog: async (id: string, token: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/error-logs/${id}`, {
      headers: getAuthHeaders(token)
    });
  },

  // Get error logs summary (count by status)
  getErrorLogsSummary: async (token: string): Promise<{ resolved: number; unresolved: number }> => {
    const [resolved, unresolved] = await Promise.all([
      errorLogApi.getErrorLogs({ page: 1, pageSize: 1, resolved: true }, token),
      errorLogApi.getErrorLogs({ page: 1, pageSize: 1, resolved: false }, token)
    ]);

    return {
      resolved: resolved.total,
      unresolved: unresolved.total
    };
  }
};

export default errorLogApi;
