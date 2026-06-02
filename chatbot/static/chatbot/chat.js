class KenrishChat {
    constructor() {
        this.conversationId = null;
        this.isStreaming = false;
        this.messagesContainer = document.getElementById('messages');
        this.inputBox = document.getElementById('inputBox');
        this.sendBtn = document.getElementById('sendBtn');
        
        this.init();
        this.addWelcomeMessage();
        this.addSampleQuestions();
    }
    
    init() {
        // Auto-resize textarea
        this.inputBox.addEventListener('input', () => {
            this.inputBox.style.height = 'auto';
            this.inputBox.style.height = Math.min(this.inputBox.scrollHeight, 140) + 'px';
        });
        
        // Send on Enter (but not Shift+Enter)
        this.inputBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Send button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    addWelcomeMessage() {
        const welcomeMsg = `👋 Welcome to Kenrish Collection! 

I'm Rexi, your virtual assistant here to help you with information about our:
• Beauty products and cosmetics
• Stylish handbags and accessories  
• Professional beauty services
• Current offers and pricing
• Business location and hours

How can I assist you today?`;
        
        this.addMessage('assistant', welcomeMsg);
    }
    
    addSampleQuestions() {
        const sampleQuestions = [
            "What beauty products do you have?",
            "Show me your handbag collection",
            "What services do you offer?",
            "Where are you located?",
            "Do you have any current offers?"
        ];
        
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'sample-questions';
        questionsContainer.innerHTML = `
            <div style="margin: 16px 0; padding: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 12px;">
                <div style="font-size: 14px; color: var(--muted); margin-bottom: 8px;">💡 Try asking:</div>
                ${sampleQuestions.map(q => `
                    <button class="sample-question-btn" onclick="kenrishChat.askSampleQuestion('${q}')" 
                            style="display: block; width: 100%; text-align: left; background: transparent; border: 1px solid var(--border); 
                                   color: var(--text); padding: 8px 12px; margin: 4px 0; border-radius: 8px; cursor: pointer; font-size: 13px;">
                        ${q}
                    </button>
                `).join('')}
            </div>
        `;
        
        this.messagesContainer.appendChild(questionsContainer);
        this.scrollToBottom();
    }
    
    askSampleQuestion(question) {
        this.inputBox.value = question;
        this.sendMessage();
        
        // Remove sample questions after first use
        const sampleQuestions = document.querySelector('.sample-questions');
        if (sampleQuestions) {
            sampleQuestions.remove();
        }
    }
    
    async sendMessage() {
        const message = this.inputBox.value.trim();
        if (!message || this.isStreaming) return;
        
        // Clear input
        this.inputBox.value = '';
        this.inputBox.style.height = 'auto';
        
        // Add user message
        this.addMessage('user', message);
        
        // Start conversation if needed
        if (!this.conversationId) {
            await this.startConversation();
        }
        
        // Add typing indicator
        const typingId = this.addTypingIndicator();
        
        try {
            this.isStreaming = true;
            this.sendBtn.disabled = true;
            
            // Stream response
            await this.streamResponse(message, typingId);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeMessage(typingId);
            this.addMessage('assistant', 'I apologize, but I encountered an error. Please try again.');
        } finally {
            this.isStreaming = false;
            this.sendBtn.disabled = false;
        }
    }
    
    async startConversation() {
        try {
            const response = await fetch('/chatbot/conversations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.conversationId = data.id;
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    }
    
    async streamResponse(message, typingId) {
        const response = await fetch(`/chatbot/conversations/${this.conversationId}/messages/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // Remove typing indicator
        this.removeMessage(typingId);
        
        // Add assistant message container
        const messageId = this.addMessage('assistant', '');
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        // Read stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    if (data.trim()) {
                        messageElement.textContent += data;
                        this.scrollToBottom();
                    }
                }
            }
        }
    }
    
    addMessage(role, content) {
        const messageId = Date.now() + Math.random();
        const messageDiv = document.createElement('div');
        messageDiv.className = `bubble ${role}`;
        messageDiv.setAttribute('data-message-id', messageId);
        messageDiv.textContent = content;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageId;
    }
    
    addTypingIndicator() {
        const messageId = Date.now() + Math.random();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bubble assistant';
        typingDiv.setAttribute('data-message-id', messageId);
        typingDiv.innerHTML = '<div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
        
        return messageId;
    }
    
    removeMessage(messageId) {
        const element = document.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
            element.remove();
        }
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }
}

// Initialize chat when DOM is loaded
let kenrishChat;
document.addEventListener('DOMContentLoaded', () => {
    kenrishChat = new KenrishChat();
});
