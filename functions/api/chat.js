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

            // Local development fallback - generic template for testing
            if (!contextData) {
                contextData = {
                    "name": "Your Name",
                    "currentRole": "Your Current Role/Title",
                    "summary": "Brief professional summary highlighting your key expertise and focus areas.",
                    "expandedSummary": "Expanded background with more detail about your career journey, expertise, and what you're passionate about professionally.",
                    "hobbies": [
                        {
                            "name": "Hobby 1",
                            "description": "Description of your first hobby and your involvement."
                        },
                        {
                            "name": "Hobby 2",
                            "description": "Description of your second hobby."
                        }
                    ],
                    "tech_journey": {
                        "overview": "Narrative of your career journey and key transitions that shaped your professional path.",
                        "key_milestones": [
                            "First major milestone in your career",
                            "Second key milestone",
                            "Third milestone",
                            "Current focus or achievement"
                        ]
                    },
                    "achievements": {
                        "professional": {
                            "key_project": {
                                "description": "Description of a major project or achievement.",
                                "highlights": [
                                    "Specific accomplishment 1",
                                    "Specific accomplishment 2",
                                    "Specific accomplishment 3"
                                ]
                            }
                        },
                        "personal": {
                            "description": "Optional personal achievements worth mentioning."
                        }
                    },
                    "experience": [
                        {
                            "role": "Job Title",
                            "company": "Company Name",
                            "duration": "Start - End",
                            "achievements": [
                                "Key achievement 1",
                                "Key achievement 2"
                            ]
                        }
                    ],
                    "skills": {
                        "technical": ["Skill 1", "Skill 2", "Skill 3"],
                        "soft_skills": ["Leadership", "Communication"],
                        "education": {
                            "degree": "Your Degree",
                            "school": "University Name",
                            "year": "Graduation Year"
                        },
                        "interview_responses": {
                            "example_question": {
                                "question": "Example interview question?",
                                "response": "Your prepared response demonstrating your expertise."
                            }
                        }
                    },
                    "certifications": [
                        {
                            "name": "Certification Name",
                            "issuer": "Issuing Organization",
                            "issued": "Date Issued"
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('Error getting context:', error);
            throw new Error('Failed to get context data');
        }

        // Smart context selection function - only includes relevant context based on user message
        // This reduces API token usage by 60-80%, significantly lowering costs
        function getRelevantContext(message, fullContext) {
            const keywords = message.toLowerCase();
            let relevantContext = {
                name: fullContext.name,
                currentRole: fullContext.currentRole,
                summary: fullContext.summary
            };

            // Define keyword mappings for different context sections
            // CUSTOMIZATION: Add your own keyword mappings here based on your background
            // Example: If you're a designer, add:
            // design: {
            //     keywords: ['design', 'ui', 'ux', 'figma', 'sketch', 'wireframe'],
            //     sections: ['skills.design', 'achievements.professional.design_projects']
            // }
            const contextMappings = {
                // Leadership and management questions
                leadership: {
                    keywords: ['leadership', 'lead', 'manage', 'team', 'manager', 'director', 'ceo', 'cfo', 'executive', 'supervise', 'staff'],
                    sections: ['tech_journey', 'achievements.professional', 'skills.Leadership', 'skills.interview_responses']
                },

                // Technical and product questions
                technical: {
                    keywords: ['technical', 'tech', 'product', 'development', 'software', 'programming', 'code', 'system', 'platform', 'feature', 'roadmap'],
                    sections: ['skills.technical', 'achievements.professional', 'tech_journey', 'skills.interview_responses']
                },

                // Business and operations questions
                business: {
                    keywords: ['business', 'operations', 'revenue', 'finance', 'strategy', 'process', 'optimization', 'growth', 'commercial'],
                    sections: ['skills.soft_skills', 'achievements.professional', 'tech_journey', 'skills.interview_responses']
                },

                // Experience and background questions
                experience: {
                    keywords: ['experience', 'background', 'history', 'career', 'work', 'job', 'role', 'position', 'company'],
                    sections: ['experience', 'tech_journey', 'achievements', 'expandedSummary']
                },

                // Skills and abilities questions
                skills: {
                    keywords: ['skills', 'abilities', 'expertise', 'competencies', 'capabilities', 'knowledge'],
                    sections: ['skills', 'achievements.professional']
                },

                // Personal and hobby questions
                personal: {
                    keywords: ['hobby', 'hobbies', 'personal', 'interests', 'fun', 'free time', 'outside work'],
                    sections: ['hobbies']
                },

                // Education and certification questions
                education: {
                    keywords: ['education', 'degree', 'school', 'university', 'certification', 'certificate', 'credential', 'study'],
                    sections: ['skills.education', 'certifications']
                },

                // Change management and transformation questions
                change: {
                    keywords: ['change', 'transformation', 'modernization', 'upgrade', 'migration', 'stakeholder', 'resistance'],
                    sections: ['skills.interview_responses', 'achievements.professional']
                },

                // Performance and metrics questions
                metrics: {
                    keywords: ['metrics', 'kpi', 'performance', 'measurement', 'success', 'targets', 'analytics', 'results'],
                    sections: ['skills.interview_responses', 'achievements.professional']
                }
            };

            // Check which context categories are relevant
            const matchedCategories = new Set();

            for (const [category, config] of Object.entries(contextMappings)) {
                for (const keyword of config.keywords) {
                    if (keywords.includes(keyword)) {
                        matchedCategories.add(category);
                        break;
                    }
                }
            }

            // If no specific matches, include experience and skills as defaults
            if (matchedCategories.size === 0) {
                matchedCategories.add('experience');
                matchedCategories.add('skills');
            }

            // Build the relevant context based on matched categories
            for (const category of matchedCategories) {
                const config = contextMappings[category];
                for (const sectionPath of config.sections) {
                    const pathParts = sectionPath.split('.');
                    let sourceData = fullContext;
                    let targetData = relevantContext;

                    // Navigate to the source data
                    for (const part of pathParts) {
                        if (sourceData && sourceData[part]) {
                            sourceData = sourceData[part];
                        } else {
                            sourceData = null;
                            break;
                        }
                    }

                    if (sourceData) {
                        // Create the nested structure in relevantContext if needed
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            const part = pathParts[i];
                            if (!targetData[part]) {
                                targetData[part] = {};
                            }
                            targetData = targetData[part];
                        }

                        // Set the final value
                        const finalPart = pathParts[pathParts.length - 1];
                        targetData[finalPart] = sourceData;
                    }
                }
            }

            return relevantContext;
        }

        // Helper function to build example Q&A from interview_responses
        function buildExampleQA(data) {
            const interviewResponses = data?.skills?.interview_responses || {};
            const items = Object.values(interviewResponses);

            if (!items.length) {
                return '';
            }

            let exampleText = "Below are some example questions and responses from the context:\n\n";

            for (const item of items) {
                if (item.question && item.response) {
                    exampleText += `- User: "${item.question}"\n`;
                    exampleText += `- Assistant: "${item.response}"\n\n`;
                }
            }

            // Add a refusal sample for out-of-scope queries
            exampleText += `- User: "Could you write me a poem about cats?"\n`;
            exampleText += `- Assistant: "I can only provide information about the resume owner's professional background, skills, and achievements."`;

            return exampleText.trim();
        }

        // Use smart context selection to reduce token usage (60-80% savings)
        const relevantContext = getRelevantContext(message, contextData);
        const exampleQA = buildExampleQA(relevantContext);

        // Prepare the system message with concise, conversational style
        const systemMessage = {
            role: 'system',
            content: `
You are a helpful AI assistant that answers questions about the resume owner's professional experience, skills, and background in a friendly, conversational tone.

IMPORTANT: Keep all responses SHORT and CONCISE. Aim for 2-4 sentences maximum unless specifically asked for detailed explanations.

Please follow these strict formatting rules:

1. Message Structure:
   - Provide a direct, brief answer (1-2 sentences)
   - Use <strong> tags for section titles only when absolutely necessary
   - Avoid concluding statements unless they add value

2. Formatting Requirements:
   - Wrap each paragraph in <p> tags
   - Use <strong> sparingly for key emphasis only
   - Keep paragraphs very short (1-2 sentences max)
   - Minimize sections - combine related information

3. List Formatting:
   - Only use lists when absolutely necessary
   - Limit lists to 2-3 items maximum
   - Keep list items to one line each
   - Each list item in <li> tags within <ul>

Example concise format:
<p>Direct answer to the question in 1-2 sentences.</p>
<ul>
    <li>Key point 1</li>
    <li>Key point 2</li>
</ul>

4. Content Rules:
   - Be direct and to the point
   - Focus only on the most relevant information
   - Avoid elaborating unless specifically asked
   - Skip background context unless essential
   - If asked about something not in the context, politely explain you can only speak to provided information

5. Never:
   - Use any heading tags (h1, h2, h3, etc.)
   - Use custom CSS or styling
   - Create nested lists
   - Write very long paragraphs
   - Include raw URLs or markdown
   - Use emojis or special characters
   - Provide general advice unrelated to the resume owner
   - Make up information not in the context

Context (dynamically selected based on your question):
${JSON.stringify(relevantContext, null, 2)}

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
                // Using gpt-3.5-turbo for cost efficiency (~20x cheaper than gpt-4)
                // For higher quality responses, change to: 'gpt-4' or 'gpt-4-turbo'
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.5,       // balanced for conversational yet consistent responses
                max_tokens: 500,        // sufficient for concise responses
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
            try {
                await logInteraction(context, {
                    question: message,
                    answer,
                    timestamp
                });
            } catch (logError) {
                console.error('Failed to log chat interaction:', logError);
            }
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
            try {
                await logInteraction(context, {
                    question: message || 'Unknown',
                    answer: null,
                    timestamp,
                    error: error.message
                });
            } catch (logError) {
                console.error('Failed to log error:', logError);
            }
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
    if (!context.env.RESUME_DATA) {
        return;
    }

    try {
        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
        const date = new Date(timestamp);
        const humanDate = date.toISOString().split('T')[0];
        const sessionKey = `session:${humanDate}:${ip}`;

        const logEntry = {
            timestamp,
            question,
            answer,
            error,
            userAgent: context.request.headers.get('User-Agent') || 'unknown',
            ip
        };

        // Get existing session or create new one
        let session;
        try {
            const existingSession = await context.env.RESUME_DATA.get(sessionKey);
            session = existingSession ? JSON.parse(existingSession) : null;
        } catch (e) {
            console.error('Error parsing existing session:', e);
            session = null;
        }

        if (session) {
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
        try {
            const oldSessions = await context.env.RESUME_DATA.list({ prefix: 'session:' });
            if (oldSessions.keys.length > 1000) {
                const sessionsToDelete = oldSessions.keys
                    .sort((a, b) => b.name.localeCompare(a.name))
                    .slice(1000);
                await Promise.all(
                    sessionsToDelete.map(key => context.env.RESUME_DATA.delete(key.name))
                );
            }
        } catch (e) {
            console.error('Error during session cleanup:', e);
        }
    } catch (error) {
        console.error('Logging error:', error);
    }
}
