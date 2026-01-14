# Customization Guide

This guide explains how to personalize your Talking Resume.

## Content Customization

### Resume HTML (public/index.html)

The visible resume content. Key sections to update:

```html
<!-- Your name -->
<h1>Your Name</h1>

<!-- Profile photo -->
<img src="/images/profile.jpeg" alt="Profile Photo">

<!-- Contact links -->
<a href="https://linkedin.com/in/your-profile">LinkedIn</a>
<a href="https://github.com/your-username">GitHub</a>
<a href="mailto:your.email@example.com">Email</a>

<!-- Professional summary -->
<p class="career-objective">
    Your professional title with X years of experience...
</p>

<!-- Skills -->
<span class="skill-tag">Skill 1</span>
<span class="skill-tag">Skill 2</span>

<!-- Experience -->
<div class="job">
    <h3>Job Title</h3>
    <p class="company">Company Name</p>
    <p class="duration">Start - End</p>
    <ul class="accomplishments">
        <li>Achievement 1</li>
        <li>Achievement 2</li>
    </ul>
</div>
```

### AI Knowledge Base (src/context/hidden-context.json)

This is the detailed information the AI uses to answer questions. The structure supports smart context selection - only relevant sections are sent to OpenAI based on the user's question.

#### Complete Schema

```json
{
    "name": "Your Name",
    "currentRole": "Your Current Role/Title",
    "summary": "Brief 1-2 sentence professional summary.",
    "expandedSummary": "Longer 3-5 sentence background for detailed questions.",

    "hobbies": [
        {
            "name": "Hobby Name",
            "description": "Brief description of this hobby."
        }
    ],

    "tech_journey": {
        "overview": "Narrative of your career journey.",
        "key_milestones": [
            "First milestone",
            "Second milestone"
        ]
    },

    "achievements": {
        "professional": {
            "project_name": {
                "description": "Project description",
                "highlights": ["Achievement 1", "Achievement 2"]
            }
        },
        "personal": {
            "description": "Personal achievements"
        }
    },

    "experience": [
        {
            "role": "Job Title",
            "company": "Company Name",
            "duration": "Start - End",
            "achievements": ["Achievement 1", "Achievement 2"]
        }
    ],

    "skills": {
        "technical": ["Skill 1", "Skill 2"],
        "soft_skills": ["Leadership", "Communication"],
        "education": {
            "degree": "Your Degree",
            "school": "University Name",
            "year": "Year"
        },
        "interview_responses": {
            "question_key": {
                "question": "Common interview question?",
                "response": "Your prepared answer."
            }
        }
    },

    "certifications": [
        {
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "issued": "Date"
        }
    ]
}
```

#### Field Details

| Field | Purpose | Used When |
|-------|---------|-----------|
| `name` | Your name | Always included |
| `currentRole` | Current job title | Always included |
| `summary` | Brief overview | Always included |
| `expandedSummary` | Detailed background | Experience questions |
| `hobbies` | Personal interests | Personal/hobby questions |
| `tech_journey` | Career narrative | Experience/journey questions |
| `achievements` | Key accomplishments | Achievement questions |
| `experience` | Work history | Experience/job questions |
| `skills.technical` | Technical skills | Skills/technical questions |
| `skills.soft_skills` | Soft skills | Leadership/business questions |
| `skills.interview_responses` | Prepared Q&A | Matching question topics |
| `certifications` | Professional certs | Education/certification questions |

### Adding Interview Responses

Pre-prepared answers help the AI respond consistently to common questions:

```json
"interview_responses": {
    "leadership_style": {
        "question": "How would you describe your leadership style?",
        "response": "I practice servant leadership, focusing on empowering team members..."
    },
    "biggest_challenge": {
        "question": "What's the biggest challenge you've overcome?",
        "response": "At Company X, I led a critical system migration..."
    },
    "why_this_role": {
        "question": "Why are you interested in this type of role?",
        "response": "My experience combining technical and business skills..."
    }
}
```

## Visual Customization

### Color Scheme (public/styles.css)

The design uses CSS custom properties for easy theming:

```css
:root {
    /* Primary colors */
    --color-primary: #1a1a2e;      /* Dark blue - headings */
    --color-secondary: #4a4a68;    /* Slate - secondary text */
    --color-accent: #0059b3;       /* Bright blue - links, buttons */

    /* Background colors */
    --color-bg: #f9fafb;           /* Light background */
    --color-white: #ffffff;        /* Card backgrounds */
    --color-border: #e5e7eb;       /* Borders */

    /* Typography */
    --font-family: 'Helvetica Neue', Arial, sans-serif;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
}
```

### Example: Dark Theme

```css
:root {
    --color-primary: #e5e5e5;
    --color-secondary: #a0a0a0;
    --color-accent: #4dabf7;
    --color-bg: #1a1a2e;
    --color-white: #2a2a3e;
    --color-border: #3a3a4e;
}
```

### Chat Widget Styling

The chat widget can be customized in the `.chat-widget` section of `styles.css`:

```css
.chat-container {
    /* Size */
    width: 380px;
    height: 500px;

    /* Colors */
    background: var(--color-white);
    border-radius: 16px;
}

.message.bot {
    background: #f0f4f8;
}

.message.user {
    background: var(--color-accent);
    color: white;
}
```

## Behavior Customization

### Suggested Questions (public/js/chat.js)

Update the default suggestions:

```javascript
const questions = [
    "Hobbies",           // Change to your preferred prompts
    "Tech Journey",
    "Achievements"
];
```

### AI Model Selection (functions/api/chat.js)

Switch between models based on your needs:

```javascript
// Cost-optimized (default)
model: 'gpt-3.5-turbo',

// Higher quality (more expensive)
model: 'gpt-4',

// Balanced
model: 'gpt-4-turbo',
```

### Response Length

Adjust in `functions/api/chat.js`:

```javascript
max_tokens: 500,        // Increase for longer responses
temperature: 0.5,       // 0.0-1.0: Lower = more focused, Higher = more creative
```

### Smart Context Keywords

Add custom keyword mappings in `functions/api/chat.js`:

```javascript
const contextMappings = {
    // Add your own category
    design: {
        keywords: ['design', 'ui', 'ux', 'figma', 'wireframe'],
        sections: ['skills.design', 'achievements.professional.design_work']
    },
    // ...existing mappings
};
```

## Adding New Sections

### 1. Add to Resume HTML

```html
<section class="new-section">
    <h2>Publications</h2>
    <ul>
        <li>Paper Title - Conference 2024</li>
    </ul>
</section>
```

### 2. Add to Context JSON

```json
{
    "publications": [
        {
            "title": "Paper Title",
            "venue": "Conference 2024",
            "description": "Brief description of the paper"
        }
    ]
}
```

### 3. Add Keyword Mapping

```javascript
publications: {
    keywords: ['publication', 'paper', 'research', 'published', 'writing'],
    sections: ['publications']
}
```

## After Making Changes

1. **Upload new context to KV:**
   ```bash
   npm run upload-context
   ```

2. **Test locally:**
   ```bash
   npm run dev
   ```

3. **Deploy changes:**
   Push to GitHub (auto-deploys) or run `npm run deploy`
