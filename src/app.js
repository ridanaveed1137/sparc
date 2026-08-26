require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const sequelize = require('./config/database');
const { seedDefaultPolicies } = require('./utils/policyEngine');

const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '../public')));

// Basic brute-force throttle on login endpoint specifically.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;

async function start() {
  await sequelize.sync(); // creates tables if they don't exist
  await seedDefaultPolicies();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start();

module.exports = app;
