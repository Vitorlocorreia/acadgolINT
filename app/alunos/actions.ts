"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getStudentsList(filters?: {
  search?: string;
  categoryId?: string;
  unitId?: string;
  status?: string;
  page?: number;
}) {
  const supabase = await createAdminClient('students.read');
  const rawPage=filters?.page??1;
  const page=Number.isInteger(rawPage)&&rawPage>0?Math.min(rawPage,100000):1;
  const status=['all','active','paused','trial','overdue'].includes(filters?.status||'')?filters!.status!:'all';
  const {data,error}=await supabase.rpc('student_directory',{p_search:(filters?.search||'').trim().slice(0,120),p_status:status,p_page:page});
  if(error||!data||!Array.isArray(data.students))throw new Error('Não foi possível carregar os atletas. Tente novamente.');
  return data as {students:unknown[];total:number;page:number;pages:number;pageSize:number};
}

export async function toggleStudentStatusAction(
  studentId: string,
  newStatus: "active" | "paused",
) {
  const supabase = await createAdminClient('students.write');

  const {error}=await supabase.rpc('change_student_status',{p_student:studentId,p_status:newStatus});
  if(error)return {success:false,error:error.message};

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${studentId}`);
  revalidatePath("/chamada");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");

  return { success: true, newStatus };
}

export async function getFormDataForEnrollment() {
  const supabase = await createAdminClient('students.write');

  const [unitsRes, categoriesRes, plansRes, classesRes, coachesRes] =
    await Promise.all([
      supabase.from("units").select("*").eq("is_active", true).order("name"),
      supabase.from("categories").select("*").order("min_age"),
      supabase.from("plans").select("*").eq("is_active", true).order("price"),
      supabase
        .from("classes")
        .select("*, unit:units(name), category:categories(name)")
        .eq("is_active", true),
      supabase.from("coaches").select("*").eq("is_active", true).order("name"),
    ]);

  if ([unitsRes, categoriesRes, plansRes, classesRes, coachesRes].some(result => result.error)) {
    throw new Error('Não foi possível carregar as opções da matrícula. Tente novamente.');
  }
  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    plans: plansRes.data ?? [],
    classes: classesRes.data ?? [],
    coaches: coachesRes.data ?? [],
  };
}

export async function createStudentEnrollmentAction(formData: FormData) {
  const supabase = await createAdminClient('students.write');

  const payload=Object.fromEntries(formData.entries());
  delete payload.signature_url;
  if(typeof payload.photo_url!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(payload.photo_url)||payload.photo_url.length>1800000)throw new Error('Anexe uma foto válida do atleta para concluir a matrícula.');
  const {error}=await supabase.rpc('enroll_student',{p_payload:payload});
  if(error)throw new Error(error.message);
  revalidatePath('/alunos');revalidatePath('/dashboard');redirect('/alunos');
}


export async function getStudentById(id: string) {
  const supabase = await createAdminClient('students.read');

  const { data: student, error } = await supabase
    .from("students")
    .select(
      `
      *,
      guardian:guardians(*),
      medical_record:medical_records(*),
      enrollment:enrollments(
        id, status, monthly_fee, due_day, start_date, import_source,
        class:classes(id, name, start_time, end_time, days_of_week, unit:units(name), category:categories(name), coach:coaches(name, phone)),
        plan:plans(id, name, duration_months, includes_uniform)
      ),
      invoices:invoices(*),
      evaluations:technical_evaluations(*, coach:coaches(name))
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar a ficha do atleta. Tente novamente.');
  if (!student) {
    return null;
  }

  // Busca histórico de presenças
  const { data: attendance } = await supabase
    .from("attendance_logs")
    .select("*, class:classes(name)")
    .eq("student_id", id)
    .order("training_date", { ascending: false })
    .limit(20);

  return {
    ...student,
    attendance: attendance ?? [],
  };
}

export async function addGuardianToStudentAction(payload: {
  studentId: string;
  name: string;
  relationship: string;
  cpf: string;
  phone: string;
  email?: string;
  receivesNotifications: boolean;
}) {
  const supabase = await createAdminClient('students.write');
  const { error } = await supabase.from("guardians").insert({
    student_id: payload.studentId,
    name: payload.name.trim(),
    relationship: payload.relationship || "Responsável Legal",
    cpf: payload.cpf || null,
    phone: payload.phone || "",
    email: payload.email?.trim() || null,
    receives_notifications: payload.receivesNotifications !== false,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/alunos/${payload.studentId}`);
  revalidatePath("/alunos");
  return { success: true };
}

export async function toggleGuardianNotificationAction(
  guardianId: string,
  receivesNotifications: boolean,
  studentId?: string,
) {
  const supabase = await createAdminClient('students.write');
  const { error } = await supabase
    .from("guardians")
    .update({ receives_notifications: receivesNotifications })
    .eq("id", guardianId);

  if (error) return { success: false, error: error.message };
  if (studentId) revalidatePath(`/alunos/${studentId}`);
  revalidatePath("/alunos");
  return { success: true };
}

export async function removeGuardianAction(
  guardianId: string,
  studentId: string,
) {
  const supabase = await createAdminClient('students.write');
  const { error } = await supabase.rpc('remove_student_guardian',{p_guardian:guardianId,p_student:studentId});

  if (error) return { success: false, error: error.message };
  revalidatePath(`/alunos/${studentId}`);
  revalidatePath("/alunos");
  return { success: true };
}

export async function updateStudentPhotoAction(
  studentId: string,
  photoUrl: string,
) {
  const supabase = await createAdminClient('students.write');
  const { error } = await supabase
    .from("students")
    .update({ photo_url: photoUrl })
    .eq("id", studentId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/alunos/${studentId}`);
  revalidatePath("/alunos");
  revalidatePath("/jogos");
  revalidatePath("/chamada");
  return { success: true };
}

export async function getTrialEnrollmentData(id:string){
 const db=await createAdminClient('students.write');const {data,error}=await db.from('trial_classes').select('id,student_name,status,feedback').eq('id',id).maybeSingle();
 if(error||!data||data.status==='enrolled')return null;
 let class_id=null;try{class_id=JSON.parse(data.feedback||'{}').class_id}catch{}
 return {...data,class_id};
}

export async function renewFamilyAccessAction(studentId:string,enabled:boolean){
 const db=await createAdminClient('students.write');const {error}=await db.rpc('renew_family_access',{p_student:studentId,p_enabled:enabled});
 if(error)return {error:'Não foi possível alterar o acesso da família.'};revalidatePath('/alunos/'+studentId);return {success:true};
}
