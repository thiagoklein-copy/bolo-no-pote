/**
 * Script de build para Vercel: gera config.js a partir das variáveis de ambiente.
 * Na Vercel, defina SUPABASE_URL e SUPABASE_ANON_KEY no painel do projeto.
 */
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const content = `// Gerado automaticamente no build - não editar nem commitar
window.SUPABASE_URL = ${JSON.stringify(url)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

const outPath = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(outPath, content, 'utf8');
console.log('config.js gerado a partir das variáveis de ambiente.');
