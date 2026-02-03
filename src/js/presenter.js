const broadcastChannel = new BroadcastChannel('quickpoint_channel');
let slides = [];
let currentSlideIndex = 0;
let timerInterval;
let seconds = 0;

// DOM Elements
const currentIframe = document.getElementById('current-slide-iframe');
const nextIframe = document.getElementById('next-iframe');
const notesContent = document.getElementById('notes-content');
const timerDisplay = document.getElementById('timer');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slideInfo = document.getElementById('slide-info');

// Initialize
async function init() {
    try {
        const response = await fetch('../examples/config.json');
        const config = await response.json();
        slides = config.slides;

        // Set iframes to ignore broadcasts so we can control them manually
        currentIframe.src = 'index.html?receiver=false';
        nextIframe.src = 'index.html?receiver=false';

        // Wait for iframes to load a bit? Actually we can just set the hash.
        // But better to wait for the load event or just set it.
        
        setupEventListeners();
        startTimer();

        // Request current state from main window
        broadcastChannel.postMessage({ type: 'REQUEST_STATE' });

        // Initialize at 0 as a fallback
        updateView(0); 

    } catch (e) {
        console.error("Error initializing presenter view", e);
    }
}

function updateView(index) {
    currentSlideIndex = index;
    
    // Update controls
    slideInfo.textContent = `Slide ${index + 1} / ${slides.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;

    // Update iframes
    // We use contentWindow.location.replace to avoid adding to history stack
    if (currentIframe.contentWindow) {
        currentIframe.contentWindow.location.replace(`index.html?receiver=false#slide-${index + 1}`);
    }
    
    if (nextIframe.contentWindow) {
        const nextIndex = Math.min(index + 1, slides.length - 1);
        nextIframe.contentWindow.location.replace(`index.html?receiver=false#slide-${nextIndex + 1}`);
    }

    // Update Notes
    fetchNotes(index);
}

async function fetchNotes(index) {
    if (index < 0 || index >= slides.length) return;
    
    try {
        const response = await fetch(slides[index]);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const notes = doc.querySelector('.notes');
        
        if (notes) {
            notesContent.innerHTML = notes.innerHTML;
        } else {
            notesContent.innerHTML = '<em>No notes for this slide.</em>';
        }
    } catch (e) {
        notesContent.innerHTML = '<em>Error loading notes.</em>';
    }
}

function setupEventListeners() {
    broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SLIDE_CHANGED') {
            updateView(event.data.index);
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
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

init();
