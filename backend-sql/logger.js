const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('node', ['server.js'], {
    env: { ...process.env, NODE_ENV: 'development' }
});

const log = fs.createWriteStream('error_log.txt');

child.stdout.on('data', (data) => {
    process.stdout.write(data);
    log.write(data);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
    log.write(data);
});

child.on('close', (code) => {
    console.log(`\nChild process exited with code ${code}`);
    log.write(`\nChild process exited with code ${code}`);
});
