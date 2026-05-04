const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\dangu\\Downloads\\alphalearn-2-1-2\\alpha-2-3\\frontend\\src\\components\\student\\Leaderboard.jsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/<th/g) || []).length;
    const closes = (line.match(/<\/th>/g) || []).length;
    if (opens !== closes) {
        console.log(`Line ${i + 1}: Opens=${opens}, Closes=${closes}, Content=${line.trim()}`);
    }
});
