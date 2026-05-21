<template>
  <div class="card">
    <h1>📝 Тестирование</h1>

    <!-- 🔐 Инфо о пользователе -->
    <div v-if="user" class="user-bar">
      <span>👤 {{ user.displayName || user.email }}</span>
    </div>

    <!-- Ввод JSON -->
    <div class="json-input">
      <textarea
        v-model="jsonInput"
        placeholder='[{"question": "...", "value_1": "...", "correct_answer": "value_2"}]'
      ></textarea>
      <div class="btn-row">
        <button @click="loadFromJson" class="btn btn-primary">
          🚀 Загрузить
        </button>
        <button @click="fillExample" class="btn btn-outline">📄 Пример</button>
      </div>
    </div>

    <!-- Текущий тест -->
    <div v-if="questions.length" class="questions">
      <div v-for="(q, i) in questions" :key="i" class="q-card">
        <div class="q-title">{{ i + 1 }}. {{ q.question }}</div>
        <label
          v-for="key in optionKeys"
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
        <div v-if="done" class="res">
          <span v-if="answers[i] === q.correct_answer" class="ok">✓ Верно</span>
          <span v-else class="err"
            >✗ Неверно. Правильный: {{ q[q.correct_answer] }}</span
          >
        </div>
      </div>
      <button
        @click="submit"
        :disabled="done || !allAnswered"
        class="btn btn-primary full"
      >
        {{ done ? "Готово" : "Подтвердить" }}
      </button>
      <div v-if="done" class="score">
        🎯 {{ correct }} / {{ questions.length }}
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
              >{{ selectedResult.score }} из {{ selectedResult.total }}</strong
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
              :class="ans.sel === ans.cor ? 'correct' : 'wrong'"
            >
              <span class="answer-label">Ваш ответ:</span>
              <span class="answer-value">{{
                getAnswerText(ans.sel, ans.q) || "—"
              }}</span>
              <span v-if="ans.sel !== ans.cor" class="answer-mark">✗</span>
              <span v-else class="answer-mark">✓</span>
            </div>
            <div v-if="ans.sel !== ans.cor" class="answer-row correct">
              <span class="answer-label">Правильный:</span>
              <span class="answer-value">{{
                getAnswerText(ans.cor, ans.q)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
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

// История
const history = ref([]);
const loadingHistory = ref(false);
const showDetails = ref(false);
const selectedResult = ref(null);

const allAnswered = computed(
  () => questions.value.length && answers.value.every((a) => a !== null),
);
const correct = computed(() =>
  done.value
    ? questions.value.reduce(
        (s, q, i) => s + (answers.value[i] === q.correct_answer ? 1 : 0),
        0,
      )
    : 0,
);

// Загрузка из JSON
const loadFromJson = () => {
  try {
    const data = JSON.parse(jsonInput.value);
    if (!Array.isArray(data)) throw new Error("Массив [...]");
    questions.value = data;
    answers.value = new Array(data.length).fill(null);
    done.value = false;
  } catch (e) {
    alert("Ошибка: " + e.message);
  }
};

const fillExample = () =>
  (jsonInput.value =
    '[{"question":"Тест?","value_1":"А","value_2":"Б","correct_answer":"value_2"}]');

// Отправка теста
const submit = async () => {
  if (!allAnswered.value) return;
  done.value = true;
  if (user.value) {
    await addDoc(collection(db, "quizResults"), {
      userId: user.value.uid,
      score: correct.value,
      total: questions.value.length,
      quizTitle: questions.value[0]?.question?.substring(0, 50) + "...",
      answers: answers.value.map((a, i) => ({
        q: questions.value[i].question,
        sel: a,
        cor: questions.value[i].correct_answer,
        selText: questions.value[i][a] || a,
        corText:
          questions.value[i][questions.value[i].correct_answer] ||
          questions.value[i].correct_answer,
      })),
      timestamp: serverTimestamp(),
    });
    loadHistory(); // обновить список
  }
};

// 📚 Загрузка истории
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

// 👁️ Просмотр деталей
const viewDetails = (item) => {
  selectedResult.value = item;
  showDetails.value = true;
};

const closeDetails = () => {
  showDetails.value = false;
  selectedResult.value = null;
};

// Получить текст ответа по ключу
const getAnswerText = (key, questionText) => {
  if (!selectedResult.value?.answers) return key;
  const ans = selectedResult.value.answers.find((a) => a.q === questionText);
  if (!ans) return key;
  return key === ans.cor ? ans.corText : ans.selText;
};

// 🗑️ Удаление результата
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

// 🗑️ Очистка всей истории
const clearHistory = async () => {
  if (!confirm("Удалить ВСЮ историю прохождений?")) return;
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

// Форматирование даты
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

// Отслеживание авторизации
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u;
    if (u) loadHistory();
    else {
      history.value = [];
      closeDetails();
    }
  });
});
</script>

<style scoped>
.card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.user-bar {
  text-align: right;
  margin-bottom: 15px;
  color: #666;
  font-size: 0.9em;
}

textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-family: monospace;
  box-sizing: border-box;
}
.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-primary {
  background: #42b983;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #3aa876;
}
.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}
.btn-outline:hover:not(:disabled) {
  background: #6c757d;
  color: #fff;
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

.q-card {
  border: 1px solid #eee;
  padding: 15px;
  margin: 15px 0 0;
  border-radius: 8px;
}
.q-title {
  font-weight: 600;
  margin-bottom: 10px;
}
.opt {
  display: block;
  padding: 8px;
  margin: 4px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}
.opt.correct {
  background: #d4edda;
  border-color: #28a745;
}
.opt.wrong {
  background: #f8d7da;
  border-color: #dc3545;
}
.res {
  margin-top: 8px;
  font-weight: 500;
}
.ok {
  color: #155724;
}
.err {
  color: #721c24;
}
.score {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;
  font-size: 1.1em;
}

/* История */
.history-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #eee;
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
  color: #2c3e50;
}
.loading,
.empty-history {
  text-align: center;
  color: #999;
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
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #eee;
}
.history-info {
  flex: 1;
}
.history-info strong {
  display: block;
  margin-bottom: 4px;
}
.history-meta {
  font-size: 0.85em;
  color: #666;
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
  background: #fff;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: #fff;
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
  color: #666;
  line-height: 1;
}
.modal-close:hover {
  color: #333;
}
.modal-body {
  padding: 20px;
}
.modal-summary {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
}
.answer-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
}
.answer-question {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 0.95em;
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
  background: #d4edda;
  color: #155724;
}
.answer-row.wrong {
  background: #f8d7da;
  color: #721c24;
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
</style>
