export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  objective: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Dataset {
  id: number;
  project_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  selected_sheet: string | null;
  row_count: number | null;
  column_count: number | null;
  profile_data: DataProfile | null;
  created_at: string;
}

export interface DataProfile {
  file_name: string;
  sheets: string[];
  suggested_sheet: string;
  row_count: number;
  column_count: number;
  columns: string[];
  detected_period: string | null;
  numeric_cols: string[];
  text_cols: string[];
  percentage_cols: string[];
  null_counts: Record<string, number>;
  preview: Record<string, unknown>[];
  error?: string;
}

export interface Conversation {
  id: number;
  project_id: number;
  dataset_id: number | null;
  title: string;
  created_at: string;
  updated_at: string | null;
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SendMessageResponse {
  user_message: ConversationMessage;
  assistant_message: ConversationMessage;
  has_prompt: boolean;
  prompt_content: string | null;
}

export interface Prompt {
  id: number;
  conversation_id: number;
  project_id: number;
  dataset_id: number | null;
  content: string;
  title: string | null;
  created_at: string;
}

export interface Slide {
  id: number;
  project_id: number;
  prompt_id: number | null;
  dataset_id: number | null;
  title: string;
  status: "pending" | "generating" | "ready" | "error";
  slide_type: string | null;
  section: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Deck {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}
