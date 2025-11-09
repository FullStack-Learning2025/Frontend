export interface ErrorLog {
  id: string;
  error_message: string;
  error_stack?: string;
  endpoint: string;
  method: string;
  status_code: number;
  user_id?: string;
  request_body?: string;
  request_params?: string;
  ip_address?: string;
  user_agent?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ErrorLogsResponse {
  items: ErrorLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorLogsFilter {
  page?: number;
  pageSize?: number;
  resolved?: boolean;
  search?: string;
}
