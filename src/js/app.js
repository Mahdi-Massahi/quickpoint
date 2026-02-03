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
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Initialization
async function init() {
    try {
        resizeApp();
        window.addEventListener('resize', resizeApp);

        const response = await fetch('../examples/slides/config.json');
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

function resizeApp() {
    const app = document.getElementById('app');
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
