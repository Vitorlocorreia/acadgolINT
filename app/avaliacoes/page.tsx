import {
  Award,
  PlusCircle,
  Star,
  Zap,
  Shield,
  Heart,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { getEvaluationsList, getStudentsAndCoachesForEvaluation, createEvaluationAction } from './actions'

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-xs ${i <= rating ? 'text-amber-400' : 'text-zinc-700'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default async function AvaliacoesPage() {
  const evaluations = await getEvaluationsList()
  const { students, coaches } = await getStudentsAndCoachesForEvaluation()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wider leading-none flex items-center gap-2">
            <Award className="w-8 h-8 text-emerald-400" />
            Boletim do Atleta & Scout Técnico ({evaluations.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Avaliações periódicas dos fundamentos do futebol e relatório de evolução para os pais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Boletins / Cards dos Atletas */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bebas text-2xl text-white tracking-wider leading-none">
            ⭐ Avaliações Recentes
          </h2>

          {evaluations.length === 0 ? (
            <div className="card-dark py-16 text-center space-y-2">
              <Award className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">Nenhum boletim emitido ainda.</p>
              <p className="text-xs text-zinc-500">Preencha o formulário ao lado para registrar o primeiro scout técnico.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {evaluations.map((ev: any) => {
                const overallScore = (
                  (ev.score_pass +
                    ev.score_shooting +
                    ev.score_dribble +
                    ev.score_control +
                    ev.score_marking +
                    ev.score_speed +
                    ev.score_stamina +
                    ev.score_discipline +
                    ev.score_teamwork) /
                  9
                ).toFixed(1)

                return (
                  <div
                    key={ev.id}
                    className="card-dark p-5 space-y-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-emerald-500/40 transition-all shadow-md relative overflow-hidden"
                  >
                    {/* Top Atleta + Badge Nota Geral */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[6px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bebas text-2xl text-emerald-400 shrink-0">
                          {ev.student?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{ev.student?.name}</h3>
                          <div className="text-[10px] text-emerald-400 font-medium">
                            {ev.student?.preferred_position} • Pé {ev.student?.dominant_foot}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {ev.period} • {ev.evaluation_date?.split('-').reverse().join('/')}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-[4px] bg-zinc-950 border border-zinc-800 text-center shrink-0">
                        <span className="font-bebas text-2xl text-amber-400 leading-none block">
                          {overallScore}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                          Média Geral
                        </span>
                      </div>
                    </div>

                    {/* Grid de Fundamentos Técnicos */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950/80 p-3 rounded border border-zinc-800/80 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Passe</span>
                        {renderStars(ev.score_pass)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Finalização</span>
                        {renderStars(ev.score_shooting)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Drible</span>
                        {renderStars(ev.score_dribble)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Domínio</span>
                        {renderStars(ev.score_control)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Velocidade</span>
                        {renderStars(ev.score_speed)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Disciplina</span>
                        {renderStars(ev.score_discipline)}
                      </div>
                    </div>

                    {/* Parecer do Treinador */}
                    {ev.coach_feedback && (
                      <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-300 italic">
                        "{ev.coach_feedback}"
                      </div>
                    )}

                    <div className="text-[10px] text-zinc-500 flex justify-between items-center pt-2 border-t border-zinc-800/60 font-mono">
                      <span>Avaliador: Prof. {ev.coach?.name || 'Treinador'}</span>
                      <span className="text-emerald-400 font-bold">✓ Homologado</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Formulário: Nova Avaliação Técnica */}
        <div className="card-dark p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-bebas text-2xl text-white tracking-wider leading-none flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Lançar Avaliação Técnica
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Pontuação de 1 a 5 para os fundamentos</p>
          </div>

          <form action={createEvaluationAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Atleta <span className="text-red-400">*</span>
              </label>
              <select name="student_id" required className="input-escolinha cursor-pointer">
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.preferred_position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Treinador Avaliador
              </label>
              <select name="coach_id" className="input-escolinha cursor-pointer">
                {coaches.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    Prof. {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Período
                </label>
                <input
                  type="text"
                  name="period"
                  defaultValue="1º Semestre 2026"
                  className="input-escolinha"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Data da Avaliação
                </label>
                <input
                  type="date"
                  name="evaluation_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            {/* Fundamentos com sliders ou selects 1 a 5 */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block border-b border-zinc-800 pb-1">
                Notas dos Fundamentos (1 a 5)
              </span>

              {[
                { name: 'score_pass', label: 'Passe & Visão de Jogo' },
                { name: 'score_shooting', label: 'Finalização & Chute' },
                { name: 'score_dribble', label: 'Drible & 1x1' },
                { name: 'score_control', label: 'Domínio & Recepção' },
                { name: 'score_marking', label: 'Marcação & Posicionamento' },
                { name: 'score_speed', label: 'Velocidade & Agilidade' },
                { name: 'score_discipline', label: 'Disciplina & Comportamento' },
                { name: 'score_teamwork', label: 'Trabalho em Equipe' },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{f.label}</span>
                  <select
                    name={f.name}
                    defaultValue="4"
                    className="bg-zinc-950 border border-zinc-800 text-white rounded px-2.5 py-1 text-xs font-mono font-bold cursor-pointer"
                  >
                    <option value="1">1 ★ (Iniciante)</option>
                    <option value="2">2 ★ (Básico)</option>
                    <option value="3">3 ★ (Regular)</option>
                    <option value="4">4 ★ (Bom)</option>
                    <option value="5">5 ★ (Excelente)</option>
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Parecer do Treinador (Comentário)
              </label>
              <textarea
                name="coach_feedback"
                rows={2}
                placeholder="Ex: Excelente evolução no passe e ótima dedicação nos treinos táticos..."
                className="input-escolinha resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
            >
              Emitir Boletim do Atleta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
