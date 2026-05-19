// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyD0pX1qDgrE9PfXJugJPxByJr12Fikm3C0",
  authDomain: "measurement-tracker-ba16e.firebaseapp.com",
  projectId: "measurement-tracker-ba16e",
  storageBucket: "measurement-tracker-ba16e.firebasestorage.app",
  messagingSenderId: "730850323255",
  appId: "1:730850323255:web:7f6a081b4d4595a5d708b2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Variables ---
function getLocalYYYYMMDD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

let currentDate = getLocalYYYYMMDD();
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

// --- DOM ---
const todayDateEl = document.getElementById("todayDate");
const habitsList = document.getElementById("habits-list");
const habitHistoryPanel = document.getElementById("habitHistoryPanel");
todayDateEl.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

// --- Load/Update Habits ---
async function loadHabits() {
  const snapshot = await db.collection("habits").orderBy('createdAt', 'asc').get();
  const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  habitsList.innerHTML = habits.map(habit => `
    <div class="habit-item" data-key="${habit.id}">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="habit-checkbox ${habit.completions[currentDate] ? 'completed' : ''}"
             onclick="toggleHabitCompletion('${habit.id}')"></div>
        <span>${habit.name} <span style="color:#aaa;">(Streak: ${habit.streak || 0})</span></span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="habit-edit" onclick="editHabit('${habit.id}')">✎</button>
        <button class="habit-delete" onclick="deleteHabit('${habit.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function addHabit() {
  const habitName = document.getElementById("habit-input").value.trim();
  if (!habitName) return;

  await db.collection("habits").add({
    name: habitName,
    completions: {},
    streak: 0,
    createdAt: new Date()
  });

  document.getElementById("habit-input").value = '';
  loadHabits();
}

async function deleteHabit(id) {
  await db.collection("habits").doc(id).delete();
  loadHabits();
}

async function editHabit(id) {
  const doc = await db.collection("habits").doc(id).get();
  if (!doc.exists) return;

  const habit = doc.data();
  const newName = prompt("Update habit name:", habit.name);
  if (newName === null) return;

  const trimmed = newName.trim();
  if (!trimmed || trimmed === habit.name) return;

  await doc.ref.update({ name: trimmed });
  loadHabits();
}

async function toggleHabitCompletion(id) {
  const doc = await db.collection("habits").doc(id).get();
  if (!doc.exists) return;

  const habit = doc.data();

  if (habit.completions[currentDate]) {
    delete habit.completions[currentDate];
    habit.streak = 0;
  } else {
    habit.completions[currentDate] = true;
    habit.streak = calculateStreak(habit.completions);
  }

  await doc.ref.update(habit);
  loadHabits();
  renderCalendar();
}

function calculateStreak(completions) {
  const dates = Object.keys(completions).sort();
  if (dates.length === 0) return 0;

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const currentDate = new Date(dates[i]);
    const prevDate = new Date(dates[i - 1]);
    if ((currentDate - prevDate) / (1000 * 60 * 60 * 24) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// --- Calendar Modal ---
async function renderCalendar() {
  const fullCalendar = document.getElementById('fullCalendar');
  const snapshot = await db.collection("habits").get();
  const habitDates = snapshot.docs.flatMap(doc => Object.keys(doc.data().completions));

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

  let html = `
    <div class="full-calendar-header">
      <button class="cal-nav" id="prevMonth">&lt;</button>
      <span>${firstDay.toLocaleString('default', { month: 'long' })} ${calendarYear}</span>
      <button class="cal-nav" id="nextMonth">&gt;</button>
    </div>
    <div class="full-calendar-grid">
  `;

  ['S','M','T','W','T','F','S'].forEach(d => {
    html += `<div class="full-calendar-day" style="font-weight:bold;background:#181a1b;">${d}</div>`;
  });

  for (let i = 0; i < startDay; i++) html += `<div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === getLocalYYYYMMDD();
    const isSelected = dateStr === currentDate;
    const hasData = habitDates.includes(dateStr);

    const dayStyle = isSelected
      ? 'background:#6c3483;color:white;border-radius:6px;'
      : isToday
      ? 'background:#4b4f55;color:white;border-radius:6px;'
      : '';

    html += `
      <div class="full-calendar-day" data-date="${dateStr}"
           style="position:relative; ${dayStyle}">
        <p style="margin:0;padding:0;text-align:center;">${d}</p>
        ${hasData ? '<div style="width:6px;height:6px;background:#2ecc71;border-radius:50%;position:absolute;top:4px;right:1px;transform:translateX(-50%)"></div>' : ''}
      </div>
    `;
  }

  html += `</div>`;
  fullCalendar.innerHTML = html;

  // Month navigation
  document.getElementById('prevMonth').onclick = () => {
    calendarMonth--;
    if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; }
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = () => {
    calendarMonth++;
    if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; }
    renderCalendar();
  };

  // Click day to set currentDate
  fullCalendar.querySelectorAll('.full-calendar-day[data-date]').forEach(el => {
    el.onclick = () => {
      currentDate = el.dataset.date;
      todayDateEl.textContent = new Date(currentDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      document.getElementById('calendarModal').style.display = 'none';
      loadHabits();
      renderCalendar();
    };
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const calendarBtn = document.getElementById('calendarBtn');
  const calendarModal = document.getElementById('calendarModal');
  const closeCalendarModal = document.getElementById('closeCalendarModal');
  const addHabitBtn = document.getElementById('add-habit');
  const closeHabitHistoryModal = document.getElementById('closeHabitHistoryModal');
  const habitHistoryModal = document.getElementById('habitHistoryModal');

  // Calendar modal
  if (calendarBtn && calendarModal) {
    calendarBtn.onclick = () => {
      calendarModal.style.display = 'flex';
      renderCalendar();
    };
  }
  if (closeCalendarModal) closeCalendarModal.onclick = () => calendarModal.style.display = 'none';

  // Habit management
  addHabitBtn.onclick = addHabit;

  // Habit history modal
  if (closeHabitHistoryModal) closeHabitHistoryModal.onclick = () => habitHistoryModal.style.display = 'none';
  habitHistoryModal.onclick = (event) => {
    if (event.target === habitHistoryModal) habitHistoryModal.style.display = 'none';
  };

  // Load habits
  loadHabits();
  renderCalendar();
});

// --- Service Worker (PWA) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.error('Service Worker registration failed:', err));
}