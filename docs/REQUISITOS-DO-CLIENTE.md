# Reclamações do sistema anterior e requisitos da escolinha

Análise do código atual em 15/10/2026. Atualização posterior: implementados início da mensalidade no mês seguinte, taxa de matrícula separada, desconto manual com justificativa opcional e divisão do recebimento entre formas de pagamento. Escopo confirmado: escolinha, mensalidades e uniformes. Reserva/aluguel de campo e cantina ficam fora desta entrega.

Os estados abaixo descrevem o que existe hoje. Propostas e critérios de aceite ainda não representam funcionalidades implementadas. A leitura considerou as telas, ações do servidor, migrações e verificações já existentes no projeto.

## Comparação por reclamação

| Item | Reclamação resumida | Situação atual | Requisito restante |
| --- | --- | --- | --- |
| 8 | Atraso causa perda de reserva do campo | Fora do escopo confirmado. Não há módulo de reserva do campo. | A situação financeira deve ser independente do cadastro do atleta. Não acrescentar cancelamento automático de reserva ou exclusão de cadastro. |
| 9 | Falta histórico de cancelamento e débitos | Parcial. A ficha mostra mensalidades; há registros de pagamentos, estornos e auditoria técnica. Não há linha do tempo operacional com data e motivo do cancelamento. | Ficha com histórico de matrícula, trancamento, cancelamento, retorno, cobranças, recebimentos e estornos, acessível à secretaria conforme suas permissões. Auditoria técnica não substitui essa tela. |
| 10 | Retorno exige novo cadastro e perde dados antigos | Parcial. Trancamento e reativação conservam o atleta. Ainda não há ciclo completo de cancelamento de contrato e nova matrícula no mesmo cadastro. | Uma pessoa mantém o mesmo cadastro. O retorno abre um novo período de matrícula e preserva contratos anteriores, responsáveis, presenças, fotos e pendências. |
| 11 | Estorno permanece no relatório de finalização | Fechamento geral diário implementado em 29/10/2026. Estornos prévios saem do total; recebimentos de dias fechados exigem reabertura autorizada. Cada fechamento preserva seus valores, recebimentos, responsável e diferenças; uma nova conferência gera outra versão. | Distinguir correção de lançamento e devolução física de dinheiro com movimento próprio. O módulo atual não registra saídas, sangrias ou transferências. |
| 12 | Várias mensalidades ou valores parciais precisam ser lançados mês a mês | Não atendido integralmente. A baixa atual quita uma cobrança por vez. | Receber várias competências em uma operação, com distribuição explícita dos valores. Se houver pagamento parcial, manter saldo aberto; não confundir parcial com desconto ou quitação. Confirmar o exemplo original de R$ 50. |
| 13 | Venda rápida exige cadastro do cliente | Não há venda rápida de uniformes integrada ao caixa. O módulo atual cadastra e ajusta estoque. | Venda avulsa de uniforme, com comprador opcional. Informar item/tamanho, quantidade e pagamento; registrar venda e baixa de estoque juntos. |
| 14 | Falta espaço para pais e responsáveis; busca limitada | Atendido no fluxo atual. Permite vários responsáveis, parentesco (pai, mãe e outros) e busca pelo nome do aluno, do responsável ou telefone. | Manter a identificação do aluno separada da dos responsáveis. Se for necessário cadastrar somente o nome de um pai sem contato, revisar a exigência atual de telefone por responsável. |
| 15 | Inserir amistosos e campeonatos | Atendido para cadastrar partidas de amistoso, campeonato ou torneio interno, com atletas convocados, dados do jogo, resultado e arte individual. | Chaves, fases e classificação de um campeonato completo não estão implementadas e não fazem parte do cadastro de uma partida. |
| 16 | Retirar produtos vencidos e explicar o motivo | Validade de perecíveis fica fora do escopo. Uniformes têm ajuste de estoque, mas não um fluxo específico de descarte com motivo. | Para uniformes: movimentos por perda, avaria, devolução e ajuste, com quantidade, motivo, funcionário e data. Não registrar descarte como venda. |
| 17 | Duas mensalidades de R$ 120 pagas com R$ 200 em dinheiro e R$ 40 em PIX | Parcialmente atendido após a atualização. Cada baixa agora permite dinheiro, PIX e cartões combinados; os relatórios separam os valores. Ainda é uma cobrança por operação. | Um recebimento de R$ 240, com duas formas de pagamento, distribuído entre as duas cobranças, sem duplicar a entrada no caixa. |
| 18 | Mensalidade antecipada depende de atualização posterior | Parcial. Já é possível emitir uma competência futura e dar baixa nela imediatamente. A rotina mensal preserva cobranças já existentes e pagas. | Simplificar a seleção de meses futuros e o pagamento conjunto. Separar a referência da mensalidade da data em que o dinheiro entrou. Não deixar um pagamento já recebido aguardando o mês seguinte para ser quitado. |
| 19 | Não reabre caixa anterior depois que outro funcionário abre novo caixa | Parcial após atualização de 29/10/2026. Fechamentos gerais são independentes por dia. Administrador e secretaria podem reabrir um dia antigo sem afetar outro, com justificativa, histórico e versões preservados. | Sessões individuais por funcionário e conta financeira, abertura operacional, saídas e transferências entre caixas ainda não estão incluídas. O fundo inicial é informado na conferência do dia. |
| 20 | Inativação por inadimplência exige refazer cadastro | Parcial. O trancado pode ser reativado, mas a ação atual só trata os estados ativo/trancado. Um registro legado em estado inativo não possui o mesmo retorno completo. | Situação financeira separada da situação da matrícula. Regularizar e reativar a mesma pessoa, sem apagar débitos ou histórico e sem recadastrar do zero. Conferir turma e vaga no retorno. |
| 21 | Presença depende de catraca, facial, QR Code ou agendamento pelo aluno | Atendido. O professor escolhe sua turma e data e registra presença, falta ou justificativa pelo celular/computador. | Manter a chamada independente desses equipamentos e do autoagendamento pelo aluno. |
| 22 | Desconto até dia 10, valor cheio no restante do mês e inadimplência no mês seguinte | Parcial após esclarecimento: mensalidade começa no mês seguinte ao ingresso; o valor acordado permanece visível e o desconto é informado manualmente na baixa, com justificativa opcional. A janela de inadimplência do mês seguinte não foi alterada nesta implementação. | Separar limite do desconto, valor cheio e início da inadimplência. Parametrizar a primeira competência e os valores, ainda pendentes de confirmação. |

## Ordem de implementação proposta

1. **Recebimentos completos — itens 12, 17 e 18.** Múltiplas mensalidades, pagamento misto, parciais, saldo remanescente e antecipação imediata. Esses recursos precisam de um modelo financeiro comum.
2. **Histórico e retorno — itens 9, 10 e 20.** Linha do tempo, datas e motivos, novo período de matrícula vinculado ao mesmo atleta, preservação de débitos e verificação de vaga.
3. **Política de mensalidades — item 22.** Implementar depois de confirmar valores, limites de datas, primeira competência e aplicação dos encargos.
4. **Caixa formal — itens 11 e 19.** Sessões, conferência por funcionário, fechamento definitivo e estornos/reaberturas auditados.
5. **Operação de uniformes — itens 13 e 16.** Venda avulsa integrada ao caixa e movimentos de estoque com motivo.

## Recebimento misto: exemplo do item 17

O responsável entrega R$ 240: R$ 200 em dinheiro e R$ 40 em PIX. As duas mensalidades de R$ 120 são quitadas na mesma operação.

| Competência | Dinheiro | PIX | Quitado | Saldo |
| --- | ---: | ---: | ---: | ---: |
| Primeira mensalidade | R$ 120 | R$ 0 | R$ 120 | R$ 0 |
| Segunda mensalidade | R$ 80 | R$ 40 | R$ 120 | R$ 0 |
| Total | R$ 200 | R$ 40 | R$ 240 | R$ 0 |

Essa é uma distribuição possível; a tela deve permitir conferir o destino dos valores antes de confirmar. O caixa registra somente R$ 240, separados por forma de pagamento, e as cobranças recebem a distribuição correspondente. O comprovante PIX pertence ao recebimento e pode ser consultado pelas cobranças vinculadas.

O registro deve ser atômico: recebimento, formas de pagamento e distribuição se confirmam juntos. Uma repetição por falha de conexão não cria nova entrada. As somas são conferidas no servidor em centavos.

### Parcial é diferente de desconto

Se uma mensalidade é R$ 120 e entram somente R$ 50, o requisito de pagamento parcial mantém **R$ 70 em aberto**. Uma negociação com desconto de R$ 70 é outra decisão: quita por R$ 50, exige permissão de recebimento e permite justificativa opcional.

**A opção atual de pagamento com desconto quita a cobrança; ela não implementa pagamento parcial.** Não usar essa opção para simular saldo remanescente.

Critérios de aceite: pagar várias competências em uma operação; combinar dinheiro e PIX; registrar parcial sem quitar; registrar complemento depois; apresentar saldo por competência; preservar a data de recebimento de adiantamentos; impedir recebimento duplicado e excesso de alocação; manter autor, comprovante e histórico de estorno. O comportamento para crédito excedente e estorno de parte de um recebimento também precisa ser definido.

## Histórico e retorno do atleta

O cadastro pessoal é permanente. A matrícula tem seu próprio ciclo de início, trancamento, cancelamento e retorno. Inadimplência é uma condição financeira e não deve apagar a pessoa nem criar automaticamente outro cadastro.

Cada mudança precisa guardar data efetiva, funcionário e motivo. A linha do tempo deve distinguir a data em que o evento aconteceu da data em que foi registrado. Retorno verifica turma, capacidade e condições atuais, mantendo os períodos anteriores e as mensalidades em aberto. A rotina de emissão futura respeita o período ativo.

Os eventos de auditoria atuais registram operador, data, entidade e nomes dos campos alterados; não constituem, por si só, um histórico completo de valores anteriores, motivos e períodos de matrícula. Não inventar datas antigas de cancelamento a partir do último `updated_at` do aluno.

## Regra do item 22 — interpretação para validação

Para a competência **setembro**, considerar esta leitura preliminar:

| Data efetiva do pagamento | Condição proposta |
| --- | --- |
| Até 10/09, inclusive | Valor com desconto |
| 11/09 a 30/09 | Valor cheio, sem desconto |
| A partir de 01/10, havendo saldo | Inadimplente |

O texto original inclui o dia 10 nos dois intervalos; esta proposta reserva o dia 10 para o desconto. Os marcos devem ser calculados no horário de Recife, inclusive em fevereiro e na virada do ano.

Esclarecimento recebido: no mês de entrada cobra-se a matrícula e a primeira mensalidade é do mês seguinte. Os valores são os acordados no cadastro; o desconto é assinalado na baixa com valor efetivo e justificativa opcional. Essa parte já foi implementada.

Pendências de definição para uma política automática por datas:

- Valor cheio e valor com desconto, por plano ou por matrícula.
- Matrícula em 03/08: agosto é cobrado, há proporcionalidade ou a primeira mensalidade é setembro?
- Encargos: quando começam, quais são e sobre qual saldo incidem. Não reutilizar automaticamente a multa atual no dia 11 se isso contrariar a política escolhida.
- Pagamento parcial antes do dia 10: mantém desconto sobre o saldo ou exige quitar integralmente até a data?
- A data que determina o desconto deve ser a do pagamento efetivo conferido, mesmo se o lançamento da secretaria ocorrer depois.

A marcação automática de inadimplência ainda segue o vencimento cadastrado. A atualização atual mantém o valor acordado nas telas e mensagens, sem acrescentar multa ou juros automaticamente na baixa. A mudança para inadimplência somente no mês seguinte continua sendo um requisito separado.

## Caixa e estornos

Desde 29/10/2026, há fechamento definitivo do caixa geral por dia, além da consulta dinâmica de cobranças pagas. A conferência exige os quatro valores contados, permite fundo inicial em dinheiro e registra diferenças por forma de pagamento, com justificativa obrigatória. A emissão considera o dia do recebimento em Recife, independentemente da competência da mensalidade.

A baixa ou estorno que afete um dia fechado é bloqueado por gatilhos no banco. Administrador ou secretaria reabre o dia com motivo; o fechamento anterior não é alterado e uma nova conferência gera outra versão. O documento preserva os recebimentos daquela versão e pode ser impresso. O histórico fica no Caixa diário e na Auditoria. O estorno corrige o recebimento original; devoluções físicas de dinheiro ainda precisam de um movimento próprio de saída.

Cada caixa terá identificador próprio, funcionário, conta financeira, abertura e fechamento. Abrir outro caixa não apaga ou substitui o anterior. Uma reabertura autorizada informa motivo, preserva o fechamento anterior e permite rastrear a nova conferência. O acerto de saldos entre caixas da mesma conta deve permanecer consistente.

Critérios de aceite: receber e estornar no mesmo dia; estornar em outro dia após fechamento; outro funcionário abrir novo caixa; reabrir o caixa anterior com permissão; consultar versões anteriores; conferir totais por dinheiro e PIX sem contar recebimentos estornados duas vezes.

## Fontes de verificação no projeto

- `app/financeiro/actions.ts`, `app/financeiro/financeiro-client.tsx` e `app/financeiro/manual-payment-dialog.tsx`: baixa por cobrança, divisão entre formas de pagamento, relatórios dinâmicos e desconto com justificativa opcional.
- `app/financeiro/calc.ts`: cálculo atual de atraso e encargos.
- `supabase/migrations/20261015014314_manual_payment_proofs.sql`: recebimento com comprovante e validação no banco.
- `supabase/migrations/20261015001433_secretaria_financial_operations.sql`: estorno autorizado e reabertura da cobrança.
- `supabase/migrations/20261015015218_automatic_monthly_billing.sql`: emissão automática, prevenção de duplicação e preservação de cobranças já emitidas.
- `app/alunos/actions.ts`, `app/alunos/student-status-toggle.tsx` e `supabase/migrations/20261014232026_authorized_school_operations.sql`: busca e ciclo atual de ativo/trancado.
- `app/alunos/novo/guardians-form-section.tsx`: pais, mães e demais responsáveis.
- `app/chamada/attendance-client.tsx`: chamada manual pelo treinador.
- `app/jogos/page.tsx` e `app/jogos/actions.ts`: cadastro de partidas e convocações.
- `app/uniformes/actions.ts`: estoque atual, sem venda integrada ou motivo específico de descarte.
- `tests/secretaria-access.sql`, `tests/payment-proofs.sql` e `tests/monthly-billing.sql`: verificações existentes de estorno, preservação de comprovantes e emissão sem duplicação.
