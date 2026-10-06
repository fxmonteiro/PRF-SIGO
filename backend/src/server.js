const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();
const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL;
app.use(cors(frontendUrl ? { origin: frontendUrl } : undefined));
app.use(express.json());
if (!process.env.DATABASE_URL) console.warn("DATABASE_URL não definida. Configure a variável no Render ou no .env local.");
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? { rejectUnauthorized:false } : false,
max:5, idleTimeoutMillis:30000, connectionTimeoutMillis:10000
});
function normalize(row){
if(!row) return null;
return {...row, quantidade: row.quantidade != null ? Number(row.quantidade) : row.quantidade,
quantidade_atual: row.quantidade_atual != null ? Number(row.quantidade_atual) : row.quantidade_atual};
}
function asyncRoute(fn){ return (req,res)=>Promise.resolve(fn(req,res)).catch(e=>{console.error(e);
res.status(500).json({message:e.message||"Erro interno da API"});
});
}
async function ensureExtensions(){
const sql = `
  CREATE TABLE IF NOT EXISTS materiais (id SERIAL PRIMARY KEY,codigo VARCHAR(60) UNIQUE,nome VARCHAR(160) NOT NULL,categoria VARCHAR(100),unidade_medida VARCHAR(30) NOT NULL DEFAULT 'un',estoque_minimo NUMERIC(14,2) NOT NULL DEFAULT 0,estoque_maximo NUMERIC(14,2),ativo BOOLEAN NOT NULL DEFAULT TRUE,criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS fornecedores (id SERIAL PRIMARY KEY,nome VARCHAR(180) NOT NULL,documento VARCHAR(40),contato VARCHAR(160),email VARCHAR(180),telefone VARCHAR(50),ativo BOOLEAN NOT NULL DEFAULT TRUE,criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS movimentacoes_estoque (id SERIAL PRIMARY KEY,estoque_id INTEGER REFERENCES estoques(id) ON DELETE CASCADE,material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL,tipo VARCHAR(20) NOT NULL,quantidade NUMERIC(14,2) NOT NULL,saldo_anterior NUMERIC(14,2) NOT NULL DEFAULT 0,saldo_novo NUMERIC(14,2) NOT NULL DEFAULT 0,observacao TEXT,usuario_id INTEGER REFERENCES usuarios(id),criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS compras (id SERIAL PRIMARY KEY,solicitacao_id INTEGER REFERENCES solicitacoes(id) ON DELETE SET NULL,fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,numero VARCHAR(50) UNIQUE NOT NULL,valor NUMERIC(14,2) NOT NULL DEFAULT 0,previsao_entrega DATE,status VARCHAR(30) NOT NULL DEFAULT 'EM_COTACAO',observacao TEXT,criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS cotacoes (id SERIAL PRIMARY KEY,solicitacao_id INTEGER REFERENCES solicitacoes(id) ON DELETE SET NULL,fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,valor NUMERIC(14,2) NOT NULL DEFAULT 0,prazo_entrega INTEGER,status VARCHAR(30) NOT NULL DEFAULT 'RECEBIDA',criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS unidades (id SERIAL PRIMARY KEY,nome VARCHAR(160) UNIQUE NOT NULL,sigla VARCHAR(30),ativo BOOLEAN NOT NULL DEFAULT TRUE);
  ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL;
  ALTER TABLE estoques ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL;
  ALTER TABLE contratos ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL;
  `;
await pool.query(sql);
await pool.query(`INSERT INTO materiais(codigo,nome,categoria,unidade_medida,estoque_minimo,estoque_maximo) SELECT 'MAT-'||LPAD(e.id::text,4,'0'),e.insumo,'Catálogo inicial',e.unidade_medida,e.estoque_minimo,e.estoque_maximo FROM estoques e WHERE NOT EXISTS(SELECT 1 FROM materiais m WHERE LOWER(m.nome)=LOWER(e.insumo))`);
await pool.query(`UPDATE estoques e SET material_id=m.id FROM materiais m WHERE e.material_id IS NULL AND LOWER(m.nome)=LOWER(e.insumo)`);
await pool.query(`UPDATE solicitacoes s SET material_id=m.id FROM materiais m WHERE s.material_id IS NULL AND LOWER(m.nome)=LOWER(s.insumo)`);
}
app.get("/api/health", asyncRoute(async (_req,res)=>{await pool.query("SELECT 1");
res.json({ok:true,database:"connected",environment:process.env.NODE_ENV||"development"});
}));
app.get("/api/dashboard", asyncRoute(async (_req,res)=>{
const [tot,statuses,alerts,ult,estoque,contratos,compras] = await Promise.all([
pool.query("SELECT COUNT(*)::int total FROM solicitacoes"),
pool.query("SELECT status,COUNT(*)::int total FROM solicitacoes GROUP BY status"),
pool.query("SELECT titulo,descricao,tipo FROM alertas WHERE ativo=true ORDER BY criado_em DESC LIMIT 5"),
pool.query("SELECT id,numero,solicitante,unidade,tipo,prioridade,prazo,status,insumo,quantidade FROM solicitacoes ORDER BY criado_em DESC LIMIT 8"),
pool.query("SELECT COUNT(*)::int total FROM estoques WHERE quantidade_atual <= estoque_minimo"),
pool.query("SELECT COUNT(*)::int total FROM contratos WHERE data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'"),
pool.query("SELECT COUNT(*)::int total FROM compras WHERE status NOT IN ('RECEBIDA','CANCELADA')")
]);
const by=Object.fromEntries(statuses.rows.map(x=>[x.status,x.total]));
res.json({total:tot.rows[0].total,emAndamento:(by.EM_ANALISE||0)+(by.EM_ANDAMENTO||0),concluidas:by.CONCLUIDA||0,atrasadas:by.ATRASADA||0,alerts:alerts.rows,ultimas:ult.rows,estoqueCritico:estoque.rows[0].total,contratosVencendo:contratos.rows[0].total,comprasAtivas:compras.rows[0].total});
}));
app.get("/api/materiais", asyncRoute(async (_req,res)=>{const r=await pool.query("SELECT * FROM materiais WHERE ativo=true ORDER BY nome");
res.json(r.rows.map(normalize));
}));
app.post("/api/materiais", asyncRoute(async (req,res)=>{const {codigo,nome,categoria,unidade_medida='un',estoque_minimo=0,estoque_maximo}=req.body;
if(!nome)return res.status(400).json({message:"Nome do material é obrigatório."});
const client=await pool.connect();
try{await client.query('BEGIN');
const r=await client.query(`INSERT INTO materiais(codigo,nome,categoria,unidade_medida,estoque_minimo,estoque_maximo) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[codigo||null,nome,categoria||null,unidade_medida,estoque_minimo,estoque_maximo||null]);
await client.query(`INSERT INTO estoques(insumo,unidade_medida,quantidade_atual,estoque_minimo,estoque_maximo,material_id) VALUES($1,$2,0,$3,$4,$5)`,[nome,unidade_medida,estoque_minimo,estoque_maximo||null,r.rows[0].id]);
await client.query('COMMIT');
res.status(201).json(normalize(r.rows[0]));
}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}));
app.get("/api/solicitacoes", asyncRoute(async (_req,res)=>{const r=await pool.query(`SELECT s.*,m.nome AS material_nome,m.codigo AS material_codigo FROM solicitacoes s LEFT JOIN materiais m ON m.id=s.material_id ORDER BY s.criado_em DESC`);
res.json(r.rows.map(normalize));
}));
app.get("/api/solicitacoes/:id", asyncRoute(async (req,res)=>{const r=await pool.query(`SELECT s.*,m.nome AS material_nome,m.codigo AS material_codigo FROM solicitacoes s LEFT JOIN materiais m ON m.id=s.material_id WHERE s.id=$1`,[req.params.id]);
if(!r.rowCount)return res.status(404).json({message:"Solicitação não encontrada"});
const h=await pool.query(`SELECT h.*,u.nome usuario FROM historico_processos h LEFT JOIN usuarios u ON u.id=h.usuario_id WHERE h.solicitacao_id=$1 ORDER BY h.data ASC`,[req.params.id]);
const x=normalize(r.rows[0]);
x.historico=h.rows;
res.json(x);
}));
app.post("/api/solicitacoes", asyncRoute(async (req,res)=>{const {solicitante,unidade,tipo,prioridade="NORMAL",insumo,material_id,quantidade,prazo,justificativa}=req.body;
if(!solicitante||!unidade||!tipo||(!insumo&&!material_id)||!quantidade||!justificativa)return res.status(400).json({message:"Preencha os campos obrigatórios."});
const client=await pool.connect();
try{await client.query("BEGIN");
let materialName=insumo||null;
if(material_id){const m=await client.query("SELECT nome FROM materiais WHERE id=$1 AND ativo=true",[material_id]);
if(!m.rowCount)throw new Error("Material não encontrado.");
materialName=m.rows[0].nome;
}const n=await client.query("SELECT 'SOL-'||LPAD((COALESCE(MAX(id),0)+1)::text,6,'0') numero FROM solicitacoes");
const r=await client.query(`INSERT INTO solicitacoes(numero,solicitante,unidade,tipo,prioridade,insumo,material_id,quantidade,prazo,justificativa,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'EM_ANALISE') RETURNING *`,[n.rows[0].numero,solicitante,unidade,tipo,prioridade,materialName,material_id||null,quantidade,prazo||null,justificativa]);
await client.query(`INSERT INTO historico_processos(solicitacao_id,acao,observacao) VALUES($1,'Solicitação criada','Solicitação registrada pelo usuário')`,[r.rows[0].id]);
await client.query("COMMIT");
res.status(201).json(normalize(r.rows[0]));
}catch(e){await client.query("ROLLBACK");
throw e;
}finally{client.release();
}}));
app.patch("/api/solicitacoes/:id", asyncRoute(async (req,res)=>{const allowed=['solicitante','unidade','tipo','prioridade','quantidade','prazo','justificativa'];
const data=req.body;
const sets=[],vals=[];
for(const k of allowed){if(data[k]!==undefined){sets.push(`${k}=$${vals.length+1}`);
vals.push(data[k]);
}}if(data.material_id!==undefined){const m=await pool.query("SELECT nome FROM materiais WHERE id=$1 AND ativo=true",[data.material_id]);
if(!m.rowCount)return res.status(400).json({message:"Material não encontrado."});
sets.push(`material_id=$${vals.length+1}`);
vals.push(data.material_id);
sets.push(`insumo=$${vals.length+1}`);
vals.push(m.rows[0].nome);
}if(!sets.length)return res.status(400).json({message:"Nenhuma alteração informada."});
vals.push(req.params.id);
const r=await pool.query(`UPDATE solicitacoes SET ${sets.join(',')},atualizado_em=NOW() WHERE id=$${vals.length} RETURNING *`,vals);
if(!r.rowCount)return res.status(404).json({message:"Solicitação não encontrada"});
await pool.query(`INSERT INTO historico_processos(solicitacao_id,acao,observacao) VALUES($1,'Solicitação atualizada','Dados da solicitação alterados')`,[req.params.id]);
res.json(normalize(r.rows[0]));
}));
app.delete("/api/solicitacoes/:id", asyncRoute(async (req,res)=>{const r=await pool.query("UPDATE solicitacoes SET status='CANCELADA',atualizado_em=NOW() WHERE id=$1 RETURNING *",[req.params.id]);
if(!r.rowCount)return res.status(404).json({message:"Solicitação não encontrada"});
await pool.query(`INSERT INTO historico_processos(solicitacao_id,acao,status_novo,observacao) VALUES($1,'Solicitação cancelada','CANCELADA','Cancelamento solicitado')`,[req.params.id]);
res.json(normalize(r.rows[0]));
}));
app.patch("/api/solicitacoes/:id/status", asyncRoute(async (req,res)=>{const {status,usuario_id=null,observacao=""}=req.body;
const valid=['EM_ANALISE','EM_ANDAMENTO','CONCLUIDA','ATRASADA','PENDENTE','REJEITADA','CANCELADA'];
if(!valid.includes(status))return res.status(400).json({message:"Status inválido."});
const client=await pool.connect();
try{await client.query("BEGIN");
const old=await client.query("SELECT status FROM solicitacoes WHERE id=$1 FOR UPDATE",[req.params.id]);
if(!old.rowCount){await client.query("ROLLBACK");
return res.status(404).json({message:"Solicitação não encontrada"});
}const r=await client.query("UPDATE solicitacoes SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *",[status,req.params.id]);
await client.query(`INSERT INTO historico_processos(solicitacao_id,usuario_id,acao,status_anterior,status_novo,observacao) VALUES($1,$2,$3,$4,$5,$6)`,[req.params.id,usuario_id,status==='REJEITADA'?'Solicitação rejeitada':'Status atualizado',old.rows[0].status,status,observacao]);
await client.query("COMMIT");
res.json(normalize(r.rows[0]));
}catch(e){await client.query("ROLLBACK");
throw e;
}finally{client.release();
}}));
app.get("/api/estoques", asyncRoute(async (_req,res)=>{const r=await pool.query(`SELECT e.*,m.nome material_nome,m.codigo material_codigo FROM estoques e LEFT JOIN materiais m ON m.id=e.material_id ORDER BY CASE WHEN e.quantidade_atual<=e.estoque_minimo THEN 0 ELSE 1 END,e.insumo`);
res.json(r.rows.map(normalize));
}));
app.post("/api/estoques/movimentacoes", asyncRoute(async (req,res)=>{const {estoque_id,tipo,quantidade,observacao,usuario_id=null}=req.body;
const q=Number(quantidade);
if(!estoque_id||!['ENTRADA','SAIDA','AJUSTE'].includes(tipo)||q<=0)return res.status(400).json({message:"Dados de movimentação inválidos."});
const client=await pool.connect();
try{await client.query('BEGIN');
const old=await client.query('SELECT * FROM estoques WHERE id=$1 FOR UPDATE',[estoque_id]);
if(!old.rowCount)throw new Error('Estoque não encontrado.');
const atual=Number(old.rows[0].quantidade_atual);
const novo=tipo==='ENTRADA'?atual+q:tipo==='SAIDA'?atual-q:q;
if(novo<0)throw new Error('A saída não pode deixar o estoque negativo.');
const up=await client.query('UPDATE estoques SET quantidade_atual=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *',[novo,estoque_id]);
await client.query(`INSERT INTO movimentacoes_estoque(estoque_id,material_id,tipo,quantidade,saldo_anterior,saldo_novo,observacao,usuario_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[estoque_id,old.rows[0].material_id,tipo,q,atual,novo,observacao||null,usuario_id]);
await client.query('COMMIT');
res.json(normalize(up.rows[0]));
}catch(e){await client.query('ROLLBACK');
throw e;
}finally{client.release();
}}));
app.get("/api/estoques/movimentacoes", asyncRoute(async (_req,res)=>{const r=await pool.query(`SELECT mv.*,e.insumo,m.nome material_nome FROM movimentacoes_estoque mv LEFT JOIN estoques e ON e.id=mv.estoque_id LEFT JOIN materiais m ON m.id=mv.material_id ORDER BY mv.criado_em DESC LIMIT 200`);
res.json(r.rows.map(normalize));
}));
app.get("/api/fornecedores", asyncRoute(async (_req,res)=>{const r=await pool.query("SELECT * FROM fornecedores WHERE ativo=true ORDER BY nome");
res.json(r.rows);
}));
app.post("/api/fornecedores", asyncRoute(async (req,res)=>{const {nome,documento,contato,email,telefone}=req.body;
if(!nome)return res.status(400).json({message:'Nome é obrigatório.'});
const r=await pool.query(`INSERT INTO fornecedores(nome,documento,contato,email,telefone) VALUES($1,$2,$3,$4,$5) RETURNING *`,[nome,documento||null,contato||null,email||null,telefone||null]);
res.status(201).json(r.rows[0]);
}));
app.get("/api/compras", asyncRoute(async (_req,res)=>{const r=await pool.query(`SELECT c.*,f.nome fornecedor_nome,s.numero solicitacao_numero FROM compras c LEFT JOIN fornecedores f ON f.id=c.fornecedor_id LEFT JOIN solicitacoes s ON s.id=c.solicitacao_id ORDER BY c.criado_em DESC`);
res.json(r.rows.map(normalize));
}));
app.post("/api/compras", asyncRoute(async (req,res)=>{const {solicitacao_id,fornecedor_id,valor=0,previsao_entrega,status='EM_COTACAO',observacao}=req.body;
const n=await pool.query("SELECT 'COMP-'||LPAD((COALESCE(MAX(id),0)+1)::text,5,'0') numero FROM compras");
const r=await pool.query(`INSERT INTO compras(solicitacao_id,fornecedor_id,numero,valor,previsao_entrega,status,observacao) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[solicitacao_id||null,fornecedor_id||null,n.rows[0].numero,valor,previsao_entrega||null,status,observacao||null]);
res.status(201).json(normalize(r.rows[0]));
}));
app.patch("/api/compras/:id/status", asyncRoute(async (req,res)=>{const r=await pool.query("UPDATE compras SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *",[req.body.status,req.params.id]);
if(!r.rowCount)return res.status(404).json({message:'Compra não encontrada.'});
res.json(normalize(r.rows[0]));
}));
app.get("/api/contratos", asyncRoute(async (_req,res)=>{const r=await pool.query(`SELECT c.*,f.nome fornecedor_nome FROM contratos c LEFT JOIN fornecedores f ON f.id=c.fornecedor_id ORDER BY c.data_fim`);
res.json(r.rows);
}));
app.post("/api/contratos", asyncRoute(async (req,res)=>{let {numero,fornecedor,fornecedor_id,objeto,data_inicio,data_fim,valor=0,status='EM_VIGENCIA'}=req.body;
if(!numero||!objeto||!data_inicio||!data_fim)return res.status(400).json({message:'Preencha os campos obrigatórios.'});
if(fornecedor_id){const f=await pool.query('SELECT nome FROM fornecedores WHERE id=$1 AND ativo=true',[fornecedor_id]);
if(!f.rowCount)return res.status(400).json({message:'Fornecedor não encontrado.'});
fornecedor=f.rows[0].nome;}
if(!fornecedor)return res.status(400).json({message:'Fornecedor é obrigatório.'});
if(new Date(data_fim)<new Date(data_inicio))return res.status(400).json({message:'A data de fim não pode ser anterior à data de início.'});
const r=await pool.query(`INSERT INTO contratos(numero,fornecedor,fornecedor_id,objeto,data_inicio,data_fim,valor,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[numero,fornecedor,fornecedor_id||null,objeto,data_inicio,data_fim,valor,status]);
res.status(201).json(r.rows[0]);
}));
app.get("/api/pagamentos", asyncRoute(async (_req,res)=>{const r=await pool.query("SELECT * FROM pagamentos ORDER BY vencimento");
res.json(r.rows.map(normalize));
}));
app.patch("/api/pagamentos/:id/pago", asyncRoute(async (req,res)=>{const r=await pool.query("UPDATE pagamentos SET status='PAGO',pago_em=CURRENT_DATE WHERE id=$1 RETURNING *",[req.params.id]);
if(!r.rowCount)return res.status(404).json({message:'Pagamento não encontrado.'});
res.json(normalize(r.rows[0]));
}));
app.get("/api/relatorios/resumo", asyncRoute(async (_req,res)=>{const [s,e,c,p,b]=await Promise.all([pool.query("SELECT status,COUNT(*)::int total FROM solicitacoes GROUP BY status"),pool.query("SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE quantidade_atual<=estoque_minimo)::int criticos FROM estoques"),pool.query("SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE+INTERVAL '30 days')::int vencendo FROM contratos"),pool.query("SELECT COUNT(*)::int total,COALESCE(SUM(valor),0) valor FROM pagamentos WHERE status='PENDENTE'"),pool.query("SELECT COUNT(*)::int total FROM compras WHERE status NOT IN ('RECEBIDA','CANCELADA')")]);
res.json({solicitacoes:s.rows,estoque:e.rows[0],contratos:c.rows[0],pagamentos:p.rows[0],compras:b.rows[0]});
}));
app.get("/api/alertas", asyncRoute(async (_req,res)=>{const r=await pool.query("SELECT * FROM alertas WHERE ativo=true ORDER BY criado_em DESC");
res.json(r.rows);
}));
app.get("/api/usuarios", asyncRoute(async (_req,res)=>{const r=await pool.query("SELECT id,nome,email,perfil,ativo,criado_em FROM usuarios ORDER BY nome");
res.json(r.rows);
}));
ensureExtensions().then(()=>app.listen(PORT,()=>console.log(`API PRF rodando na porta ${PORT}`))).catch(e=>{console.error("Falha ao preparar banco:",e);process.exit(1);});
