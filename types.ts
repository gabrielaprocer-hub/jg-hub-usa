export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  is_admin: boolean
  created_at: string
}

export interface Order {
  id: string
  client_id: string
  order_code: string
  product_name: string
  store_name: string
  product_url: string | null
  product_image_url: string | null
  size: string
  color: string
  quantity: number
  price_usd: number
  exchange_rate: number
  service_fee: number
  shipping_cost: number
  tracking_code: string | null
  current_status: number
  client_notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderSummary extends Order {
  client_name: string
  client_email: string
  client_phone: string | null
  total_brl: number
  total_paid: number
  total_pending: number
}

export interface StatusHistory {
  id: string
  order_id: string
  status_id: number
  updated_by: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: string
  status: string
  proof_url: string | null
  paid_at: string
}

export const STATUSES = [
  { id: 1, label: 'Pedido recebido', icon: '📋', color: '#6B7280' },
  { id: 2, label: 'Aguardando pagamento', icon: '⏳', color: '#F59E0B' },
  { id: 3, label: 'Pagamento confirmado', icon: '✅', color: '#10B981' },
  { id: 4, label: 'Compra realizada nos EUA', icon: '🛒', color: '#3B82F6' },
  { id: 5, label: 'Recebido no endereço EUA', icon: '📦', color: '#8B5CF6' },
  { id: 6, label: 'Em separação', icon: '📑', color: '#EC4899' },
  { id: 7, label: 'Enviado ao Brasil', icon: '✈️', color: '#0EA5E9' },
  { id: 8, label: 'Em trânsito', icon: '🚚', color: '#F97316' },
  { id: 9, label: 'Saiu para entrega', icon: '🏍️', color: '#14B8A6' },
  { id: 10, label: 'Entregue', icon: '🎉', color: '#22C55E' },
]

export const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtUsd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
export const totalBrl = (o: Order | OrderSummary) => o.price_usd * o.exchange_rate * o.quantity + o.service_fee + o.shipping_cost
