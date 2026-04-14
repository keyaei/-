const STORAGE_KEY = "bath_stamp_app_data_v3";
const SETTINGS_PASSWORD = "keyaei1226329";

const defaultData = {
  settings: {
    startTime: "20:00",
    endTime: "22:30",
    rewards: [
      { name: "コンビニスイーツ", cost: 10 },
      { name: "カフェドリンク", cost: 20 },
      { name: "ちょっと良いごはん", cost: 30 }
    ]
  },
  records: {
    /*
      "2026-04-14": { recordedAt: "21:20" }
    */
  },
  spentBaselineSuccessCount: 0
};

let appData = loadData();
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

const rewardNameTextEls = [
  document.getElementById("reward1-name-text"),
  document.getElementById("reward2-name-text"),
  document.getElementById("reward3-name-text")
];
const rewardCostTextEls = [
  document.getElementById("reward1-cost-text"),
  document.getElementById("reward2-cost-text"),
  document.getElementById("reward3-cost-text")
];
const rewardMessageEl = document.getElementById("reward-message");
const exchangeButtons = [
  document.getElementById("exchange-button-1"),
  document.getElementById("exchange-button-2"),
  document.getElementById("exchange-button-3")
];

const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const rewardNameInputs = [
  document.getElementById("reward1-name"),
  document.getElementById("reward2-name"),
  document.getElementById("reward3-name")
];
const rewardCostInputs = [
  document.getElementById("reward1-cost"),
  document.getElementById("reward2-cost"),
  document.getElementById("reward3-cost")
];
const settingsPasswordInput = document.getElementById("settings-password");
const saveSettingsButton = document.getElementById("save-settings-button");
const settingsMessageEl = document.getElementById("settings-message");

const rewardModalOverlay = document.getElementById("reward-modal-overlay");
const rewardModalText = document.getElementById("reward-modal-text");
const rewardModalClose = document.getElementById("reward-modal-close");

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return deepClone(defaultData);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      settings: {
        startTime: parsed.settings?.startTime || defaultData.settings.startTime,
        endTime: parsed.settings?.endTime || defaultData.settings.endTime,
        rewards: normalizeRewards(parsed.settings?.rewards)
      },
      records: parsed.records || {},
      spentBaselineSuccessCount: Number.isInteger(parsed.spentBaselineSuccessCount)
        ? parsed.spentBaselineSuccessCount
        : 0
    };
  } catch (error) {
    return deepClone(defaultData);
  }
}

function normalizeRewards(rewards) {
  const fallback = deepClone(defaultData.settings.rewards);

  if (!Array.isArray(rewards) || rewards.length < 3) {
    return fallback;
  }

  return rewards.slice(0, 3).map((reward, index) => ({
    name: typeof reward?.name === "string" && reward.name.trim()
      ? reward.name.trim()
      : fallback[index].name,
    cost: Number.isInteger(Number(reward?.cost)) && Number(reward.cost) > 0
      ? Number(reward.cost)
      : fallback[index].cost
  }));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getCurrentTimeString() {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function timeToMinutes(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  return hour * 60 + minute;
}

function compareDateKeys(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function getRecordForDate(dateKey) {
  return appData.records[dateKey] || null;
}

function getStatusFromRecordedAt(recordedAt) {
  const recordedMinutes = timeToMinutes(recordedAt);
  const startMinutes = timeToMinutes(appData.settings.startTime);
  const endMinutes = timeToMinutes(appData.settings.endTime);

  return recordedMinutes >= startMinutes && recordedMinutes <= endMinutes
    ? "success"
    : "failure";
}

function getDateStatus(dateKey) {
  const todayKey = getTodayKey();
  const record = getRecordForDate(dateKey);

  if (record?.recordedAt) {
    return getStatusFromRecordedAt(record.recordedAt);
  }

  if (compareDateKeys(dateKey, todayKey) < 0) {
    return "failure";
  }

  if (dateKey === todayKey) {
    const nowMinutes = timeToMinutes(getCurrentTimeString());
    const endMinutes = timeToMinutes(appData.settings.endTime);

    if (nowMinutes > endMinutes) {
      return "failure";
    }
  }

  return "pending";
}

function getTodayRecord() {
  return getRecordForDate(getTodayKey());
}

function recordBath() {
  const todayKey = getTodayKey();

  if (appData.records[todayKey]) {
    homeMessageEl.textContent = "今日はすでに記録済みです。時間設定を変えると判定は自動で再計算されます。";
    return;
  }

  appData.records[todayKey] = {
    recordedAt: getCurrentTimeString()
  };

  saveData();
  homeMessageEl.textContent = "記録しました。現在の設定時間で判定しています。";
  renderAll();
}

function getAllRecordedDateKeys() {
  return Object.keys(appData.records).sort();
}

function getTotalSuccessDays() {
  return getAllRecordedDateKeys().filter((dateKey) => getDateStatus(dateKey) === "success").length;
}

function getMonthlySuccessDays(year, month) {
  return getAllRecordedDateKeys().filter((dateKey) => {
    const status = getDateStatus(dateKey);
    if (status !== "success") return false;

    const [y, m] = dateKey.split("-").map(Number);
    return y === year && m === month;
  }).length;
}

function getStampStock() {
  const totalSuccess = getTotalSuccessDays();
  return Math.max(0, totalSuccess - appData.spentBaselineSuccessCount);
}

function getStreakDays() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 3650; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = formatDateKey(checkDate);
    const status = getDateStatus(key);

    if (status === "success") {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function updateHome() {
  const currentTime = getCurrentTimeString();
  const todayKey = getTodayKey();
  const todayRecord = getTodayRecord();
  const todayStatus = getDateStatus(todayKey);

  currentTimeEl.textContent = currentTime;
  timeRangeTextEl.textContent = `${appData.settings.startTime} 〜 ${appData.settings.endTime}`;

  if (!todayRecord) {
    todayRecordedTimeEl.textContent = "-";
  } else {
    todayRecordedTimeEl.textContent = todayRecord.recordedAt;
  }

  if (todayStatus === "success") {
    todayStatusTextEl.textContent = "達成 🛁";
  } else if (todayStatus === "failure") {
    todayStatusTextEl.textContent = "失敗 ✕";
  } else {
    todayStatusTextEl.textContent = "未記録";
  }

  bathButton.disabled = !!todayRecord;

  stampStockEl.textContent = getStampStock();
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
    const status = getDateStatus(dateKey);

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

    if (status === "success") {
      markEl.textContent = "🛁";
    } else if (status === "failure") {
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
  const stock = getStampStock();
  rewardStampStockEl.textContent = stock;

  appData.settings.rewards.forEach((reward, index) => {
    rewardNameTextEls[index].textContent = reward.name;
    rewardCostTextEls[index].textContent = reward.cost;
    exchangeButtons[index].disabled = stock < reward.cost;
  });
}

function updateSettings() {
  startTimeInput.value = appData.settings.startTime;
  endTimeInput.value = appData.settings.endTime;

  appData.settings.rewards.forEach((reward, index) => {
    rewardNameInputs[index].value = reward.name;
    rewardCostInputs[index].value = reward.cost;
  });
}

function openRewardModal(rewardName) {
  rewardModalText.textContent = `「${rewardName}」と交換しました！`;
  rewardModalOverlay.classList.remove("hidden");
}

function closeRewardModal() {
  rewardModalOverlay.classList.add("hidden");
}

function exchangeReward(index) {
  const reward = appData.settings.rewards[index];
  const stock = getStampStock();

  if (stock < reward.cost) {
    rewardMessageEl.textContent = "スタンプが足りません。";
    return;
  }

  appData.spentBaselineSuccessCount = getTotalSuccessDays();
  saveData();
  rewardMessageEl.textContent = "";
  renderAll();
  openRewardModal(reward.name);
}

function saveSettings() {
  const password = settingsPasswordInput.value;

  if (password !== SETTINGS_PASSWORD) {
    settingsMessageEl.textContent = "パスワードが違います。";
    settingsPasswordInput.value = "";
    return;
  }

  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;

  if (!startTime || !endTime) {
    settingsMessageEl.textContent = "開始時刻と終了時刻を入力してください。";
    return;
  }

  if (timeToMinutes(startTime) > timeToMinutes(endTime)) {
    settingsMessageEl.textContent = "開始時刻は終了時刻より前にしてください。";
    return;
  }

  const rewards = [];

  for (let i = 0; i < 3; i++) {
    const name = rewardNameInputs[i].value.trim();
    const cost = Number(rewardCostInputs[i].value);

    if (!name) {
      settingsMessageEl.textContent = `ごほうび${i + 1}の名前を入力してください。`;
      return;
    }

    if (!Number.isInteger(cost) || cost < 1) {
      settingsMessageEl.textContent = `ごほうび${i + 1}の必要スタンプ数は1以上の整数にしてください。`;
      return;
    }

    rewards.push({ name, cost });
  }

  appData.settings.startTime = startTime;
  appData.settings.endTime = endTime;
  appData.settings.rewards = rewards;

  saveData();
  settingsPasswordInput.value = "";
  settingsMessageEl.textContent = "設定を保存しました。記録済みの日付も新しい時間設定で再判定されます。";
  renderAll();
}

function switchScreen(target) {
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
  updateHome();
  renderCalendar();
  updateReward();
  updateSettings();
}

bathButton.addEventListener("click", recordBath);
saveSettingsButton.addEventListener("click", saveSettings);

exchangeButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    exchangeReward(index);
  });
});

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

rewardModalClose.addEventListener("click", closeRewardModal);

rewardModalOverlay.addEventListener("click", (event) => {
  if (event.target === rewardModalOverlay) {
    closeRewardModal();
  }
});

setInterval(() => {
  renderAll();
}, 30000);

renderAll();
switchScreen("home");
