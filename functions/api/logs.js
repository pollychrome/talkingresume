export async function onRequest(context) {
    // Check for auth in either header or query parameter
    const authHeader = context.request.headers.get('Authorization');
    const url = new URL(context.request.url);
    const authQuery = url.searchParams.get('auth');
    
    // Try both variants of the admin secret key (with and without leading space)
    const adminSecret = context.env[' ADMIN_SECRET'] || context.env.ADMIN_SECRET;
    const isAuthorized = 
        authHeader === `Bearer ${adminSecret}` ||
        authQuery === adminSecret;

    if (!isAuthorized) {
        // Return debug information (TEMPORARY - REMOVE IN PRODUCTION)
        return new Response(JSON.stringify({
            error: 'Unauthorized',
            debug: {
                hasAdminSecret: !!adminSecret,
                providedAuth: authQuery,
                headerAuth: authHeader,
                envVars: Object.keys(context.env),
                adminSecretLength: adminSecret ? adminSecret.length : 0
            }
        }), { 
            status: 401,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    try {
        // Get all sessions
        const sessionList = await context.env.RESUME_DATA.list({ prefix: 'session:' });
        const sessions = {};

        // Fetch all session data
        await Promise.all(sessionList.keys.map(async (key) => {
            const sessionData = await context.env.RESUME_DATA.get(key.name);
            if (sessionData) {
                sessions[key.name] = JSON.parse(sessionData);
            }
        }));

        // Generate and return HTML
        const html = generateLogsHTML(sessions);
        return new Response(html, {
            headers: {
                'Content-Type': 'text/html;charset=UTF-8'
            }
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        return new Response('Error fetching logs', { status: 500 });
    }
}

function generateLogsHTML(sessions) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Chat Sessions</title>
        <style>
            body { font-family: sans-serif; padding: 2rem; }
            .session { 
                border: 1px solid #ddd; 
                margin: 1rem 0; 
                border-radius: 4px;
            }
            .session-header {
                background: #f5f5f5;
                padding: 1rem;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
            }
            .session-content {
                display: none;
                padding: 1rem;
            }
            .session-content.active {
                display: block;
            }
            .interaction {
                border-bottom: 1px solid #eee;
                padding: 0.5rem 0;
            }
            .timestamp { color: #666; }
            .question { color: #2980b9; }
            .answer { color: #27ae60; }
        </style>
        <script>
            function toggleSession(sessionId) {
                const content = document.getElementById(sessionId);
                content.classList.toggle('active');
            }
        </script>
    </head>
    <body>
        <h1>Chat Sessions</h1>
        <div id="sessions">
            ${Object.entries(sessions).sort((a, b) => b[1].startTime - a[1].startTime).map(([key, session]) => `
                <div class="session">
                    <div class="session-header" onclick="toggleSession('${key}')">
                        <span>${new Date(session.startTime).toLocaleString()}</span>
                        <span>${session.interactions.length} messages</span>
                    </div>
                    <div id="${key}" class="session-content">
                        ${session.interactions.map(log => `
                            <div class="interaction">
                                <div class="timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                                <div class="question"><strong>Q:</strong> ${log.question}</div>
                                <div class="answer"><strong>A:</strong> ${log.answer || 'No response'}</div>
                                ${log.error ? `<div class="error"><strong>Error:</strong> ${log.error}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `;
} 