require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Verifica se banco existe
const fs = require('fs');
const dbPath = path.join(__dirname, 'db', 'crm.db');
if (!fs.existsSync(dbPath)) {
  console.error('\n❌ Banco de dados não encontrado!');
  console.error('   Execute primeiro: npm run setup\n');
  process.exit(1);
}

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Rotas
app.use('/api/v1/auth',        require('./routes/auth'));
app.use('/api/v1/leads',       require('./routes/leads'));
app.use('/api/v1/atividades',  require('./routes/atividades'));
app.use('/api/v1/contratos',   require('./routes/contratos'));
app.use('/api/v1/financeiros', require('./routes/financeiros'));
app.use('/api/v1/pos_vendas',  require('./routes/pos_vendas'));
app.use('/api/v1/organizacoes',require('./routes/organizacoes'));
app.use('/api/v1/usuarios',    require('./routes/usuarios'));
app.use('/api/v1/faturamentos',require('./routes/faturamentos'));
app.use('/api/v1/cupons',      require('./routes/cupons'));

// Health check
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 SECURE-CRM API rodando em http://localhost:${PORT}/api/v1`);
  console.log(`   Health: http://localhost:${PORT}/api/v1/health\n`);
});
