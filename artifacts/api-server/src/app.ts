import express, { type Express, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { logger } from './lib/logger';
import { billingWebhookHandler } from './routes/billing';
import { logSupportSessionWrite } from './lib/audit';

const app: Express = express();

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
app.use(cors());

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
