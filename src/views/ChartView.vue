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
        placeholder="Поддерживается:&#10;1. JSON: [{x:15, y:687}, {x:30, y:888}]&#10;2. Строки: 15, 687&#10;            30, 888&#10;3. Табуляция: 15\t688"
      ></textarea>
      <button @click="parsePasteInput" class="btn btn-primary">
        📥 Применить данные
      </button>
      <button
        @click="fillPasteExample"
        class="btn btn-outline"
        style="margin-left: 10px"
      >
        Пример
      </button>
    </div>

    <!-- Общие кнопки -->
    <div class="actions">
      <button
        v-if="inputMode === 'manual'"
        @click="buildChart"
        :disabled="fields.length < 2"
        class="btn btn-primary"
      >
        Построить график
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
          ⚡ Точки + прямые линии
        </button>
      </div>
    </div>

    <!-- Панель анализа -->
    <div v-if="dataPoints.length >= 2" class="analysis-panel">
      <h3>🔍 Инструменты анализа</h3>
      <div class="analysis-controls">
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="showTrendline"
            @change="updateChart"
          />
          📊 Показать линию тренда
        </label>
        <div
          class="tangent-control"
          v-if="dataPoints.length >= 2 && chartType !== 'bar'"
        >
          <label>Касательная в точке:</label>
          <select v-model="tangentIndex" @change="updateChart">
            <option value="-1">Не показывать</option>
            <option v-for="(p, i) in sortedPoints" :key="i" :value="i">
              Т{{ i + 1 }} (X={{ formatDisplay(p.x) }})
            </option>
          </select>
        </div>
      </div>

      <div v-if="tangentSlope !== null" class="tangent-results">
        <div class="result-row">
          📐 <strong>Уравнение:</strong> y = {{ formatDisplay(tangentSlope) }}x
          + {{ formatDisplay(tangentB) }}
        </div>
        <div class="result-row">
          📉 <strong>Пересечение с Y</strong> (x=0):
          <span class="highlight">y ≈ {{ formatDisplay(tangentB) }}</span>
          <span class="marker-hint">● точка на графике</span>
        </div>
        <div class="result-row" v-if="tangentIntercept !== null">
          ➡️ <strong>Пересечение с X</strong> (y=0):
          <span class="highlight"
            >x ≈ {{ formatDisplay(tangentIntercept) }}</span
          >
        </div>
        <div class="result-row prediction">
          🎯 <strong>Прогноз Y при X =</strong>
          <input
            type="number"
            v-model.number="predictX"
            class="input-predict"
            @input="replaceComma"
            placeholder="0"
          />
          <span class="arrow">→</span>
          <span class="highlight">y ≈ {{ formatDisplay(predictedY) }}</span>
        </div>
        <div class="note">
          ⚠️ Масштабы осей X и Y независимы. Визуальный угол наклона может
          отличаться от расчётного.
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

const showTrendline = ref(false);
const tangentIndex = ref("-1");
const tangentIntercept = ref(null);
const tangentSlope = ref(null);
const tangentB = ref(null);
const predictX = ref(0);

const sortedPoints = computed(() =>
  [...dataPoints.value].sort((a, b) => a.x - b.x),
);
const predictedY = computed(() => {
  if (tangentSlope.value === null) return null;
  return tangentSlope.value * predictX.value + (tangentB.value || 0);
});

const formatDecimal = (field, key) => {
  if (field[key] && typeof field[key] === "string")
    field[key] = field[key].replace(",", ".");
};
const replaceComma = (e) => {
  if (e.target.value.includes(","))
    predictX.value = parseFloat(e.target.value.replace(",", "."));
};

const generateFields = () => {
  const count = Math.max(2, Math.min(50, pointCount.value || 5));
  fields.value = Array.from({ length: count }, () => ({ x: "", y: "" }));
  dataPoints.value = [];
  if (chartInstance) chartInstance.destroy();
};

const fillPasteExample = () => {
  pasteInput.value = `[
  { "x": 15, "y": 687 },
  { "x": 30, "y": 888 },
  { "x": 45, "y": 996 },
  { "x": 60, "y": 1035 },
  { "x": 90, "y": 1090 }
]`;
};

const parsePasteInput = () => {
  const text = pasteInput.value.trim();
  if (!text) return alert("Поле пустое");

  let points = [];
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      points = json.map((p) => ({
        x: parseFloat(p.x ?? p[0]),
        y: parseFloat(p.y ?? p[1]),
      }));
    }
  } catch {
    text.split("\n").forEach((line) => {
      const parts = line.split(/[\t,\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        points.push({
          x: parseFloat(parts[0].replace(",", ".")),
          y: parseFloat(parts[1].replace(",", ".")),
        });
      }
    });
  }

  points = points.filter((p) => !isNaN(p.x) && !isNaN(p.y));
  if (points.length < 2) return alert("Нужно минимум 2 корректные точки");

  dataPoints.value = points;
  updateChart();
};

const clearAll = () => {
  fields.value = [];
  pasteInput.value = "";
  dataPoints.value = [];
  tangentIntercept.value = null;
  tangentSlope.value = null;
  tangentB.value = null;
  showTrendline.value = false;
  tangentIndex.value = "-1";
  predictX.value = 0;
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

const updateChart = () => {
  if (!cv.value || !dataPoints.value.length) return;
  if (chartInstance) chartInstance.destroy();

  const points = sortedPoints.value;
  if (chartType.value === "bar") {
    tangentSlope.value = null;
    tangentB.value = null;
    tangentIntercept.value = null;
  }

  const datasets = [];

  // 📈 ЛИНЕЙНЫЙ (плавный с крупными точками)
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
  }
  // 📊 ГИСТОГРАММА
  else if (chartType.value === "bar") {
    datasets.push({
      label: "Данные",
      data: points.map((p) => ({ x: p.x, y: p.y })),
      backgroundColor: "rgba(31, 119, 180, 0.7)",
      borderColor: "#1f77b4",
      borderWidth: 1,
      barPercentage: 0.8,
      categoryPercentage: 0.9,
    });
  }
  // ⚡ ТОЧКИ + ПРЯМЫЕ ЛИНИИ
  else {
    datasets.push({
      label: "Данные",
      data: points,
      type: "line",
      borderColor: "#d62728",
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 8,
      pointBackgroundColor: "#d62728",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2.5,
      pointHoverRadius: 11,
      parsing: false,
      tension: 0, // Строго прямые отрезки
      fill: false,
    });
  }

  // Линия тренда
  if (showTrendline.value && points.length > 1 && chartType.value !== "bar") {
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
    datasets.push({
      label: "Линия тренда",
      data: [
        { x: points[0].x, y: slope * points[0].x + intercept },
        {
          x: points[points.length - 1].x,
          y: slope * points[points.length - 1].x + intercept,
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
  tangentIntercept.value = null;
  tangentSlope.value = null;
  tangentB.value = null;
  const idx = parseInt(tangentIndex.value);

  if (idx >= 0 && points[idx] && chartType.value !== "bar") {
    const p = points[idx];
    let slope = 0;
    if (idx > 0 && idx < points.length - 1) {
      slope =
        (points[idx + 1].y - points[idx - 1].y) /
        (points[idx + 1].x - points[idx - 1].x);
    } else if (idx === 0 && points.length > 1) {
      slope = (points[1].y - points[0].y) / (points[1].x - points[0].x);
    } else if (idx === points.length - 1 && points.length > 1) {
      slope =
        (points[idx].y - points[idx - 1].y) /
        (points[idx].x - points[idx - 1].x);
    }

    const b = p.y - slope * p.x;
    tangentSlope.value = slope;
    tangentB.value = b;
    if (slope !== 0) tangentIntercept.value = -b / slope;

    const xMin = Math.min(...points.map((pt) => pt.x));
    const xMax = Math.max(...points.map((pt) => pt.x));
    const drawXMin = xMin - (xMax - xMin) * 0.5;
    const drawXMax = xMax + (xMax - xMin) * 0.5;

    datasets.push({
      label: "Касательная",
      data: [
        { x: drawXMin, y: slope * drawXMin + b },
        { x: drawXMax, y: slope * drawXMax + b },
      ],
      borderColor: "#2ca02c",
      borderDash: [3, 3],
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
      pointRadius: 8,
      pointHoverRadius: 10,
      parsing: false,
      showLine: false,
      type: "scatter",
    });
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
          title: { display: true, text: "Ось X" },
          grid: { color: "#eef2f6" },
        },
        y: {
          type: "linear",
          title: { display: true, text: "Ось Y" },
          grid: { color: "#eef2f6" },
          beginAtZero: chartType.value === "bar",
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: { usePointStyle: true, padding: 20 },
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: 10,
          titleFont: { size: 13 },
          bodyFont: { size: 13 },
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === "Данные")
                return `X: ${formatDisplay(ctx.raw.x || ctx.label)}, Y: ${formatDisplay(ctx.raw.y || ctx.parsed.y)}`;
              if (ctx.dataset.label === "Пересечение с Y")
                return `Точка пересечения: (0, ${formatDisplay(ctx.raw.y)})`;
              return ctx.dataset.label;
            },
          },
        },
      },
    },
  });
};

watch(tangentIndex, () => {
  predictX.value = 0;
});
watch(chartType, () => {
  tangentIndex.value = "-1";
  showTrendline.value = false;
});

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<style scoped>
.card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-family: system-ui, sans-serif;
}
.input-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.toggle-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid #e0e0e0;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}
.toggle-btn:hover {
  border-color: #1f77b4;
  background: #f0f7ff;
}
.toggle-btn.active {
  border-color: #1f77b4;
  background: #1f77b4;
  color: #fff;
}

.step {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
.step label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  color: #333;
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
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
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
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.point-num {
  font-weight: 600;
  color: #555;
  font-size: 0.9em;
  min-width: 40px;
}
.input-coord {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}
.paste-area {
  width: 100%;
  padding: 10px;
  font-family: monospace;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: vertical;
  box-sizing: border-box;
}
.paste-area:focus {
  outline: none;
  border-color: #1f77b4;
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
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-primary {
  background: #1f77b4;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #1a669b;
}
.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}
.btn-outline:hover {
  background: #6c757d;
  color: #fff;
}

.chart-type-selector {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
}
.chart-type-selector label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #333;
}
.type-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.type-btn {
  padding: 10px 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.type-btn:hover {
  border-color: #1f77b4;
  background: #f0f7ff;
}
.type-btn.active {
  border-color: #1f77b4;
  background: #1f77b4;
  color: #fff;
  box-shadow: 0 2px 8px rgba(31, 119, 180, 0.3);
}

.chart-box {
  position: relative;
  height: 450px;
  width: 100%;
  margin: 20px 0;
  background: #fff;
  border: 1px solid #eef2f6;
  border-radius: 8px;
}
.analysis-panel {
  background: #f0f7ff;
  border: 1px solid #b3d4ff;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.analysis-panel h3 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  color: #0056b3;
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
  border: 1px solid #ccc;
  min-width: 180px;
}
.tangent-results {
  margin-top: 15px;
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #2ca02c;
}
.result-row {
  margin: 6px 0;
  font-size: 0.95em;
  color: #333;
}
.highlight {
  font-weight: bold;
  color: #0056b3;
  margin-left: 5px;
}
.marker-hint {
  font-size: 0.85em;
  color: #e377c2;
  margin-left: 8px;
}
.prediction {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ddd;
}
.input-predict {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.arrow {
  font-weight: bold;
  color: #666;
}
.note {
  margin-top: 10px;
  font-size: 0.85em;
  color: #666;
  background: #fff8e1;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}
</style>
