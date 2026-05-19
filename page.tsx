'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Client, Order, OrderSummary, StatusHistory, Payment, STATUSES, fmt, fmtUsd, totalBrl } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

// ─── SHARED COMPONENTS ───────────────────────────────────────────────
function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-tight"
      style={{ background: `${color}14`, color }}>
      {text}
    </span>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold tracking-tight leading-none" style={{ color: accent || '#1D1D1F' }}>{value}</span>
    </div>
  )
}

function Timeline({ statusHistory, currentStatus }: { statusHistory: StatusHistory[]; currentStatus: number }) {
  return (
    <div className="flex flex-col">
      {STATUSES.map((s, i) => {
        const entry = statusHistory.find(h => h.status_id === s.id)
        const done = !!entry
        const isCurrent = s.id === currentStatus
        const isFuture = s.id > currentStatus
        return (
          <div key={s.id} className="flex gap-4 items-start">
            <div className="flex flex-col items-center w-8 shrink-0">
              <div className={`flex items-center justify-center rounded-full relative z-10 transition-all duration-300 ${isCurrent ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'}`}
                style={{
                  background: done || isCurrent ? `${s.color}18` : '#F5F5F7',
                  border: isCurrent ? `2.5px solid ${s.color}` : done ? `2px solid ${s.color}50` : '1.5px solid #E5E5EA',
                  boxShadow: isCurrent ? `0 0 0 4px ${s.color}15` : 'none',
                }}>
                {done || isCurrent ? <span>{s.icon}</span> : <span className="text-[10px] text-gray-400">•</span>}
              </div>
              {i < STATUSES.length - 1 && (
                <div className="w-0.5 h-8 transition-colors" style={{ background: done && !isCurrent ? `${s.color}40` : '#F0F0F2' }} />
              )}
            </div>
            <div className={`${i < STATUSES.length - 1 ? 'pb-3' : ''} ${isCurrent ? 'pt-1' : 'pt-0.5'}`}>
              <div className={`${isCurrent ? 'text-[15px] font-bold' : done ? 'text-sm font-medium' : 'text-sm'} tracking-tight`}
                style={{ color: isFuture ? '#AEAEB2' : '#1D1D1F' }}>
                {s.label}
                {isCurrent && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full animate-pulse2" style={{ background: s.color }} />}
              </div>
              {entry && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(entry.updated_at).toLocaleDateString('pt-BR')} às {new Date(entry.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── NAV ─────────────────────────────────────────────────────────────
function Nav({ page, setPage, isLoggedIn, isAdmin, onLogout }: {
  page: string; setPage: (p: string) => void; isLoggedIn: boolean; isAdmin: boolean; onLogout: () => void
}) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 px-6 ${scrolled ? 'bg-[#fafafa]/85 border-b border-gray-200' : 'bg-[#fafafa]/95 border-b border-transparent'}`}>
      <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setPage('landing')}>
          <div className="w-9 h-9 rounded-[10px] bg-[#0A0A0A] flex items-center justify-center text-white text-sm font-extrabold">JG</div>
          <span className="text-lg font-bold tracking-tight text-[#1D1D1F]">Hub USA</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoggedIn && !isAdmin && (
            <>
              <button onClick={() => setPage('login')} className="px-5 py-2 rounded-[10px] bg-[#0A0A0A] text-white text-sm font-semibold transition-opacity hover:opacity-85">
                Entrar
              </button>
            </>
          )}
          {(isLoggedIn || isAdmin) && (
            <>
              {isAdmin && <Badge text="ADMIN" color="#0A0A0A" />}
              <button onClick={() => setPage(isAdmin ? 'admin' : 'dashboard')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900">
                {isAdmin ? 'Painel' : 'Meus Pedidos'}
              </button>
              <button onClick={onLogout} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm font-semibold text-[#1D1D1F] hover:bg-gray-50">
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── LANDING PAGE ────────────────────────────────────────────────────
function Landing({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="pt-24 pb-20 text-center px-6 max-w-[800px] mx-auto">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F5F5F7] text-sm text-gray-500 font-medium mb-8">
          🇺🇸 Seu concierge de compras nos Estados Unidos
        </div>
        <h1 className="font-display text-[clamp(36px,6vw,64px)] font-bold text-[#1D1D1F] leading-[1.08] tracking-tight mb-6">
          Compre nos EUA.<br /><em>Receba no Brasil.</em>
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed max-w-[560px] mx-auto mb-10 tracking-tight">
          Produtos americanos originais com acompanhamento em tempo real, transparência total e experiência premium do início ao fim.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="https://wa.me/5548999991234?text=Olá! Quero fazer uma compra nos EUA" target="_blank" rel="noopener"
            className="px-8 py-3.5 rounded-[10px] bg-[#0A0A0A] text-white text-[15px] font-semibold hover:opacity-85 transition-opacity">
            Fazer um Pedido →
          </a>
          <button onClick={() => setPage('login')}
            className="px-8 py-3.5 rounded-[10px] bg-[#F5F5F7] text-[#1D1D1F] text-[15px] font-semibold hover:bg-gray-200 transition-colors">
            Acompanhar Pedido
          </button>
        </div>
        <div className="flex justify-center gap-10 mt-16 flex-wrap">
          {[['150+', 'Pedidos entregues'], ['4.9 ★', 'Avaliação média'], ['15-25', 'Dias úteis']].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">{v}</div>
              <div className="text-xs text-gray-400">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1000px] mx-auto">
          <h2 className="font-display text-4xl font-bold text-center text-[#1D1D1F] tracking-tight mb-2">Como Funciona</h2>
          <p className="text-center text-gray-500 mb-14">Simples, transparente e sem surpresas.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { s: '01', icon: '🔗', t: 'Envie o Link', d: 'Mande o link do produto desejado pelo WhatsApp.' },
              { s: '02', icon: '💰', t: 'Receba a Cotação', d: 'Calculamos tudo: produto, taxa, frete e serviço.' },
              { s: '03', icon: '✅', t: 'Aprove e Pague', d: 'Confirme via Pix e acompanhe em tempo real.' },
              { s: '04', icon: '📦', t: 'Receba em Casa', d: 'Produto original entregue na sua porta.' },
            ].map(item => (
              <Card key={item.s}>
                <div className="text-[11px] font-bold text-gray-400 tracking-wider mb-4">PASSO {item.s}</div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight mb-2">{item.t}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <h2 className="font-display text-4xl font-bold text-center text-[#1D1D1F] tracking-tight mb-12">Perguntas Frequentes</h2>
          {[
            ['Como funciona o processo?', 'Você envia o link do produto pelo WhatsApp, fazemos a cotação completa, e após aprovação e pagamento via Pix, realizamos a compra nos EUA e enviamos até você.'],
            ['Quanto tempo leva?', 'O prazo médio é de 15 a 25 dias úteis após a compra, dependendo do tipo de envio e disponibilidade.'],
            ['Posso comprar de qualquer loja?', 'Sim! Nike, Amazon, Sephora, Bath & Body Works, New Balance e centenas de outras.'],
            ['Quais formas de pagamento?', 'Pix com confirmação instantânea. Em breve, cartão de crédito parcelado.'],
          ].map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-200 text-center text-xs text-gray-400">
        © 2026 JG Hub USA — Todos os direitos reservados.
      </footer>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} className="py-5 border-b border-gray-100 cursor-pointer">
      <div className="flex justify-between items-center">
        <span className="text-[15px] font-semibold text-[#1D1D1F]">{q}</span>
        <span className={`text-lg text-gray-400 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </div>
      {open && <p className="text-sm text-gray-500 leading-relaxed mt-3 pr-10">{a}</p>}
    </div>
  )
}

// ─── LOGIN ───────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    if (error) {
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
      setLoading(false)
    } else {
      onLogin()
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] flex items-center justify-center text-white text-xl font-extrabold mx-auto mb-5">JG</div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mb-2">Bem-vindo de volta</h2>
          <p className="text-sm text-gray-500">Acompanhe seus pedidos em tempo real.</p>
        </div>
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-medium text-gray-500 mb-1.5 block">E-mail</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-lg border-[1.5px] border-gray-200 text-sm outline-none transition-colors focus:border-[#0A0A0A] bg-white" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-gray-500 mb-1.5 block">Senha</label>
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError('') }}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-lg border-[1.5px] border-gray-200 text-sm outline-none transition-colors focus:border-[#0A0A0A] bg-white" />
            </div>
            {error && <div className="text-[13px] text-red-500">{error}</div>}
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-[10px] bg-[#0A0A0A] text-white text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-50 mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────
function Dashboard({ client, setPage, setSelectedOrder }: {
  client: Client; setPage: (p: string) => void; setSelectedOrder: (o: OrderSummary) => void
}) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
    // Realtime subscription for status changes
    const channel = supabase
      .channel('order-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `client_id=eq.${client.id}` }, () => {
        loadOrders()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [client.id])

  const loadOrders = async () => {
    const { data } = await supabase.from('order_summary').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    if (data) setOrders(data as OrderSummary[])
    setLoading(false)
  }

  const totalValue = orders.reduce((s, o) => s + Number(o.total_brl), 0)
  const paidValue = orders.reduce((s, o) => s + Number(o.total_paid), 0)
  const pendingValue = orders.reduce((s, o) => s + Number(o.total_pending), 0)

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Carregando...</div>

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-[#1D1D1F] tracking-tight mb-1.5">
          Olá, {client.name.split(' ')[0]} 👋
        </h1>
        <p className="text-[15px] text-gray-500">Aqui está o resumo dos seus pedidos.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Card><Stat label="Pedidos ativos" value={String(orders.filter(o => o.current_status < 10).length)} /></Card>
        <Card><Stat label="Valor total" value={fmt(totalValue)} /></Card>
        <Card><Stat label="Pago" value={fmt(paidValue)} accent="#10B981" /></Card>
        <Card><Stat label="Pendente" value={fmt(Math.max(0, pendingValue))} accent={pendingValue > 0 ? '#F59E0B' : '#10B981'} /></Card>
      </div>

      <h2 className="text-lg font-bold text-[#1D1D1F] tracking-tight mb-5">Seus Pedidos</h2>
      {orders.length === 0 ? (
        <Card><p className="text-center text-gray-400 py-8">Nenhum pedido encontrado.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(o => {
            const status = STATUSES.find(s => s.id === o.current_status)!
            return (
              <Card key={o.id} onClick={() => { setSelectedOrder(o); setPage('order-detail') }}>
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center text-[28px] shrink-0"
                    style={{ background: `${status.color}12` }}>
                    {status.icon}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-[#1D1D1F] tracking-tight">{o.product_name}</span>
                      <Badge text={status.label} color={status.color} />
                    </div>
                    <div className="text-[13px] text-gray-500 mt-1">
                      {o.order_code} · {o.store_name} · {fmtUsd(o.price_usd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[17px] font-bold text-[#1D1D1F] tracking-tight">{fmt(Number(o.total_brl))}</div>
                    <div className="text-xs text-gray-400">valor total</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ORDER DETAIL ────────────────────────────────────────────────────
function OrderDetail({ order, setPage }: { order: OrderSummary; setPage: (p: string) => void }) {
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    supabase.from('order_status_history').select('*').eq('order_id', order.id).order('updated_at', { ascending: true })
      .then(({ data }) => { if (data) setHistory(data) })
    supabase.from('payments').select('*').eq('order_id', order.id).order('paid_at', { ascending: true })
      .then(({ data }) => { if (data) setPayments(data) })
  }, [order.id])

  const status = STATUSES.find(s => s.id === order.current_status)!
  const total = Number(order.total_brl)
  const paid = Number(order.total_paid)

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      <button onClick={() => setPage('dashboard')} className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-flex items-center gap-1">
        ← Voltar aos pedidos
      </button>

      <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mb-1">{order.product_name}</h1>
          <span className="text-sm text-gray-500">{order.order_code}</span>
        </div>
        <Badge text={status.label} color={status.color} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          {/* Product details */}
          <Card>
            <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight mb-4">Detalhes do Produto</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Loja', order.store_name], ['Cor', order.color], ['Tamanho', order.size], ['Qtd', String(order.quantity)],
                ['Preço USD', fmtUsd(order.price_usd)], ['Câmbio', `R$ ${Number(order.exchange_rate).toFixed(2)}`],
                ['Produto BRL', fmt(order.price_usd * order.exchange_rate * order.quantity)],
                ['Taxa de Serviço', fmt(order.service_fee)], ['Frete', fmt(order.shipping_cost)], ['Total', fmt(total)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{k}</div>
                  <div className={`text-sm text-[#1D1D1F] mt-0.5 ${k === 'Total' ? 'font-bold' : 'font-medium'}`}>{v}</div>
                </div>
              ))}
            </div>
            {order.tracking_code && (
              <div className="mt-4 p-3 bg-[#F5F5F7] rounded-lg">
                <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Rastreio</div>
                <div className="text-sm text-[#1D1D1F] font-semibold mt-0.5">{order.tracking_code}</div>
              </div>
            )}
            {order.client_notes && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-xs text-amber-700">📝 {order.client_notes}</div>
              </div>
            )}
          </Card>

          {/* Payments */}
          <Card>
            <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight mb-4">Pagamentos</h3>
            <div className="flex gap-6 mb-4">
              <Stat label="Pago" value={fmt(paid)} accent="#10B981" />
              <Stat label="Pendente" value={fmt(Math.max(0, total - paid))} accent={total - paid > 0 ? '#F59E0B' : '#10B981'} />
            </div>
            {payments.length > 0 ? payments.map((p, i) => (
              <div key={p.id} className={`flex justify-between items-center py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div>
                  <div className="text-sm font-semibold text-[#1D1D1F]">{fmt(p.amount)}</div>
                  <div className="text-xs text-gray-400">{p.method} · {new Date(p.paid_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <Badge text="Confirmado" color="#10B981" />
              </div>
            )) : (
              <div className="text-sm text-gray-400 text-center py-5">Nenhum pagamento registrado ainda.</div>
            )}
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <h3 className="text-sm font-bold text-[#1D1D1F] tracking-tight mb-5">Progresso do Pedido</h3>
          <Timeline statusHistory={history} currentStatus={order.current_status} />
        </Card>
      </div>
    </div>
  )
}

// ─── ADMIN ───────────────────────────────────────────────────────────
function Admin() {
  const [tab, setTab] = useState<'orders' | 'clients'>('orders')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [editOrder, setEditOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [ordersRes, clientsRes] = await Promise.all([
      supabase.from('order_summary').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('is_admin', false).order('created_at', { ascending: false }),
    ])
    if (ordersRes.data) setOrders(ordersRes.data as OrderSummary[])
    if (clientsRes.data) setClients(clientsRes.data as Client[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const advanceStatus = async (orderId: string, newStatusId: number) => {
    await supabase.from('order_status_history').insert({ order_id: orderId, status_id: newStatusId, updated_by: 'admin' })
    loadData()
    if (editOrder && editOrder.id === orderId) {
      setEditOrder({ ...editOrder, current_status: newStatusId })
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Carregando...</div>

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_brl), 0)
  const totalReceived = orders.reduce((s, o) => s + Number(o.total_paid), 0)

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#1D1D1F] tracking-tight mb-1.5">Painel Administrativo</h1>
        <p className="text-[15px] text-gray-500">Gerencie pedidos, clientes e status.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><Stat label="Pedidos ativos" value={String(orders.filter(o => o.current_status < 10).length)} /></Card>
        <Card><Stat label="Faturamento" value={fmt(totalRevenue)} /></Card>
        <Card><Stat label="Recebido" value={fmt(totalReceived)} accent="#10B981" /></Card>
        <Card><Stat label="Clientes" value={String(clients.length)} /></Card>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-[#F5F5F7] rounded-[10px] p-1 mb-6">
        {(['orders', 'clients'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setEditOrder(null) }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-gray-500'}`}>
            {t === 'orders' ? `Pedidos (${orders.length})` : `Clientes (${clients.length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {tab === 'orders' && !editOrder && (
        <div className="flex flex-col gap-2">
          {orders.map(o => {
            const st = STATUSES.find(s => s.id === o.current_status)!
            return (
              <Card key={o.id} className="!p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-[#1D1D1F] w-20">{o.order_code.replace('JG-2026-', '#')}</span>
                  <span className="text-sm text-[#1D1D1F] flex-1 truncate min-w-[120px]">{o.product_name}</span>
                  <span className="text-xs text-gray-500 w-24">{o.client_name?.split(' ')[0]}</span>
                  <Badge text={st.label.length > 14 ? st.label.slice(0, 14) + '…' : st.label} color={st.color} />
                  <span className="text-sm font-semibold w-24 text-right">{fmt(Number(o.total_brl))}</span>
                  <button onClick={() => setEditOrder(o)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Gerenciar
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Order detail (admin) */}
      {tab === 'orders' && editOrder && (
        <AdminOrderDetail order={editOrder} onBack={() => { setEditOrder(null); loadData() }} onAdvanceStatus={advanceStatus} />
      )}

      {/* Clients */}
      {tab === 'clients' && (
        <div className="flex flex-col gap-3">
          {clients.map(c => (
            <Card key={c.id} className="!p-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#F5F5F7] flex items-center justify-center font-bold text-[#1D1D1F] shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-[#1D1D1F]">{c.name}</div>
                  <div className="text-[13px] text-gray-500">{c.email} · {c.phone || '—'}</div>
                </div>
                <div className="text-xs text-gray-400">desde {new Date(c.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminOrderDetail({ order, onBack, onAdvanceStatus }: {
  order: OrderSummary; onBack: () => void; onAdvanceStatus: (id: string, statusId: number) => void
}) {
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [currentStatus, setCurrentStatus] = useState(order.current_status)

  useEffect(() => {
    supabase.from('order_status_history').select('*').eq('order_id', order.id).order('updated_at', { ascending: true })
      .then(({ data }) => { if (data) setHistory(data) })
    supabase.from('payments').select('*').eq('order_id', order.id).order('paid_at', { ascending: true })
      .then(({ data }) => { if (data) setPayments(data) })
  }, [order.id, currentStatus])

  const status = STATUSES.find(s => s.id === currentStatus)!
  const nextStatus = STATUSES.find(s => s.id === currentStatus + 1)

  const handleAdvance = (statusId: number) => {
    onAdvanceStatus(order.id, statusId)
    setCurrentStatus(statusId)
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 mb-5 inline-flex items-center gap-1">
        ← Voltar à lista
      </button>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-7">
        <div>
          <div className="text-[22px] font-bold text-[#1D1D1F] tracking-tight">{order.product_name}</div>
          <div className="text-sm text-gray-500 mt-1">{order.order_code} · {order.client_name} · {order.client_email}</div>
        </div>
        <Badge text={status.label} color={status.color} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status */}
        <Card>
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-4">Atualizar Status</h3>
          {nextStatus ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-500">
                Próxima etapa: <strong className="text-[#1D1D1F]">{nextStatus.icon} {nextStatus.label}</strong>
              </p>
              <button onClick={() => handleAdvance(nextStatus.id)}
                className="w-full py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-sm hover:bg-emerald-100 transition-colors">
                ✓ Avançar para &ldquo;{nextStatus.label}&rdquo;
              </button>
              <div className="text-xs text-gray-400 mt-2">Ou selecione qualquer etapa:</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter(s => s.id > currentStatus).map(s => (
                  <button key={s.id} onClick={() => handleAdvance(s.id)}
                    className="px-3 py-1.5 text-[11px] font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-emerald-600">✅ Pedido concluído — Entregue!</div>
          )}
        </Card>

        {/* Timeline */}
        <Card>
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-4">Histórico</h3>
          <Timeline statusHistory={history} currentStatus={currentStatus} />
        </Card>

        {/* Financial */}
        <Card>
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-4">Financeiro</h3>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total" value={fmt(Number(order.total_brl))} />
            <Stat label="Pago" value={fmt(Number(order.total_paid))} accent="#10B981" />
            <Stat label="Pendente" value={fmt(Math.max(0, Number(order.total_pending)))} accent="#F59E0B" />
            <Stat label="Método" value={payments.length > 0 ? payments[0].method : '—'} />
          </div>
        </Card>

        {/* Info */}
        <Card>
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-4">Info do Pedido</h3>
          <div className="flex flex-col gap-2">
            {[
              ['Loja', order.store_name], ['Cor', order.color], ['Tamanho', order.size],
              ['Qtd', String(order.quantity)], ['USD', fmtUsd(order.price_usd)],
              ['Câmbio', `R$ ${Number(order.exchange_rate).toFixed(2)}`],
              ['Taxa Serviço', fmt(order.service_fee)], ['Frete', fmt(order.shipping_cost)],
              ['Rastreio', order.tracking_code || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-[13px] text-gray-500">{k}</span>
                <span className="text-[13px] text-[#1D1D1F] font-medium">{v}</span>
              </div>
            ))}
          </div>
          {order.client_notes && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-xs text-amber-700">📝 {order.client_notes}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── WHATSAPP FAB ────────────────────────────────────────────────────
function WhatsAppFab() {
  return (
    <a href="https://wa.me/5548999991234?text=Olá! Gostaria de fazer uma compra nos EUA"
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center text-white text-2xl shadow-[0_4px_16px_rgba(37,211,102,0.3)] hover:shadow-[0_6px_24px_rgba(37,211,102,0.45)] hover:scale-105 transition-all">
      💬
    </a>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('landing')
  const [user, setUser] = useState<User | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadClient(session.user.id)
      } else {
        setInitialLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setClient(null)
        setIsAdmin(false)
        setPage('landing')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadClient = async (userId: string) => {
    const { data } = await supabase.from('clients').select('*').eq('id', userId).single()
    if (data) {
      setClient(data as Client)
      setIsAdmin(data.is_admin)
      setPage(data.is_admin ? 'admin' : 'dashboard')
    }
    setInitialLoading(false)
  }

  const handleLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      await loadClient(user.id)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setClient(null)
    setIsAdmin(false)
    setSelectedOrder(null)
    setPage('landing')
  }

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-white text-sm font-extrabold">JG</div>
          <div className="text-sm text-gray-400">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Nav page={page} setPage={setPage} isLoggedIn={!!client && !isAdmin} isAdmin={isAdmin} onLogout={handleLogout} />
      <WhatsAppFab />

      {page === 'landing' && <Landing setPage={setPage} />}
      {page === 'login' && <Login onLogin={handleLogin} />}
      {page === 'dashboard' && client && <Dashboard client={client} setPage={setPage} setSelectedOrder={setSelectedOrder} />}
      {page === 'order-detail' && selectedOrder && <OrderDetail order={selectedOrder} setPage={setPage} />}
      {page === 'admin' && isAdmin && <Admin />}
    </div>
  )
}
