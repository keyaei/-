const STORAGE_KEY = "bath_stamp_app_data_v1";

const defaultData = {
  settings: {
    startTime: "20:00",
    endTime: "22:30",
    rewardName: "コンビニスイーツ",
    rewardCost: 10
  },
  stampStock: 0,
  records: {
    // "2026-04-14": { status: "success" | "failure", recordedAt: "21:20" }
  }
};

let appData = loadData();
let currentScreen = "home";
let calendarDate = new Date();

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-button");

const currentTimeEl = document.getElementById("current-time");
const timeRangeTextEl = document.getElementById("time-range-text");
const todayStatusTextEl = document.getElementById("today-status-text");
const todayRecordedTimeEl = document.getElementById("today-recorded-time");
const bathButton = document.getElementById("bath-button");
const homeMessageEl = document.getElementById("home-message");

const stampStockEl = document.getElementById("stamp-stock");
const rewardStampStockEl = document.getElementById("reward-stamp-stock");
const totalSuccessDaysEl = document.getElementById("total-success-days");
const streakDaysEl = document.getElementById("streak-days");
const monthlySuccessDaysEl = document.getElementById("monthly-success-days");

const calendarTitleEl = document.getElementById("calendar-title");
const calendarGridEl = document.getElementById("calendar-grid");
const prevMonthButton = document.getElementById("prev-month-button");
const nextMonthButton = document.getElementById("next-month-button");

const rewardCostTextEl = document.getElementById("reward-cost-text");
const rewardNameTextEl = document.getElementById("reward-name-text");
const exchangeButton = document.getElementById("exchange-button");
const rewardMessageEl = document.getElementById("reward-message");

const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const rewardNameInput = document.getElementById("reward-name");
const rewardCostInput = document.getElementById("reward-cost");
const saveSettingsButton = document.getElementById("save-settings-button");
const settingsMessageEl = document.getElementById("settings-message");

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);

  try {
    const parsed = JSON.parse(raw);
    return {
      settings: {
        ...defaultData.settings,
        ...(parsed.settings || {})
      },
      stampStock: parsed.stampStock ?? 0,
      records: parsed.records || {}
    };
  } catch (error) {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function structuredClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  return hour * 60 + minute;
}

function getTodayRecord() {
  return appData.records[getTodayKey()] || null;
}

function isWithinAllowedTime(timeStr) {
  const nowMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(appData.settings.startTime);
  const endMinutes = timeToMinutes(appData.settings.endTime);

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

function judgeMissedDays() {
  const now = new Date();
  const todayKey = getTodayKey();
  const endMinutes = timeToMinutes(appData.settings.endTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes <= endMinutes) return;

  if (!appData.records[todayKey]) {
    appData.records[todayKey] = {
      status: "failure",
      recordedAt: "-"
    };
    saveData();
  }
}

function recordBath() {
  const todayKey = getTodayKey();
  const currentTime = getCurrentTimeString();

  if (appData.records[todayKey]) {
    homeMessageEl.textContent = "今日はすでに記録済みです。";
    return;
  }

  if (isWithinAllowedTime(currentTime)) {
    appData.records[todayKey] = {
      status: "success",
      recordedAt: currentTime
    };
    appData.stampStock += 1;
    homeMessageEl.textContent = "達成です。スタンプを1個追加しました。";
  } else {
    appData.records[todayKey] = {
      status: "failure",
      recordedAt: currentTime
    };
    homeMessageEl.textContent = "判定時間外のため失敗になりました。";
  }

  saveData();
  renderAll();
}

function getTotalSuccessDays() {
  return Object.values(appData.records).filter(
    (record) => record.status === "success"
  ).length;
}

function getMonthlySuccessDays(year, month) {
  return Object.entries(appData.records).filter(([dateKey, record]) => {
    if (record.status !== "success") return false;
    const [y, m] = dateKey.split("-").map(Number);
    return y === year && m === month;
  }).length;
}

function getStreakDays() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 3650; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = formatDateKey(checkDate);
    const record = appData.records[key];

    if (record && record.status === "success") {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function updateHome() {
  const nowTime = getCurrentTimeString();
  const todayRecord = getTodayRecord();

  currentTimeEl.textContent = nowTime;
  timeRangeTextEl.textContent = `${appData.settings.startTime} 〜 ${appData.settings.endTime}`;

  if (!todayRecord) {
    todayStatusTextEl.textContent = "未記録";
    todayRecordedTimeEl.textContent = "-";
  } else if (todayRecord.status === "success") {
    todayStatusTextEl.textContent = "達成 🛁";
    todayRecordedTimeEl.textContent = todayRecord.recordedAt;
  } else {
    todayStatusTextEl.textContent = "失敗 ✕";
    todayRecordedTimeEl.textContent = todayRecord.recordedAt;
  }

  bathButton.disabled = !!todayRecord;

  stampStockEl.textContent = appData.stampStock;
  totalSuccessDaysEl.textContent = getTotalSuccessDays();
  streakDaysEl.textContent = getStreakDays();

  const now = new Date();
  monthlySuccessDaysEl.textContent = getMonthlySuccessDays(
    now.getFullYear(),
    now.getMonth() + 1
  );
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarTitleEl.textContent = `${year}年${month + 1}月`;
  calendarGridEl.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const todayKey = getTodayKey();

  for (let i = 0; i < startWeekday; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    calendarGridEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const record = appData.records[dateKey];

    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (dateKey === todayKey) {
      cell.classList.add("today");
    }

    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.textContent = day;

    const markEl = document.createElement("div");
    markEl.className = "calendar-mark";

    if (record?.status === "success") {
      markEl.textContent = "🛁";
    } else if (record?.status === "failure") {
      markEl.textContent = "✕";
    } else {
      markEl.textContent = "";
    }

    cell.appendChild(dayEl);
    cell.appendChild(markEl);
    calendarGridEl.appendChild(cell);
  }
}

function updateReward() {
  rewardStampStockEl.textContent = appData.stampStock;
  rewardCostTextEl.textContent = appData.settings.rewardCost;
  rewardNameTextEl.textContent = appData.settings.rewardName;
}

function updateSettings() {
  startTimeInput.value = appData.settings.startTime;
  endTimeInput.value = appData.settings.endTime;
  rewardNameInput.value = appData.settings.rewardName;
  rewardCostInput.value = appData.settings.rewardCost;
}

function exchangeReward() {
  const cost = Number(appData.settings.rewardCost);

  if (appData.stampStock < cost) {
    rewardMessageEl.textContent = "スタンプが足りません。";
    return;
  }

  appData.stampStock = 0;
  saveData();
  rewardMessageEl.textContent = `「${appData.settings.rewardName}」に交換しました。所持スタンプは0になりました。`;
  renderAll();
}

function saveSettings() {
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  const rewardName = rewardNameInput.value.trim();
  const rewardCost = Number(rewardCostInput.value);

  if (!startTime || !endTime) {
    settingsMessageEl.textContent = "開始時刻と終了時刻を入力してください。";
    return;
  }

  if (timeToMinutes(startTime) > timeToMinutes(endTime)) {
    settingsMessageEl.textContent = "開始時刻は終了時刻より前にしてください。";
    return;
  }

  if (!rewardName) {
    settingsMessageEl.textContent = "ごほうび名を入力してください。";
    return;
  }

  if (!Number.isInteger(rewardCost) || rewardCost < 1) {
    settingsMessageEl.textContent = "必要スタンプ数は1以上の整数にしてください。";
    return;
  }

  appData.settings.startTime = startTime;
  appData.settings.endTime = endTime;
  appData.settings.rewardName = rewardName;
  appData.settings.rewardCost = rewardCost;

  saveData();
  settingsMessageEl.textContent = "設定を保存しました。";
  renderAll();
}

function switchScreen(target) {
  currentScreen = target;

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  navButtons.forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(`screen-${target}`).classList.add("active");
  document.querySelector(`.nav-button[data-target="${target}"]`).classList.add("active");
}

function renderAll() {
  judgeMissedDays();
  updateHome();
  renderCalendar();
  updateReward();
  updateSettings();
}

bathButton.addEventListener("click", recordBath);
exchangeButton.addEventListener("click", exchangeReward);
saveSettingsButton.addEventListener("click", saveSettings);

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchScreen(button.dataset.target);
  });
});

prevMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

setInterval(() => {
  renderAll();
}, 1000 * 30);

renderAll();
switchScreen("home");
