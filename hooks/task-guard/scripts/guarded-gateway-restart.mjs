#!/usr/bin/env node
import { createRestartRecovery } from '../lib/restart-recovery.ts';

const baseDir = process.argv[2] || '/root/.openclaw/workspace';
const sessionKey = process.argv[3] || 'agent:main:telegram:direct:759328425';

const record = await createRestartRecovery(baseDir, sessionKey, 'Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся, продолжаю с текущего места.');
console.log(JSON.stringify({ createdRestartRecovery: record }, null, 2));
console.log('Now run: openclaw gateway restart');
