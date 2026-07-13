const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required')
}

module.exports = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
