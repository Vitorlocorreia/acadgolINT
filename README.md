# Escolinha do Sport — Sport Club do Recife

Sistema de gestão da escolinha: atletas, matrículas, turmas, presença, jogos, recebimentos manuais e portal da família.

Veja [o manual da equipe](docs/MANUAL-DA-EQUIPE.md) e [a configuração e liberação de produção](docs/PRODUCAO.md).

## Desenvolvimento

Node.js 24, Next.js 16 e Supabase. Configure `.env.local` a partir de `.env.example`, usando a base existente, e execute `npm ci` e `npm run dev`. A tela inicial é `/login`.

## Verificações

```text
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev
```

Senhas temporárias e cópias de segurança locais ficam fora do Git. Não compartilhe chaves privilegiadas ou arquivos privados de acesso no repositório.
