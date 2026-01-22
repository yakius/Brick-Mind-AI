// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    // ВАЖНО: Замените на свои ключи из Supabase!
    SUPABASE_URL: 'https://tzasx1oyqntvxikdvlmn.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6YXN4MW95cW50dnhpa2R2bG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NTgwMDUsImV4cCI6MjAyNTEzNDAwNX0._KzXqTjrxYhBqHkr04sA8UENgWt0QLINPrt3p8mhRjo',
    
    // Настройки API
    API_BASE_URL: 'https://brickmind-ai.vercel.app/api',
    
    // Списки для демо-данных
    THEMES: ['Star Wars', 'Technic', 'City', 'Creator Expert', 'Marvel', 'Ideas', 'Ninjago', 'Harry Potter'],
    RETAILERS: [
        { id: 'ozon', name: 'OZON', color: '#005BFF', icon: '🛒' },
        { id: 'wildberries', name: 'Wildberries', color: '#FF3366', icon: '📦' },
        { id: 'yandex', name: 'Яндекс.Маркет', color: '#FC3F1D', icon: '📊' },
        { id: 'avito', name: 'Avito', color: '#66CC33', icon: '🏷️' },
        { id: 'dns', name: 'ДНС', color: '#00A550', icon: '💻' },
        { id: 'citilink', name: 'Ситилинк', color: '#FF6B00', icon: '💻' }
    ],
    
    // Настройки приложения
    DEFAULT_LIMIT: 20,
    MAX_WISHLIST_ITEMS: 100,
    MAX_COMPARE_SETS: 4,
    
    // Цены за деталь по темам (для демо)
    PRICE_PER_PIECE: {
        'Star Wars': 0.45,
        'Technic': 0.40,
        'City': 0.35,
        'Creator Expert': 0.50,
        'Marvel': 0.42,
        'Ideas': 0.48,
        'Ninjago': 0.38,
        'Harry Potter': 0.46,
        'default': 0.35
    }
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let currentSection = 'search';
let searchResults = [];
let wishlist = [];
let compareSets = [];
let searchHistory = [];
let userSettings = {
    priceAlerts: true,
    darkMode: false,
    emailNotifications: true
};

// ==================== ИНИЦИАЛИЗАЦИЯ SUPABASE ====================
let supabase;
try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log('✅ Supabase инициализирован:', CONFIG.SUPABASE_URL);
} catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
}

// ==================== УТИЛИТЫ ====================
class Utils {
    static formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }
    
    static formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        
        if (diff === 0) return 'Сегодня';
        if (diff === 1) return 'Вчера';
        if (diff < 7) return `${diff} дня назад`;
        
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
    
    static generateAvatarGradient(userId) {
        if (!userId) return 'linear-gradient(135deg, #6366f1, #8b5cf6)';
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue1 = Math.abs(hash % 360);
        const hue2 = (hue1 + 60) % 360;
        
        return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 60%))`;
    }
    
    static getInitials(username) {
        if (!username) return 'Г';
        const parts = username.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    }
    
    static debounce(func, wait) {
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
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePassword(password) {
        return password.length >= 6;
    }
}

// ==================== УВЕДОМЛЕНИЯ ====================
class Toast {
    static show(type, title, message, duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Автозакрытие
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
        
        // Закрытие по клику
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        });
        
        return toast;
    }
    
    static success(title, message, duration = 3000) {
        return this.show('success', title, message, duration);
    }
    
    static error(title, message, duration = 5000) {
        return this.show('error', title, message, duration);
    }
    
    static warning(title, message, duration = 4000) {
        return this.show('warning', title, message, duration);
    }
    
    static info(title, message, duration = 3000) {
        return this.show('info', title, message, duration);
    }
}

// ==================== АВТОРИЗАЦИЯ ====================
class AuthManager {
    static async init() {
        if (!supabase) {
            console.warn('Supabase не инициализирован');
            return;
        }
        
        try {
            // Проверяем текущую сессию
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Ошибка получения сессии:', error);
                return;
            }
            
            if (session) {
                currentUser = session.user;
                console.log('✅ Пользователь авторизован:', currentUser.email);
                
                // Загружаем данные пользователя
                await this.loadUserData();
                await this.loadUserSettings();
                
                // Обновляем UI
                this.updateUI();
            }
            
            // Слушаем изменения авторизации
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                if (session) {
                    currentUser = session.user;
                    await this.loadUserData();
                    await this.loadUserSettings();
                    this.updateUI();
                    
                    if (event === 'SIGNED_IN') {
                        Toast.success('Успешный вход', `Добро пожаловать, ${currentUser.email}!`);
                    }
                } else {
                    currentUser = null;
                    wishlist = [];
                    searchHistory = [];
                    userSettings = {
                        priceAlerts: true,
                        darkMode: false,
                        emailNotifications: true
                    };
                    this.updateUI();
                    
                    if (event === 'SIGNED_OUT') {
                        Toast.info('Вы вышли', 'Ваша сессия завершена');
                    }
                }
            });
            
        } catch (error) {
            console.error('Ошибка инициализации авторизации:', error);
        }
    }
    
    static async loadUserData() {
        if (!currentUser || !supabase) return;
        
        try {
            // Загружаем профиль
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Ошибка загрузки профиля:', profileError);
            }
            
            if (!profile) {
                // Создаем профиль, если его нет
                const username = currentUser.email.split('@')[0];
                const { error: createError } = await supabase
                    .from('user_profiles')
                    .insert([{
                        id: currentUser.id,
                        username: username,
                        email: currentUser.email,
                        avatar_url: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);
                
                if (createError) {
                    console.error('Ошибка создания профиля:', createError);
                }
            }
            
            // Загружаем вишлист
            const { data: wishlistData, error: wishlistError } = await supabase
                .from('wishlists')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            if (wishlistError) {
                console.error('Ошибка загрузки вишлиста:', wishlistError);
            } else {
                wishlist = wishlistData || [];
            }
            
            // Загружаем историю поиска
            const { data: historyData, error: historyError } = await supabase
                .from('search_history')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('searched_at', { ascending: false })
                .limit(20);
            
            if (historyError) {
                console.error('Ошибка загрузки истории:', historyError);
            } else {
                searchHistory = historyData || [];
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }
    }
    
    static async loadUserSettings() {
        if (!currentUser || !supabase) return;
        
        try {
            const { data: settings, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Ошибка загрузки настроек:', error);
            }
            
            if (settings) {
                userSettings = { ...userSettings, ...settings };
                
                // Применяем настройки темы
                if (settings.dark_mode !== undefined) {
                    document.documentElement.setAttribute('data-theme', 
                        settings.dark_mode ? 'dark' : 'light');
                }
                
                // Обновляем переключатели в UI
                const priceAlerts = document.getElementById('priceAlerts');
                const darkMode = document.getElementById('darkMode');
                const emailNotifications = document.getElementById('emailNotifications');
                
                if (priceAlerts) priceAlerts.checked = userSettings.priceAlerts;
                if (darkMode) darkMode.checked = userSettings.darkMode;
                if (emailNotifications) emailNotifications.checked = userSettings.emailNotifications;
            }
            
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }
    
    static async saveUserSettings() {
        if (!currentUser || !supabase) return;
        
        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: currentUser.id,
                    price_alerts: userSettings.priceAlerts,
                    dark_mode: userSettings.darkMode,
                    email_notifications: userSettings.emailNotifications,
                    updated_at: new Date().toISOString()
                });
            
            if (error) {
                console.error('Ошибка сохранения настроек:', error);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            return false;
        }
    }
    
    static async login() {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        
        if (!email || !password) {
            Toast.warning('Заполните все поля', 'Введите email и пароль');
            return;
        }
        
        if (!Utils.validateEmail(email)) {
            Toast.warning('Неверный email', 'Введите корректный email адрес');
            return;
        }
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    Toast.error('Ошибка входа', 'Неверный email или пароль');
                } else if (error.message.includes('Email not confirmed')) {
                    Toast.error('Email не подтвержден', 'Проверьте вашу почту');
                } else {
                    Toast.error('Ошибка входа', error.message);
                }
                return;
            }
            
            Toast.success('Успешный вход', `Добро пожаловать, ${data.user.email}!`);
            this.hideAuthModal();
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            Toast.error('Ошибка входа', 'Произошла ошибка при входе');
        }
    }
    
    static async register() {
        const username = document.getElementById('registerUsername')?.value.trim();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const confirm = document.getElementById('registerConfirm')?.value;
        
        // Валидация
        if (!username || !email || !password || !confirm) {
            Toast.warning('Заполните все поля', 'Все поля обязательны для заполнения');
            return;
        }
        
        if (!Utils.validateEmail(email)) {
            Toast.warning('Неверный email', 'Введите корректный email адрес');
            return;
        }
        
        if (!Utils.validatePassword(password)) {
            Toast.warning('Слабый пароль', 'Пароль должен быть не менее 6 символов');
            return;
        }
        
        if (password !== confirm) {
            Toast.warning('Пароли не совпадают', 'Проверьте введенные пароли');
            return;
        }
        
        try {
            // Регистрируем пользователя
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    },
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) {
                if (error.message.includes('already registered')) {
                    Toast.error('Пользователь существует', 'Этот email уже зарегистрирован');
                } else {
                    Toast.error('Ошибка регистрации', error.message);
                }
                return;
            }
            
            // Создаем профиль в базе данных
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert([{
                        id: data.user.id,
                        username: username,
                        email: email,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);
                
                if (profileError) {
                    console.error('Ошибка создания профиля:', profileError);
                }
                
                // Создаем настройки по умолчанию
                await supabase
                    .from('user_settings')
                    .insert([{
                        user_id: data.user.id,
                        price_alerts: true,
                        dark_mode: false,
                        email_notifications: true,
                        updated_at: new Date().toISOString()
                    }]);
            }
            
            Toast.success('Успешная регистрация!', 'Проверьте вашу почту для подтверждения');
            this.hideAuthModal();
            
            // Переключаемся на форму входа
            document.querySelector('.auth-tab[data-tab="login"]')?.click();
            if (document.getElementById('loginEmail')) {
                document.getElementById('loginEmail').value = email;
            }
            if (document.getElementById('loginPassword')) {
                document.getElementById('loginPassword').value = '';
            }
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            Toast.error('Ошибка регистрации', 'Произошла ошибка при регистрации');
        }
    }
    
    static async loginWithGoogle() {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
        } catch (error) {
            console.error('Ошибка Google OAuth:', error);
            Toast.error('Ошибка входа', 'Не удалось войти через Google');
        }
    }
    
    static async loginWithVK() {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'vk',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
        } catch (error) {
            console.error('Ошибка VK OAuth:', error);
            Toast.error('Ошибка входа', 'Не удалось войти через ВКонтакте');
        }
    }
    
    static async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            document.getElementById('userDropdown')?.classList.remove('active');
            
        } catch (error) {
            console.error('Ошибка выхода:', error);
            Toast.error('Ошибка', 'Не удалось выйти из аккаунта');
        }
    }
    
    static updateUI() {
        const updateElement = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        
        const updateAvatar = (id, username, userId) => {
            const el = document.getElementById(id);
            if (!el) return;
            
            if (currentUser) {
                const initials = Utils.getInitials(username);
                el.innerHTML = `<span>${initials}</span>`;
                el.style.background = Utils.generateAvatarGradient(userId);
            } else {
                el.innerHTML = '<i class="fas fa-user"></i>';
                el.style.background = '';
            }
        };
        
        if (currentUser) {
            const username = currentUser.user_metadata?.username || 
                            currentUser.email?.split('@')[0] || 
                            'Пользователь';
            
            // Обновляем текст
            updateElement('userName', username);
            updateElement('userNameSm', username);
            updateElement('userEmail', currentUser.email);
            updateElement('profileName', username);
            updateElement('profileEmail', currentUser.email);
            
            // Обновляем аватары
            updateAvatar('userAvatar', username, currentUser.id);
            updateAvatar('userAvatarLg', username, currentUser.id);
            updateAvatar('profileAvatar', username, currentUser.id);
            
            // Обновляем счетчики
            updateElement('wishlistCount', wishlist.length);
            updateElement('searchCount', searchHistory.length);
            updateElement('profileWishlist', wishlist.length);
            updateElement('profileSearches', searchHistory.length);
            
            // Рассчитываем сколько дней с нами
            if (currentUser.created_at) {
                const created = new Date(currentUser.created_at);
                const now = new Date();
                const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                updateElement('memberSince', `${days} дн.`);
            }
            
            // Обновляем историю
            this.updateHistoryUI();
            
        } else {
            // Гость
            updateElement('userName', 'Гость');
            updateElement('userNameSm', 'Войти');
            updateElement('userEmail', 'Войдите в аккаунт');
            updateElement('profileName', 'Гость');
            updateElement('profileEmail', 'Войдите, чтобы увидеть профиль');
            
            updateAvatar('userAvatar', null, null);
            updateAvatar('userAvatarLg', null, null);
            updateAvatar('profileAvatar', null, null);
            
            updateElement('wishlistCount', '0');
            updateElement('searchCount', '0');
            updateElement('profileWishlist', '0');
            updateElement('profileSearches', '0');
            updateElement('memberSince', '0 дн.');
            
            // Показываем пустую историю
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = `
                    <div class="empty-state small">
                        <i class="fas fa-history"></i>
                        <p>Войдите, чтобы видеть историю поиска</p>
                    </div>
                `;
            }
        }
    }
    
    static updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (searchHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-history"></i>
                    <p>История поиска пуста</p>
                </div>
            `;
        } else {
            historyList.innerHTML = searchHistory.slice(0, 10).map(item => `
                <div class="history-item">
                    <div class="history-info">
                        <strong>"${item.query}"</strong>
                        <small>${Utils.formatDate(item.searched_at)}</small>
                    </div>
                    <span class="badge">${item.results_count || 0}</span>
                </div>
            `).join('');
        }
    }
    
    static async addToSearchHistory(query, resultsCount) {
        if (!currentUser || !supabase || !query) return;
        
        try {
            const { error } = await supabase
                .from('search_history')
                .insert([{
                    user_id: currentUser.id,
                    query: query,
                    results_count: resultsCount,
                    searched_at: new Date().toISOString()
                }]);
            
            if (error) {
                console.error('Ошибка сохранения истории:', error);
                return;
            }
            
            // Обновляем локально
            searchHistory.unshift({
                user_id: currentUser.id,
                query: query,
                results_count: resultsCount,
                searched_at: new Date().toISOString()
            });
            
            // Обновляем UI
            this.updateUI();
            
        } catch (error) {
            console.error('Ошибка сохранения истории:', error);
        }
    }
    
    static async toggleWishlist(set) {
        if (!currentUser || !supabase) {
            this.showAuthModal();
            return { success: false, requiresAuth: true };
        }
        
        if (!set || !set.number) {
            Toast.error('Ошибка', 'Неверные данные набора');
            return { success: false };
        }
        
        try {
            // Проверяем, есть ли уже в вишлисте
            const existing = wishlist.find(item => item.set_number === set.number);
            
            if (existing) {
                // Удаляем из вишлиста
                const { error } = await supabase
                    .from('wishlists')
                    .delete()
                    .eq('id', existing.id);
                
                if (error) throw error;
                
                wishlist = wishlist.filter(item => item.id !== existing.id);
                Toast.info('Удалено', 'Набор удален из вишлиста');
                return { success: true, action: 'removed' };
                
            } else {
                // Добавляем в вишлист
                const wishlistItem = {
                    user_id: currentUser.id,
                    set_number: set.number,
                    set_data: {
                        title: set.title,
                        theme: set.theme,
                        pieces: set.pieces,
                        price: set.price,
                        image: set.image
                    },
                    created_at: new Date().toISOString()
                };
                
                const { data, error } = await supabase
                    .from('wishlists')
                    .insert([wishlistItem])
                    .select()
                    .single();
                
                if (error) throw error;
                
                wishlist.push(data);
                Toast.success('Добавлено', 'Набор добавлен в вишлист');
                return { success: true, action: 'added', data };
            }
            
        } catch (error) {
            console.error('Ошибка обновления вишлиста:', error);
            Toast.error('Ошибка', 'Не удалось обновить вишлист');
            return { success: false, error: error.message };
        } finally {
            // Обновляем UI
            this.updateUI();
        }
    }
    
    static showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Фокусируемся на поле email
            setTimeout(() => {
                const emailInput = document.getElementById('loginEmail');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }
    
    static hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            // Очищаем поля
            ['loginEmail', 'loginPassword', 'registerUsername', 'registerEmail', 'registerPassword', 'registerConfirm'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }
    }
}

// ==================== ПОИСК ====================
class SearchManager {
    static async performSearch(query) {
        if (!query || query.trim().length < 2) {
            Toast.warning('Слишком короткий запрос', 'Введите минимум 2 символа');
            return;
        }
        
        const searchQuery = query.trim();
        const loading = document.getElementById('loading');
        const resultsGrid = document.getElementById('resultsGrid');
        const emptyResults = document.getElementById('emptyResults');
        const searchQueryElement = document.getElementById('searchQuery');
        
        // Показываем загрузку
        if (loading) loading.classList.add('active');
        if (resultsGrid) resultsGrid.innerHTML = '';
        if (emptyResults) emptyResults.classList.add('hidden');
        if (searchQueryElement) {
            searchQueryElement.textContent = `"${searchQuery}"`;
        }
        
        try {
            // Симулируем задержку API
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Генерируем демо-результаты
            const results = this.generateDemoResults(searchQuery);
            searchResults = results;
            
            // Сохраняем в историю
            await AuthManager.addToSearchHistory(searchQuery, results.length);
            
            // Отображаем результаты
            this.displayResults(results);
            
            // Показываем уведомление
            if (results.length > 0) {
                Toast.success('Найдено!', `${results.length} наборов по запросу "${searchQuery}"`);
            } else {
                Toast.info('Ничего не найдено', 'Попробуйте изменить запрос');
            }
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
            Toast.error('Ошибка поиска', 'Попробуйте еще раз');
        } finally {
            if (loading) loading.classList.remove('active');
        }
    }
    
    static generateDemoResults(query) {
        const queryLower = query.toLowerCase();
        
        // База демо-наборов
        const demoSets = [
            {
                id: '75367',
                number: '75367',
                title: 'LEGO Star Wars Venator-Class Republic Attack Cruiser',
                theme: 'Star Wars',
                year: 2023,
                pieces: 3294,
                ageRange: '18+',
                description: 'Масштабная модель звёздного разрушителя Венейтор с детализированной палубой и минифигурками',
                rating: 4.8,
                ratingCount: 156,
                image: 'https://images.brickset.com/sets/images/75367-1.jpg'
            },
            {
                id: '42154',
                number: '42154',
                title: 'LEGO Technic 2022 Ford GT',
                theme: 'Technic',
                year: 2022,
                pieces: 1466,
                ageRange: '18+',
                description: 'Детализированная модель Ford GT 2022 с подвижными элементами и реалистичным дизайном',
                rating: 4.6,
                ratingCount: 89,
                image: 'https://images.brickset.com/sets/images/42154-1.jpg'
            },
            {
                id: '10316',
                number: '10316',
                title: 'LEGO Creator Expert The Lord of the Rings: Rivendell',
                theme: 'Creator Expert',
                year: 2023,
                pieces: 6167,
                ageRange: '18+',
                description: 'Детализированная модель Ривенделла из Властелина колец с минифигурками персонажей',
                rating: 4.9,
                ratingCount: 234,
                image: 'https://images.brickset.com/sets/images/10316-1.jpg'
            },
            {
                id: '76269',
                number: '76269',
                title: 'LEGO Marvel Avengers Tower',
                theme: 'Marvel',
                year: 2023,
                pieces: 4051,
                ageRange: '18+',
                description: 'Башня Мстителей высотой 90 см с детализированными интерьерами и минифигурками героев',
                rating: 4.7,
                ratingCount: 189,
                image: 'https://images.brickset.com/sets/images/76269-1.jpg'
            },
            {
                id: '71799',
                number: '71799',
                title: 'LEGO Ninjago City Gardens',
                theme: 'Ninjago',
                year: 2021,
                pieces: 5685,
                ageRange: '14+',
                description: 'Многоуровневая модель города с садами, магазинами и скрытыми элементами',
                rating: 4.8,
                ratingCount: 142,
                image: 'https://images.brickset.com/sets/images/71799-1.jpg'
            },
            {
                id: '76419',
                number: '76419',
                title: 'LEGO Harry Potter Hogwarts Castle and Grounds',
                theme: 'Harry Potter',
                year: 2023,
                pieces: 2660,
                ageRange: '18+',
                description: 'Модель Хогвартса с замком, окрестностями и минифигурками персонажей',
                rating: 4.7,
                ratingCount: 98,
                image: 'https://images.brickset.com/sets/images/76419-1.jpg'
            }
        ];
        
        // Фильтруем по запросу
        const filtered = demoSets.filter(set => {
            const searchable = [
                set.title,
                set.theme,
                set.number,
                set.description,
                set.ageRange
            ].join(' ').toLowerCase();
            
            return searchable.includes(queryLower) || 
                   queryLower.includes(set.theme.toLowerCase()) ||
                   queryLower.includes(set.number);
        });
        
        // Если ничего не найдено, возвращаем все наборы для демо
        const results = filtered.length > 0 ? filtered : demoSets;
        
        // Добавляем цены и информацию о магазинах
        return results.map(set => {
            const price = this.calculatePrice(set);
            const retailer = CONFIG.RETAILERS[Math.floor(Math.random() * CONFIG.RETAILERS.length)];
            const finalPrice = Math.round(price * (0.8 + Math.random() * 0.4));
            const discount = Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : 0;
            
            return {
                ...set,
                price: finalPrice,
                retailer: retailer,
                inStock: Math.random() > 0.1,
                discount: discount,
                originalPrice: discount > 0 ? Math.round(finalPrice * (1 + discount/100)) : null
            };
        });
    }
    
    static calculatePrice(set) {
        const basePrice = set.pieces * (CONFIG.PRICE_PER_PIECE[set.theme] || CONFIG.PRICE_PER_PIECE.default);
        
        // Модификаторы
        let price = basePrice;
        
        // Популярные темы стоят дороже
        if (['Star Wars', 'Creator Expert', 'Harry Potter'].includes(set.theme)) {
            price *= 1.3;
        }
        
        // Большие наборы имеют скидку за деталь
        if (set.pieces > 2000) {
            price *= 0.9;
        }
        
        // Новые наборы дороже
        const currentYear = new Date().getFullYear();
        if (set.year === currentYear) {
            price *= 1.2;
        }
        
        return Math.round(price / 100) * 100;
    }
    
    static displayResults(results) {
        const resultsGrid = document.getElementById('resultsGrid');
        const emptyResults = document.getElementById('emptyResults');
        const resultsCount = document.getElementById('resultsCount');
        
        if (!resultsGrid) return;
        
        if (results.length === 0) {
            if (emptyResults) emptyResults.classList.remove('hidden');
            if (resultsCount) resultsCount.textContent = '0 результатов';
            return;
        }
        
        if (resultsCount) {
            resultsCount.textContent = `${results.length} ${this.getResultsWord(results.length)}`;
        }
        
        resultsGrid.innerHTML = results.map(set => {
            const isInWishlist = wishlist.some(item => item.set_number === set.number);
            const pricePerPiece = (set.price / set.pieces).toFixed(2);
            const hasDiscount = set.discount > 0;
            
            return `
                <div class="product-card" data-set-number="${set.number}">
                    <div class="product-badge">${set.theme}</div>
                    
                    <div class="product-image">
                        <div class="product-wishlist">
                            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                                    data-set='${JSON.stringify(set).replace(/'/g, "&apos;")}'>
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="product-content">
                        <div class="product-header">
                            <h4 class="product-title" title="${set.title}">${set.title}</h4>
                            <div class="product-number">
                                <i class="fas fa-hashtag"></i> ${set.number}
                            </div>
                        </div>
                        
                        <div class="product-price">
                            ${hasDiscount ? `
                                <span class="price-old">${Utils.formatPrice(set.originalPrice)}</span>
                                <span class="price-discount">-${set.discount}%</span>
                            ` : ''}
                            <span class="price-main">${Utils.formatPrice(set.price)}</span>
                            <span class="price-per-piece">${pricePerPiece} ₽/дет.</span>
                        </div>
                        
                        <div class="product-meta">
                            <div class="rating">
                                <span class="stars">${'★'.repeat(Math.floor(set.rating))}${'☆'.repeat(5 - Math.floor(set.rating))}</span>
                                <span class="rating-count">${set.rating.toFixed(1)} (${set.ratingCount})</span>
                            </div>
                            <div class="retailer">
                                <span class="retailer-icon">${set.retailer.icon}</span>
                                <span>${set.retailer.name}</span>
                            </div>
                        </div>
                        
                        <div class="product-details">
                            <div class="detail">
                                <span class="detail-icon">🧩</span>
                                <span class="detail-value">${set.pieces.toLocaleString()}</span>
                                <span class="detail-label">деталей</span>
                            </div>
                            <div class="detail">
                                <span class="detail-icon">📅</span>
                                <span class="detail-value">${set.year}</span>
                                <span class="detail-label">год</span>
                            </div>
                            <div class="detail">
                                <span class="detail-icon">👤</span>
                                <span class="detail-value">${set.ageRange}</span>
                                <span class="detail-label">возраст</span>
                            </div>
                        </div>
                        
                        <div class="product-stock ${set.inStock ? 'stock-in' : 'stock-out'}">
                            <i class="fas ${set.inStock ? 'fa-check' : 'fa-times'}"></i>
                            ${set.inStock ? 'В наличии' : 'Нет в наличии'}
                        </div>
                        
                        <div class="product-actions">
                            <button class="btn btn-compact btn-outline" onclick="SearchManager.viewDetails('${set.number}')">
                                <i class="fas fa-info-circle"></i> Подробнее
                            </button>
                            <button class="btn btn-compact btn-primary" onclick="SearchManager.buyNow('${set.number}', '${set.retailer.id}')">
                                <i class="fas fa-shopping-cart"></i> Купить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики для кнопок вишлиста
        resultsGrid.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const setData = JSON.parse(btn.dataset.set.replace(/&apos;/g, "'"));
                    const result = await AuthManager.toggleWishlist(setData);
                    
                    if (result.success) {
                        btn.classList.toggle('active', result.action === 'added');
                    }
                } catch (error) {
                    console.error('Ошибка обработки вишлиста:', error);
                }
            });
        });
    }
    
    static getResultsWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) return 'результат';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'результата';
        return 'результатов';
    }
    
    static sortResults(sortBy) {
        const sorted = [...searchResults];
        
        switch (sortBy) {
            case 'price_asc':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                sorted.sort((a, b) => b.rating - a.rating);
                break;
            case 'pieces':
                sorted.sort((a, b) => b.pieces - a.pieces);
                break;
            default: // relevance
                // Оставляем исходный порядок
                break;
        }
        
        this.displayResults(sorted);
    }
    
    static viewDetails(setNumber) {
        // Находим набор
        const set = searchResults.find(s => s.number === setNumber);
        if (!set) {
            Toast.error('Ошибка', 'Набор не найден');
            return;
        }
        
        // Создаем модальное окно с деталями
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Детали набора</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                        <div style="flex: 1; background: var(--bg-tertiary); border-radius: 12px; height: 200px; display: flex; align-items: center; justify-content: center; font-size: 4rem;">
                            🧱
                        </div>
                        <div style="flex: 2;">
                            <h4>${set.title}</h4>
                            <p style="color: var(--text-tertiary); margin-bottom: 10px;">${set.description}</p>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                                <span class="badge" style="background: var(--primary);">#${set.number}</span>
                                <span class="badge" style="background: #8b5cf6;">${set.theme}</span>
                                <span class="badge" style="background: #10b981;">${set.year} год</span>
                                <span class="badge" style="background: #f59e0b;">${set.ageRange}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Цена</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${Utils.formatPrice(set.price)}</div>
                        </div>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Деталей</div>
                            <div style="font-size: 1.5rem; font-weight: bold;">${set.pieces.toLocaleString()}</div>
                        </div>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Рейтинг</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">
                                ${set.rating.toFixed(1)}/5
                            </div>
                        </div>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 0.875rem; color: var(--text-tertiary);">Магазин</div>
                            <div style="font-size: 1.5rem; font-weight: bold;">${set.retailer.name} ${set.retailer.icon}</div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" style="width: 100%;" onclick="SearchManager.buyNow('${set.number}', '${set.retailer.id}'); this.closest('.modal').remove();">
                        <i class="fas fa-shopping-cart"></i> Купить на ${set.retailer.name}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Закрытие по клику вне
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    static buyNow(setNumber, retailerId) {
        const retailer = CONFIG.RETAILERS.find(r => r.id === retailerId);
        if (!retailer) {
            Toast.error('Ошибка', 'Магазин не найден');
            return;
        }
        
        const urls = {
            ozon: `https://www.ozon.ru/search/?text=lego+${setNumber}`,
            wildberries: `https://www.wildberries.ru/catalog/0/search.aspx?search=lego+${setNumber}`,
            yandex: `https://market.yandex.ru/search?text=lego+${setNumber}`,
            avito: `https://www.avito.ru/moskva?q=lego+${setNumber}`,
            dns: `https://www.dns-shop.ru/search/?q=lego+${setNumber}`,
            citilink: `https://www.citilink.ru/search/?text=lego+${setNumber}`
        };
        
        window.open(urls[retailerId] || urls.ozon, '_blank');
    }
    
    static voiceSearch() {
        // Проверяем поддержку Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            Toast.error('Голосовой поиск недоступен', 'Ваш браузер не поддерживает голосовой ввод');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        // Показываем уведомление
        Toast.info('Говорите сейчас', 'Слушаю ваш запрос...', 5000);
        
        recognition.start();
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const searchInput = document.getElementById('mainSearch');
            if (searchInput) {
                searchInput.value = transcript;
                this.performSearch(transcript);
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Ошибка распознавания речи:', event.error);
            Toast.error('Ошибка распознавания', 'Не удалось распознать речь');
        };
        
        recognition.onend = () => {
            console.log('Распознавание речи завершено');
        };
    }
    
    static suggestSearch() {
        const suggestions = [
            'Звездные войны космический корабль',
            'Техник машина с двигателем',
            'Город пожарная станция',
            'Хогвартс замок',
            'Ниндзяго дракон',
            'Мстители башня',
            'Космический корабль звездные войны',
            'Машина техник с двигателем',
            'Пожарная машина город',
            'Дракон ниндзяго'
        ];
        
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        const searchInput = document.getElementById('mainSearch');
        if (searchInput) {
            searchInput.value = suggestion;
            this.performSearch(suggestion);
        }
    }
}

// ==================== СРАВНЕНИЕ ====================
class CompareManager {
    static init() {
        this.loadFromStorage();
        this.updateUI();
    }
    
    static loadFromStorage() {
        try {
            const saved = localStorage.getItem('brickmind_compare');
            if (saved) {
                compareSets = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Ошибка загрузки сравнения:', error);
        }
    }
    
    static saveToStorage() {
        try {
            localStorage.setItem('brickmind_compare', JSON.stringify(compareSets));
        } catch (error) {
            console.error('Ошибка сохранения сравнения:', error);
        }
    }
    
    static async addSet(setNumber) {
        if (!setNumber || !/^\d{4,5}$/.test(setNumber)) {
            Toast.warning('Неверный номер', 'Введите 4-5 цифр');
            return;
        }
        
        if (compareSets.length >= CONFIG.MAX_COMPARE_SETS) {
            Toast.warning('Максимум наборов', `Можно сравнивать до ${CONFIG.MAX_COMPARE_SETS} наборов`);
            return;
        }
        
        if (compareSets.some(set => set.number === setNumber)) {
            Toast.info('Уже добавлено', 'Этот набор уже в сравнении');
            return;
        }
        
        // Показываем загрузку
        Toast.info('Поиск набора', `Ищем набор #${setNumber}...`);
        
        try {
            // Ищем набор в демо-данных
            const setInfo = await this.fetchSetInfo(setNumber);
            
            if (!setInfo) {
                Toast.error('Не найден', `Набор #${setNumber} не найден`);
                return;
            }
            
            compareSets.push(setInfo);
            this.saveToStorage();
            this.updateUI();
            
            Toast.success('Добавлено', `Набор #${setNumber} добавлен к сравнению`);
            
        } catch (error) {
            console.error('Ошибка добавления набора:', error);
            Toast.error('Ошибка', 'Не удалось добавить набор');
        }
    }
    
    static async fetchSetInfo(setNumber) {
        // В реальном приложении здесь был бы API запрос
        // Сейчас используем демо-данные
        
        const demoData = {
            '75367': {
                number: '75367',
                title: 'Venator-Class Republic Attack Cruiser',
                theme: 'Star Wars',
                year: 2023,
                pieces: 3294,
                ageRange: '18+',
                price: 29999
            },
            '42154': {
                number: '42154',
                title: '2022 Ford GT',
                theme: 'Technic',
                year: 2022,
                pieces: 1466,
                ageRange: '18+',
                price: 21999
            },
            '10316': {
                number: '10316',
                title: 'The Lord of the Rings: Rivendell',
                theme: 'Creator Expert',
                year: 2023,
                pieces: 6167,
                ageRange: '18+',
                price: 45999
            },
            '76269': {
                number: '76269',
                title: 'Avengers Tower',
                theme: 'Marvel',
                year: 2023,
                pieces: 4051,
                ageRange: '18+',
                price: 37999
            },
            '71799': {
                number: '71799',
                title: 'Ninjago City Gardens',
                theme: 'Ninjago',
                year: 2021,
                pieces: 5685,
                ageRange: '14+',
                price: 34999
            },
            '76419': {
                number: '76419',
                title: 'Hogwarts Castle and Grounds',
                theme: 'Harry Potter',
                year: 2023,
                pieces: 2660,
                ageRange: '18+',
                price: 28999
            }
        };
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return demoData[setNumber] || null;
    }
    
    static removeSet(setNumber) {
        compareSets = compareSets.filter(set => set.number !== setNumber);
        this.saveToStorage();
        this.updateUI();
        Toast.info('Удалено', 'Набор удален из сравнения');
    }
    
    static updateUI() {
        const container = document.getElementById('compareSets');
        const compareBtn = document.getElementById('compareBtn');
        
        if (!container) return;
        
        // Обновляем карточки
        const cards = container.querySelectorAll('.set-card');
        cards.forEach((card, index) => {
            if (compareSets[index]) {
                const set = compareSets[index];
                card.className = 'set-card filled';
                card.innerHTML = `
                    <button class="set-remove" onclick="CompareManager.removeSet('${set.number}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="set-number">${set.number}</div>
                    <div class="set-title">${set.title}</div>
                    <div class="set-theme">${set.theme}</div>
                    <div class="set-price">${Utils.formatPrice(set.price)}</div>
                `;
            } else {
                card.className = 'set-card empty';
                card.innerHTML = `
                    <i class="fas fa-plus"></i>
                    <p>Добавьте набор</p>
                `;
                card.onclick = () => {
                    const input = document.getElementById('compareInput');
                    if (input) {
                        input.focus();
                        input.scrollIntoView({ behavior: 'smooth' });
                    }
                };
            }
        });
        
        // Обновляем кнопку сравнения
        if (compareBtn) {
            compareBtn.disabled = compareSets.length < 2;
            compareBtn.onclick = () => {
                if (compareSets.length >= 2) {
                    CompareManager.displayComparison();
                }
            };
        }
    }
    
    static displayComparison() {
        const container = document.getElementById('compareResults');
        if (!container) return;
        
        if (compareSets.length < 2) {
            container.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-balance-scale"></i>
                    <p>Добавьте минимум 2 набора для сравнения</p>
                </div>
            `;
            return;
        }
        
        const analysis = this.analyzeSets();
        
        container.innerHTML = `
            <div class="comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>Характеристика</th>
                            ${compareSets.map(set => `<th>#${set.number}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Название</td>
                            ${compareSets.map(set => `<td>${set.title}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>Тема</td>
                            ${compareSets.map(set => `<td>${set.theme}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>Год</td>
                            ${compareSets.map(set => `<td>${set.year}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>Деталей</td>
                            ${compareSets.map(set => `<td>${set.pieces.toLocaleString()}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>Возраст</td>
                            ${compareSets.map(set => `<td>${set.ageRange}</td>`).join('')}
                        </tr>
                        <tr>
                            <td>Цена</td>
                            ${compareSets.map(set => `<td><strong>${Utils.formatPrice(set.price)}</strong></td>`).join('')}
                        </tr>
                        <tr>
                            <td>Цена за деталь</td>
                            ${compareSets.map(set => `<td>${(set.price / set.pieces).toFixed(2)} ₽</td>`).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="comparison-analysis">
                <h4><i class="fas fa-chart-bar"></i> Анализ сравнения</h4>
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <div class="analysis-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="analysis-content">
                            <h5>Лучшее соотношение</h5>
                            <p>Набор <strong>#${analysis.bestValue.number}</strong></p>
                            <small>${analysis.bestValue.pricePerPiece} ₽/деталь</small>
                        </div>
                    </div>
                    <div class="analysis-card">
                        <div class="analysis-icon" style="background: linear-gradient(135deg, #3b82f6, #60a5fa);">
                            <i class="fas fa-ruler-combined"></i>
                        </div>
                        <div class="analysis-content">
                            <h5>Самый большой</h5>
                            <p>Набор <strong>#${analysis.largestSet.number}</strong></p>
                            <small>${analysis.largestSet.pieces.toLocaleString()} деталей</small>
                        </div>
                    </div>
                    <div class="analysis-card">
                        <div class="analysis-icon" style="background: linear-gradient(135deg, #8b5cf6, #a78bfa);">
                            <i class="fas fa-calendar-star"></i>
                        </div>
                        <div class="analysis-content">
                            <h5>Самый новый</h5>
                            <p>Набор <strong>#${analysis.newestSet.number}</strong></p>
                            <small>${analysis.newestSet.year} год</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Прокручиваем к результатам
        container.scrollIntoView({ behavior: 'smooth' });
    }
    
    static analyzeSets() {
        const bestValue = compareSets.reduce((best, current) => {
            const currentValue = current.price / current.pieces;
            const bestValue = best.price / best.pieces;
            return currentValue < bestValue ? current : best;
        }, compareSets[0]);
        
        const largestSet = compareSets.reduce((largest, current) => 
            current.pieces > largest.pieces ? current : largest, compareSets[0]
        );
        
        const newestSet = compareSets.reduce((newest, current) => 
            current.year > newest.year ? current : newest, compareSets[0]
        );
        
        return {
            bestValue: {
                ...bestValue,
                pricePerPiece: (bestValue.price / bestValue.pieces).toFixed(2)
            },
            largestSet,
            newestSet
        };
    }
    
    static clearAll() {
        if (compareSets.length === 0) {
            Toast.info('Уже пусто', 'Нет наборов для очистки');
            return;
        }
        
        if (confirm('Вы уверены, что хотите удалить все наборы из сравнения?')) {
            compareSets = [];
            this.saveToStorage();
            this.updateUI();
            document.getElementById('compareResults').innerHTML = '';
            Toast.info('Очищено', 'Все наборы удалены из сравнения');
        }
    }
}

// ==================== ИНСТРУМЕНТЫ ====================
class ToolsManager {
    static async identifySet(setNumber) {
        const input = document.getElementById('setNumberInput');
        if (!setNumber && input) {
            setNumber = input.value.trim();
        }
        
        if (!setNumber || !/^\d{4,5}$/.test(setNumber)) {
            Toast.warning('Неверный номер', 'Введите 4-5 цифр');
            return;
        }
        
        const result = document.getElementById('identifyResult');
        if (!result) return;
        
        result.innerHTML = '<div class="loading-text">Поиск информации...</div>';
        result.classList.add('active');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const demoData = {
                '75367': {
                    name: 'Venator-Class Republic Attack Cruiser',
                    theme: 'Star Wars',
                    year: 2023,
                    pieces: 3294,
                    ageRange: '18+',
                    description: 'Масштабная модель звёздного разрушителя Венейтор из вселенной Звёздных Войн с детализированной палубой и минифигурками.',
                    rating: 4.8,
                    minifigures: 5,
                    dimensions: '108x34x32 cm'
                },
                '42154': {
                    name: '2022 Ford GT',
                    theme: 'Technic',
                    year: 2022,
                    pieces: 1466,
                    ageRange: '18+',
                    description: 'Детализированная модель Ford GT 2022 с подвижными элементами, работающей коробкой передач и реалистичным дизайном.',
                    rating: 4.6,
                    minifigures: 0,
                    dimensions: '46x19x13 cm'
                },
                '10316': {
                    name: 'The Lord of the Rings: Rivendell',
                    theme: 'Creator Expert',
                    year: 2023,
                    pieces: 6167,
                    ageRange: '18+',
                    description: 'Детализированная модель Ривенделла из Властелина колец с минифигурками персонажей и интерьерами.',
                    rating: 4.9,
                    minifigures: 15,
                    dimensions: '72x38x35 cm'
                },
                '71799': {
                    name: 'Ninjago City Gardens',
                    theme: 'Ninjago',
                    year: 2021,
                    pieces: 5685,
                    ageRange: '14+',
                    description: 'Многоуровневая модель города с садами, магазинами и скрытыми элементами.',
                    rating: 4.8,
                    minifigures: 19,
                    dimensions: '73x35x45 cm'
                },
                '76419': {
                    name: 'Hogwarts Castle and Grounds',
                    theme: 'Harry Potter',
                    year: 2023,
                    pieces: 2660,
                    ageRange: '18+',
                    description: 'Модель Хогвартса с замком, окрестностями и минифигурками персонажей.',
                    rating: 4.7,
                    minifigures: 12,
                    dimensions: '69x43x33 cm'
                }
            };
            
            const data = demoData[setNumber];
            if (!data) {
                result.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Набор #${setNumber} не найден</p>
                        <small>Попробуйте другие номера: 75367, 42154, 10316, 71799, 76419</small>
                    </div>
                `;
                return;
            }
            
            result.innerHTML = `
                <div class="set-info">
                    <h4>${data.name}</h4>
                    <div class="set-details">
                        <div class="detail-row">
                            <span class="detail-label">Номер:</span>
                            <span class="detail-value">#${setNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Тема:</span>
                            <span class="detail-value">${data.theme}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Год:</span>
                            <span class="detail-value">${data.year}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Деталей:</span>
                            <span class="detail-value">${data.pieces.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Минифигурки:</span>
                            <span class="detail-value">${data.minifigures}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Размеры:</span>
                            <span class="detail-value">${data.dimensions}</span>
                        </div>
                    </div>
                    <p class="set-description">${data.description}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-primary" onclick="SearchManager.performSearch('${setNumber}')">
                            <i class="fas fa-search"></i> Найти цены
                        </button>
                        <button class="btn btn-outline" onclick="CompareManager.addSet('${setNumber}')">
                            <i class="fas fa-balance-scale"></i> Добавить к сравнению
                        </button>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Ошибка идентификации:', error);
            result.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Ошибка при поиске набора</p>
                    <small>Попробуйте позже</small>
                </div>
            `;
        }
    }
    
    static calculatePricePerPiece() {
        const priceInput = document.getElementById('calcPrice');
        const piecesInput = document.getElementById('calcPieces');
        const result = document.getElementById('calcResult');
        
        if (!priceInput || !piecesInput || !result) return;
        
        const price = parseFloat(priceInput.value);
        const pieces = parseInt(piecesInput.value);
        
        if (!price || !pieces || price <= 0 || pieces <= 0) {
            result.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Введите корректные значения</p>
                    <small>Цена и количество деталей должны быть больше 0</small>
                </div>
            `;
            result.classList.add('active');
            return;
        }
        
        const pricePerPiece = price / pieces;
        
        let rating, icon, color, message;
        if (pricePerPiece < 0.2) {
            rating = 'Отлично';
            icon = '⭐';
            color = '#10b981';
            message = 'Очень выгодная цена!';
        } else if (pricePerPiece < 0.4) {
            rating = 'Хорошо';
            icon = '👍';
            color = '#3b82f6';
            message = 'Среднерыночная стоимость';
        } else if (pricePerPiece < 0.6) {
            rating = 'Нормально';
            icon = '⚖️';
            color = '#f59e0b';
            message = 'Можно найти дешевле';
        } else {
            rating = 'Дорого';
            icon = '👑';
            color = '#8b5cf6';
            message = 'Коллекционный или редкий набор';
        }
        
        result.innerHTML = `
            <div class="calc-result">
                <div class="result-header">
                    <h5>${icon} ${rating}</h5>
                    <span style="color: ${color}">${message}</span>
                </div>
                <div class="result-value">${pricePerPiece.toFixed(2)} ₽</div>
                <div class="result-label">за деталь</div>
                <div class="result-tip">
                    <i class="fas fa-lightbulb"></i>
                    <small>Средняя цена: 0.35 ₽/деталь</small>
                </div>
                <div class="result-stats" style="margin-top: 10px; font-size: 0.875rem; color: var(--text-tertiary);">
                    <div>Общая стоимость: ${Utils.formatPrice(price)}</div>
                    <div>Количество деталей: ${pieces.toLocaleString()}</div>
                </div>
            </div>
        `;
        result.classList.add('active');
        
        // Прокручиваем к результату
        setTimeout(() => {
            result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// ==================== UI МЕНЕДЖЕР ====================
class UIManager {
    static init() {
        console.log('🚀 Инициализация BrickMind AI...');
        
        // Загружаем тему
        this.loadTheme();
        
        // Инициализируем все менеджеры
        AuthManager.init();
        CompareManager.init();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        // Переключаемся на главную секцию
        this.switchSection('search');
        
        // Загружаем аналитику
        this.loadAnalytics();
        
        // Обновляем live статистику
        this.updateLiveStats();
        
        console.log('✅ BrickMind AI готов к работе!');
        
        // Приветственное сообщение
        setTimeout(() => {
            if (!currentUser) {
                Toast.info('Добро пожаловать!', 'Войдите, чтобы сохранять вишлисты и историю поиска', 8000);
            }
        }, 2000);
    }
    
    static loadTheme() {
        const savedTheme = localStorage.getItem('brickmind_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
        
        // Обновляем настройки
        userSettings.darkMode = savedTheme === 'dark';
        
        // Обновляем переключатель если он есть
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.checked = userSettings.darkMode;
        }
    }
    
    static toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('brickmind_theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // Сохраняем в настройки
        userSettings.darkMode = newTheme === 'dark';
        AuthManager.saveUserSettings();
        
        Toast.success('Тема изменена', newTheme === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
    }
    
    static updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    static switchSection(sectionId) {
        // Скрываем все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Деактивируем все ссылки в навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Активируем нужную секцию
        const targetSection = document.getElementById(sectionId + 'Section');
        const targetLink = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (targetSection) targetSection.classList.add('active');
        if (targetLink) targetLink.classList.add('active');
        
        currentSection = sectionId;
        
        // Прокручиваем к секции
        if (sectionId !== 'search') {
            setTimeout(() => {
                targetSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        // Если перешли на сравнение, показываем результаты если есть
        if (sectionId === 'compare' && compareSets.length >= 2) {
            setTimeout(() => {
                CompareManager.displayComparison();
            }, 300);
        }
    }
    
    static updateLiveStats() {
        // Обновляем статистику каждые 30 секунд
        setInterval(() => {
            const elements = {
                'totalSets': { base: 14532, min: 5, max: 15 },
                'avgSavings': { base: 25, min: -2, max: 2 },
                'responseTime': { base: 0.12, min: -0.02, max: 0.02, format: val => val.toFixed(2) + 'с' },
                'activeUsers': { base: 2847, min: 2, max: 8 }
            };
            
            Object.entries(elements).forEach(([id, config]) => {
                const el = document.getElementById(id);
                if (!el) return;
                
                let current;
                try {
                    current = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
                    if (isNaN(current)) current = config.base;
                } catch {
                    current = config.base;
                }
                
                const change = Math.random() * (config.max - config.min) + config.min;
                let newValue = Math.max(0, current + change);
                
                if (config.format) {
                    el.textContent = config.format(newValue);
                } else {
                    el.textContent = Math.round(newValue).toLocaleString();
                }
            });
        }, 30000);
    }
    
    static loadAnalytics() {
        setTimeout(() => {
            this.updateTrendingList();
            this.updatePriceStats();
            this.updateThemesList();
        }, 1000);
    }
    
    static updateTrendingList() {
        const container = document.getElementById('trendingList');
        if (!container) return;
        
        const trending = [
            { number: '75367', name: 'Venator', price: 29999, change: '+5%' },
            { number: '42154', name: 'Ford GT', price: 21999, change: '+3%' },
            { number: '10316', name: 'Rivendell', price: 45999, change: '+8%' },
            { number: '76269', name: 'Avengers Tower', price: 37999, change: '+2%' },
            { number: '71799', name: 'Ninjago Gardens', price: 34999, change: '-1%' }
        ];
        
        container.innerHTML = trending.map((set, index) => `
            <div class="trending-item">
                <div class="trending-rank">${index + 1}</div>
                <div class="trending-info">
                    <strong>${set.name}</strong>
                    <small>#${set.number}</small>
                </div>
                <div class="trending-price">${Utils.formatPrice(set.price)}</div>
                <div class="trending-change ${set.change.startsWith('+') ? 'positive' : 'negative'}">
                    ${set.change}
                </div>
            </div>
        `).join('');
    }
    
    static updatePriceStats() {
        const container = document.getElementById('priceStats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="price-distribution">
                <div class="price-range">
                    <span>До 1 000 ₽</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: 35%"></div>
                    </div>
                    <span>35%</span>
                </div>
                <div class="price-range">
                    <span>1 000 - 3 000 ₽</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: 42%"></div>
                    </div>
                    <span>42%</span>
                </div>
                <div class="price-range">
                    <span>3 000 - 10 000 ₽</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: 18%"></div>
                    </div>
                    <span>18%</span>
                </div>
                <div class="price-range">
                    <span>От 10 000 ₽</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: 5%"></div>
                    </div>
                    <span>5%</span>
                </div>
            </div>
        `;
    }
    
    static updateThemesList() {
        const container = document.getElementById('themesList');
        if (!container) return;
        
        const themes = [
            { name: 'Star Wars', count: 2450, growth: 15 },
            { name: 'Technic', count: 1890, growth: 12 },
            { name: 'Creator Expert', count: 1560, growth: 8 },
            { name: 'City', count: 3420, growth: 5 },
            { name: 'Marvel', count: 1230, growth: 18 },
            { name: 'Harry Potter', count: 890, growth: 22 }
        ];
        
        container.innerHTML = themes.map(theme => `
            <div class="theme-item">
                <div class="theme-name">
                    <strong>${theme.name}</strong>
                    <small>${theme.count.toLocaleString()} наборов</small>
                </div>
                <div class="theme-growth ${theme.growth > 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${theme.growth > 0 ? 'up' : 'down'}"></i>
                    ${theme.growth}%
                </div>
            </div>
        `).join('');
    }
    
    static setupEventListeners() {
        // Переключение темы
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Навигация
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });
        
        // Поиск
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = document.getElementById('mainSearch')?.value;
                if (query) SearchManager.performSearch(query);
            });
        }
        
        const mainSearch = document.getElementById('mainSearch');
        if (mainSearch) {
            mainSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value;
                    if (query) SearchManager.performSearch(query);
                }
            });
        }
        
        // Быстрый поиск по тегам
        document.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const query = tag.dataset.query;
                const searchInput = document.getElementById('mainSearch');
                if (searchInput) {
                    searchInput.value = query;
                    SearchManager.performSearch(query);
                }
            });
        });
        
        // Голосовой поиск
        const voiceSearchBtn = document.querySelector('.search-action');
        if (voiceSearchBtn) {
            voiceSearchBtn.addEventListener('click', () => {
                SearchManager.voiceSearch();
            });
        }
        
        // Кнопка "Получить подсказку"
        const suggestBtn = document.querySelector('.empty-state .btn-primary');
        if (suggestBtn) {
            suggestBtn.addEventListener('click', () => {
                SearchManager.suggestSearch();
            });
        }
        
        // Сортировка
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                SearchManager.sortResults(e.target.value);
            });
        }
        
        // Сравнение
        const addCompareBtn = document.getElementById('addCompareBtn');
        if (addCompareBtn) {
            addCompareBtn.addEventListener('click', () => {
                const input = document.getElementById('compareInput');
                if (input?.value) {
                    CompareManager.addSet(input.value);
                    input.value = '';
                }
            });
        }
        
        const compareInput = document.getElementById('compareInput');
        if (compareInput) {
            compareInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value) {
                    CompareManager.addSet(e.target.value);
                    e.target.value = '';
                }
            });
        }
        
        const compareBtn = document.getElementById('compareBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                if (compareSets.length >= 2) {
                    CompareManager.displayComparison();
                } else {
                    Toast.warning('Недостаточно наборов', 'Добавьте минимум 2 набора для сравнения');
                }
            });
        }
        
        // Кнопка "Очистить все" в сравнении
        const clearCompareBtn = document.querySelector('.section-actions .btn-outline');
        if (clearCompareBtn) {
            clearCompareBtn.addEventListener('click', (e) => {
                if (e.target.textContent.includes('Очистить')) {
                    CompareManager.clearAll();
                }
            });
        }
        
        // Инструменты
        const identifyBtn = document.getElementById('identifyBtn');
        if (identifyBtn) {
            identifyBtn.addEventListener('click', () => {
                const input = document.getElementById('setNumberInput');
                if (input?.value) ToolsManager.identifySet(input.value);
            });
        }
        
        const setNumberInput = document.getElementById('setNumberInput');
        if (setNumberInput) {
            setNumberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value) {
                    ToolsManager.identifySet(e.target.value);
                }
            });
        }
        
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                ToolsManager.calculatePricePerPiece();
            });
        }
        
        // Авторизация
        this.setupAuthListeners();
        
        // Настройки
        this.setupSettingsListeners();
        
        // Футер - Поддержать проект
        const donateBtn = document.getElementById('donateBtn');
        if (donateBtn) {
            donateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Toast.info('Поддержка проекта', 'Эта функция скоро будет доступна!');
            });
        }
        
        // Закрытие модалок по клику вне
        document.addEventListener('click', (e) => {
            // Закрытие дропдауна пользователя
            if (!e.target.closest('#userMenuBtn') && !e.target.closest('#userDropdown')) {
                document.getElementById('userDropdown')?.classList.remove('active');
            }
            
            // Закрытие модалки авторизации
            if (e.target.classList.contains('modal')) {
                AuthManager.hideAuthModal();
            }
        });
        
        // Открытие модалки авторизации при клике на "Войти"
        const userBtn = document.querySelector('.user-btn');
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                if (!currentUser && !e.target.closest('#userDropdown')) {
                    e.preventDefault();
                    e.stopPropagation();
                    AuthManager.showAuthModal();
                }
            });
        }
        
        // ESC для закрытия модалок
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                AuthManager.hideAuthModal();
                document.getElementById('userDropdown')?.classList.remove('active');
                
                // Закрываем все модалки
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.classList.contains('active')) {
                        modal.remove();
                    }
                });
            }
        });
    }
    
    static setupAuthListeners() {
        // Кнопка пользователя
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('userDropdown');
                dropdown?.classList.toggle('active');
            });
        }
        
        // Вход
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                AuthManager.login();
            });
        }
        
        // Регистрация
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                AuthManager.register();
            });
        }
        
        // Google OAuth
        const googleLogin = document.getElementById('googleLogin');
        if (googleLogin) {
            googleLogin.addEventListener('click', () => {
                AuthManager.loginWithGoogle();
            });
        }
        
        // VK OAuth
        const vkLogin = document.getElementById('vkLogin');
        if (vkLogin) {
            vkLogin.addEventListener('click', () => {
                AuthManager.loginWithVK();
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await AuthManager.logout();
            });
        }
        
        // Переключение табов авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Деактивируем все табы
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                // Активируем выбранный
                tab.classList.add('active');
                const form = document.getElementById(`${tabId}Form`);
                if (form) form.classList.add('active');
            });
        });
        
        // Показать/скрыть пароль
        document.querySelectorAll('.show-password').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
        
        // Закрытие модалки
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal')?.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    static setupSettingsListeners() {
        // Уведомления о ценах
        const priceAlerts = document.getElementById('priceAlerts');
        if (priceAlerts) {
            priceAlerts.addEventListener('change', (e) => {
                userSettings.priceAlerts = e.target.checked;
                AuthManager.saveUserSettings();
                Toast.info('Настройки сохранены', 'Уведомления о ценах обновлены');
            });
        }
        
        // Темная тема
        const darkMode = document.getElementById('darkMode');
        if (darkMode) {
            darkMode.addEventListener('change', (e) => {
                userSettings.darkMode = e.target.checked;
                this.toggleTheme();
                AuthManager.saveUserSettings();
            });
        }
        
        // Email уведомления
        const emailNotifications = document.getElementById('emailNotifications');
        if (emailNotifications) {
            emailNotifications.addEventListener('change', (e) => {
                userSettings.emailNotifications = e.target.checked;
                AuthManager.saveUserSettings();
                Toast.info('Настройки сохранены', 'Email уведомления обновлены');
            });
        }
        
        // Очистка истории
        const clearHistoryBtn = document.querySelector('.card-header .btn-text');
        if (clearHistoryBtn && clearHistoryBtn.textContent.includes('Очистить')) {
            clearHistoryBtn.addEventListener('click', () => {
                if (!currentUser) {
                    AuthManager.showAuthModal();
                    return;
                }
                
                if (searchHistory.length === 0) {
                    Toast.info('История пуста', 'Нет данных для очистки');
                    return;
                }
                
                if (confirm('Вы уверены, что хотите очистить всю историю поиска?')) {
                    // В реальном приложении здесь был бы запрос к API
                    searchHistory = [];
                    AuthManager.updateUI();
                    Toast.success('История очищена', 'Все записи удалены');
                }
            });
        }
    }
    
    static showDisclaimer() {
        Toast.info('Дисклеймер LEGO', 'LEGO® является товарным знаком LEGO Group. Данный проект не связан и не спонсируется LEGO Group.', 6000);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 DOM загружен, запускаем приложение...');
    UIManager.init();
    
    // Скрываем прелоадер
    setTimeout(() => {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    }, 1500);
});

// ==================== ГЛОБАЛЬНЫЕ ЭКСПОРТЫ ====================
// Экспортируем только нужные функции для глобального доступа
window.AuthManager = AuthManager;
window.SearchManager = SearchManager;
window.CompareManager = CompareManager;
window.ToolsManager = ToolsManager;
window.UIManager = UIManager;
window.Utils = Utils;
