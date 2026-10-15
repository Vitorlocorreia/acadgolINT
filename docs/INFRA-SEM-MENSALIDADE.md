# Diretriz: operar sem nova mensalidade de infraestrutura

Preferência informada pelo usuário em 15/10/2026: evitar gastos de infraestrutura. Não contratar plano pago, domínio ou serviço adicional sem solicitação explícita. A recomendação anterior de considerar o Supabase Pro passa a ser uma alternativa futura, sem contratação prevista.

## Arquitetura proposta

| Parte | Recurso a aproveitar | Condição |
| --- | --- | --- |
| Cadastros, financeiro, auditoria e login | Supabase Free existente | Permanecer dentro das franquias e medir crescimento |
| Site e rotina de mensagens | VPS Oracle existente | Confirmar modalidade gratuita, CPU, memória e espaço livre antes de instalar |
| Fotos e comprovantes | Inicialmente otimizar os arquivos atuais; preparar armazenamento privado na VPS se houver capacidade | Não mover documentos antes de implementar autorização, referências e cópia de segurança |
| Endereço público | Subdomínio gratuito ou subdomínio já disponível do clube | HTTPS e endereço estável; o túnel temporário atual não é o endereço definitivo |
| Recuperação de dados | Cópia externa do banco e dos arquivos em outro equipamento já disponível | Automatizar, proteger, conferir execução e testar restauração |

Não está prevista a instalação de uma segunda plataforma de banco nesta etapa. Manter o Supabase evita reconstruir autenticação, permissões e funções existentes. A VPS continua um recurso compartilhado com o WhatsApp; geração de cards e processos do site precisam caber na memória real disponível.

## Prioridades para reduzir consumo

1. Paginar e pesquisar no servidor, carregando somente os dados necessários na listagem.
2. Substituir fotos Base64 dentro dos cadastros por referências a arquivos com acesso adequado. Adaptar a geração dos cards e o portal antes de mudar o formato persistido.
3. Comprimir imagens de comprovantes sem prejudicar sua leitura. PDFs e documentos necessários continuam preservados; desconto e histórico não são apagados para economizar espaço.
4. Se o Storage Free passar a ser o limite, usar espaço já disponível na VPS para documentos privados, após confirmar a capacidade, instalar acesso autorizado e incluir todos os arquivos no backup externo.
5. Medir banco, arquivos, tráfego e memória, e avisar antes de chegar aos limites. Medir o uso real por 30 dias para calcular uma previsão de capacidade.
6. Manter serviços com reinício automático, verificar disponibilidade e testar recuperação após reiniciar a VPS.

## Condições e limites

Meta de custo recorrente adicional: **R$ 0**, condicionada à elegibilidade e capacidade dos recursos existentes. Não é garantia de gratuidade ou disponibilidade permanente. A conta e o consumo real da Oracle ainda não foram inspecionados; não há configuração SSH disponível nesta sessão.

No Supabase Free não há contratação automática do Pro; excesso de consumo pode gerar restrições. O banco tem limite de 500 MB e as franquias de arquivos e tráfego continuam aplicáveis. [Plano e limites](https://supabase.com/pricing), [controle de custos](https://supabase.com/docs/guides/platform/cost-control).

Recursos Oracle elegíveis como Always Free permanecem sujeitos às regras do provedor, inclusive retomada de instâncias consideradas ociosas. Não presumir que a VPS existente está enquadrada nessa modalidade. [Regras Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

O Free requer uma estratégia própria de exportações e cópias externas. O backup do banco não contém os arquivos do Storage. Guardar o único backup na própria VPS deixa site, arquivos e cópia expostos à mesma falha. [Backups do Supabase](https://supabase.com/docs/guides/platform/backups).

Este documento registra a arquitetura e a restrição de orçamento. Não representa instalação na VPS, mudança do armazenamento, configuração de DNS ou backup já executado. As pendências funcionais e os testes operacionais descritos em `PRONTIDAO-E-CAPACIDADE.md` continuam necessários para a liberação do sistema.
