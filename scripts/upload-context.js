const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function uploadContext() {
    try {
        // Read the context file
        const contextPath = path.join(__dirname, '../src/context/hidden-context.json');
        const contextData = await fs.readFile(contextPath, 'utf8');
        
        // Parse to validate JSON
        JSON.parse(contextData);
        
        // Use wrangler kv:put command
        const command = `wrangler kv:put --binding=RESUME_DATA "hidden-context" '${contextData}'`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(`Successfully uploaded context: ${stdout}`);
        });
    } catch (error) {
        console.error('Failed to upload context:', error);
        process.exit(1);
    }
}

uploadContext(); 