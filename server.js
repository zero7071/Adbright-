const express  = require('express');
const session  = require('express-session');
const path     = require('path');
const fs       = require('fs');

const { seedData }     = require('./db/database');
const authRouter       = require('./routes/auth');
const medsRouter       = require('./routes/medicines');
const salesRouter      = require('./routes/sales');
const licenseRouter    = require('./routes/license');
const { getLicenseStatus } = require('./routes/license');
const { usersRouter, purchasesRouter, reportsRouter, activityRouter } = require('./routes/misc');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
fs.mkdirSync(path.join(__dirname,'data'), { recursive: true });

app.use(session({
  secret: 'adbrightpharmacy_secret_2024_xk9z',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8*60*60*1000 }
}));

// ── LICENSE MIDDLEWARE ─────────────────────────────────────
app.use('/api', (req,res,next) => {
  if (req.path.startsWith('/license')) return next();
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/logout') || req.path.startsWith('/auth/me') || req.path.startsWith('/auth/forgot') || req.path.startsWith('/auth/reset')) return next();
  const status = getLicenseStatus();
  if (status.status === 'unactivated') return res.status(402).json({ error:'license_required', message:'Software not activated.' });
  if (status.status === 'locked')      return res.status(402).json({ error:'license_expired',  message:'License expired. Please renew.', daysOverdue: Math.abs(status.daysLeft) });
  if (status.status === 'grace') res.setHeader('X-License-Grace', status.graceDaysLeft);
  next();
});

app.use(express.static(path.join(__dirname,'public')));
app.use('/api/auth',      authRouter);
app.use('/api/medicines', medsRouter);
app.use('/api/sales',     salesRouter);
app.use('/api/users',     usersRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/activity',  activityRouter);
app.use('/api/license',   licenseRouter);
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));

async function start() {
  await seedData();
  const lic = getLicenseStatus();
  const licLine =
    lic.status==='active'        ? `║   License : ACTIVE — ${lic.daysLeft} days left              `
  : lic.status==='grace'         ? `║   License : GRACE PERIOD — ${lic.graceDaysLeft} days left          `
  : lic.status==='locked'        ? `║   License : ⚠️  EXPIRED — Renewal required              `
  :                                `║   License : 🔒 NOT ACTIVATED — Enter key to unlock     `;

  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   AD BRIGHT PHARMACY LIMITED  v2.0         ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║   Local  : http://localhost:${PORT}            ║`);
    console.log(`║   Network: http://<your-ip>:${PORT}           ║`);
    console.log('╠════════════════════════════════════════════╣');
    console.log(licLine.substring(0,46).padEnd(46)+'║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
  });
}
start().catch(console.error);
