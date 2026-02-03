// State management
let currentSlideIndex = 0;
let slides = [];
const broadcastChannel = new BroadcastChannel('quickpoint_channel');

// DOM Elements
const slideContainer = document.getElementById('slide-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const slideNumber = document.getElementById('slide-number');
const presenterBtn = document.getElementById('presenter-mode-btn');

// Initialization
async function init() {
    try {
        const response = await fetch('../examples/config.json');
        if (!response.ok) throw new Error('Failed to load config.json');
        
        const config = await response.json();
        const slideFiles = config.slides;

        // Load all slides
        await loadSlides(slideFiles);
        
        // Check URL hash for initial slide
        const hash = window.location.hash.replace('#slide-', '');
        if (hash && !isNaN(hash)) {
            currentSlideIndex = Math.max(0, Math.min(parseInt(hash) - 1, slides.length - 1));
        }

        renderSlide();
        setupEventListeners();
        setupBroadcastListener();
    } catch (error) {
        console.error('Initialization error:', error);
        slideContainer.innerHTML = `<div class="slide active"><h1>Error</h1><p>${error.message}</p></div>`;
    }
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

    // Update controls
    slideNumber.textContent = `${currentSlideIndex + 1} / ${slides.length}`;
    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;

    // Update URL hash without scrolling
    const newHash = `#slide-${currentSlideIndex + 1}`;
    if (window.location.hash !== newHash) {
        history.replaceState(null, null, newHash);
    }

    // Broadcast change (only if not in receiver=false mode)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('receiver') !== 'false') {
        broadcastChannel.postMessage({
            type: 'SLIDE_CHANGED',
            index: currentSlideIndex
        });
    }
}

function nextSlide() {
    if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        renderSlide();
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlide();
    }
}

function setupEventListeners() {
    // Hash change event
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#slide-', '');
        if (hash && !isNaN(hash)) {
            const newIndex = Math.max(0, Math.min(parseInt(hash) - 1, slides.length - 1));
            if (newIndex !== currentSlideIndex) {
                currentSlideIndex = newIndex;
                renderSlide();
            }
        }
    });

    // Click events
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);
    presenterBtn.addEventListener('click', openPresenterMode);

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
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

// Start the app
init();
