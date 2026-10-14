import { Trophy, PlusCircle, DollarSign, Shield } from 'lucide-react'
import { getMatchesList, getFormDataForMatches, createMatchAction } from './actions'
import { JogosClient } from './jogos-client'

export const metadata = {
  title: 'Jogos, Campeonatos & Convocações | Sport Club do Recife',
  description: 'Gestão de partidas, convocações em 3D, taxas de inscrição e disparos para o WhatsApp.',
}

export default async function JogosPage() {
  const matches = await getMatchesList()
  const { units, categories, coaches, students } = await getFormDataForMatches()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D61F27] flex items-center gap-1">
              ★ ★ ★ DNA Rubro-Negro • Sport Club do Recife
            </span>
          </div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2 mt-1">
            <Trophy className="w-8 h-8 text-[#D61F27]" />
            Jogos, Campeonatos & Convocações ({matches.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Agendamento de amistosos e campeonatos, taxa de inscrição para coordenação, disparo automático de Cards FIFA no WhatsApp e registro de placar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Jogos */}
        <div className="lg:col-span-2 space-y-4">
          <JogosClient
            matches={matches}
            categories={categories}
            coaches={coaches}
            students={students}
          />
        </div>

        {/* Formulário: Agendar Novo Jogo & Convocar Atletas */}
        <div className="card-light p-6 space-y-4 border-t-4 border-t-[#D61F27]">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#D61F27]" />
              Agendar Partida & Convocação
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure o adversário, data, taxa de inscrição e convoque os atletas</p>
          </div>

          <form action={createMatchAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Título do Jogo / Torneio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Copa Recife de Base ou Amistoso Oficial"
                className="input-escolinha"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Time Adversário <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="opponent"
                required
                placeholder="Ex: Santa Cruz FC, Náutico, Retrô FC..."
                className="input-escolinha"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tipo de Jogo
                </label>
                <select name="match_type" className="input-escolinha cursor-pointer">
                  <option value="friendly">⚽ Amistoso Rubro-Negro</option>
                  <option value="championship">🏆 Campeonato Oficial</option>
                  <option value="internal_cup">🥇 Torneio Interno</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
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

            {/* SEÇÃO: VALOR DA TAXA DE INSCRIÇÃO */}
            <div className="p-3.5 bg-gradient-to-r from-[#0A0A0C] to-[#1C0406] rounded-[8px] border border-amber-400/40 text-white space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#FFE300] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#FFE300]" />
                  <span>Taxa de Inscrição (R$)</span>
                </label>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-[#FFE300] text-[9px] font-mono font-bold uppercase">
                  Pagar na Coordenação
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="registration_fee"
                  defaultValue="0.00"
                  placeholder="0,00"
                  className="input-escolinha pl-9 font-mono font-bold text-white bg-black/50 border-amber-400/40 focus:border-amber-400 text-sm"
                />
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                * Este valor será informado na convocação do WhatsApp para os pais efetuarem o pagamento diretamente na <strong>coordenação</strong> da escolinha. (Deixe 0 se gratuito).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Local / Campo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                required
                defaultValue="CT Ilha do Retiro - Campo 01"
                className="input-escolinha"
              />
            </div>

            {/* Seleção de Atletas para Convocação */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Convoque os Atletas para o Jogo:
                </label>
                <span className="text-[10px] text-[#D61F27] font-bold">
                  {students.length} atletas disponíveis
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
                {students.map((st: any) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 text-xs cursor-pointer hover:border-[#D61F27]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="selected_students"
                      value={st.id}
                      className="rounded accent-[#D61F27] w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">{st.name}</span>
                    <span className="text-[10px] text-[#D61F27] font-semibold">({st.preferred_position})</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white font-bold text-xs uppercase tracking-wider rounded-[6px] shadow-sm transition-all cursor-pointer border border-amber-400/40"
            >
              Agendar & Disparar Convocação
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
