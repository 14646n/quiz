import { createRouter, createWebHistory } from 'vue-router'
import QuizView from './views/QuizView.vue'
import ChartsView from './views/ChartView.vue'

const routes = [
  { path: '/', name: 'Quiz', component: QuizView },
  { path: '/charts', name: 'Charts', component: ChartsView }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})