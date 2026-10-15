# Preparação e publicação

## Entregue nesta versão

- Login com usuário ou e-mail, sessão verificada e troca obrigatória da senha temporária.
- Gestão completa de acessos pelo administrador; secretaria gerencia apenas acessos de treinadores. Revogação de sessões e proteção do último administrador.
- Permissões por cargo nas páginas, ações e banco. Nenhuma tabela pública concede leitura ou escrita ao papel anônimo.
- Treinador limitado a suas turmas e partidas; projeções específicas para evitar exposição de documentos e dados médicos.
- Recebimentos manuais com operação atômica, chave contra duplicação, encargos calculados no banco e histórico permanente de pagamentos e estornos.
- Comprovante opcional na baixa: PDF, JPG, PNG ou WebP de até 3 MB, Storage privado, consulta pelos cargos financeiros e preservação após estorno.
- Emissão automática mensal no banco, com conferência diária de faltantes, ajuste de vencimento em meses curtos e preservação das cobranças existentes ou canceladas.
- Comunicação com fila privada, registro de tentativas e operador, prevenção de repetição de chamadas/convocações, revisão de resultados incertos e preferências de avisos financeiros e de matrícula. Consulte `docs/WHATSAPP.md` para instalar a rotina permanente na VPS.
- Matrícula, conversão de experimental e convocação em transações. Estoque alterado de forma atômica.
- Portal por link revogável com expiração, resposta mínima e limitação de requisições. Códigos PIX demonstrativos e webhook de confirmação desativados.
- Credenciais privilegiadas restritas às Edge Functions; a aplicação Next.js utiliza a sessão do funcionário e a chave pública.
- Headers de proteção, páginas sem indexação, verificação automática no GitHub e endpoint `/api/health` sem dados privados.

## Estado da infraestrutura e pendências de liberação

O banco conectado é o projeto Supabase `abqznplxpkgknzwuurce`. As migrações de segurança e as funções `staff-admin` e `family-access` foram aplicadas nesse projeto. O servidor local usa essa base remota.

Consulte [a avaliação de prontidão e capacidade](PRONTIDAO-E-CAPACIDADE.md) para as medições atuais, requisitos operacionais ainda incompletos e projeções condicionais para o Supabase Free. A versão não deve ser tratada como liberação integral de todos os requisitos apenas porque compila e possui testes automatizados.

O aplicativo ainda precisa ser publicado no provedor de hospedagem e no domínio oficial. Esta entrega não representa uma publicação na Vercel ou alteração de domínio. A versão antiga publicada, se houver, precisa ser substituída: clientes anônimos antigos deixam de funcionar com as novas permissões.

Antes da abertura para uso real:

1. Configure as variáveis do `.env.example` no ambiente de produção, incluindo o domínio correto em `NEXT_PUBLIC_APP_URL`. Use HTTPS. Não adicione a chave `service_role` ao aplicativo.
2. Publique esta versão completa. Verifique login, troca obrigatória, um usuário de cada cargo, portal familiar e acesso negado sem sessão. Não restaure as antigas políticas abertas para corrigir falhas do aplicativo.
3. No Supabase Auth, confira a política mínima de senha em 8 caracteres com maiúsculas, minúsculas e números. A interface já exige essa composição. A proteção gerenciada de senhas vazadas não está incluída no Free conforme a tabela atual do provedor; habilite-a quando contratualmente disponível. Não se usa SMTP para estes acessos por usuário; redefinição é administrativa.
4. No Free, configure exportações próprias com cópia externa do banco. Em plano com backup gerenciado, confira retenção e recuperação disponíveis. Inclua uma cópia dos arquivos do bucket privado `payment-proofs`: o backup do banco não substitui a cópia dos arquivos do Storage. Realize e registre uma restauração em uma base isolada antes da liberação definitiva. Defina responsáveis e perda máxima de dados aceitável. **Não foi executado um teste completo de restauração nesta entrega.**
5. Configure monitoramento do endereço `/api/health`, alertas de erro da hospedagem e um responsável pelo atendimento. O endpoint existe, mas não foi conectado a um serviço externo de alertas. Ele verifica o servidor web; não atesta a saúde do banco.
6. Confira os cadastros preexistentes, valores, datas, autorização de imagem e atestados. Confirme a política de encargos. Distribua contas nominais e bloqueie as temporárias quando forem substituídas.
7. Para WhatsApp automático, configure um endereço estável e uma nova chave do provedor. Instale `npm run whatsapp:worker` como serviço permanente na VPS, com reinício automático e as variáveis privadas descritas em `docs/WHATSAPP.md`. A rotina está em execução apenas no computador local nesta entrega. Habilite os tipos e horários em Comunicação. Sem a rotina, chamadas e convocações continuam pelo servidor web, mas os avisos agendados não são processados.

## Configuração local

Use Node.js 24. Copie `.env.example` para `.env.local` e preencha a URL do projeto existente e a chave pública. Rode:

O sistema opera com uma única unidade na tela de turmas. Se houver unidades antigas no banco, defina `SCHOOL_UNIT_ID` com o ID da unidade utilizada pela escolinha; a nova turma recebe esse vínculo automaticamente. Na configuração local, o vínculo segue a unidade da turma já existente. Esse campo também deve ser configurado na hospedagem quando houver mais de uma unidade ativa no banco.

```text
npm ci
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

O endereço local é `http://127.0.0.1:3000/login`. `npm run dev` inicia o modo de desenvolvimento.

## Migrações e funções

As migrações desta entrega são incrementais sobre a base já existente. Os arquivos locais usam as versões registradas no histórico remoto. O histórico anterior de 2026-09-02 e alterações antigas fora de migrações não foram reconstruídos como instalação limpa. **Não execute estas migrações sobre um projeto vazio sem restaurar a estrutura anterior.** Para recriar uma base, use um backup completo verificado e depois as migrações posteriores ao backup.

As funções em `supabase/functions` usam o segredo interno do Supabase, sem copiar esse segredo para o Next.js. O gateway permite entrada nas funções, mas o corpo faz a autenticação: `staff-admin` verifica o usuário e seu perfil; `family-access` exige um token aleatório vigente e ativo. As tentativas possuem limites. O bootstrap inicial é de uso único e foi encerrado após a criação dos acessos.

Os identificadores de login da equipe ficam em `staff_profiles.username` e `staff_profiles.email`. O endereço apresentado como login pode ser um alias, como `admin@sport.com`; isso não cria uma caixa de e-mail. A função de login resolve pelo ID o endereço técnico no Supabase Auth antes de verificar a senha, preservando a identidade, a senha e o histórico quando um alias é alterado. Não sincronize esses aliases diretamente em `auth.users` por SQL. Os acessos iniciais continuam exigindo troca da senha temporária.

As funções SQL `SECURITY DEFINER` expostas são intencionais: conferem `auth.uid()`, sessão corrente, troca de senha concluída e cargo/vínculo, usam `search_path` fixo e não concedem execução anônima. Isso permite operações atômicas sem conceder escrita direta nas tabelas financeiras. O advisor sinaliza essa arquitetura para revisão; não se trata de autorização irrestrita.

As tabelas antigas de cantina e carteira, sem telas nesta versão, permanecem fechadas para usuários da aplicação. O aviso informativo de RLS sem política nessas tabelas e em `app_settings` reflete esse bloqueio intencional.

## Emissão automática de mensalidades

A migração `automatic_monthly_billing` habilita `pg_cron` e configura o job `acadgol-monthly-billing`. Ele executa `private.run_monthly_billing()` diariamente às **00h05 de Recife** (03h05 GMT, fuso do agendador). No primeiro dia, emite o novo mês; nos demais, reconcilia apenas os faltantes. O mês é calculado explicitamente em `America/Recife`. A tarefa independe do navegador e da hospedagem web; depende de o projeto Supabase estar ativo.

O worker e a rotina compartilhada têm execução restrita ao proprietário do banco. A API manual mantém a validação de sessão e cargo financeiro. A seleção considera atleta e matrícula ativos, início até o fim da referência, a primeira competência permitida (`first_billing_month`), mensalidade acordada e dia de vencimento, usando a matrícula ativa mais recente por atleta. Cobranças existentes, inclusive canceladas, impedem reemissão. O bloqueio por mês e a restrição de unicidade evitam duplicação entre execução manual e agendada.

Os resultados ficam em `private.monthly_billing_runs` (referência, quantidade criada e conclusão), restrita ao proprietário do banco, com RLS e sem políticas para usuários da aplicação. O aviso informativo de RLS sem política nessa tabela é intencional. Falhas ficam em `cron.job_run_details`. Confira a atividade do job e esses registros após restauração, pausa do projeto ou alteração da infraestrutura; não basta a página web estar disponível. Uma pausa que cubra um mês inteiro exige conferência manual desse período. Não altere `cron.job` diretamente: use as funções de agendamento do Cron.

## Verificação e limitações conhecidas

- `npm test`: 105 testes automatizados de ações, fila e resultados incertos do WhatsApp, permissões da Comunicação, conexão e QR, convocações, consentimento, imagens seguras, recebimentos, auditoria e histórico financeiro, anexos, downloads privados, virada de mês, gestão de planos, categorias e gestão e seleção de treinadores pela secretaria.
- `tests/whatsapp-outbox.sql`: verificação transacional no banco de duplicidade, concorrência, consentimento, operador, revisão de falhas, período silencioso, cobrança paga antes do disparo, aviso no mês seguinte, token da rotina e permissões. Os dados de teste são revertidos; nenhuma mensagem real é enviada.
- `tests/whatsapp-trials.sql`: confirmação e lembrete de aula experimental, autorização do responsável, cancelamento e mudança de horário, com rollback e sem disparos reais.
- `npx tsc --noEmit`, compilação de produção e ESLint sem erros. Há avisos de otimização de imagens existentes.
- `tests/database-access.sql`: executado com uma conta de verificação autenticada, com pagamentos, repetição de recebimento, estornos, matrícula válida/inválida, conversão de experimental, estoque, partidas e isolamento de cargos. Todas as alterações de teste fazem rollback. Requer uma conta de verificação criada para o ambiente; não remova a exigência de sessão para executar o teste.
- `tests/payment-proofs.sql`: verificação transacional de permissões de Storage, vínculo e metadados do arquivo, repetição sem duplicação, preservação após estorno e isolamento de treinadores. Usa metadados sintéticos e desfaz todas as alterações; não representa um teste de upload real pelo navegador.
- `tests/monthly-billing.sql`: executado com rollback para emissão automática sem sessão de funcionário, repetição, matrículas elegíveis, valor da matrícula mais recente, fevereiro comum/bissexto, preservação de pagamentos e cancelamentos, agenda diária e permissões da geração manual. A execução real pelo agendador também foi conferida com um job temporário que se encerra após executar.
- `tests/enrollment-photo.sql`: executado com rollback para validar foto obrigatória na nova matrícula, rejeição de URL externa não verificada, salvamento da foto, primeira cobrança e repetição sem duplicação.
- `node scripts/render-callup-preview.cjs`: gera prévias do próprio modelo de produção, com dados fictícios, foto ilustrativa, nome/local longos e foto pendente. As fontes Anton e Barlow e suas licenças ficam em `public/fonts`; mantenha esses arquivos na publicação. O card é gerado no servidor sem consultar o próprio domínio HTTP. Os testes de envio usam simulação; nenhuma mensagem real foi enviada nesta validação. O provedor de WhatsApp continua dependendo da configuração descrita acima.
- `npm audit --omit=dev`: nenhuma vulnerabilidade conhecida após as atualizações. A auditoria completa ainda aponta cinco ocorrências de severidade alta na cadeia de desenvolvimento de `braces` / ESLint, sem correção compatível disponível na verificação. Não foi aplicado downgrade forçado do Next.js para contornar esse aviso.
- A cópia anterior às alterações foi exportada e criptografada em `.local-backups`, com descriptografia conferida. Ela cobre linhas das tabelas públicas anteriores; não substitui backup completo de Auth, estrutura, Storage e funções. Guarde a chave de descriptografia separada do arquivo criptografado.
- A janela de acesso familiar é de 90 dias. A secretaria deve renovar links vencidos; não existe envio automático de renovação.

## Recuperação

O envio do comprovante ocorre antes da transação de recebimento. Se o arquivo for enviado e a transação falhar, pode permanecer um arquivo privado ainda sem vínculo. Uma nova tentativa com o mesmo arquivo e identificador reaproveita esse envio. Para manutenção, liste esses arquivos com credenciais administrativas, confira a ausência de vínculo em `invoice_payments.proof_path` e preserve uma margem de tempo para tentativas em andamento antes de remover órfãos. Faça remoções exclusivamente pela API de Storage; nunca apague apenas os metadados por SQL. A aplicação não permite sobrescrever ou apagar comprovantes.

Em caso de incidente, interrompa os recebimentos, preserve logs e consulte o último lançamento antes de qualquer repetição. Para um erro de recebimento use o estorno, sem apagar o histórico. Para exposição de um link familiar, suspenda ou renove o link. Para acesso indevido de funcionário, bloqueie o perfil e redefina a senha.

Se for necessário restaurar uma base, restaure primeiro em ambiente isolado, valide esquema, Auth, relacionamentos, contagens e amostras financeiras e só então planeje a troca da aplicação. Reimplante as funções da mesma versão e gere novos acessos ou links conforme o incidente. Não reabra acesso anônimo durante a recuperação.

## Matrícula, desconto e pagamento dividido

Primeira etapa de rastreabilidade financeira: `20261015041400_financial_invoice_history.sql` adiciona `actor_snapshot` imutável nos recebimentos e estornos, preenchido por gatilho com dados do perfil verificado. Os horários de registro usam o relógio do banco em cada inserção, separados da data efetiva do pagamento informada na baixa. A auditoria de novas cobranças guarda somente os campos financeiros necessários e a identificação do ator; os demais eventos mantêm seu formato anterior.

`invoice_financial_history` é uma entrada pública com `security invoker` para uma projeção privada protegida por perfil financeiro e sessão válida. A projeção retorna criação, recebimentos e estornos em páginas de até 50 eventos (a interface solicita 30), com dados mínimos dos operadores e metadados de comprovantes, sem caminhos do Storage ou acesso geral à equipe/auditoria. A política de leitura de `audit_events` continua restrita ao administrador. Não houve backfill de identidades em registros antigos: dados atuais de perfis são rotulados como atuais, e autoria não verificada permanece explícita.

`tests/invoice-history.sql` foi executado com rollback para conferir o ciclo criação/baixa/estorno/nova baixa, preservação após mudança de nome, usuário e cargo, descontos, divisão de pagamento, comprovantes, paginação, acesso dos três perfis financeiros e bloqueio a treinador/sessão inválida/anônimo. Os testes de baixa e comprovantes também foram repetidos após a migração. A auditoria dos demais módulos e o relatório consolidado por funcionário continuam previstos nas etapas seguintes.

A migração `20261015042447_financial_audit_tab.sql` centraliza os eventos financeiros na aba **Auditoria**, ao lado de **Relatórios**, com filtros por data de registro, responsável, atleta, operação e desconto. A projeção `private.financial_audit_entries` não tem acesso direto concedido aos usuários. Sua consulta ocorre pela função privada protegida `financial_audit_log`, através de uma entrada pública com `security invoker`, mantendo as permissões originais dos dados da equipe e da auditoria bruta. A lista usa paginação limitada e horários locais de Recife, preservando identidades históricas e metadados mínimos dos comprovantes. `tests/financial-audit.sql` verificou início e fim inclusivos dos dias de Recife, ordenação e paginação; o teste do histórico também cobre os filtros centrais e os bloqueios de acesso. Todas as operações de verificação foram revertidas.

O cadastro de turmas permite adicionar categorias etárias sem sair do formulário. A migração `20261015035721_create_age_categories.sql` libera somente inserção das colunas do catálogo para administrador e secretaria via RLS, com validação de faixa etária e unicidade de nome sem diferenciar maiúsculas. `tests/age-categories.sql` confirmou criação, vínculo com uma turma e bloqueios em uma transação com rollback. O diálogo usa um portal fora do formulário da turma e interrompe a propagação do envio, para evitar formulários aninhados e cadastro acidental da turma ao salvar a categoria.

Gestão do catálogo adicionada em `/planos` para administrador e secretaria. A migração `20261015034950_enrollment_plan_management.sql` concede somente inserção e edição das colunas do catálogo, protegidas por RLS com verificação de perfil e sessão; identidade, data de criação e exclusão permanecem bloqueadas. O gatilho de auditoria existente registra essas alterações. Os contratos e cobranças não são reescritos ao editar ou desativar um plano. `tests/enrollment-plans.sql` verificou as operações com rollback, inclusive planos inativos, permissões, valores e vencimentos em 1, 2, 3 e 31.

A migração `enrollment_discount_split_payments` preserva os registros anteriores e faz as novas matrículas criarem uma taxa de matrícula na referência de entrada, quando maior que zero, e a primeira mensalidade na referência seguinte. As cobranças são diferenciadas por `charge_type`. A unicidade considera atleta, referência e tipo de cobrança. A primeira competência dos contratos antigos mantém o comportamento histórico.

O recebimento continua atômico e protegido contra duplicação. `invoice_payments.payment_parts` registra de uma a quatro formas com valores positivos em centavos, sem repetição; a soma precisa coincidir com o recebido. A opção explícita de desconto calcula a diferença em relação ao valor original, com justificativa opcional. O relatório mantém o valor acordado, o recebido e cada forma separados. O estorno não apaga a distribuição original. O portal da família recebe somente o tipo da cobrança e os valores já autorizados, sem dados internos da auditoria.

`tests/billing-payments.sql` foi executado com rollback para conferir matrícula e mensalidade em referências distintas, repetição sem duplicar, validação de somas e casas decimais, desconto sem justificativa, dinheiro + PIX e preservação após estorno. `tests/split-payments.test.cjs` também verifica os totais diário, semanal e mensal e impede que um recebimento dividido seja todo contabilizado como PIX. O formulário atual recebe uma cobrança por baixa; recebimento conjunto de várias cobranças e pagamento parcial com saldo remanescente continuam pendentes.
