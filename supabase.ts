import { createClient } from '@supabase/supabase-js'

// Essas chaves são públicas (anon key) — seguras para uso no frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdnsejcyikijyuhjwnpk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnNlamN5aWtpanl1aGp3bnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjkwNjksImV4cCI6MjA5NDc0NTA2OX0.V3LWoT4Rf7eiTJk6AjutN9K8-6qv1MBO4rEw862ZKgQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
