const broadcastChannel = new BroadcastChannel('quickpoint_channel');
let slides = [];
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
        const stored = sessionStorage.getItem('quickpoint_slides');
        if (!stored) {
            console.error('No presentation loaded. Open a config file in the main window first.');
            return;
        }
        slides = JSON.parse(stored);

        // Set iframes to ignore broadcasts so we can control them manually
        currentIframe.src = 'index.html?receiver=false';
        nextIframe.src = 'index.html?receiver=false';

        // Wait for iframes to load a bit? Actually we can just set the hash.
        // But better to wait for the load event or just set it.
        
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

        // Initialize at 0 as a fallback
        updateView(0); 

    } catch (e) {
        console.error("Error initializing presenter view", e);
    }
}

function resizePreview() {
    if (!nextIframeContainer || !nextIframeElement) return;
    
    // Get the available width from the container itself
    const containerWidth = nextIframeContainer.clientWidth;
    
    // Base dimensions as defined in CSS
    const baseWidth = 1280;
    
    const scale = containerWidth / baseWidth;
    nextIframeElement.style.transform = `scale(${scale})`;
}

function resizeCurrentPreview() {
    if (!currentSlideView || !currentIframeContainer) return;
    
    // Available space
    const viewWidth = currentSlideView.clientWidth - 20; // Padding
    const viewHeight = currentSlideView.clientHeight - 20;
    
    // Scale to fit 1280x720
    const scaleX = viewWidth / 1280;
    const scaleY = viewHeight / 720;
    const scale = Math.min(scaleX, scaleY);
    
    currentIframeContainer.style.transform = `scale(${scale})`;
}

function updateView(index, step = -1) {
    currentSlideIndex = index;
    
    // Extract filename from path
    const path = slides[index];
    const filename = path.split('/').pop();

    // Update controls
    slideInfo.textContent = `Slide ${index + 1} / ${slides.length} — ${filename}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;

    // Update Current Slide Iframe
    if (currentIframe.contentWindow) {
        let hash = `index.html?receiver=false#slide-${index + 1}`;
        if (step > -1) hash += `-step-${step + 1}`;
        currentIframe.contentWindow.location.replace(hash);
    }
    
    // Determine Next Preview State
    // We need to fetch the current slide to check for steps
    fetchSlideData(index).then(data => {
        const { notes, stepCount } = data;
        
        // Update Notes
        if (notes) {
            notesContent.innerHTML = notes;
        } else {
            notesContent.innerHTML = '<em>No notes for this slide.</em>';
        }

        // Calculate Next View URL & Title
        let nextHash;
        if (step < stepCount - 1) {
            // Next is a step in current slide
            nextHash = `index.html?receiver=false#slide-${index + 1}-step-${step + 2}`;
            if (nextPreviewTitle) nextPreviewTitle.textContent = "Next Animation";
        } else {
            // Next is next slide
            const nextIndex = Math.min(index + 1, slides.length - 1);
            nextHash = `index.html?receiver=false#slide-${nextIndex + 1}`;
            if (nextPreviewTitle) nextPreviewTitle.textContent = "Next Slide";
        }

        if (nextIframe.contentWindow) {
            nextIframe.contentWindow.location.replace(nextHash);
        }
    });

    // Update Progress Bar
    const progress = ((index + 1) / slides.length) * 100;
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

async function fetchSlideData(index) {
    if (index < 0 || index >= slides.length) return { notes: null, stepCount: 0 };
    
    try {
        const response = await fetch(slides[index]);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get Notes
        const notesEl = doc.querySelector('.notes');
        const notes = notesEl ? notesEl.innerHTML : null;

        // Get Steps count (unique steps)
        const steps = Array.from(doc.querySelectorAll('[data-step]'));
        const stepValues = new Set(steps.map(el => parseInt(el.dataset.step)));
        const stepCount = stepValues.size;

        return { notes, stepCount };
    } catch (e) {
        console.error("Error fetching slide data", e);
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
            // We update locally immediately for responsiveness
            // But main window will also broadcast back, which is fine (idempotent)
            // Actually, better to just command the main window.
            broadcastChannel.postMessage({ type: 'CMD_PREV' });
            // We can also trigger local update via our own listener if we wanted
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < slides.length - 1) {
            broadcastChannel.postMessage({ type: 'CMD_NEXT' });
        }
    });
    
    // Keyboard support in presenter view
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
             if (currentSlideIndex < slides.length - 1) broadcastChannel.postMessage({ type: 'CMD_NEXT' });
        } else if (e.key === 'ArrowLeft') {
             if (currentSlideIndex > 0) broadcastChannel.postMessage({ type: 'CMD_PREV' });
        }
    });

    // Timer controls
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
