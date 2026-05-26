import { createRouter, createWebHistory } from 'vue-router'
import Flashcards from './views/FlashCards.vue'
import Quiz from './views/QuizView.vue'
import Charts from './views/ChartView.vue'

const routes = [
  {
    path: '/',
    name: 'Quiz',
    component: Quiz
  },
  {
    path: '/charts',
    name: 'Charts',
    component: Charts
  },
  {
    path: '/flashcards',
    name: 'Flashcards',
    component: Flashcards
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router