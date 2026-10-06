const API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "/api";
const navItems = [["dashboard","⌂","Dashboard"],["solicitacoes","🛒","Solicitações"],["estoques","□","Estoques"],["compras","◫","Compras"],["fornecedores","♙","Fornecedores"],["contratos","▣","Contratos"],["pagamentos","▤","Pagamentos"],["rastreabilidade","↶","Rastreabilidade"],["relatorios","▥","Relatórios"],["comunicacao","◌","Comunicação"],["configuracoes","⚙","Configurações"]];
const app = document.querySelector("#app");
let cache={materiais:[],estoques:[],fornecedores:[],solicitacoes:[]};
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function layout(content,active){return `<div class="layout"><aside class="sidebar"><div class="brand"><div class="brand-mark">PRF</div><div class="brand-name">PRF</div></div><nav class="nav">${navItems.map(([id,icon,label])=>`<a href="#/${id}" class="${active===id?'active':''}"><span class="icon">${icon}</span><span>${label}</span></a>`).join("")}</nav><div class="side-foot"><strong>Polícia Rodoviária Federal</strong>Segurança nas estradas, mais segurança para o Brasil.</div></aside><main class="main"><header class="topbar"><button class="mobile-menu" id="mobileMenu">☰</button><div class="top-title"><strong>Gestão de Suprimentos</strong><small>Mais eficiência para a nossa missão</small></div><div class="search"><input id="globalSearch" placeholder="Buscar insumo, contrato, fornecedor, solicitação..."></div><div class="profile"><span>♧</span><div class="avatar">EM</div><div class="profile-text"><b>Emanuel Monteiro</b><br><small>Administrador</small></div></div></header>${content}</main></div><div class="toast" id="toast"></div>`;
}
function toast(msg){const t=document.querySelector("#toast");
if(!t)return;
t.textContent=msg;
t.style.display="block";
clearTimeout(window._toast);
window._toast=setTimeout(()=>t.style.display="none",2600);
}
async function api(path,options={}){const r=await fetch(API+path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
if(!r.ok){let e={};
try{e=await r.json()}catch{};
throw new Error(e.message||"Erro na API");
}return r.json();
}
function statusBadge(status){const map={EM_ANALISE:["Em análise","blue"],EM_ANDAMENTO:["Em andamento","blue"],CONCLUIDA:["Concluída","green"],ATRASADA:["Atrasada","red"],PENDENTE:["Pendente","yellow"],REJEITADA:["Rejeitada","red"],CANCELADA:["Cancelada","red"],EM_COTACAO:["Em cotação","blue"],APROVADA:["Aprovada","green"],RECEBIDA:["Recebida","green"],PAGO:["Pago","green"]};
const x=map[status]||[status||"—","blue"];
return `<span class="badge ${x[1]}">${esc(x[0])}</span>`;
}
function kpi(label,value,sub,cls=""){return `<div class="card kpi"><label>${esc(label)}</label><b>${value??0}</b><span class="trend ${cls}">${esc(sub)}</span></div>`;
}
async function dashboard(){let d;
try{d=await api("/dashboard")}catch(e){d={total:0,emAndamento:0,concluidas:0,atrasadas:0,alerts:[],estoqueCritico:0,contratosVencendo:0,comprasAtivas:0};
}const content=`<section class="content"><div class="heading"><h1>Visão geral</h1><p>Acompanhe os principais indicadores e o status da gestão de suprimentos da PRF.</p></div><div class="kpis">${kpi("Total de solicitações",d.total,"dados reais")}${kpi("Em andamento",d.emAndamento,"processos ativos")}${kpi("Concluídas",d.concluidas,"processos finalizados")}${kpi("Atrasadas",d.atrasadas,"requerem atenção","red")}</div><div class="grid"><div class="card panel"><div class="panel-head"><h3>Consumo de insumos</h3><a href="#/estoques">Ver estoque →</a></div><div class="chart"><div class="bar-row"><span>Combustível</span><div class="bar"><i style="width:78%"></i></div><b>78%</b></div><div class="bar-row"><span>Alimentos</span><div class="bar"><i style="width:62%"></i></div><b>62%</b></div><div class="bar-row"><span>Expediente</span><div class="bar"><i style="width:46%"></i></div><b>46%</b></div><div class="bar-row"><span>Equipamentos</span><div class="bar"><i style="width:31%"></i></div><b>31%</b></div></div></div><div class="card panel"><div class="panel-head"><h3>Alertas recentes</h3><a href="#/comunicacao">Ver todos →</a></div>${(d.alerts||[]).map(a=>`<div class="alert ${a.tipo==='ATENCAO'?'warn':''}"><div class="alert-icon">!</div><div><b>${esc(a.titulo)}</b><small>${esc(a.descricao)}</small></div></div>`).join("")||`<div class="empty">Nenhum alerta registrado.</div>`}</div></div><div class="grid"><div class="card panel"><div class="panel-head"><h3>Últimas solicitações</h3><a href="#/solicitacoes">Ver todas →</a></div><div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Insumo</th><th>Tipo</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${(d.ultimas||[]).map(x=>`<tr><td data-label="Número">${esc(x.numero)}</td><td data-label="Solicitante">${esc(x.solicitante)}</td><td data-label="Insumo">${esc(x.insumo||"Não informado")}</td><td data-label="Tipo">${esc(x.tipo)}</td><td data-label="Prazo">${esc(x.prazo||"—")}</td><td data-label="Status">${statusBadge(x.status)}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">Nenhuma solicitação cadastrada.</td></tr>`}</tbody></table></div></div><div class="card panel"><div class="panel-head"><h3>Indicadores rápidos</h3></div><div class="alert"><div class="alert-icon">✓</div><div><b>${d.estoqueCritico||0} itens em risco</b><small>Controle automático de estoque</small></div></div><div class="alert warn"><div class="alert-icon">!</div><div><b>${d.contratosVencendo||0} contratos próximos</b><small>Próximos 30 dias</small></div></div><div class="alert"><div class="alert-icon">↗</div><div><b>${d.comprasAtivas||0} compras ativas</b><small>Processos em andamento</small></div></div></div></div></section>`;
app.innerHTML=layout(content,"dashboard");
bindGlobal();
}
async function loadMateriais(){try{cache.materiais=await api("/materiais");
return cache.materiais}catch(e){cache.materiais=[];
return []}}
function materialOptions(selected=""){return `<option value="">Selecione o insumo</option>${cache.materiais.map(m=>`<option value="${m.id}" ${String(m.id)===String(selected)?'selected':''}>${esc(m.nome)}${m.codigo?` · ${esc(m.codigo)}`:""}</option>`).join("")}`;
}
function requestRow(x){const material=x.material_nome||x.insumo||"Não informado";
return `<tr><td data-label="Número"><a href="#/solicitacoes/${x.id}" class="link">${esc(x.numero)}</a></td><td data-label="Solicitante">${esc(x.solicitante)}</td><td data-label="Unidade">${esc(x.unidade)}</td><td data-label="Insumo"><strong>${esc(material)}</strong><small class="cell-sub">${x.quantidade!=null?esc(x.quantidade):"—"} ${esc(x.unidade_medida||"")}</small></td><td data-label="Tipo">${esc(x.tipo)}</td><td data-label="Prioridade">${esc(x.prioridade)}</td><td data-label="Prazo">${esc(x.prazo||"—")}</td><td data-label="Status">${statusBadge(x.status)}</td></tr>`;
}
async function solicitacoes(){let rows=[];
await loadMateriais();
try{rows=await api("/solicitacoes");
cache.solicitacoes=rows}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Solicitações</h1><p>Crie, acompanhe e encaminhe solicitações de suprimentos.</p></div><button class="btn btn-yellow" id="newRequest">+ Nova solicitação</button></div><div class="card panel"><div class="filters"><input id="filter" placeholder="Buscar por número, solicitante, insumo ou tipo..."><select id="statusFilter"><option value="">Todos os status</option><option value="EM_ANALISE">Em análise</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDA">Concluída</option><option value="ATRASADA">Atrasada</option><option value="REJEITADA">Rejeitada</option><option value="CANCELADA">Cancelada</option></select></div><div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Unidade</th><th>Insumo</th><th>Tipo</th><th>Prioridade</th><th>Prazo</th><th>Status</th></tr></thead><tbody id="requestRows">${rows.map(requestRow).join("")||`<tr><td colspan="8" class="empty">Nenhuma solicitação cadastrada. Clique em “Nova solicitação”.</td></tr>`}</tbody></table></div></div></section><div class="modal-backdrop" id="modal"><div class="modal"><button class="close" id="closeModal">×</button><h2>Nova solicitação</h2><p>Selecione um insumo do catálogo para evitar erros de digitação.</p><form id="requestForm"><div class="form-grid"><div class="field"><label>Solicitante *</label><input name="solicitante" required placeholder="Nome do solicitante"></div><div class="field"><label>Unidade *</label><input name="unidade" required placeholder="Unidade / delegacia"></div><div class="field"><label>Tipo *</label><select name="tipo" required><option value="Reposição de estoque">Reposição de estoque</option><option value="Aquisição">Aquisição</option><option value="Serviço">Serviço</option><option value="Manutenção">Manutenção</option></select></div><div class="field"><label>Prioridade</label><select name="prioridade"><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></div><div class="field full"><label>Insumo *</label><select name="material_id" id="materialSelect" required>${materialOptions()}</select><small class="hint">${cache.materiais.length?`${cache.materiais.length} insumos disponíveis no catálogo.`:'Nenhum material cadastrado. Cadastre um em Estoques.'}</small></div><div class="field"><label>Quantidade *</label><input name="quantidade" type="number" min="1" step="0.01" required></div><div class="field"><label>Prazo desejado</label><input name="prazo" type="date"></div><div class="field full"><label>Justificativa *</label><textarea name="justificativa" required placeholder="Descreva a necessidade..."></textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-light" id="cancelModal">Cancelar</button><button class="btn btn-primary" ${cache.materiais.length?'':'disabled'}>Enviar solicitação</button></div></form></div></div>`;
app.innerHTML=layout(content,"solicitacoes");
document.querySelector("#newRequest").onclick=()=>document.querySelector("#modal").style.display="flex";
document.querySelector("#closeModal").onclick=closeModal;
document.querySelector("#cancelModal").onclick=closeModal;
document.querySelector("#requestForm").onsubmit=createRequest;
document.querySelector("#filter").oninput=filterRows;
document.querySelector("#statusFilter").onchange=filterRows;
bindGlobal();
}
function closeModal(){document.querySelector("#modal")?.style&& (document.querySelector("#modal").style.display="none")}
function filterRows(){
  const normalize = value =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const q = normalize(document.querySelector("#filter")?.value || "");
  const st = normalize(document.querySelector("#statusFilter")?.value || "")
    .replace(/_/g, " ");

  document.querySelectorAll("#requestRows tr").forEach(r => {
    const text = normalize(r.textContent);

    r.style.display =
      (!q || text.includes(q)) &&
      (!st || text.includes(st))
        ? ""
        : "none";
  });
}
async function createRequest(e){e.preventDefault();
const data=Object.fromEntries(new FormData(e.target).entries());
data.quantidade=Number(data.quantidade);
const m=cache.materiais.find(x=>String(x.id)===String(data.material_id));
data.insumo=m?.nome||"";
try{const x=await api("/solicitacoes",{method:"POST",body:JSON.stringify(data)});
closeModal();
toast(`Solicitação ${x.numero} criada com sucesso.`);
router()}catch(err){toast(err.message)}}
async function detalhe(id){let x;
try{x=await api(`/solicitacoes/${id}`)}catch(e){app.innerHTML=layout(`<section class="content"><div class="empty">Solicitação não encontrada.</div></section>`,"solicitacoes");
return}const material=x.material_nome||x.insumo||"Não informado";
const content=`<section class="content"><div class="page-head"><div><h1>${esc(x.numero)}</h1><p>${esc(x.tipo)} · ${esc(x.unidade)}</p></div><button class="btn btn-light" onclick="history.back()">← Voltar</button></div><div class="grid"><div class="card panel"><div class="panel-head"><h3>Dados da solicitação</h3>${statusBadge(x.status)}</div><div class="detail-actions"><button class="btn btn-light" id="editRequest">Editar</button><button class="btn btn-primary" id="advanceRequest">Encaminhar</button><button class="btn btn-danger" id="rejectRequest">Rejeitar</button><button class="btn btn-light" id="cancelRequest">Cancelar</button></div><div class="form-grid"><div class="field"><label>Solicitante</label><input value="${esc(x.solicitante)}" disabled></div><div class="field"><label>Responsável atual</label><input value="${esc(x.responsavel||"Ainda não atribuído")}" disabled></div><div class="field"><label>Insumo</label><input value="${esc(material)}" disabled></div><div class="field"><label>Quantidade</label><input value="${esc(x.quantidade)}" disabled></div><div class="field"><label>Prioridade</label><input value="${esc(x.prioridade)}" disabled></div><div class="field"><label>Prazo</label><input value="${esc(x.prazo||"—")}" disabled></div><div class="field full"><label>Justificativa</label><textarea disabled>${esc(x.justificativa)}</textarea></div></div></div><div class="card panel"><h3>Histórico</h3><div class="timeline">${(x.historico||[]).map(h=>`<div class="event"><b>${esc(h.acao)}</b><small>${esc(h.usuario||"Sistema")} · ${new Date(h.data).toLocaleString("pt-BR")}</small><small>${esc(h.observacao||"")}</small></div>`).join("")||'<div class="empty">Sem histórico.</div>'}</div></div></section>`;
app.innerHTML=layout(content,"solicitacoes");
document.querySelector("#advanceRequest").onclick=()=>changeStatus(id,"EM_ANDAMENTO");
document.querySelector("#rejectRequest").onclick=()=>{const obs=prompt("Motivo da rejeição:");
if(obs!==null)changeStatus(id,"REJEITADA",obs)};
document.querySelector("#cancelRequest").onclick=()=>changeStatus(id,"CANCELADA");
document.querySelector("#editRequest").onclick=()=>editRequest(id,x);
bindGlobal();
}
async function changeStatus(id,status,observacao=""){try{await api(`/solicitacoes/${id}/status`,{method:"PATCH",body:JSON.stringify({status,observacao})});
toast("Solicitação atualizada.");
detalhe(id)}catch(e){toast(e.message)}}
function editRequest(id,x){const modal=document.createElement("div");
modal.className="modal-backdrop";
modal.style.display="flex";
modal.innerHTML=`<div class="modal"><button class="close">×</button><h2>Editar solicitação</h2><form id="editForm"><div class="form-grid"><div class="field"><label>Solicitante</label><input name="solicitante" value="${esc(x.solicitante)}"></div><div class="field"><label>Unidade</label><input name="unidade" value="${esc(x.unidade)}"></div><div class="field"><label>Prioridade</label><select name="prioridade"><option ${x.prioridade==='NORMAL'?'selected':''}>NORMAL</option><option ${x.prioridade==='ALTA'?'selected':''}>ALTA</option><option ${x.prioridade==='URGENTE'?'selected':''}>URGENTE</option></select></div><div class="field"><label>Quantidade</label><input name="quantidade" type="number" min="1" step="0.01" value="${esc(x.quantidade)}"></div><div class="field full"><label>Insumo</label><select name="material_id">${materialOptions(x.material_id)}</select></div><div class="field full"><label>Justificativa</label><textarea name="justificativa">${esc(x.justificativa)}</textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form></div>`;
document.body.appendChild(modal);
modal.querySelector(".close").onclick=()=>modal.remove();
modal.querySelector(".cancel").onclick=()=>modal.remove();
modal.querySelector("form").onsubmit=async e=>{e.preventDefault();
const data=Object.fromEntries(new FormData(e.target));
data.quantidade=Number(data.quantidade);
try{await api(`/solicitacoes/${id}`,{method:"PATCH",body:JSON.stringify(data)});
modal.remove();
toast("Solicitação atualizada.");
detalhe(id)}catch(err){toast(err.message)}};
}
async function estoques(){let rows=[];
try{rows=await api("/estoques");
cache.estoques=rows}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Estoques</h1><p>Acompanhe níveis, estoque mínimo e movimentações.</p></div><button class="btn btn-yellow" id="newMaterial">+ Novo material</button></div><div class="card panel"><div class="filters"><input id="stockFilter" placeholder="Buscar material..."><button class="btn btn-light" id="movementBtn">Movimentar estoque</button></div><div class="table-wrap"><table><thead><tr><th>Insumo</th><th>Unidade</th><th>Atual</th><th>Mínimo</th><th>Máximo</th><th>Situação</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Insumo"><strong>${esc(x.material_nome||x.insumo||'Não informado')}</strong><small class="cell-sub">${esc(x.material_codigo||'')}</small></td><td data-label="Unidade">${esc(x.unidade_medida)}</td><td data-label="Atual">${esc(x.quantidade_atual)}</td><td data-label="Mínimo">${esc(x.estoque_minimo)}</td><td data-label="Máximo">${esc(x.estoque_maximo??'—')}</td><td data-label="Situação">${Number(x.quantidade_atual)<=Number(x.estoque_minimo)?'<span class="badge red">Crítico</span>':'<span class="badge green">Normal</span>'}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Nenhum estoque cadastrado.</td></tr>'}</tbody></table></div></div></section><div class="modal-backdrop" id="stockModal"></div>`;
app.innerHTML=layout(content,"estoques");
document.querySelector('#newMaterial').onclick=()=>materialModal();
document.querySelector('#movementBtn').onclick=()=>movementModal();
document.querySelector('#stockFilter').oninput=e=>{const q=e.target.value.toLowerCase();
document.querySelectorAll('tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none')};
bindGlobal();
}
function modalShell(id,title,body){const m=document.querySelector('#'+id);
m.innerHTML=`<div class="modal"><button class="close">×</button><h2>${title}</h2>${body}</div>`;
m.style.display='flex';
m.querySelector('.close').onclick=()=>m.style.display='none';
return m;
}
function materialModal(){const m=modalShell('stockModal','Novo material',`<form id="materialForm"><div class="form-grid"><div class="field"><label>Código</label><input name="codigo" placeholder="MAT-0001"></div><div class="field"><label>Nome *</label><input name="nome" required></div><div class="field"><label>Categoria</label><input name="categoria"></div><div class="field"><label>Unidade</label><input name="unidade_medida" value="un"></div><div class="field"><label>Estoque mínimo</label><input name="estoque_minimo" type="number" min="0" value="0"></div><div class="field"><label>Estoque máximo</label><input name="estoque_maximo" type="number" min="0"></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Cadastrar</button></div></form>`);
m.querySelector('.cancel').onclick=()=>m.style.display='none';
m.querySelector('form').onsubmit=async e=>{e.preventDefault();
const data=Object.fromEntries(new FormData(e.target));
try{await api('/materiais',{method:'POST',body:JSON.stringify(data)});
m.style.display='none';
toast('Material cadastrado.');
estoques()}catch(err){toast(err.message)}};
}
function movementModal(){if(!cache.estoques.length){toast('Nenhum estoque disponível.');
return}const m=modalShell('stockModal','Movimentar estoque',`<form id="movementForm"><div class="form-grid"><div class="field full"><label>Estoque *</label><select name="estoque_id" required>${cache.estoques.map(x=>`<option value="${x.id}">${esc(x.material_nome||x.insumo)} · atual ${esc(x.quantidade_atual)}</option>`).join('')}</select></div><div class="field"><label>Tipo</label><select name="tipo"><option>ENTRADA</option><option>SAIDA</option><option>AJUSTE</option></select></div><div class="field"><label>Quantidade *</label><input name="quantidade" type="number" min="0.01" step="0.01" required></div><div class="field full"><label>Observação</label><textarea name="observacao"></textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Registrar</button></div></form>`);
m.querySelector('.cancel').onclick=()=>m.style.display='none';
m.querySelector('form').onsubmit=async e=>{e.preventDefault();
const data=Object.fromEntries(new FormData(e.target));
data.quantidade=Number(data.quantidade);
try{await api('/estoques/movimentacoes',{method:'POST',body:JSON.stringify(data)});
m.style.display='none';
toast('Movimentação registrada.');
estoques()}catch(err){toast(err.message)}};
}
async function comprasPage(){
  let rows=[];
  try{rows=await api('/compras')}catch(e){}
  const content=`<section class="content"><div class="page-head"><div><h1>Compras</h1><p>Acompanhe processos de compra gerados a partir das solicitações.</p></div><button class="btn btn-yellow" id="newPurchase">+ Nova compra</button></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitação</th><th>Fornecedor</th><th>Valor</th><th>Entrega</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Número">${esc(x.numero)}</td><td data-label="Solicitação">${esc(x.solicitacao_numero||'—')}</td><td data-label="Fornecedor">${esc(x.fornecedor_nome||'—')}</td><td data-label="Valor">R$ ${Number(x.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td><td data-label="Entrega">${esc(x.previsao_entrega||'—')}</td><td data-label="Status">${statusBadge(x.status)}</td><td data-label="Ação"><select class="purchase-status" data-id="${x.id}"><option value="EM_COTACAO" ${x.status==='EM_COTACAO'?'selected':''}>Em cotação</option><option value="APROVADA" ${x.status==='APROVADA'?'selected':''}>Aprovada</option><option value="EM_ANDAMENTO" ${x.status==='EM_ANDAMENTO'?'selected':''}>Em andamento</option><option value="RECEBIDA" ${x.status==='RECEBIDA'?'selected':''}>Recebida</option><option value="CANCELADA" ${x.status==='CANCELADA'?'selected':''}>Cancelada</option></select></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhuma compra cadastrada.</td></tr>'}</tbody></table></div></div></section><div class="modal-backdrop" id="purchaseModal"></div>`;
  app.innerHTML=layout(content,'compras');
  document.querySelector('#newPurchase').onclick=async()=>{
    const suppliers=await api('/fornecedores').catch(()=>[]);
    const requests=await api('/solicitacoes').catch(()=>[]);
    const m=modalShell('purchaseModal','Nova compra',`<form id="purchaseForm"><div class="form-grid"><div class="field full"><label>Solicitação</label><select name="solicitacao_id"><option value="">Selecione</option>${requests.map(x=>`<option value="${x.id}">${esc(x.numero)} · ${esc(x.insumo||x.material_nome||'Insumo')}</option>`).join('')}</select></div><div class="field"><label>Fornecedor</label><select name="fornecedor_id"><option value="">Selecione</option>${suppliers.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></div><div class="field"><label>Valor</label><input name="valor" type="number" min="0" step="0.01"></div><div class="field"><label>Previsão de entrega</label><input name="previsao_entrega" type="date"></div><div class="field full"><label>Observação</label><textarea name="observacao"></textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Cadastrar</button></div></form>`);
    m.querySelector('.cancel').onclick=()=>m.style.display='none';
    m.querySelector('form').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await api('/compras',{method:'POST',body:JSON.stringify(data)});m.style.display='none';toast('Compra cadastrada.');comprasPage()}catch(err){toast(err.message)}};
  };
  document.querySelectorAll('.purchase-status').forEach(select=>select.onchange=async()=>{try{await api(`/compras/${select.dataset.id}/status`,{method:'PATCH',body:JSON.stringify({status:select.value})});toast('Status da compra atualizado.');comprasPage()}catch(e){toast(e.message)}});
  bindGlobal();
}

async function contratos(){let rows=[];
try{rows=await api('/contratos')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Contratos</h1><p>Controle fornecedores, vigências, valores e vencimentos.</p></div><button class="btn btn-yellow" id="newContract">+ Novo contrato</button></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Número</th><th>Fornecedor</th><th>Objeto</th><th>Início</th><th>Fim</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Número">${esc(x.numero)}</td><td data-label="Fornecedor">${esc(x.fornecedor_nome||x.fornecedor)}</td><td data-label="Objeto">${esc(x.objeto)}</td><td data-label="Início">${esc(x.data_inicio)}</td><td data-label="Fim">${esc(x.data_fim)}</td><td data-label="Valor">R$ ${Number(x.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td><td data-label="Status">${statusBadge(x.status)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhum contrato cadastrado.</td></tr>'}</tbody></table></div></div></section><div class="modal-backdrop" id="contractModal"></div>`;
app.innerHTML=layout(content,'contratos');
document.querySelector('#newContract').onclick=contractModal;
bindGlobal();
}
async function contractModal(){let fornecedores=[];
try{fornecedores=await api('/fornecedores')}catch(e){}const m=modalShell('contractModal','Novo contrato',`<form id="contractForm"><div class="form-grid"><div class="field"><label>Número *</label><input name="numero" required></div><div class="field"><label>Fornecedor *</label><select name="fornecedor_id" required><option value="">Selecione o fornecedor</option>${fornecedores.map(f=>`<option value="${f.id}" data-name="${esc(f.nome)}">${esc(f.nome)}</option>`).join("")}</select><input type="hidden" name="fornecedor"></div><div class="field full"><label>Objeto *</label><textarea name="objeto" required></textarea></div><div class="field"><label>Início *</label><input name="data_inicio" type="date" required></div><div class="field"><label>Fim *</label><input name="data_fim" type="date" required></div><div class="field"><label>Valor</label><input name="valor" type="number" min="0" step="0.01"></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Cadastrar</button></div></form>`);
m.querySelector('.cancel').onclick=()=>m.style.display='none';
m.querySelector('form').onsubmit=async e=>{e.preventDefault();
const data=Object.fromEntries(new FormData(e.target));
const supplier=e.target.querySelector('[name=fornecedor_id] option:checked');
data.fornecedor=supplier?.dataset.name||'';
try{await api('/contratos',{method:'POST',body:JSON.stringify(data)});
m.style.display='none';
toast('Contrato cadastrado.');
contratos()}catch(err){toast(err.message)}};
}
async function pagamentos(){let rows=[];
try{rows=await api('/pagamentos')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Pagamentos</h1><p>Acompanhe notas fiscais, vencimentos e documentos pendentes.</p></div></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Nota fiscal</th><th>Fornecedor</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Nota fiscal">${esc(x.nota_fiscal)}</td><td data-label="Fornecedor">${esc(x.fornecedor)}</td><td data-label="Valor">R$ ${Number(x.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td><td data-label="Vencimento">${esc(x.vencimento)}</td><td data-label="Status">${statusBadge(x.status)}</td><td data-label="Ação">${x.status==='PENDENTE'?`<button class="btn btn-light small-btn" onclick="markPaid(${x.id})">Marcar pago</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhum pagamento cadastrado.</td></tr>'}</tbody></table></div></div></section>`;
app.innerHTML=layout(content,'pagamentos');
bindGlobal();
}
async function markPaid(id){try{await api(`/pagamentos/${id}/pago`,{method:'PATCH'});
toast('Pagamento atualizado.');
pagamentos()}catch(e){toast(e.message)}}
async function rastreabilidade(){let rows=[];
try{rows=await api('/estoques/movimentacoes')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Rastreabilidade</h1><p>Histórico de entradas, saídas e ajustes de estoque.</p></div></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Data</th><th>Insumo</th><th>Tipo</th><th>Quantidade</th><th>Saldo anterior</th><th>Novo saldo</th><th>Observação</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Data">${new Date(x.criado_em).toLocaleString('pt-BR')}</td><td data-label="Insumo">${esc(x.material_nome||x.insumo||'Não informado')}</td><td data-label="Tipo">${esc(x.tipo)}</td><td data-label="Quantidade">${esc(x.quantidade)}</td><td data-label="Saldo anterior">${esc(x.saldo_anterior)}</td><td data-label="Novo saldo">${esc(x.saldo_novo)}</td><td data-label="Observação">${esc(x.observacao||'—')}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nenhuma movimentação registrada.</td></tr>'}</tbody></table></div></div></section>`;
app.innerHTML=layout(content,'rastreabilidade');
bindGlobal();
}
async function relatorios(){let d={};
try{d=await api('/relatorios/resumo')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Relatórios</h1><p>Indicadores para acompanhamento e tomada de decisão.</p></div><button class="btn btn-light" onclick="window.print()">Imprimir / PDF</button></div><div class="kpis">${kpi('Solicitações',sumStatuses(d.solicitacoes),'por status')}${kpi('Itens críticos',d.estoque?.criticos||0,'estoque')}${kpi('Contratos vencendo',d.contratos?.vencendo||0,'30 dias')}${kpi('Pagamentos pendentes',d.pagamentos?.total||0,'documentos')}</div><div class="grid"><div class="card panel"><h3>Solicitações por status</h3>${(d.solicitacoes||[]).map(x=>`<div class="report-row"><span>${esc(x.status)}</span><b>${x.total}</b></div>`).join('')||'<div class="empty">Sem dados.</div>'}</div><div class="card panel"><h3>Resumo financeiro</h3><div class="big-number">R$ ${Number(d.pagamentos?.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div><p>Valor de pagamentos pendentes.</p><div class="big-number">${d.compras?.total||0}</div><p>Compras em andamento.</p></div></div></section>`;
app.innerHTML=layout(content,'relatorios');
bindGlobal();
}
function sumStatuses(rows){return (rows||[]).reduce((a,x)=>a+Number(x.total||0),0)}
async function comunicacao(){let rows=[];
try{rows=await api('/alertas')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Comunicação</h1><p>Central de avisos e alertas do sistema.</p></div></div><div class="card panel">${rows.map(a=>`<div class="alert ${a.tipo==='ATENCAO'?'warn':''}"><div class="alert-icon">!</div><div><b>${esc(a.titulo)}</b><small>${esc(a.descricao)}</small></div></div>`).join('')||'<div class="empty">Nenhum alerta ativo.</div>'}</div></section>`;
app.innerHTML=layout(content,'comunicacao');
bindGlobal();
}
async function configuracoes(){let users=[];
try{users=await api('/usuarios')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Configurações</h1><p>Gerencie usuários, perfis de acesso e status da equipe.</p></div><button class="btn btn-yellow" id="newUser">+ Novo usuário</button></div><div class="grid"><div class="card panel"><h3>Perfis de acesso</h3><div class="report-row"><span><b>Administrador</b><small>Acesso completo ao SIGO</small></span><span class="badge blue">ADMIN</span></div><div class="report-row"><span><b>Gestor</b><small>Operações, estoque, compras e relatórios</small></span><span class="badge green">GESTOR</span></div><div class="report-row"><span><b>Solicitante</b><small>Criação e acompanhamento de solicitações</small></span><span class="badge yellow">SOLICITANTE</span></div></div><div class="card panel"><h3>Resumo de usuários</h3><div class="big-number">${users.filter(u=>u.ativo).length}</div><p>usuários ativos de ${users.length} cadastrados</p></div></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Ação</th></tr></thead><tbody>${users.map(u=>`<tr><td data-label="Nome">${esc(u.nome)}</td><td data-label="E-mail">${esc(u.email||'—')}</td><td data-label="Perfil"><span class="badge blue">${esc(u.perfil)}</span></td><td data-label="Ativo">${u.ativo?'<span class="badge green">Ativo</span>':'<span class="badge red">Inativo</span>'}</td><td data-label="Ação"><button class="btn btn-light small-btn edit-user" data-id="${u.id}" data-name="${esc(u.nome)}" data-email="${esc(u.email||'')}" data-perfil="${esc(u.perfil)}" data-ativo="${u.ativo}">Editar</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhum usuário.</td></tr>'}</tbody></table></div></div></section><div class="modal-backdrop" id="userModal"></div>`;
app.innerHTML=layout(content,'configuracoes');
const openUser=(user=null)=>{const m=modalShell('userModal',user?'Editar usuário':'Novo usuário',`<form id="userForm"><div class="form-grid"><div class="field full"><label>Nome *</label><input name="nome" required value="${esc(user?.nome||'')}"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(user?.email||'')}"></div><div class="field"><label>Perfil *</label><select name="perfil" required><option ${user?.perfil==='ADMIN'?'selected':''}>ADMIN</option><option ${user?.perfil==='GESTOR'?'selected':''}>GESTOR</option><option ${user?.perfil==='SOLICITANTE'?'selected':''}>SOLICITANTE</option></select></div><div class="field"><label>Status</label><select name="ativo"><option value="true" ${user?.ativo!==false?'selected':''}>Ativo</option><option value="false" ${user?.ativo===false?'selected':''}>Inativo</option></select></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);m.querySelector('.cancel').onclick=()=>m.style.display='none';m.querySelector('form').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));data.ativo=data.ativo==='true';try{await api(user?`/usuarios/${user.id}`:'/usuarios',{method:user?'PATCH':'POST',body:JSON.stringify(data)});m.style.display='none';toast(user?'Usuário atualizado.':'Usuário cadastrado.');configuracoes()}catch(err){toast(err.message)}}};
document.querySelector('#newUser').onclick=()=>openUser();document.querySelectorAll('.edit-user').forEach(b=>b.onclick=()=>openUser({id:b.dataset.id,nome:b.dataset.name,email:b.dataset.email,perfil:b.dataset.perfil,ativo:b.dataset.ativo==='true'}));bindGlobal();
}
async function fornecedoresPage(){let rows=[];
try{rows=await api('/fornecedores')}catch(e){}const content=`<section class="content"><div class="page-head"><div><h1>Fornecedores</h1><p>Cadastro e contatos dos fornecedores.</p></div><button class="btn btn-yellow" id="newSupplier">+ Novo fornecedor</button></div><div class="card panel"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Documento</th><th>Contato</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Nome">${esc(x.nome)}</td><td data-label="Documento">${esc(x.documento||'—')}</td><td data-label="Contato">${esc(x.contato||'—')}</td><td data-label="E-mail">${esc(x.email||'—')}</td><td data-label="Telefone">${esc(x.telefone||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhum fornecedor cadastrado.</td></tr>'}</tbody></table></div></div></section><div class="modal-backdrop" id="supplierModal"></div>`;
app.innerHTML=layout(content,'fornecedores');
document.querySelector('#newSupplier').onclick=()=>{const m=modalShell('supplierModal','Novo fornecedor',`<form id="supplierForm"><div class="form-grid"><div class="field full"><label>Nome *</label><input name="nome" required></div><div class="field"><label>Documento</label><input name="documento"></div><div class="field"><label>Contato</label><input name="contato"></div><div class="field"><label>E-mail</label><input name="email" type="email"></div><div class="field"><label>Telefone</label><input name="telefone"></div></div><div class="modal-actions"><button type="button" class="btn btn-light cancel">Cancelar</button><button class="btn btn-primary">Cadastrar</button></div></form>`);
m.querySelector('.cancel').onclick=()=>m.style.display='none';
m.querySelector('form').onsubmit=async e=>{e.preventDefault();
try{await api('/fornecedores',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
m.style.display='none';
toast('Fornecedor cadastrado.');
fornecedoresPage()}catch(err){toast(err.message)}}};
bindGlobal();
}
function genericPage(title,description,active){app.innerHTML=layout(`<section class="content"><div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></div><div class="card panel"><div class="empty">Este módulo está disponível na navegação. Use os módulos de Estoques, Contratos e Relatórios para operar os dados principais.</div></div></section>`,active);
bindGlobal();
}
function bindGlobal(){document.querySelector('#globalSearch')?.addEventListener('keydown',async e=>{if(e.key!=='Enter'||!e.target.value.trim())return;const q=e.target.value.trim().toLowerCase();try{const [s,c,f,m]=await Promise.all([api('/solicitacoes'),api('/contratos'),api('/fornecedores'),api('/materiais')]);const total=[...s.filter(x=>JSON.stringify(x).toLowerCase().includes(q)),...c.filter(x=>JSON.stringify(x).toLowerCase().includes(q)),...f.filter(x=>JSON.stringify(x).toLowerCase().includes(q)),...m.filter(x=>JSON.stringify(x).toLowerCase().includes(q))].length;toast(`${total} resultado(s) encontrado(s) para “${e.target.value.trim()}”.`)}catch(err){toast('Não foi possível realizar a pesquisa.')}});
document.querySelector('#mobileMenu')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.remove('open')));
}
async function router(){const p=location.hash.replace(/^#\/?/,'').split('/');
if(p[0]==='solicitacoes'&&p[1])return detalhe(p[1]);
if(p[0]==='solicitacoes')return solicitacoes();
if(p[0]==='estoques')return estoques();
if(p[0]==='compras')return comprasPage();
if(p[0]==='fornecedores')return fornecedoresPage();
if(p[0]==='contratos')return contratos();
if(p[0]==='pagamentos')return pagamentos();
if(p[0]==='rastreabilidade')return rastreabilidade();
if(p[0]==='relatorios')return relatorios();
if(p[0]==='comunicacao')return comunicacao();
if(p[0]==='configuracoes')return configuracoes();
return dashboard();
}
window.addEventListener('hashchange',router);
router();
