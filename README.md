# Dashboard Financeiro — JavaScript

Dashboard responsivo criado a partir da planilha `Financas_genericas.xlsx`, pronto para publicação no GitHub Pages.

## Recursos

- Filtros de **ano** e **mês** em botões, com multisseleção.
- Gráfico de linha com os **12 meses**, filtrável por **conta** e **ano**.
- Gráfico de barras comparando **renda total x gasto total**, atualizado pelos filtros de mês e ano.
- KPIs gerais de renda, gasto, saldo e meses positivos.
- Cards com a **média mensal de cada conta**, além de mínimo, máximo e participação média no gasto.
- Cards de contas filtrados por **ano**.
- Layout responsivo: uma coluna no mobile e composição ampla em desktop.
- Acessibilidade básica: botões nativos, `aria-pressed`, foco visível e respeito a `prefers-reduced-motion`.

## Arquivos

- `index.html` — estrutura do dashboard.
- `styles.css` — UI responsiva.
- `app.js` — filtros, cálculos e gráficos.
- `data.js` — dados extraídos da planilha original.
- `Financas_genericas.xlsx` — cópia da fonte usada para gerar os dados.

## Publicar no GitHub Pages

Envie todos os arquivos para a raiz do repositório e ative o GitHub Pages apontando para a branch principal (`main`) e a pasta raiz (`/`).

O dashboard usa Chart.js por CDN, então não exige build, npm ou servidor próprio.

## Regra dos filtros

- **KPIs gerais:** respondem a ano + mês.
- **Renda x gasto:** responde a ano + mês.
- **Gráfico de linha:** usa o filtro global de ano e o filtro próprio de contas; mantém sempre os 12 meses no eixo.
- **Média por conta:** responde ao filtro global de ano e considera todos os meses existentes nos anos selecionados.
