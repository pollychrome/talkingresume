# Interactive Resume with AI Chat

A modern, interactive resume template with an AI-powered chat interface that allows visitors to ask questions about your experience. Built with Cloudflare Pages and OpenAI.

## Features
- Clean, responsive resume layout
- AI chat interface for interactive Q&A about your experience
- PDF download functionality
- Mobile-friendly design
- Easy to customize and deploy

## Prerequisites
- Node.js and npm installed
- Cloudflare account
- OpenAI API key
- GitHub account

## Setup Instructions

### 1. Initial Setup
1. Clone or fork this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install Wrangler CLI globally:
   ```bash
   npm install -g wrangler
   ```

### 2. Customize Your Resume

1. Update resume content in `public/index.html`:
   - Replace profile image in `/public/images/`
   - Update name, contact info, and social links
   - Modify experience, skills, and other sections
   - Customize the career objective

2. Add your PDF resume:
   - Save your static PDF resume in the `public/` directory
   - Update the download link in `public/index.html`:
     ```html
     <a href="your-resume.pdf" class="download-button-fixed" title="Download PDF" download>
     ```
   - Make sure the href matches your PDF filename exactly

3. Configure the AI knowledge base in `src/context/hidden-context.json`:
   ```json
   {
     "name": "Your Name",
     "currentRole": "Your Role",
     "experience": [
       {
         "company": "Company Name",
         "role": "Your Role",
         "duration": "2020-Present",
         "details": ["Achievement 1", "Achievement 2"]
       }
     ],
     "education": [...],
     "skills": [...],
     "additionalInfo": {
       "hobbies": [...],
       "interests": [...],
       "achievements": [...]
     }
   }
   ```

### 3. Local Development

1. Create a `.dev.vars` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ADMIN_SECRET=your_chosen_secret_key
   ```

2. Create a KV namespace:
   ```bash
   wrangler kv:namespace create "RESUME_DATA"
   ```

3. Update `wrangler.toml` with your KV namespace ID:
   ```toml
   kv_namespaces = [
     { binding = "RESUME_DATA", id = "your_namespace_id" }
   ]
   ```

4. Upload your context data:
   ```bash
   npm run upload-context
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### 4. Deployment

1. Push your code to GitHub

2. In Cloudflare Pages:
   - Create new project and connect your repository
   - Configure build settings:
     - Framework preset: None
     - Build command: None
     - Build output directory: public
   - In "Functions" settings, add:
     - KV namespace binding: RESUME_DATA
     - Environment variable: OPENAI_API_KEY
     - Environment variable: ADMIN_SECRET

3. Configure environment variables:
   - Add `OPENAI_API_KEY`
   - Add `ADMIN_SECRET`

4. Set up production KV namespace:
   ```bash
   # Create production namespace
   wrangler kv:namespace create "RESUME_DATA"
   
   # Upload context
   wrangler kv:key put --namespace-id "your_prod_namespace_id" "hidden-context" --path src/context/hidden-context.json
   ```

5. Add KV namespace binding in Cloudflare Pages settings

### 5. Customization Options

1. Color Scheme:
   - Edit CSS variables in `public/styles.css`:
   ```css
   :root {
     --primary-color: #2c3e50;
     --accent-color: #0059b3;
     --bg-color: #f8f9fc;
     --text-color: #333;
   }
   ```

2. Chat Behavior:
   - Modify chat settings in `public/js/chat.js`
   - Update AI prompt in `functions/api/chat.js`

## Maintenance

### Updating Content
1. Edit resume in `public/index.html`
2. Update AI context in `src/context/hidden-context.json`
3. Upload new context:
   ```bash
   # Development
   npm run upload-context
   
   # Production
   wrangler kv:key put --namespace-id "your_prod_namespace_id" "hidden-context" --path src/context/hidden-context.json
   ```

### Monitoring
- View chat logs at:
  - Development: `http://localhost:8788/api/logs?auth=your_admin_secret`
  - Production: `https://your-site.pages.dev/api/logs?auth=your_admin_secret`

## Support
For issues or questions, please open a GitHub issue in the repository.

## License
MIT License - feel free to modify and reuse this template for your own resume!

### 6. File Structure Overview
```
.
├── public/                 # Static files
│   ├── images/            # Profile and other images
│   ├── index.html         # Main resume HTML
│   ├── styles.css         # CSS styles
│   └── js/               
│       └── chat.js        # Chat widget functionality
├── functions/             # Cloudflare Functions
│   └── api/
│       └── chat.js        # Chat API endpoint
└── src/
    └── context/
        └── hidden-context.json  # AI knowledge base
```

### 7. Important Files to Update
1. `public/index.html`
   - Personal information
   - Resume content
   - Social links
   - Profile photo

2. `src/context/hidden-context.json`
   - Detailed background info
   - Experience details
   - Skills and achievements

3. `functions/api/chat.js`
   - Customize AI prompt
   - Adjust rate limiting if needed

4. `public/js/chat.js`
   - Customize chat behavior
   - Modify suggested questions 