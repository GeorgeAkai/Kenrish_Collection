// Modern Kenrish Collection JavaScript - Performance Optimized

class KenrishApp {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.setupLazyLoading();
    }

    init() {
        // Initialize app
        this.showLoader();
        this.setupSearchDebounce();
        this.setupImageOptimization();
        
        // Hide loader when page is fully loaded
        window.addEventListener('load', () => {
            this.hideLoader();
        });
    }

    setupEventListeners() {
        // Debounced search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', this.handleSmoothScroll);
        });

        // Product card interactions
        this.setupProductCardEvents();
        
        // Dark mode toggle
        this.setupDarkMode();
    }

    setupIntersectionObserver() {
        // Animate elements on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    setupLazyLoading() {
        // Lazy load images for better performance
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('loading-skeleton');
                        img.classList.add('fade-in');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                img.classList.add('loading-skeleton');
                imageObserver.observe(img);
            });
        }
    }

    setupProductCardEvents() {
        document.querySelectorAll('.product-card').forEach(card => {
            // Add hover effects
            card.addEventListener('mouseenter', this.handleCardHover);
            card.addEventListener('mouseleave', this.handleCardLeave);
            
            // Add click analytics
            card.addEventListener('click', this.handleCardClick);
        });
    }

    setupSearchDebounce() {
        this.searchCache = new Map();
    }

    setupImageOptimization() {
        // Preload critical images
        const criticalImages = document.querySelectorAll('.hero-image, .featured-product img');
        criticalImages.forEach(img => {
            if (img.dataset.src) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = img.dataset.src;
                document.head.appendChild(link);
            }
        });
    }

    setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            // Check for saved preference or system preference
            const savedTheme = localStorage.getItem('kenrish-theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                document.body.classList.add('dark-mode');
                darkModeToggle.innerHTML = '<i class="bi bi-sun"></i>';
            }

            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('kenrish-theme', isDark ? 'dark' : 'light');
                darkModeToggle.innerHTML = isDark ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
            });
        }
    }

    handleSearch(event) {
        const query = event.target.value.trim().toLowerCase();
        const cacheKey = query;

        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            this.displaySearchResults(this.searchCache.get(cacheKey));
            return;
        }

        // Perform search
        const productCards = document.querySelectorAll('.product-card');
        const results = [];

        productCards.forEach(card => {
            const title = card.querySelector('.product-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.product-description')?.textContent.toLowerCase() || '';
            
            const isMatch = title.includes(query) || description.includes(query);
            
            if (isMatch || query === '') {
                results.push(card);
                card.style.display = '';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });

        // Cache results
        this.searchCache.set(cacheKey, results);
        
        // Show no results message
        this.toggleNoResultsMessage(results.length === 0 && query !== '');
    }

    displaySearchResults(results) {
        const allCards = document.querySelectorAll('.product-card');
        
        allCards.forEach(card => {
            if (results.includes(card)) {
                card.style.display = '';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });
    }

    toggleNoResultsMessage(show) {
        let noResultsMsg = document.getElementById('noResultsMessage');
        
        if (show && !noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'noResultsMessage';
            noResultsMsg.className = 'text-center py-5';
            noResultsMsg.innerHTML = `
                <div class="text-muted">
                    <i class="bi bi-search" style="font-size: 3rem; opacity: 0.3;"></i>
                    <h4 class="mt-3">No products found</h4>
                    <p>Try adjusting your search terms</p>
                </div>
            `;
            document.querySelector('.product-grid').appendChild(noResultsMsg);
        } else if (!show && noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    handleCardHover(event) {
        const card = event.currentTarget;
        card.style.transform = 'translateY(-8px) scale(1.02)';
        
        // Add subtle animation to card elements
        const img = card.querySelector('img');
        if (img) {
            img.style.transform = 'scale(1.05)';
        }
    }

    handleCardLeave(event) {
        const card = event.currentTarget;
        card.style.transform = '';
        
        const img = card.querySelector('img');
        if (img) {
            img.style.transform = '';
        }
    }

    handleCardClick(event) {
        // Analytics tracking (replace with your analytics service)
        const card = event.currentTarget;
        const productName = card.querySelector('.product-title')?.textContent;
        
        // Example: Google Analytics event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'product_click', {
                'product_name': productName,
                'event_category': 'engagement'
            });
        }
        
        // Add click animation
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
    }

    handleSmoothScroll(event) {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    showLoader() {
        const loader = document.getElementById('kenrish-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoader() {
        const loader = document.getElementById('kenrish-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Performance monitoring
    measurePerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                    
                    // Send to analytics if needed
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'page_load_time', {
                            'value': Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                            'event_category': 'performance'
                        });
                    }
                }, 0);
            });
        }
    }
}

// Service Worker for caching (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new KenrishApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KenrishApp;
}
