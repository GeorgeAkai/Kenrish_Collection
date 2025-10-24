// Chat UI Controls
class ChatUI {
    constructor() {
        this.chatFab = document.getElementById('chatFab');
        this.chatPanel = document.getElementById('chatPanel');
        this.closeBtn = document.getElementById('closeBtn');
        this.minBtn = document.getElementById('minBtn');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // FAB click to open
        this.chatFab.addEventListener('click', () => this.openChat());
        
        // Close button
        this.closeBtn.addEventListener('click', () => this.closeChat());
        
        // Minimize button
        this.minBtn.addEventListener('click', () => this.closeChat());
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.chatPanel.contains(e.target) && !this.chatFab.contains(e.target)) {
                this.closeChat();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
            }
        });
    }
    
    openChat() {
        this.chatPanel.classList.add('open');
        this.chatPanel.setAttribute('aria-hidden', 'false');
        this.chatFab.style.display = 'none';
        this.isOpen = true;
        
        // Focus on input
        setTimeout(() => {
            const inputBox = document.getElementById('inputBox');
            if (inputBox) inputBox.focus();
        }, 300);
    }
    
    closeChat() {
        this.chatPanel.classList.remove('open');
        this.chatPanel.setAttribute('aria-hidden', 'true');
        this.chatFab.style.display = 'flex';
        this.isOpen = false;
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatUI();
});
