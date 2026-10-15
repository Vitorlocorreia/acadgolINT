import {EnrollmentBillingFields} from './enrollment-billing-fields'
import {schoolClock,formatMonth} from '@/lib/format'
import { requirePage } from '@/lib/auth/session'
import { PageHeader } from '@/components/page-header'
import { SubmitButton } from '@/components/submit-button'
export const dynamic = 'force-dynamic'
import Link from "next/link";
import {
  Users,
  User,
  HeartPulse,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import {
  getTrialEnrollmentData,
  getFormDataForEnrollment,
  createStudentEnrollmentAction,
} from "../actions";
import { GuardiansFormSection } from "./guardians-form-section";
import { StudentPhotoUpload } from "../student-photo-upload";

export default async function NovoAlunoPage({searchParams}:{searchParams:Promise<{trialId?:string}>}) {
  const {trialId}=await searchParams;
  await requirePage('students.write');
  const { units, categories, plans, classes, coaches } =
    await getFormDataForEnrollment();

  const trial=trialId?await getTrialEnrollmentData(trialId):null;
  return (
    <div className="page-container !max-w-4xl space-y-6">
      {/* Header */}
      <><Link href="/alunos" className="text-link"><ChevronLeft size={16} />Voltar para atletas</Link><PageHeader eyebrow="Nossa base cresce aqui" title="Nova matrícula" description="Preencha os dados do atleta, os contatos da família e a turma. Os campos com * são obrigatórios." /><nav aria-label="Etapas da matrícula" className="form-navigation"><a href="#athlete-data">1. Atleta</a><a href="#guardian-data">2. Responsáveis</a><a href="#medical-data">3. Saúde</a><a href="#enrollment-data">4. Turma e plano</a><a href="#agreement-data">5. Termo de adesão</a></nav></>

      {/* Formulário Completo de Matrícula */}
      <form action={createStudentEnrollmentAction} className="space-y-6"><input type="hidden" name="request_id" value={crypto.randomUUID()}/>{trial&&<><input type="hidden" name="trial_id" value={trial.id}/><p className="notice">Conclua a matrícula de {trial.student_name}. Confirme a data de nascimento e os responsáveis para preservar a ficha existente.</p></>}
        {/* 1. DADOS DO ATLETA */}
        <div id="athlete-data" className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#c81930]/10 border border-[#c81930]/20 flex items-center justify-center text-[#c81930]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
                1. Informações do Atleta
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Dados pessoais e de futebol do aluno
              </p>
            </div>
          </div>

          {/* Foto do Atleta para o Card FIFA */}
          <div className="p-4 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg">
            <StudentPhotoUpload required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="enrollment-name"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Nome Completo do Aluno <span className="text-red-500">*</span>
              </label>
              <input
                id="enrollment-name"
                type="text"
                name="name"
                defaultValue={trial?.student_name||''}
                required
                placeholder="Ex: Lucas Gabriel da Silva"
                className="input-escolinha"
              />
            </div>

            <div>
              <label
                htmlFor="enrollment-birth_date"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
              <input
                id="enrollment-birth_date"
                type="date"
                name="birth_date"
                required
                className="input-escolinha"
              />
            </div>

            <div>
              <label
                htmlFor="enrollment-cpf"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                CPF do Aluno (se tiver)
              </label>
              <input
                id="enrollment-cpf"
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                className="input-escolinha"
              />
            </div>

            <div>
              <label
                htmlFor="enrollment-preferred_position"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Posição de Preferência <span className="text-red-500">*</span>
              </label>
              <select
                id="enrollment-preferred_position"
                name="preferred_position"
                className="input-escolinha cursor-pointer"
              >
                <option value="Meia">Meia / Meio-Campo</option>
                <option value="Atacante">Atacante / Ponta</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Zagueiro">Zagueiro</option>
                <option value="Lateral">Lateral (Direito / Esquerdo)</option>
                <option value="Volante">Volante de Marcação</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="enrollment-dominant_foot"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Pé Dominante <span className="text-red-500">*</span>
              </label>
              <select
                id="enrollment-dominant_foot"
                name="dominant_foot"
                className="input-escolinha cursor-pointer"
              >
                <option value="Destro">Destro (Pé Direito)</option>
                <option value="Canhoto">Canhoto (Pé Esquerdo)</option>
                <option value="Ambidestro">Ambidestro</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="enrollment-uniform_size"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Tamanho do Uniforme (Kit){" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                id="enrollment-uniform_size"
                name="uniform_size"
                className="input-escolinha cursor-pointer"
              >
                <option value="4">Tam 04 (Infantil)</option>
                <option value="6">Tam 06 (Infantil)</option>
                <option value="8">Tam 08 (Infantil)</option>
                <option value="10">Tam 10 (Infantil)</option>
                <option value="12">Tam 12 (Infantil)</option>
                <option value="14">Tam 14 (Juvenil)</option>
                <option value="16">Tam 16 (Juvenil)</option>
                <option value="P">Tamanho P Adulto</option>
                <option value="M">Tamanho M Adulto</option>
                <option value="G">Tamanho G Adulto</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. DADOS DOS RESPONSÁVEIS */}
        <div id="guardian-data"><GuardiansFormSection /></div>

        {/* 3. FICHA MÉDICA & AUTORIZAÇÕES */}
        <div id="medical-data" className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
                3. Ficha Médica & Saúde
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Segurança do atleta em campo e termos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="enrollment-blood_type"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Tipo Sanguíneo
              </label>
              <select
                id="enrollment-blood_type"
                name="blood_type"
                defaultValue=""
                className="input-escolinha cursor-pointer"
              >
                <option value="">Não informado</option>
                <option value="O+">O Positivo (O+)</option>
                <option value="O-">O Negativo (O-)</option>
                <option value="A+">A Positivo (A+)</option>
                <option value="A-">A Negativo (A-)</option>
                <option value="B+">B Positivo (B+)</option>
                <option value="B-">B Negativo (B-)</option>
                <option value="AB+">AB Positivo (AB+)</option>
                <option value="AB-">AB Negativo (AB-)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="enrollment-health_insurance"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Plano de Saúde (se tiver)
              </label>
              <input
                id="enrollment-health_insurance"
                type="text"
                name="health_insurance"
                placeholder="Ex: Unimed, Hapvida, Bradesco..."
                className="input-escolinha"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="enrollment-allergies"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Alergias ou Restrições Alimentares / Medicamentosas
              </label>
              <input
                id="enrollment-allergies"
                type="text"
                name="allergies"
                placeholder="Ex: Alergia a picada de insetos, dipirona, lactose... (ou Nenhuma)"
                className="input-escolinha"
              />
            </div>

            <div>
              <label
                htmlFor="enrollment-emergency_contact_name"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Contato de Emergência Adicional
              </label>
              <input
                id="enrollment-emergency_contact_name"
                type="text"
                name="emergency_contact_name"
                placeholder="Ex: Tia Maria ou Avô Roberto"
                className="input-escolinha"
              />
            </div>

            <div>
              <label
                htmlFor="enrollment-emergency_contact_phone"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Telefone de Emergência
              </label>
              <input
                id="enrollment-emergency_contact_phone"
                type="tel"
                name="emergency_contact_phone"
                placeholder="(81) 98888-7777"
                className="input-escolinha font-mono"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="image_use_authorized"
                  value="true"
                  className="w-4 h-4 rounded text-[#c81930] focus:ring-[#c81930] border-[var(--border-color)]"
                />
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  Autorizo o uso de imagem do atleta para fotos de treinos e
                  jogos nas redes sociais oficiais da Escolinha do Sport.
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="card-light p-5"><label className="flex items-start gap-3"><input type="checkbox" name="has_medical_clearance" value="true"/><span className="text-sm">Atestado médico apresentado e conferido pela secretaria. Marque apenas após verificar o documento.</span></label></div>
        {/* 4. TURMA & PLANO DE MENSALIDADE */}
        <div id="enrollment-data" className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
                4. Turma de Treino & Plano de Mensalidade
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Escolha a escala de treinos e plano contratado
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="enrollment-class_id"
                className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1"
              >
                Selecione a Turma de Treino{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                id="enrollment-class_id"
                defaultValue={trial?.class_id||undefined}
                name="class_id"
                required
                className="input-escolinha cursor-pointer"
              >
                {classes.length === 0 ? (
                  <option value="">Nenhuma turma cadastrada</option>
                ) : (
                  classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (
                      {cls.start_time?.slice(0, 5)} -{" "}
                      {cls.end_time?.slice(0, 5)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <EnrollmentBillingFields plans={plans} firstMonthlyLabel={formatMonth(new Date(Date.UTC(Number(schoolClock().date.slice(0,4)),Number(schoolClock().date.slice(5,7)),1)).toISOString().slice(0,7))}/>
          </div>
        </div>

        {/* 5. TERMO DE ADESÃO */}
        <div id="agreement-data" className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#c81930]/10 border border-[#c81930]/20 flex items-center justify-center text-[#c81930]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
                5. Termo de adesão
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Confira as informações e orientações da matrícula.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-card-hover)] rounded border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-bold text-[var(--text-primary)]">
              Declaração de Matrícula na Escolinha do Sport:
            </p>
            <p>
              Declaro que as informações prestadas são verdadeiras e estou
              ciente das normas da escolinha, horários de treino e plano de
              mensalidades contratado. Autorizo o atendimento de primeiros
              socorros em caso de emergência médica durante as atividades.
            </p>
          </div>


        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/alunos"
            className="button px-6 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg text-xs font-bold tracking-normal transition-all"
          >
            Cancelar
          </Link>
          <SubmitButton>Concluir matrícula</SubmitButton>
        </div>
      </form>
    </div>
  );
}
