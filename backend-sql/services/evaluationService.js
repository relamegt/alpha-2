const { JSDOM } = require('jsdom');

// ── Inline HTML/CSS/JS evaluation ─────────────────────────
exports.evaluateInline = async ({ html, css, js, testCases }) => {
  const results = [];

  for (const test of testCases) {
    try {
      // Build full HTML document
      const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head>
        <body>${html}<script>${js}<\/script></body></html>`;

      const dom = new JSDOM(fullHtml, {
        runScripts: 'dangerously',
        resources:  'usable'
      });

      const doc = dom.window.document;

      // Each test case has a selector + expected check
      let passed = false;
      let actual = null;

      switch (test.type) {
        case 'element_exists':
          passed = !!doc.querySelector(test.selector);
          actual = passed ? 'found' : 'not found';
          break;

        case 'element_text':
          const el = doc.querySelector(test.selector);
          actual = el?.textContent?.trim();
          passed = actual === test.expected;
          break;

        case 'element_count':
          actual = doc.querySelectorAll(test.selector).length;
          passed = actual === test.expected;
          break;

        case 'css_property':
          const elem   = doc.querySelector(test.selector);
          const styles = dom.window.getComputedStyle(elem);
          actual       = styles[test.property];
          passed       = actual === test.expected;
          break;

        case 'js_variable':
          actual = dom.window[test.variable];
          passed = actual === test.expected;
          break;

        case 'js_function_exists':
          passed = typeof dom.window[test.fnName] === 'function';
          actual = typeof dom.window[test.fnName];
          break;

        default:
          passed = false;
      }

      results.push({
        id:       test.id,
        name:     test.name,
        passed,
        actual,
        expected: test.expected,
        message:  passed ? '✅ Passed' : `❌ Expected "${test.expected}", got "${actual}"`
      });

    } catch (err) {
      results.push({
        id:      test.id,
        name:    test.name,
        passed:  false,
        message: `❌ Error: ${err.message}`
      });
    }
  }

  return results;
};

// ── IDE (multi-file) evaluation ────────────────────────────
exports.evaluateIDE = async ({ files, testCases }) => {
  const results = [];

  for (const test of testCases) {
    try {
      let passed = false;
      let actual = null;

      switch (test.type) {
        case 'FILE_EXISTS':
        case 'file_exists':
          passed = Object.keys(files).some(f => f === test.target || f.endsWith(test.target));
          actual = passed ? 'exists' : 'missing';
          break;

        case 'TEXT_MATCH':
        case 'file_contains':
          const targetFileEntry = Object.entries(files).find(([k]) => k === test.target || k.endsWith(test.target));
          actual = targetFileEntry ? (targetFileEntry[1].includes(test.expected || test.contains) ? 'found' : 'not found') : 'file missing';
          passed = actual === 'found';
          break;

        case 'CSS_SELECTOR':
          passed = true;
          actual = 'View in browser';
          break;

        case 'package_installed':
          const pkg = files['package.json'];
          if (!pkg) { passed = false; break; }
          try {
            const pkgObj = JSON.parse(pkg);
            const deps = { ...pkgObj.dependencies, ...pkgObj.devDependencies };
            passed = !!deps[test.package || test.target];
            actual = passed ? deps[test.package || test.target] : 'not installed';
          } catch (e) { passed = false; actual = 'invalid package.json'; }
          break;

        // ── Group 1: Backend Checks ──────────────────────────
        case 'api_route_exists': {
          const [method, path] = test.target.split(' ');
          const routeRegex = new RegExp(`app\\.${method.toLowerCase()}\\s*\\(\\s*['"\`]${path}['"\`]`, 'i');
          const routerRegex = new RegExp(`router\\.${method.toLowerCase()}\\s*\\(\\s*['"\`]${path}['"\`]`, 'i');
          passed = Object.entries(files).some(([name, content]) => 
            (name.startsWith('server/index.js') || name.includes('server/routes/')) && 
            (routeRegex.test(content) || routerRegex.test(content))
          );
          actual = passed ? 'Route found' : 'Route not found';
          break;
        }

        case 'api_returns_json': {
          const [method, path] = test.target.split(' ');
          const routeRegex = new RegExp(`\\.${method.toLowerCase()}\\s*\\(\\s*['"\`]${path}['"\`]`, 'i');
          const entry = Object.entries(files).find(([name, content]) => 
            (name.startsWith('server/index.js') || name.includes('server/routes/')) && routeRegex.test(content)
          );
          if (entry) {
            const index = entry[1].search(routeRegex);
            const snippet = entry[1].substring(index, index + 1000);
            passed = /res\.json\s*\(/.test(snippet);
          }
          actual = passed ? 'res.json() used' : 'res.json() not found in route handler';
          break;
        }

        case 'mongoose_model_exists':
          passed = Object.keys(files).some(f => 
            f === `server/models/${test.target}.js` || 
            f === `server/models/${test.target}.model.js` || 
            f.toLowerCase() === `server/models/${test.target.toLowerCase()}.js`
          );
          actual = passed ? 'Model file exists' : 'Model file missing';
          break;

        case 'mongoose_field_exists': {
          const [modelFile, field] = test.target.split('::');
          const content = Object.entries(files).find(([n]) => n.includes(`server/models/${modelFile}` || modelFile))?.[1];
          if (content) {
            const schemaMatch = content.match(/new\s+Schema\s*\(\s*\{([\s\S]+?)\}\s*\)/);
            passed = schemaMatch ? schemaMatch[1].includes(field) : content.includes(field);
          }
          actual = passed ? `Field ${field} found` : `Field ${field} missing in schema`;
          break;
        }

        case 'mongoose_schema_type': {
          const [modelFile, field] = test.target.split('::');
          const content = Object.entries(files).find(([n]) => n.includes(`server/models/${modelFile}` || modelFile))?.[1];
          if (content) {
            const fieldRegex = new RegExp(`${field}\\s*:\\s*(?:{[\\s\\S]*?type\\s*:\\s*|)${test.expected}`, 'i');
            passed = fieldRegex.test(content);
          }
          actual = passed ? `Type ${test.expected} verified` : 'Type mismatch or field not found';
          break;
        }

        case 'env_variable_used':
          passed = Object.entries(files).some(([name, content]) => 
            name.startsWith('server/') && name.endsWith('.js') && content.includes(`process.env.${test.target}`)
          );
          actual = passed ? 'Variable used' : 'Variable not found in process.env';
          break;

        case 'express_middleware_used':
          const indexContent = files['server/index.js'];
          passed = indexContent?.includes(`app.use(${test.target}`) || indexContent?.includes(`app.use(${test.target.split('(')[0]}`);
          actual = passed ? 'Middleware applied' : 'Middleware usage not detected in index.js';
          break;

        case 'mongodb_connected':
          passed = files['server/index.js']?.includes('mongoose.connect(');
          actual = passed ? 'Connection logic exists' : 'mongoose.connect() missing';
          break;

        case 'route_file_exists':
          passed = Object.keys(files).some(f => f.startsWith('server/routes/') && (f.includes(test.target)));
          actual = passed ? 'Route file found' : 'Route file missing';
          break;

        case 'middleware_file_exists':
          passed = Object.keys(files).some(f => f === `server/middleware/${test.target}.js`);
          actual = passed ? 'Middleware file exists' : 'Middleware file missing';
          break;

        case 'package_installed_backend': {
          const pkgB = files['server/package.json'];
          if (pkgB) {
            const p = JSON.parse(pkgB);
            const d = { ...p.dependencies, ...p.devDependencies };
            passed = !!d[test.target];
          }
          actual = passed ? 'Installed' : 'Missing in server/package.json';
          break;
        }

        // ── Group 2: Frontend Checks ─────────────────────────
        case 'react_component_exists':
          passed = Object.keys(files).some(f => 
            f === `client/src/components/${test.target}.jsx` || 
            f === `client/src/components/${test.target}.js` || 
            f === `client/src/components/${test.target}/index.jsx`
          );
          actual = passed ? 'Component exists' : 'Component file not found';
          break;

        case 'react_page_exists':
          passed = Object.keys(files).some(f => f.startsWith('client/src/pages/') && f.includes(test.target));
          actual = passed ? 'Page exists' : 'Page file missing';
          break;

        case 'react_fetch_exists':
          passed = Object.entries(files).some(([name, content]) => 
            name.startsWith('client/src/') && 
            (content.includes(`fetch('${test.target}'`) || content.includes(`fetch("${test.target}"`) || content.includes(`axios.get('${test.target}'`) || content.includes(`axios.post('${test.target}'`))
          );
          actual = passed ? 'Fetch call found' : 'API consumption not detected';
          break;

        case 'react_router_used':
          passed = (files['client/src/App.jsx'] || files['client/src/main.jsx'])?.includes('react-router-dom');
          actual = passed ? 'Router imported' : 'react-router-dom usage not found';
          break;

        case 'react_useState_used': {
          const compFile = Object.entries(files).find(([n]) => n.includes(test.target))?.[1];
          passed = compFile?.includes('useState(');
          actual = passed ? 'useState used' : 'State management missing in component';
          break;
        }

        case 'react_useEffect_used': {
          const compFileE = Object.entries(files).find(([n]) => n.includes(test.target))?.[1];
          passed = compFileE?.includes('useEffect(');
          actual = passed ? 'useEffect used' : 'Effect hook missing in component';
          break;
        }

        case 'package_installed_frontend': {
          const pkgF = files['client/package.json'];
          if (pkgF) {
            const pf = JSON.parse(pkgF);
            passed = !!(pf.dependencies?.[test.target] || pf.devDependencies?.[test.target]);
          }
          actual = passed ? 'Installed' : 'Missing in client/package.json';
          break;
        }

        case 'vite_proxy_configured':
          passed = files['client/vite.config.js']?.includes('proxy') && files['client/vite.config.js']?.includes(test.target);
          actual = passed ? 'Proxy set' : 'Vite proxy misconfigured';
          break;

        case 'component_renders_data': {
          const compContent = Object.entries(files).find(([n]) => n.includes(test.target))?.[1];
          passed = compContent?.includes(test.expected);
          actual = passed ? 'Element found' : `Expected JSX ${test.expected} not found`;
          break;
        }

        // ── Group 3: Full-Stack Checks ────────────────────────
        case 'fullstack_api_consumed': {
          // Backend check
          const [m, p] = ['GET', test.target]; // Default to GET if not specified
          const routeR = new RegExp(`app\\.${m.toLowerCase()}\\s*\\(\\s*['"\`]${p}['"\`]`, 'i');
          const bePassed = Object.entries(files).some(([name, content]) => 
            (name.startsWith('server/index.js') || name.includes('server/routes/')) && routeR.test(content)
          );
          // Frontend check
          const fePassed = Object.entries(files).some(([name, content]) => 
            name.startsWith('client/src/') && (content.includes(`fetch('${p}'`) || content.includes(`fetch("${p}"`))
          );
          passed = bePassed && fePassed;
          actual = passed ? 'End-to-end integration verified' : `Backend: ${bePassed ? 'OK' : 'MISSING'}, Frontend: ${fePassed ? 'OK' : 'MISSING'}`;
          break;
        }
        case 'readme_section_exists':
          passed = files['README.md']?.includes(test.target);
          actual = passed ? 'Section exists' : 'README section missing';
          break;
      }

      results.push({
        id: test.id, name: test.name, passed, actual,
        expected: test.expected,
        message: passed ? '✅ Passed' : `❌ ${test.name} failed`
      });

    } catch (err) {
      results.push({ id: test.id, name: test.name, passed: false, message: `❌ ${err.message}` });
    }
  }

  return results;
};
