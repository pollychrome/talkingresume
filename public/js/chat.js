// Initialize chat widget when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatWidget();
});

// Chat widget initialization and management
class ChatWidget {
    constructor() {
        this.init();
        this.initializeInfoIcons();
    }

    init() {
        // Initialize DOM elements
        this.widget = document.getElementById('chat-widget');
        this.toggleButton = document.getElementById('chat-toggle');
        this.container = document.getElementById('chat-container');
        this.messagesContainer = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendButton = document.getElementById('chat-send');
        this.charCounter = document.getElementById('char-counter');
        this.maxLength = parseInt(this.input.getAttribute('maxlength')) || 280;
        
        // Initialize components
        this.conversationHistory = [];
        this.initializeCharCounter();
        this.initializeEventListeners();
        
        // Clear existing messages and add welcome message
        while (this.messagesContainer.firstChild) {
            this.messagesContainer.removeChild(this.messagesContainer.firstChild);
        }
        
        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message bot';
        welcomeMessage.textContent = "Hello! Feel free to ask questions about the resume owner's experience and background.";
        this.messagesContainer.appendChild(welcomeMessage);
        
        // Create input wrapper div to hold suggestions and input
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-suggestions-wrapper';
        
        // Add suggested questions
        const suggestedQuestions = document.createElement('div');
        suggestedQuestions.className = 'suggested-questions';
        
        const questions = [
            "Hobbies",
            "Tech Journey",
            "Achievements"
        ];
        
        questions.forEach(question => {
            const button = document.createElement('button');
            button.className = 'suggestion';
            button.innerHTML = this.formatMessage(question);
            
            button.addEventListener('click', () => {
                console.log('Suggestion clicked:', question);
                
                // Hide this specific suggestion
                button.style.display = 'none';

                // Set input value and send through main send path
                this.input.value = question;
                this.sendMessage();
                
                // Hide suggestions container if all suggestions are hidden
                const visibleSuggestions = suggestedQuestions.querySelectorAll('.suggestion:not([style*="display: none"])');
                if (visibleSuggestions.length === 0) {
                    suggestedQuestions.classList.add('hidden');
                }
            });
            
            suggestedQuestions.appendChild(button);
        });
        
        // Add suggestions to input wrapper
        inputWrapper.appendChild(suggestedQuestions);
        
        // Move input field to wrapper
        const inputContainer = document.querySelector('.chat-input-container');
        inputWrapper.appendChild(inputContainer);
        
        // Add input wrapper to container
        this.container.appendChild(inputWrapper);

        // Create indicators after all other elements
        this.createTypingIndicator();
    }

    initializeEventListeners() {
        // Toggle chat open/close
        this.toggleButton.addEventListener('click', () => {
            if (this.container.classList.contains('hidden')) {
                this.openChat();
            }
        });

        // Minimize button handling with smooth transition
        document.addEventListener('click', (e) => {
            const minimizeBtn = e.target.closest('.chat-minimize');
            if (minimizeBtn) {
                e.preventDefault();
                this.minimizeChat();
            }
        });

        // Handle send message - bind to ensure correct 'this' context
        this.sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendMessage().catch(console.error);
        });
        
        // Handle enter key - bind to ensure correct 'this' context
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage().catch(console.error);
            }
        });

        // Auto-resize input
        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
        });

        // Handle transition end
        this.container.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'transform') {
                if (this.container.classList.contains('hidden')) {
                    this.container.style.display = 'none';
                    this.toggleButton.classList.remove('hidden');
                    this.toggleButton.classList.add('visible');
                }
            }
        });

        // Initial scroll to bottom
        this.scrollToBottom();
    }

    openChat() {
        this.toggleButton.classList.remove('visible');
        this.toggleButton.classList.add('hidden');
        
        // Show container after toggle button starts hiding
        setTimeout(() => {
            this.container.style.display = 'flex';
            // Trigger reflow for smooth animation
            void this.container.offsetWidth;
            this.container.classList.remove('hidden');
            this.container.classList.add('visible');
            document.body.classList.add('chat-open');
            this.scrollToBottom();
            this.input.focus();
        }, 150);
    }

    minimizeChat() {
        this.container.classList.remove('visible');
        this.container.classList.add('hidden');
        document.body.classList.remove('chat-open');
        
        // Show toggle button after animation
        setTimeout(() => {
            this.toggleButton.classList.remove('hidden');
            this.toggleButton.classList.add('visible');
        }, 300);
    }

    closeChat() {
        this.container.classList.add('hidden');
        this.toggleButton.classList.remove('hidden');
        document.body.classList.remove('chat-open');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    initializeCharCounter() {
        // Update character counter on input
        this.input.addEventListener('input', () => {
            const remaining = this.maxLength - this.input.value.length;
            this.charCounter.textContent = remaining;
            
            // Update counter color based on remaining chars
            this.charCounter.classList.toggle('near-limit', remaining < 50);
            this.charCounter.classList.toggle('at-limit', remaining < 20);
            
            // Existing auto-resize code
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
        });
    }

    formatMessage(text) {
        if (!text) return '';
        
        // Format bold text first
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Split text into lines
        const lines = text.split('\n');
        let formattedLines = [];
        let inList = false;
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Check for bullet points
            if (trimmedLine.startsWith('- ')) {
                if (!inList) {
                    inList = true;
                    formattedLines.push('<ul>');
                }
                formattedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
            } else if (trimmedLine.startsWith('* ')) {
                if (!inList) {
                    inList = true;
                    formattedLines.push('<ul>');
                }
                formattedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
            } else {
                if (inList) {
                    inList = false;
                    formattedLines.push('</ul>');
                }
                formattedLines.push(line);
            }
        });
        
        // Close any open list
        if (inList) {
            formattedLines.push('</ul>');
        }
        
        return formattedLines.join('\n');
    }

    loadConversation() {
        try {
            // Load conversation from localStorage
            const saved = localStorage.getItem('chatHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
                
                // Replay messages in the UI
                this.messagesContainer.innerHTML = ''; // Clear default message
                this.conversationHistory.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
                    messageDiv.innerHTML = this.formatMessage(msg.content);
                    this.messagesContainer.insertBefore(messageDiv, this.typingIndicator);
                });
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
            this.conversationHistory = [];
        }
    }

    saveConversation() {
        try {
            // Save to localStorage, but limit to last 50 messages
            const limitedHistory = this.conversationHistory.slice(-50);
            localStorage.setItem('chatHistory', JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }

    clearConversation() {
        // Hide typing indicator if visible
        this.hideTypingIndicator();
        
        // Clear the UI
        this.messagesContainer.innerHTML = `
            <div class="message bot">
                Hi! I'm an AI assistant with detailed knowledge about this candidate. 
                Feel free to ask me anything about their experience, skills, or projects!
            </div>
        `;
        
        // Re-add typing indicator
        this.createTypingIndicator();
        
        // Clear the history
        this.conversationHistory = [];
        this.saveConversation();
    }

    createTypingIndicator() {
        // Create thinking indicator
        this.thinkingIndicator = document.createElement('div');
        this.thinkingIndicator.className = 'message thinking';
        this.thinkingIndicator.textContent = 'Thinking';
        this.thinkingIndicator.style.display = 'none';
        this.messagesContainer.appendChild(this.thinkingIndicator);

        // Create typing indicator
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'message typing';
        this.typingIndicator.textContent = 'Typing';
        this.typingIndicator.style.display = 'none';
        this.messagesContainer.appendChild(this.typingIndicator);
    }

    showThinkingIndicator() {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.style.display = 'flex';
            this.scrollToBottom();
        }
    }

    hideThinkingIndicator() {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.style.display = 'none';
        }
    }

    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'flex';
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'none';
            this.scrollToBottom();
        }
    }

    scrollToMessage(message) {
        if (!message) return;
        
        const messageTop = message.offsetTop;
        const containerHeight = this.messagesContainer.clientHeight;
        const messageHeight = message.clientHeight;
        
        // Calculate position to show the full message
        const scrollPosition = Math.max(0, messageTop - containerHeight / 3);
        
        // Smoothly scroll to the calculated position
        this.messagesContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }

    async typewriterEffect(element, html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Process each child node
        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                // Handle text nodes
                const textNode = document.createTextNode('');
                element.appendChild(textNode);
                for (let i = 0; i < node.textContent.length; i++) {
                    textNode.textContent += node.textContent[i];
                    await new Promise(resolve => setTimeout(resolve, 40));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Create the same type of element
                const newElement = document.createElement(node.tagName);
                // Copy attributes
                for (const attr of node.attributes) {
                    newElement.setAttribute(attr.name, attr.value);
                }
                element.appendChild(newElement);
                
                // Recursively handle child elements
                await this.typewriterEffect(newElement, node.innerHTML);
            }
        }
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // Store the user's scroll position and the last message's position
        const scrollPos = this.messagesContainer.scrollTop;
        const wasAtBottom = (scrollPos + this.messagesContainer.clientHeight + 50) >= this.messagesContainer.scrollHeight;

        // Add user message
        const userMessageElement = this.addMessage(message, 'user');
        
        // Clear input and reset height
        this.input.value = '';
        this.input.style.height = 'auto';
        this.charCounter.textContent = this.maxLength;

        // Scroll handling for user message
        if (wasAtBottom) {
            this.scrollToBottom();
        } else {
            userMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Create and show thinking indicator after user message
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.className = 'message thinking';
        thinkingIndicator.textContent = 'Thinking';
        this.messagesContainer.appendChild(thinkingIndicator);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            thinkingIndicator.remove();
            
            const botResponse = data.message || data.response;
            if (botResponse) {
                // Create bot message element
                const botMessageElement = document.createElement('div');
                botMessageElement.className = 'message bot';
                this.messagesContainer.appendChild(botMessageElement);

                try {
                    // Apply typewriter effect to the formatted HTML
                    await this.typewriterEffect(botMessageElement, botResponse);
                    
                    // Save to conversation history
                    this.conversationHistory.push({ type: 'bot', text: botResponse });
                    this.saveConversation();
                } catch (formatError) {
                    console.error('Error formatting message:', formatError);
                    botMessageElement.textContent = botResponse;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            thinkingIndicator.remove();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'error');
            this.scrollToBottom();
        }
    }

    addMessage(text, type, save = true) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        
        // For user messages, we'll still use the old formatting
        if (type === 'user') {
            const formattedText = this.formatMessage(text);
            message.innerHTML = formattedText;
        } else {
            // For bot messages, we'll use the raw text as it should already be HTML
            message.innerHTML = text;
        }
        
        this.messagesContainer.appendChild(message);
        
        if (save) {
            this.conversationHistory.push({ type, text });
            this.saveConversation();
        }

        return message;
    }

    initializeInfoIcons() {
        document.querySelectorAll('.info-icon').forEach(icon => {
            icon.addEventListener('click', async (event) => {
                const company = event.currentTarget.dataset.company;
                const message = `Tell me more about Alex's experience at ${company}`;
                
                if (this.container.classList.contains('hidden')) {
                    this.openChat();
                }
                
                const userMessageElement = this.addMessage(message, 'user');
                
                const thinkingIndicator = document.createElement('div');
                thinkingIndicator.className = 'message thinking';
                thinkingIndicator.textContent = 'Thinking';
                this.messagesContainer.appendChild(thinkingIndicator);
                
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message })
                    });

                    if (!response.ok) throw new Error('API request failed');

                    const data = await response.json();
                    thinkingIndicator.remove();
                    
                    const botResponse = data.message || data.response;
                    if (botResponse) {
                        const botMessageElement = document.createElement('div');
                        botMessageElement.className = 'message bot';
                        this.messagesContainer.appendChild(botMessageElement);

                        try {
                            // Apply typewriter effect to the formatted HTML
                            await this.typewriterEffect(botMessageElement, botResponse);
                            
                            // Save to conversation history
                            this.conversationHistory.push({ type: 'bot', text: botResponse });
                            this.saveConversation();
                        } catch (formatError) {
                            console.error('Error formatting message:', formatError);
                            botMessageElement.textContent = botResponse;
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    thinkingIndicator.remove();
                    this.addMessage('Sorry, I encountered an error. Please try again.', 'error');
                }
            });
        });
    }
}

const systemMessage = {
    role: 'system',
    content: `
// CONFIGURATION INSTRUCTIONS:
// 1. Replace {YOUR_NAME} with your actual name throughout this prompt
// 2. Customize the rules section to match your resume content
// 3. Update the formatting instructions if you want to change how responses are styled
// 4. Remove these configuration comments when done

You are a helpful AI assistant that answers questions about {YOUR_NAME}'s professional experience, skills, and background in a friendly, conversational tone.

Please follow these rules:

1. Stay on the topic of {YOUR_NAME}'s:
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
<p>Let me tell you about {YOUR_NAME}'s experience with [topic]...</p>
<ul>
    <li>Key point one</li>
    <li>Key point two</li>
</ul>
<p>Would you like to know more about any specific aspect?</p>

${exampleQA}
`.trim()
}; 