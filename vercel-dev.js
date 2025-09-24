// vercel-dev.js
import { spawn } from 'child_process';

console.log('Starting Express server for Vercel dev...');
const server = spawn('node', ['src/server.js'], { stdio: 'inherit' });

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});