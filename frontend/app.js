const API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "/api";

const navItems = [
  ["dashboard","⌂","Dashboard"],
  ["solicitacoes","🛒","Solicitações"],
  ["estoques","□","Estoques"],
  ["contratos","▣","Contratos"],
  ["pagamentos","▤","Pagamentos"],
  ["rastreabilidade","↶","Rastreabilidade"],
  ["relatorios","▥","Relatórios"],
  ["comunicacao","◌","Comunicação"],
  ["configuracoes","⚙","Configurações"]
];

const app = document.querySelector("#app");

function layout(content, active){
  return `<div class="layout">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">PRF</div><div class="brand-name">PRF</div></div>
      <nav class="nav">${navItems.map(([id,icon,label])=>`<a href="#/${id}" class="${active===id?'active':''}"><span class="icon">${icon}</span><span>${label}</span></a>`).join("")}</nav>
      <div class="side-foot"><strong>Polícia Rodoviária Federal</strong>Segurança nas estradas, mais segurança para o Brasil.</div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="top-title"><strong>Gestão de Suprimentos</strong><small>Mais eficiência para a nossa missão</small></div>
        <div class="search"><input id="globalSearch" placeholder="Buscar insumo, contrato, fornecedor, solicitação..."></div>
        <div class="profile"><span>♧</span><div class="avatar">EM</div><div><b>Emanuel Monteiro</b><br><small>Administrador</small></div></div>
      </header>${content}
    </main>
  </div>
  <div class="toast" id="toast"></div>`;
}

function toast(msg){
  const t=document.querySelector("#toast"); if(!t)return;
  t.textContent=msg;t.style.display="block";clearTimeout(window._toast);
  window._toast=setTimeout(()=>t.style.display="none",2400);
}

async function api(path, options={}){
  const r=await fetch(API+path,{headers:{"Content-Type":"application/json"},...options});
  if(!r.ok){let e={};try{e=await r.json()}catch{};throw new Error(e.message||"Erro na API");}
  return r.json();
}

function statusBadge(status){
  const map={EM_ANALISE:["Em análise","blue"],EM_ANDAMENTO:["Em andamento","blue"],CONCLUIDA:["Concluída","green"],ATRASADA:["Atrasada","red"],PENDENTE:["Pendente","yellow"],REJEITADA:["Rejeitada","red"]};
  const x=map[status]||[status,"blue"]; return `<span class="badge ${x[1]}">${x[0]}</span>`;
}

async function dashboard(){
  let d;
  try{d=await api("/dashboard")}catch(e){d={total:0,emAndamento:0,concluidas:0,atrasadas:0,alerts:[],estoqueCritico:0};}
  const content=`<section class="content">
    <div class="heading"><h1>Visão geral</h1><p>Acompanhe os principais indicadores e o status da gestão de suprimentos da PRF.</p></div>
    <div class="kpis">
      ${kpi("Total de solicitações",d.total,"↑ dados reais")}
      ${kpi("Em andamento",d.emAndamento,"processos ativos")}
      ${kpi("Concluídas",d.concluidas,"processos finalizados")}
      ${kpi("Atrasadas",d.atrasadas,"requerem atenção","red")}
    </div>
    <div class="grid">
      <div class="card panel"><div class="panel-head"><h3>Consumo de insumos</h3><a href="#/estoques">Ver estoque →</a></div>
        <div class="chart">
          <div class="bar-row"><span style="width:90px">Combustível</span><div class="bar"><i style="width:78%"></i></div><b>78%</b></div>
          <div class="bar-row"><span style="width:90px">Alimentos</span><div class="bar"><i style="width:62%"></i></div><b>62%</b></div>
          <div class="bar-row"><span style="width:90px">Expediente</span><div class="bar"><i style="width:46%"></i></div><b>46%</b></div>
          <div class="bar-row"><span style="width:90px">Equipamentos</span><div class="bar"><i style="width:31%"></i></div><b>31%</b></div>
        </div>
      </div>
      <div class="card panel"><div class="panel-head"><h3>Alertas recentes</h3><a href="#/estoques">Ver todos →</a></div>
        ${(d.alerts||[]).map(a=>`<div class="alert ${a.tipo==='ATENCAO'?'warn':''}"><div class="alert-icon">!</div><div><b>${a.titulo}</b><small>${a.descricao}</small></div></div>`).join("") || `<div class="empty">Nenhum alerta registrado.</div>`}
      </div>
    </div>
    <div class="grid">
      <div class="card panel"><div class="panel-head"><h3>Últimas solicitações</h3><a href="#/solicitacoes">Ver todas →</a></div>
        <div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Tipo</th><th>Prazo</th><th>Status</th></tr></thead><tbody>
        ${(d.ultimas||[]).map(x=>`<tr><td>${x.numero}</td><td>${x.solicitante}</td><td>${x.tipo}</td><td>${x.prazo||"—"}</td><td>${statusBadge(x.status)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Nenhuma solicitação cadastrada.</td></tr>`}
        </tbody></table></div>
      </div>
      <div class="card panel"><div class="panel-head"><h3>Indicadores rápidos</h3></div>
        <div class="alert"><div class="alert-icon">✓</div><div><b>${d.estoqueCritico||0} itens em risco de desabastecimento</b><small>Controle automático de estoque</small></div></div>
        <div class="alert warn"><div class="alert-icon">!</div><div><b>${d.contratosVencendo||0} contratos próximos do vencimento</b><small>Próximos 30 dias</small></div></div>
      </div>
    </div>
  </section>`;
  app.innerHTML=layout(content,"dashboard");
  bindGlobal();
}

function kpi(label,value,sub,cls=""){return `<div class="card kpi"><label>${label}</label><b>${value??0}</b><span class="trend ${cls}">${sub}</span></div>`}

async function solicitacoes(){
  let rows=[];try{rows=await api("/solicitacoes")}catch(e){}
  const content=`<section class="content">
    <div class="page-head"><div><h1>Solicitações</h1><p style="font-size:10px;color:var(--muted)">Crie, acompanhe e encaminhe solicitações de suprimentos.</p></div><button class="btn btn-yellow" id="newRequest">+ Nova solicitação</button></div>
    <div class="card panel">
      <div class="filters"><input id="filter" placeholder="Buscar por número, solicitante ou tipo..."><select id="statusFilter"><option value="">Todos os status</option><option value="EM_ANALISE">Em análise</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDA">Concluída</option><option value="ATRASADA">Atrasada</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Unidade</th><th>Tipo</th><th>Prioridade</th><th>Prazo</th><th>Status</th></tr></thead><tbody id="requestRows">
      ${rows.map(x=>requestRow(x)).join("") || `<tr><td colspan="7" class="empty">Nenhuma solicitação cadastrada. Clique em “Nova solicitação”.</td></tr>`}
      </tbody></table></div>
    </div>
  </section>
  <div class="modal-backdrop" id="modal"><div class="modal"><button class="close" id="closeModal">×</button><h2>Nova solicitação</h2><p>Os dados serão enviados ao backend e registrados no banco de dados.</p>
    <form id="requestForm"><div class="form-grid">
      <div class="field"><label>Solicitante *</label><input name="solicitante" required placeholder="Nome do solicitante"></div>
      <div class="field"><label>Unidade *</label><input name="unidade" required placeholder="Unidade / delegacia"></div>
      <div class="field"><label>Tipo *</label><select name="tipo" required><option value="Reposição de estoque">Reposição de estoque</option><option value="Aquisição">Aquisição</option><option value="Serviço">Serviço</option><option value="Manutenção">Manutenção</option></select></div>
      <div class="field"><label>Prioridade</label><select name="prioridade"><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></div>
      <div class="field"><label>Insumo *</label><input name="insumo" required placeholder="Ex.: Papel A4"></div>
      <div class="field"><label>Quantidade *</label><input name="quantidade" type="number" min="1" required></div>
      <div class="field"><label>Prazo desejado</label><input name="prazo" type="date"></div>
      <div class="field full"><label>Justificativa *</label><textarea name="justificativa" required placeholder="Descreva a necessidade..."></textarea></div>
    </div><div class="modal-actions"><button type="button" class="btn btn-light" id="cancelModal">Cancelar</button><button class="btn btn-primary">Enviar solicitação</button></div></form>
  </div></div>`;
  app.innerHTML=layout(content,"solicitacoes");
  document.querySelector("#newRequest").onclick=()=>document.querySelector("#modal").style.display="flex";
  document.querySelector("#closeModal").onclick=closeModal;document.querySelector("#cancelModal").onclick=closeModal;
  document.querySelector("#requestForm").onsubmit=createRequest;
  document.querySelector("#filter").oninput=filterRows;
  document.querySelector("#statusFilter").onchange=filterRows;
  bindGlobal();
}
function closeModal(){document.querySelector("#modal").style.display="none"}
function requestRow(x){return `<tr><td><a href="#/solicitacoes/${x.id}" style="color:var(--blue)">${x.numero}</a></td><td>${x.solicitante}</td><td>${x.unidade}</td><td>${x.tipo}</td><td>${x.prioridade}</td><td>${x.prazo||"—"}</td><td>${statusBadge(x.status)}</td></tr>`}
function filterRows(){
  const q=document.querySelector("#filter").value.toLowerCase(), st=document.querySelector("#statusFilter").value;
  document.querySelectorAll("#requestRows tr").forEach(r=>{const text=r.textContent.toLowerCase();r.style.display=(!q||text.includes(q))&&(!st||text.includes(st.replace("_"," ")))?"":"none"});
}
async function createRequest(e){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());data.quantidade=Number(data.quantidade);
  try{const x=await api("/solicitacoes",{method:"POST",body:JSON.stringify(data)});closeModal();toast(`Solicitação ${x.numero} criada com sucesso.`);setTimeout(()=>location.hash="#/solicitacoes",500)}catch(err){toast(err.message)}
}

async function detalhe(id){
  let x;try{x=await api(`/solicitacoes/${id}`)}catch(e){app.innerHTML=layout(`<section class="content"><div class="empty">Solicitação não encontrada.</div></section>`,"solicitacoes");return}
  const content=`<section class="content">
  <div class="page-head"><div><h1>${x.numero}</h1><p style="font-size:10px;color:var(--muted)">${x.tipo} · ${x.unidade}</p></div><button class="btn btn-light" onclick="history.back()">← Voltar</button></div>
  <div class="grid"><div class="card panel"><div class="panel-head"><h3>Dados da solicitação</h3>${statusBadge(x.status)}</div>
  <div class="form-grid"><div class="field"><label>Solicitante</label><input value="${x.solicitante}" disabled></div><div class="field"><label>Responsável atual</label><input value="${x.responsavel||"Ainda não atribuído"}" disabled></div><div class="field"><label>Insumo</label><input value="${x.insumo}" disabled></div><div class="field"><label>Quantidade</label><input value="${x.quantidade}" disabled></div><div class="field"><label>Prioridade</label><input value="${x.prioridade}" disabled></div><div class="field"><label>Prazo</label><input value="${x.prazo||"—"}" disabled></div><div class="field full"><label>Justificativa</label><textarea disabled>${x.justificativa}</textarea></div></div></div>
  <div class="card panel"><h3 style="font-size:14px">Histórico</h3><div class="timeline">${(x.historico||[]).map(h=>`<div class="event"><b>${h.acao}</b><small>${h.usuario||"Sistema"} · ${new Date(h.data).toLocaleString("pt-BR")}</small><small>${h.observacao||""}</small></div>`).join("")}</div></div></div>
  </section>`;
  app.innerHTML=layout(content,"solicitacoes");bindGlobal();
}

function genericPage(title, description, active){
  app.innerHTML=layout(`<section class="content"><div class="page-head"><div><h1>${title}</h1><p style="font-size:10px;color:var(--muted)">${description}</p></div></div><div class="card panel"><div class="empty">Módulo preparado para integração com a API. Os próximos recursos podem ser conectados a este mesmo banco de dados.</div></div></section>`,active);bindGlobal();
}

function bindGlobal(){
  document.querySelector("#globalSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.value.trim())toast("Pesquisa global: "+e.target.value.trim())});
}

async function router(){
  const p=location.hash.replace(/^#\/?/,"").split("/");
  if(p[0]==="solicitacoes"&&p[1])return detalhe(p[1]);
  if(p[0]==="solicitacoes")return solicitacoes();
  if(p[0]==="estoques")return genericPage("Estoques","Acompanhe níveis, estoque mínimo, itens críticos e previsão de reposição.","estoques");
  if(p[0]==="contratos")return genericPage("Contratos","Controle fornecedores, vigências, documentos e vencimentos.","contratos");
  if(p[0]==="pagamentos")return genericPage("Pagamentos","Acompanhe notas fiscais, vencimentos e fluxo de pagamentos.","pagamentos");
  if(p[0]==="rastreabilidade")return genericPage("Rastreabilidade","Consulte o histórico de movimentações e alterações.","rastreabilidade");
  if(p[0]==="relatorios")return genericPage("Relatórios","Indicadores, desempenho e identificação de gargalos.","relatorios");
  if(p[0]==="comunicacao")return genericPage("Comunicação","Centralize avisos, mensagens e informações das solicitações.","comunicacao");
  if(p[0]==="configuracoes")return genericPage("Configurações","Usuários, permissões e regras automáticas.","configuracoes");
  return dashboard();
}
window.addEventListener("hashchange",router);router();
