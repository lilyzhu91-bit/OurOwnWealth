const DEFAULT_ASSETS = [
  { id: "spy", name: "SPY" },
  { id: "qqq", name: "QQQ" },
  { id: "nikkei", name: "Nikkei" },
  { id: "us_stocks", name: "美股" },
  { id: "jp_stocks", name: "日股" },
  { id: "gold", name: "黄金" },
  { id: "btc", name: "BTC" },
  { id: "eth", name: "ETH" },
  { id: "cash_usd", name: "现金USD" },
  { id: "cash_cny", name: "现金CNY" },
];

const COLORS = [
  "#C9D8E3", // 柔和蓝灰
  "#E3D6C4", // 米色木调
  "#C6D6C3", // 柔和绿灰
  "#E4C9C5", // 柔和粉土
  "#D5C8E4", // 柔和紫灰
  "#DCCFB2", // 浅卡其
  "#C4D0CF", // 青灰
  "#E1C9B8", // 浅杏仁
  "#CBD5C8", // 雾绿色
  "#E6D7D0", // 浅玫瑰灰
  "#D0C4B8", // 暖灰
  "#BECBD7", // 冷灰蓝
  "#D9E0D3", // 淡鼠尾草
  "#E4DED2", // 暖米灰
  "#C7C3D6", // 低饱和淡紫
];

function getColorByIndex(index) {
  if (index < COLORS.length) {
    return COLORS[index];
  }
  const hue = (index * 47) % 360;
  return `hsl(${hue}, 30%, 76%)`;
}

const arcLabelPlugin = {
  id: "arcLabel",
  afterDraw(chart) {
    if (chart.config.type !== "doughnut") return;
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const meta = chart.getDatasetMeta(0);
    const labels = chart.data.labels || [];
    const data = dataset.data || [];
    const total = data.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    if (!total) return;

    ctx.save();
    ctx.font = "10px 'Noto Sans SC', system-ui, sans-serif";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc, index) => {
      const value = data[index];
      if (!arc || !value || value <= 0) return;

      const labelRaw = labels[index] || "";
      const percent = (value / total) * 100;
      let textLabel = labelRaw;
      if (textLabel.length > 5) {
        textLabel = textLabel.slice(0, 5) + "…";
      }
      const text = `${textLabel} ${percent.toFixed(1)}%`;

      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = (arc.outerRadius + arc.innerRadius) / 2;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;

      const metrics = ctx.measureText(text);
      const paddingX = 4;
      const paddingY = 3;
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = 16;

      const boxX = x - boxWidth / 2;
      const boxY = y - boxHeight / 2;

      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle =
        (Array.isArray(dataset.backgroundColor) &&
          dataset.backgroundColor[index]) ||
        "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxWidth - r, boxY);
      ctx.quadraticCurveTo(
        boxX + boxWidth,
        boxY,
        boxX + boxWidth,
        boxY + r
      );
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
      ctx.quadraticCurveTo(
        boxX + boxWidth,
        boxY + boxHeight,
        boxX + boxWidth - r,
        boxY + boxHeight
      );
      ctx.lineTo(boxX + r, boxY + boxHeight);
      ctx.quadraticCurveTo(
        boxX,
        boxY + boxHeight,
        boxX,
        boxY + boxHeight - r
      );
      ctx.lineTo(boxX, boxY + r);
      ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#3b3226";
      ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
    });

    ctx.restore();
  },
};

if (typeof Chart !== "undefined" && Chart.register) {
  Chart.register(arcLabelPlugin);
}

let assetRows = [];
let chartInstance = null;
let fxData = null; // { base: 'EUR', rates: { ... } }
let currentBaseCurrency = "CNY";

const LONG_PRESS_MS = 400;
const MOVE_CANCEL_PX = 10;

document.addEventListener("DOMContentLoaded", () => {
  const assetListEl = document.getElementById("assetList");
  let dragState = null;
  const totalAmountEl = document.getElementById("totalAmount");
  const assetTableBodyEl = document.getElementById("assetTableBody");
  const downloadChartButton = document.getElementById("downloadChartButton");
  const resetButton = document.getElementById("resetButton");
  const addCustomButton = document.getElementById("addCustomButton");
  const customNameInput = document.getElementById("customName");
  const chartCanvas = document.getElementById("assetChart");
  const baseCurrencySelect = document.getElementById("baseCurrencySelect");

  if (baseCurrencySelect) {
    currentBaseCurrency = baseCurrencySelect.value || "CNY";
    baseCurrencySelect.addEventListener("change", () => {
      currentBaseCurrency = baseCurrencySelect.value || "CNY";
      recalcAndRender();
    });
  }

  function createAssetRow(asset, isDefault = false) {
    const rowEl = document.createElement("div");
    rowEl.className = "asset-row" + (isDefault ? " default-row" : "");
    rowEl.dataset.assetId = asset.id;

    const nameEl = document.createElement("div");
    nameEl.className = "asset-name";
    nameEl.innerHTML = `
      <span class="asset-name-label">${asset.name}</span>
    `;

    const amountWrapper = document.createElement("div");
    amountWrapper.className = "amount-input-wrapper";

    const unitSelect = document.createElement("select");
    unitSelect.className = "unit-select";
    const unitOptions = [
      { value: "", label: "选择单位" },
      { value: "CNY", label: "人民币 (CNY)" },
      { value: "USD", label: "美元 (USD)" },
      { value: "JPY", label: "日元 (JPY)" },
      { value: "HKD", label: "港币 (HKD)" },
      { value: "EUR", label: "欧元 (EUR)" },
      { value: "BTC", label: "BTC" },
      { value: "ETH", label: "ETH" },
      { value: "OTHER", label: "其他" },
    ];
    unitOptions.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      unitSelect.appendChild(optionEl);
    });

    const amountInput = document.createElement("input");
    amountInput.type = "text";
    amountInput.inputMode = "decimal";
    amountInput.placeholder = "输入金额";
    amountInput.className = "input amount-input";
    const prefix = document.createElement("span");
    prefix.className = "amount-prefix";
    prefix.textContent = "";
    amountWrapper.appendChild(unitSelect);
    amountWrapper.appendChild(amountInput);

    const percentEl = document.createElement("div");
    percentEl.className = "percentage-badge zero";
    percentEl.textContent = "0.00%";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "icon-button";
    removeButton.title = "删除该资产项目";
    removeButton.textContent = "×";

    rowEl.appendChild(nameEl);
    rowEl.appendChild(amountWrapper);
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";
    wrapper.appendChild(percentEl);
    wrapper.appendChild(removeButton);
    rowEl.appendChild(wrapper);

    const rowData = {
      id: asset.id,
      name: asset.name,
      amount: 0,
      isDefault,
      elements: {
        rowEl,
        unitSelect,
        amountInput,
        percentEl,
        removeButton,
      },
    };

    rowEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest("input, select, button")) return;
      const isTouch = e.pointerType === "touch";
      const delay = isTouch ? LONG_PRESS_MS : 0;
      const pointerId = e.pointerId;
      const startY = e.clientY;
      const startX = e.clientX;
      let timerId = setTimeout(() => {
        timerId = null;
        startDrag(rowData, rowEl, pointerId);
      }, delay);
      const cancel = () => {
        if (timerId != null) {
          clearTimeout(timerId);
          timerId = null;
        }
        rowEl.removeEventListener("pointermove", onPointerMoveBefore);
        rowEl.removeEventListener("pointerup", cancel);
        rowEl.removeEventListener("pointercancel", cancel);
      };
      const onPointerMoveBefore = (e) => {
        if (e.pointerId !== pointerId) return;
        const dy = e.clientY - startY;
        const dx = e.clientX - startX;
        if (dy * dy + dx * dx > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancel();
      };
      rowEl.addEventListener("pointermove", onPointerMoveBefore);
      rowEl.addEventListener("pointerup", cancel);
      rowEl.addEventListener("pointercancel", cancel);
    });

    amountInput.addEventListener("input", () => {
      const raw = amountInput.value.replace(/,/g, "").trim();
      const value = parseFloat(raw);
      rowData.amount = isNaN(value) || value < 0 ? 0 : value;
      recalcAndRender();
    });

    amountInput.addEventListener("blur", () => {
      if (!amountInput.value) return;
      const raw = amountInput.value.replace(/,/g, "").trim();
      const value = parseFloat(raw);
      if (isNaN(value) || value < 0) {
        amountInput.value = "";
        rowData.amount = 0;
        recalcAndRender();
        return;
      }
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      amountInput.value = formatted;
    });

    removeButton.addEventListener("click", () => {
      assetRows = assetRows.filter((r) => r !== rowData);
      rowEl.remove();
      recalcAndRender();
    });

    assetRows.push(rowData);
    assetListEl.appendChild(rowEl);
  }

  function startDrag(rowData, rowEl, pointerId) {
    if (dragState) return;
    dragState = { rowData, rowEl, pointerId };
    rowEl.classList.add("dragging");
    rowEl.setPointerCapture(pointerId);
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    e.preventDefault();
    const allRows = [...assetListEl.querySelectorAll(".asset-row")];
    const dragEl = dragState.rowEl;
    const otherRows = allRows.filter((el) => el !== dragEl);
    const clientY = e.clientY;
    let insertIndex = 0;
    for (let i = 0; i < otherRows.length; i++) {
      const rect = otherRows[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    const beforeEl = otherRows[insertIndex] || null;
    if (beforeEl) assetListEl.insertBefore(dragEl, beforeEl);
    else assetListEl.appendChild(dragEl);
  }

  function onDragEnd(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);
    dragState.rowEl.classList.remove("dragging");
    try {
      dragState.rowEl.releasePointerCapture(dragState.pointerId);
    } catch (_) {}
    reorderAssetRowsByDom();
    dragState = null;
  }

  function reorderAssetRowsByDom() {
    const ordered = [];
    const rowEls = assetListEl.querySelectorAll(".asset-row");
    rowEls.forEach((el) => {
      const id = el.dataset.assetId;
      const found = assetRows.find((r) => r.id === id);
      if (found) ordered.push(found);
    });
    if (ordered.length === assetRows.length) {
      assetRows = ordered;
      recalcAndRender();
    }
  }

  function convertToBaseCurrency(amount, unit, baseCurrency) {
    if (!amount || amount <= 0) return 0;
    if (!fxData || !fxData.rates) return amount;

    const supported = ["CNY", "USD", "EUR", "JPY", "HKD"];
    if (!unit || unit === "OTHER" || !supported.includes(baseCurrency)) {
      return amount;
    }

    const rates = fxData.rates;

    let amountInEUR;
    if (unit === fxData.base) {
      amountInEUR = amount;
    } else if (unit === "EUR") {
      amountInEUR = amount;
    } else if (rates[unit]) {
      amountInEUR = amount / rates[unit];
    } else {
      return amount;
    }

    if (baseCurrency === "EUR") {
      return amountInEUR;
    }

    if (baseCurrency === fxData.base) {
      return amountInEUR * (rates[baseCurrency] || 1);
    }

    if (rates[baseCurrency]) {
      return amountInEUR * rates[baseCurrency];
    }

    return amount;
  }

  function recalcAndRender() {
    const effectiveValues = assetRows.map((row) =>
      convertToBaseCurrency(
        row.amount,
        row.elements.unitSelect.value,
        currentBaseCurrency
      )
    );
    const total = effectiveValues.reduce((sum, v) => sum + v, 0);
    totalAmountEl.textContent = total.toFixed(2);

    assetTableBodyEl.innerHTML = "";

    if (total <= 0) {
      assetRows.forEach((row) => {
        row.elements.percentEl.textContent = "0.00%";
        row.elements.percentEl.classList.add("zero");
      });

      if (chartInstance) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.update();
      }
      return;
    }

    const labels = [];
    const data = [];

    assetRows.forEach((row, index) => {
      const effectiveAmount = effectiveValues[index] || 0;
      if (effectiveAmount <= 0) {
        row.elements.percentEl.textContent = "0.00%";
        row.elements.percentEl.classList.add("zero");
        return;
      }

      const percent = (effectiveAmount / total) * 100;
      row.elements.percentEl.innerHTML = `<strong>${percent.toFixed(2)}%</strong>`;
      row.elements.percentEl.classList.remove("zero");

      labels.push(row.name);
      data.push(effectiveAmount);

      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.className = "asset-table-name";
      nameTd.textContent = row.name;
      const amountTd = document.createElement("td");
      amountTd.className = "asset-table-amount";
      const unitValue = row.elements.unitSelect.value;
      const unitLabel =
        row.elements.unitSelect.options[row.elements.unitSelect.selectedIndex]
          ?.textContent || "";
      const displayAmount = row.amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      amountTd.textContent =
        displayAmount + (unitValue ? ` ${unitLabel}` : "");
      const percentTd = document.createElement("td");
      percentTd.className = "asset-table-percent";
      percentTd.textContent = percent.toFixed(2) + "%";
      tr.appendChild(nameTd);
      tr.appendChild(amountTd);
      tr.appendChild(percentTd);
      assetTableBodyEl.appendChild(tr);
    });

    const backgroundColors = labels.map((_, idx) => getColorByIndex(idx));

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.data.datasets[0].backgroundColor = backgroundColors;
      chartInstance.update();
    } else {
      chartInstance = new Chart(chartCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: backgroundColors,
              borderWidth: 1,
              borderColor: "#020617",
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const label = context.label || "";
                  const value = context.parsed || 0;
                  const share =
                    total > 0 ? ((value / total) * 100).toFixed(2) : "0.00";
                  return `${label}: ${value.toFixed(2)}（${share}%）`;
                },
              },
            },
          },
          layout: {
            padding: 8,
          },
          cutout: "55%",
        },
      });
    }
  }

  function handleDownloadChart() {
    if (!chartInstance) {
      recalcAndRender();
    }
    if (!chartInstance) {
      alert("请先输入资产金额，以生成图表后再下载。");
      return;
    }

    const area = document.getElementById("chartDownloadArea");
    if (!area || typeof html2canvas === "undefined") {
      alert("当前环境暂不支持区域截图导出，请稍后重试。");
      return;
    }

    html2canvas(area, {
      backgroundColor: "#ffffff",
      scale: window.devicePixelRatio || 2,
    }).then((canvas) => {
      const link = document.createElement("a");
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      link.download = `OurOwnWealth-资产占比与列表-${yyyy}${mm}${dd}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  function handleReset() {
    if (!confirm("确认清空本次所有输入？（数据不会被保存）")) {
      return;
    }
    assetRows.forEach((row) => {
      if (row.elements && row.elements.rowEl) {
        row.elements.rowEl.remove();
      }
    });
    assetRows = [];
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    DEFAULT_ASSETS.forEach((asset) => createAssetRow(asset, true));
    recalcAndRender();
  }

  function handleAddCustom() {
    const name = customNameInput.value.trim();
    if (!name) {
      customNameInput.focus();
      return;
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    createAssetRow({ id, name }, false);
    customNameInput.value = "";
    customNameInput.focus();
  }

  DEFAULT_ASSETS.forEach((asset) => createAssetRow(asset, true));
  recalcAndRender();

  fetch("https://api.frankfurter.app/latest")
    .then((res) => res.json())
    .then((data) => {
      if (data && data.rates) {
        fxData = data;
        recalcAndRender();
      }
    })
    .catch(() => {
      fxData = null;
    });

  downloadChartButton.addEventListener("click", handleDownloadChart);
  resetButton.addEventListener("click", handleReset);
  addCustomButton.addEventListener("click", handleAddCustom);
  customNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  });
});

