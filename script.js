const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CONTAS=[
 {k:"aluguel",n:"Aluguel",c:"#e5484d",tipo:"despesa"},
 {k:"condominio",n:"Condomínio",c:"#f2994a",tipo:"despesa"},
 {k:"luz",n:"Luz",c:"#f2c94c",tipo:"despesa"},
 {k:"gas",n:"Gás",c:"#56ccf2",tipo:"despesa"},
 {k:"internet",n:"Internet",c:"#3559e0",tipo:"despesa"},
 {k:"cartao",n:"Cartão",c:"#8b5cf6",tipo:"despesa"},
 {k:"lazer",n:"Comida/Lazer",c:"#ec4899",tipo:"despesa"},
 {k:"renda",n:"Renda",c:"#1a9e6e",tipo:"receita"},
 {k:"quintino",n:"Quintino",c:"#0d9488",tipo:"receita"}
];
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});

let DATA=[];
let selYears=new Set(), selMonths=new Set(MESES);
let cSaldo,cContas,cPizza;

function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function num(v){const n=Number(v);return isFinite(n)?n:0;}

function parseWorkbook(ab){
  const wb=XLSX.read(ab,{type:'array'});
  const sheet=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null});
  const header=rows[0]||[];
  const idx={};
  header.forEach((h,i)=>{
    const n=norm(h);
    if(!n) return;
    if(idx.mes===undefined&&n.includes('mes')) idx.mes=i;
    else if(idx.ano===undefined&&n.includes('ano')) idx.ano=i;
    else if(idx.aluguel===undefined&&n.includes('aluguel')) idx.aluguel=i;
    else if(idx.condominio===undefined&&n.includes('condomin')) idx.condominio=i;
    else if(idx.luz===undefined&&n==='luz') idx.luz=i;
    else if(idx.gas===undefined&&n.includes('gas')) idx.gas=i;
    else if(idx.internet===undefined&&n.includes('internet')) idx.internet=i;
    else if(idx.cartao===undefined&&n.includes('cart')) idx.cartao=i;
    else if(idx.lazer===undefined&&(n.includes('comida')||n.includes('lazer'))) idx.lazer=i;
    else if(idx.renda===undefined&&n.includes('renda')) idx.renda=i;
    else if(idx.quintino===undefined&&n.includes('quintino')) idx.quintino=i;
  });
  const despesaKeys=['aluguel','condominio','luz','gas','internet','cartao','lazer'];
  const out=[];
  for(let r=1;r<rows.length;r++){
    const row=rows[r];
    if(!row||idx.mes===undefined||row[idx.mes]==null||row[idx.mes]==='') continue;
    const raw=String(row[idx.mes]).trim();
    const mes=raw.charAt(0).toUpperCase()+raw.slice(1).toLowerCase();
    const rec={mes, ano: idx.ano!==undefined?num(row[idx.ano]):null};
    despesaKeys.forEach(k=>{rec[k]=idx[k]!==undefined?num(row[idx[k]]):0;});
    rec.renda=idx.renda!==undefined?num(row[idx.renda]):0;
    rec.quintino=idx.quintino!==undefined?num(row[idx.quintino]):0;
    rec.totalGasto=despesaKeys.reduce((s,k)=>s+rec[k],0);
    rec.saldo=rec.renda+rec.quintino-rec.totalGasto;
    out.push(rec);
  }
  return out;
}

function setStatus(msg){document.getElementById('statusMsg').textContent=msg;}

function loadData(ab,label){
  try{
    const parsed=parseWorkbook(ab);
    if(!parsed.length){setStatus('A planilha foi lida, mas nenhuma linha válida foi encontrada (confira se há colunas "Mês" e "Ano").');return;}
    DATA=parsed;
    setStatus('Dados carregados de '+label+' — '+DATA.length+' meses.');
    initFilters();
    render();
  }catch(e){
    console.error(e);
    setStatus('Não foi possível ler essa planilha: '+e.message);
  }
}

function initFilters(){
  const years=[...new Set(DATA.map(r=>r.ano).filter(y=>y!=null))].sort((a,b)=>a-b);
  selYears=new Set(years.includes(2026)?[2026]:years);
  selMonths=new Set(MESES);
  const yearChips=document.getElementById('yearChips');
  yearChips.innerHTML='';
  years.forEach(y=>{
    const b=document.createElement('button');b.type='button';b.className='chip'+(selYears.has(y)?' active':'');b.textContent=y;
    b.onclick=()=>{if(selYears.has(y)){selYears.delete(y);b.classList.remove('active')}else{selYears.add(y);b.classList.add('active')}render()};
    yearChips.appendChild(b);
  });
  const monthChips=document.getElementById('monthChips');
  monthChips.innerHTML='';
  MESES.forEach(m=>{
    const b=document.createElement('button');b.type='button';b.className='chip active';b.textContent=m;
    b.onclick=()=>{if(selMonths.has(m)){selMonths.delete(m);b.classList.remove('active')}else{selMonths.add(m);b.classList.add('active')}render()};
    monthChips.appendChild(b);
  });
}

function getFiltered(){
  return DATA.filter(r=>selYears.has(r.ano)&&selMonths.has(r.mes))
    .sort((a,b)=>a.ano-b.ano||MESES.indexOf(a.mes)-MESES.indexOf(b.mes));
}

function render(){
  const f=getFiltered();
  const kpisEl=document.getElementById('kpis');
  if(!f.length){
    kpisEl.innerHTML='<div class="empty">Nenhum dado para os filtros selecionados</div>';
    [cSaldo,cContas,cPizza].forEach(c=>c&&c.destroy());
    return;
  }
  if(typeof Chart==='undefined'){
    document.querySelectorAll('.chart-h').forEach(el=>el.innerHTML='<div class="empty">Não foi possível carregar a biblioteca de gráficos (Chart.js).</div>');
    return;
  }
  const receita=f.reduce((s,r)=>s+r.renda+r.quintino,0);
  const despesa=f.reduce((s,r)=>s+r.totalGasto,0);
  const saldo=receita-despesa;
  const media=saldo/f.length;
  kpisEl.innerHTML=`
    <div class="kpi"><div class="l">Receita total</div><div class="v pos">${fmt(receita)}</div></div>
    <div class="kpi"><div class="l">Despesa total</div><div class="v neg">${fmt(despesa)}</div></div>
    <div class="kpi"><div class="l">Saldo do período</div><div class="v ${saldo>=0?'pos':'neg'}">${fmt(saldo)}</div></div>
    <div class="kpi"><div class="l">Saldo médio/mês</div><div class="v ${media>=0?'pos':'neg'}">${fmt(media)}</div></div>`;

  const labels=f.map(r=>r.mes.slice(0,3)+'/'+String(r.ano).slice(2));

  cSaldo&&cSaldo.destroy();
  cSaldo=new Chart(document.getElementById('chartSaldo'),{type:'line',
    data:{labels,datasets:[{label:'Saldo',data:f.map(r=>r.saldo),borderColor:'#3559e0',backgroundColor:'#3559e022',fill:true,tension:.25,pointRadius:2,
      segment:{borderColor:ctx=>ctx.p1.parsed.y<0?'#e5484d':'#1a9e6e'}}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{ticks:{callback:v=>fmt(v)}},x:{ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:14}}}}});

  cContas&&cContas.destroy();
  cContas=new Chart(document.getElementById('chartContas'),{type:'line',
    data:{labels,datasets:CONTAS.map(ct=>({label:ct.n,data:f.map(r=>r[ct.k]),borderColor:ct.c,backgroundColor:ct.c,tension:.2,pointRadius:0,borderWidth:2}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}},
      scales:{y:{ticks:{callback:v=>fmt(v)}},x:{ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:12}}}}});

  const despAcc=CONTAS.filter(c=>c.tipo==='despesa');
  cPizza&&cPizza.destroy();
  cPizza=new Chart(document.getElementById('chartPizza'),{type:'doughnut',
    data:{labels:despAcc.map(c=>c.n),datasets:[{data:despAcc.map(c=>f.reduce((s,r)=>s+r[c.k],0)),backgroundColor:despAcc.map(c=>c.c)}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}},
      tooltip:{callbacks:{label:ctx=>ctx.label+': '+fmt(ctx.parsed)}}}}});
}

setStatus('Carregando Finanças.xlsx…');
fetch('Finanças.xlsx').then(r=>{
  if(!r.ok) throw new Error('arquivo não encontrado ('+r.status+')');
  return r.arrayBuffer();
}).then(ab=>loadData(ab,'Finanças.xlsx'))
  .catch(e=>{
    setStatus('Não deu para carregar Finanças.xlsx automaticamente ('+e.message+'). Isso é normal se você abriu o index.html direto (duplo clique) — sirva a pasta com um servidor local, ou selecione o arquivo ao lado.');
  });

document.getElementById('fileInput').addEventListener('change',ev=>{
  const file=ev.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>loadData(e.target.result,file.name);
  reader.readAsArrayBuffer(file);
});
