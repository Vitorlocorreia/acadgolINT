import { Target, PlusCircle } from 'lucide-react'
import { getTrialClasses, getUnitsAndCategoriesForTrials, createTrialClassAction } from './actions'
import { TrialClient } from './trial-client'

export default async function ExperimentaisPage() {
  const trials = await getTrialClasses()
  const { units, categories, classes } = await getUnitsAndCategoriesForTrials()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
          <Target className="w-8 h-8 text-[#D61F27]" />
          Aulas Experimentais & Captação ({trials.length})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Funil de novos atletas: agendamento de aula teste vinculado à turma, presença na chamada e conversão em matrícula.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista e Funil */}
        <div className="lg:col-span-2 space-y-4">
          <TrialClient trials={trials} />
        </div>

        {/* Formulário: Agendar Nova Aula Teste */}
        <div className="card-light p-6 space-y-4 border-t-4 border-t-[#D61F27]">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#D61F27]" />
              Agendar Aula Experimental
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre o lead e vincule diretamente à turma da aula teste
            </p>
          </div>

          <form action={createTrialClassAction} className="space-y-4">
            {/* Turma da Aula Teste */}
            <div className="p-3 bg-red-50/50 rounded-[8px] border border-[#D61F27]/30 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Turma da Aula Experimental <span className="text-red-600">*</span>
              </label>
              <select name="class_id" required className="input-escolinha cursor-pointer bg-white">
                <option value="">Selecione a turma...</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.category?.name || 'Geral'}) • {cls.start_time?.slice(0, 5)} às {cls.end_time?.slice(0, 5)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                O aluno aparecerá automaticamente na lista de presença desta turma com o badge <strong>EXPERIMENTAL</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome da Criança / Aluno <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="student_name"
                required
                placeholder="Ex: Pedro Henrique"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Idade do Aluno
              </label>
              <input
                type="number"
                name="student_age"
                placeholder="Ex: 8"
                min="3"
                max="18"
                className="input-escolinha font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="guardian_name"
                required
                placeholder="Ex: Camila Santos"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                WhatsApp do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="guardian_phone"
                required
                placeholder="(81) 98888-9999"
                className="input-escolinha font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Unidade
                </label>
                <select name="unit_id" className="input-escolinha cursor-pointer">
                  <option value="">Padrão da Turma</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Categoria
                </label>
                <select name="category_id" className="input-escolinha cursor-pointer">
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Data Agendada <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="scheduled_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  name="scheduled_time"
                  defaultValue="08:30"
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white font-bold text-xs uppercase tracking-wider rounded-[6px] shadow-sm transition-all cursor-pointer border border-amber-400/30"
            >
              Agendar Aula Experimental
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
