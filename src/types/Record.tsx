export interface Record {
  record_id: number;
  news_id: number;
  created_at: string;
  summary: string;
  memo?: string;
  is_deleted: boolean;
}