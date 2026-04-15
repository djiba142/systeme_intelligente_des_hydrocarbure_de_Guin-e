const fs = require('fs');
const file = 'c:/new/systeme_intelligente_des_hydrocarbure_de_Guin-e/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use a simple global replace for "const NAME = lazy(() => import('PATH'));"
function fixLazy(str) {
  return str.replace(/const (\w+) = lazy\(\(\) => import\((.*?)\)\);/g, "import $1 from $2;");
}

content = fixLazy(content);

// Also remove all <Suspense fallback={<PageLoader />}> wrappers
// Since they can wrap components, we just strip the tags.
content = content.replace(/<Suspense fallback=\{<PageLoader \/>\}>/g, "");
content = content.replace(/<\/Suspense>/g, "");

fs.writeFileSync(file, content);
console.log("App.tsx optimized for eager loading!");
