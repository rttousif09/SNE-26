const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules')) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let insideUseEffect = false;
  let useEffectBraces = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('useEffect(() => {') || line.includes('React.useEffect(() => {')) {
      insideUseEffect = true;
      useEffectBraces = 0;
    }
    
    if (insideUseEffect) {
      useEffectBraces += (line.match(/{/g) || []).length;
      useEffectBraces -= (line.match(/}/g) || []).length;
      
      if (useEffectBraces <= 0) {
        insideUseEffect = false;
        
        let depLine = line;
        if (!line.includes(']') && i + 1 < lines.length) depLine += lines[i+1];
        if (!line.includes(']') && i + 2 < lines.length) depLine += lines[i+2];
        
        if (!depLine.includes(']')) {
           console.log(`WARNING: useEffect without deps in ${file}:${i+1}`);
        }
      }
    }
  }
}
console.log('Analysis complete.');
