import { requirePage } from '@/lib/auth/session'
export const dynamic = 'force-dynamic'
import { CreatePanel } from '@/components/create-panel'
import { SubmitButton } from '@/components/submit-button'
import { PageHeader } from '@/components/page-header'
import { schoolClock } from '@/lib/format'
import { Target, PlusCircle } from 'lucide-react'
import { getTrialClasses, getUnitsAndCategoriesForTrials, createTrialClassAction } from './actions'
import { TrialClient } from './trial-client'

export default async function ExperimentaisPage() {
  await requirePage('trials.read');
  const trials = await getTrialClasses()
  const { units, categories, classes } = await getUnitsAndCategoriesForTrials()

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Novos talentos" title="Aulas experimentais" description="Acompanhe cada família, da primeira aula à matrícula." />

      <div className="workspace-layout">
        {/* Lista e Funil */}
        <div className="lg:col-span-2 space-y-4">
          <TrialClient trials={trials} />
        </div>

        {/* Formulário: Agendar Nova Aula Teste */}
        <CreatePanel key={trials.length} title="Agendar aula">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#c81930]" />
              Agendar Aula Experimental
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Cadastre o lead e vincule diretamente à turma da aula teste
            </p>
          </div>

          <form action={createTrialClassAction} className="space-y-4"><input type="hidden" name="request_id" value={crypto.randomUUID()}/>
            {/* Turma da Aula Teste */}
            <div className="p-3 bg-red-50/50 rounded-lg border border-[#c81930]/30 space-y-1">
              <label htmlFor="experimentais-field-1" className="block text-xs font-bold  tracking-normal text-[var(--text-primary)]">
                Turma da Aula Experimental <span className="text-red-600">*</span>
              </label>
              <select id="experimentais-field-1" name="class_id" required className="input-escolinha cursor-pointer bg-[var(--bg-card)]">
                <option value="">Selecione a turma...</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.category?.name || 'Geral'}) • {cls.start_time?.slice(0, 5)} às {cls.end_time?.slice(0, 5)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)]">
                O aluno aparecerá automaticamente na lista de presença desta turma com o badge <strong>EXPERIMENTAL</strong>.
              </p>
            </div>

            <div>
              <label htmlFor="field-appexperimentaispagetsx-101" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Nome da Criança / Aluno <span className="text-red-500">*</span>
              </label>
              <input id="field-appexperimentaispagetsx-101"
                type="text"
                name="student_name"
                required
                placeholder="Ex: Pedro Henrique"
                className="input-escolinha"
              />
            </div>

            <div>
              <label htmlFor="field-appexperimentaispagetsx-102" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Idade do Aluno
              </label>
              <input id="field-appexperimentaispagetsx-102"
                type="number"
                name="student_age"
                placeholder="Ex: 8"
                min="3"
                max="18"
                className="input-escolinha font-mono"
              />
            </div>

            <div>
              <label htmlFor="field-appexperimentaispagetsx-103" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Nome do Responsável <span className="text-red-500">*</span>
              </label>
              <input id="field-appexperimentaispagetsx-103"
                type="text"
                name="guardian_name"
                required
                placeholder="Ex: Camila Santos"
                className="input-escolinha"
              />
            </div>

            <div>
              <label htmlFor="field-appexperimentaispagetsx-104" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                WhatsApp do Responsável <span className="text-red-500">*</span>
              </label>
              <input id="field-appexperimentaispagetsx-104"
                type="tel"
                name="guardian_phone"
                required
                placeholder="(81) 98888-9999"
                className="input-escolinha font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="experimentais-field-2" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Unidade
                </label>
                <select id="experimentais-field-2" name="unit_id" className="input-escolinha cursor-pointer">
                  <option value="">Padrão da Turma</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="experimentais-field-3" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Categoria
                </label>
                <select id="experimentais-field-3" name="category_id" className="input-escolinha cursor-pointer">
                  <option value="">Padrão da Turma</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-appexperimentaispagetsx-105" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Data Agendada <span className="text-red-500">*</span>
                </label>
                <input id="field-appexperimentaispagetsx-105"
                  type="date"
                  name="scheduled_date"
                  required
                  defaultValue={schoolClock().date}
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label htmlFor="field-appexperimentaispagetsx-106" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Horário
                </label>
                <input id="field-appexperimentaispagetsx-106"
                  type="time"
                  name="scheduled_time"
                  defaultValue="08:30"
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" name="notifications_enabled" value="true" className="mt-1"/>
              <span>O responsável autorizou receber avisos desta aula e da escolinha pelo WhatsApp.</span>
            </label>
            <SubmitButton>
              Agendar Aula Experimental
            </SubmitButton>
          </form>
        </CreatePanel>
      </div>
    </div>
  )
}
