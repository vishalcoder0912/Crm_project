import type { ReactNode } from 'react';

// shared row + entity types
export type Row = Record<string, any>;

export interface Column<T extends Row = Row> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
  search?: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    permissions?: string[];
  };
  demo?: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}