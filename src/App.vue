<template>
  <div class="app-container">
    <nav class="nav-tabs">
      <router-link to="/" active-class="active"> Тестирование</router-link>
      <router-link to="/charts" active-class="active">📊 Графики</router-link>
    </nav>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #f5f7fa;
  font-family: system-ui, sans-serif;
}
.app-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
