// API Types based on FastAPI backend

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  organization_id?: string;
  default_park_id?: string;
}

export interface LoginRequest {
  username: string; // FastAPI-Users uses 'username' field for email
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Park {
  id: string;
  name: string;
  url: string;
}

export interface PLCNode {
  name: string;
  value: any;
  timestamp?: string;
}

export interface PLCClient {
  name: string;
  url: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  nodes: PLCNode[];
  last_update?: string;
}

export interface TelemetryData {
  plc_clients: PLCClient[];
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'telemetry_update' | 'connection_status' | 'error';
  data: any;
}

export interface WriteValueRequest {
  plc_url: string;
  node_name: string;
  value: any;
}

export interface AdminUser extends User {
  id: string;
  email: string;
  is_superuser: boolean;
  is_active: boolean;
  organization_id?: string | null;
  default_park_id?: string | null;
}

export interface UserListParams {
  limit?: number;
  offset?: number;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}
