(() => {
  'use strict';

  const rawData = Array.isArray(window.FINANCE_DATA) ? window.FINANCE_DATA : [];
  if (!rawData.length) {
    document.body.innerHTML = '<main style="padding:40px;font-family:sans-serif"><h1>Não foi possível carregar os dados.</h1><p>Verifique se o arquivo data.js está na mesma pasta do index.html.</p></main>';
    return;
  }

  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];
  const monthShort = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const expenseAccounts = ['Aluguel','Condomínio','Luz','Gás','Internet','Cartão','Comida/Lazer'];
  const lineMetrics = [...expenseAccounts, 'Total Gasto'];
  const years = [...new Set(rawData.map(d => Number(d.Ano)))].sort((a,b) => a-b);

  const accountColors = {
    'Aluguel': '#6c63ff',
    'Condomínio': '#4f7cff',
    'Luz': '#f59e0b',
    'Gás': '#e76f51',
    'Internet': '#2a9d8f',
    'Cartão': '#d65db1',
    'Comida/Lazer': '#ef6f6c',
    'Total Gasto': '#111827'
  };

  const state = {
    years: new Set(years),
    months: new Set(months),
    lineAccounts: new Set(['Total Gasto'])
  };

  const fmtBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  const fmtBRL1 = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 1
  });
  const fmtPct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

  const $ = id => document.getElementById(id);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lineChart;
  let barChart;

  const safeNumber = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const incomeOf = d => safeNumber(d.Renda) + safeNumber(d.Renda2);
  const sum = (arr, fn) => arr.reduce((acc, item) => acc + fn(item), 0);
  const mean = values => values.length ? values.reduce((a,b) => a+b, 0) / values.length : 0;

  function createChip(label, pressed, onClick, extraClass = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-chip ${extraClass}`.trim();
    btn.textContent = label;
    btn.setAttribute('aria-pressed', String(pressed));
    btn.addEventListener('click', onClick);
    return btn;
  }

  function toggleSetValue(set, value, universe) {
    if (set.has(value)) {
      if (set.size === 1) return;
      set.delete(value);
    } else {
      set.add(value);
    }
    if (set.size > universe.length) {
      set.clear(); universe.forEach(v => set.add(v));
    }
  }

  function selectAll(set, universe) {
    set.clear();
    universe.forEach(v => set.add(v));
  }

  function renderPeriodFilters() {
    const yearWrap = $('yearFilters');
    yearWrap.innerHTML = '';
    const allYears = state.years.size === years.length;
    yearWrap.appendChild(createChip('Todos', allYears, () => {
      selectAll(state.years, years);
      updateAll();
    }, 'all-chip'));

    years.forEach(year => {
      yearWrap.appendChild(createChip(String(year), state.years.has(year), () => {
        toggleSetValue(state.years, year, years);
        updateAll();
      }));
    });

    const monthWrap = $('monthFilters');
    monthWrap.innerHTML = '';
    const allMonths = state.months.size === months.length;
    monthWrap.appendChild(createChip('Todos', allMonths, () => {
      selectAll(state.months, months);
      updateAll();
    }, 'all-chip'));

    months.forEach((month, idx) => {
      monthWrap.appendChild(createChip(monthShort[idx], state.months.has(month), () => {
        toggleSetValue(state.months, month, months);
        updateAll();
      }));
    });
  }

  function renderAccountFilters() {
    const wrap = $('accountFilters');
    wrap.innerHTML = '';

    lineMetrics.forEach(account => {
      const btn = createChip(account === 'Total Gasto' ? 'Total gasto' : account, state.lineAccounts.has(account), () => {
        toggleSetValue(state.lineAccounts, account, lineMetrics);
        updateAll();
      });
      btn.style.setProperty('--chip-account', accountColors[account]);
      wrap.appendChild(btn);
    });

    $('accountSelectionText').textContent = `${state.lineAccounts.size} ${state.lineAccounts.size === 1 ? 'série selecionada' : 'séries selecionadas'}`;
  }

  function periodData() {
    return rawData.filter(d => state.years.has(Number(d.Ano)) && state.months.has(d.Mês));
  }

  function yearOnlyData() {
    return rawData.filter(d => state.years.has(Number(d.Ano)));
  }

  function updateSelectionSummary() {
    const yearText = state.years.size === years.length ? 'todos os anos' : `${state.years.size} ano${state.years.size > 1 ? 's' : ''}`;
    const monthText = state.months.size === months.length ? 'todos os meses' : `${state.months.size} mês${state.months.size > 1 ? 'es' : ''}`;
    $('selectionSummary').textContent = `${yearText} • ${monthText}`;
  }

  function summaryCardHTML(label, value, meta, symbol, tone) {
    const tones = {
      purple: ['#efedff','#6c63ff','rgba(108,99,255,.09)'],
      green: ['#e8f8f2','#0e9f6e','rgba(14,159,110,.08)'],
      red: ['#fff0f1','#e34d59','rgba(227,77,89,.08)'],
      blue: ['#eaf2ff','#3b82f6','rgba(59,130,246,.08)']
    };
    const [bg, color, glow] = tones[tone];
    return `
      <article class="summary-card" style="--icon-bg:${bg};--icon-color:${color};--card-glow:${glow}">
        <div class="card-topline">
          <span class="card-label">${label}</span>
          <span class="card-icon" aria-hidden="true">${symbol}</span>
        </div>
        <div class="card-value">${value}</div>
        <div class="card-meta">${meta}</div>
      </article>`;
  }

  function updateSummaryKpis() {
    const data = periodData();
    const totalIncome = sum(data, incomeOf);
    const totalExpense = sum(data, d => safeNumber(d['Total Gasto']));
    const totalBalance = totalIncome - totalExpense;
    const positiveMonths = data.filter(d => safeNumber(d.Balança) > 0).length;
    const positiveRate = data.length ? positiveMonths / data.length : 0;

    $('summaryKpis').innerHTML = [
      summaryCardHTML('Renda total', fmtBRL.format(totalIncome), `${data.length} registros no período`, '↗', 'green'),
      summaryCardHTML('Gasto total', fmtBRL.format(totalExpense), `Média de ${fmtBRL.format(data.length ? totalExpense / data.length : 0)} por mês`, '↘', 'red'),
      summaryCardHTML('Saldo acumulado', fmtBRL.format(totalBalance), totalBalance >= 0 ? 'Período com saldo agregado positivo' : 'Período com saldo agregado negativo', totalBalance >= 0 ? '+' : '−', totalBalance >= 0 ? 'blue' : 'red'),
      summaryCardHTML('Meses positivos', fmtPct.format(positiveRate), `${positiveMonths} de ${data.length} registros`, '✓', 'purple')
    ].join('');
  }

  function updateAccountKpis() {
    const data = yearOnlyData();
    const totalExpenseAvg = mean(data.map(d => safeNumber(d['Total Gasto'])));

    $('accountKpis').innerHTML = expenseAccounts.map(account => {
      const values = data.map(d => safeNumber(d[account]));
      const avg = mean(values);
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const share = totalExpenseAvg ? avg / totalExpenseAvg : 0;
      return `
        <article class="account-card" style="--account-color:${accountColors[account]}">
          <div class="account-card-head">
            <span class="account-name">${account}</span>
            <span class="account-dot" aria-hidden="true"></span>
          </div>
          <div class="account-average">${fmtBRL1.format(avg)}</div>
          <div class="account-caption">média mensal nos anos selecionados</div>
          <div class="account-mini-grid">
            <div><span>Mín.</span><strong>${fmtBRL.format(min)}</strong></div>
            <div><span>Máx.</span><strong>${fmtBRL.format(max)}</strong></div>
            <div><span>Do gasto</span><strong>${fmtPct.format(share)}</strong></div>
          </div>
        </article>`;
    }).join('');
  }

  function yearDash(year) {
    const idx = years.indexOf(year);
    return [[], [8,5], [3,4], [10,4,2,4], [2,3]][idx % 5];
  }

  function hexToRgba(hex, alpha) {
    const raw = hex.replace('#','');
    const num = parseInt(raw.length === 3 ? raw.split('').map(c => c+c).join('') : raw, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function buildLineDatasets() {
    const selectedYears = years.filter(y => state.years.has(y));
    const selectedAccounts = lineMetrics.filter(a => state.lineAccounts.has(a));
    const singleYear = selectedYears.length === 1;

    return selectedAccounts.flatMap(account => selectedYears.map(year => {
      const values = months.map(month => {
        const row = rawData.find(d => Number(d.Ano) === year && d.Mês === month);
        return row ? safeNumber(row[account]) : null;
      });
      const base = accountColors[account];
      return {
        label: singleYear ? account : `${account} · ${year}`,
        data: values,
        borderColor: base,
        backgroundColor: hexToRgba(base, .10),
        pointBackgroundColor: '#ffffff',
        pointBorderColor: base,
        pointBorderWidth: 2,
        pointRadius: 2.8,
        pointHoverRadius: 5,
        borderWidth: account === 'Total Gasto' ? 3 : 2.2,
        borderDash: singleYear ? [] : yearDash(year),
        tension: .34,
        spanGaps: false
      };
    }));
  }

  function commonTooltip() {
    return {
      backgroundColor: '#0b1220',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      padding: 12,
      cornerRadius: 10,
      displayColors: true,
      callbacks: {
        label: ctx => `${ctx.dataset.label}: ${fmtBRL.format(ctx.parsed.y ?? ctx.parsed)}`
      }
    };
  }

  function updateLineChart() {
    const ctx = $('lineChart');
    const datasets = buildLineDatasets();

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
      type: 'line',
      data: { labels: monthShort, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 420 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 8, right: 8, bottom: 0, left: 0 } },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'start',
            labels: {
              color: '#667085',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 7,
              boxHeight: 7,
              padding: 16,
              font: { size: 11, weight: '600' }
            }
          },
          tooltip: commonTooltip()
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#7b8495', font: { size: 11, weight: '600' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148,163,184,.16)', drawTicks: false },
            border: { display: false },
            ticks: {
              color: '#7b8495',
              padding: 9,
              font: { size: 10 },
              callback: value => value >= 1000 ? `R$ ${(value/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mil` : `R$ ${value}`
            }
          }
        }
      }
    });
  }

  const barValueLabels = {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillStyle = '#344054';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const value = chart.data.datasets[0].data[i];
        ctx.fillText(fmtBRL.format(value), bar.x, Math.max(14, bar.y - 8));
      });
      ctx.restore();
    }
  };

  function updateBarChart() {
    const data = periodData();
    const totalIncome = sum(data, incomeOf);
    const totalExpense = sum(data, d => safeNumber(d['Total Gasto']));
    const difference = totalIncome - totalExpense;
    const ratio = totalIncome ? totalExpense / totalIncome : 0;

    $('barDifference').textContent = fmtBRL.format(difference);
    $('barDifference').style.color = difference >= 0 ? '#0e9f6e' : '#e34d59';
    $('expenseRatio').textContent = fmtPct.format(ratio);

    if (barChart) barChart.destroy();
    barChart = new Chart($('barChart'), {
      type: 'bar',
      data: {
        labels: ['Renda', 'Gasto'],
        datasets: [{
          data: [totalIncome, totalExpense],
          backgroundColor: ['#2e7d6f', '#f07b6a'],
          hoverBackgroundColor: ['#266d61', '#dd6959'],
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 86
        }]
      },
      plugins: [barValueLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 420 },
        layout: { padding: { top: 34, right: 6, left: 6 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...commonTooltip(),
            callbacks: { label: ctx => fmtBRL.format(ctx.parsed.y) }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#667085', font: { size: 12, weight: '700' } }
          },
          y: {
            beginAtZero: true,
            grace: '14%',
            grid: { color: 'rgba(148,163,184,.16)', drawTicks: false },
            border: { display: false },
            ticks: {
              color: '#7b8495',
              padding: 8,
              font: { size: 10 },
              callback: value => value >= 1000 ? `R$ ${(value/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})} mil` : `R$ ${value}`
            }
          }
        }
      }
    });
  }

  function updateMeta() {
    const sorted = [...rawData].sort((a,b) => Number(a.Ano)-Number(b.Ano) || months.indexOf(a.Mês)-months.indexOf(b.Mês));
    const last = sorted.at(-1);
    $('lastUpdate').textContent = `Até ${monthShort[months.indexOf(last.Mês)]}/${last.Ano}`;
    $('recordCount').textContent = `${rawData.length} registros mensais`;
  }

  function updateAll() {
    renderPeriodFilters();
    renderAccountFilters();
    updateSelectionSummary();
    updateSummaryKpis();
    updateAccountKpis();
    updateLineChart();
    updateBarChart();
  }

  $('resetFilters').addEventListener('click', () => {
    selectAll(state.years, years);
    selectAll(state.months, months);
    state.lineAccounts = new Set(['Total Gasto']);
    updateAll();
  });

  updateMeta();
  updateAll();
})();
