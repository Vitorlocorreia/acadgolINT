"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendTrackedWhatsApp } from '@/lib/whatsapp/tracked';

export async function getClassesForAttendance() {
  const supabase = await createAdminClient('attendance.read');

  const { data: classes, error } = await supabase
    .from("classes")
    .select(
      "id, name, start_time, end_time, unit:units(name), category:categories(name)",
    )
    .eq("is_active", true)
    .order("start_time");

  if (error)
    throw new Error("Não foi possível carregar as turmas. Tente novamente.");
  return (classes ?? []).map((item) => ({
    ...item,
    unit: Array.isArray(item.unit) ? (item.unit[0] ?? null) : item.unit,
    category: Array.isArray(item.category)
      ? (item.category[0] ?? null)
      : item.category,
  }));
}

export async function getClassStudentsAndAttendance(
  classId: string,
  trainingDate: string,
) {
  const supabase = await createAdminClient('attendance.read');

  // 1. Busca alunos matriculados ativos E experimentais vinculados a esta turma
  const {data:enrollments,error:enrollError}=await supabase.rpc('staff_class_roster',{p_class:classId,p_date:trainingDate});

  if (enrollError) {
    console.error("Erro ao buscar alunos da turma:", enrollError);
    throw new Error(
      "Não foi possível carregar os atletas da turma. Tente novamente.",
    );
  }

  const students = (enrollments ?? [])
    .map((e: any) => {
      if (!e.student) return null;
      const isTrial =
        e.status === "trial" ||
        e.student.status === "trial" ||
        (e.notes && e.notes.toLowerCase().includes("experimental"));

      return {
        ...e.student,
        is_trial: Boolean(isTrial),
        enrollment_id: e.id,
      };
    })
    .filter((s: any) => s && (s.status === "active" || s.status === "trial"))
    // Ordenação: regulares e experimentais em ordem alfabética
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  // 2. Busca chamada já realizada para essa data se existir
  const { data: logs, error: logsError } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("class_id", classId)
    .eq("training_date", trainingDate);

  if (logsError)
    throw new Error(
      "Não foi possível carregar as marcações deste treino. Tente novamente.",
    );
  return {
    students,
    logs: logs ?? [],
  };
}

export async function saveAttendanceAction(
  classId: string,
  trainingDate: string,
  records: Array<{
    student_id: string;
    status: "present" | "absent" | "justified";
    coach_notes?: string;
  }>,
  options: { notifyAbsents?: boolean; notifyPresences?: boolean } = {
    notifyAbsents: true,
    notifyPresences: true,
  },
) {
  if (
    !classId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(trainingDate) ||
    !Array.isArray(records) ||
    !records.length ||
    records.some(
      (record) =>
        !record.student_id ||
        !["present", "absent", "justified"].includes(record.status),
    )
  ) {
    return {
      success: false,
      error: "Revise os atletas, a turma e a data antes de salvar a chamada.",
    };
  }
  const supabase = await createAdminClient('attendance.write');

  const rows = records.map((r) => ({
    class_id: classId,
    training_date: trainingDate,
    student_id: r.student_id,
    status: r.status,
    coach_notes: r.coach_notes || null,
  }));

  const { error } = await supabase
    .from("attendance_logs")
    .upsert(rows, { onConflict: "class_id,training_date,student_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  // Sincroniza presença de alunos experimentais na tabela trial_classes
  const presentStudentIds = records
    .filter((r) => r.status === "present")
    .map((r) => r.student_id);
  if(presentStudentIds.length)await supabase.rpc('sync_trial_attendance',{p_class:classId,p_date:trainingDate,p_students:presentStudentIds});

  // Notificações automáticas no WhatsApp para os pais
  const { sendEvolutionWhatsApp } = await import("@/lib/whatsapp/evolution");
  const formattedDate = trainingDate.split("-").reverse().join("/");
  let notificationsSent = 0;
  let notificationsFailed = 0;
  let notificationsSkipped = 0;

  // Busca dados dos alunos e responsáveis com filtro de receives_notifications
  const studentIds = records.map((r) => r.student_id);
  const {data:studentsWithGuardians}=await supabase.rpc('attendance_notification_targets',{p_students:studentIds,p_class:classId});

  const studentMap = new Map(
    (studentsWithGuardians || []).map((s: any) => [s.id, s]),
  );

  for (const record of records) {
    const st: any = studentMap.get(record.student_id);
    if (!st) continue;

    const rawGuardians = Array.isArray(st.guardian)
      ? st.guardian
      : st.guardian
        ? [st.guardian]
        : [];
    const targets = rawGuardians.filter(
      (g: any) => g.receives_notifications !== false && g.phone,
    );
    const finalTargets = targets;

    for (const guardian of finalTargets) {
      if (record.status === "absent" && options.notifyAbsents !== false) {
        const msg = `⚽ *Sport Club do Recife — Aviso de Ausência*\n\nOlá ${guardian.name || "Responsável"}! Notamos que o atleta *${st.name}* não compareceu ao treino de ${formattedDate}.\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Pelo Sport tudo! 🔴⚫_`;
        const result = await sendTrackedWhatsApp(supabase,{kind:'attendance',entityId:record.student_id,guardianId:guardian.id,classId,date:trainingDate,variant:record.status,message:msg},phone=>sendEvolutionWhatsApp({phone,message:msg}));
        if (result.status==='accepted') notificationsSent++;
        else if(result.status==='already_accepted') notificationsSkipped++;
        else notificationsFailed++;
      } else if (record.status === "present" && options.notifyPresences) {
        const msg = `⚽ *Sport Club do Recife — Check-in de Treino*\n\nOlá ${guardian.name || "Responsável"}! Confirmamos que o atleta *${st.name}* teve presença registrada no treino de ${formattedDate}.\n\n_Pelo Sport tudo! 🔴⚫_`;
        const result = await sendTrackedWhatsApp(supabase,{kind:'attendance',entityId:record.student_id,guardianId:guardian.id,classId,date:trainingDate,variant:record.status,message:msg},phone=>sendEvolutionWhatsApp({phone,message:msg}));
        if (result.status==='accepted') notificationsSent++;
        else if(result.status==='already_accepted') notificationsSkipped++;
        else notificationsFailed++;
      }
    }
  }

  revalidatePath("/chamada");
  revalidatePath("/experimentais");
  revalidatePath("/dashboard");
  return { success: true, notificationsSent, notificationsFailed, notificationsSkipped };
}

// Disparo imediato individual de WhatsApp ao marcar presença ou falta
export async function notifySingleStudentAttendanceAction(
  studentId: string,
  trainingDate: string,
  status: "present" | "absent" | "justified",
  classId?: string,
  persist = true,
) {
  if(!classId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDate) || !['present','absent','justified'].includes(status))return {success:false,error:'Selecione uma turma, data e marcação válidas.'};
  const supabase = await createAdminClient('attendance.write');

  if (classId && persist) {
    const { error } = await supabase.from("attendance_logs").upsert(
      {
        class_id: classId,
        training_date: trainingDate,
        student_id: studentId,
        status,
      },
      { onConflict: "class_id,training_date,student_id" },
    );
    if (error)
      return {
        success: false,
        error:
          "Não foi possível registrar a presença. Nenhum aviso foi enviado.",
      };
  }

  const targetsResult=await supabase.rpc('attendance_notification_targets',{p_students:[studentId],p_class:classId||null});
  const student=targetsResult.data?.[0];

  if (!student) return { success: false, error: "Aluno não encontrado" };

  const rawGuardians = Array.isArray(student.guardian)
    ? student.guardian
    : student.guardian
      ? [student.guardian]
      : [];
  const targets = rawGuardians.filter(
    (g: any) => g.receives_notifications !== false && g.phone,
  );
  const finalTargets = targets;

  if (finalTargets.length === 0) {
    return {
      success: false,
      error: "Nenhum responsável com telefone e notificações habilitadas.",
    };
  }

  const { sendEvolutionWhatsApp } = await import("@/lib/whatsapp/evolution");
  const formattedDate = trainingDate.split("-").reverse().join("/");

  let sentCount = 0;
  let skippedCount = 0;
  for (const guardian of finalTargets) {
    let msg = "";
    if (status === "present") {
      msg = `⚽ *Escolinha do Sport — Check-in de Treino*\n\nOlá ${guardian.name || "Responsável"}! Confirmamos que o atleta *${student.name}* teve presença registrada no treino de ${formattedDate}.\n\n_Check-in oficial da Escolinha do Sport_`;
    } else if (status === "absent") {
      msg = `⚽ *Escolinha do Sport — Aviso de Ausência*\n\nOlá ${guardian.name || "Responsável"}! Notamos que o atleta *${student.name}* não compareceu ao treino de ${formattedDate}.\n\nAconteceu algum imprevisto ou gostaria de justificar a falta? Estamos à disposição!\n\n_Mensagem automática da Escolinha do Sport_`;
    } else {
      msg = `⚽ *Escolinha do Sport — Falta Justificada*\n\nOlá ${guardian.name || "Responsável"}! Registramos a justificativa de ausência do atleta *${student.name}* para o treino de ${formattedDate}. Obrigado pelo aviso!\n\n_Escolinha do Sport_`;
    }

    const res = await sendTrackedWhatsApp(supabase,{kind:'attendance',entityId:studentId,guardianId:guardian.id,classId,date:trainingDate,variant:status,message:msg},phone=>sendEvolutionWhatsApp({phone,message:msg}));
    if (res.status==='accepted') sentCount++;
    if (res.status==='already_accepted') skippedCount++;
  }

  revalidatePath("/chamada");
  return {
    success: sentCount + skippedCount === finalTargets.length,
    message:
      sentCount > 0
        ? `${sentCount} aviso(s) aceito(s) pelo WhatsApp. ${skippedCount} já enviado(s).`
        : skippedCount===finalTargets.length ? 'Este aviso já foi enviado. Nenhuma mensagem repetida.' : 'Confira os avisos pendentes no histórico da Comunicação.',
  };
}

export async function getAttendanceHistory(
  classId?: string,
  limit: number = 30,
) {
  const supabase = await createAdminClient('attendance.read');

  const {data:logs,error}=await supabase.rpc('staff_attendance_history',{p_class:classId&&classId!=='all'?classId:null,p_limit:5000});
  if(error)throw new Error('Não foi possível carregar o histórico de chamadas.');


  const sessionsMap = new Map<
    string,
    {
      key: string;
      date: string;
      classId: string;
      className: string;
      unitName: string;
      categoryName: string;
      coachName: string;
      total: number;
      present: number;
      absent: number;
      justified: number;
      attendanceRate: number;
      logs: any[];
    }
  >();

  logs.forEach((log: any) => {
    const key = `${log.training_date}_${log.class_id}`;
    if (!sessionsMap.has(key)) {
      sessionsMap.set(key, {
        key,
        date: log.training_date,
        classId: log.class_id,
        className: log.class?.name || "Turma",
        unitName: log.class?.unit?.name || "Unidade Principal",
        categoryName: log.class?.category?.name || "Geral",
        coachName: log.class?.coach?.name || "Treinador",
        total: 0,
        present: 0,
        absent: 0,
        justified: 0,
        attendanceRate: 0,
        logs: [],
      });
    }

    const session = sessionsMap.get(key)!;
    session.total += 1;
    if (log.status === "present") session.present += 1;
    else if (log.status === "absent") session.absent += 1;
    else if (log.status === "justified") session.justified += 1;
    session.logs.push(log);
  });

  sessionsMap.forEach((session) => {
    session.attendanceRate =
      session.total > 0
        ? Math.round((session.present / session.total) * 100)
        : 0;
  });

  return Array.from(sessionsMap.values()).slice(0, limit);
}
