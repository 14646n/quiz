<template>
  <div class="card">
    <h1>📝 Тестирование</h1>
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
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
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
} from "firebase/firestore";

const jsonInput = ref("");
const questions = ref([]);
const answers = ref([]);
const done = ref(false);
const optionKeys = ["value_1", "value_2", "value_3", "value_4"];
const user = ref(null);
const history = ref([]);

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
const submit = async () => {
  if (!allAnswered.value) return;
  done.value = true;
  if (user.value) {
    await addDoc(collection(db, "quizResults"), {
      userId: user.value.uid,
      score: correct.value,
      total: questions.value.length,
      answers: answers.value.map((a, i) => ({
        q: questions.value[i].question,
        sel: a,
        cor: questions.value[i].correct_answer,
      })),
      timestamp: serverTimestamp(),
    });
  }
};

onAuthStateChanged(auth, (u) => {
  user.value = u;
});
</script>

<style scoped>
.card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
}
.btn-primary {
  background: #42b983;
  color: #fff;
}
.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
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
</style>
