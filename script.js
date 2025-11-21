const button = document.getElementById("fact-button");
const titleEl = document.getElementById("fact-title");
const textEl = document.getElementById("fact-text");
const categoryEl = document.getElementById("fact-category");

// Тематические блоки и категории Википедии
const TOPIC_GROUPS = [
  {
    name: "Физика",
    categories: [
      "Категория:Физика",
      "Категория:Физики",
      "Категория:Физические явления",
      "Категория:Физические величины"
    ]
  },
  {
    name: "Биология",
    categories: [
      "Категория:Биология",
      "Категория:Биологи",
      "Категория:Биологические процессы",
      "Категория:Эволюция"
    ]
  },
  {
    name: "Обществознание",
    categories: [
      "Категория:Социальные науки",
      "Категория:Социология",
      "Категория:Психология",
      "Категория:Экономика"
    ]
  },
  {
    name: "Математика",
    categories: [
      "Категория:Математика",
      "Категория:Математики",
      "Категория:Математический анализ",
      "Категория:Теория вероятностей"
    ]
  }
];

const API_BASE = "https://ru.wikipedia.org/w/api.php";
const PAGE_URL_BASE = "https://ru.wikipedia.org/?curid=";

const cache = new Map(); // key: category title, value: array of page objects

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchCategoryMembers(categoryTitle) {
  if (cache.has(categoryTitle) && cache.get(categoryTitle).length > 0) {
    return cache.get(categoryTitle);
  }

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmnamespace: "0",
    cmlimit: "200"
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ошибка загрузки категорий");

  const data = await res.json();
  const members = data?.query?.categorymembers || [];
  cache.set(categoryTitle, members);
  return members;
}

async function fetchPageSummary(pageId) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "extracts|info",
    inprop: "url",
    exintro: "1",
    explaintext: "1",
    pageids: String(pageId)
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ошибка загрузки статьи");

  const data = await res.json();
  const page = data?.query?.pages?.[pageId];
  if (!page) throw new Error("Статья не найдена");

  return {
    title: page.title,
    extract: (page.extract || "").trim(),
    fullUrl: PAGE_URL_BASE + pageId
  };
}

function updateUIStateLoading(topicName) {
  button.disabled = true;
  button.classList.add("loading");
  button.textContent = "Загружаем факт";
  categoryEl.textContent = topicName ? topicName : "";
}

function updateUIStateReady() {
  button.disabled = false;
  button.classList.remove("loading");
  button.textContent = "Узнать новый факт";
}

function showFact({ title, extract, topicName }) {
  categoryEl.textContent = topicName;
  titleEl.textContent = title;
  textEl.textContent = extract || "Краткое описание к этой статье отсутствует.";
}

function showError(message) {
  categoryEl.textContent = "Ошибка";
  titleEl.textContent = "Не удалось получить факт";
  textEl.textContent = message;
}

async function getRandomFact() {
  const topic = getRandomItem(TOPIC_GROUPS);
  const categoryTitle = getRandomItem(topic.categories);

  updateUIStateLoading(topic.name);

  try {
    const members = await fetchCategoryMembers(categoryTitle);

    const filtered = members.filter(
      (m) =>
        m.title &&
        !/^Список/i.test(m.title) &&
        !/^Портал:/i.test(m.title) &&
        !/^Шаблон:/i.test(m.title)
    );

    const list = filtered.length > 0 ? filtered : members;
    if (!list.length) {
      throw new Error("В выбранной категории нет подходящих статей. Попробуйте ещё раз.");
    }

    const randomPage = getRandomItem(list);
    const summary = await fetchPageSummary(randomPage.pageid);

    const extract = summary.extract || "";
    let cutExtract = extract;
    if (extract.length > 700) {
      // Обрезаем по последней точке ближе к лимиту
      const slice = extract.slice(0, 700);
      const lastDot = slice.lastIndexOf(".");
      cutExtract = lastDot > 100 ? slice.slice(0, lastDot + 1) : slice + "…";
    }

    showFact({
      title: summary.title,
      extract: cutExtract,
      topicName: topic.name
    });
  } catch (err) {
    console.error(err);
    showError("Произошла сетевая ошибка или Википедия недоступна. Попробуйте ещё раз.");
  } finally {
    updateUIStateReady();
  }
}

button.addEventListener("click", () => {
  getRandomFact();
});

// Авто-загрузка первого факта через короткую задержку
setTimeout(() => {
  getRandomFact();
}, 600);