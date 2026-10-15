import { requirePage } from '@/lib/auth/session'
export const dynamic = 'force-dynamic'
import { CreatePanel } from '@/components/create-panel'
import { SubmitButton } from '@/components/submit-button'
import { PageHeader } from '@/components/page-header'
import { schoolClock } from '@/lib/format'
import { Trophy, PlusCircle, DollarSign, Shield } from 'lucide-react'
import { getMatchesList, getFormDataForMatches, createMatchAction } from './actions'
import { JogosClient } from './jogos-client'

export const metadata = {
  title: 'Jogos, Campeonatos & Convocações | Sport Club do Recife',
  description: 'Gestão de partidas, convocações em 3D, taxas de inscrição e disparos para o WhatsApp.',
}

export default async function JogosPage() {
  await requirePage('games.read');
  const matches = await getMatchesList()
  const { units, categories, coaches, students } = await getFormDataForMatches()

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Nosso próximo desafio" title="Jogos e convocações" description="Prepare as partidas, organize os convocados e registre os resultados." />

      <div className="workspace-layout">
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
        <CreatePanel key={matches.length} title="Agendar partida">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#c81930]" />
              Agendar Partida & Convocação
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Configure o adversário, data, taxa de inscrição e convoque os atletas</p>
          </div>

          <form action={createMatchAction} className="space-y-4">
            <div>
              <label htmlFor="field-appjogospagetsx-101" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Título do Jogo / Torneio <span className="text-red-500">*</span>
              </label>
              <input id="field-appjogospagetsx-101"
                type="text"
                name="title"
                required
                placeholder="Ex: Copa Recife de Base ou Amistoso Oficial"
                className="input-escolinha"
              />
            </div>

            <div>
              <label htmlFor="field-appjogospagetsx-102" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Time Adversário <span className="text-red-500">*</span>
              </label>
              <input id="field-appjogospagetsx-102"
                type="text"
                name="opponent"
                required
                placeholder="Ex: Santa Cruz FC, Náutico, Retrô FC..."
                className="input-escolinha"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="jogos-field-1" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Tipo de Jogo
                </label>
                <select id="jogos-field-1" name="match_type" className="input-escolinha cursor-pointer">
                  <option value="friendly">⚽ Amistoso Rubro-Negro</option>
                  <option value="championship">🏆 Campeonato Oficial</option>
                  <option value="internal_cup">🥇 Torneio Interno</option>
                </select>
              </div>

              <div>
                <label htmlFor="jogos-field-2" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Categoria
                </label>
                <select id="jogos-field-2" name="category_id" className="input-escolinha cursor-pointer">
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SEÇÃO: VALOR DA TAXA DE INSCRIÇÃO */}
            <div className="p-3.5 bg-gradient-to-r from-[#0A0A0C] to-[#1C0406] rounded-lg border border-amber-400/40 text-white space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold  tracking-normal text-[#FFE300] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#FFE300]" />
                  <span>Taxa de Inscrição (R$)</span>
                </label>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-[#FFE300] text-[9px] font-mono font-bold ">
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
                  name="registration_fee" aria-label="Taxa de inscrição em reais"
                  defaultValue="0.00"
                  placeholder="0,00"
                  className="input-escolinha pl-9 font-mono font-bold text-white bg-black/50 border-amber-400/40 focus:border-amber-400 text-sm"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-tight">
                * Este valor será informado na convocação do WhatsApp para os pais efetuarem o pagamento diretamente na <strong>coordenação</strong> da escolinha. (Deixe 0 se gratuito).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-appjogospagetsx-103" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Data do Jogo <span className="text-red-500">*</span>
                </label>
                <input id="field-appjogospagetsx-103"
                  type="date"
                  name="match_date"
                  required
                  defaultValue={schoolClock().date}
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label htmlFor="field-appjogospagetsx-104" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Horário
                </label>
                <input id="field-appjogospagetsx-104"
                  type="time"
                  name="match_time"
                  defaultValue="09:00"
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-appjogospagetsx-105" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Local / Campo <span className="text-red-500">*</span>
              </label>
              <input id="field-appjogospagetsx-105"
                type="text"
                name="location"
                required
                defaultValue="CT Ilha do Retiro - Campo 01"
                className="input-escolinha"
              />
            </div>

            <div><label htmlFor="match-instructions" className="field-label">Orientações da convocação</label><textarea id="match-instructions" name="user_notes" maxLength={500} rows={3} className="input-escolinha" placeholder="Ex.: apresentação às 08h30, uniforme completo, caneleira e garrafa de água."/><p className="text-xs text-[var(--text-muted)] mt-1">Aparecem na imagem e na mensagem. A mensagem inclui o texto completo.</p></div>
            {/* Seleção de Atletas para Convocação */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)]">
                  Convoque os Atletas para o Jogo:
                </label>
                <span className="text-xs text-[#c81930] font-bold">
                  {students.length} atletas disponíveis
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded">
                {students.map((st: any) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 p-1.5 bg-[var(--bg-card)] rounded border border-[var(--border-color)] text-xs cursor-pointer hover:border-[#c81930]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="selected_students"
                      value={st.id}
                      className="rounded accent-[#c81930] w-4 h-4"
                    />
                    <span className="font-bold text-[var(--text-primary)]">{st.name}</span>
                    <span className="text-xs text-[#c81930] font-semibold">({st.preferred_position})</span>
                  </label>
                ))}
              </div>
            </div>

            <SubmitButton>
              Salvar partida e convocados
            </SubmitButton>
          </form>
        </CreatePanel>
      </div>
    </div>
  )
}
