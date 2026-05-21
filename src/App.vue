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
    </div>

    <!-- 🧭 Навигация -->
    <nav class="nav-tabs">
      <router-link to="/" active-class="active">📝 Тестирование</router-link>
      <router-link to="/charts" active-class="active">📊 Графики</router-link>
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
import { ref, computed, onMounted } from "vue";
import { auth } from "./firebase.js";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const currentUser = ref(null);
const provider = new GoogleAuthProvider();

const userInitials = computed(() => {
  if (!currentUser.value) return "?";
  const name = currentUser.value.displayName || currentUser.value.email || "";
  return name.charAt(0).toUpperCase();
});

const handleLogin = async () => {
  try {
    await signInWithPopup(auth, provider);
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

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user;
  });
});
</script>

<style>
body {
  margin: 0;
  background: #f5f7fa;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
.app-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Auth Bar */
.auth-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95em;
  color: #333;
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
}
.btn-login {
  background: #fff;
  border: 1px solid #ddd;
  color: #333;
}
.btn-login:hover {
  background: #f8f9fa;
  border-color: #ccc;
}
.btn-logout {
  background: #dc3545;
  color: #fff;
}
.btn-logout:hover {
  background: #c82333;
}

/* Nav Tabs */
.nav-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}
.nav-tabs a {
  padding: 8px 16px;
  text-decoration: none;
  color: #666;
  border-radius: 6px 6px 0 0;
  transition: 0.2s;
}
.nav-tabs a:hover {
  background: #eef;
  color: #333;
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
</style>
