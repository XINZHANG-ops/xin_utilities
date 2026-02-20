// i18n Core - Xin Utilities Internationalization System

const I18n = {
  currentLang: 'zh',
  translations: {},
  onChangeCallbacks: [],

  // Initialize with language detection
  init() {
    // Check localStorage first
    const saved = localStorage.getItem('xin-lang');
    if (saved && (saved === 'zh' || saved === 'en')) {
      this.currentLang = saved;
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language || navigator.userLanguage;
      this.currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
    }
    this.applyTranslations();
    this.updateLangToggle();
  },

  // Set language
  setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    this.currentLang = lang;
    localStorage.setItem('xin-lang', lang);
    this.applyTranslations();
    this.updateLangToggle();
    this.onChangeCallbacks.forEach(cb => cb(lang));
  },

  // Register callback for language changes
  onChange(callback) {
    this.onChangeCallbacks.push(callback);
  },

  // Toggle between languages
  toggle() {
    this.setLang(this.currentLang === 'zh' ? 'en' : 'zh');
  },

  // Get translation by key (supports nested keys like "common.back")
  t(key, params = {}) {
    const lang = this.translations[this.currentLang];
    if (!lang) return key;

    const keys = key.split('.');
    let value = lang;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Key not found
      }
    }

    // Replace params like {name}
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, name) => params[name] || `{${name}}`);
    }
    return value;
  },

  // Apply translations to all elements with data-i18n attribute
  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation !== key) {
        el.textContent = translation;
      }
    });

    // Handle placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation !== key) {
        el.placeholder = translation;
      }
    });

    // Handle title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation !== key) {
        el.title = translation;
      }
    });

    // Update page title
    const titleEl = document.querySelector('[data-i18n-page-title]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n-page-title');
      document.title = this.t(key);
    }

    // Update html lang attribute
    document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en';
  },

  // Update language toggle button state
  updateLangToggle() {
    const toggleBtn = document.getElementById('langToggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.currentLang === 'zh' ? 'EN' : '中';
      toggleBtn.title = this.currentLang === 'zh' ? 'Switch to English' : '切换到中文';
    }
  },

  // Register translations
  register(lang, translations) {
    this.translations[lang] = translations;
  }
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18n.init());
} else {
  I18n.init();
}
