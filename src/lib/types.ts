export type Student = {
  id: string;
  displayName?: string;
  display_name?: string;
  email: string;
};

export type User = {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  roles: Array<"student" | "teacher" | "admin">;
  status?: "active" | "disabled" | "pending";
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  word_cards_count?: number;
};

export type WordCard = {
  id: string;
  student_id: string;
  word: string;
  status: "new" | "active" | "completed" | "archived";
  category_id?: string;
  learning_unit_id?: string;
  audio_url?: string;
  initial_letter: string;
  times_shown: number;
  times_audio_played?: number;
};

export type CategoryProgress = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  total: number;
  byStatus: {
    new: number;
    active: number;
    completed: number;
    archived: number;
  };
  phase2Ready: boolean;
};

export type CompletedCard = {
  id: string;
  word: string;
  audioUrl?: string;
  category: { id: string; name: string; slug: string };
  timesShown: number;
  timesAudioPlayed: number;
  completedAt?: string;
};

export type CompletedCardsPage = {
  data: CompletedCard[];
  total: number;
  page: number;
  limit: number;
};

export type DailyPlan = {
  id: string;
  student_id: string;
  plan_date: string;
  target_cards_count: number;
  target_sessions_count: number;
  category_id: string;
  study_plan_id?: string;
  study_plan_level_id?: string;
  algorithm_version?: string;
  notes?: string;
};

export type StudyPlanStatus = "draft" | "active" | "paused" | "completed" | "archived";

export type StudyPlanCategory = {
  category_id: string;
  word_card_ids: string[];
};

export type StudyPlanLevel = {
  id: string;
  name: string;
  order_index: number;
  start_date: string;
  end_date: string;
  categories: StudyPlanCategory[];
};

export type StudyPlan = {
  id: string;
  name: string;
  description?: string;
  student_id: string;
  start_date: string;
  end_date: string;
  sessions_per_day: number;
  display_ms: number;
  audio_mode: "auto" | "manual" | "disabled";
  mode: "manual" | "auto";
  status: StudyPlanStatus;
  levels: StudyPlanLevel[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type DailyPlanSummary = {
  plan: DailyPlan;
  cards_count: number;
  cards: Array<{ id: string; word: string; status: string; audio_url?: string }>;
  sessions_count: number;
  completed_sessions_count: number;
  pending_sessions_count: number;
  next_session_id?: string | null;
};

export type DomanSession = {
  id: string;
  student_id: string;
  daily_plan_id: string;
  session_index: number;
  category_id: string;
  display_ms: number;
  audio_mode: "auto" | "manual" | "disabled";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  mode?: "manual" | "auto";
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
};

export type ArModel = {
  learning_unit_id: string;
  marker_id: string;
  word: string;
  model_3d: string;
};

export const MARKERS = [
  { id: "demo-animales-gato", name: "Hiro" },
  { id: "demo-animales-perro", name: "Kanji" },
] as const;

export function studentName(student: Student): string {
  return student.displayName ?? student.display_name ?? student.email;
}
