# Customization

## Visible resume

Edit `public/index.html` to replace the placeholder name, summary, skills, experience, companies, dates, accomplishments, contact links, and `data-company` values.

The information buttons use `data-company` to submit a question to the same chat flow as typed messages:

```html
<button
    class="info-icon"
    type="button"
    data-company="Example Company"
    aria-label="Ask about experience at Example Company"
>
    ...
</button>
```

Keep the accessible label in sync with the company name.

To offer a downloadable PDF, add the file under `public/` and create a normal link with `download`. Do not leave a link to a file that is not deployed.

## AI knowledge base

Edit `src/context/hidden-context.json`. The current shape supports:

```json
{
    "name": "Candidate Name",
    "currentRole": "Current role",
    "summary": "Short summary",
    "expandedSummary": "Longer narrative",
    "experience": [],
    "skills": {
        "technical": [],
        "soft_skills": [],
        "education": {},
        "interview_responses": {}
    },
    "achievements": {},
    "hobbies": [],
    "tech_journey": {},
    "certifications": []
}
```

This file is included in the server bundle, not copied into `public`. It is still source-controlled. Treat it as private from site visitors, but not as a secrets store.

Validate JSON and the full project after editing:

```bash
npm run check
```

## Context routing

Keyword categories live in `functions/_shared/resume-context.js`. Each category has whole-word keywords and context paths:

```js
design: {
    keywords: ['design', 'ux', 'figma'],
    sections: ['skills.design', 'achievements.professional.design_projects'],
}
```

Add the matching fields to the context JSON at the same time. Questions with no category match receive the identity, experience, and skills sections.

## Assistant behavior

Provider-independent instructions live in `functions/_shared/prompt.js`. They currently require concise, factual plain text. Keep output plain text unless the rendering layer is deliberately redesigned with a well-tested sanitizer.

Prepared examples can be added under `skills.interview_responses`:

```json
{
    "leadership_example": {
        "question": "How do you lead teams?",
        "response": "A concise, fact-based answer."
    }
}
```

Examples are included only when the selected context contains that section.

## Model and runtime settings

Prefer environment configuration over editing provider code:

```dotenv
OPENAI_MODEL=gpt-5.6-luna
CHAT_RATE_LIMIT_PER_MINUTE=10
CHAT_LOGGING_ENABLED=true
CHAT_LOG_RETENTION_DAYS=90
LOG_DASHBOARD_ENTRY_LIMIT=1000
```

The default model favors a cost-sensitive workload. Before changing it, confirm that the target model supports the Responses API and validate real questions from the resume. Keep an evaluation set if response wording is business-critical.

## Suggested questions

Suggested questions are ordinary buttons in `public/index.html`:

```html
<button class="suggestion" type="button" data-question="Leadership">Leadership</button>
```

The visible label and `data-question` may differ, but the submitted question must remain within the 280-character server limit.

## Styling

Design tokens are at the top of `public/styles.css`. Change the custom properties before adding selector overrides:

```css
:root {
    --color-primary: #075ea8;
    --color-background: #f5f7fb;
    --color-text: #253344;
}
```

The stylesheet includes mobile, reduced-motion, focus, and print rules. Recheck all four when changing layout or interaction styles.

## Privacy controls

- Set `CHAT_LOGGING_ENABLED=false` to disable new interaction records.
- Reduce `CHAT_LOG_RETENTION_DAYS` to shorten retention.
- Use a unique `RATE_LIMIT_SALT`; do not reuse a public value.
- Tell visitors that questions may be logged if logging is enabled in production.
- Never place credentials, private keys, health information, or other regulated data in the context JSON.
