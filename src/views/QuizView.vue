<template>
  <div class="card">
    <h1>📝 Тестирование</h1>

    <!-- 🔐 Инфо о пользователе -->
    <div v-if="user" class="user-bar">
      <span>👤 {{ user.displayName || user.email }}</span>
    </div>

    <!-- Ввод JSON -->
    <div class="json-input">
      <div class="json-input-header">
        <textarea
          v-model="jsonInput"
          placeholder='[{"question": "Столица России?", "type": "text", "correct_answer": "Москва"}]'
        ></textarea>

        <!-- Кнопки управления полем -->
        <div class="json-actions">
          <button
            @click="clearJsonInput"
            class="json-action-btn"
            title="Очистить поле"
            :disabled="!jsonInput.trim()"
          >
            🗑️ Очистить
          </button>
          <button
            @click="copyJsonInput"
            class="json-action-btn"
            title="Копировать в буфер"
            :disabled="!jsonInput.trim()"
          >
            {{ copied ? "✓ Скопировано!" : "📋 Копировать" }}
          </button>
        </div>
      </div>

      <div class="btn-row">
        <button @click="loadFromJson" class="btn btn-primary">
          🚀 Загрузить тест
        </button>
        <button @click="fillExample" class="btn btn-outline">
          📄 Пример JSON
        </button>
      </div>
      <small class="json-hint">
        Поддерживаемые типы вопросов:<br />
        • <code>"type": "text"</code> — свободный ответ<br />
        • <code>"type": "multiple"</code> — один вариант (радио)<br />
        • <code>"type": "checkbox"</code> — несколько вариантов (чекбоксы)<br />
        • <code>"type": "boolean"</code> — Истина/Ложь<br />
        • <code>"type": "matching"</code> — Соответсвие
      </small>
    </div>

    <!-- Текущий тест -->
    <div v-if="questions.length" class="questions">
      <div
        v-for="(q, i) in questions"
        :key="i"
        :ref="(el) => (questionRefs[i] = el)"
        class="q-card"
        :class="{ unanswered: !done && !isAnswered(i) }"
      >
        <div class="q-header">
          <div class="q-title">{{ i + 1 }}. {{ q.question }}</div>
          <span v-if="!done && !isAnswered(i)" class="unanswered-badge">
            ⚠️ Не отвечено
          </span>
          <span v-if="done && !isAnswered(i)" class="unanswered-badge done">
            ❌ Пропущено
          </span>
        </div>

        <!-- Варианты ответа: множественный выбор (один правильный) -->
        <template v-if="q.type === 'multiple'">
          <label
            v-for="key in getOptionKeys(q)"
            :key="key"
            class="opt"
            :class="{
              correct: done && q.correct_answer === key,
              wrong: done && answers[i] === key && q.correct_answer !== key,
            }"
          >
            <input
              type="radio"
              :name="'q' + i"
              :value="key"
              v-model="answers[i]"
              :disabled="done"
            />
            {{ q[key] || key }}
          </label>
        </template>

        <!-- Варианты ответа: множественный выбор (несколько правильных) -->
        <template v-else-if="q.type === 'checkbox'">
          <label
            v-for="key in getOptionKeys(q)"
            :key="key"
            class="opt"
            :class="{
              correct:
                done &&
                Array.isArray(q.correct_answer) &&
                q.correct_answer.includes(key),
              wrong:
                done &&
                Array.isArray(answers[i]) &&
                answers[i].includes(key) &&
                !q.correct_answer?.includes(key),
            }"
          >
            <input
              type="checkbox"
              :name="'q' + i + '-' + key"
              :value="key"
              v-model="answers[i]"
              :disabled="done"
            />
            {{ q[key] || key }}
          </label>
        </template>

        <!-- Варианты ответа: Истина/Ложь -->
        <template v-else-if="q.type === 'boolean'">
          <select
            v-model="answers[i]"
            :disabled="done"
            class="matching-select"
            style="margin-bottom: 10px"
          >
            <option value="" disabled>Выберите ответ...</option>
            <option value="true">✅ Истина</option>
            <option value="false">❌ Ложь</option>
          </select>
        </template>
        <!-- Вопросы на соответствие -->
        <template v-else-if="q.type === 'matching'">
          <div class="matching-container">
            <div class="matching-instruction">
              💡 Выберите соответствия из выпадающих списков
            </div>

            <div class="matching-connections">
              <div
                v-for="leftItem in q.leftColumn || Object.keys(q.pairs)"
                :key="leftItem"
                class="matching-row"
              >
                <div class="matching-left">{{ leftItem }}</div>

                <!-- ✅ Гарантируем реактивность объекта answers[i] -->
                <select
                  v-model="answers[i][leftItem]"
                  :disabled="done"
                  class="matching-select"
                >
                  <option value="" disabled>Выберите ответ...</option>
                  <option
                    v-for="rightItem in q.rightColumn"
                    :key="rightItem"
                    :value="rightItem"
                  >
                    {{ rightItem }}
                  </option>
                </select>

                <!-- Кнопка быстрого сброса -->
                <button
                  v-if="answers[i]?.[leftItem] && !done"
                  @click="answers[i][leftItem] = ''"
                  class="matching-clear"
                  title="Очистить"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </template>
        <!-- Текстовый ответ -->
        <template v-else>
          <input
            v-model="answers[i]"
            type="text"
            :disabled="done"
            placeholder="Введите ответ..."
            class="text-answer-input"
            :class="{
              'input-correct': done && checkTextAnswer(q, answers[i]).isCorrect,
              'input-wrong':
                done &&
                !checkTextAnswer(q, answers[i]).isCorrect &&
                answers[i]?.trim(),
            }"
          />
          <!-- Предупреждение под полем -->
          <div
            v-if="done && checkTextAnswer(q, answers[i]).warning"
            class="answer-warning"
          >
            ⚠️ {{ checkTextAnswer(q, answers[i]).warning }}
          </div>
        </template>

        <!-- Результат после завершения -->
        <div v-if="done" class="res">
          <span v-if="isAnswerCorrect(i)" class="ok">✓ Верно</span>
          <span v-else class="err">
            ✗ Неверно.
            <template v-if="q.type === 'text'">
              Правильный: <strong>{{ q.correct_answer }}</strong>
            </template>
            <template v-else> Правильный: {{ q[q.correct_answer] }} </template>
          </span>
          <!-- Показываем предупреждение и при верном ответе -->
          <span
            v-if="checkTextAnswer(q, answers[i]).warning"
            class="warning-note"
          >
            • {{ checkTextAnswer(q, answers[i]).warning }}
          </span>
        </div>
      </div>

      <!-- Кнопки завершения теста -->
      <div class="submit-buttons">
        <button @click="submit" :disabled="done" class="btn btn-primary full">
          {{ done ? "Готово" : "✅ Подтвердить все" }}
        </button>

        <button
          v-if="!done && unansweredCount > 0"
          @click="submitIncomplete"
          class="btn btn-outline full mt-1"
          :title="`Завершить с ${unansweredCount} неотвеченными`"
        >
          ⏭ Завершить как есть ({{ unansweredCount }} пропущено)
        </button>
      </div>

      <div v-if="done" class="score">
        🎯 {{ correct }} / {{ questions.length }}
      </div>

      <!-- 🔁 Пост-тестовое предложение повторить (INLINE) -->
      <transition name="fade-slide">
        <div v-if="done && showPostTestRepeat" class="post-test-repeat-inline">
          <div class="repeat-hint">🎯 Хотите повторить?</div>
          <div class="repeat-buttons-inline">
            <button
              @click="startPostTestRepeat('all')"
              class="btn btn-outline btn-sm-inline"
            >
              📋 Все вопросы
            </button>
            <button
              @click="startPostTestRepeat('wrong')"
              class="btn btn-outline btn-sm-inline"
            >
              ❌ Только неправильные
            </button>
            <button
              @click="resetPostTestState"
              class="btn btn-primary btn-sm-inline"
            >
              ✨ Закончить
            </button>
          </div>
        </div>
      </transition>

      <!-- Подсказка о неотвеченных -->
      <div v-if="!done && unansweredCount > 0" class="unanswered-hint">
        ⚠️ Осталось ответить на вопросов: <strong>{{ unansweredCount }}</strong>
      </div>
    </div>

    <!-- 📚 История тестов (только для авторизованных) -->
    <div v-if="user" class="history-section">
      <div class="history-header">
        <h3>📜 История прохождений</h3>
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
        Пока нет сохранённых результатов
      </div>

      <div v-else class="history-list">
        <div
          v-for="(item, idx) in history"
          :key="item.id || idx"
          class="history-item"
        >
          <div class="history-info">
            <strong>{{ item.quizTitle || "Тест" }}</strong>
            <div class="history-meta">
              <span>📅 {{ formatDate(item.timestamp) }}</span>
              <span>🎯 {{ item.score }} / {{ item.total }}</span>
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

    <!-- 🔍 Модалка с деталями теста -->
    <transition name="fade">
      <div
        v-if="showDetails && selectedResult"
        class="modal-overlay"
        @click.self="closeDetails"
      >
        <div class="modal">
          <div class="modal-header">
            <h4>📋 Детали прохождения</h4>
            <button @click="closeDetails" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-summary">
              Результат:
              <strong
                >{{ selectedResult.score }} из
                {{ selectedResult.total }}</strong
              >
              <br />
              <small>{{ formatDate(selectedResult.timestamp) }}</small>
            </div>
            <div
              v-for="(ans, i) in selectedResult.answers"
              :key="i"
              class="answer-item"
            >
              <div class="answer-question">{{ i + 1 }}. {{ ans.q }}</div>
              <div
                class="answer-row"
                :class="{
                  correct: ans.isCorrect && !ans.warning,
                  warning: ans.isCorrect && ans.warning,
                  wrong: !ans.isCorrect,
                }"
              >
                <span class="answer-label">Ваш ответ:</span>
                <span class="answer-value">{{ ans.userAnswer || "—" }}</span>
                <span v-if="ans.isCorrect && !ans.warning" class="answer-mark"
                  >✓</span
                >
                <span v-if="ans.isCorrect && ans.warning" class="answer-mark"
                  >✓⚠️</span
                >
                <span v-if="!ans.isCorrect" class="answer-mark">✗</span>
              </div>
              <div v-if="ans.warning" class="answer-warning-detail">
                {{ ans.warning }}
              </div>
              <div v-if="!ans.isCorrect" class="answer-row correct">
                <span class="answer-label">Правильный:</span>
                <span class="answer-value">{{ ans.correctAnswer }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 🔁 Модалка повторения теста (из истории) -->
    <transition name="fade">
      <div
        v-if="showRepeatModal && repeatSource"
        class="modal-overlay"
        @click.self="closeRepeatModal"
      >
        <div class="modal">
          <div class="modal-header">
            <h4>🔁 Повторить тест</h4>
            <button @click="closeRepeatModal" class="modal-close">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p class="modal-hint">
              Выберите вопросы для повторения из "{{ repeatSource.quizTitle }}":
            </p>
            <div class="repeat-modes">
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="all" />
                <span>📋 Все вопросы ({{ repeatSource.total }})</span>
              </label>
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="wrong" />
                <span>❌ Только неправильные ({{ wrongCount }})</span>
              </label>
              <label class="mode-option">
                <input type="radio" v-model="repeatMode" value="selected" />
                <span>🎯 Выбрать вручную</span>
              </label>
            </div>
            <div v-if="repeatMode === 'selected'" class="manual-selection">
              <div
                v-for="(ans, idx) in repeatSource.answers"
                :key="idx"
                class="select-item"
              >
                <label class="select-label">
                  <input
                    type="checkbox"
                    :checked="selectedForRepeat.includes(idx)"
                    @change="toggleRepeatSelection(idx)"
                  />
                  <span :class="{ 'was-wrong': !ans.isCorrect }">
                    {{ idx + 1 }}. {{ truncate(ans.q, 60) }}
                    <span v-if="!ans.isCorrect" class="wrong-badge">❌</span>
                    <span v-else class="correct-badge">✅</span>
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
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { auth, db } from "../firebase.js";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
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

const jsonInput = ref("");
const questions = ref([]);
const answers = ref([]);
const done = ref(false);
const optionKeys = ["value_1", "value_2", "value_3", "value_4"];
const user = ref(null);
const questionRefs = ref([]);

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

// Пост-тестовое предложение повторить
const showPostTestRepeat = ref(false);
const lastTestAnswers = ref([]);
// Состояние для обратной связи при копировании
const copied = ref(false);
// 🔧 Очистка поля JSON
const clearJsonInput = () => {
  jsonInput.value = "";
};
// 🔧 Копирование содержимого в буфер обмена
const copyJsonInput = async () => {
  if (!jsonInput.value.trim()) return;

  try {
    await navigator.clipboard.writeText(jsonInput.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    // Fallback для старых браузеров
    const textarea = document.createElement("textarea");
    textarea.value = jsonInput.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
};
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

const normalizeText = (text) => {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/, "");
};

const checkSpecialCase = (correctAnswer, userAnswer) => {
  const normalizedCorrect = normalizeText(correctAnswer);
  const normalizedUser = normalizeText(userAnswer);
  const specialRules = [
    {
      correct: "дзета-потенциал",
      variant: "дзета потенциал",
      message: "Правильно пишется через дефис: дзета-потенциал",
    },
  ];
  for (const rule of specialRules) {
    if (
      normalizedCorrect === normalizeText(rule.correct) &&
      normalizedUser === normalizeText(rule.variant)
    ) {
      return { isCorrect: true, warning: rule.message };
    }
  }
  return { isCorrect: normalizedCorrect === normalizedUser, warning: null };
};

const checkTextAnswer = (question, userAnswer) => {
  if (question.type !== "text") return { isCorrect: false, warning: null };
  return checkSpecialCase(question.correct_answer, userAnswer);
};

// === Вычисляемые свойства ===
const unansweredCount = computed(
  () => questions.value.filter((_, i) => !isAnswered(i)).length,
);
const allAnswered = computed(() => unansweredCount.value === 0);
const wrongCount = computed(
  () => repeatSource.value?.answers?.filter((a) => !a.isCorrect).length || 0,
);
const repeatCount = computed(() => {
  if (!repeatSource.value) return 0;
  if (repeatMode.value === "all") return repeatSource.value.total;
  if (repeatMode.value === "wrong") return wrongCount.value;
  return selectedForRepeat.value.length;
});

const correct = computed(() => {
  if (!done.value) return 0;

  return questions.value.reduce((score, q, i) => {
    const answer = answers.value[i];

    if (q.type === "text") {
      return score + (checkTextAnswer(q, answer).isCorrect ? 1 : 0);
    }
    if (q.type === "boolean") {
      return score + (answer === q.correct_answer ? 1 : 0);
    }
    if (q.type === "checkbox") {
      return (
        score + (isCheckboxAnswerCorrect(answer, q.correct_answer) ? 1 : 0)
      );
    }
    // multiple (по умолчанию)
    return score + (answer === q.correct_answer ? 1 : 0);
  }, 0);
});
// === Получить доступные ключи вариантов ответа из вопроса ===
const getOptionKeys = (question) => {
  // Для checkbox и multiple собираем все value_N, которые есть в вопросе
  if (question.type === "checkbox" || question.type === "multiple") {
    const keys = [];
    let i = 1;
    // Собираем ключи, пока они существуют в объекте вопроса (макс. 10)
    while (question[`value_${i}`] !== undefined && i <= 10) {
      keys.push(`value_${i}`);
      i++;
    }
    return keys;
  }
  // Для остальных типов возвращаем стандартные 4 ключа
  return optionKeys;
};
// === Функция для выбора соответствия ===
const selectMatching = (questionIndex, rightValue) => {
  if (!answers.value[questionIndex]) {
    answers.value[questionIndex] = {};
  }

  // Находим первый невыбранный элемент из левой колонки
  const q = questions.value[questionIndex];
  const leftColumn = q.leftColumn || Object.keys(q.pairs || {});

  for (const leftItem of leftColumn) {
    if (!answers.value[questionIndex][leftItem]) {
      answers.value[questionIndex][leftItem] = rightValue;
      break;
    }
  }
};
// === Функция для проверки соответствий ===
const isMatchingCorrect = (userAnswer, correctPairs) => {
  if (!userAnswer || typeof userAnswer !== "object") return false;

  // Проверяем все пары
  for (const [left, right] of Object.entries(correctPairs)) {
    if (userAnswer[left] !== right) {
      return false;
    }
  }
  return true;
};
const isAnswered = (index) => {
  const q = questions.value[index];
  const a = answers.value[index];

  if (!q) return false;

  if (q.type === "text") {
    return a !== null && a !== undefined && String(a).trim() !== "";
  }
  if (q.type === "checkbox") {
    return Array.isArray(a) && a.length > 0;
  }
  if (q.type === "boolean") {
    return a === "true" || a === "false";
  }
  if (q.type === "matching") {
    if (!a || typeof a !== "object") return false;
    const leftColumn = q.leftColumn || Object.keys(q.pairs || {});
    return leftColumn.every((left) => {
      const val = a[left];
      // ✅ Пустая строка "" = не отвечено
      return val !== "" && val !== null && val !== undefined;
    });
  }
  // multiple (по умолчанию)
  return a !== null && a !== undefined;
};
// === Проверка ответа для checkbox (несколько правильных) ===
const isCheckboxAnswerCorrect = (userAnswer, correctAnswer) => {
  if (!Array.isArray(correctAnswer)) return false;
  if (!Array.isArray(userAnswer)) return false;

  // Сортируем для сравнения
  const userSorted = [...userAnswer].sort();
  const correctSorted = [...correctAnswer].sort();

  // Проверяем точное совпадение массивов
  return (
    userSorted.length === correctSorted.length &&
    userSorted.every((val, idx) => val === correctSorted[idx])
  );
};

const isAnswerCorrect = (index) => {
  const q = questions.value[index];
  const a = answers.value[index];

  if (!q || a === null) return false;

  if (q.type === "text") {
    return checkTextAnswer(q, a).isCorrect;
  }
  if (q.type === "boolean") {
    return a === q.correct_answer;
  }
  if (q.type === "checkbox") {
    return isCheckboxAnswerCorrect(a, q.correct_answer);
  }
  if (q.type === "matching") {
    return isMatchingCorrect(a, q.pairs);
  }
  // multiple (по умолчанию)
  return a === q.correct_answer;
};

// === Прокрутка к неотвеченному ===
const scrollToUnanswered = async () => {
  const idx = answers.value.findIndex((_, i) => !isAnswered(i));
  if (idx === -1) return;
  questionRefs.value = [];
  await nextTick();
  const el = questionRefs.value[idx];
  if (!el) return;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    el.scrollIntoView({ behavior: "auto", block: "center" });
    el.style.outline = "2px solid #ffa726";
    setTimeout(() => {
      el.style.outline = "";
    }, 1500);
  } else {
    el.classList.add("highlight-unanswered");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.classList.remove("highlight-unanswered"), 2000);
  }
};

// === Загрузка из JSON ===
const loadFromJson = () => {
  try {
    const data = JSON.parse(jsonInput.value);
    if (!Array.isArray(data)) throw new Error("Массив [...]");

    questions.value = data.map((q) => ({
      ...q,
      type: q.type || (q.value_1 ? "multiple" : "text"),
    }));

    answers.value = questions.value.map((q) => {
      if (q.type === "text") return "";
      if (q.type === "checkbox") return [];
      if (q.type === "matching") {
        const leftColumn = q.leftColumn || Object.keys(q.pairs || {});
        const initial = {};
        for (const left of leftColumn) {
          initial[left] = "";
        }
        return initial;
      }
      if (q.type === "boolean") return "";
      return null;
    });

    done.value = false;
    questionRefs.value = [];
    resetPostTestState();

    // ✅ Прокрутка к тесту
    nextTick(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  } catch (e) {
    console.error("Ошибка парсинга JSON:", e);
    alert("Ошибка парсинга JSON: " + e.message);
  }
};

const fillExample = () => {
  jsonInput.value = JSON.stringify(
    [
      {
        question: "Что такое дзета-потенциал?",
        type: "text",
        correct_answer: "дзета-потенциал",
      },
      {
        question: "Сколько будет 2 + 2?",
        type: "multiple",
        value_1: "3",
        value_2: "4",
        value_3: "5",
        value_4: "6",
        correct_answer: "value_2",
      },
      {
        question: "Выберите ПАВ из списка:",
        type: "checkbox",
        value_1: "Мыло",
        value_2: "Сахар",
        value_3: "Спирт",
        value_4: "Соль",
        correct_answer: ["value_1", "value_3"],
      },
      {
        question:
          "Для ПАВ поверхностное натяжение убывает с ростом концентрации",
        type: "boolean",
        correct_answer: "true",
      },
      // 🔥 Вопрос на соответствие
      {
        question:
          "Установите соответствие: в какой среде образуются прямые мицеллы, а в какой обратные",
        type: "matching",
        pairs: {
          "обратные мицеллы": "неполярная среда",
          "прямые мицеллы": "полярная среда",
        },
        leftColumn: ["обратные мицеллы", "прямые мицеллы"],
        rightColumn: [
          "неполярная среда",
          "полярная среда",
          "вакуум",
          "газовая среда",
        ],
      },
    ],
    null,
    2,
  );
};
// === Отправка теста ===
const submit = async () => {
  if (!allAnswered.value) {
    await scrollToUnanswered();
    return;
  }
  done.value = true;

  // Формируем данные для сохранения и повторения
  const processedAnswers = answers.value.map((a, i) => {
    const q = questions.value[i];

    // Проверка правильности для разных типов
    let isCorrect = false;
    if (q.type === "text") {
      isCorrect = checkTextAnswer(q, a).isCorrect;
    } else if (q.type === "boolean") {
      isCorrect = a === q.correct_answer;
    } else if (q.type === "checkbox") {
      isCorrect = isCheckboxAnswerCorrect(a, q.correct_answer);
    } else {
      // multiple
      isCorrect = a === q.correct_answer;
    }

    // 🔧 Формируем options
    const options =
      q.type !== "text" && q.type !== "boolean"
        ? [
            q.value_1 ?? null,
            q.value_2 ?? null,
            q.value_3 ?? null,
            q.value_4 ?? null,
          ].filter((v) => v !== undefined)
        : null;

    return sanitizeForFirestore({
      q: q.question,
      type: q.type,
      userAnswer:
        q.type === "text"
          ? a
          : q.type === "checkbox"
            ? Array.isArray(a)
              ? a
              : []
            : q.type === "boolean"
              ? a
              : (q[a] ?? a),
      correctAnswer:
        q.type === "text"
          ? q.correct_answer
          : q.type === "checkbox"
            ? q.correct_answer
            : q.type === "boolean"
              ? q.correct_answer
              : (q[q.correct_answer] ?? null),
      correctAnswerKey:
        q.type === "multiple"
          ? q.correct_answer
          : q.type === "checkbox"
            ? q.correct_answer
            : null,
      isCorrect,
      warning:
        q.type === "text" ? (checkTextAnswer(q, a).warning ?? null) : null,
      options: options?.length ? options : null,
    });
  });

  if (user.value) {
    const resultData = sanitizeForFirestore({
      userId: user.value.uid,
      score: correct.value,
      total: questions.value.length,
      quizTitle: questions.value[0]?.question?.substring(0, 50) + "...",
      answers: processedAnswers,
      timestamp: serverTimestamp(),
    });

    try {
      await addDoc(collection(db, "quizResults"), resultData);
      loadHistory();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Не удалось сохранить результат: " + err.message);
    }
  }

  lastTestAnswers.value = processedAnswers;
  showPostTestRepeat.value = true;
};

// === Завершение теста с неотвеченными вопросами ===
const submitIncomplete = async () => {
  // Показываем предупреждение если много пропущено
  if (unansweredCount.value > questions.value.length / 2) {
    const confirmSkip = confirm(
      `⚠️ Вы пропустили ${unansweredCount.value} из ${questions.value.length} вопросов.\n\n` +
        `Неотвеченные вопросы будут считаться неправильными.\n\n` +
        `Продолжить?`,
    );
    if (!confirmSkip) return;
  }

  done.value = true;

  // Формируем данные (неотвеченные = неправильные)
  const processedAnswers = answers.value.map((a, i) => {
    const q = questions.value[i];

    // Проверка: ответ есть И правильный
    const isAnswered =
      q.type === "text"
        ? a !== null && a !== undefined && String(a).trim() !== ""
        : a !== null && a !== undefined;

    const isCorrect = isAnswered
      ? q.type === "text"
        ? checkTextAnswer(q, a).isCorrect
        : a === q.correct_answer
      : false; // ← Неотвеченные = неправильные

    // 🔧 Формируем options и сохраняем КЛЮЧ правильного ответа
    const options =
      q.type !== "text"
        ? [
            q.value_1 ?? null,
            q.value_2 ?? null,
            q.value_3 ?? null,
            q.value_4 ?? null,
          ].filter((v) => v !== undefined)
        : null;

    return sanitizeForFirestore({
      q: q.question,
      type: q.type,
      userAnswer: isAnswered ? (q.type === "text" ? a : (q[a] ?? a)) : null,
      correctAnswer:
        q.type === "text" ? q.correct_answer : (q[q.correct_answer] ?? null),
      correctAnswerKey: q.type !== "text" ? q.correct_answer : null,
      isCorrect,
      warning:
        q.type === "text" && isAnswered
          ? (checkTextAnswer(q, a).warning ?? null)
          : null,
      options: options?.length ? options : null,
      skipped: !isAnswered, // ← Флаг "пропущено"
    });
  });

  // Сохранение если авторизован
  if (user.value) {
    const resultData = sanitizeForFirestore({
      userId: user.value.uid,
      score: correct.value, // считаем только правильные
      total: questions.value.length,
      quizTitle: questions.value[0]?.question?.substring(0, 50) + "...",
      answers: processedAnswers,
      timestamp: serverTimestamp(),
    });

    try {
      await addDoc(collection(db, "quizResults"), resultData);
      loadHistory();
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Не удалось сохранить результат: " + err.message);
    }
  }

  // Показываем предложение повторить
  lastTestAnswers.value = processedAnswers;
  showPostTestRepeat.value = true;

  // Прокрутка к результатам
  window.scrollTo({ top: 0, behavior: "auto" });
};
// === Пост-тестовое повторение ===
const resetPostTestState = () => {
  showPostTestRepeat.value = false;
  lastTestAnswers.value = [];
};

const closePostTestRepeat = () => {
  showPostTestRepeat.value = false;
};

const startPostTestRepeat = (mode) => {
  if (!lastTestAnswers.value.length) return;

  const buildQuestion = (ans) => {
    const base = {
      question: ans.q,
      type: ans.type,
      correct_answer: ans.correctAnswerKey ?? ans.correctAnswer,
    };

    // Восстанавливаем варианты для multiple/checkbox
    if (
      (ans.type === "multiple" || ans.type === "checkbox") &&
      ans.options?.length
    ) {
      base.value_1 = ans.options[0] ?? null;
      base.value_2 = ans.options[1] ?? null;
      base.value_3 = ans.options[2] ?? null;
      base.value_4 = ans.options[3] ?? null;
    }

    return base;
  };

  let questionsToRepeat = [];
  if (mode === "all") {
    questionsToRepeat = lastTestAnswers.value.map(buildQuestion);
  } else if (mode === "wrong") {
    questionsToRepeat = lastTestAnswers.value
      .filter((a) => !a.isCorrect)
      .map(buildQuestion);
  }

  if (questionsToRepeat.length === 0) {
    alert("🎉 Отлично! Все вопросы отвечены верно!");
    resetPostTestState();
    return;
  }

  questions.value = questionsToRepeat;
  // 🔧 Правильная инициализация ответов
  answers.value = questionsToRepeat.map((q) => {
    if (q.type === "text") return "";
    if (q.type === "checkbox") return [];
    if (q.type === "matching") {
      const leftColumn = q.leftColumn || Object.keys(q.pairs || {});
      const initial = {};
      for (const left of leftColumn) {
        initial[left] = "";
      }
      return initial;
    }
    if (q.type === "boolean") return "";
    return null;
  });
  done.value = false;
  questionRefs.value = [];
  showPostTestRepeat.value = false;
  window.scrollTo({ top: 0, behavior: "auto" });
};

// === История и модалки ===
const loadHistory = async () => {
  if (!user.value) return;
  loadingHistory.value = true;
  try {
    const q = query(
      collection(db, "quizResults"),
      where("userId", "==", user.value.uid),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const snapshot = await getDocs(q);
    history.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Ошибка загрузки истории:", err);
  } finally {
    loadingHistory.value = false;
  }
};

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
  try {
    if (!repeatSource.value) {
      console.error("Нет источника для повторения");
      return;
    }

    const buildQuestion = (ans) => {
      const base = {
        question: ans.q,
        type: ans.type,
        correct_answer: ans.correctAnswerKey ?? ans.correctAnswer,
      };

      // 🔧 Восстанавливаем варианты для multiple/checkbox
      if (
        (ans.type === "multiple" || ans.type === "checkbox") &&
        ans.options?.length
      ) {
        base.value_1 = ans.options[0] ?? null;
        base.value_2 = ans.options[1] ?? null;
        base.value_3 = ans.options[2] ?? null;
        base.value_4 = ans.options[3] ?? null;
      }

      // 🔧 Для boolean
      if (ans.type === "boolean") {
        // correct_answer уже установлен выше
      }

      return base;
    };

    let questionsToRepeat = [];
    if (repeatMode.value === "all") {
      questionsToRepeat = repeatSource.value.answers.map(buildQuestion);
    } else if (repeatMode.value === "wrong") {
      questionsToRepeat = repeatSource.value.answers
        .filter((a) => !a.isCorrect)
        .map(buildQuestion);
    } else if (repeatMode.value === "selected") {
      questionsToRepeat = selectedForRepeat.value.map((idx) =>
        buildQuestion(repeatSource.value.answers[idx]),
      );
    }

    if (questionsToRepeat.length === 0) {
      alert("⚠️ Нет вопросов для повторения");
      return;
    }

    console.log("🔁 Начинаем повтор:", questionsToRepeat.length, "вопросов");

    // ✅ Сначала устанавливаем вопросы
    questions.value = questionsToRepeat;

    // ✅ Инициализируем ответы
    answers.value = questionsToRepeat.map((q) => {
      if (q.type === "text") return "";
      if (q.type === "checkbox") return [];
      if (q.type === "matching") {
        const leftColumn = q.leftColumn || Object.keys(q.pairs || {});
        const initial = {};
        for (const left of leftColumn) {
          initial[left] = "";
        }
        return initial;
      }
      if (q.type === "boolean") return "";
      return null;
    });

    // ✅ Сбрасываем состояние
    done.value = false;
    questionRefs.value = [];
    selectedForRepeat.value = [];

    // ✅ ТОЛЬКО ПОСЛЕ этого закрываем модалку
    closeRepeatModal();

    // ✅ Прокрутка и фокус
    window.scrollTo({ top: 0, behavior: "auto" });

    // ✅ Фокус на первый вопрос (через nextTick)
    nextTick(() => {
      if (questionRefs.value[0]) {
        questionRefs.value[0].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  } catch (error) {
    console.error("❌ Ошибка при повторе теста:", error);
    alert("Произошла ошибка при запуске повторного теста: " + error.message);
    // Возвращаем кнопки в случае ошибки
    closeRepeatModal();
  }
};

const deleteResult = async (id) => {
  if (!confirm("Удалить этот результат?")) return;
  try {
    await deleteDoc(doc(db, "quizResults", id));
    history.value = history.value.filter((h) => h.id !== id);
  } catch (err) {
    console.error("Ошибка удаления:", err);
    alert("Не удалось удалить");
  }
};

const clearHistory = async () => {
  if (!confirm("Удалить ВСЮ историю?")) return;
  try {
    const batch = writeBatch(db);
    history.value.forEach((item) => {
      if (item.id) batch.delete(doc(db, "quizResults", item.id));
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

// === Авторизация ===
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u;
    if (u) loadHistory();
    else {
      history.value = [];
      closeDetails();
      closeRepeatModal();
    }
  });
});
</script>

<style scoped>
/* === Базовые стили === */
.card {
  background: var(--bg-card);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow);
  color: var(--text-primary);
  transition:
    background-color 0.3s,
    color 0.3s;
}
.user-bar {
  text-align: right;
  margin-bottom: 15px;
  color: var(--text-secondary);
  font-size: 0.9em;
}

/* JSON секция */
.json-input {
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
}
.json-input textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: monospace;
  box-sizing: border-box;
  font-size: 13px;
  resize: vertical;
  background: var(--input-bg);
  color: var(--text-primary);
}
.json-input textarea:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}
.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.json-hint {
  display: block;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.85em;
  line-height: 1.4;
}
.json-hint code {
  background: var(--code-bg);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
  color: var(--text-primary);
}

/* Кнопки */
.btn {
  padding: 8px 16px;
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
  opacity: 0.6;
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
.btn-outline {
  background: transparent;
  border: 1px solid var(--text-secondary);
  color: var(--text-secondary);
}
.btn-outline:hover:not(:disabled) {
  background: var(--text-secondary);
  color: var(--bg-primary);
}
.btn-small {
  padding: 6px 12px;
  font-size: 13px;
}
.btn-danger {
  border-color: #dc3545;
  color: #dc3545;
}
.btn-danger:hover {
  background: #dc3545;
  color: #fff;
}
.full {
  width: 100%;
  margin-top: 15px;
}

/* Карточка вопроса */
.q-card {
  border: 2px solid var(--border-color);
  padding: 15px;
  margin: 15px 0 0;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background-color 0.3s;
  background: var(--bg-primary);
}
.q-card.unanswered {
  border-color: var(--unanswered-border);
  background: var(--unanswered-bg);
}
.q-card.unanswered:hover {
  box-shadow: 0 0 0 3px rgba(255, 167, 38, 0.2);
}

@keyframes pulse-unanswered {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 167, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 167, 38, 0);
  }
}
.q-card.highlight-unanswered {
  animation: pulse-unanswered 0.6s ease-out;
  border-color: #ff9800 !important;
}

.q-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.q-title {
  font-weight: 600;
  flex: 1;
  color: var(--text-primary);
}
.unanswered-badge {
  font-size: 0.75em;
  padding: 4px 8px;
  border-radius: 12px;
  background: #ffa726;
  color: #fff;
  font-weight: 500;
  white-space: nowrap;
}
.unanswered-badge.done {
  background: #ef5350;
}

.opt {
  display: block;
  padding: 8px;
  margin: 4px 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.opt:hover {
  background: var(--hover-bg);
}
.opt.correct {
  background: var(--success-bg);
  border-color: #28a745;
  color: var(--success-text);
}
.opt.wrong {
  background: var(--error-bg);
  border-color: #dc3545;
  color: var(--error-text);
}

.text-answer-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}
.text-answer-input:focus {
  outline: none;
  border-color: var(--border-focus);
}
.text-answer-input.input-correct {
  border-color: #28a745;
  background: var(--success-bg);
}
.text-answer-input.input-wrong {
  border-color: #dc3545;
  background: var(--error-bg);
}

/* Предупреждения */
.answer-warning {
  margin-top: 6px;
  padding: 6px 10px;
  background: var(--warning-bg);
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: var(--warning-text);
  font-size: 0.85em;
  line-height: 1.3;
}
.warning-note {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: var(--warning-text);
}
.res {
  margin-top: 8px;
  font-weight: 500;
}
.ok {
  color: var(--success-text);
}
.err {
  color: var(--error-text);
}
.score {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;
  font-size: 1.1em;
  color: var(--text-primary);
}
.unanswered-hint {
  text-align: center;
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--warning-bg);
  border: 1px solid var(--unanswered-border);
  border-radius: 6px;
  color: var(--warning-text);
  font-size: 0.9em;
}
.unanswered-hint strong {
  font-weight: 600;
}

/* 🔁 Пост-тестовое предложение повторить (INLINE) */
.post-test-repeat-inline {
  margin-top: 15px;
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

/* История */
.history-section {
  margin-top: 30px;
  padding-top: 20px;
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

/* Модалки */
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
.answer-row.correct {
  background: var(--success-bg);
  color: var(--success-text);
}
.answer-row.wrong {
  background: var(--error-bg);
  color: var(--error-text);
}
.answer-row.warning {
  background: var(--warning-bg);
  border-left: 3px solid #ffc107;
  color: var(--warning-text);
}
.answer-label {
  font-weight: 500;
  min-width: 90px;
}
.answer-value {
  flex: 1;
}
.answer-mark {
  font-weight: bold;
}
.answer-warning-detail {
  margin-top: 4px;
  font-size: 0.85em;
  color: var(--warning-text);
  font-style: italic;
  padding-left: 98px;
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
.was-wrong {
  color: var(--error-text);
}
.wrong-badge,
.correct-badge {
  margin-left: 8px;
  font-size: 0.9em;
}
.modal-hint {
  color: var(--text-secondary);
  margin-bottom: 15px;
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
  .card {
    padding: 15px;
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
/* Контейнер кнопок завершения */
.submit-buttons {
  margin-top: 15px;
}

.mt-1 {
  margin-top: 10px;
}

/* Анимация для кнопки пропуска */
@keyframes pulse-skip {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.btn-outline[title*="пропущено"] {
  animation: pulse-skip 2s infinite;
}
/* Checkbox стили */
.opt input[type="checkbox"] {
  margin-right: 12px;
  transform: scale(1.2);
  accent-color: #42b983;
}

/* Визуальное выделение выбранных чекбоксов */
.opt:has(input[type="checkbox"]:checked) {
  border-color: #42b983;
  background: var(--hover-bg);
}

/* Для Истина/Ложь */
.opt:has(input[value="true"]:checked) {
  border-left: 3px solid #28a745;
}
.opt:has(input[value="false"]:checked) {
  border-left: 3px solid #dc3545;
}
.matching-container {
  margin-top: 10px;
}

.matching-instruction {
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.matching-columns {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.matching-column {
  flex: 1;
}

.matching-column.left {
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
}

.matching-item {
  padding: 12px;
  margin-bottom: 10px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: move;
  transition: all 0.2s;
}

.matching-item:hover {
  border-color: var(--border-focus);
  transform: translateY(-2px);
}

.matching-option {
  padding: 10px;
  margin-bottom: 8px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.matching-option:hover {
  border-color: var(--border-focus);
  background: var(--hover-bg);
}

.matching-option.selected {
  border-color: #ffc107;
  background: var(--warning-bg);
  opacity: 0.6;
}

.matching-option.correct {
  border-color: #28a745;
  background: var(--success-bg);
  color: var(--success-text);
}

.matching-connections {
  margin-top: 20px;
}

.matching-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 12px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.matching-left {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.matching-select {
  flex: 1.5;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.matching-select:focus {
  outline: none;
  border-color: var(--border-focus);
}

.matching-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Адаптивность */
@media (max-width: 768px) {
  .matching-columns {
    flex-direction: column;
  }

  .matching-row {
    flex-direction: column;
    align-items: stretch;
  }

  .matching-left {
    margin-bottom: 8px;
  }
}
.matching-clear {
  background: none;
  border: none;
  color: var(--error-text);
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 5px;
  opacity: 0.7;
}
.matching-clear:hover {
  opacity: 1;
}
/* === Управление полем JSON === */
.json-input-header {
  position: relative;
}

.json-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.json-action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.json-action-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.json-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.json-action-btn:nth-child(2):hover:not(:disabled) {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

/* Анимация подтверждения копирования */
@keyframes pulse-success {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.json-action-btn.copied {
  animation: pulse-success 0.3s ease;
}
</style>
