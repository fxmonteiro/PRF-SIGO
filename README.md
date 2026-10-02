# PRF — Gestão de Suprimentos

Protótipo funcional preparado para apresentação online com **Vercel + Render + Neon**.

## Arquitetura

- `frontend/` → interface HTML/CSS/JS hospedada na Vercel.
- `backend/` → API Node.js/Express hospedada no Render.
- `database/schema.sql` → estrutura e dados iniciais do PostgreSQL.
- Neon → PostgreSQL na nuvem.

## 1. Desenvolvimento local

Você já precisa apenas do Node.js. Não é necessário Docker para este fluxo.

No terminal:

```bash
cd backend
npm install
```

Configure `backend/.env` com uma conexão PostgreSQL. Para usar o Neon localmente, copie a connection string fornecida pelo Neon:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://...neon.tech/...?...sslmode=require
FRONTEND_URL=http://localhost:5500
```

Execute o `database/schema.sql` no banco Neon e depois:

```bash
npm start
```

A API estará em `http://localhost:3000`.

Para abrir o frontend, a partir da pasta `frontend`:

```bash
npx serve .
```

O `frontend/config.js` aponta inicialmente para `http://localhost:3000/api`.

## 2. Criar o banco no Neon

1. Crie uma conta no Neon.
2. Crie um projeto PostgreSQL.
3. Copie a connection string.
4. Abra o SQL Editor do Neon.
5. Cole o conteúdo de `database/schema.sql`.
6. Execute.

Guarde a connection string para configurar o Render. Ela é uma credencial e não deve ser publicada no GitHub.

## 3. Publicar o backend no Render

O arquivo `render.yaml` já está preparado.

No Render:

1. Crie um novo Web Service ligado ao repositório GitHub.
2. Use a pasta `backend` como Root Directory (se o Render não importar o Blueprint automaticamente).
3. Build Command: `npm install`.
4. Start Command: `npm start`.
5. Configure `DATABASE_URL` com a connection string do Neon.
6. Depois que a Vercel estiver publicada, configure `FRONTEND_URL` com a URL da Vercel.

Teste:

```text
https://SEU-ENDERECO.onrender.com/api/health
```

O resultado esperado é JSON com `ok: true` e `database: "connected"`.

## 4. Publicar o frontend na Vercel

No GitHub, suba o projeto inteiro. Na Vercel:

1. Importe o repositório.
2. Defina **Root Directory** como `frontend`.
3. Não é necessário instalar Node no frontend.
4. Faça o Deploy.

Depois de obter a URL pública do Render, edite `frontend/config.js`:

```js
window.APP_CONFIG = {
  API_BASE: "https://SEU-ENDERECO.onrender.com/api"
};
```

Faça um novo commit/push. A Vercel fará o novo deploy automaticamente.

## 5. Ordem recomendada para a apresentação

1. Criar o projeto no Neon e executar `schema.sql`.
2. Subir o repositório no GitHub.
3. Publicar o backend no Render.
4. Testar `/api/health`.
5. Colocar a URL do Render em `frontend/config.js`.
6. Publicar o frontend na Vercel.
7. Testar pelo computador e pelo celular.

## Funcionalidades já conectadas ao banco

- Dashboard.
- Criação de solicitações.
- Lista de solicitações.
- Detalhe da solicitação.
- Histórico de criação.
- Alteração de status pela API.
- Consulta de estoque.
- Indicadores de estoque crítico e contratos próximos do vencimento.

Os demais módulos continuam como áreas preparadas para expansão, o que é suficiente para esta versão de apresentação.
