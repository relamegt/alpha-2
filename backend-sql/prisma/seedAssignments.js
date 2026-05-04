const prisma = require('../config/db');

async function main() {
  console.log('🌱 Seeding assignments...');

  await prisma.assignment.createMany({ data: [
    // ── Inline (HTML/CSS/JS) ──────────────────────────────
    {
      title:       'Build a Responsive Navbar',
      description: 'Create a navigation bar with logo, links, and a mobile hamburger menu.',
      type:        'HTML_CSS_JS',
      difficulty:  'beginner',
      templateFiles: {
        html: '<nav>\n  <div class="logo">MyBrand</div>\n  <!-- Add your navbar links here -->\n</nav>',
        css:  '* { margin: 0; padding: 0; box-sizing: border-box; }\nnav { display: flex; justify-content: space-between; padding: 20px; background: #333; color: white; }',
        js:   'console.log("Navbar script loaded");'
      },
      testCases: [
        { id:1, name:'nav element exists',     type:'element_exists', selector:'nav' },
        { id:2, name:'has brand logo',         type:'element_exists', selector:'.logo' },
        { id:3, name:'background is dark',     type:'css_property',   selector:'nav', property:'backgroundColor', expected: 'rgb(51, 51, 51)' }
      ]
    },

    {
      title:       'JavaScript Counter',
      description: 'Build a simple counter with Increment and Decrement buttons.',
      type:        'HTML_CSS_JS',
      difficulty:  'beginner',
      templateFiles: {
        html: '<div id="app">\n  <h1 id="count">0</h1>\n  <button id="inc">Increment</button>\n  <button id="dec">Decrement</button>\n</div>',
        css:  '#app { text-align: center; margin-top: 50px; }',
        js:   'let count = 0;\nconst display = document.getElementById("count");\ndocument.getElementById("inc").onclick = () => { count++; display.innerText = count; };'
      },
      testCases: [
        { id:1, name:'Display element exists',    type:'element_exists',  selector:'#count' },
        { id:2, name:'Increment button exists',   type:'element_exists',  selector:'#inc' },
        { id:3, name:'Initial count is 0',        type:'element_text',    selector:'#count', expected: '0' }
      ]
    },

    // ── IDE (React/Node) ───────────────────────────────────────
    {
      title:       'React Counter Pro',
      description: 'Build a production-grade counter using React hooks and local state.',
      type:        'REACT',
      difficulty:  'intermediate',
      templateFiles: {
        githubUrl: 'https://github.com/relamegt/alphalearn-templates/releases/download/v1.0/react-counter.zip'
      },
      testCases: [
        { id:1, name:'App.jsx exists',           type:'file_exists',     filename:'App.jsx' },
        { id:2, name:'useState imported',        type:'file_contains',   filename:'App.jsx', contains:'useState' },
        { id:3, name:'Increment function exists', type:'file_contains',   filename:'App.jsx', contains:'setCount' }
      ]
    },

    {
      title:       'Express REST API',
      description: 'Create a simple backend API for a Todo application.',
      type:        'NODE',
      difficulty:  'intermediate',
      templateFiles: {
        githubUrl: 'https://github.com/relamegt/alphalearn-templates/releases/download/v1.0/node-api.zip'
      },
      testCases: [
        { id:1, name:'server.js exists',      type:'file_exists',      filename:'server.js' },
        { id:2, name:'Express usage',         type:'file_contains',    filename:'server.js', contains:'express()' },
        { id:3, name:'GET / route',           type:'file_contains',    filename:'server.js', contains:'app.get' }
      ]
    }
  ]});

  console.log('✅ Assignments seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
