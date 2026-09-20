# Interclasse

Site de inscrições por modalidade e turma, em português, responsivo. Os limites finais informados são usados: coletivos 10; vôlei de mesa 6; atletismo no total 4; tênis de mesa 4; dominó, truco, xadrez e damas 4; Torre Jenga 2; passa ou repassa 4; FIFA 2.

## Desenvolvimento

```sh
npm install
npm run dev
npm test
npm run build
```

## Supabase

Execute `supabase/schema.sql` no SQL Editor de um projeto Supabase. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` e na Vercel (produção e preview). A chave pode ser a anon legada ou a publishable key. Nunca use service_role no frontend.

O banco valida nomes, turmas e provas, impede duplicidade na mesma turma/modalidade e serializa inscrições com bloqueio transacional para respeitar a capacidade mesmo sob concorrência. A API pública retorna somente contagens; nomes completos ficam protegidos por RLS e podem ser consultados pela organização no painel Supabase. Inscrições são públicas e não exigem login; não há verificação de identidade do aluno.

## Publicação

```sh
npx vercel --prod --yes
```

Framework Vite; build `npm run build`; saída `dist`. Sem as variáveis, o site informa que a conexão está pendente e bloqueia inscrições, sem simular cadastros.

Os requisitos descrevem inscrições em equipes. Não foi adicionado voto separado nem limite de modalidades por aluno. Tênis de mesa tem coordenação a definir porque o nome não foi informado.
