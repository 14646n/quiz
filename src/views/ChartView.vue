<template>
  <div class="card">
    <h2>📊 Построение и анализ графиков</h2>

    <!-- Переключатель режима ввода -->
    <div class="input-toggle">
      <button
        :class="['toggle-btn', { active: inputMode === 'manual' }]"
        @click="inputMode = 'manual'"
      >
        ✏️ Ввести вручную
      </button>
      <button
        :class="['toggle-btn', { active: inputMode === 'paste' }]"
        @click="inputMode = 'paste'"
      >
        📋 Вставить массив/JSON
      </button>
    </div>

    <!-- Режим: Вручную -->
    <div v-if="inputMode === 'manual'" class="step">
      <label>Количество точек (2–50):</label>
      <div class="step-controls">
        <input
          type="number"
          v-model.number="pointCount"
          min="2"
          max="50"
          class="input-small"
        />
        <button @click="generateFields" class="btn btn-primary">
          ➕ Создать поля
        </button>
      </div>
      <div v-if="fields.length > 0" style="margin-top: 15px">
        <label>Введите координаты:</label>
        <div class="points-list">
          <div v-for="(field, index) in fields" :key="index" class="point-row">
            <span class="point-num">Т{{ index + 1 }}</span>
            <input
              type="text"
              v-model="field.x"
              placeholder="X"
              class="input-coord"
              @input="formatDecimal(field, 'x')"
            />
            <input
              type="text"
              v-model="field.y"
              placeholder="Y"
              class="input-coord"
              @input="formatDecimal(field, 'y')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Режим: Вставить массив -->
    <div v-if="inputMode === 'paste'" class="step">
      <label>Вставьте данные (JSON или построчно):</label>
      <textarea
        v-model="pasteInput"
        class="paste-area"
        rows="6"
        placeholder="Поддерживается:&#10;1. JSON: [{x:15, y:687}]&#10;2. Строки: 15, 687&#10;3. Табуляция: 15[Tab]0,0687"
      ></textarea>
      <div class="paste-buttons">
        <button @click="parsePasteInput" class="btn btn-primary">
          📥 Применить данные
        </button>
        <button @click="fillPasteExample" class="btn btn-outline">
          📄 Пример
        </button>
      </div>
    </div>

    <!-- Общие кнопки -->
    <div class="actions">
      <button
        v-if="inputMode === 'manual'"
        @click="buildChart"
        :disabled="fields.length < 2"
        class="btn btn-primary"
      >
        📈 Построить график
      </button>
      <button @click="clearAll" class="btn btn-outline">🗑️ Очистить всё</button>
    </div>

    <!-- Выбор типа графика -->
    <div v-if="dataPoints.length >= 2" class="chart-type-selector">
      <label>🎨 Тип графика:</label>
      <div class="type-buttons">
        <button
          :class="['type-btn', { active: chartType === 'line' }]"
          @click="
            chartType = 'line';
            updateChart();
          "
        >
          📈 Линейный (плавный)
        </button>
        <button
          :class="['type-btn', { active: chartType === 'bar' }]"
          @click="
            chartType = 'bar';
            updateChart();
          "
        >
          📊 Гистограмма
        </button>
        <button
          :class="['type-btn', { active: chartType === 'scatter' }]"
          @click="
            chartType = 'scatter';
            updateChart();
          "
        >
          ⚡ Точечный + прямая тренда
        </button>
      </div>
    </div>

    <!-- Панель анализа -->
    <div v-if="dataPoints.length >= 2" class="analysis-panel">
      <h3>🔍 Инструменты анализа</h3>

      <!-- Для точечного графика: перпендикуляры + tg через 2 точки -->
      <div v-if="chartType === 'scatter'" class="scatter-tools">
        <!-- Перпендикуляры от одной точки -->
        <div class="tool-section">
          <label>⊥ Перпендикуляры от точки:</label>
          <div class="tool-row">
            <input
              type="number"
              v-model.number="perpX"
              class="input-small"
              placeholder="X"
              @input="drawPerpendiculars"
              @blur="drawPerpendiculars"
            />
            <span v-if="perpY !== null" class="coord-hint"
              >→ Y = {{ formatDisplay(perpY) }}</span
            >
          </div>
        </div>

        <!-- tg через 2 точки -->
        <div class="tool-section">
          <label>📐 tg(α) через 2 точки:</label>
          <div class="tool-row">
            <input
              type="number"
              v-model.number="point1X"
              class="input-small"
              placeholder="X₁"
              @change="calcTg"
            />
            <span class="arrow">→</span>
            <input
              type="number"
              v-model.number="point2X"
              class="input-small"
              placeholder="X₂"
              @change="calcTg"
            />
          </div>
        </div>

        <!-- Результаты -->
        <div v-if="tgResult !== null || perpY !== null" class="perp-results">
          <div v-if="perpY !== null" class="result-row">
            🔹 Точка на прямой:
            <strong
              >({{ formatDisplay(perpX) }}, {{ formatDisplay(perpY) }})</strong
            >
          </div>
          <div v-if="tgResult !== null" class="result-row">
            📐 Точка 1:
            <strong
              >({{ formatDisplay(point1X) }},
              {{ formatDisplay(point1Y) }})</strong
            >
          </div>
          <div v-if="tgResult !== null" class="result-row">
            📐 Точка 2:
            <strong
              >({{ formatDisplay(point2X) }},
              {{ formatDisplay(point2Y) }})</strong
            >
          </div>
          <div v-if="tgResult !== null" class="result-row">
            ΔX = {{ formatDisplay(deltaX) }}, ΔY = {{ formatDisplay(deltaY) }}
          </div>
          <div v-if="tgResult !== null" class="result-row">
            tg(α) = ΔY/ΔX = <strong>{{ formatDisplay(tgResult) }}</strong>
          </div>
          <div v-if="angleDeg !== null" class="result-row">
            📏 Угол наклона: <strong>{{ formatDisplay(angleDeg) }}°</strong>
          </div>
          <div class="result-row small">
            Прямая: y = {{ formatDisplay(trendSlope) }}x +
            {{ formatDisplay(trendIntercept) }}
          </div>
        </div>
      </div>

      <!-- Для линейного графика: касательная -->
      <div v-if="chartType === 'line'" class="analysis-controls">
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="showTrendline"
            @change="updateChart"
          />
          📊 Показать линию тренда
        </label>
        <div class="tangent-control" v-if="dataPoints.length >= 2">
          <label>Касательная в точке:</label>
          <select v-model="tangentIndex" @change="updateChart">
            <option value="-1">Не показывать</option>
            <option v-for="(p, i) in sortedPoints" :key="i" :value="i">
              Т{{ i + 1 }} (X={{ formatDisplay(p.x) }})
            </option>
          </select>
        </div>
      </div>

      <!-- Результаты касательной (для line) -->
      <div
        v-if="chartType === 'line' && tangentSlope !== null"
        class="tangent-results"
      >
        <div class="result-row">
          📐 <strong>Уравнение касательной:</strong> y =
          {{ formatDisplay(tangentSlope) }}x + {{ formatDisplay(tangentB) }}
        </div>
        <div class="result-row">
          📉 <strong>Пересечение с Y:</strong>
          <span class="highlight">y ≈ {{ formatDisplay(tangentB) }}</span>
        </div>
        <div class="result-row" v-if="tangentIntercept !== null">
          ➡️ <strong>Пересечение с X:</strong>
          <span class="highlight"
            >x ≈ {{ formatDisplay(tangentIntercept) }}</span
          >
        </div>
      </div>
    </div>

    <div class="chart-box"><canvas ref="cv"></canvas></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const cv = ref(null);
const inputMode = ref("manual");
const pointCount = ref(5);
const fields = ref([]);
const pasteInput = ref("");
const dataPoints = ref([]);
const chartType = ref("line");
let chartInstance = null;

// Линейный график
const showTrendline = ref(false);
const tangentIndex = ref("-1");
const tangentIntercept = ref(null);
const tangentSlope = ref(null);
const tangentB = ref(null);

// Точечный график
const trendSlope = ref(null);
const trendIntercept = ref(null);

// Перпендикуляры
const perpX = ref(null);
const perpY = ref(null);

// tg через 2 точки
const point1X = ref(null);
const point2X = ref(null);
const point1Y = ref(null);
const point2Y = ref(null);
const deltaX = ref(null);
const deltaY = ref(null);
const tgResult = ref(null);
const angleDeg = ref(null);

const sortedPoints = computed(() =>
  [...dataPoints.value].sort((a, b) => a.x - b.x),
);

const formatDecimal = (field, key) => {
  if (field[key] && typeof field[key] === "string")
    field[key] = field[key].replace(",", ".");
};

const generateFields = () => {
  const count = Math.max(2, Math.min(50, pointCount.value || 5));
  fields.value = Array.from({ length: count }, () => ({ x: "", y: "" }));
  dataPoints.value = [];
  if (chartInstance) chartInstance.destroy();
};

const fillPasteExample = () => {
  pasteInput.value = `15    0,0687
    30  0,0888
    45  0,0996
    60  0,1035
    90  0,109`;
};

const parsePasteInput = () => {
  const text = pasteInput.value.trim();
  if (!text) return alert("Поле пустое");

  let points = [];

  // Заменяем запятые на точки для чисел
  const normalizedText = text.replace(/,/g, ".");

  try {
    // Попытка парсинга JSON
    const json = JSON.parse(normalizedText);
    if (Array.isArray(json)) {
      points = json.map((p) => ({
        x: parseFloat(p.x ?? p[0]),
        y: parseFloat(p.y ?? p[1]),
      }));
    }
  } catch {
    // Fallback: построчный парсинг
    normalizedText.split("\n").forEach((line) => {
      const parts = line
        .split(/[\t]| {2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);

        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      }
    });
  }

  points = points.filter((p) => !isNaN(p.x) && !isNaN(p.y));
  if (points.length < 2)
    return alert("Нужно минимум 2 корректные точки. Проверьте формат данных.");

  dataPoints.value = points;
  updateChart();
};

const clearAll = () => {
  fields.value = [];
  pasteInput.value = "";
  dataPoints.value = [];
  // Сброс линейного
  tangentIntercept.value = null;
  tangentSlope.value = null;
  tangentB.value = null;
  showTrendline.value = false;
  tangentIndex.value = "-1";
  // Сброс точечного
  trendSlope.value = null;
  trendIntercept.value = null;
  perpX.value = null;
  perpY.value = null;
  point1X.value = null;
  point2X.value = null;
  point1Y.value = null;
  point2Y.value = null;
  deltaX.value = null;
  deltaY.value = null;
  tgResult.value = null;
  angleDeg.value = null;
  chartType.value = "line";
  if (chartInstance) chartInstance.destroy();
};

const formatDisplay = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return Number(val).toString().replace(".", ",");
};

const buildChart = () => {
  const parsed = fields.value
    .map((f) => ({ x: parseFloat(f.x), y: parseFloat(f.y) }))
    .filter((p) => !isNaN(p.x) && !isNaN(p.y));
  if (parsed.length < 2) return alert("Заполните минимум 2 точки корректно");
  dataPoints.value = parsed;
  updateChart();
};

// Линейная регрессия
const calcTrendline = (points) => {
  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  points.forEach((p) => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

// 🔷 Перпендикуляры от точки на прямой
const drawPerpendiculars = () => {
  if (!Number.isFinite(perpX.value)) {
    perpX.value = null;
    perpY.value = null;
    updateChart();
    return;
  }

  if (trendSlope.value === null) return;

  perpY.value = trendSlope.value * perpX.value + trendIntercept.value;
  updateChart();
};

// 📐 tg через 2 точки на прямой
const calcTg = () => {
  if (
    !Number.isFinite(point1X.value) ||
    !Number.isFinite(point2X.value) ||
    trendSlope.value === null
  ) {
    point1Y.value = null;
    point2Y.value = null;
    deltaX.value = null;
    deltaY.value = null;
    tgResult.value = null;
    angleDeg.value = null;
    updateChart();
    return;
  }

  if (point1X.value === point2X.value) {
    tgResult.value = null;
    angleDeg.value = null;
    updateChart();
    return;
  }

  point1Y.value = trendSlope.value * point1X.value + trendIntercept.value;
  point2Y.value = trendSlope.value * point2X.value + trendIntercept.value;

  deltaX.value = point2X.value - point1X.value;
  deltaY.value = point2Y.value - point1Y.value;
  tgResult.value = deltaY.value / deltaX.value;
  angleDeg.value = Math.atan(tgResult.value) * (180 / Math.PI);

  updateChart();
};

const updateChart = () => {
  if (!cv.value || !dataPoints.value.length) return;
  if (chartInstance) chartInstance.destroy();

  const points = sortedPoints.value;
  const datasets = [];

  // Рассчитываем тренд
  const trend = calcTrendline(points);
  trendSlope.value = trend.slope;
  trendIntercept.value = trend.intercept;

  // 📈 ЛИНЕЙНЫЙ
  if (chartType.value === "line") {
    datasets.push({
      label: "Данные",
      data: points,
      borderColor: "#1f77b4",
      backgroundColor: "transparent",
      borderWidth: 2.5,
      pointRadius: 7,
      pointBackgroundColor: "#1f77b4",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointHoverRadius: 10,
      parsing: false,
      tension: 0.35,
      fill: false,
    });

    if (showTrendline.value) {
      datasets.push({
        label: "Линия тренда",
        data: [
          { x: points[0].x, y: trend.slope * points[0].x + trend.intercept },
          {
            x: points[points.length - 1].x,
            y: trend.slope * points[points.length - 1].x + trend.intercept,
          },
        ],
        borderColor: "#9467bd",
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 2,
        parsing: false,
        type: "line",
      });
    }

    // Касательная
    const idx = parseInt(tangentIndex.value);
    if (idx >= 0 && points[idx]) {
      const p = points[idx];
      let slope = 0;
      if (idx > 0 && idx < points.length - 1) {
        slope =
          (points[idx + 1].y - points[idx - 1].y) /
          (points[idx + 1].x - points[idx - 1].x);
      } else if (idx === 0 && points.length > 1) {
        slope = (points[1].y - points[0].y) / (points[1].x - points[0].x);
      } else {
        slope =
          (points[idx].y - points[idx - 1].y) /
          (points[idx].x - points[idx - 1].x);
      }
      const b = p.y - slope * p.x;
      tangentSlope.value = slope;
      tangentB.value = b;
      if (slope !== 0) tangentIntercept.value = -b / slope;

      const xMin = points[0].x,
        xMax = points[points.length - 1].x;
      const range = (xMax - xMin) * 0.5;
      datasets.push({
        label: "Касательная",
        data: [
          { x: p.x - range, y: slope * (p.x - range) + b },
          { x: p.x + range, y: slope * (p.x + range) + b },
        ],
        borderColor: "#2ca02c",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 2,
        parsing: false,
        type: "line",
      });
      datasets.push({
        label: "Пересечение с Y",
        data: [{ x: 0, y: b }],
        borderColor: "#e377c2",
        backgroundColor: "#e377c2",
        pointRadius: 7,
        parsing: false,
        showLine: false,
        type: "scatter",
      });
    }
  }
  // 📊 ГИСТОГРАММА
  else if (chartType.value === "bar") {
    const barData = points.map((p, i) => ({
      x: `Т${i + 1}: ${formatDisplay(p.x)}`,
      y: p.y,
    }));

    datasets.push({
      label: "Данные",
      data: barData,
      backgroundColor: "rgba(31, 119, 180, 0.7)",
      borderColor: "#1f77b4",
      borderWidth: 1,
      barPercentage: 0.8,
      categoryPercentage: 0.9,
    });
  }
  // ⚡ ТОЧЕЧНЫЙ + ПРЯМАЯ + ПЕРПЕНДИКУЛЯРЫ + TG
  else {
    // Точки данных
    datasets.push({
      label: "Точки данных",
      data: points,
      type: "scatter",
      borderColor: "#d62728",
      backgroundColor: "#d62728",
      pointRadius: 6,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.5,
      pointHoverRadius: 9,
      parsing: false,
    });

    // Линия тренда (сплошная)
    const xMin = points[0].x,
      xMax = points[points.length - 1].x;
    const drawXMin = xMin - (xMax - xMin) * 0.1;
    const drawXMax = xMax + (xMax - xMin) * 0.1;

    datasets.push({
      label: "Линия тренда",
      data: [
        { x: drawXMin, y: trend.slope * drawXMin + trend.intercept },
        { x: drawXMax, y: trend.slope * drawXMax + trend.intercept },
      ],
      borderColor: "#1f77b4",
      borderWidth: 2.5,
      pointRadius: 0,
      parsing: false,
      type: "line",
      fill: false,
    });

    // 🔷 Перпендикуляры
    if (Number.isFinite(perpX.value) && trendSlope.value !== null) {
      const y = trend.slope * perpX.value + trend.intercept;

      // Вертикальная линия к оси X
      datasets.push({
        label: "⊥ к X",
        data: [
          { x: perpX.value, y: 0 },
          { x: perpX.value, y: y },
        ],
        borderColor: "#ff7f0e",
        borderDash: [5, 3],
        borderWidth: 2,
        pointRadius: 0,
        parsing: false,
        type: "line",
      });
      // Горизонтальная линия к оси Y
      datasets.push({
        label: "⊥ к Y",
        data: [
          { x: 0, y: y },
          { x: perpX.value, y: y },
        ],
        borderColor: "#2ca02c",
        borderDash: [5, 3],
        borderWidth: 2,
        pointRadius: 0,
        parsing: false,
        type: "line",
      });
      // Точка на прямой
      datasets.push({
        label: "Точка на прямой",
        data: [{ x: perpX.value, y: y }],
        backgroundColor: "#ff7f0e",
        borderColor: "#ff7f0e",
        pointRadius: 8,
        pointHoverRadius: 10,
        parsing: false,
        showLine: false,
        type: "scatter",
      });
    }

    // 📐 Маркеры для tg
    if (
      Number.isFinite(point1X.value) &&
      Number.isFinite(point2X.value) &&
      point1X.value !== point2X.value &&
      trendSlope.value !== null
    ) {
      const y1 = trend.slope * point1X.value + trend.intercept;
      const y2 = trend.slope * point2X.value + trend.intercept;
      datasets.push({
        label: "Точки для tg",
        data: [
          { x: point1X.value, y: y1 },
          { x: point2X.value, y: y2 },
        ],
        backgroundColor: "#9467bd",
        borderColor: "#9467bd",
        pointRadius: 9,
        pointHoverRadius: 11,
        parsing: false,
        showLine: false,
        type: "scatter",
      });
    }
  }

  chartInstance = new Chart(cv.value, {
    type: chartType.value === "scatter" ? "scatter" : chartType.value,
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: chartType.value === "bar" ? "category" : "linear",
          title: {
            display: true,
            text: "Ось X",
            color: "var(--text-secondary)",
          },
          ticks: { color: "var(--text-secondary)" },
          grid: { color: "var(--border-color)" },
          beginAtZero: chartType.value === "scatter",
        },
        y: {
          type: "linear",
          title: {
            display: true,
            text: "Ось Y",
            color: "var(--text-secondary)",
          },
          ticks: { color: "var(--text-secondary)" },
          grid: { color: "var(--border-color)" },
          beginAtZero: chartType.value === "bar",
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 20,
            color: "var(--text-primary)",
          },
        },
        tooltip: {
          backgroundColor: "rgba(30, 30, 46, 0.95)",
          titleColor: "#fff",
          bodyColor: "#cdd6f4",
          borderColor: "var(--border-color)",
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 13 },
          callbacks: {
            label: (ctx) => {
              if (
                ctx.dataset.label === "Точки данных" ||
                ctx.dataset.label === "Данные"
              ) {
                return `X: ${formatDisplay(ctx.raw.x || ctx.label)}, Y: ${formatDisplay(ctx.raw.y || ctx.parsed.y)}`;
              }
              if (
                ctx.dataset.label === "Точка на прямой" ||
                ctx.dataset.label === "Точки для tg"
              ) {
                return `📍 Точка: X=${formatDisplay(ctx.raw.x)}, Y=${formatDisplay(ctx.raw.y)}`;
              }
              return ctx.dataset.label;
            },
          },
        },
      },
    },
  });
};

watch(chartType, () => {
  tangentIndex.value = "-1";
  showTrendline.value = false;
  perpX.value = null;
  perpY.value = null;
  point1X.value = null;
  point2X.value = null;
  tgResult.value = null;
  angleDeg.value = null;
});

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<style scoped>
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

.input-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.toggle-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}

.toggle-btn:hover {
  border-color: var(--border-focus);
  background: var(--hover-bg);
}

.toggle-btn.active {
  border-color: #42b983;
  background: #42b983;
  color: #fff;
}

.step {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.step label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  color: var(--text-primary);
}

.step-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.input-small {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 5px;
}

.point-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.point-num {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9em;
  min-width: 40px;
}

.input-coord {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  background: var(--input-bg);
  color: var(--text-primary);
}

.paste-area {
  width: 100%;
  padding: 10px;
  font-family: monospace;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  resize: vertical;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.paste-area:focus {
  outline: none;
  border-color: var(--border-focus);
}

.paste-buttons {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: nowrap;
}

.actions {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
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

.btn-outline:hover {
  background: var(--text-secondary);
  color: var(--bg-primary);
}

.chart-type-selector {
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
}

.chart-type-selector label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--text-primary);
}

.type-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.type-btn {
  padding: 10px 20px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.type-btn:hover {
  border-color: var(--border-focus);
  background: var(--hover-bg);
}

.type-btn.active {
  border-color: #42b983;
  background: #42b983;
  color: #fff;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}

.chart-box {
  position: relative;
  height: 500px;
  width: 100%;
  margin: 20px 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.analysis-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.analysis-panel h3 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  color: var(--text-primary);
}

.scatter-tools {
  background: var(--bg-card);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #ff7f0e;
  margin-bottom: 15px;
}

.tool-section {
  margin-bottom: 12px;
}

.tool-section label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.95em;
  color: var(--text-primary);
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-row .arrow {
  color: var(--text-secondary);
  font-weight: bold;
}

.coord-hint {
  font-size: 0.9em;
  color: #42b983;
  font-weight: 500;
}

.perp-results {
  background: var(--bg-input);
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.result-row {
  margin: 6px 0;
  font-size: 0.95em;
  color: var(--text-primary);
}

.result-row.small {
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-top: 8px;
}

.highlight {
  font-weight: bold;
  color: #42b983;
  margin-left: 5px;
}

.analysis-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.95em;
  color: var(--text-primary);
}

.tangent-control {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tangent-control select {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  min-width: 180px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.tangent-results {
  margin-top: 15px;
  background: var(--bg-card);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #9467bd;
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-box {
    height: 400px;
  }

  .type-buttons {
    flex-direction: column;
  }

  .type-btn {
    width: 100%;
  }
}
</style>
