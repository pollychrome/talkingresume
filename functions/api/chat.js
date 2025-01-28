export async function onRequest(context) {
    const timestamp = new Date().toISOString();
    let message = null;

    try {
        const body = await context.request.json();
        message = body.message;
        
        console.log('Received message:', message);

        if (!message) {
            throw new Error('No message provided');
        }

        // Get context data - try KV first, then fallback to local
        let contextData;
        try {
            if (context.env.RESUME_DATA) {
                const rawData = await context.env.RESUME_DATA.get('hidden-context');
                if (rawData) {
                    contextData = JSON.parse(rawData);
                }
            }

            // Local development fallback
            if (!contextData) {
                contextData = {
                    "name": "Example User",
                    "currentRole": "Senior Software Engineer",
                    "summary": "Senior Software Engineer with expertise in full-stack development and team leadership.",
                    "expandedSummary": "Experienced software engineer with a track record of delivering scalable solutions and leading development teams.",
                    "hobbies": [
                        {
                            "name": "Programming",
                            "description": "Contributing to open source projects and learning new technologies."
                        },
                        {
                            "name": "Reading",
                            "description": "Technical books and science fiction."
                        }
                    ],
                    "tech_journey": {
                        "overview": "Started as a junior developer and progressed to senior roles through continuous learning and leadership opportunities.",
                        "key_milestones": [
                            "Began career as junior developer",
                            "Led first team project",
                            "Promoted to senior role",
                            "Started mentoring junior developers"
                        ]
                    },
                    "achievements": {
                        "professional": {
                            "team_leadership": {
                                "description": "Led development teams on key projects",
                                "highlights": [
                                    "Managed team of 5 developers",
                                    "Improved sprint velocity by 40%",
                                    "Implemented agile methodologies"
                                ]
                            }
                        }
                    }
                };
            }
        } catch (error) {
            console.error('Error getting context:', error);
            throw new Error('Failed to get context data');
        }

        // Helper function to build example Q&A from interview_responses
        function buildExampleQA(data) {
            const interviewResponses = data?.skills?.interview_responses || {};
            const items = Object.values(interviewResponses);

            if (!items.length) {
                return '';
            }

            let exampleText = "Below are some example questions and responses from the context:\\n\\n";

            for (const item of items) {
                exampleText += `- User: "${item.question}"\\n`;
                exampleText += `- Assistant: "${item.response}"\\n\\n`;
            }

            // Add a refusal sample for out-of-scope queries
            exampleText += `- User: "Could you write me a poem about cats?"\\n`;
            exampleText += `- Assistant: "I can only provide information about the resume owner's professional background and experience."`;

            return exampleText.trim();
        }

        const exampleQA = buildExampleQA(contextData);

        // Prepare the system message with a more conversational style
        const systemMessage = {
            role: 'system',
            content: `
You are a helpful AI assistant that answers questions about the resume owner's professional experience, skills, and background in a friendly, conversational tone.

Please follow these rules:

1. Stay on the topic of the resume owner's:
   - Work experience and roles
   - Skills and technical expertise
   - Projects and achievements (professional & personal)
   - Education and professional development
   - Leadership experience
   - Hobbies (only what's explicitly mentioned)
   - Technical journey and career progression

2. Formatting Instructions:
- Use HTML tags for paragraphs (<p>) and line breaks (<br>) when needed
- Use unordered lists (<ul>) and (<li>) for bullet points
- Use short paragraphs and avoid very long blocks of text
- If referencing any simple data or subpoints, present them in bullet points
- Avoid headings bigger than <h3>

3. Response Guidelines:
- Be professional but conversational
- Stay factual and reference only information from the provided context
- If asked about something not in the context, politely explain that you can only speak to information provided
- Keep responses concise but informative
- Maintain consistent formatting across responses

Example of desired HTML answer:
<p>Let me tell you about their experience with [topic]...</p>
<ul>
    <li>Key point one</li>
    <li>Key point two</li>
</ul>
<p>Would you like to know more about any specific aspect?</p>

4. If the user asks anything not directly related to the resume owner's background or experience, respond with:
   "I can only provide information about the resume owner's professional background, skills, and achievements."

5. When discussing achievements:
   - Include both professional and personal achievements
   - Emphasize leadership/team impact for professional achievements
   - Keep responses balanced between professional and personal

6. For hobbies, only list those explicitly mentioned in the context. Keep them short and factual.

7. Never provide:
   - General advice or recommendations unrelated to the resume owner
   - Coding examples or tutorials
   - Personal opinions or speculation
   - Details not provided in the context

Context:
${JSON.stringify(contextData, null, 2)}

${exampleQA}
`.trim()
        };

        // Construct the messages array for the OpenAI API
        const messages = [
            systemMessage,
            { role: 'user', content: message }
        ];

        // Make request to OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${context.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4', 
                messages: messages,
                temperature: 0.5,       // slightly higher for more human-like style
                max_tokens: 500,        // allow more tokens for a deeper response
                presence_penalty: 0.5,  // discourage excessive repetition
                frequency_penalty: 0.3
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API error');
        }

        const answer = data.choices[0].message.content;

        // Store logs if KV is available
        if (context.env.RESUME_DATA) {
            await logInteraction(context, {
                question: message,
                answer,
                timestamp
            });
        }

        return new Response(JSON.stringify({ message: answer }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Chat error:', error);
        
        if (context.env.RESUME_DATA) {
            await logInteraction(context, {
                question: message || 'Unknown',
                answer: null,
                timestamp,
                error: error.message
            });
        }

        return new Response(JSON.stringify({
            error: 'Failed to process chat message',
            details: error.message
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

async function logInteraction(context, { question, answer, timestamp, error = null }) {
    try {
        const ip = context.request.headers.get('CF-Connecting-IP');
        const date = new Date(timestamp);
        const humanDate = date.toISOString().split('T')[0];
        const sessionKey = `session:${humanDate}:${ip}`;
        
        const logEntry = {
            timestamp,
            question,
            answer,
            error,
            userAgent: context.request.headers.get('User-Agent'),
            ip
        };

        // Get existing session or create new one
        let session = await context.env.RESUME_DATA.get(sessionKey);
        if (session) {
            session = JSON.parse(session);
            session.interactions.push(logEntry);
        } else {
            session = {
                startTime: timestamp,
                interactions: [logEntry]
            };
        }

        // Store updated session
        await context.env.RESUME_DATA.put(sessionKey, JSON.stringify(session));

        // Cleanup old sessions (keep last 1000)
        const oldSessions = await context.env.RESUME_DATA.list({ prefix: 'session:' });
        if (oldSessions.keys.length > 1000) {
            const sessionsToDelete = oldSessions.keys
                .sort((a, b) => b.name.localeCompare(a.name))
                .slice(1000);
            await Promise.all(
                sessionsToDelete.map(key => context.env.RESUME_DATA.delete(key.name))
            );
        }
    } catch (error) {
        console.error('Logging error:', error);
    }
}
