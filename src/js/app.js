// State management
let currentSlideIndex = 0;
let slides = [];
let slideFiles = [];
let currentStepIndex = -1;
let currentSlideStepValues = [];
const broadcastChannel = new BroadcastChannel('quickpoint_channel');

// DOM Elements
const slideContainer = document.getElementById('slide-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slideNumber = document.getElementById('slide-number');
const slideFilename = document.getElementById('slide-filename');
const presenterBtn = document.getElementById('presenter-mode-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const exitBtn = document.getElementById('exit-btn');
const landing = document.getElementById('landing');
const app = document.getElementById('app');

// Initialization
async function init() {
    try {
        resizeApp();
        window.addEventListener('resize', resizeApp);

        // 1. Check ?config= query param
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');

        if (configParam) {
            const response = await fetch(configParam);
            if (!response.ok) throw new Error('Failed to load config: ' + configParam);
            const config = await response.json();
            sessionStorage.setItem('quickpoint_slides', JSON.stringify(config.slides));
            slideFiles = config.slides;
        }
        // 2. Check sessionStorage
        else if (sessionStorage.getItem('quickpoint_slides')) {
            slideFiles = JSON.parse(sessionStorage.getItem('quickpoint_slides'));
        }
        // 3. Show landing screen and wait for file input
        else {
            showLanding();
            return;
        }

        startPresentation();
    } catch (error) {
        console.error('Initialization error:', error);
        if (slideContainer) {
            slideContainer.innerHTML = `<div class="slide active"><h1>Error</h1><p>${error.message}</p></div>`;
        }
    }
}

function showLanding() {
    if (landing) landing.style.display = 'flex';
    if (app) app.style.display = 'none';

    const fileInput = document.getElementById('config-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileInput);
    }
}

function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const config = JSON.parse(event.target.result);
            if (!config.slides || !Array.isArray(config.slides)) {
                throw new Error('Invalid config: missing "slides" array');
            }
            sessionStorage.setItem('quickpoint_slides', JSON.stringify(config.slides));
            slideFiles = config.slides;

            if (landing) landing.style.display = 'none';
            if (app) app.style.display = '';

            startPresentation();
        } catch (err) {
            console.error('Error reading config file:', err);
            alert('Invalid config file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

async function startPresentation() {
    if (landing) landing.style.display = 'none';
    if (app) app.style.display = '';

    await loadSlides(slideFiles);

    // Check URL hash for initial slide
    const hashStr = window.location.hash;
    const slidePart = hashStr.match(/slide-(\d+)/);
    const stepPart = hashStr.match(/step-(\d+)/);
    let initialStepIndex = -1;

    if (slidePart) {
        currentSlideIndex = Math.max(0, Math.min(parseInt(slidePart[1]) - 1, slides.length - 1));
        if (stepPart) {
            initialStepIndex = parseInt(stepPart[1]) - 1;
        }
    }

    renderSlide();

    // Apply initial step if present
    if (initialStepIndex > -1) {
        applySteps(initialStepIndex);
    }

    setupEventListeners();
    setupBroadcastListener();
}

async function loadSlides(files) {
    slideContainer.innerHTML = ''; // Clear container
    slides = []; // Reset slides array

    const fetchPromises = files.map(file => fetch(file).then(res => res.text()));
    const slidesContent = await Promise.all(fetchPromises);

    slidesContent.forEach((content, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.classList.add('slide');
        slideDiv.id = `slide-${index + 1}`;
        slideDiv.innerHTML = content;
        slideContainer.appendChild(slideDiv);
        slides.push(slideDiv);
    });
}

function renderSlide() {
    // Update classes
    slides.forEach((slide, index) => {
        if (index === currentSlideIndex) {
            slide.classList.add('active');
            slide.style.opacity = '1';
            slide.style.pointerEvents = 'auto';
            slide.style.transform = 'scale(1)';
        } else {
            slide.classList.remove('active');
            slide.style.opacity = '0';
            slide.style.pointerEvents = 'none';
            slide.style.transform = 'scale(0.95)';
        }
    });

    // Initialize Steps for the new slide
    const activeSlide = slides[currentSlideIndex];
    if (activeSlide) {
        const steps = Array.from(activeSlide.querySelectorAll('[data-step]'));
        const stepValues = new Set(steps.map(el => parseInt(el.dataset.step)));
        currentSlideStepValues = Array.from(stepValues).sort((a, b) => a - b);
        currentStepIndex = -1;

        // Ensure all steps are hidden initially
        steps.forEach(el => el.classList.remove('step-visible'));
    } else {
        currentSlideStepValues = [];
        currentStepIndex = -1;
    }

    // Update controls
    slideNumber.textContent = `${currentSlideIndex + 1} / ${slides.length}`;

    // Show filename
    if (slideFiles[currentSlideIndex]) {
        const filename = slideFiles[currentSlideIndex].split('/').pop();
        slideFilename.textContent = `(${filename})`;
    } else {
        slideFilename.textContent = '';
    }

    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;

    // Update URL hash without scrolling (include step if > -1)
    let newHash = `#slide-${currentSlideIndex + 1}`;
    if (currentStepIndex > -1) {
        newHash += `-step-${currentStepIndex + 1}`;
    }

    if (window.location.hash !== newHash) {
        history.replaceState(null, null, newHash);
    }

    // Broadcast change (only if not in receiver=false mode)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('receiver') !== 'false') {
        broadcastChannel.postMessage({
            type: 'SLIDE_CHANGED',
            index: currentSlideIndex,
            step: currentStepIndex
        });
    }
}

function nextSlide() {
    // Check for steps
    if (currentSlideStepValues.length > 0 && currentStepIndex < currentSlideStepValues.length - 1) {
        currentStepIndex++;
        const stepValue = currentSlideStepValues[currentStepIndex];
        const activeSlide = slides[currentSlideIndex];
        const elementsToReveal = activeSlide.querySelectorAll(`[data-step="${stepValue}"]`);
        elementsToReveal.forEach(el => el.classList.add('step-visible'));

        // Update hash/broadcast
        const newHash = `#slide-${currentSlideIndex + 1}-step-${currentStepIndex + 1}`;
        history.replaceState(null, null, newHash);
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('receiver') !== 'false') {
            broadcastChannel.postMessage({
                type: 'SLIDE_CHANGED',
                index: currentSlideIndex,
                step: currentStepIndex
            });
        }
        return;
    }

    if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        renderSlide();
    }
}

function prevSlide() {
    // Check for visible steps to hide
    if (currentSlideStepValues.length > 0 && currentStepIndex >= 0) {
        const stepValue = currentSlideStepValues[currentStepIndex];
        const activeSlide = slides[currentSlideIndex];
        const elementsToHide = activeSlide.querySelectorAll(`[data-step="${stepValue}"]`);
        elementsToHide.forEach(el => el.classList.remove('step-visible'));
        currentStepIndex--;

        // Update hash/broadcast
        let newHash = `#slide-${currentSlideIndex + 1}`;
        if (currentStepIndex > -1) newHash += `-step-${currentStepIndex + 1}`;
        history.replaceState(null, null, newHash);
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('receiver') !== 'false') {
            broadcastChannel.postMessage({
                type: 'SLIDE_CHANGED',
                index: currentSlideIndex,
                step: currentStepIndex
            });
        }
        return;
    }

    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlide();
    }
}

function setupEventListeners() {
    // Hash change event
    window.addEventListener('hashchange', () => {
        // Parse Hash: #slide-N-step-K
        const hashStr = window.location.hash;
        const slidePart = hashStr.match(/slide-(\d+)/);
        const stepPart = hashStr.match(/step-(\d+)/);

        if (slidePart) {
            const newSlideIndex = Math.max(0, Math.min(parseInt(slidePart[1]) - 1, slides.length - 1));
            const newStepIndex = stepPart ? parseInt(stepPart[1]) - 1 : -1;

            if (newSlideIndex !== currentSlideIndex) {
                currentSlideIndex = newSlideIndex;
                renderSlide(); // This resets steps
                // Apply steps if needed
                if (newStepIndex > -1) {
                    applySteps(newStepIndex);
                }
            } else if (newStepIndex !== currentStepIndex) {
                // Same slide, different step
                applySteps(newStepIndex);
            }
        }
    });

    // Click events
    // Click anywhere on slide to advance (unless strictly clicking controls)
    slideContainer.addEventListener('click', (e) => {
        // Prevent if clicking on links or interactive elements
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
        nextSlide();
    });

    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
    presenterBtn.addEventListener('click', (e) => { e.stopPropagation(); openPresenterMode(); });
    fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
    exitBtn.addEventListener('click', (e) => { e.stopPropagation(); exitPresentation(); });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key.toLowerCase() === 'f') {
            toggleFullscreen();
        }
    });

    // Touch events for basic swipe
    let touchStartX = 0;
    document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextSlide();
        if (touchEndX - touchStartX > 50) prevSlide();
    });
}

function setupBroadcastListener() {
    // Check if we should ignore broadcasts (e.g. for preview windows)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('receiver') === 'false') {
        return;
    }

    broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'SLIDE_CHANGED') {
            if (currentSlideIndex !== event.data.index) {
                currentSlideIndex = event.data.index;
                renderSlide();
            }
        } else if (event.data.type === 'CMD_NEXT') {
            nextSlide();
        } else if (event.data.type === 'CMD_PREV') {
            prevSlide();
        } else if (event.data.type === 'REQUEST_STATE') {
            broadcastChannel.postMessage({
                type: 'SLIDE_CHANGED',
                index: currentSlideIndex
            });
        }
    };
}

function exitPresentation() {
    if (!confirm('Exit this presentation?')) return;
    sessionStorage.removeItem('quickpoint_slides');
    slides = [];
    slideFiles = [];
    currentSlideIndex = 0;
    currentStepIndex = -1;
    currentSlideStepValues = [];
    slideContainer.innerHTML = '';
    history.replaceState(null, null, window.location.pathname + window.location.search);
    showLanding();
}

function openPresenterMode() {
    const width = 800;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    window.open(
        'presenter.html',
        'Presenter View',
        `width=${width},height=${height},top=${top},left=${left}`
    );
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function applySteps(targetStepIndex) {
    currentStepIndex = targetStepIndex;

    // Iterate through all possible step values for this slide
    currentSlideStepValues.forEach((stepValue, index) => {
        const activeSlide = slides[currentSlideIndex];
        const elements = activeSlide.querySelectorAll(`[data-step="${stepValue}"]`);

        if (index <= targetStepIndex) {
            elements.forEach(el => el.classList.add('step-visible'));
        } else {
            elements.forEach(el => el.classList.remove('step-visible'));
        }
    });
}

function resizeApp() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Base resolution (16:9)
    const baseWidth = 1280;
    const baseHeight = 720;

    const scaleX = windowWidth / baseWidth;
    const scaleY = windowHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    app.style.width = `${baseWidth}px`;
    app.style.height = `${baseHeight}px`;
    app.style.transform = `scale(${scale})`;
    app.style.transformOrigin = 'center center';

    // Center it
    app.style.position = 'absolute';
    app.style.top = '50%';
    app.style.left = '50%';
    app.style.marginTop = `-${baseHeight/2}px`;
    app.style.marginLeft = `-${baseWidth/2}px`;

    // Ensure overflow hidden on body to avoid scrollbars
    document.body.style.overflow = 'hidden';
}

// Start the app
init();
