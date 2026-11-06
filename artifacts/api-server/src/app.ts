import express, { type Express, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { logger } from './lib/logger';
import { billingWebhookHandler } from './routes/billing';
import { logSupportSessionWrite } from './lib/audit';

const app: Express = express();

// Behind the Replit/edge proxy req.ip is the proxy's address unless this is set,
// which would put every client in one rate-limit bucket. Override with
// TRUST_PROXY (hop count) if the deployment topology changes.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.disable('x-powered-by');

// JSON-only API: a locked-down baseline set of response headers.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

// Native mobile clients send no Origin header, so CORS only matters for web.
// In production set CORS_ORIGINS to a comma-separated allowlist; unset means
// no cross-origin browser access (dev stays open for Expo web).
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const corsMiddleware = cors(
  process.env.NODE_ENV === 'production' ? { origin: corsOrigins } : undefined,
);

// General abuse guard for the whole API - loose enough not to bother normal
// usage, tight enough to blunt id-guessing/brute-force and scripted spam.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(corsMiddleware);

// Stripe webhook signature verification needs the raw request body, so this
// route must be registered before the global express.json() body parser.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingWebhookHandler as any);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', globalLimiter, logSupportSessionWrite as any, router);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ err }, 'unhandled request error');
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

export default app;
