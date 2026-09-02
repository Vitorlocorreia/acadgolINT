import Link from 'next/link'
import {
  Users,
  User,
  HeartPulse,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react'
import { getFormDataForEnrollment, createStudentEnrollmentAction } from '../actions'
import { SignaturePad } from '@/components/signature-pad'

export default async function NovoAlunoPage() {
  const { units, categories, plans, classes, coaches } = await getFormDataForEnrollment()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/alunos"
            className="p-2 rounded-[4px] bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bebas text-3xl text-slate-900 tracking-wider leading-none">
              Nova Matrícula de Atleta
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Preencha os dados do aluno, responsável, ficha de saúde e turma para matricular.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário Completo de Matrícula */}
      <form action={createStudentEnrollmentAction} className="space-y-6">
        {/* 1. DADOS DO ATLETA */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/20 flex items-center justify-center text-[#1A6B2E]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                1. Informações do Atleta
              </h2>
              <p className="text-[11px] text-slate-500">Dados pessoais e de futebol do aluno</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome Completo do Aluno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ex: Lucas Gabriel da Silva"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data de Nascimento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="birth_date"
                required
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                CPF do Aluno (se tiver)
              </label>
              <input
                type="text"
                name="cpf"
                placeholder="000.000.000-00"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Posição de Preferência <span className="text-red-500">*</span>
              </label>
              <select name="preferred_position" className="input-escolinha cursor-pointer">
                <option value="Meia">Meia / Meio-Campo</option>
                <option value="Atacante">Atacante / Ponta</option>
                <option value="Goleiro">Goleiro</option>
                <option value="Zagueiro">Zagueiro</option>
                <option value="Lateral">Lateral (Direito / Esquerdo)</option>
                <option value="Volante">Volante de Marcação</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Pé Dominante <span className="text-red-500">*</span>
              </label>
              <select name="dominant_foot" className="input-escolinha cursor-pointer">
                <option value="Destro">Destro (Pé Direito)</option>
                <option value="Canhoto">Canhoto (Pé Esquerdo)</option>
                <option value="Ambidestro">Ambidestro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tamanho do Uniforme (Kit) <span className="text-red-500">*</span>
              </label>
              <select name="uniform_size" className="input-escolinha cursor-pointer">
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

        {/* 2. DADOS DO RESPONSÁVEL */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                2. Dados do Pai / Responsável Legal
              </h2>
              <p className="text-[11px] text-slate-500">Contato principal para cobranças e avisos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="guardian_name"
                required
                placeholder="Ex: Marcos Vinícius da Silva"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Grau de Parentesco <span className="text-red-500">*</span>
              </label>
              <select name="relationship" className="input-escolinha cursor-pointer">
                <option value="Pai">Pai</option>
                <option value="Mãe">Mãe</option>
                <option value="Avô/Avó">Avô / Avó</option>
                <option value="Tio/Tia">Tio / Tia</option>
                <option value="Tutor Legal">Tutor Legal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                WhatsApp / Celular <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="guardian_phone"
                required
                placeholder="(81) 99999-9999"
                className="input-escolinha font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                CPF do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="guardian_cpf"
                required
                placeholder="000.000.000-00"
                className="input-escolinha font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                E-mail do Responsável
              </label>
              <input
                type="email"
                name="guardian_email"
                placeholder="email@responsavel.com"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Endereço / Bairro
              </label>
              <input
                type="text"
                name="address"
                placeholder="Ex: Rua Setúbal, Boa Viagem"
                className="input-escolinha"
              />
            </div>
          </div>
        </div>

        {/* 3. FICHA MÉDICA & AUTORIZAÇÕES */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-[4px] bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                3. Ficha Médica & Saúde
              </h2>
              <p className="text-[11px] text-slate-500">Segurança do atleta em campo e termos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tipo Sanguíneo
              </label>
              <select name="blood_type" className="input-escolinha cursor-pointer">
                <option value="O+">O Positivo (O+)</option>
                <option value="O-">O Negativo (O-)</option>
                <option value="A+">A Positivo (A+)</option>
                <option value="A-">A Negativo (A-)</option>
                <option value="B+">B Positivo (B+)</option>
                <option value="B-">B Negativo (B-)</option>
                <option value="AB+">AB Positivo (AB+)</option>
                <option value="AB-">AB Negativo (AB-)</option>
                <option value="Não sei">Não informado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Plano de Saúde (se tiver)
              </label>
              <input
                type="text"
                name="health_insurance"
                placeholder="Ex: Unimed, Hapvida, Bradesco..."
                className="input-escolinha"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Alergias ou Restrições Alimentares / Medicamentosas
              </label>
              <input
                type="text"
                name="allergies"
                placeholder="Ex: Alergia a picada de insetos, dipirona, lactose... (ou Nenhuma)"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Contato de Emergência Adicional
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                placeholder="Ex: Tia Maria ou Avô Roberto"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Telefone de Emergência
              </label>
              <input
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
                  defaultChecked
                  className="w-4 h-4 rounded text-[#1A6B2E] focus:ring-[#1A6B2E] border-slate-300"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Autorizo o uso de imagem do atleta para fotos de treinos e jogos nas redes sociais oficiais da Academia do Gol.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. TURMA & PLANO DE MENSALIDADE */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-[4px] bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                4. Turma de Treino & Plano de Mensalidade
              </h2>
              <p className="text-[11px] text-slate-500">Escolha a escala de treinos e plano contratado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Selecione a Turma de Treino <span className="text-red-500">*</span>
              </label>
              <select name="class_id" required className="input-escolinha cursor-pointer">
                {classes.length === 0 ? (
                  <option value="">Nenhuma turma cadastrada</option>
                ) : (
                  classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} — {cls.unit?.name} ({cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Plano de Matrícula <span className="text-red-500">*</span>
              </label>
              <select name="plan_id" required className="input-escolinha cursor-pointer">
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R$ {Number(p.price).toFixed(2)}/mês
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Dia de Vencimento da Mensalidade <span className="text-red-500">*</span>
              </label>
              <select name="due_day" className="input-escolinha cursor-pointer font-mono">
                <option value="5">Todo dia 05</option>
                <option value="10">Todo dia 10</option>
                <option value="15">Todo dia 15</option>
                <option value="20">Todo dia 20</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Valor da Mensalidade Acordado (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthly_fee"
                step="0.01"
                defaultValue="180.00"
                required
                className="input-escolinha font-mono"
              />
            </div>
          </div>
        </div>

        {/* 5. CONTRATO & ASSINATURA DIGITAL */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/20 flex items-center justify-center text-[#1A6B2E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
                5. Termo de Adesão & Assinatura Digital
              </h2>
              <p className="text-[11px] text-slate-500">O responsável pode assinar com o dedo no celular ou tablet</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Declaração de Matrícula na Academia do Gol:</p>
            <p>
              Declaro que as informações prestadas são verdadeiras e estou ciente das normas da escolinha, horários de treino e plano de mensalidades contratado. Autorizo o atendimento de primeiros socorros em caso de emergência médica durante as atividades.
            </p>
          </div>

          <SignaturePad name="signature_url" />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/alunos"
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-8 py-3 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Concluir Matrícula & Assinar
          </button>
        </div>
      </form>
    </div>
  )
}
