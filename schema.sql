-- ============================================================
-- JG HUB USA — Supabase Schema
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- Dashboard > SQL Editor > New query > Colar > Run
-- ============================================================

-- 1. TABELA DE CLIENTES (perfil estendido vinculado ao auth.users)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE PEDIDOS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  product_url TEXT,
  product_image_url TEXT,
  size TEXT DEFAULT '—',
  color TEXT DEFAULT '—',
  quantity INT DEFAULT 1,
  price_usd NUMERIC(10,2) NOT NULL,
  exchange_rate NUMERIC(6,2) NOT NULL DEFAULT 5.72,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  tracking_code TEXT,
  current_status INT NOT NULL DEFAULT 1,
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HISTÓRICO DE STATUS
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status_id INT NOT NULL,
  updated_by TEXT DEFAULT 'admin',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAGAMENTOS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'Pix',
  status TEXT NOT NULL DEFAULT 'confirmed',
  proof_url TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTAS DO PEDIDO (cliente + internas)
CREATE TABLE public.order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  author TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDICAÇÕES (futuro)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.clients(id),
  referred_id UUID REFERENCES public.clients(id),
  coupon_code TEXT,
  reward_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(current_status);
CREATE INDEX idx_orders_code ON public.orders(order_code);
CREATE INDEX idx_status_history_order ON public.order_status_history(order_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_notes_order ON public.order_notes(order_id);

-- ============================================================
-- FUNÇÃO: auto-atualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FUNÇÃO: ao inserir status_history, atualiza current_status do pedido
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_order_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET current_status = NEW.status_id
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_status_on_insert
  AFTER INSERT ON public.order_status_history
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_status();

-- ============================================================
-- FUNÇÃO: gerar order_code sequencial (JG-2026-001, JG-2026-002...)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_seq INT;
BEGIN
  IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
    current_year := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(order_code, '-', 3) AS INT)
    ), 0) + 1
    INTO next_seq
    FROM public.orders
    WHERE order_code LIKE 'JG-' || current_year || '-%';
    
    NEW.order_code := 'JG-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_code();

-- ============================================================
-- FUNÇÃO: ao criar pedido, inserir status inicial automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_first_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.order_status_history (order_id, status_id, updated_by)
  VALUES (NEW.id, 1, 'sistema');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_status_on_order_create
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_first_status();

-- ============================================================
-- ROW LEVEL SECURITY
-- Cliente só vê seus próprios dados, admin vê tudo
-- ============================================================

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients: users read own profile"
  ON public.clients FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Clients: admins read all"
  ON public.clients FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Clients: admins insert"
  ON public.clients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Clients: admins update"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders: clients read own"
  ON public.orders FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Orders: admins full access select"
  ON public.orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Orders: admins insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Orders: admins update"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Orders: admins delete"
  ON public.orders FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Status History
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status: clients read own orders"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.client_id = auth.uid())
  );

CREATE POLICY "Status: admins full access"
  ON public.order_status_history FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments: clients read own"
  ON public.payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.client_id = auth.uid())
  );

CREATE POLICY "Payments: admins full access"
  ON public.payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Notes (internas só para admin, públicas para o cliente)
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes: clients read non-internal"
  ON public.order_notes FOR SELECT
  USING (
    is_internal = FALSE AND
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.client_id = auth.uid())
  );

CREATE POLICY "Notes: admins full access"
  ON public.order_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals: clients read own"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Referrals: admins full access"
  ON public.referrals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- STORAGE BUCKET para fotos de produtos e comprovantes
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Product images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Product images: admins upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Payment proofs: owner + admin read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs' AND (
      EXISTS (SELECT 1 FROM public.clients WHERE id = auth.uid() AND is_admin = TRUE)
      OR (auth.uid()::TEXT = (storage.foldername(name))[1])
    )
  );

CREATE POLICY "Payment proofs: clients upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================
-- VIEW: resumo do pedido com totais (facilita queries no frontend)
-- ============================================================
CREATE OR REPLACE VIEW public.order_summary AS
SELECT
  o.id,
  o.order_code,
  o.client_id,
  c.name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  o.product_name,
  o.store_name,
  o.product_url,
  o.product_image_url,
  o.size,
  o.color,
  o.quantity,
  o.price_usd,
  o.exchange_rate,
  o.service_fee,
  o.shipping_cost,
  (o.price_usd * o.exchange_rate * o.quantity + o.service_fee + o.shipping_cost) AS total_brl,
  COALESCE(
    (SELECT SUM(p.amount) FROM public.payments p WHERE p.order_id = o.id AND p.status = 'confirmed'),
    0
  ) AS total_paid,
  (o.price_usd * o.exchange_rate * o.quantity + o.service_fee + o.shipping_cost) -
  COALESCE(
    (SELECT SUM(p.amount) FROM public.payments p WHERE p.order_id = o.id AND p.status = 'confirmed'),
    0
  ) AS total_pending,
  o.tracking_code,
  o.current_status,
  o.client_notes,
  o.created_at,
  o.updated_at
FROM public.orders o
JOIN public.clients c ON c.id = o.client_id;

-- ============================================================
-- PRONTO! Agora crie o usuário admin pelo Supabase Dashboard:
-- Authentication > Users > Create user
-- Depois insira na tabela clients com is_admin = TRUE
-- ============================================================
