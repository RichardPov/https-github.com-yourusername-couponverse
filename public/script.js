document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentLang = 'en';
    let translations = {};
    let allCoupons = [];
    let currentCategory = 'all';

    // Elements
    const couponsGrid = document.getElementById('coupons-grid');
    const toast = document.getElementById('toast');
    const modal = document.getElementById('coupon-modal');
    const modalCode = document.getElementById('modal-code');
    const modalClose = document.querySelector('.modal-close');
    const copyBtn = document.getElementById('copy-btn');
    const newsletterForm = document.getElementById('newsletter-form');
    const langBtns = document.querySelectorAll('[data-lang]');
    const currentLangSpan = document.querySelector('.current-lang');

    // Init
    loadTranslations(currentLang);
    fetchCoupons();

    // --- Translations ---
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            translations = await response.json();
            applyTranslations();
            currentLang = lang;
            currentLangSpan.textContent = lang.toUpperCase();

            // Update active state in dropdown
            // (Optional visual polish)
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                    el.placeholder = translations[key];
                } else {
                    el.textContent = translations[key];
                }
            }
        });
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            loadTranslations(lang);
        });
    });

    // --- Coupons & API ---
    async function fetchCoupons() {
        try {
            const response = await fetch('/api/coupons');
            const data = await response.json();

            if (data.message === 'success') {
                allCoupons = data.data;
                renderCoupons();
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
            couponsGrid.innerHTML = '<p class="loading-spinner">Failed to load coupons. Please try again later.</p>';
        }
    }

    function renderCoupons() {
        couponsGrid.innerHTML = '';

        const filtered = currentCategory === 'all'
            ? allCoupons
            : allCoupons.filter(c => c.category === currentCategory);

        if (filtered.length === 0) {
            couponsGrid.innerHTML = '<p class="loading-spinner">No coupons found in this category.</p>';
            return;
        }

        filtered.forEach(coupon => {
            const card = document.createElement('article');
            card.className = 'coupon-card';
            card.innerHTML = `
                <div class="coupon-top">
                    <span class="verified-badge"><i class="fa-solid fa-check-circle"></i> ${translations['verified'] || 'Verified'}</span>
                    <div class="store-logo">
                        <i class="fa-solid fa-store"></i>
                    </div>
                </div>
                <div class="coupon-content">
                    <h4 class="store-name">${coupon.store_name}</h4>
                    <h3 class="discount-amount">${coupon.discount_amount}</h3>
                    <p class="coupon-desc">${coupon.description}</p>
                    <div class="coupon-meta">
                        <span><i class="fa-solid fa-users"></i> 100+ ${translations['used'] || 'used'}</span>
                        <span><i class="fa-regular fa-clock"></i> ${translations['expires'] || 'Expires'}: ${new Date(coupon.expiry_date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="coupon-action">
                    <button class="btn btn-outline reveal-btn" data-code="${coupon.code}">
                        <span class="btn-text">${translations['show_code'] || 'Show Code'}</span>
                    </button>
                </div>
            `;

            // Add click event for this specific button
            const btn = card.querySelector('.reveal-btn');
            btn.addEventListener('click', () => openModal(coupon.code));

            couponsGrid.appendChild(card);
        });
    }

    // --- Category Filtering ---
    const categoryBtns = document.querySelectorAll('.category-card');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category');
            renderCoupons();
        });
    });

    // --- Modal Logic ---
    function openModal(code) {
        modalCode.textContent = code;
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    copyBtn.addEventListener('click', () => {
        const code = modalCode.textContent;
        navigator.clipboard.writeText(code).then(() => {
            showToast();
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = translations['modal_copy'] || 'Copy Code';
            }, 2000);
        });
    });

    // --- Toast ---
    function showToast() {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // --- Newsletter ---
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const email = emailInput.value;
        const btn = newsletterForm.querySelector('button');
        const originalText = btn.textContent;

        btn.textContent = 'Subscribing...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Successfully subscribed!');
                emailInput.value = '';
            } else {
                alert(result.error || 'Subscription failed');
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            alert('An error occurred. Please try again.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Sticky Header
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            header.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        } else {
            header.style.boxShadow = 'none';
            header.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
        }
    });
});
