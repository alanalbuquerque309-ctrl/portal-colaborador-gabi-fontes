# Balão «Quem ditou o ritmo do Portal» — julho/2026

**Status:** aguardar publicação  
**Publicar em:** **31/07/2026** (último dia do mês). Não publicar antes.  
**Guardado em:** 24/07/2026 (rascunho + ranking provisório)

---

## Ideia do produto

Balão de destaque no Portal, no espírito do **aniversariante**: chama atenção de verdade.

- **Título / tema:** pessoas que ditam o ritmo da Cafeteria Gabi Fontes (no Portal).
- **Conteúdo:** os **5 primeiros da equipe** (geral das 3 lojas) + os **3 líderes**.
- **Tom:** significativo, sem exagero; deixa claro que muita gente boa não entrou só por ser menos participativa no Portal.
- **Efeito desejado:** quem não está na lista queira aparecer no próximo mês.

Referência de UI: balão/modal de aniversário (`AniversarioBalaoPortal`, `AniversarianteCard`).

---

## Texto aprovado (usar na publicação)

**Título sugerido:** Quem ditou o ritmo do Portal em julho

**Corpo:**

Esta galera ditou o ritmo do Portal em julho.

São os mais participativos do mês: mesmo sem obrigação, fizeram questão de contribuir. Isso importa para o crescimento da empresa e para fortalecer a cultura Gabi Fontes.

Obrigado pela participação.  
**Julho é de vocês. Parabéns!**

---

## Escopo do ranking

| Grupo | Quantidade | Quem entra |
|-------|------------|------------|
| Equipe | Top 5 | `role` colaborador nas 3 lojas: Barra, Mesquita, Nova Iguaçu |
| Liderança | Top 3 | gerente / master / RH nas mesmas 3 lojas |

**Fora do pódio (ou lista à parte):** sócio, admin, fábrica, administrativo.

### Sinais de participação (julho)

- Login / missões Grãos (`login_semana`)
- Confirmação de treinamentos
- Confirmação de comunicados
- Troféus entre pares (dados e recebidos)
- **Equipe:** avaliação de liderança + **elogios enviados**
- **Líderes:** avaliações da equipe feitas (`avaliacoes_diarias`)

Script de apoio (recalcular no dia 31):  
`scripts/_ranking-participacao-julho.mjs`

```powershell
cd "C:\Users\EU\Desktop\ALAN\ISA AI\ALAN.IA\Portal do Colaborador - Gabi Fontes"
node scripts/_ranking-participacao-julho.mjs
```

**Importante:** o ranking de 24/07 é **provisório**. No dia 31, **rodar de novo** antes de fixar os 8 nomes no balão.

---

## Ranking provisório (snapshot 24/07/2026)

Só referência. Pode mudar até o fechamento do mês.

### Top 5 equipe (provisório)

1. Andressa Paixão de Araújo · Nova Iguaçu  
2. Altair de Oliveira Ferreira · Mesquita  
3. Carolina Guilherme · Nova Iguaçu  
4. Thiago da Silva Lopes · Mesquita  
5. Letícia Fernandes Ramos · Nova Iguaçu  

### Top 3 liderança (provisório)

1. Nathalia Pereira Luna Alves · Nova Iguaçu  
2. Silvia Antunes Ferreira · Mesquita  
3. Joyce Azevedo da Cruz · Mesquita  

---

## Checklist no dia 31/07

1. Recalcular ranking com o script (mês completo).  
2. Confirmar os 8 nomes com o Alan.  
3. Implementar o balão (UI + quem vê + período de exibição).  
4. Publicar com o texto aprovado acima.  
5. Opcional: reconhecimento fora do Portal (grupo / briefing / café) na mesma semana.

---

## Fora do Portal (lembrete)

Mensagem do Alan, menção no briefing ou gesto leve (café/cartão) reforça o balão sem substituí-lo.
