
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\dangu\\Downloads\\alphalearn-2-1-2\\alpha-2-3\\frontend\\src\\components\\admin\\CourseManager.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let commentType = ''; // 'line' or 'block'

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inComment) {
        if (commentType === 'line' && char === '\n') {
            inComment = false;
        } else if (commentType === 'block' && char === '*' && nextChar === '/') {
            inComment = false;
            i++;
        }
        continue;
    }

    if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') {
            inString = false;
        }
        continue;
    }

    if (char === '/' && nextChar === '/') {
        inComment = true;
        commentType = 'line';
        i++;
        continue;
    }
    if (char === '/' && nextChar === '*') {
        inComment = true;
        commentType = 'block';
        i++;
        continue;
    }

    if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }

    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
}

console.log('Braces:', braceCount);
console.log('Parens:', parenCount);
