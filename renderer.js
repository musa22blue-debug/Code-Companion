window.onerror = function(message, source, lineno, colno, error) {
    document.getElementById('error-modal').style.display = 'block';
    document.getElementById('error-text').innerText = `${message}\n\nLine: ${lineno}\n${error ? error.stack : ''}`;
    return false;
};

const { ipcRenderer } = require('electron');

const consoleDiv = document.getElementById('dev-console');
const logArea = document.getElementById('console-logs');
const dragHandle = document.getElementById('console-header');
window.addEventListener('keydown', (e) => { if (e.key === 'F9') consoleDiv.classList.toggle('hidden'); });

let isDragging = false, offsetX = 0, offsetY = 0;
dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - consoleDiv.getBoundingClientRect().left;
    offsetY = e.clientY - consoleDiv.getBoundingClientRect().top;
    consoleDiv.style.bottom = 'auto'; consoleDiv.style.right = 'auto';
    dragHandle.style.cursor = 'grabbing';
});
document.addEventListener('mousemove', (e) => {
    if (isDragging) { consoleDiv.style.left = (e.clientX - offsetX) + 'px'; consoleDiv.style.top = (e.clientY - offsetY) + 'px'; }
});
document.addEventListener('mouseup', () => { isDragging = false; dragHandle.style.cursor = 'grab'; });

const oldLog = console.log;
console.log = function(...args) {
    oldLog.apply(console, args);
    if (logArea) {
        const msg = document.createElement('div');
        msg.innerText = `> ${args.join(' ')}`;
        logArea.appendChild(msg); logArea.scrollTop = logArea.scrollHeight;
    }
};

let state;
try { state = JSON.parse(localStorage.getItem('ccState')); } catch (e) { state = null; }
if (!state) {
    state = { 
        tasks: [], notes: '', theme: 'dark', accentColor: 'green', streak: 0, timerDuration: 25, version: '10.0.0', userName: '',
        onboarding: { completed: false, timer: false, tasks: false, notes: false, playground: false, settings: false },
        glassEffect: false
    };
}
if (!state.onboarding) state.onboarding = { completed: false, timer: false, tasks: false, notes: false, playground: false, settings: false };
if (state.userName === undefined) state.userName = '';
if (state.glassEffect === undefined) state.glassEffect = false;
if (!state.accentColor) state.accentColor = 'green';
if (state.theme !== 'light' && state.theme !== 'dark') state.theme = 'dark';

function saveState() { localStorage.setItem('ccState', JSON.stringify(state)); }

function applyTheme() {
    const body = document.body;
    body.className = ''; 
    
    if (state.glassEffect) { body.classList.add('theme-glass'); } else { body.classList.add(`theme-${state.theme}`); }
    body.classList.add(`accent-${state.accentColor}`);
    
    document.getElementById('theme-toggle').checked = (state.theme === 'dark');
    document.getElementById('glass-toggle').checked = state.glassEffect;

    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
    const activeOpt = document.querySelector(`.${state.accentColor}-opt`);
    if (activeOpt) activeOpt.classList.add('active');
    
    // Sync Titlebar
    const isDark = state.theme === 'dark' || state.glassEffect;
    if (window.ipcRenderer) window.ipcRenderer.send('update-titlebar', { color: isDark ? '#09090B' : '#FFFFFF', symbolColor: isDark ? '#ffffff' : '#000000' });
}

function toggleTheme() { state.theme = document.getElementById('theme-toggle').checked ? 'dark' : 'light'; saveState(); applyTheme(); }
function toggleGlass() { state.glassEffect = document.getElementById('glass-toggle').checked; saveState(); applyTheme(); }
function setAccent(color, event) { state.accentColor = color; saveState(); applyTheme(); }

function updateName() {
    const newName = document.getElementById('settings-name-input').value.trim();
    if (newName) { state.userName = newName; saveState(); updateDashboard(); }
}

function openResetModal() { document.getElementById('reset-modal').classList.remove('hidden'); }
function closeResetModal() { document.getElementById('reset-modal').classList.add('hidden'); }
function executeReset() { localStorage.clear(); window.location.reload(); }

let previewingTheme = 'dark';
function openOnboarding() {
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('app-container').style.opacity = 0.1;
    document.getElementById('ob-step-1').classList.add('active');
    document.getElementById('ob-step-2').classList.remove('active');
    document.getElementById('ob-step-3').classList.remove('active');
    document.querySelectorAll('.ob-dot').forEach(d => d.classList.remove('active'));
    document.getElementById('dot-1').classList.add('active');
    document.getElementById('name-input').value = state.userName || '';
    document.getElementById('name-input').style.borderColor = 'var(--border)';
    document.getElementById('name-input').placeholder = "Enter your name...";
    previewingTheme = state.theme;
    updateThemeCards();
}

function previewTheme(theme) {
    previewingTheme = theme;
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-glass');
    document.body.classList.add(`theme-${theme}`);
    updateThemeCards();
}

function updateThemeCards() {
    document.querySelectorAll('.theme-card').forEach(el => el.classList.remove('active'));
    if (previewingTheme === 'light') document.getElementById('theme-card-light').classList.add('active');
    if (previewingTheme === 'dark') document.getElementById('theme-card-dark').classList.add('active');
}

window.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA', 'CODE'].includes(document.activeElement.tagName) || document.activeElement.classList.contains('CodeMirror');
    if (e.key.toLowerCase() === 'p' && !isTyping) openOnboarding();
});

function nextObStep(step) {
    if (step === 2) {
        const nameInput = document.getElementById('name-input');
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.style.borderColor = '#EF4444';
            nameInput.placeholder = "Name is required!";
            setTimeout(() => { nameInput.style.borderColor = 'var(--border)'; nameInput.placeholder = "Enter your name..."; }, 2000);
            return;
        }
        state.userName = name; saveState();
        document.getElementById('ob-step-1').classList.remove('active');
        document.getElementById('ob-step-2').classList.add('active');
        document.getElementById('dot-1').classList.remove('active');
        document.getElementById('dot-2').classList.add('active');
    } else if (step === 3) {
        state.theme = previewingTheme; saveState(); applyTheme(); 
        document.getElementById('ob-step-2').classList.remove('active');
        document.getElementById('ob-step-3').classList.add('active');
        document.getElementById('dot-2').classList.remove('active');
        document.getElementById('dot-3').classList.add('active');
    } else if (step === 1) {
        document.getElementById('ob-step-2').classList.remove('active');
        document.getElementById('ob-step-1').classList.add('active');
        document.getElementById('dot-2').classList.remove('active');
        document.getElementById('dot-1').classList.add('active');
    }
}

function finishOnboarding() {
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app-container').style.opacity = 1;
    document.getElementById('onboarding-widget').classList.remove('hidden');
    updateDashboard(); updateOnboardingUI();
}

function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const selectedTab = document.getElementById(tabId);
    if(selectedTab) selectedTab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    if (tabId === 'playground' && window.editor) setTimeout(() => window.editor.refresh(), 300);
}

document.getElementById('settings').addEventListener('scroll', function() {
    if (this.scrollTop + this.clientHeight >= this.scrollHeight - 20) markStepComplete('settings');
});

let editorFontSize = 15;
function changeZoom(amount) {
    editorFontSize += amount;
    if (editorFontSize < 10) editorFontSize = 10;
    if (editorFontSize > 30) editorFontSize = 30;
    if (window.editor) {
        const cmElement = document.querySelector('.CodeMirror');
        if (cmElement) { cmElement.style.setProperty('font-size', editorFontSize + 'px', 'important'); window.editor.refresh(); }
    }
}

let timeLeft = state.timerDuration * 60, timerInterval = null, isRunning = false;
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0'), s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
}
function toggleTimer() {
    const btn = document.getElementById('start-btn');
    if (isRunning) { clearInterval(timerInterval); btn.innerText = 'Resume Focus'; }
    else {
        btn.innerText = 'Pause Focus';
        timerInterval = setInterval(() => {
            if (timeLeft > 0) { timeLeft--; updateTimerDisplay(); }
            else { clearInterval(timerInterval); isRunning = false; btn.innerText = 'Start Focus'; state.streak++; saveState(); updateDashboard(); }
        }, 1000);
        markStepComplete('timer'); 
    }
    isRunning = !isRunning;
}
function resetTimer() { clearInterval(timerInterval); isRunning = false; timeLeft = state.timerDuration * 60; updateTimerDisplay(); document.getElementById('start-btn').innerText = 'Start Focus'; }
function updateTimerSetting(val) { state.timerDuration = parseInt(val); document.getElementById('timer-slider-val').innerText = `${val}m`; document.getElementById('focus-val').innerText = `${val} Mins`; saveState(); if (!isRunning) { timeLeft = state.timerDuration * 60; updateTimerDisplay(); } }

function addTask() {
    const input = document.getElementById('task-input');
    if (input.value.trim() !== '') { state.tasks.push({ text: input.value, done: false }); input.value = ''; saveState(); renderTasks(); updateDashboard(); markStepComplete('tasks'); }
}
function renderTasks() {
    const list = document.getElementById('task-list'), emptyState = document.getElementById('empty-tasks');
    list.innerHTML = '';
    if (state.tasks.length === 0) emptyState.classList.remove('hidden');
    else {
        emptyState.classList.add('hidden');
        state.tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="text-decoration: ${task.done ? 'line-through' : 'none'}; opacity: ${task.done ? 0.5 : 1};">${task.text}</span>
                <div><button class="btn secondary" style="padding: 6px 10px; font-size: 12px;" onclick="toggleTask(${index})">Done</button>
                <button class="btn danger" style="padding: 6px 10px; font-size: 12px;" onclick="deleteTask(${index})">X</button></div>`;
            list.appendChild(li);
        });
    }
}
function toggleTask(index) { state.tasks[index].done = !state.tasks[index].done; saveState(); renderTasks(); updateDashboard(); }
function deleteTask(index) { state.tasks.splice(index, 1); saveState(); renderTasks(); updateDashboard(); }
function saveNotes() { state.notes = document.getElementById('notes-area').value; saveState(); markStepComplete('notes'); }
function clearNotes() { document.getElementById('notes-area').value = ''; state.notes = ''; saveState(); }
function clearTerminal() { document.getElementById('output-area').innerText = 'Ready...'; }

function updateDashboard() {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    document.getElementById('greeting-text').innerText = `${greeting}, ${state.userName || 'Developer'}!`;
    document.getElementById('streak-val').innerText = `${state.streak} Days`;
    document.getElementById('task-count-val').innerText = state.tasks.filter(t => !t.done).length;
    document.getElementById('focus-val').innerText = `${state.timerDuration} Mins`;
    document.getElementById('settings-name-input').value = state.userName || '';
}

function toggleWidget() { document.getElementById('widget-body').classList.toggle('collapsed'); }
function markStepComplete(stepId) { if (state.onboarding.completed) return; state.onboarding[stepId] = true; saveState(); updateOnboardingUI(); }
function updateOnboardingUI() {
    let allCompleted = true;
    ['timer', 'tasks', 'notes', 'playground', 'settings'].forEach(step => {
        const el = document.getElementById(`chk-${step}`);
        if (state.onboarding[step]) { el.classList.add('completed'); el.querySelector('.check-icon').innerHTML = '\u2714'; }
        else allCompleted = false;
    });
    if (allCompleted && !state.onboarding.completed) {
        state.onboarding.completed = true; saveState();
        setTimeout(() => { document.getElementById('onboarding-widget').classList.add('hidden'); }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sidebar-version').innerText = `v${state.version}`;
    applyTheme();

    window.editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
        mode: "python", theme: 'dracula', lineNumbers: true, indentUnit: 4, autoCloseBrackets: true,
        extraKeys: { "Ctrl-Space": "autocomplete", "Ctrl-Enter": function() { runCode(); } }
    });
    window.editor.on("inputRead", function(cm, change) { if (change.text[0].match(/[a-zA-Z_]/)) cm.showHint({ hint: CodeMirror.pythonHint, completeSingle: false }); });

    document.getElementById('notes-area').value = state.notes;
    document.getElementById('timer-slider').value = state.timerDuration;
    document.getElementById('timer-slider-val').innerText = `${state.timerDuration}m`;
    renderTasks(); updateDashboard(); updateTimerDisplay();

    setInterval(() => { document.getElementById('live-clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }, 1000);

    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        if (!state.userName) {
            openOnboarding();
        } else {
            document.getElementById('app-container').style.opacity = 1;
            if (!state.onboarding.completed) { document.getElementById('onboarding-widget').classList.remove('hidden'); updateOnboardingUI(); }
        }
    }, 800); 
});

async function runCode() {
    const outputArea = document.getElementById('output-area');
    outputArea.innerText = "Executing Python safely...";
    const result = await ipcRenderer.invoke('run-python', window.editor.getValue());
    outputArea.innerText = result.output;
    outputArea.style.color = result.isError ? "#EF4444" : "#D4D4D4";
    markStepComplete('playground');
}