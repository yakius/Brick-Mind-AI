// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    API_BASE_URL: window.location.origin,
    THEMES: [
        "Star Wars",
        "Technic",
        "City",
        "Creator Expert",
        "Ideas",
        "Architecture",
    ],
    RETAILERS: ["OZON", "Wildberries", "Яндекс.Маркет", "ДНС", "Ситилинк"],
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentTab = 'search';
let searchResults = [];

// ==================== МЕНЕДЖЕР ВИШЛИСТА ====================
const WishlistManager = {
    getAll: function() {
        try {
            return JSON.parse(localStorage.getItem("brickmind_wishlist")) || [];
        } catch (e) {
            return [];
        }
    },
    
    add: function(item) {
        const wishlist = this.getAll();
        
        // Проверяем, нет ли уже такого набора
        const existingItem = wishlist.find(wishItem => 
            wishItem.query === item.query || 
            (item.number && wishItem.number === item.number)
        );
        
        if (existingItem) {
            return { 
                success: false, 
                message: "Этот набор уже в вишлисте",
                item: existingItem 
            };
        }
        
        const wishlistItem = {
            id: 'wish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            query: item.query,
            added: new Date().toISOString(),
            price: item.price || null,
            number: item.number || this.extractSetNumber(item.query),
            theme: item.theme || null,
            retailer: item.retailer || null
        };
        
        wishlist.push(wishlistItem);
        localStorage.setItem("brickmind_wishlist", JSON.stringify(wishlist));
        
        return { 
            success: true, 
            message: "Добавлено в вишлист", 
            item: wishlistItem 
        };
    },
    
    remove: function(itemId) {
        let wishlist = this.getAll();
        const itemToRemove = wishlist.find(item => item.id === itemId);
        
        wishlist = wishlist.filter(item => item.id !== itemId);
        localStorage.setItem("brickmind_wishlist", JSON.stringify(wishlist));
        
        return { 
            success: true, 
            message: "Удалено из вишлиста",
            removedItem: itemToRemove 
        };
    },
    
    clear: function() {
        localStorage.removeItem("brickmind_wishlist");
        return { success: true, message: "Вишлист очищен" };
    },
    
    hasItem: function(query) {
        const wishlist = this.getAll();
        return wishlist.some(item => item.query === query);
    },
    
    count: function() {
        return this.getAll().length;
    },
    
    extractSetNumber: function(text) {
        if (!text) return null;
        const match = text.match(/\b(\d{4,5})\b/);
        return match ? match[1] : null;
    },
    
    findById: function(id) {
        const wishlist = this.getAll();
        return wishlist.find(item => item.id === id);
    }
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener("DOMContentLoaded", () => {
    console.log("=== BRICKMIND AI ЗАПУЩЕН ===");
    
    initTheme();
    initAllEventListeners();
    updateLiveStats();
    updateWishlistDisplay();
    
    switchTab('search');
    initComparisonHandlers();
    
    // Показываем количество в вишлисте в заголовке
    updateWishlistBadge();
    
    console.log("✓ Инициализация завершена");
});

// ==================== УПРАВЛЕНИЕ ВКЛАДКАМИ ====================
function switchTab(tabName) {
    console.log("Переключаем на вкладку:", tabName);
    currentTab = tabName;
    
    // Скрываем все секции
    const sections = [
        'searchSection',
        'setsComparisonSection', 
        'analyticsSection',
        'toolsSection'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    });
    
    // Показываем нужную секцию
    const targetSection = document.getElementById(tabName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Обновляем активные кнопки в навигации
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Обновляем активные ссылки в футере
    document.querySelectorAll('.footer-links a[data-tab]').forEach(link => {
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Выполняем действия при переключении
    setTimeout(() => {
        if (tabName === 'analytics') {
            loadAnalyticsDashboard();
        }
        if (tabName === 'setsComparison') {
            checkEmptySetsGrid();
        }
        if (tabName === 'tools') {
            updateWishlistDisplay();
        }
    }, 50);
}

// ==================== ТЕМА ====================
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`Тема изменена на ${newTheme === 'light' ? 'светлую' : 'тёмную'}`, "success");
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("themeToggle");
    if (icon) {
        icon.textContent = theme === "light" ? "🌙" : "☀️";
    }
}

// ==================== ВСЕ ОБРАБОТЧИКИ СОБЫТИЙ ====================
function initAllEventListeners() {
    // Переключатель темы
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }
    
    // Навигация
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Навигация в футере
    document.querySelectorAll('.footer-links a[data-tab]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.dataset.tab);
        });
    });
    
    // Поиск
    const searchBtn = document.getElementById("searchBtn");
    const mainSearch = document.getElementById("mainSearch");
    
    if (searchBtn) searchBtn.addEventListener("click", performSearch);
    if (mainSearch) mainSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
    });
    
    // Быстрый поиск
    document.querySelectorAll(".quick-tag").forEach((tag) => {
        tag.addEventListener("click", (e) => {
            const query = e.currentTarget.dataset.query;
            if (mainSearch && query) {
                mainSearch.value = query;
                performSearch();
            }
        });
    });
    
    // Сортировка
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            if (searchResults && searchResults.length > 0) {
                displaySearchResults(sortResults(searchResults));
            }
        });
    }
    
    // Инструменты
    const identifySetBtn = document.getElementById("identifySetBtn");
    if (identifySetBtn) identifySetBtn.addEventListener("click", identifySet);
    
    const setNumberInput = document.getElementById("setNumberInput");
    if (setNumberInput) setNumberInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") identifySet();
    });
    
    const calculateBtn = document.getElementById("calculateBtn");
    if (calculateBtn) calculateBtn.addEventListener("click", calculatePricePerPiece);
    
    const addToWishlistBtn = document.getElementById("addToWishlistBtn");
    if (addToWishlistBtn) addToWishlistBtn.addEventListener("click", addToWishlistManual);
    
    const wishlistInput = document.getElementById("wishlistInput");
    if (wishlistInput) wishlistInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addToWishlistManual();
    });
    
    // Обработчик кликов для вишлиста (делегирование событий)
    document.addEventListener('click', function(e) {
        // Кнопка удаления из вишлиста
        if (e.target.classList.contains('btn-remove-wishlist') || 
            e.target.closest('.btn-remove-wishlist')) {
            const btn = e.target.classList.contains('btn-remove-wishlist') ? 
                       e.target : e.target.closest('.btn-remove-wishlist');
            const itemCard = btn.closest('.wishlist-item-card');
            if (itemCard) {
                const itemId = itemCard.dataset.id;
                if (itemId) removeFromWishlist(itemId);
            }
        }
        
        // Кнопка поиска из вишлиста
        if (e.target.classList.contains('btn-search-wishlist') || 
            e.target.closest('.btn-search-wishlist')) {
            const btn = e.target.classList.contains('btn-search-wishlist') ? 
                       e.target : e.target.closest('.btn-search-wishlist');
            const itemCard = btn.closest('.wishlist-item-card');
            if (itemCard) {
                const wishlistItem = WishlistManager.findById(itemCard.dataset.id);
                if (wishlistItem) searchWishlistItem(wishlistItem.query);
            }
        }
        
        // Кнопка добавления в вишлист в карточках товаров
        if (e.target.classList.contains('wishlist-heart') || 
            e.target.closest('.wishlist-heart')) {
            const btn = e.target.classList.contains('wishlist-heart') ? 
                       e.target : e.target.closest('.wishlist-heart');
            toggleWishlistFromCard(btn);
        }
    });
}

// ==================== ПОИСК ====================
async function performSearch() {
    const input = document.getElementById("mainSearch");
    if (!input) return;
    
    const query = input.value.trim();
    if (!query || query.length < 2) {
        showNotification("Введите минимум 2 символа", "warning");
        return;
    }
    
    // Показываем загрузку
    const loading = document.getElementById("loading");
    const resultsGrid = document.getElementById("resultsGrid");
    const resultsInfo = document.getElementById("resultsInfo");
    const noResults = document.getElementById("noResults");
    
    if (loading) loading.style.display = "flex";
    if (resultsGrid) resultsGrid.innerHTML = "";
    if (resultsInfo) resultsInfo.style.display = "none";
    if (noResults) noResults.style.display = "none";
    
    try {
        // Имитируем задержку сети
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Демо данные
        const demoProducts = generateDemoProducts(query);
        
        searchResults = demoProducts;
        displaySearchResults(sortResults(demoProducts));
        updateResultsInfo(demoProducts);
        showNotification(`Найдено ${demoProducts.length} результатов`, "success");
        
    } catch (error) {
        console.error("Search error:", error);
        showNotification("Ошибка при поиске", "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function generateDemoProducts(query) {
    const baseProducts = [
        {
            id: "1",
            title: "LEGO Star Wars Venator-Class Republic Attack Cruiser",
            price: 29999,
            retailer: { name: "OZON", color: "#005BFF" },
            rating: 4.8,
            ratingCount: 156,
            inStock: true,
            theme: "Star Wars",
            year: 2023,
            pieces: 3294,
            ageRange: "18+",
            number: "75367",
            url: "https://www.ozon.ru/search/?text=lego+75367"
        },
        {
            id: "2",
            title: "LEGO Technic 2022 Ford GT",
            price: 21999,
            retailer: { name: "Wildberries", color: "#FF3366" },
            rating: 4.6,
            ratingCount: 89,
            inStock: true,
            theme: "Technic",
            year: 2022,
            pieces: 1466,
            ageRange: "18+",
            number: "42154",
            url: "https://www.wildberries.ru/catalog/0/search.aspx?search=lego+42154"
        },
        {
            id: "3",
            title: "LEGO Creator Expert The Lord of the Rings: Rivendell",
            price: 45999,
            retailer: { name: "Яндекс.Маркет", color: "#FC3F1D" },
            rating: 4.9,
            ratingCount: 234,
            inStock: true,
            theme: "Creator Expert",
            year: 2023,
            pieces: 6167,
            ageRange: "18+",
            number: "10316",
            url: "https://market.yandex.ru/search?text=lego+10316"
        },
        {
            id: "4",
            title: "LEGO Marvel Avengers Tower",
            price: 37999,
            retailer: { name: "ДНС", color: "#00A550" },
            rating: 4.7,
            ratingCount: 189,
            inStock: true,
            theme: "Marvel",
            year: 2023,
            pieces: 4051,
            ageRange: "18+",
            number: "76269",
            url: "https://www.dns-shop.ru/search/?q=lego+76269"
        }
    ];
    
    // Фильтруем по запросу
    const queryLower = query.toLowerCase();
    return baseProducts.filter(product => 
        product.title.toLowerCase().includes(queryLower) ||
        product.theme.toLowerCase().includes(queryLower) ||
        product.number.includes(query)
    );
}

function sortResults(results) {
    const sortSelect = document.getElementById("sortSelect");
    if (!sortSelect) return results;
    
    const sortBy = sortSelect.value;
    const sorted = [...results];
    
    switch (sortBy) {
        case "price-asc": return sorted.sort((a, b) => a.price - b.price);
        case "price-desc": return sorted.sort((a, b) => b.price - a.price);
        case "rating": return sorted.sort((a, b) => b.rating - a.rating);
        default: return sorted;
    }
}

function displaySearchResults(results) {
    const container = document.getElementById("resultsGrid");
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="placeholder">
                🔍
                <p>Ничего не найдено</p>
                <p class="text-tertiary">Попробуйте изменить запрос</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = results.map(product => {
        const inWishlist = WishlistManager.hasItem(product.title);
        
        // Иконки для ретейлеров
        const retailerIcons = {
            'OZON': '🛒',
            'Wildberries': '📦',
            'Яндекс.Маркет': '📊',
            'ДНС': '💻',
            'Ситилинк': '🏪'
        };
        
        // Иконки для тем
        const themeIcons = {
            'Star Wars': '⭐',
            'Technic': '⚙️',
            'City': '🏙️',
            'Creator Expert': '🎨',
            'Marvel': '🦸'
        };
        
        const retailerIcon = retailerIcons[product.retailer?.name] || '🛍️';
        const themeIcon = themeIcons[product.theme] || '🧱';
        
        return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <div class="image-placeholder">
                    ${themeIcon}
                    <div class="product-theme-badge">${product.theme}</div>
                </div>
                <div class="product-wishlist">
                    <button class="wishlist-heart" 
                            data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'
                            data-in-wishlist="${inWishlist}"
                            title="${inWishlist ? 'Удалить из вишлиста' : 'Добавить в вишлист'}">
                        ${inWishlist ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-title" title="${product.title}">
                        ${product.title}
                    </h3>
                    <div class="product-number">#${product.number}</div>
                </div>
                
                <div class="product-price-section">
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div class="product-price-per-piece">
                        ${(product.price / product.pieces).toFixed(2)} ₽/дет.
                    </div>
                </div>
                
                <div class="product-meta">
                    <div class="product-rating">
                        <span class="stars">
                            ${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5 - Math.floor(product.rating))}
                        </span>
                        <span class="rating-value">${product.rating.toFixed(1)}</span>
                        <span class="rating-count">(${product.ratingCount})</span>
                    </div>
                    <div class="product-retailer">
                        <span class="retailer-icon">${retailerIcon}</span>
                        <span class="retailer-name">${product.retailer?.name}</span>
                    </div>
                </div>
                
                <div class="product-stats">
                    <div class="stat-item">
                        <span class="stat-icon">🧩</span>
                        <span class="stat-value">${product.pieces}</span>
                        <span class="stat-label">деталей</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">📅</span>
                        <span class="stat-value">${product.year}</span>
                        <span class="stat-label">год</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">👤</span>
                        <span class="stat-value">${product.ageRange}</span>
                    </div>
                </div>
                
                <div class="product-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
                    ${product.inStock ? '✅ В наличии' : '❌ Нет в наличии'}
                </div>
                
                <a href="${product.url}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="product-link">
                    🛒 Перейти в магазин
                </a>
            </div>
        </div>
        `;
    }).join("");
}

function updateResultsInfo(data) {
    const info = document.getElementById("resultsInfo");
    const foundCount = document.getElementById("foundCount");
    const priceRange = document.getElementById("priceRange");
    const avgPrice = document.getElementById("avgPrice");
    
    if (!info || !foundCount || !priceRange || !avgPrice) return;
    
    info.style.display = "flex";
    foundCount.textContent = data.length;
    
    const prices = data.map(r => r.price);
    if (prices.length > 0) {
        priceRange.textContent = `${formatPrice(Math.min(...prices))} - ${formatPrice(Math.max(...prices))}`;
        avgPrice.textContent = formatPrice(Math.round(prices.reduce((a, b) => a + b, 0) / prices.length));
    }
}

// ==================== ВИШЛИСТ ====================
function updateWishlistDisplay() {
    const container = document.getElementById("wishlistItems");
    if (!container) return;
    
    const wishlist = WishlistManager.getAll();
    
    if (wishlist.length === 0) {
        container.innerHTML = `
            <div class="empty-wishlist">
                ❤️
                <p>Ваш вишлист пуст</p>
                <p class="text-tertiary">Добавляйте наборы ❤️ из результатов поиска</p>
            </div>
        `;
        updateWishlistBadge();
        return;
    }
    
    // Сортируем по дате добавления (новые сверху)
    const sortedWishlist = wishlist.sort((a, b) => 
        new Date(b.added) - new Date(a.added)
    );
    
    container.innerHTML = `
        <div class="wishlist-header">
            <span>❤️ Наборов: ${wishlist.length}</span>
            <button class="btn-clear-wishlist" onclick="clearWishlist()">
                🗑️ Очистить все
            </button>
        </div>
        <div class="wishlist-items-container">
            ${sortedWishlist.map((item) => `
                <div class="wishlist-item-card" data-id="${item.id}">
                    <div class="wishlist-item-main">
                        <div class="wishlist-item-icon">
                            🧱
                        </div>
                        <div class="wishlist-item-content">
                            <div class="wishlist-item-title">${item.query}</div>
                            ${item.number ? `<div class="wishlist-item-number"># ${item.number}</div>` : ''}
                            ${item.theme ? `<div class="wishlist-item-theme">🏷️ ${item.theme}</div>` : ''}
                            <div class="wishlist-item-date">📅 ${formatDate(item.added)}</div>
                        </div>
                    </div>
                    <div class="wishlist-item-actions">
                        ${item.price ? `<div class="wishlist-item-price">${formatPrice(item.price)}</div>` : ''}
                        <div class="wishlist-item-buttons">
                            <button class="btn-search-wishlist">
                                🔍 Найти
                            </button>
                            <button class="btn-remove-wishlist">
                                ✕ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    updateWishlistBadge();
}

function toggleWishlistFromCard(button) {
    try {
        const productData = JSON.parse(button.dataset.product.replace(/&apos;/g, "'"));
        const inWishlist = button.dataset.inWishlist === 'true';
        
        if (inWishlist) {
            // Удаляем из вишлиста
            const wishlist = WishlistManager.getAll();
            const wishlistItem = wishlist.find(item => item.query === productData.title);
            
            if (wishlistItem) {
                WishlistManager.remove(wishlistItem.id);
                button.innerHTML = '🤍';
                button.dataset.inWishlist = 'false';
                button.title = 'Добавить в вишлист';
                showNotification(`Удалено из вишлиста: ${productData.title}`, "info");
            }
        } else {
            // Добавляем в вишлист
            const result = WishlistManager.add({
                query: productData.title,
                price: productData.price,
                number: productData.number,
                theme: productData.theme,
                retailer: productData.retailer?.name
            });
            
            if (result.success) {
                button.innerHTML = '❤️';
                button.dataset.inWishlist = 'true';
                button.title = 'Удалить из вишлиста';
                showNotification(`Добавлено в вишлист: ${productData.title}`, "success");
            } else {
                showNotification(result.message, "warning");
            }
        }
        
        updateWishlistDisplay();
    } catch (error) {
        console.error("Error toggling wishlist:", error);
        showNotification("Ошибка при работе с вишлистом", "error");
    }
}

function addToWishlistManual() {
    const input = document.getElementById("wishlistInput");
    const query = input ? input.value.trim() : '';
    
    if (!query) {
        showNotification("Введите название или номер набора", "warning");
        return;
    }
    
    const result = WishlistManager.add({
        query: query,
        number: WishlistManager.extractSetNumber(query)
    });
    
    if (result.success) {
        showNotification(`✅ Добавлено в вишлист: ${query}`, "success");
        if (input) input.value = "";
        updateWishlistDisplay();
    } else {
        showNotification(result.message, "warning");
    }
}

function removeFromWishlist(itemId) {
    const result = WishlistManager.remove(itemId);
    if (result.success && result.removedItem) {
        showNotification(`🗑️ Удалено из вишлиста: ${result.removedItem.query}`, "info");
        updateWishlistDisplay();
    }
}

function clearWishlist() {
    const wishlist = WishlistManager.getAll();
    if (wishlist.length === 0) {
        showNotification("Вишлист уже пуст", "info");
        return;
    }
    
    if (confirm(`Вы уверены, что хотите удалить все ${wishlist.length} наборов из вишлиста?`)) {
        const result = WishlistManager.clear();
        showNotification("✅ " + result.message, "success");
        updateWishlistDisplay();
    }
}

function searchWishlistItem(query) {
    switchTab('search');
    
    const searchInput = document.getElementById("mainSearch");
    if (searchInput) {
        searchInput.value = query;
        searchInput.focus();
    }
    
    setTimeout(() => {
        performSearch();
        showNotification(`Ищем: ${query}`, "info");
    }, 100);
}

function updateWishlistBadge() {
    const count = WishlistManager.count();
    const wishlistTab = document.querySelector('[data-tab="tools"]');
    
    if (wishlistTab && count > 0) {
        // Удаляем старый бейдж
        const oldBadge = wishlistTab.querySelector('.wishlist-badge');
        if (oldBadge) oldBadge.remove();
        
        // Добавляем новый бейдж
        const badge = document.createElement('span');
        badge.className = 'wishlist-badge';
        badge.textContent = count;
        badge.title = `${count} наборов в вишлисте`;
        wishlistTab.appendChild(badge);
    } else {
        // Удаляем бейдж если нет элементов
        const badge = wishlistTab?.querySelector('.wishlist-badge');
        if (badge) badge.remove();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ==================== ДОНАТЫ ====================
function showSupportModal() {
    // Прокручиваем к разделу донатов
    document.querySelector('.donations-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// ==================== ИНСТРУМЕНТЫ ====================
async function identifySet() {
    const input = document.getElementById("setNumberInput");
    const result = document.getElementById("setResult");
    
    if (!input || !result) return;
    
    const setNumber = input.value.trim();
    if (!setNumber || !/^\d{4,5}$/.test(setNumber)) {
        result.innerHTML = `
            <div class="error">
                ❗
                <p>Введите корректный номер набора (4-5 цифр)</p>
                <p class="text-tertiary">Пример: 75367, 10316, 42154</p>
            </div>
        `;
        return;
    }
    
    result.innerHTML = '<div class="loading">⏳ Ищем информацию...</div>';
    
    try {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const demoData = {
            "75367": {
                name: "Venator-Class Republic Attack Cruiser",
                theme: "Star Wars",
                year: 2023,
                pieces: 3294,
                ageRange: "18+",
                description: "Масштабная модель звёздного разрушителя Венейтор"
            },
            "10316": {
                name: "The Lord of the Rings: Rivendell",
                theme: "Creator Expert",
                year: 2023,
                pieces: 6167,
                ageRange: "18+",
                description: "Детализированная модель Ривенделла"
            },
            "42154": {
                name: "2022 Ford GT",
                theme: "Technic",
                year: 2022,
                pieces: 1466,
                ageRange: "18+",
                description: "Детализированная модель Ford GT"
            }
        };
        
        const data = demoData[setNumber];
        if (data) {
            result.innerHTML = `
                <div class="set-info">
                    <h4>${data.name}</h4>
                    <div class="set-details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Номер:</span>
                            <span class="detail-value">#${setNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Тема:</span>
                            <span class="detail-value">${data.theme}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Год:</span>
                            <span class="detail-value">${data.year}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Деталей:</span>
                            <span class="detail-value">${data.pieces}</span>
                        </div>
                    </div>
                    <p>${data.description}</p>
                    <button class="tool-btn" onclick="searchWishlistItem('${setNumber}')">
                        🔍 Найти цены
                    </button>
                </div>
            `;
        } else {
            result.innerHTML = `
                <div class="error">
                    ❗
                    <p>Набор #${setNumber} не найден</p>
                    <p class="text-tertiary">Попробуйте: 75367, 10316, 42154</p>
                </div>
            `;
        }
    } catch (error) {
        result.innerHTML = `
            <div class="error">
                ❗
                <p>Ошибка при поиске набора</p>
            </div>
        `;
    }
}

function calculatePricePerPiece() {
    const priceInput = document.getElementById("calcPrice");
    const piecesInput = document.getElementById("calcPieces");
    const result = document.getElementById("calcResult");
    
    if (!priceInput || !piecesInput || !result) return;
    
    const price = parseFloat(priceInput.value);
    const pieces = parseInt(piecesInput.value);
    
    if (!price || !pieces || price <= 0 || pieces <= 0) {
        result.innerHTML = `
            <div class="error">
                ❗
                <p>Введите корректные значения</p>
            </div>
        `;
        return;
    }
    
    const pricePerPiece = price / pieces;
    
    let rating, color, description, icon;
    if (pricePerPiece < 0.2) {
        rating = "excellent";
        color = "#34a853";
        description = "Отличная цена! Очень выгодно";
        icon = '⭐';
    } else if (pricePerPiece < 0.4) {
        rating = "good";
        color = "#4285f4";
        description = "Хорошая цена. Среднерыночная стоимость";
        icon = '👍';
    } else if (pricePerPiece < 0.6) {
        rating = "average";
        color = "#f9ab00";
        description = "Средняя цена. Можно найти дешевле";
        icon = '⚖️';
    } else {
        rating = "expensive";
        color = "#ea4335";
        description = "Высокая цена. Коллекционный или редкий набор";
        icon = '👑';
    }
    
    result.innerHTML = `
        <div class="calc-result">
            <div class="result-title">Результат расчета:</div>
            <div class="result-value">${pricePerPiece.toFixed(2)} ₽ за деталь</div>
            <div class="result-rating" style="color: ${color};">
                ${icon} ${description}
            </div>
            <div class="result-tip">
                💡 Средняя цена за деталь: 0.35₽
            </div>
        </div>
    `;
}

// ==================== СРАВНЕНИЕ НАБОРОВ ====================
function initComparisonHandlers() {
    const addSetBtn = document.getElementById("addSetBtn");
    const compareSetsBtn = document.getElementById("compareSetsBtn");
    const compareSetsPricesBtn = document.getElementById("compareSetsPricesBtn");
    const setSearchInput = document.getElementById("setSearchInput");
    
    if (addSetBtn) addSetBtn.addEventListener("click", addSet);
    if (compareSetsBtn) compareSetsBtn.addEventListener("click", compareSets);
    if (compareSetsPricesBtn) compareSetsPricesBtn.addEventListener("click", compareSetsPrices);
    
    if (setSearchInput) {
        setSearchInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") addSet();
        });
    }
    
    // Удаление наборов
    document.querySelectorAll(".remove-button").forEach(btn => {
        btn.addEventListener("click", function() {
            const setItem = this.closest(".set-item");
            if (setItem) {
                setItem.remove();
                checkEmptySetsGrid();
            }
        });
    });
}

function addSet() {
    const input = document.getElementById("setSearchInput");
    if (!input) return;
    
    const setNumber = input.value.trim();
    
    if (setNumber && /^\d{4,5}$/.test(setNumber)) {
        const setsGrid = document.getElementById("setsGrid");
        if (!setsGrid) return;
        
        // Проверяем, не добавлен ли уже этот набор
        const existingSets = Array.from(
            setsGrid.querySelectorAll(".set-number")
        ).map((el) => el.textContent);
        
        if (existingSets.includes(setNumber)) {
            showNotification("Этот набор уже добавлен для сравнения", "warning");
            return;
        }
        
        // Находим название набора
        const demoData = {
            "75367": "Venator",
            "10316": "Rivendell", 
            "42154": "Ford GT",
            "76269": "Avengers Tower"
        };
        
        const setName = demoData[setNumber] || "Набор";
        
        // Создаем новый элемент набора
        const setItem = document.createElement("div");
        setItem.className = "set-item";
        setItem.innerHTML = `
            <button class="remove-button">✕</button>
            <div class="set-number">${setNumber}</div>
            <div class="set-name">${setName}</div>
        `;
        
        // Добавляем обработчик удаления
        setItem.querySelector(".remove-button").addEventListener("click", function() {
            setItem.remove();
            checkEmptySetsGrid();
        });
        
        setsGrid.appendChild(setItem);
        input.value = "";
        showNotification(`Набор ${setNumber} добавлен для сравнения`, "success");
        
        checkEmptySetsGrid();
    } else {
        showNotification("Введите корректный номер набора (4-5 цифр)", "warning");
    }
}

function checkEmptySetsGrid() {
    const setsGrid = document.getElementById("setsGrid");
    const comparisonResults = document.getElementById("comparisonResults");
    
    if (setsGrid && comparisonResults && setsGrid.children.length === 0) {
        comparisonResults.innerHTML = `
            <div class="placeholder">
                ⚖️
                <p>Добавьте наборы и нажмите "Сравнить"</p>
            </div>
        `;
    }
}

async function compareSets() {
    const setNumbers = [];
    document.querySelectorAll("#setsGrid .set-number").forEach((element) => {
        setNumbers.push(element.textContent);
    });
    
    if (setNumbers.length < 2) {
        showNotification("Добавьте как минимум 2 набора для сравнения", "warning");
        return;
    }
    
    try {
        showNotification("Сравниваем наборы...", "info");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Демо данные
        const demoData = {
            sets: setNumbers.map((number, index) => ({
                number: number,
                name: `LEGO Набор #${number}`,
                theme: ["Star Wars", "Technic", "Creator Expert"][index % 3],
                year: 2020 + index,
                pieces: 1000 + index * 500,
                ageRange: "18+",
                price: 15000 + index * 5000,
                pricePerPiece: ((15000 + index * 5000) / (1000 + index * 500)).toFixed(2)
            })),
            analysis: {
                bestValue: {
                    number: setNumbers[0],
                    pricePerPiece: ((15000) / (1000)).toFixed(2)
                },
                largestSet: {
                    number: setNumbers[setNumbers.length - 1],
                    pieces: 1000 + (setNumbers.length - 1) * 500
                }
            }
        };
        
        displayComparisonResults(demoData);
        showNotification("Сравнение завершено", "success");
    } catch (error) {
        showNotification("Ошибка при сравнении наборов", "error");
    }
}

function displayComparisonResults(data) {
    const container = document.getElementById("comparisonResults");
    if (!container) return;
    
    container.innerHTML = `
        <div class="comparison-table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Характеристика</th>
                        ${data.sets.map(set => `<th>#${set.number}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Название</td>
                        ${data.sets.map(set => `<td>${set.name}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Тема</td>
                        ${data.sets.map(set => `<td>${set.theme}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Год</td>
                        ${data.sets.map(set => `<td>${set.year}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Деталей</td>
                        ${data.sets.map(set => `<td>${set.pieces}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Цена</td>
                        ${data.sets.map(set => `<td>${formatPrice(set.price)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Цена за деталь</td>
                        ${data.sets.map(set => `<td>${set.pricePerPiece} ₽</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
        
        ${data.analysis ? `
        <div class="comparison-analysis">
            <h4>📊 Анализ:</h4>
            <div class="analysis-points">
                <div class="analysis-point">
                    🏆
                    <div>
                        <strong>Лучшее соотношение цены:</strong>
                        <p>Набор #${data.analysis.bestValue.number} (${data.analysis.bestValue.pricePerPiece} ₽/дет.)</p>
                    </div>
                </div>
                <div class="analysis-point">
                    📏
                    <div>
                        <strong>Самый большой набор:</strong>
                        <p>Набор #${data.analysis.largestSet.number} (${data.analysis.largestSet.pieces} деталей)</p>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    `;
}

async function compareSetsPrices() {
    const setNumbers = [];
    document.querySelectorAll("#setsGrid .set-number").forEach((element) => {
        setNumbers.push(element.textContent);
    });
    
    if (setNumbers.length < 2) {
        showNotification("Добавьте минимум 2 набора для сравнения цен", "warning");
        return;
    }
    
    showNotification("Сравниваем цены...", "info");
    switchTab("search");
    
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "block";
    
    try {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const allProducts = [];
        setNumbers.forEach((setNumber, index) => {
            const basePrice = 15000 + index * 5000;
            const retailers = [
                { name: "OZON", price: basePrice * 0.95 },
                { name: "Wildberries", price: basePrice * 0.97 },
                { name: "Яндекс.Маркет", price: basePrice }
            ];
            
            retailers.forEach(retailer => {
                allProducts.push({
                    id: `compare_${setNumber}_${retailer.name}`,
                    title: `LEGO Набор #${setNumber}`,
                    price: retailer.price,
                    rating: 4.5,
                    ratingCount: 100,
                    inStock: true,
                    theme: "Сравнение",
                    year: 2023,
                    pieces: 1000,
                    ageRange: "18+",
                    number: setNumber,
                    url: `https://www.google.com/search?q=lego+${setNumber}`
                });
            });
        });
        
        searchResults = allProducts;
        displaySearchResults(allProducts);
        
        const resultsInfo = document.getElementById("resultsInfo");
        const foundCount = document.getElementById("foundCount");
        const priceRange = document.getElementById("priceRange");
        const avgPrice = document.getElementById("avgPrice");
        
        if (resultsInfo) resultsInfo.style.display = "flex";
        if (foundCount) foundCount.textContent = allProducts.length;
        
        const prices = allProducts.map(p => p.price);
        if (priceRange) priceRange.textContent = `${formatPrice(Math.min(...prices))} - ${formatPrice(Math.max(...prices))}`;
        if (avgPrice) avgPrice.textContent = formatPrice(Math.round(prices.reduce((a, b) => a + b, 0) / prices.length));
        
        showNotification(`Найдены цены для ${setNumbers.length} наборов`, "success");
    } catch (error) {
        showNotification("Ошибка при сравнении цен", "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

// ==================== АНАЛИТИКА ====================
async function loadAnalyticsDashboard() {
    try {
        const trendingData = [
            { number: "75367", name: "Venator", price: 29999 },
            { number: "42154", name: "Ford GT", price: 21999 },
            { number: "10316", name: "Rivendell", price: 45999 },
            { number: "76269", name: "Avengers Tower", price: 37999 },
            { number: "10297", name: "Boutique Hotel", price: 28999 }
        ];
        
        updateTrendingDisplay(trendingData);
        updatePriceStats();
    } catch (error) {
        updateTrendingDisplay([]);
        updatePriceStats();
    }
}

function updateTrendingDisplay(trending) {
    const container = document.getElementById("trendingList");
    if (!container) return;
    
    if (!trending || trending.length === 0) {
        container.innerHTML = '<div class="empty">Нет данных</div>';
        return;
    }
    
    container.innerHTML = trending.slice(0, 5).map((set, index) => `
        <div class="trending-item">
            <div class="trending-rank">${index + 1}</div>
            <div class="trending-name">
                <strong>${set.name}</strong>
                <small>#${set.number}</small>
            </div>
            <div class="trending-price">${formatPrice(set.price)}</div>
        </div>
    `).join("");
}

function updatePriceStats() {
    const container = document.getElementById("priceStats");
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-row">
            <span>💰 Средняя цена:</span>
            <span class="stat-value">${formatPrice(4850)}</span>
        </div>
        <div class="stat-row">
            <span>📊 Медианная цена:</span>
            <span class="stat-value">${formatPrice(3200)}</span>
        </div>
        <div class="stat-row">
            <span>👑 Самый дорогой:</span>
            <span class="stat-value">${formatPrice(89999)}</span>
        </div>
        <div class="stat-row">
            <span>💎 Самый дешевый:</span>
            <span class="stat-value">${formatPrice(499)}</span>
        </div>
    `;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function formatPrice(price) {
    if (typeof price !== "number") return price || "Цена не указана";
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
    }).format(price);
}

function showNotification(message, type = "info") {
    const existing = document.querySelectorAll(".notification");
    existing.forEach(n => n.remove());
    
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `${icons[type] || ''} ${message}`;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "error" ? "#d93025" : type === "warning" ? "#f9ab00" : type === "success" ? "#34a853" : "#4285f4"};
        color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    if (!document.querySelector("#notification-animations")) {
        const style = document.createElement("style");
        style.id = "notification-animations";
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-in";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateLiveStats() {
    const totalProducts = document.getElementById("totalProducts");
    const avgSavings = document.getElementById("avgSavings");
    
    if (totalProducts) {
        totalProducts.textContent = (12000 + Math.floor(Math.random() * 1000)).toLocaleString();
    }
    
    if (avgSavings) {
        avgSavings.textContent = `${25 + Math.floor(Math.random() * 3) - 1}%`;
    }
}

// ВАЖНО: Проверь что ВСЕ ФУНКЦИИ ЗАКРЫТЫ правильным количеством скобок!
// Этот файл должен заканчиваться правильно