<template>
  <div class="app-container">
    <!-- 🔐 Панель авторизации -->
    <div class="auth-bar">
      <template v-if="currentUser">
        <div class="user-info">
          <div class="avatar">{{ userInitials }}</div>
          <span>{{ currentUser.displayName || currentUser.email }}</span>
        </div>
        <button @click="handleLogout" class="btn btn-logout">🚪 Выйти</button>
      </template>
      <template v-else>
        <button @click="handleLogin" class="btn btn-login">
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            width="18"
            alt="G"
          />
          Войти через Google
        </button>
      </template>

      <!-- 🌗 Переключатель темы -->
      <button
        @click="toggleTheme"
        class="btn btn-theme"
        :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
      >
        {{ isDark ? "☀️" : "🌙" }}
      </button>
    </div>

    <!-- 🧭 Навигация -->
    <nav class="nav-tabs">
      <router-link to="/" active-class="active">📝 Тестирование</router-link>
      <router-link to="/charts" active-class="active">📊 Графики</router-link>
      <router-link to="/flashcards" active-class="active"
        >📚 Карточки</router-link
      >
    </nav>

    <!-- 📄 Контент страниц -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { auth } from "./firebase.js";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// 🌗 Тема: тёмная по умолчанию
const isDark = ref(true);

// Применяем тему: управляем классом .light-mode на html/body
const updateThemeClass = () => {
  [document.documentElement, document.body].forEach((el) => {
    el.classList.toggle("light-mode", !isDark.value);
  });
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem("quizTheme", isDark.value ? "dark" : "light");
  updateThemeClass();
};

// Глобальный доступ для других компонентов
window.toggleQuizTheme = toggleTheme;

const handleLogin = async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    console.error("Login error:", err);
    alert("Ошибка входа: " + err.message);
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout error:", err);
  }
};

const currentUser = ref(null);

const userInitials = computed(() => {
  if (!currentUser.value) return "?";
  const name = currentUser.value.displayName || currentUser.value.email || "";
  return name.charAt(0).toUpperCase();
});

onMounted(() => {
  // Загружаем сохранённую тему
  const saved = localStorage.getItem("quizTheme");
  if (saved === "light") isDark.value = false;
  updateThemeClass();

  // Авторизация
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user;
    console.log("App version:", new Date().toISOString());
  });
});

watch(isDark, updateThemeClass);
</script>

<style>
/* Базовые стили приложения */
.app-container {
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;

  /* ✅ Гарантируем тёмный фон */
  background-color: var(--bg-primary) !important;
}

/* Auth Bar */
.auth-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s;
  flex-wrap: wrap;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95em;
  color: var(--text-secondary);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #42b983;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1em;
}

/* Кнопки */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
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

.btn-login {
  background: var(--bg-card);
}

.btn-logout {
  background: #dc3545;
  color: #fff;
  border-color: #dc3545;
}
.btn-logout:hover {
  background: #c82333;
  border-color: #c82333;
}

.btn-theme {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* Nav Tabs */
.nav-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
  transition: border-color 0.3s;
  flex-wrap: wrap;
}

.nav-tabs a {
  padding: 8px 16px;
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 6px 6px 0 0;
  transition: 0.2s;
}

.nav-tabs a:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-tabs a.active {
  background: #42b983;
  color: #fff;
  font-weight: 600;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .app-container {
    padding: 15px;
  }

  .auth-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-tabs {
    flex-wrap: wrap;
  }
}
</style>
