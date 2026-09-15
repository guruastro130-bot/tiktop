import { getApp } from '../server';

let cachedApp: any = null;

export default function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = getApp();
    }
    return cachedApp(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless API Error]:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Server handler failed',
    });
  }
}

