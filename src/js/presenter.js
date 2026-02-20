const broadcastChannel = new BroadcastChannel('quickpoint_channel');
let slideContents = [];
let filenames = [];
let currentSlideIndex = 0;
let timerInterval;
let seconds = 0;
let isTimerRunning = true;

// DOM Elements
const currentIframe = document.getElementById('current-slide-iframe');
const nextIframe = document.getElementById('next-iframe');
const notesContent = document.getElementById('notes-content');
const timerDisplay = document.getElementById('timer');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slideInfo = document.getElementById('slide-info');
const pauseTimerBtn = document.getElementById('pause-timer-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');
const clockDisplay = document.getElementById('clock');
const dateDisplay = document.getElementById('date');
const nextIframeContainer = document.getElementById('next-iframe-container');
const nextIframeElement = document.getElementById('next-iframe');
const progressBar = document.getElementById('progress-bar');
const currentSlideView = document.getElementById('current-slide-view');
const currentIframeContainer = document.getElementById('current-iframe-container');
const nextPreviewTitle = document.getElementById('next-preview-title');

// Initialize
async function init() {
    try {
        const storedContents = sessionStorage.getItem('quickpoint_contents');
        if (!storedContents) {
            console.error('No presentation loaded. Open a config file in the main window first.');
            return;
        }
        slideContents = JSON.parse(storedContents);
        filenames = JSON.parse(sessionStorage.getItem('quickpoint_filenames') || '[]');

        // Set iframes to ignore broadcasts so we can control them manually
        currentIframe.src = 'index.html?receiver=false';
        nextIframe.src = 'index.html?receiver=false';

        setupEventListeners();
        startTimer();
        resizePreview();
        resizeCurrentPreview();
        window.addEventListener('resize', () => {
            resizePreview();
            resizeCurrentPreview();
        });

        // Request current state from main window
        broadcastChannel.postMessage({ type: 'REQUEST_STATE' });

        updateView(0);

    } catch (e) {
        console.error("Error initializing presenter view", e);
    }
}

function resizePreview() {
    if (!nextIframeContainer || !nextIframeElement) return;
    const containerWidth = nextIframeContainer.clientWidth;
    const scale = containerWidth / 1280;
    nextIframeElement.style.transform = `scale(${scale})`;
}

function resizeCurrentPreview() {
    if (!currentSlideView || !currentIframeContainer) return;
    const viewWidth = currentSlideView.clientWidth - 20;
    const viewHeight = currentSlideView.clientHeight - 20;
    const scaleX = viewWidth / 1280;
    const scaleY = viewHeight / 720;
    currentIframeContainer.style.transform = `scale(${Math.min(scaleX, scaleY)})`;
}

function updateView(index, step = -1) {
    currentSlideIndex = index;

    const filename = filenames[index] || `slide-${index + 1}`;

    slideInfo.textContent = `Slide ${index + 1} / ${slideContents.length} — ${filename}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slideContents.length - 1;

    // Update Current Slide Iframe
    if (currentIframe.contentWindow) {
        let hash = `index.html?receiver=false#slide-${index + 1}`;
        if (step > -1) hash += `-step-${step + 1}`;
        currentIframe.contentWindow.location.replace(hash);
    }

    // Parse the stored slide HTML for notes and step count
    const { notes, stepCount } = getSlideData(index);

    if (notes) {
        notesContent.innerHTML = notes;
    } else {
        notesContent.innerHTML = '<em>No notes for this slide.</em>';
    }

    // Calculate Next View
    let nextHash;
    if (step < stepCount - 1) {
        nextHash = `index.html?receiver=false#slide-${index + 1}-step-${step + 2}`;
        if (nextPreviewTitle) nextPreviewTitle.textContent = "Next Animation";
    } else {
        const nextIndex = Math.min(index + 1, slideContents.length - 1);
        nextHash = `index.html?receiver=false#slide-${nextIndex + 1}`;
        if (nextPreviewTitle) nextPreviewTitle.textContent = "Next Slide";
    }

    if (nextIframe.contentWindow) {
        nextIframe.contentWindow.location.replace(nextHash);
    }

    // Update Progress Bar
    const progress = ((index + 1) / slideContents.length) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;
}

function getSlideData(index) {
    if (index < 0 || index >= slideContents.length) return { notes: null, stepCount: 0 };

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(slideContents[index], 'text/html');

        const notesEl = doc.querySelector('.notes');
        const notes = notesEl ? notesEl.innerHTML : null;

        const steps = Array.from(doc.querySelectorAll('[data-step]'));
        const stepValues = new Set(steps.map(el => parseInt(el.dataset.step)));

        return { notes, stepCount: stepValues.size };
    } catch (e) {
        console.error("Error parsing slide data", e);
        return { notes: '<em>Error loading notes.</em>', stepCount: 0 };
    }
}

function setupEventListeners() {
    broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SLIDE_CHANGED') {
            updateView(event.data.index, event.data.step);
        }
    };

    prevBtn.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
            broadcastChannel.postMessage({ type: 'CMD_PREV' });
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < slideContents.length - 1) {
            broadcastChannel.postMessage({ type: 'CMD_NEXT' });
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            if (currentSlideIndex < slideContents.length - 1) broadcastChannel.postMessage({ type: 'CMD_NEXT' });
        } else if (e.key === 'ArrowLeft') {
            if (currentSlideIndex > 0) broadcastChannel.postMessage({ type: 'CMD_PREV' });
        }
    });

    pauseTimerBtn.addEventListener('click', toggleTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
}

function toggleTimer() {
    isTimerRunning = !isTimerRunning;
    pauseTimerBtn.textContent = isTimerRunning ? 'Pause' : 'Resume';
}

function resetTimer() {
    seconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${h}:${m}:${s}`;
}

function updateClock() {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dateDisplay.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function startTimer() {
    updateClock();
    timerInterval = setInterval(() => {
        updateClock();
        if (isTimerRunning) {
            seconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

init();
