const fs = require('fs');
const path = require('path');

// Read the context data
const contextData = fs.readFileSync(
    path.join(__dirname, '../src/context/hidden-context.json'),
    'utf-8'
);

// Define the KV namespace ID
const namespaceId = '007e5b541cac4132942ea49faedfffc8';

// Create the base directories
const wranglerDir = path.join(process.env.HOME, '.wrangler');
const stateDir = path.join(wranglerDir, 'state');
const kvDir = path.join(stateDir, 'kv');

// Ensure directories exist
fs.mkdirSync(kvDir, { recursive: true });

// Create the namespace directory
const namespaceDir = path.join(kvDir, namespaceId);
fs.mkdirSync(namespaceDir, { recursive: true });

// Write the KV data file
const dataFile = path.join(namespaceDir, 'hidden-context');
fs.writeFileSync(dataFile, contextData);

// Write the namespace metadata
const metadataFile = path.join(namespaceDir, '__STATIC_METADATA__');
fs.writeFileSync(metadataFile, JSON.stringify({
    id: namespaceId,
    name: 'RESUME_DATA'
}));

console.log('Local KV storage initialized:');
console.log('- Data file:', dataFile);
console.log('- Metadata file:', metadataFile);
console.log('- Content:', contextData); 