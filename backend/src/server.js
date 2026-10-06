const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Em produção, defina FRONTEND_URL com a URL da Vercel.
// Para a apresentação, CORS aberto é aceitável; depois pode ser restringido.
const frontendUrl = process.env.FRONTEND_URL;
app.use(cors(frontendUrl ? { origin: frontendUrl } : undefined));
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL não definida. Configure a variável no Render ou no arquivo .env local.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

function normalize(row){
  if(!row) return null;
  return {
    ...row,
    quantidade: row.quantidade != null ? Number(row.quantidade) : row.quantidade
  };
}

app.get("/api/health", async (_req,res)=>{
  try{
    await pool.query("SELECT 1");
    res.json({ok:true, database:"connected", environment: process.env.NODE_ENV || "development"});
  }catch(e){
    console.error("Health check:", e.message);
    res.status(503).json({ok:false,message:"Banco indisponível"});
  }
});

app.get("/api/dashboard", async (_req,res)=>{
  try{
    const [tot, statuses, alerts, ult, estoque, contratos] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM solicitacoes"),
      pool.query(`SELECT status, COUNT(*)::int AS total FROM solicitacoes GROUP BY status`),
      pool.query(`SELECT titulo, descricao, tipo FROM alertas WHERE ativo=true ORDER BY criado_em DESC LIMIT 5`),
      pool.query(`SELECT s.id,s.numero,s.solicitante,s.unidade,s.tipo,s.prioridade,s.prazo,s.status
                  FROM solicitacoes s ORDER BY s.criado_em DESC LIMIT 8`),
      pool.query(`SELECT COUNT(*)::int AS total FROM estoques WHERE quantidade_atual <= estoque_minimo`),
      pool.query(`SELECT COUNT(*)::int AS total FROM contratos
                  WHERE data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`)
    ]);
    const by = Object.fromEntries(statuses.rows.map(x=>[x.status,x.total]));
    res.json({
      total: tot.rows[0].total,
      emAndamento: (by.EM_ANALISE||0)+(by.EM_ANDAMENTO||0),
      concluidas: by.CONCLUIDA||0,
      atrasadas: by.ATRASADA||0,
      alerts: alerts.rows,
      ultimas: ult.rows,
      estoqueCritico: estoque.rows[0].total,
      contratosVencendo: contratos.rows[0].total
    });
  }catch(e){console.error(e);res.status(500).json({message:"Erro ao carregar dashboard"});}
});

app.get("/api/materiais", async (_req,res)=>{
  try{
    const r=await pool.query(`SELECT id, insumo AS nome, unidade_medida, quantidade_atual, estoque_minimo
                              FROM estoques ORDER BY insumo ASC`);
    res.json(r.rows);
  }catch(e){console.error(e);res.status(500).json({message:"Erro ao listar insumos"});}
});

app.get("/api/solicitacoes", async (_req,res)=>{
  try{
    const r=await pool.query(`SELECT id,numero,solicitante,unidade,tipo,prioridade,insumo,insumo AS insumo_nome,quantidade,prazo,status
                              FROM solicitacoes ORDER BY criado_em DESC`);
    res.json(r.rows.map(normalize));
  }catch(e){console.error(e);res.status(500).json({message:"Erro ao listar solicitações"});}
});

app.get("/api/solicitacoes/:id", async (req,res)=>{
  try{
    const r=await pool.query(`SELECT * FROM solicitacoes WHERE id=$1`,[req.params.id]);
    if(!r.rowCount)return res.status(404).json({message:"Solicitação não encontrada"});
    const h=await pool.query(`SELECT h.*,u.nome AS usuario FROM historico_processos h
                              LEFT JOIN usuarios u ON u.id=h.usuario_id
                              WHERE h.solicitacao_id=$1 ORDER BY h.data ASC`,[req.params.id]);
    const x=normalize(r.rows[0]);x.insumo_nome=x.insumo||x.insumo_nome||"Não informado";x.historico=h.rows;res.json(x);
  }catch(e){console.error(e);res.status(500).json({message:"Erro ao consultar solicitação"});}
});

app.post("/api/solicitacoes", async (req,res)=>{
  const {solicitante,unidade,tipo,prioridade="NORMAL",insumo,quantidade,prazo,justificativa}=req.body;
  if(!solicitante||!unidade||!tipo||!insumo||!quantidade||!justificativa)
    return res.status(400).json({message:"Preencha os campos obrigatórios."});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const n=await client.query(`SELECT 'SOL-'||LPAD((COALESCE(MAX(id),0)+1)::text,6,'0') numero FROM solicitacoes`);
    const numero=n.rows[0].numero;
    const r=await client.query(`INSERT INTO solicitacoes
      (numero,solicitante,unidade,tipo,prioridade,insumo,quantidade,prazo,justificativa,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'EM_ANALISE') RETURNING *`,
      [numero,solicitante,unidade,tipo,prioridade,insumo,quantidade,prazo||null,justificativa]);
    await client.query(`INSERT INTO historico_processos(solicitacao_id,acao,observacao)
                        VALUES($1,'Solicitação criada','Solicitação registrada pelo usuário')`,[r.rows[0].id]);
    await client.query("COMMIT");
    res.status(201).json(normalize(r.rows[0]));
  }catch(e){
    await client.query("ROLLBACK");console.error(e);
    res.status(500).json({message:"Não foi possível criar a solicitação."});
  }finally{client.release();}
});

app.patch("/api/solicitacoes/:id/status", async (req,res)=>{
  const {status,usuario_id=null,observacao=""}=req.body;
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const old=await client.query("SELECT status FROM solicitacoes WHERE id=$1 FOR UPDATE",[req.params.id]);
    if(!old.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Solicitação não encontrada"});}
    const r=await client.query("UPDATE solicitacoes SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *",[status,req.params.id]);
    await client.query(`INSERT INTO historico_processos(solicitacao_id,usuario_id,acao,status_anterior,status_novo,observacao)
                        VALUES($1,$2,'Status atualizado',$3,$4,$5)`,
                        [req.params.id,usuario_id,old.rows[0].status,status,observacao]);
    await client.query("COMMIT");res.json(normalize(r.rows[0]));
  }catch(e){await client.query("ROLLBACK");console.error(e);res.status(500).json({message:"Erro ao atualizar status"});}
  finally{client.release();}
});

app.get("/api/estoques", async (_req,res)=>{
  try{const r=await pool.query(`SELECT * FROM estoques ORDER BY quantidade_atual/NULLIF(estoque_minimo,0) ASC`);res.json(r.rows);}
  catch(e){console.error(e);res.status(500).json({message:"Erro ao consultar estoque"});}
});

app.listen(PORT,()=>console.log(`API PRF rodando na porta ${PORT}`));
