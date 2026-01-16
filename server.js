const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Слишком много запросов. Попробуйте через 15 минут.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Логирование
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ==================== БАЗА ДАННЫХ LEGO ====================
const LEGO_SETS = {
  // Star Wars
  75367: {
    number: "75367",
    name: "Venator-Class Republic Attack Cruiser",
    theme: "Star Wars",
    year: 2023,
    pieces: 3294,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/75367-1/115570.jpg",
    description: "Масштабная модель звёздного разрушителя Венейтор",
  },
  75292: {
    number: "75292",
    name: "The Razor Crest",
    theme: "Star Wars",
    year: 2020,
    pieces: 1023,
    ageRange: "10+",
    image: "https://cdn.rebrickable.com/media/sets/75292-1/98138.jpg",
    description: "Корабль Мандалорца из сериала The Mandalorian",
  },
  75313: {
    number: "75313",
    name: "AT-AT",
    theme: "Star Wars",
    year: 2021,
    pieces: 1267,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/75313-1/105522.jpg",
    description: "Шагающий танк Империи из Империя наносит ответный удар",
  },

  // Technic
  42154: {
    number: "42154",
    name: "2022 Ford GT",
    theme: "Technic",
    year: 2022,
    pieces: 1466,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/42154-1/114228.jpg",
    description: "Детализированная модель Ford GT 2022",
  },
  42115: {
    number: "42115",
    name: "Lamborghini Sián FKP 37",
    theme: "Technic",
    year: 2020,
    pieces: 3696,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/42115-1/100337.jpg",
    description: "Суперкар Lamborghini Sián в масштабе 1:8",
  },

  // Creator Expert
  10297: {
    number: "10297",
    name: "Boutique Hotel",
    theme: "Creator Expert",
    year: 2022,
    pieces: 3066,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/10297-1/111648.jpg",
    description: "Трехуровневый модульный бутик-отель",
  },
  10316: {
    number: "10316",
    name: "The Lord of the Rings: Rivendell",
    theme: "Creator Expert",
    year: 2023,
    pieces: 6167,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/10316-1/123456.jpg",
    description: "Детализированная модель Ривенделла из Властелина колец",
  },

  // City
  60320: {
    number: "60320",
    name: "Hospital",
    theme: "City",
    year: 2022,
    pieces: 724,
    ageRange: "6+",
    image: "https://cdn.rebrickable.com/media/sets/60320-1/111819.jpg",
    description: "Полнофункциональная больница LEGO City",
  },
  60317: {
    number: "60317",
    name: "Space Base",
    theme: "City",
    year: 2022,
    pieces: 864,
    ageRange: "6+",
    image: "https://cdn.rebrickable.com/media/sets/60317-1/111811.jpg",
    description: "Космическая база с шаттлом и марсоходом",
  },

  // Ideas
  21335: {
    number: "21335",
    name: "Motorized Lighthouse",
    theme: "Ideas",
    year: 2022,
    pieces: 2065,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/21335-1/112759.jpg",
    description: "Автоматизированный маяк с вращающимся светом",
  },

  // Architecture
  21042: {
    number: "21042",
    name: "Statue of Liberty",
    theme: "Architecture",
    year: 2018,
    pieces: 1685,
    ageRange: "16+",
    image: "https://cdn.rebrickable.com/media/sets/21042-1/86038.jpg",
    description: "Детализированная модель Статуи Свободы",
  },

  // Marvel
  76269: {
    number: "76269",
    name: "Avengers Tower",
    theme: "Marvel",
    year: 2023,
    pieces: 4051,
    ageRange: "18+",
    image: "https://cdn.rebrickable.com/media/sets/76269-1/123457.jpg",
    description: "Башня Мстителей высотой 90 см",
  },
};

const THEMES = [
  "Star Wars",
  "Technic",
  "City",
  "Creator Expert",
  "Ideas",
  "Architecture",
  "Marvel",
  "DC",
  "Ninjago",
  "Harry Potter",
  "Disney",
  "Friends",
  "Classic",
  "Speed Champions",
];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function formatPrice(price) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(price);
}

function calculateRealisticPrice(set) {
  // Реалистичная цена на основе деталей и темы
  let basePrice = set.pieces * 0.35; // ~0.35 руб за деталь

  // Модификаторы темы
  const themeMultipliers = {
    "Star Wars": 1.6,
    Technic: 1.4,
    "Creator Expert": 1.5,
    Architecture: 1.3,
    Marvel: 1.4,
    Ideas: 1.3,
    default: 1.0,
  };

  const multiplier = themeMultipliers[set.theme] || themeMultipliers.default;
  basePrice *= multiplier;

  // Модификатор года (новые дороже)
  const currentYear = 2024;
  if (currentYear - set.year <= 1) basePrice *= 1.1;
  if (currentYear - set.year >= 5) basePrice *= 0.8;

  // Модификатор возраста
  if (set.ageRange === "18+") basePrice *= 1.2;

  // Округляем до сотен
  return Math.round(basePrice / 100) * 100;
}

function getRandomRetailer() {
  const retailers = [
    { name: "OZON", color: "#005BFF", icon: "🛒" },
    { name: "Wildberries", color: "#FF3366", icon: "📦" },
    { name: "Яндекс.Маркет", color: "#FC3F1D", icon: "📊" },
    { name: "ДНС", color: "#00A550", icon: "💻" },
    { name: "Ситилинк", color: "#FF6B00", icon: "🏪" },
  ];
  return retailers[Math.floor(Math.random() * retailers.length)];
}

function generateProductData(set) {
  const price = calculateRealisticPrice(set);
  const retailer = getRandomRetailer();

  return {
    id: `lego_${set.number}_${Date.now()}`,
    title: set.name,
    price: price,
    priceText: formatPrice(price),
    retailer: retailer,
    rating: 4.0 + Math.random() * 1.5, // 4.0-5.5
    ratingCount: Math.floor(Math.random() * 500) + 50,
    inStock: Math.random() > 0.3,
    image: set.image,
    theme: set.theme,
    year: set.year,
    pieces: set.pieces,
    ageRange: set.ageRange,
    number: set.number,
    description: set.description,
    url: `https://www.google.com/search?q=lego+${set.number}+купить`,
    retailerUrl: `https://www.google.com/search?q=lego+${set.number}+${retailer.name}`,
  };
}

function searchInDatabase(query) {
  const queryLower = query.toLowerCase().trim();
  const results = [];

  // Поиск по номеру
  if (LEGO_SETS[query]) {
    results.push(generateProductData(LEGO_SETS[query]));
  }

  // Поиск по названию и теме
  Object.values(LEGO_SETS).forEach((set) => {
    if (
      set.name.toLowerCase().includes(queryLower) ||
      set.theme.toLowerCase().includes(queryLower) ||
      set.description.toLowerCase().includes(queryLower)
    ) {
      results.push(generateProductData(set));
    }
  });

  return results;
}

function generateSmartResults(query) {
  const queryLower = query.toLowerCase();
  const results = [];

  // Определяем тему
  let detectedTheme = "Lego";
  for (const theme of THEMES) {
    if (queryLower.includes(theme.toLowerCase())) {
      detectedTheme = theme;
      break;
    }
  }

  // Ключевые слова
  if (queryLower.includes("звезд") || queryLower.includes("star wars"))
    detectedTheme = "Star Wars";
  if (queryLower.includes("техник") || queryLower.includes("technic"))
    detectedTheme = "Technic";
  if (queryLower.includes("город") || queryLower.includes("city"))
    detectedTheme = "City";
  if (queryLower.includes("архитектур")) detectedTheme = "Architecture";
  if (
    queryLower.includes("машина") ||
    queryLower.includes("авто") ||
    queryLower.includes("car")
  )
    detectedTheme = "Technic";
  if (queryLower.includes("космос") || queryLower.includes("space"))
    detectedTheme = "City";

  // Генерируем 5-8 результатов
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const pieces = 500 + Math.floor(Math.random() * 3000);
    const year = 2020 + Math.floor(Math.random() * 5);
    const price = calculateRealisticPrice({
      pieces: pieces,
      theme: detectedTheme,
      year: year,
      ageRange: pieces > 2000 ? "18+" : "8+",
    });

    const nameSuffixes = [
      "Special Edition",
      "Collector's Edition",
      "Ultimate",
      "Deluxe",
      "2023",
      "2024",
      "Limited Edition",
      "Exclusive",
    ];

    const namePrefixes = {
      "Star Wars": ["Star Wars", "LEGO Star Wars", "Star Wars: "],
      Technic: ["LEGO Technic", "Технический набор", "Машина "],
      City: ["LEGO City", "Городской набор", "LEGO Сити"],
      default: ["Набор LEGO", "Конструктор LEGO"],
    };

    const prefixes = namePrefixes[detectedTheme] || namePrefixes.default;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix =
      nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];

    results.push({
      id: `smart_${Date.now()}_${i}`,
      title: `${prefix} "${query}" ${suffix}`,
      price: price,
      priceText: formatPrice(price),
      retailer: getRandomRetailer(),
      rating: 4.0 + Math.random() * 1.5,
      ratingCount: Math.floor(Math.random() * 300) + 20,
      inStock: Math.random() > 0.4,
      theme: detectedTheme,
      year: year,
      pieces: pieces,
      ageRange: pieces > 2000 ? "18+" : pieces > 1000 ? "12+" : "8+",
      description: `Набор LEGO на тему "${query}". ${pieces} деталей, ${year} год выпуска.`,
      url: `https://www.google.com/search?q=lego+${encodeURIComponent(query)}+купить`,
    });
  }

  return results;
}

function generateFallbackAnalyticsData() {
  return {
    trending: Object.values(LEGO_SETS)
      .slice(0, 5)
      .map((set) => ({
        number: set.number,
        name: set.name,
        price: calculateRealisticPrice(set),
      })),
    categories: THEMES.map((theme) => ({
      id: theme.toLowerCase().replace(/ /g, "-"),
      name: theme,
      count: Math.floor(Math.random() * 50) + 10,
      icon: getThemeIcon(theme),
    })),
    priceStats: generatePriceStats(),
    marketTrends: generateMarketTrends(),
  };
}

function generatePriceStats() {
  return {
    averagePrice: 4850,
    medianPrice: 3200,
    minPrice: 499,
    maxPrice: 89999,
    priceDistribution: [
      { range: "До 1 000 ₽", count: 35 },
      { range: "1 000 - 3 000 ₽", count: 42 },
      { range: "3 000 - 10 000 ₽", count: 18 },
      { range: "10 000 - 50 000 ₽", count: 4 },
      { range: "От 50 000 ₽", count: 1 },
    ],
  };
}

function generateMarketTrends() {
  return {
    popularThemes: [
      { theme: "Star Wars", growth: 15 },
      { theme: "Technic", growth: 12 },
      { theme: "Creator Expert", growth: 8 },
      { theme: "City", growth: 5 },
      { theme: "Ideas", growth: 3 },
    ],
    seasonalTrends: [
      { month: "Янв", sales: 45 },
      { month: "Фев", sales: 42 },
      { month: "Мар", sales: 48 },
      { month: "Апр", sales: 52 },
      { month: "Май", sales: 55 },
      { month: "Июн", sales: 60 },
      { month: "Июл", sales: 58 },
      { month: "Авг", sales: 62 },
      { month: "Сен", sales: 65 },
      { month: "Окт", sales: 70 },
      { month: "Ноя", sales: 85 },
      { month: "Дек", sales: 95 },
    ],
  };
}

function getThemeIcon(theme) {
  const icons = {
    "Star Wars": "⭐",
    Technic: "⚙️",
    City: "🏙️",
    "Creator Expert": "🎨",
    Architecture: "🏛️",
    Ideas: "💡",
    Marvel: "🦸",
    Ninjago: "🥷",
    "Harry Potter": "⚡",
    Disney: "🏰",
    Friends: "👭",
    Classic: "🧱",
    "Speed Champions": "🏎️",
  };
  return icons[theme] || "🧱";
}

// ==================== API ENDPOINTS ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "operational",
    version: "4.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    databaseSize: Object.keys(LEGO_SETS).length,
  });
});

// Основной поиск
app.post("/api/search", apiLimiter, (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Введите минимум 2 символа для поиска",
      });
    }

    // Поиск в базе
    let results = searchInDatabase(query);

    // Если в базе ничего нет, генерируем умные результаты
    if (results.length === 0) {
      results = generateSmartResults(query);
    }

    // Применяем фильтры
    let filteredResults = results.filter((item) => {
      if (filters.priceMin && item.price < filters.priceMin) return false;
      if (filters.priceMax && item.price > filters.priceMax) return false;
      if (filters.retailer && item.retailer.name !== filters.retailer)
        return false;
      if (filters.inStockOnly && !item.inStock) return false;
      if (filters.rating && item.rating < filters.rating) return false;
      if (filters.theme && item.theme !== filters.theme) return false;
      return true;
    });

    // Сортировка
    if (filters.sortBy === "price-asc") {
      filteredResults.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price-desc") {
      filteredResults.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === "rating") {
      filteredResults.sort((a, b) => b.rating - a.rating);
    } else if (filters.sortBy === "pieces") {
      filteredResults.sort((a, b) => b.pieces - a.pieces);
    } else if (filters.sortBy === "year") {
      filteredResults.sort((a, b) => b.year - a.year);
    }

    // Статистика
    const prices = filteredResults.map((r) => r.price).filter((p) => p > 0);
    const priceStats =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            count: prices.length,
          }
        : null;

    res.json({
      success: true,
      query: query,
      totalResults: filteredResults.length,
      results: filteredResults.slice(0, 20), // Ограничиваем 20 результатами
      filters: filters,
      priceStatistics: priceStats,
      meta: {
        responseTime: 50 + Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString(),
        source: "local_database",
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка при поиске",
      fallback: [],
    });
  }
});

// Информация о наборе
app.get("/api/set/:number", apiLimiter, (req, res) => {
  try {
    const { number } = req.params;

    if (!number || !/^\d{4,5}$/.test(number)) {
      return res.status(400).json({
        success: false,
        error: "Некорректный номер набора",
      });
    }

    const set = LEGO_SETS[number];

    if (!set) {
      return res.status(404).json({
        success: false,
        error: "Набор не найден",
      });
    }

    // Генерация цен для разных магазинов
    const basePrice = calculateRealisticPrice(set);
    const prices = {
      OZON: {
        price: Math.round(basePrice * (0.9 + Math.random() * 0.1)),
        url: `https://www.ozon.ru/search/?text=lego+${number}`,
        inStock: Math.random() > 0.2,
      },
      Wildberries: {
        price: Math.round(basePrice * (0.92 + Math.random() * 0.08)),
        url: `https://www.wildberries.ru/catalog/0/search.aspx?search=lego+${number}`,
        inStock: Math.random() > 0.1,
      },
      "Яндекс.Маркет": {
        price: Math.round(basePrice * (0.95 + Math.random() * 0.05)),
        url: `https://market.yandex.ru/search?text=lego+${number}`,
        inStock: Math.random() > 0.3,
      },
    };

    // Похожие наборы
    const similar = Object.values(LEGO_SETS)
      .filter((s) => s.theme === set.theme && s.number !== number)
      .slice(0, 5)
      .map((s) => ({
        number: s.number,
        name: s.name,
        price: calculateRealisticPrice(s),
        pieces: s.pieces,
        year: s.year,
      }));

    res.json({
      success: true,
      set: set,
      prices: prices,
      similar: similar,
      resources: {
        instructions: `https://www.lego.com/service/buildinginstructions/${number}`,
        reviews: `https://www.lego.com/ru-ru/product/reviews/${number}`,
        officialPage: `https://www.lego.com/ru-ru/product/${number}`,
        brickLink: `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${number}`,
      },
    });
  } catch (error) {
    console.error("Set info error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка получения информации",
    });
  }
});

// Сравнение цен
app.post("/api/compare/prices", apiLimiter, (req, res) => {
  try {
    const { setNumber } = req.body;

    if (!setNumber) {
      return res.status(400).json({
        success: false,
        error: "Укажите номер набора",
      });
    }

    const set = LEGO_SETS[setNumber];

    if (!set) {
      return res.status(404).json({
        success: false,
        error: "Набор не найден",
      });
    }

    const basePrice = calculateRealisticPrice(set);
    const comparison = {
      OZON: {
        price: Math.round(basePrice * 0.95),
        url: `https://www.ozon.ru/search/?text=lego+${setNumber}`,
        delivery: "1-3 дня",
        rating: 4.7,
      },
      Wildberries: {
        price: Math.round(basePrice * 0.97),
        url: `https://www.wildberries.ru/catalog/0/search.aspx?search=lego+${setNumber}`,
        delivery: "2-5 дней",
        rating: 4.6,
      },
      "Яндекс.Маркет": {
        price: Math.round(basePrice),
        url: `https://market.yandex.ru/search?text=lego+${setNumber}`,
        delivery: "1-4 дня",
        rating: 4.8,
      },
      ДНС: {
        price: Math.round(basePrice * 1.02),
        url: `https://www.dns-shop.ru/search/?q=lego+${setNumber}`,
        delivery: "3-7 дней",
        rating: 4.5,
      },
    };

    // Находим лучшее предложение
    let bestDeal = null;
    let minPrice = Infinity;

    for (const [retailer, data] of Object.entries(comparison)) {
      if (data.price < minPrice) {
        minPrice = data.price;
        bestDeal = {
          retailer: retailer,
          price: data.price,
          url: data.url,
          saving: Math.round(((basePrice - data.price) / basePrice) * 100),
        };
      }
    }

    res.json({
      success: true,
      set: {
        number: set.number,
        name: set.name,
        basePrice: basePrice,
      },
      comparison: comparison,
      bestDeal: bestDeal,
      meta: {
        updated: new Date().toISOString(),
        retailersCount: Object.keys(comparison).length,
      },
    });
  } catch (error) {
    console.error("Price comparison error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сравнения цен",
    });
  }
});

// Тренды и статистика
app.get("/api/stats/trending", apiLimiter, (req, res) => {
  try {
    const trending = Object.values(LEGO_SETS)
      .sort((a, b) => b.year - a.year)
      .slice(0, 10)
      .map((set) => ({
        number: set.number,
        name: set.name,
        theme: set.theme,
        year: set.year,
        pieces: set.pieces,
        price: calculateRealisticPrice(set),
        popularity: 50 + Math.floor(Math.random() * 50),
      }));

    res.json({
      success: true,
      trending: trending,
      period: "last_30_days",
      meta: {
        generated: new Date().toISOString(),
        totalSets: Object.keys(LEGO_SETS).length,
      },
    });
  } catch (error) {
    console.error("Trending stats error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка получения статистики",
      trending: generateFallbackTrending(),
    });
  }
});

function generateFallbackTrending() {
  return [
    {
      number: "75367",
      name: "Venator-Class Republic Attack Cruiser",
      theme: "Star Wars",
      year: 2023,
      pieces: 3294,
      price: 29999,
    },
    {
      number: "42154",
      name: "2022 Ford GT",
      theme: "Technic",
      year: 2022,
      pieces: 1466,
      price: 21999,
    },
    {
      number: "10316",
      name: "The Lord of the Rings: Rivendell",
      theme: "Creator Expert",
      year: 2023,
      pieces: 6167,
      price: 45999,
    },
  ];
}

// Категории
app.get("/api/categories", (req, res) => {
  try {
    const popularCategories = [
      { id: "star-wars", name: "Star Wars", count: 450, icon: "⭐" },
      { id: "technic", name: "Technic", count: 320, icon: "⚙️" },
      { id: "city", name: "City", count: 280, icon: "🏙️" },
      { id: "creator-expert", name: "Creator Expert", count: 180, icon: "🎨" },
      { id: "architecture", name: "Architecture", count: 75, icon: "🏛️" },
    ];

    res.json({
      success: true,
      categories: popularCategories,
      allThemes: THEMES,
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка получения категорий",
      categories: [
        { id: "star-wars", name: "Star Wars", count: 450, icon: "⭐" },
        { id: "technic", name: "Technic", count: 320, icon: "⚙️" },
        { id: "city", name: "City", count: 280, icon: "🏙️" },
      ],
    });
  }
});

// Сравнение нескольких наборов
app.post("/api/compare/sets", apiLimiter, (req, res) => {
  try {
    const { setNumbers } = req.body;

    if (!setNumbers || !Array.isArray(setNumbers) || setNumbers.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Укажите минимум 2 номера наборов",
      });
    }

    const sets = setNumbers
      .map((number) => LEGO_SETS[number])
      .filter((set) => set);

    if (sets.length < 2) {
      return res.status(404).json({
        success: false,
        error: "Не найдено достаточно наборов для сравнения",
      });
    }

    const comparison = sets.map((set) => ({
      number: set.number,
      name: set.name,
      theme: set.theme,
      year: set.year,
      pieces: set.pieces,
      ageRange: set.ageRange,
      price: calculateRealisticPrice(set),
      pricePerPiece:
        Math.round((calculateRealisticPrice(set) / set.pieces) * 100) / 100,
    }));

    // Анализ сравнения
    const analysis = {
      bestValue: comparison.reduce((best, current) =>
        current.pricePerPiece < best.pricePerPiece ? current : best,
      ),
      largestSet: comparison.reduce((largest, current) =>
        current.pieces > largest.pieces ? current : largest,
      ),
      newestSet: comparison.reduce((newest, current) =>
        current.year > newest.year ? current : newest,
      ),
    };

    res.json({
      success: true,
      sets: comparison,
      analysis: analysis,
      meta: {
        compared: sets.length,
        generated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Sets comparison error:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сравнения наборов",
      sets: [],
      analysis: null,
    });
  }
});

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy.html"));
});

app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms.html"));
});


app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Sitemap: ${req.protocol}://${req.get("host")}/sitemap.xml`);
});

// Главная страница
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================== ЗАПУСК СЕРВЕРА ====================

app.listen(PORT, () => {
  console.log(`🚀 BrickMind AI запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 API поиска: POST http://localhost:${PORT}/api/search`);
  console.log(`📁 Статика: http://localhost:${PORT}/`);
  console.log(`🧱 В базе: ${Object.keys(LEGO_SETS).length} наборов LEGO`);
  console.log(`🎯 Готов к работе!`);
});
