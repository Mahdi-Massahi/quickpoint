// State management
let currentSlideIndex = 0;
let slides = [];
let slideFiles = [];
let currentStepIndex = -1;
let currentSlideStepValues = [];
let presentationConfig = {};
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
const app = document.getElementById('app');

// Initialization
async function init() {
    try {
        resizeApp();
        window.addEventListener('resize', resizeApp);

        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');

        if (configParam) {
            await loadFromURL(configParam);
            startPresentation();
        } else if (urlParams.get('receiver') === 'false' && sessionStorage.getItem('quickpoint_contents')) {
            await loadFromSession();
            startPresentation();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        if (slideContainer) {
            slideContainer.innerHTML = `<div class="slide active"><h1>Error</h1><p>${error.message}</p></div>`;
        }
    }
}

// --- CSS loading ---

function loadCSS(href, id) {
    return new Promise((resolve) => {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.id = id;
        link.onload = resolve;
        link.onerror = () => {
            console.warn(`Optional CSS not found: ${href}`);
            resolve();
        };
        document.head.appendChild(link);
    });
}

async function loadTemplateCSS(templateName) {
    const templateBase = new URL(`src/templates/${templateName}`, window.location.origin).href;
    await loadCSS(`${templateBase}/style.css`, 'qp-template');
}

// --- Config loading strategies ---

async function loadFromURL(configURL) {
    const response = await fetch(configURL);
    if (!response.ok) throw new Error('Failed to load: ' + configURL);
    const config = await response.json();
    presentationConfig = config;

    // Derive base directory from config URL
    const baseDir = configURL.substring(0, configURL.lastIndexOf('/') + 1);

    // Load template CSS
    if (config.template) {
        await loadTemplateCSS(config.template);
        sessionStorage.setItem('quickpoint_template', config.template);
    }

    // Load custom theme CSS (relative to config.json location)
    if (config.theme) {
        const themeURL = new URL(config.theme, new URL(configURL, window.location.href)).href;
        await loadCSS(themeURL, 'qp-custom-theme');
        sessionStorage.setItem('quickpoint_theme', themeURL);
    }

    // Store metadata
    if (config.meta) {
        sessionStorage.setItem('quickpoint_meta', JSON.stringify(config.meta));
    }

    const contents = [];
    const filenames = [];
    for (const slidePath of config.slides) {
        const fullPath = baseDir + slidePath;
        const res = await fetch(fullPath);
        if (!res.ok) throw new Error('Failed to load slide: ' + fullPath);
        let html = await res.text();

        // Resolve relative asset paths to absolute URLs based on the slide's location
        const slideAbsoluteURL = new URL(fullPath, window.location.href).href;
        const slideBaseURL = slideAbsoluteURL.substring(0, slideAbsoluteURL.lastIndexOf('/') + 1);
        html = html.replace(/(src|poster)="([^"]+)"/g, (match, attr, refPath) => {
            if (/^(data:|https?:|blob:)/.test(refPath)) return match;
            const absoluteURL = new URL(refPath, slideBaseURL).href;
            return `${attr}="${absoluteURL}"`;
        });

        contents.push(html);
        filenames.push(slidePath.split('/').pop());
    }

    slideFiles = filenames;
    sessionStorage.setItem('quickpoint_contents', JSON.stringify(contents));
    sessionStorage.setItem('quickpoint_filenames', JSON.stringify(filenames));
}

async function loadFromSession() {
    slideFiles = JSON.parse(sessionStorage.getItem('quickpoint_filenames') || '[]');

    const template = sessionStorage.getItem('quickpoint_template');
    if (template) {
        await loadTemplateCSS(template);
        presentationConfig.template = template;
    }

    const themeURL = sessionStorage.getItem('quickpoint_theme');
    if (themeURL) await loadCSS(themeURL, 'qp-custom-theme');

    const metaStr = sessionStorage.getItem('quickpoint_meta');
    if (metaStr) presentationConfig.meta = JSON.parse(metaStr);
}

// --- Presentation lifecycle ---

function startPresentation() {

    const contents = JSON.parse(sessionStorage.getItem('quickpoint_contents') || '[]');
    slideFiles = JSON.parse(sessionStorage.getItem('quickpoint_filenames') || '[]');
    loadSlidesFromContent(contents);

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

    if (initialStepIndex > -1) {
        applySteps(initialStepIndex);
    }

    setupEventListeners();
    setupBroadcastListener();
}

function loadSlidesFromContent(contents) {
    slideContainer.innerHTML = '';
    slides = [];

    const meta = presentationConfig.meta || {};
    const hasTemplate = !!presentationConfig.template;
    const templateBase = hasTemplate
        ? new URL(`src/templates/${presentationConfig.template}`, window.location.origin).href
        : '';

    contents.forEach((content, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.classList.add('slide');
        slideDiv.id = `slide-${index + 1}`;

        // Parse content to detect slide type classes on root element
        const temp = document.createElement('div');
        temp.innerHTML = content.trim();
        const firstChild = temp.firstElementChild;

        // If root element has class="slide ...", merge classes into wrapper and unwrap
        if (firstChild && firstChild.classList.contains('slide')) {
            firstChild.classList.forEach(cls => {
                if (cls !== 'slide') slideDiv.classList.add(cls);
            });
            slideDiv.innerHTML = firstChild.innerHTML;
        } else {
            slideDiv.innerHTML = content;
        }

        // Inject template chrome if a template is loaded
        if (hasTemplate) {
            const isTitleSlide = slideDiv.classList.contains('title-slide');
            const isSectionHeader = slideDiv.classList.contains('section-header');

            if (!isTitleSlide && !isSectionHeader) {
                // Content slides: inject header bar + footer
                const header = document.createElement('div');
                header.className = 'slide-chrome-header';
                header.innerHTML = `
                    <span class="chrome-meta">
                        ${meta.date ? `<span>${meta.date}</span>` : ''}
                        ${meta.speaker ? `<span>${meta.speaker}</span>` : ''}
                        ${meta.title ? `<span>${meta.title}</span>` : ''}
                    </span>
                    <img class="chrome-logo" src="${templateBase}/assets/xebia-logo.svg" alt="Xebia">
                `;
                slideDiv.insertBefore(header, slideDiv.firstChild);
            }

            if (isTitleSlide) {
                // Title slides: inject header logo bar
                const header = document.createElement('div');
                header.className = 'slide-chrome-title-header';
                header.innerHTML = `
                    <span class="chrome-date">${meta.date || ''}</span>
                `;
                slideDiv.insertBefore(header, slideDiv.firstChild);

                // Title slides: inject bottom logo bar
                const footer = document.createElement('div');
                footer.className = 'slide-chrome-title-footer';
                footer.innerHTML = `
                    <img class="chrome-logo-large" src="${templateBase}/assets/xebia-logo.svg" alt="Xebia">
                    <span class="chrome-tagline">${meta.speaker || ''} ${meta.title ? '&middot; ' + meta.title : ''}</span>
                `;
                slideDiv.appendChild(footer);
            }

            // Footer with slide number for all non-title slides
            if (!isTitleSlide) {
                const footer = document.createElement('div');
                footer.className = 'slide-chrome-footer';
                footer.innerHTML = `
                    <span>&copy; ${new Date().getFullYear()} Xebia. All rights reserved</span>
                    <span class="chrome-slide-num">${index + 1}</span>
                `;
                slideDiv.appendChild(footer);
            }
        }

        slideContainer.appendChild(slideDiv);
        slides.push(slideDiv);
    });
}

// --- Slide rendering & navigation ---

function renderSlide() {
    slides.forEach((slide, index) => {
        if (index === currentSlideIndex) {
            slide.classList.add('active');
            slide.style.opacity = '1';
            slide.style.pointerEvents = 'auto';
        } else {
            slide.classList.remove('active');
            slide.style.opacity = '0';
            slide.style.pointerEvents = 'none';
        }
    });

    // Initialize Steps for the new slide
    const activeSlide = slides[currentSlideIndex];
    if (activeSlide) {
        const steps = Array.from(activeSlide.querySelectorAll('[data-step]'));
        const stepValues = new Set(steps.map(el => parseInt(el.dataset.step)));
        currentSlideStepValues = Array.from(stepValues).sort((a, b) => a - b);
        currentStepIndex = -1;
        steps.forEach(el => el.classList.remove('step-visible'));
    } else {
        currentSlideStepValues = [];
        currentStepIndex = -1;
    }

    // Update controls
    slideNumber.textContent = `${currentSlideIndex + 1} / ${slides.length}`;

    if (slideFiles[currentSlideIndex]) {
        slideFilename.textContent = `(${slideFiles[currentSlideIndex]})`;
    } else {
        slideFilename.textContent = '';
    }

    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;

    // Update URL hash
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
    if (currentSlideStepValues.length > 0 && currentStepIndex < currentSlideStepValues.length - 1) {
        currentStepIndex++;
        const stepValue = currentSlideStepValues[currentStepIndex];
        const activeSlide = slides[currentSlideIndex];
        activeSlide.querySelectorAll(`[data-step="${stepValue}"]`).forEach(el => el.classList.add('step-visible'));

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
    if (currentSlideStepValues.length > 0 && currentStepIndex >= 0) {
        const stepValue = currentSlideStepValues[currentStepIndex];
        const activeSlide = slides[currentSlideIndex];
        activeSlide.querySelectorAll(`[data-step="${stepValue}"]`).forEach(el => el.classList.remove('step-visible'));
        currentStepIndex--;

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

// --- Event listeners ---

function setupEventListeners() {
    window.addEventListener('hashchange', () => {
        const hashStr = window.location.hash;
        const slidePart = hashStr.match(/slide-(\d+)/);
        const stepPart = hashStr.match(/step-(\d+)/);

        if (slidePart) {
            const newSlideIndex = Math.max(0, Math.min(parseInt(slidePart[1]) - 1, slides.length - 1));
            const newStepIndex = stepPart ? parseInt(stepPart[1]) - 1 : -1;

            if (newSlideIndex !== currentSlideIndex) {
                currentSlideIndex = newSlideIndex;
                renderSlide();
                if (newStepIndex > -1) applySteps(newStepIndex);
            } else if (newStepIndex !== currentStepIndex) {
                applySteps(newStepIndex);
            }
        }
    });

    slideContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
        nextSlide();
    });

    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
    presenterBtn.addEventListener('click', (e) => { e.stopPropagation(); openPresenterMode(); });
    fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
    exitBtn.addEventListener('click', (e) => { e.stopPropagation(); exitPresentation(); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key.toLowerCase() === 'f') {
            toggleFullscreen();
        }
    });

    let touchStartX = 0;
    document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextSlide();
        if (touchEndX - touchStartX > 50) prevSlide();
    });
}

function setupBroadcastListener() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('receiver') === 'false') return;

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

// --- Actions ---

function exitPresentation() {
    if (!confirm('Exit this presentation?')) return;
    sessionStorage.removeItem('quickpoint_contents');
    sessionStorage.removeItem('quickpoint_filenames');
    window.close();
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
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function applySteps(targetStepIndex) {
    currentStepIndex = targetStepIndex;
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

    const baseWidth = 1280;
    const baseHeight = 720;

    const scaleX = windowWidth / baseWidth;
    const scaleY = windowHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    app.style.width = `${baseWidth}px`;
    app.style.height = `${baseHeight}px`;
    app.style.transform = `scale(${scale})`;
    app.style.transformOrigin = 'center center';

    app.style.position = 'absolute';
    app.style.top = '50%';
    app.style.left = '50%';
    app.style.marginTop = `-${baseHeight/2}px`;
    app.style.marginLeft = `-${baseWidth/2}px`;

    document.body.style.overflow = 'hidden';
}

// Start the app
init();
