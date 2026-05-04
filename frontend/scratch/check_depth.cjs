const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\dangu\\Downloads\\alphalearn-2-1-2\\alpha-2-3\\frontend\\src\\components\\student\\Leaderboard.jsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/<th(?![a-zA-Z])/g) || []).length;
    const closes = (line.match(/<\/th>/g) || []).length;
    depth += opens;
    depth -= closes;
    if (depth < 0) {
        console.log(`Line ${i + 1}: Depth dropped below 0! (${depth})`);
        depth = 0;
    }
});
console.log(`Final depth: ${depth}`);
