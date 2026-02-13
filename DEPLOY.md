# Deploy: Operação Bolo no Pote

Guia para colocar o projeto no GitHub e publicar na Vercel com variáveis de ambiente seguras.

---

## 1. Variáveis de ambiente (Supabase)

As chaves do Supabase **não ficam mais no código**. Elas são usadas assim:

- **No seu computador (desenvolvimento):** o arquivo `config.js` é carregado na página. Esse arquivo **não é commitado** (está no `.gitignore`).
- **Na Vercel (produção):** o build gera o `config.js` a partir das variáveis que você configurar no painel da Vercel.

### No seu PC (antes de subir para o GitHub)

1. Copie o exemplo de config:
   - Copie `config.example.js` e renomeie a cópia para **`config.js`**.
2. Abra `config.js` e troque pelos seus dados do Supabase:
   - `window.SUPABASE_URL` = URL do projeto (ex.: `https://xxxxx.supabase.co`)
   - `window.SUPABASE_ANON_KEY` = chave **anon public** (a longa que começa com `eyJ...`)
3. **Não commite** `config.js`. Ele já está no `.gitignore`.

Assim você continua desenvolvendo e testando normalmente; o repositório nunca terá suas chaves.

### Na Vercel (depois de conectar o projeto)

Você vai configurar as **mesmas** informações como variáveis de ambiente no site da Vercel (passo 4 abaixo). O script de build usa essas variáveis para gerar o `config.js` no deploy, sem expor as chaves no código público.

---

## 2. GitHub — criar repositório e primeiro push

### 2.1 Instalar Git (se ainda não tiver)

- Baixe em: https://git-scm.com/downloads  
- Instale e, se quiser, use “Git Bash” ou o terminal do Cursor.

### 2.2 Abrir o projeto no terminal

- No Cursor: **Terminal → New Terminal** (ou `Ctrl+'`).
- Navegue até a pasta do projeto, por exemplo:
  ```bash
  cd C:\Users\Thiag\Downloads\bolos
  ```

### 2.3 Inicializar o Git no projeto

```bash
git init
```

### 2.4 Adicionar todos os arquivos e fazer o primeiro commit

```bash
git add .
git status
```

- Confira se **não** aparece `config.js` na lista (ele deve ser ignorado pelo `.gitignore`).  
- Se aparecer, **não** dê `git add config.js`; deixe só o que o `git add .` adicionou (sem o `config.js`).

Depois:

```bash
git commit -m "Primeiro commit: Operação Bolo no Pote com Supabase"
```

### 2.5 Criar o repositório no GitHub

1. Acesse: https://github.com/new  
2. **Repository name:** por exemplo `bolo-no-pote` (ou o nome que quiser).  
3. Deixe **Public**.  
4. **Não** marque “Add a README” nem “Add .gitignore” (o projeto já tem).  
5. Clique em **Create repository**.

### 2.6 Conectar o projeto ao repositório e enviar o código

O GitHub vai mostrar comandos. Use estes (troque `SEU_USUARIO` pelo seu usuário do GitHub):

```bash
git remote add origin https://github.com/SEU_USUARIO/bolo-no-pote.git
git branch -M main
git push -u origin main
```

- Se pedir login, use sua conta GitHub (ou um Personal Access Token, se tiver 2FA).  
- Depois do `git push`, o código estará no GitHub.

---

## 3. Vercel — importar o projeto e gerar o link

### 3.1 Acessar a Vercel

- Abra: https://vercel.com  
- Faça login (pode ser com a conta do GitHub).

### 3.2 Importar o repositório

1. No dashboard, clique em **“Add New…”** → **“Project”**.  
2. Em **“Import Git Repository”**, escolha o repositório **bolo-no-pote** (ou o nome que você deu).  
3. Clique em **“Import”**.

### 3.3 Configurar o projeto

Na tela de configuração:

- **Framework Preset:** deixe **Other** (ou “None”).  
- **Root Directory:** deixe em branco (raiz do repositório).  
- **Build Command:** `npm run build`  
- **Output Directory:** deixe em branco (a raiz é o “output”).  
- **Install Command:** pode deixar o padrão (`npm install`).

Não clique em **Deploy** ainda.

### 3.4 Adicionar variáveis de ambiente

1. Expanda a seção **“Environment Variables”**.  
2. Adicione duas variáveis (uma por vez):

   - **Name:** `SUPABASE_URL`  
     **Value:** `https://ncmunahogkjfxqjwgnnm.supabase.co`  
     (ou a URL do seu projeto Supabase)  
     Marque **Production** (e, se quiser, Preview).

   - **Name:** `SUPABASE_ANON_KEY`  
     **Value:** sua chave anon (a longa que começa com `eyJ...`)  
     Marque **Production** (e, se quiser, Preview).

3. Clique em **Deploy**.

### 3.5 Link final

- A Vercel vai fazer o build e o deploy.  
- Quando terminar, ela mostra a **URL do projeto**, algo como:
  - `https://bolo-no-pote-xxxx.vercel.app`  
  ou o domínio que você configurou.  
- Esse é o link para acessar o dashboard online.

---

## 4. Resumo rápido

| Onde              | O que fazer |
|-------------------|------------|
| **PC**            | Ter `config.js` (copiado de `config.example.js`) com URL e Anon Key; não commitar. |
| **GitHub**        | Repositório novo → `git init`, `git add .`, `git commit`, `git remote add origin`, `git push`. |
| **Vercel**        | Importar o repo → Build: `npm run build` → Variáveis: `SUPABASE_URL` e `SUPABASE_ANON_KEY` → Deploy. |

Se algo falhar no build da Vercel ou no carregamento do Supabase, confira se as duas variáveis estão corretas no painel do projeto na Vercel.
