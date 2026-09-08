import { getApp } from '../server';

const app = getApp();

export default function handler(req: any, res: any) {
  return app(req, res);
}
