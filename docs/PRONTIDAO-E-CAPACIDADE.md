# Escolinha do Sport — prontidão e capacidade da infraestrutura

Verificação em 15/10/2026. Código local e banco conectado `abqznplxpkgknzwuurce`. Consultas somente de leitura nesta análise. Não houve envio de mensagens, mudança de plano, publicação externa ou alteração de dados de atletas.

Atualização de orçamento: o usuário definiu a preferência por não ter gastos de infraestrutura. Seguir [a diretriz de operação sem nova mensalidade](INFRA-SEM-MENSALIDADE.md). O Pro citado ao final é uma alternativa futura, sem contratação prevista; o plano de trabalho passa a priorizar otimização e os recursos gratuitos existentes.

## Parecer

O sistema tem os módulos básicos, permissões, recebimentos auditados e automações preparados, mas a liberação integral ainda depende de infraestrutura, homologação operacional e requisitos funcionais restantes. Há condições para preparar um piloto controlado após os cuidados de implantação abaixo. Os testes automatizados não substituem uma conferência completa com secretaria e treinadores.

O plano gratuito não tem uma validade de 30, 90 ou 365 dias. O tempo depende do consumo, da continuidade dos serviços e das regras do provedor. Não há histórico de carga real suficiente para prometer meses de funcionamento ou número de pessoas simultâneas.

## O que foi verificado

| Item | Medição / situação |
| --- | --- |
| Banco `postgres` do aplicativo | 15.035.539 bytes, aproximadamente 15 MB |
| Soma com bancos internos `template0` e `template1` | 30.150.833 bytes, aproximadamente 30 MB |
| Tabelas da aplicação, incluindo índices | Aproximadamente 1,8 MB |
| Atletas / ativos | 3 / 3 |
| Contas da equipe / contas Auth | 4 / 4 |
| Cobranças / pagamentos registrados | 10 / 4 |
| Registros de chamada / auditoria | 10 / 62 |
| Arquivos cadastrados no Storage | 0, conforme metadados consultados |
| Fotos embutidas no banco | 0 hoje; o fluxo de novas fotos grava JPEG em Base64 no banco |
| Atletas ativos sem foto | 3; precisam completar a foto para gerar convocação personalizada |
| Contas ativas aguardando troca da senha temporária | 3 |
| Turmas ativas sem treinador ou com vínculo legado sem acesso ativo | 0 nas consultas realizadas |
| Cobranças com valor negativo ou pagas sem valor recebido | 0 nas consultas realizadas |
| Emissão mensal | Agendamento ativo, diariamente às 00h05 de Recife |
| WhatsApp | Rotina local com sinal recente; seis novas automações desativadas; fila vazia |

As medidas SQL são fotografias do momento e podem diferir dos indicadores diários e da média de faturamento do painel. A soma com bancos internos é uma referência conservadora de tamanho; não é uma leitura da fatura. O projeto respondeu como saudável, na região `us-west-2`. O conector consultado não informou o plano contratado nem o consumo mensal real de tráfego; os cenários abaixo consideram o Free informado pelo usuário. Não foram obtidos CPU, RAM, disco ou plano da VPS Oracle.

## Pendências antes da liberação completa

1. **Hospedagem permanente e domínio.** O servidor web e a rotina de mensagens estão no computador local. Publicar a versão atual, configurar HTTPS e `NEXT_PUBLIC_APP_URL`, manter os processos com reinício automático e testar após reiniciar o servidor. Os links familiares não podem apontar para `127.0.0.1` em produção.
2. **WhatsApp na VPS.** Instalar a rotina permanente, substituir o endereço temporário de túnel por um endereço estável e rotacionar a chave que já esteve no código antigo. Preservar a instância pareada. Depois de conferir a conexão, escolher as automações e horários na tela. Ainda não foi executado um teste real de entrega nesta validação.
3. **Backup e recuperação.** Configurar cópias externas do banco e dos arquivos privados, com retenção definida e restauração em ambiente isolado. Registrar responsáveis, perda de dados aceitável e tempo de recuperação. No Free, planejar exportações próprias; a documentação recomenda cópias externas. O backup do banco não inclui os arquivos do Storage. [Documentação de backups](https://supabase.com/docs/guides/platform/backups).
4. **Homologação e contas.** Conferir os cadastros, completar as fotos, usar contas individuais, concluir trocas de senhas e testar os cargos de administrador, secretaria, financeiro e treinador. Percorrer matrícula, baixa com duas formas de pagamento, comprovante real, estorno, chamada, convocação e portal. Não usar o desconto para representar pagamento parcial.
5. **Regras financeiras restantes.** As telas de atletas/financeiro ainda consideram a cobrança atrasada após o vencimento, enquanto a nova mensagem automática de débito começa no mês seguinte. Unificar a classificação com a regra acordada. A baixa continua por uma cobrança de cada vez; pagamento parcial com saldo e recebimento conjunto de várias competências ainda não foram implementados.
6. **Ciclo de matrícula, caixa e uniformes.** Completar histórico operacional de cancelamento/retorno no mesmo cadastro, sessões de abertura/fechamento/reabertura de caixa e venda de uniforme com pagamento, baixa de estoque e motivo dos ajustes. O relatório financeiro existente é dinâmico, sem fechamento definitivo de caixa. Se esses requisitos forem necessários desde o primeiro dia, são condições da liberação; o cliente deve homologar o alcance de um eventual piloto.
7. **Disponibilidade e acompanhamento.** Instalar monitoramento com alertas do site, banco, fila e VPS, além de alertas de capacidade. O endpoint atual verifica o servidor web. Não foi realizado teste de carga com o volume real da escolinha.

O advisor de segurança manteve os avisos já conhecidos: nove tabelas fechadas com RLS sem política, vinte funções privilegiadas autenticadas com verificações internas e a proteção de senhas vazadas não habilitada. Os dois primeiros grupos não equivalem automaticamente a acesso aberto: exigem análise das permissões e das guardas de cada objeto. A proteção gerenciada de senhas vazadas não está incluída no Free, conforme a tabela atual do provedor; a aplicação mantém composição de senha e troca obrigatória. Referências: [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [proteção de senha](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Limites do Supabase Free relevantes para este sistema

| Recurso | Franquia consultada |
| --- | --- |
| Banco de dados | 500 MB por projeto |
| Arquivos no Storage | 1 GB |
| Tráfego de saída sem cache | 5 GB por mês |
| Tráfego de arquivos servido com cache | Mais 5 GB por mês, em uma franquia separada |
| Auth | 50.000 usuários ativos por mês |
| Edge Functions | 500.000 invocações por mês |
| Computação | CPU compartilhada e até 0,5 GB de RAM |

Fontes: [planos e preços](https://supabase.com/pricing), [computação](https://supabase.com/docs/guides/platform/compute-and-disk), [tráfego](https://supabase.com/docs/guides/platform/manage-your-usage/egress). As franquias de arquivos/tráfego e outros itens podem ser compartilhadas por projetos da mesma organização; conferir o painel da organização antes de reservar toda a franquia para esta escola.

A franquia de Auth é de contas autenticadas, não de atletas cadastrados. O portal por link usa a função própria do sistema. Não há motivo, no volume atual, para considerar os quatro logins como o primeiro gargalo.

No Free, ultrapassar 500 MB de banco pode colocar as gravações em modo somente leitura. Projetos gratuitos também podem ser pausados após uma semana de inatividade e não incluem SLA de disponibilidade. O espaço ocupado cresce ao longo do tempo; a franquia mensal de tráfego é renovada. [Tamanho e restrições do banco](https://supabase.com/docs/guides/platform/database-size), [condições do plano](https://supabase.com/pricing).

## Quanto tempo: cenários de comprovantes

Hipóteses: zero arquivos no início, número constante de atletas, um comprovante por atleta todo mês, arquivo médio de **500 KB**, preservação dos arquivos anteriores e nenhuma outra utilização do mesmo Storage. Os comprovantes são opcionais no sistema; essa hipótese considera todos anexados. GB e KB nesta conta usam a aproximação decimal.

| Atletas | Arquivos novos / mês | Crescimento / mês | Tempo aproximado até ocupar 1 GB |
| ---: | ---: | ---: | ---: |
| 100 | 100 | 50 MB | 20 meses |
| 300 | 300 | 150 MB | 6–7 meses |
| 500 | 500 | 250 MB | 4 meses |

Fórmula: meses ≈ espaço disponível em MB ÷ (atletas × fração de pagamentos com comprovante × tamanho médio em MB).

**Essa é uma projeção de ocupação de arquivos, não uma garantia da duração do sistema inteiro.** Reservar margem e planejar a ampliação antes de chegar ao limite. Se apenas metade dos pagamentos tiver anexo, a projeção dobra; com arquivos de 1 MB, cai pela metade. Com 500 anexos de 3 MB, o volume já passa de 1 GB no primeiro mês. Outros arquivos e projetos reduzem o espaço disponível. O indicador de cobrança do Storage considera média ao longo do período, portanto a restrição de faturamento não precisa coincidir exatamente com o instante em que os objetos atingem 1 GB. [Medição de Storage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).

## O risco de tráfego antes de faltar espaço

`StudentPhotoUpload` reduz a imagem para até 480 pixels e produz JPEG. `updateStudentPhotoAction` e a matrícula salvam a imagem Base64 em `students.photo_url`. A listagem de atletas seleciona o cadastro completo, responsáveis, dados médicos, matrículas e cobranças, sem paginação no servidor. As fotos podem ser reenviadas junto com a lista, consumindo saída do banco a cada consulta. Gravar fotos em uma coluna não utiliza a franquia de arquivos: utiliza o banco e seu tráfego.

Exemplo ilustrativo: 300 fotos com **100 KB por campo Base64**, já contando sua codificação, acrescentam cerca de 30 MB ao conjunto de uma consulta completa antes da compressão de rede. Recarregar essa lista 200 vezes transfere aproximadamente 6 GB nesse modelo, sem os demais dados. O tráfego efetivamente cobrado depende da compressão e deve ser medido no painel. Não é uma medição da carga atual: os três atletas ainda não têm fotos.

Por isso, é possível atingir o tráfego mensal antes das projeções de anexos acima. As duas franquias de 5 GB não formam 10 GB livremente utilizáveis por consultas ao banco: o adicional com cache depende de servir arquivos com cache.

Antes de ampliar o uso, priorizar:

- Fotos em armazenamento com acesso adequado, guardando somente a referência no banco; conferir a privacidade dos atletas e adaptar a geração dos cards.
- Paginação e pesquisa no servidor; selecionar na lista somente os dados necessários e abrir detalhes sob demanda.
- Compressão de imagens de comprovantes e limites de tamanho compatíveis com o acervo, preservando os documentos necessários.
- Medir crescimento semanal de banco e arquivos, saída mensal e tempo das consultas. Registrar 30 dias de uso permite substituir hipóteses por uma projeção real.

Não apagar histórico de pagamentos, estornos ou comprovantes para caber no plano. Planejar ampliação ou arquivamento com preservação e acesso definidos.

## VPS Oracle e decisão de infraestrutura

O código não informa CPU, RAM e capacidade livre da VPS, e não há acesso administrativo a ela nesta sessão. Não foi possível verificar se é Always Free ou paga, a saúde dos containers ou a concorrência que suporta. O serviço de WhatsApp existente estava acessível nas consultas anteriores, mas isso não mede a capacidade de hospedar também o Next.js e a geração dos cards.

Se a conta usar Always Free, os recursos elegíveis não são apenas um teste de 30 dias, mas há regras de utilização e possibilidade de retomada de instâncias consideradas ociosas. A quantidade efetiva disponível deve ser conferida na conta e na região; não presumir uma configuração fixa da VM a partir do nome Oracle. [Regras oficiais Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

O Free pode servir a um piloto com volume monitorado e backup próprio. Para o funcionamento diário do financeiro, priorizar recuperação e disponibilidade antes de ocupar toda a franquia. O Supabase Pro consultado começa em **US$ 25/mês**, com cotas maiores e backups diários do banco com retenção de sete dias; custos adicionais dependem do uso. Backups dos arquivos e monitoramento continuam necessários. O Pro, por si só, não conclui os fluxos funcionais pendentes. [Preços atuais](https://supabase.com/pricing).

## Identidade visual corrigida

Removidas as referências à imagem antiga nos dois componentes de navegação. O rodapé do menu expandido/recolhido usa o escudo do Sport; a aba do navegador também recebe esse escudo. `public/logo.png` foi retirado da pasta pública, com cópia local fora da publicação. Identificadores internos de banco, contas e instância do WhatsApp foram preservados para manter os acessos existentes.
