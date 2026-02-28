const fs = require('fs');
const path = require('path');
const tsLib = require('typescript');

const dir = path.join(__dirname, 'src/constants/scriptures');
const files = ['book.ts', 'video.ts', 'music.ts', 'game.ts'];

for (const file of files) {
    const tsPath = path.join(dir, file);
    const tsCode = fs.readFileSync(tsPath, 'utf8');

    // Transpile the TS code to JS so we can evaluate it and get the objects
    const jsCode = tsLib.transpileModule(tsCode, {
        compilerOptions: { module: tsLib.ModuleKind.CommonJS }
    }).outputText;

    // Create a sandbox to run the JS code
    const sandbox = { exports: {} };
    const requireMock = (id) => { return {}; }; // Mock imports
    
    try {
        const fn = new Function('exports', 'require', jsCode);
        fn(sandbox.exports, requireMock);

        const jsonPath = path.join(dir, file.replace('.ts', '.json'));
        fs.writeFileSync(jsonPath, JSON.stringify(sandbox.exports, null, 2), 'utf8');
        
        console.log(`Successfully converted ${file} to JSON`);
        fs.unlinkSync(tsPath); // Delete the old TS file
    } catch(e) {
        console.error(`Error converting ${file}:`, e);
    }
}
