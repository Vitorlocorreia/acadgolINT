# WhatsApp — diagnóstico e operação

Verificação em 15/10/2026, sem envio real de mensagens e sem desconectar o aparelho.

## Conexão encontrada

A Evolution API 2.3.7 da infraestrutura existente respondeu às consultas de leitura. A instância já pareada estava no estado `open`. O endereço temporário de acesso e a identificação da instância estavam no código anterior; o ambiente local atual só continha a configuração do Supabase e da unidade. A remoção dos dados fixos não havia sido acompanhada da transferência para as variáveis privadas, e o novo nome padrão de instância também diferia do identificador já pareado.

A ligação com a instância existente foi restaurada em `.env.local`, ignorado pelo Git. Endereço, chave e nome da instância não foram recolocados no código. O aplicativo precisa reiniciar para carregar alterações desse arquivo. Na publicação, essas mesmas configurações precisam existir no ambiente do servidor web que executa o sistema; a configuração do processo da Evolution na VPS é separada.

A conexão foi verificada com o cliente atualizado: configuração presente, estado `open` e aparelho identificado. Não foram executados envio, logout, exclusão ou novo pareamento como parte da verificação.

## Como cada envio funciona hoje

| Evento | Funcionamento atual | Configuração |
| --- | --- | --- |
| Falta no treino | Envia ao salvar se a opção da revisão estiver marcada. | Começa habilitada. Mesmo evento e telefone não são enviados novamente após aceitação. |
| Presença / check-in | Envia ao salvar se a equipe habilitar a opção. | Começa desmarcada. Proteção contra repetição compartilhada com o aviso individual. |
| Aviso individual de chamada | Registra a marcação e envia aos responsáveis habilitados. | Tentativas persistentes. Uma nova tentativa de envio não altera a chamada. |
| Convocação com imagem | Envia após anúncio individual ou em lote. Foto obrigatória. | Mantém as imagens já aceitas; falhas precisam de autorização no histórico. Alteração de dados do jogo gera uma nova versão do evento. |
| Lembrete de vencimento | Um aviso por mensalidade e telefone, no dia ou N dias antes do vencimento. | Desativado inicialmente. N configurável entre 0 e 15. |
| Mensalidade em aberto | Um aviso no primeiro dia do mês seguinte ao vencimento. | Desativado inicialmente. Não caracteriza inadimplência durante o próprio mês do vencimento. |
| Confirmação de aula experimental | Fila criada ao agendar ou alterar data, horário ou turma. | Desativada inicialmente. A secretaria marca a autorização do responsável no agendamento. |
| Lembrete de aula experimental | Um aviso na véspera, após o horário inicial configurado. | Desativado inicialmente. Cancelamento, alteração do agendamento e retirada da autorização suspendem a versão antiga. |
| Boas-vindas | Fila criada na transação de uma nova matrícula ativa. | Desativado inicialmente; não dispara retroativamente para matrículas existentes. |
| Recebimento | Confirmação do atleta, referência e valor efetivamente recebido, após a transação da baixa. | Desativado inicialmente; ignora importações antigas e cancela se houver estorno antes do envio. Recibo detalhado permanece no Financeiro. |

Os envios respeitam `receives_notifications`. A fila e as tentativas ficam em tabelas privadas, sem leitura direta pela API. Secretaria e administrador consultam uma projeção autorizada em Comunicação, com nome do operador, texto, datas, telefone mascarado, resultado e tentativas. Treinadores continuam limitados às próprias turmas e jogos; não acessam o histórico geral.

`accepted` confirma somente a aceitação pelo serviço, nunca entrega/leitura. Resultados desconhecidos, interrupções ou respostas sem identificador viram `uncertain`. Após cinco minutos, uma tentativa interrompida também exige revisão. Não há repetição cega após timeout. O operador precisa conferir a conversa para autorizar um novo envio. Retentativas e alterações das preferências ficam na auditoria. Links manuais `wa.me`, mensagens enviadas fora do sistema e o teste de conexão não alimentam este histórico.

Não é possível garantir entrega exatamente uma vez em uma API externa sem chave de idempotência do provedor: a reserva no banco evita concorrência e repetições do aplicativo, e os casos sem confirmação exigem revisão humana. Erros de registro antes do disparo impedem o envio; erro de registro após o disparo mantém o aviso bloqueado para conferência.

## Rotina em segundo plano

`scripts/whatsapp-worker.mjs` funciona independentemente do navegador e do processo Next.js. Consulta o banco a cada 15 segundos quando não há mensagens e registra um sinal de atividade. A tela sinaliza ausência de atividade após dois minutos. Antes de iniciar cada envio, confere consentimento, telefone atual, matrícula, estado da cobrança, eventuais estornos e opção habilitada. Para experimentais, confere também a versão e o estado do agendamento; permite atleta experimental, sem exigir matrícula definitiva. Os horários usam America/Recife: início configurável entre 8h e 18h, encerramento às 20h. Avisos de vencimento/aberto expiram no fim do dia; boas-vindas e recebimentos em dois dias; avisos experimentais no início da aula. Não recupera cobranças de dias anteriores indiscriminadamente.

O token exclusivo `WHATSAPP_WORKER_TOKEN` tem 256 bits e fica somente no ambiente privado. O banco armazena seu SHA-256 em `private.whatsapp_workers`; a capacidade só permite retirar avisos automáticos já preparados e registrar seus resultados. Não concede acesso geral às tabelas, configuração ou funções administrativas. A aplicação não recebe uma chave Supabase privilegiada. Para revogar o processo, marque seu registro `active=false`; para rotacionar, substitua o hash e o token privado juntos. Não use um token curto nem prefixo `NEXT_PUBLIC_`.

Neste computador a rotina foi registrada e iniciada, com todas as novas opções desativadas e fila vazia. Nenhuma mensagem real foi enviada nos testes. Para iniciar novamente:

```text
npm run whatsapp:worker
```

Para produção na Oracle, instale o código e dependências com Node.js 24, transfira as variáveis privadas para `/etc/sport-whatsapp.env` e registre a rotina como serviço permanente com reinício automático. O modelo em `docs/whatsapp-worker.service.example` pressupõe código em `/opt/sport` e usuário de serviço `sport`; ajuste os caminhos ao servidor real. Proteja o arquivo de ambiente para leitura apenas pelo usuário do serviço/administrador. Confira o sinal de atividade em Comunicação antes de habilitar os avisos. A instalação permanente na VPS ainda não foi executada nesta entrega, pois não há acesso SSH ao servidor neste ambiente.

Variáveis necessárias: URL e chave pública do Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou a chave anônima existente), `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` e `WHATSAPP_WORKER_TOKEN`. Preserve o nome da instância já pareada. Reinicie os processos após alterar o ambiente. O banco, a fila e as permissões já foram aplicados no projeto conectado.

Verificações: 105 testes automatizados de aplicação; `tests/whatsapp-outbox.sql` verifica a fila, horários, pagamentos antes do disparo, mês seguinte, deduplicação, consentimento, operador e permissões. `tests/whatsapp-trials.sql` verifica confirmação, lembrete, autorização, cancelamento e mudança de agendamento. Ambas as verificações usam rollback integral. Não houve teste de entrega real nem confirmação de leitura.

## Correções no fluxo de conexão

- Estados distintos para configuração ausente, endereço inválido, chave recusada, instância inexistente, serviço indisponível e pareamento em preparação.
- A interface apresenta a causa retornada pelo servidor e identifica quando o aparelho já está conectado.
- A geração de QR consulta a instância existente antes de criar outra. Uma conexão aberta não é reiniciada nem desconectada.
- O QR retornado na criação é utilizado; respostas diretas e dentro de `qrcode` são reconhecidas. Se o serviço fornecer somente o texto do QR, a imagem é gerada localmente, sem enviá-lo a outro site.
- O tempo de criação permite a preparação do QR no provedor. A chave global não é copiada para o corpo de criação da instância.
- Uma falha de logout não exclui automaticamente a instância e não é informada como sucesso.
- As respostas de erro não reproduzem o corpo bruto do provedor, que pode conter dados internos.

## Próximos cuidados da infraestrutura

O serviço existente usa um endereço temporário de túnel. Antes da produção, configure um endereço estável para a VPS e mantenha uma verificação de disponibilidade. A chave antiga já esteve fixa no código: deve ser rotacionada na VPS e atualizada no ambiente privado dos clientes que a utilizam. A verificação não alterou a chave do servidor nem a sessão do aparelho.

Ainda faltam os webhooks autenticados do provedor para acompanhar entrega e leitura. A confirmação de aceitação, o histórico e a revisão de falhas já estão implementados. A instalação permanente na VPS, o endereço estável e a rotação da chave continuam como tarefas de infraestrutura.

Referência técnica: [controlador oficial de instâncias da Evolution API](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/controllers/instance.controller.ts).
