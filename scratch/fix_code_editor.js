
const fs = require('fs');
const path = 'c:/Users/dangu/Downloads/alphalearn-2-1-2/alphalearn-2/frontend/src/components/student/CodeEditor.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the corrupted error block
const corruptedErrorBlock = /<p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">\s+\{problem\.readmeUrl \|\| problem\.templateFiles\?\.repoUrl \? \([\s\S]+?<\/p>/;
const fixedErrorBlock = '<p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">\n                                Error\n                              </p>\n                              <p className="text-xs text-red-700 dark:text-red-300">\n                                {execError}\n                              </p>';

content = content.replace(corruptedErrorBlock, fixedErrorBlock);

// 2. Fix the README block
const oldReadmeBlock = /<ReactMarkdown remarkPlugins=\{\[remarkGfm, remarkBreaks\]\} components=\{MarkdownComponents\}>\s+\{externalReadme \|\| problem\.description \|\| "# Loading instructions\.\.\."\}\s+<\/ReactMarkdown>/;
const newReadmeBlock = `{problem.readmeUrl || problem.templateFiles?.repoUrl ? (
                          <EditorialRenderer 
                            problem={{
                              ...problem,
                              editorialLink: problem.readmeUrl || problem.templateFiles?.repoUrl
                            }} 
                          />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MarkdownComponents}>
                            {problem.description || "# Assignment Overview\\n\\nFollow the steps below to initialize your workspace."}
                          </ReactMarkdown>
                        )}`;

content = content.replace(oldReadmeBlock, newReadmeBlock);

fs.writeFileSync(path, content);
console.log('Fixed CodeEditor.jsx');
