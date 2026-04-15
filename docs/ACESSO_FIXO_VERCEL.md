# Portal — link fixo para qualquer rede

O Portal do Colaborador (Next.js) em **produção na Vercel** tem um URL **HTTPS estável** (ex. `https://portal-colaborador-gabi-fontes.vercel.app` ou domínio que ligares ao projeto). **Não** depende da mesma Wi‑Fi do servidor nem de túnel que muda todos os dias.

**O que fazer (uma vez):** projeto ligado ao GitHub → deploy na Vercel → variáveis `NEXT_PUBLIC_*` e Supabase como no `.env` local → partilhar **só** o URL de produção com a equipa.

O PC em casa **não** precisa de estar ligado para o portal em Vercel funcionar; o Supabase é na cloud.
