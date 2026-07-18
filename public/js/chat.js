const HISTORY_STORAGE_KEY = 'talking-resume:history:v2';
const SESSION_STORAGE_KEY = 'talking-resume:session:v1';
const MAX_HISTORY_LENGTH = 50;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const WELCOME_MESSAGE =
    "Hello! Feel free to ask questions about the resume owner's experience and background.";

class ChatServiceError extends Error {}

class ChatWidget {
    constructor() {
        this.container = getRequiredElement('chat-container');
        this.form = getRequiredElement('chat-form');
        this.input = getRequiredElement('chat-input');
        this.sendButton = getRequiredElement('chat-send');
        this.toggleButton = getRequiredElement('chat-toggle');
        this.minimizeButton = this.container.querySelector('.chat-minimize');
        this.messagesContainer = getRequiredElement('chat-messages');
        this.charCounter = getRequiredElement('char-counter');
        this.suggestions = [...document.querySelectorAll('[data-question]')];
        this.infoButtons = [...document.querySelectorAll('.info-icon[data-company]')];
        this.maxLength = Number(this.input.maxLength) || 280;
        this.history = [];
        this.isSending = false;
        this.sessionId = getOrCreateSessionId();

        if (!this.restoreHistory()) {
            this.appendMessage(WELCOME_MESSAGE, 'assistant');
        }
        this.bindEvents();
        this.updateInputState();
    }

    bindEvents() {
        this.toggleButton.addEventListener('click', () => this.open());
        this.minimizeButton?.addEventListener('click', () => this.minimize());
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            void this.sendMessage(this.input.value);
        });
        this.input.addEventListener('input', () => this.updateInputState());
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.form.requestSubmit();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.container.classList.contains('hidden')) {
                this.minimize();
            }
        });

        for (const suggestion of this.suggestions) {
            suggestion.addEventListener('click', () => {
                suggestion.hidden = true;
                this.hideEmptySuggestions();
                void this.sendMessage(suggestion.dataset.question);
            });
        }

        for (const button of this.infoButtons) {
            button.addEventListener('click', () => {
                this.open();
                void this.sendMessage(
                    `Tell me more about the experience at ${button.dataset.company}`,
                );
            });
        }
    }

    open() {
        this.container.classList.remove('hidden');
        this.toggleButton.classList.add('hidden');
        this.container.setAttribute('aria-hidden', 'false');
        this.toggleButton.setAttribute('aria-expanded', 'true');
        document.body.classList.add('chat-open');
        this.scrollToBottom();
        this.input.focus();
    }

    minimize() {
        this.container.classList.add('hidden');
        this.toggleButton.classList.remove('hidden');
        this.container.setAttribute('aria-hidden', 'true');
        this.toggleButton.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('chat-open');
        this.toggleButton.focus();
    }

    async sendMessage(rawMessage) {
        const message = rawMessage?.trim();
        if (!message || this.isSending) return;

        this.appendMessage(message, 'user');
        this.input.value = '';
        this.updateInputState();
        this.setSendingState(true);

        const statusElement = this.appendMessage('Thinking…', 'status');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Chat-Session': this.sessionId,
                },
                body: JSON.stringify({ message }),
            });
            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new ChatServiceError(data?.error?.message || 'The chat request failed.');
            }
            if (typeof data?.message !== 'string' || !data.message.trim()) {
                throw new ChatServiceError('The chat service returned an invalid response.');
            }

            statusElement.remove();
            this.appendMessage(data.message.trim(), 'assistant');
            this.recordExchange(message, data.message.trim());
        } catch (error) {
            if (!(error instanceof ChatServiceError)) {
                console.error('Chat request failed', { name: error.name });
            }
            statusElement.remove();
            this.appendMessage(
                error.message || 'Sorry, the chat is unavailable. Please try again.',
                'error',
            );
        } finally {
            this.setSendingState(false);
            this.input.focus();
        }
    }

    appendMessage(content, role) {
        const element = document.createElement('div');
        element.className = `message ${role === 'assistant' ? 'bot' : role}`;
        element.textContent = content;
        this.messagesContainer.append(element);

        this.scrollToBottom();
        return element;
    }

    recordExchange(message, answer) {
        this.history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: answer },
        );
        this.history = this.history.slice(-MAX_HISTORY_LENGTH);
        this.saveHistory();
    }

    setSendingState(isSending) {
        this.isSending = isSending;
        this.input.disabled = isSending;
        this.sendButton.disabled = isSending;
        this.messagesContainer.setAttribute('aria-busy', String(isSending));
        for (const suggestion of this.suggestions) {
            suggestion.disabled = isSending;
        }
        for (const button of this.infoButtons) {
            button.disabled = isSending;
        }
    }

    updateInputState() {
        const remaining = Math.max(0, this.maxLength - this.input.value.length);
        this.charCounter.textContent = String(remaining);
        this.charCounter.classList.toggle('near-limit', remaining < 50);
        this.charCounter.classList.toggle('at-limit', remaining < 20);
        this.input.style.height = 'auto';
        this.input.style.height = `${Math.min(this.input.scrollHeight, 100)}px`;
    }

    hideEmptySuggestions() {
        const suggestionsContainer = getRequiredElement('suggested-questions');
        suggestionsContainer.hidden = this.suggestions.every((suggestion) => suggestion.hidden);
    }

    restoreHistory() {
        try {
            const storedHistory = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]');
            if (!Array.isArray(storedHistory) || storedHistory.length === 0) return false;

            const validHistory = storedHistory
                .filter(
                    (entry) =>
                        (entry?.role === 'user' || entry?.role === 'assistant') &&
                        typeof entry.content === 'string',
                )
                .slice(-MAX_HISTORY_LENGTH);

            if (!validHistory.length) return false;

            this.messagesContainer.replaceChildren();
            this.history = validHistory;
            for (const entry of validHistory) {
                this.appendMessage(entry.content, entry.role);
            }
            return true;
        } catch {
            this.history = [];
            localStorage.removeItem(HISTORY_STORAGE_KEY);
            return false;
        }
    }

    saveHistory() {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
        } catch {
            // Storage may be unavailable in private browsing or restricted contexts.
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }
}

function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: #${id}`);
    }
    return element;
}

function getOrCreateSessionId() {
    try {
        const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (SESSION_ID_PATTERN.test(storedId ?? '')) return storedId;

        const sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        return sessionId;
    } catch {
        return crypto.randomUUID();
    }
}

async function readJsonResponse(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatWidget();
});
