"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { schoolClock, weekDays, normalizeWeekDay } from "@/lib/format";

interface NamedRelation {
  name: string;
}
export interface DashboardClass {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  unit: NamedRelation | null;
  category: NamedRelation | null;
  coach: NamedRelation | null;
}
export interface DashboardTrial {
  id: string;
  student_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  category: NamedRelation | null;
}
export interface DashboardMatch {
  id: string;
  title: string;
  opponent: string;
  match_date: string;
  match_time: string | null;
  location: string;
  category: NamedRelation | null;
}
export interface DashboardData {
  today: string;
  totalStudents: number | null;
  activeStudents: number | null;
  totalClasses: number | null;
  classesToday: DashboardClass[];
  upcomingMatches: DashboardMatch[];
  trialClassesPending: DashboardTrial[];
  currentMonthRevenue: {
    total: number;
    collected: number;
    pending: number;
    overdue: number;
    overdueCount: number;
  } | null;
  errors: string[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = await createAdminClient('dashboard.read');
  const { date: today } = schoolClock();
  const [students, active, classes, invoices, trials, matches] =
    await Promise.all([
      db.from("students").select("id", { count: "exact", head: true }),
      db
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      db
        .from("classes")
        .select(
          "id, name, start_time, end_time, days_of_week, unit:units(name), category:categories(name), coach:coaches(name)",
        )
        .eq("is_active", true)
        .order("start_time"),
      db
        .from("invoices")
        .select("amount, paid_amount, status, due_date")
        .eq("reference_month", today.slice(0, 7))
        .neq("status", "cancelled"),
      db
        .from("trial_classes")
        .select(
          "id, student_name, scheduled_date, scheduled_time, category:categories(name)",
        )
        .eq("status", "scheduled")
        .gte("scheduled_date", today)
        .order("scheduled_date")
        .limit(5),
      db
        .from("matches")
        .select(
          "id, title, opponent, match_date, match_time, location, category:categories(name)",
        )
        .eq("status", "scheduled")
        .gte("match_date", today)
        .order("match_date")
        .limit(3),
    ]);
  const errors: string[] = [];
  for (const [name, result] of [
    ["atletas", students],
    ["atletas ativos", active],
    ["turmas", classes],
    ["mensalidades", invoices],
    ["aulas experimentais", trials],
    ["jogos", matches],
  ] as const) {
    if (result.error) {
      errors.push(name);
      console.error(`Painel: falha ao carregar ${name}`, result.error.message);
    }
  }
  const day = weekDays[new Date(`${today}T12:00:00Z`).getUTCDay()];
  const revenue = {
    total: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
    overdueCount: 0,
  };
  for (const invoice of invoices.data || []) {
    const amount = Number(invoice.amount);
    revenue.total += amount;
    if (invoice.status === "paid") revenue.collected += Number(invoice.paid_amount ?? invoice.amount);
    else if (invoice.status === "overdue" || invoice.due_date < today) {
      revenue.overdue += amount;
      revenue.overdueCount++;
    } else revenue.pending += amount;
  }
  return {
    today,
    totalStudents: students.error ? null : students.count,
    activeStudents: active.error ? null : active.count,
    totalClasses: classes.error ? null : (classes.data?.length ?? 0),
    classesToday: ((classes.data || []) as unknown as DashboardClass[]).filter(
      (item) => item.days_of_week?.some(value => normalizeWeekDay(value) === day),
    ),
    currentMonthRevenue: invoices.error ? null : revenue,
    trialClassesPending: (trials.data || []) as unknown as DashboardTrial[],
    upcomingMatches: (matches.data || []) as unknown as DashboardMatch[],
    errors,
  };
}
