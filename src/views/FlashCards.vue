<template>
  <div class="flashcards-page">
    <h1>📚 Карточки для запоминания</h1>

    <!-- 🔐 Инфо о пользователе -->
    <div v-if="user" class="user-bar">
      <span>👤 {{ user.displayName || user.email }}</span>
    </div>

    <!-- Режим выбора -->
    <div v-if="!cards.length" class="setup-section">
      <div class="json-input">
        <h3>📋 Загрузите вопросы из JSON</h3>
        <textarea
          v-model="jsonInput"
          placeholder='[{"question": "Что такое дзета-потенциал?", "answer": "Электростатический потенциал..."}]'
          rows="8"
        ></textarea>
        <div class="btn-row">
          <button @click="loadFromJson" class="btn btn-primary">
            🚀 Загрузить карточки
          </button>
          <button @click="fillExample" class="btn btn-outline">
            📄 Пример JSON
          </button>
        </div>
        <small class="hint">
          Формат: массив объектов с полями <code>question</code> и
          <code>answer</code>
        </small>
      </div>
    </div>

    <!-- Карточки -->
    <div v-else class="flashcards-container">
      <!-- Прогресс -->
      <div class="progress-header">
        <div class="progress-info">
          <span>Карточка {{ currentIndex + 1 }} из {{ cards.length }}</span>
          <span class="progress-percent">{{ progressPercent }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <div class="stats">
          <span class="stat known">✅ {{ knownCount }} изучено</span>
          <span class="stat unknown">❌ {{ unknownCount }} повторить</span>
        </div>
      </div>

      <!-- Карточка с 3D переворотом -->
      <div class="flashcard-wrapper">
        <div
          class="flashcard"
          :class="{ 'is-flipped': isFlipped }"
          @click="flipCard"
        >
          <!-- Лицевая сторона (вопрос) -->
          <div class="flashcard-front">
            <div class="card-label">Вопрос</div>
            <div class="card-content">{{ currentCard.question }}</div>
            <div class="card-hint">👆 Нажмите, чтобы перевернуть</div>
          </div>

          <!-- Обратная сторона (ответ) -->
          <div class="flashcard-back">
            <div class="card-label">Ответ</div>
            <div class="card-content">{{ currentCard.answer }}</div>
            <div v-if="currentCard.explanation" class="card-explanation">
              <strong>📚 Пояснение:</strong><br />
              {{ currentCard.explanation }}
            </div>
          </div>
        </div>
      </div>

      <!-- Управление -->
      <div class="controls">
        <button
          @click="prevCard"
          :disabled="currentIndex === 0"
          class="btn btn-nav"
        >
          ← Назад
        </button>

        <div class="mode-buttons">
          <button
            v-if="!isFlipped"
            @click="flipCard"
            class="btn btn-primary btn-large"
          >
            🔄 Показать ответ (Пробел)
          </button>

          <template v-else>
            <button @click="markUnknown" class="btn btn-danger btn-large">
              ❌ Не знаю (←)
            </button>
            <button @click="markKnown" class="btn btn-success btn-large">
              ✅ Знаю (→)
            </button>
          </template>
        </div>

        <button
          @click="nextCard"
          :disabled="currentIndex === cards.length - 1"
          class="btn btn-nav"
        >
          Вперёд →
        </button>
      </div>

      <!-- Дополнительные кнопки -->
      <div class="extra-controls">
        <button @click="shuffleCards" class="btn btn-outline">
          🔀 Перемешать
        </button>
        <button @click="resetProgress" class="btn btn-outline">
          🔄 Сбросить прогресс
        </button>
        <button
          v-if="user && cards.length && Object.keys(cardStatus).length"
          @click="saveSession"
          class="btn btn-primary"
        >
          💾 Сохранить сессию
        </button>
        <button
          @click="
            cards = [];
            jsonInput = '';
          "
          class="btn btn-outline"
        >
          Загрузить другой набор
        </button>
      </div>

      <!-- 🔁 Пост-сессия: предложение повторить (INLINE) -->
      <transition name="fade-slide">
        <div
          v-if="sessionCompleted && showPostSessionRepeat"
          class="post-session-repeat-inline"
        >
          <div class="repeat-hint">🎯 Хотите повторить?</div>
          <div class="repeat-buttons-inline">
            <button
              @click="startPostSessionRepeat('all')"
              class="btn btn-outline btn-sm-inline"
            >
              📋 Все карточки
            </button>
            <button
              @click="startPostSessionRepeat('unknown')"
              class="btn btn-outline btn-sm-inline"
            >
              ❌ Только неизученные
            </button>
            <button
              @click="resetPostSessionState"
              class="btn btn-primary btn-sm-inline"
            >
              ✨ Закончить
            </button>
          </div>
        </div>
      </transition>

      <!-- Список всех карточек -->
      <div class="cards-list">
        <h3>📋 Все карточки ({{ cards.length }})</h3>
        <div class="cards-grid">
          <div
            v-for="(card, idx) in cards"
            :key="idx"
            class="mini-card"
            :class="{
              known: cardStatus[idx] === 'known',
              unknown: cardStatus[idx] === 'unknown',
              active: idx === currentIndex,
            }"
            @click="
              currentIndex = idx;
              isFlipped = false;
            "
          >
            <div class="mini-card-num">{{ idx + 1 }}</div>
            <div class="mini-card-text">
              {{ card.question.substring(0, 50) }}...
            </div>
            <div v-if="cardStatus[idx]" class="mini-card-status">
              {{ cardStatus[idx] === "known" ? "✅" : "❌" }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 📚 История сессий (только для авторизованных) -->
    <div v-if="user" class="history-section">
      <div class="history-header">
        <h3>📜 История сессий</h3>
        <button
          v-if="history.length"
          @click="clearHistory"
          class="btn btn-outline btn-small"
        >
          🗑️ Очистить всё
        </button>
      </div>

      <div v-if="loadingHistory" class="loading">Загрузка истории...</div>
      <div v-else-if="!history.length" class="empty-history">
        Пока нет сохранённых сессий
      </div>

      <div v-else class="history-list">
        <div
          v-for="(item, idx) in history"
          :key="item.id || idx"
          class="history-item"
        >
          <div class="history-info">
            <strong>{{ item.title || "Набор карточек" }}</strong>
            <div class="history-meta">
              <span>📅 {{ formatDate(item.timestamp) }}</span>
              <span>✅ {{ item.knownCount }} / {{ item.cardCount }}</span>
            </div>
          </div>
          <div class="history-actions">
            <button
              @click="viewDetails(item)"
              class="btn btn-outline btn-small"
            >
              👁️ Подробнее
            </button>
            <button
              @click="openRepeatModal(item)"
              class="btn btn-outline btn-small"
            >
              🔁 Повторить
            </button>
            <button
              @click="deleteResult(item.id)"
              class="btn btn-outline btn-small btn-danger"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🔍 Модалка с деталями сессии -->
    <transition name="fade">
      <div
        v-if="showDetails && selectedResult"
        class="modal-overlay"
        @click.self="closeDetails"
      >
        <div class="modal">
          <div class="modal-header">
            <h4>📋 Детали сессии</h4>
            <button @click="closeDetails" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-summary">
              Результат: ✅ {{ selectedResult.knownCount }} из
              {{ selectedResult.cardCount }}
              <br />
              <small>{{ formatDate(selectedResult.timestamp) }}</small>
            </div>
            <div
              v-for="(card, i) in selectedResult.cards"
              :key="i"
              class="answer-item"
            >
              <div class="answer-question">
                {{ i + 1 }}. {{ card.question }}
              </div>
              <div class="answer-row" :class="card.status">
                <span class="answer-label">Ваш статус:</span>
                <span class="answer-value">
                  {{
                    card.status === "known"
                      ? "✅ Знаю"
                      : card.status === "unknown"
                        ? "❌ Повторить"
                        : "—"
                  }}
                </span>
              </div>
              <div class="answer-row correct">
                <span class="answer-label">Ответ:</span>
                <span class="answer-value">{{ card.answer }}</span>
              </div>
              <div v-if="card.explanation" class="answer-explanation">
                <strong>📚 Пояснение:</strong> {{ card.explanation }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 🔁 Модалка повторения карточек (из истории) -->
    <transition name="fade">
      <div
        v-if="showRepeatModal && repeatSource"
        class="modal-overlay"
        @click.self="closeRepeatModal"
      >
        <div class="modal">
          <div class="modal-header">
            <h4>🔁 Повторить карточки</h4>
            <button @click="closeRepeatModal" class="modal-close">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p class="modal-hint">
              Выберите карточки для повторения из "{{ repeatSource.title }}":
            </p>

            <div class="repeat-modes">
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="all" />
                <span>📋 Все карточки ({{ repeatSource.cardCount }})</span>
              </label>
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="wrong" />
                <span>❌ Только неизученные ({{ wrongCount }})</span>
              </label>
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="selected" />
                <span>🎯 Выбрать вручную</span>
              </label>
            </div>

            <div v-if="repeatMode === 'selected'" class="manual-selection">
              <div
                v-for="(card, idx) in repeatSource.cards"
                :key="idx"
                class="select-item"
              >
                <label class="select-label">
                  <input
                    type="checkbox"
                    :checked="selectedForRepeat.includes(idx)"
                    @change="toggleRepeatSelection(idx)"
                  />
                  <span :class="{ 'was-unknown': card.status !== 'known' }">
                    {{ idx + 1 }}. {{ truncate(card.question, 60) }}
                    <span v-if="card.status === 'known'" class="correct-badge"
                      >✅</span
                    >
                    <span v-else class="wrong-badge">❌</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeRepeatModal" class="btn btn-outline">
                Отмена
              </button>
              <button @click="startRepeat" class="btn btn-primary">
                🚀 Начать ({{ repeatCount }})
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  doc,
} from "firebase/firestore";

const user = ref(null);
const jsonInput = ref("");
const cards = ref([]);
const currentIndex = ref(0);
const isFlipped = ref(false);
const cardStatus = ref({});

// История
const history = ref([]);
const loadingHistory = ref(false);
const showDetails = ref(false);
const selectedResult = ref(null);

// Повторение из истории
const showRepeatModal = ref(false);
const repeatMode = ref("all");
const selectedForRepeat = ref([]);
const repeatSource = ref(null);

// Пост-сессия: предложение повторить
const sessionCompleted = ref(false);
const showPostSessionRepeat = ref(false);
const lastSessionCards = ref([]);

// === Утилиты ===
const truncate = (str, len) =>
  str.length > len ? str.substring(0, len) + "..." : str;

// 🔧 Убираем undefined из объекта перед сохранением в Firestore
const sanitizeForFirestore = (obj) => {
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
};

const currentCard = computed(() => cards.value[currentIndex.value]);
const progressPercent = computed(() => {
  if (!cards.value.length) return 0;
  const answered = Object.keys(cardStatus.value).length;
  return Math.round((answered / cards.value.length) * 100);
});
const knownCount = computed(
  () => Object.values(cardStatus.value).filter((s) => s === "known").length,
);
const unknownCount = computed(
  () => Object.values(cardStatus.value).filter((s) => s === "unknown").length,
);
const wrongCount = computed(
  () =>
    repeatSource.value?.cards?.filter((c) => c.status !== "known").length || 0,
);

const repeatCount = computed(() => {
  if (!repeatSource.value) return 0;
  if (repeatMode.value === "all") return repeatSource.value.cardCount;
  if (repeatMode.value === "wrong") return wrongCount.value;
  return selectedForRepeat.value.length;
});

const flipCard = () => {
  isFlipped.value = !isFlipped.value;
};
const nextCard = () => {
  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++;
    isFlipped.value = false;
  }
};
const prevCard = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    isFlipped.value = false;
  }
};
const markKnown = () => {
  cardStatus.value[currentIndex.value] = "known";
  nextCard();
};
const markUnknown = () => {
  cardStatus.value[currentIndex.value] = "unknown";
  nextCard();
};
const shuffleCards = () => {
  cards.value = cards.value.sort(() => Math.random() - 0.5);
  currentIndex.value = 0;
  isFlipped.value = false;
};
const resetProgress = () => {
  cardStatus.value = {};
  currentIndex.value = 0;
  isFlipped.value = false;
};

const loadFromJson = () => {
  try {
    const data = JSON.parse(jsonInput.value);
    if (!Array.isArray(data)) throw new Error("Должен быть массив");
    cards.value = data
      .map((item) => ({
        question: item.question || item.q || item.front || "",
        answer: item.answer || item.a || item.back || item.correct_answer || "",
        explanation: item.explanation || "",
      }))
      .filter((card) => card.question && card.answer);
    if (!cards.value.length) throw new Error("Нет валидных карточек");
    cardStatus.value = {};
    currentIndex.value = 0;
    isFlipped.value = false;
    sessionCompleted.value = false;
    resetPostSessionState();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
};

const fillExample = () => {
  jsonInput.value = JSON.stringify(
    [
      {
        question: "Что такое дзета-потенциал?",
        answer:
          "Электростатический потенциал на границе скольжения частицы в дисперсной системе",
        explanation: "Характеризует устойчивость коллоидных систем",
      },
      {
        question: "Формула для расчета дисперсности (D)?",
        answer: "D = 6 / (ρ × Sуд)",
        explanation: "где ρ — плотность, Sуд — удельная поверхность",
      },
      {
        question: "Уравнение изотермы адсорбции Гиббса",
        answer: "Γ = -(C/RT) × (dσ/dC)",
        explanation: "Γ — адсорбция, σ — поверхностное натяжение",
      },
    ],
    null,
    2,
  );
};

// === Сохранение сессии ===
const saveSession = async () => {
  if (!user.value || !cards.value.length) return;

  const sessionData = sanitizeForFirestore({
    userId: user.value.uid,
    cardCount: cards.value.length,
    knownCount: knownCount.value,
    unknownCount: unknownCount.value,
    title: cards.value[0]?.question?.substring(0, 50) + "...",
    cards: cards.value.map((card, idx) =>
      sanitizeForFirestore({
        question: card.question,
        answer: card.answer,
        explanation: card.explanation || null,
        status: cardStatus.value[idx] || null,
      }),
    ),
    timestamp: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, "flashcardSessions"), sessionData);
    loadHistory();
  } catch (err) {
    console.error("Ошибка сохранения:", err);
    alert("Не удалось сохранить: " + err.message);
  }
};

// === История ===
const loadHistory = async () => {
  if (!user.value) return;
  loadingHistory.value = true;
  try {
    const q = query(
      collection(db, "flashcardSessions"),
      where("userId", "==", user.value.uid),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const snapshot = await getDocs(q);
    history.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Ошибка загрузки истории:", err);
    // Не показываем алерт, чтобы не спамить пользователя
  } finally {
    loadingHistory.value = false;
  }
};

// === Модалки ===
const viewDetails = (item) => {
  selectedResult.value = item;
  showDetails.value = true;
};
const closeDetails = () => {
  showDetails.value = false;
  selectedResult.value = null;
};

const openRepeatModal = (result) => {
  repeatSource.value = result;
  repeatMode.value = "all";
  selectedForRepeat.value = [];
  showRepeatModal.value = true;
};
const closeRepeatModal = () => {
  showRepeatModal.value = false;
  repeatSource.value = null;
};
const toggleRepeatSelection = (idx) => {
  const i = selectedForRepeat.value.indexOf(idx);
  if (i === -1) selectedForRepeat.value.push(idx);
  else selectedForRepeat.value.splice(i, 1);
};

const startRepeat = () => {
  if (!repeatSource.value) return;

  const buildCard = (c) => ({
    question: c.question,
    answer: c.answer,
    explanation: c.explanation || null,
  });

  let cardsToRepeat = [];
  if (repeatMode.value === "all") {
    cardsToRepeat = repeatSource.value.cards.map(buildCard);
  } else if (repeatMode.value === "wrong") {
    cardsToRepeat = repeatSource.value.cards
      .filter((c) => c.status !== "known")
      .map(buildCard);
  } else if (repeatMode.value === "selected") {
    cardsToRepeat = selectedForRepeat.value.map((idx) =>
      buildCard(repeatSource.value.cards[idx]),
    );
  }

  if (cardsToRepeat.length === 0) {
    alert("⚠️ Нет карточек для повторения");
    return;
  }

  cards.value = cardsToRepeat;
  cardStatus.value = {};
  currentIndex.value = 0;
  isFlipped.value = false;
  sessionCompleted.value = false;
  closeRepeatModal();
  window.scrollTo({ top: 0, behavior: "auto" });
};

// === Пост-сессия: предложение повторить ===
const resetPostSessionState = () => {
  showPostSessionRepeat.value = false;
  lastSessionCards.value = [];
  sessionCompleted.value = false;
};

const closePostSessionRepeat = () => {
  showPostSessionRepeat.value = false;
};

const startPostSessionRepeat = (mode) => {
  if (!lastSessionCards.value.length) return;

  const buildCard = (c) => ({
    question: c.question,
    answer: c.answer,
    explanation: c.explanation || null,
  });

  let cardsToRepeat = [];
  if (mode === "all") {
    cardsToRepeat = lastSessionCards.value.map(buildCard);
  } else if (mode === "unknown") {
    cardsToRepeat = lastSessionCards.value
      .filter((c, idx) => cardStatus.value[idx] !== "known")
      .map(buildCard);
  }

  if (cardsToRepeat.length === 0) {
    alert("🎉 Отлично! Все карточки изучены!");
    resetPostSessionState();
    return;
  }

  cards.value = cardsToRepeat;
  cardStatus.value = {};
  currentIndex.value = 0;
  isFlipped.value = false;
  sessionCompleted.value = false;
  closePostSessionRepeat();
  window.scrollTo({ top: 0, behavior: "auto" });
};

// === Удаление ===
const deleteResult = async (id) => {
  if (!confirm("Удалить эту сессию?")) return;
  try {
    await deleteDoc(doc(db, "flashcardSessions", id));
    history.value = history.value.filter((h) => h.id !== id);
  } catch (err) {
    console.error("Ошибка удаления:", err);
    alert("Не удалось удалить");
  }
};

const clearHistory = async () => {
  if (!confirm("Удалить ВСЮ историю карточек?")) return;
  try {
    const batch = writeBatch(db);
    history.value.forEach((item) => {
      if (item.id) batch.delete(doc(db, "flashcardSessions", item.id));
    });
    await batch.commit();
    history.value = [];
  } catch (err) {
    console.error("Ошибка очистки:", err);
    alert("Не удалось очистить историю");
  }
};

const formatDate = (ts) => {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// === Завершение сессии ===
const completeSession = async () => {
  sessionCompleted.value = true;

  // Сохраняем карточки для возможного повторения
  lastSessionCards.value = cards.value.map((card, idx) => ({
    question: card.question,
    answer: card.answer,
    explanation: card.explanation || null,
    status: cardStatus.value[idx] || null,
  }));

  // Автосохранение если пользователь авторизован
  if (
    user.value &&
    cards.value.length &&
    Object.keys(cardStatus.value).length > 0
  ) {
    await saveSession();
  }

  showPostSessionRepeat.value = true;
};

// === Горячие клавиши ===
const handleKeyPress = (e) => {
  if (!cards.value.length || sessionCompleted.value) return;

  switch (e.key) {
    case " ":
      e.preventDefault();
      flipCard();
      break;
    case "ArrowRight":
      if (isFlipped.value) markKnown();
      else nextCard();
      break;
    case "ArrowLeft":
      if (isFlipped.value) markUnknown();
      else prevCard();
      break;
    case "ArrowUp":
    case "ArrowDown":
      e.preventDefault();
      flipCard();
      break;
    case "Enter":
      if (isFlipped.value && currentIndex.value === cards.value.length - 1) {
        completeSession();
      }
      break;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyPress);
  onAuthStateChanged(auth, (u) => {
    user.value = u;
    if (u) loadHistory();
  });
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyPress);
});
</script>

<style scoped>
/* === Базовые стили === */
.flashcards-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  color: var(--text-primary);
}
.user-bar {
  text-align: right;
  margin-bottom: 15px;
  color: var(--text-secondary);
  font-size: 0.9em;
}

/* Setup */
.setup-section {
  margin-top: 40px;
}
.json-input {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
.json-input h3 {
  margin-top: 0;
  color: var(--text-primary);
}
.json-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  background: var(--input-bg);
  color: var(--text-primary);
  resize: vertical;
  box-sizing: border-box;
}
.json-input textarea:focus {
  outline: none;
  border-color: var(--border-focus);
}
.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
.hint {
  display: block;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.85em;
}
.hint code {
  background: var(--code-bg);
  padding: 2px 5px;
  border-radius: 3px;
}

/* Контейнер карточек */
.flashcards-container {
  margin-top: 20px;
}

/* Прогресс */
.progress-header {
  margin-bottom: 30px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}
.progress-percent {
  color: #42b983;
  font-weight: bold;
}
.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #3aa876);
  transition: width 0.3s ease;
}
.stats {
  display: flex;
  gap: 20px;
  justify-content: center;
}
.stat {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9em;
}
.stat.known {
  background: var(--success-bg);
  color: var(--success-text);
}
.stat.unknown {
  background: var(--error-bg);
  color: var(--error-text);
}

/* 3D Карточка */
.flashcard-wrapper {
  perspective: 1000px;
  margin: 40px auto;
  max-width: 600px;
  height: 350px;
}
.flashcard {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.flashcard.is-flipped {
  transform: rotateY(180deg);
}
.flashcard-front,
.flashcard-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 8px 32px var(--shadow);
}
.flashcard-back {
  transform: rotateY(180deg);
  background: var(--bg-secondary);
}
.card-label {
  position: absolute;
  top: 15px;
  left: 20px;
  font-size: 0.85em;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.card-content {
  font-size: 1.4em;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-primary);
}
.card-hint {
  position: absolute;
  bottom: 15px;
  font-size: 0.85em;
  color: var(--text-muted);
}
.card-explanation {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  font-size: 0.95em;
  color: var(--text-secondary);
  text-align: left;
  line-height: 1.5;
}

/* Управление */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 30px 0;
  flex-wrap: wrap;
}
.mode-buttons {
  display: flex;
  gap: 10px;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--border-focus);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-primary {
  background: #42b983;
  color: #fff;
  border-color: #42b983;
}
.btn-primary:hover:not(:disabled) {
  background: #3aa876;
}
.btn-success {
  background: #28a745;
  color: #fff;
  border-color: #28a745;
}
.btn-danger {
  background: #dc3545;
  color: #fff;
  border-color: #dc3545;
}
.btn-large {
  padding: 14px 28px;
  font-size: 16px;
}
.btn-nav {
  min-width: 100px;
}
.extra-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}

/* 🔁 Пост-сессия: предложение повторить (INLINE) */
.post-session-repeat-inline {
  margin-top: 20px;
  padding: 15px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-align: center;
  animation: fadeInSlide 0.3s ease;
}
.repeat-hint {
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.repeat-buttons-inline {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.btn-sm-inline {
  padding: 8px 14px;
  font-size: 14px;
  white-space: nowrap;
}
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Список карточек */
.cards-list {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid var(--border-color);
}
.cards-list h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.mini-card {
  padding: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.mini-card:hover {
  border-color: var(--border-focus);
  transform: translateY(-2px);
}
.mini-card.active {
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2);
}
.mini-card.known {
  border-color: #28a745;
  background: var(--success-bg);
}
.mini-card.unknown {
  border-color: #dc3545;
  background: var(--error-bg);
}
.mini-card-num {
  font-weight: bold;
  color: var(--text-muted);
  font-size: 0.85em;
  margin-bottom: 5px;
}
.mini-card-text {
  font-size: 0.9em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini-card-status {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 1.2em;
}

/* История */
.history-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid var(--border-color);
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.history-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: var(--text-primary);
}
.loading,
.empty-history {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
  font-style: italic;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.history-info {
  flex: 1;
}
.history-info strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
}
.history-meta {
  font-size: 0.85em;
  color: var(--text-secondary);
  display: flex;
  gap: 15px;
}
.history-actions {
  display: flex;
  gap: 8px;
}

/* Модалка */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: var(--bg-card);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px var(--shadow);
  color: var(--text-primary);
}
.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: var(--bg-card);
  border-radius: 12px 12px 0 0;
}
.modal-header h4 {
  margin: 0;
  font-size: 1.1em;
}
.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}
.modal-close:hover {
  color: var(--text-primary);
}
.modal-body {
  padding: 20px;
}
.modal-summary {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
  color: var(--text-primary);
}
.modal-hint {
  color: var(--text-secondary);
  margin-bottom: 15px;
}
.answer-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--bg-primary);
}
.answer-question {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 0.95em;
  color: var(--text-primary);
}
.answer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.9em;
}
.answer-row.known {
  background: var(--success-bg);
  color: var(--success-text);
}
.answer-row.unknown {
  background: var(--error-bg);
  color: var(--error-text);
}
.answer-label {
  font-weight: 500;
  min-width: 90px;
}
.answer-value {
  flex: 1;
}
.answer-explanation {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
  font-size: 0.9em;
  color: var(--text-secondary);
}

/* Повторение из истории */
.repeat-modes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 15px 0;
}
.mode-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-option:hover {
  border-color: var(--border-focus);
  background: var(--hover-bg);
}
.mode-option input[type="radio"] {
  transform: scale(1.2);
}
.manual-selection {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin: 15px 0;
}
.select-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}
.select-item:last-child {
  border-bottom: none;
}
.select-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  color: var(--text-primary);
}
.select-label input[type="checkbox"] {
  margin-top: 3px;
  transform: scale(1.1);
}
.select-label span {
  flex: 1;
  font-size: 0.95em;
}
.was-unknown {
  color: var(--error-text);
}
.wrong-badge,
.correct-badge {
  margin-left: 8px;
  font-size: 0.9em;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Анимации */
.fade-enter-active,
.fade-leave-active,
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to,
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .flashcard-wrapper {
    height: 300px;
  }
  .card-content {
    font-size: 1.2em;
  }
  .controls {
    flex-direction: column;
  }
  .mode-buttons {
    width: 100%;
    justify-content: center;
  }
  .cards-grid {
    grid-template-columns: 1fr;
  }
  .history-actions {
    flex-direction: column;
  }
  .modal-actions {
    flex-direction: column;
  }
  .btn {
    width: 100%;
  }
  .repeat-buttons-inline {
    flex-direction: column;
  }
  .btn-sm-inline {
    width: 100%;
  }
}
</style>
