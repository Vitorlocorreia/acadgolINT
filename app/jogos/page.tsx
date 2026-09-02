import { Trophy, PlusCircle } from 'lucide-react'
import { getMatchesList, getFormDataForMatches, createMatchAction } from './actions'
import { JogosClient } from './jogos-client'

export default async function JogosPage() {
  const matches = await getMatchesList()
  const { units, categories, coaches, students } = await getFormDataForMatches()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
            <Trophy className="w-8 h-8 text-[#1A6B2E]" />
            Jogos, Campeonatos & Convocações ({matches.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Agendamento de amistosos e torneios, convocação de atletas no WhatsApp e registro de placar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Jogos */}
        <div className="lg:col-span-2 space-y-4">
          <JogosClient matches={matches} />
        </div>

        {/* Formulário: Agendar Novo Jogo & Convocar Atletas */}
        <div className="card-light p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#1A6B2E]" />
              Agendar Partida
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure o adversário, data e convoque os atletas</p>
          </div>

          <form action={createMatchAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Título do Jogo / Torneio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Amistoso Preparatório ou Copa Futuro"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Time Adversário <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="opponent"
                required
                placeholder="Ex: Escolinha do Sport Club do Recife"
                className="input-escolinha"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tipo de Jogo
                </label>
                <select name="match_type" className="input-escolinha cursor-pointer">
                  <option value="friendly">⚽ Amistoso</option>
                  <option value="championship">🏆 Campeonato Oficial</option>
                  <option value="internal_cup">🥇 Torneio Interno</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Categoria
                </label>
                <select name="category_id" className="input-escolinha cursor-pointer">
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
                  Data do Jogo <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="match_date"
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
                  name="match_time"
                  defaultValue="09:00"
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Local / Campo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                required
                defaultValue="Arena Academia do Gol - Campo 01"
                className="input-escolinha"
              />
            </div>

            {/* Seleção de Atletas para Convocação */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Convoque os Atletas para o Jogo:
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
                {students.map((st: any) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-100 text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      name="selected_students"
                      value={st.id}
                      className="rounded text-[#1A6B2E] focus:ring-[#1A6B2E]"
                    />
                    <span className="font-bold text-slate-800">{st.name}</span>
                    <span className="text-[10px] text-slate-500">({st.preferred_position})</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-xs transition-all cursor-pointer"
            >
              Agendar & Salvar Convocação
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
