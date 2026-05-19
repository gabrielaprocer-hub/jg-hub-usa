# JG Hub USA 🇺🇸

Plataforma de acompanhamento de compras internacionais dos EUA para o Brasil.

## Setup rápido (15 minutos)

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Nome: `jg-hub-usa`
3. Região: **South America (São Paulo)**
4. Anote a senha do banco

### 2. Rodar o SQL

1. No Supabase → **SQL Editor** → **New query**
2. Cole o conteúdo inteiro do arquivo `supabase/schema.sql`
3. Clique **Run**

### 3. Criar usuário admin

1. **Authentication** → **Users** → **Add user** → **Create new user**
   - Email: seu email (ex: `admin@jghubusa.com`)
   - Password: sua senha
   - ✅ Auto Confirm User
2. Copie o **User UID**
3. **Table Editor** → tabela `clients` → **Insert row**:
   - `id`: UID copiado
   - `name`: Seu Nome
   - `email`: mesmo email
   - `phone`: seu WhatsApp
   - `is_admin`: `true`

### 4. Pegar credenciais

1. **Settings** → **API**
2. Copie: **Project URL** e **anon public key**

### 5. Deploy na Vercel

1. Suba este projeto para o GitHub
2. No [vercel.com](https://vercel.com) → **Import** → selecione o repositório
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua anon key
4. Clique **Deploy**
5. (Opcional) Adicione domínio em **Settings** → **Domains**

### 6. Habilitar Realtime no Supabase

1. **Database** → **Replication**
2. Em "Realtime", ative as tabelas: `orders`, `order_status_history`, `payments`
3. Isso faz o painel do cliente atualizar automaticamente quando você muda um status

---

## Operação diária

### Criar um cliente

1. **Authentication** → **Users** → **Add user**
   - Email e senha do cliente
   - ✅ Auto Confirm User
2. Copie o UID
3. **Table Editor** → `clients` → **Insert row** com os dados

### Criar um pedido

**Table Editor** → `orders` → **Insert row**:
- `client_id`: UID do cliente
- `order_code`: deixe vazio (gera automático)
- `product_name`: ex: "New Balance 2002R"
- `store_name`: ex: "New Balance US"
- `price_usd`: preço em dólar
- `exchange_rate`: cotação do dia
- `service_fee`: sua taxa
- `shipping_cost`: custo de envio
- Os demais campos: preencha conforme necessário

### Atualizar status

**Table Editor** → `order_status_history` → **Insert row**:
- `order_id`: ID do pedido
- `status_id`: número do status (ver abaixo)
- `updated_by`: seu nome

Ou: faça login como admin no site e clique "Avançar status" no pedido.

| ID | Status |
|----|--------|
| 1 | Pedido recebido |
| 2 | Aguardando pagamento |
| 3 | Pagamento confirmado |
| 4 | Compra realizada nos EUA |
| 5 | Recebido no endereço EUA |
| 6 | Em separação |
| 7 | Enviado ao Brasil |
| 8 | Em trânsito |
| 9 | Saiu para entrega |
| 10 | Entregue |

### Registrar pagamento

**Table Editor** → `payments` → **Insert row**:
- `order_id`: ID do pedido
- `amount`: valor em R$
- `method`: Pix
- `status`: confirmed

### Enviar acesso ao cliente

```
Oi [nome]! Seu pedido já está no sistema 🇺🇸
Acesse: https://seusite.vercel.app
Login: [email]
Senha: [senha]
Qualquer dúvida, me chama aqui!
```

---

## Dev local

```bash
npm install
cp .env.local.example .env.local
# Preencha com suas credenciais do Supabase
npm run dev
```

## Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deploy**: Vercel
- **Custo**: ~R$ 0/mês (free tiers)
