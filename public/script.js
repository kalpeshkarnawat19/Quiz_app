const DEFAULT_API_TIMEOUT = 10000;
const FALLBACK_API_PORT = Number.parseInt(
    document.querySelector('meta[name="quiz-api-port"]')?.content || '3000',
    10
);
const EXPLICIT_API_BASE = document.querySelector('meta[name="quiz-api-base"]')?.content?.trim() || '';

let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let activeApiBase = normalizeBase(EXPLICIT_API_BASE);

const views = {
    start: document.getElementById('start-page'),
    quiz: document.getElementById('quiz-page'),
    result: document.getElementById('result-page')
};

const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const optionsContainer = document.getElementById('options-container');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const progressBar = document.getElementById('progress');
const errorMessage = document.getElementById('error-message');
const startErrorMessage = document.getElementById('start-error-message');

const finalScoreEl = document.getElementById('final-score');
const correctCountEl = document.getElementById('correct-count');
const attemptedCountEl = document.getElementById('attempted-count');
const accuracyEl = document.getElementById('accuracy');
const breakdownContainer = document.getElementById('breakdown-container');

const themeToggleWrapper = document.getElementById('theme-toggle-wrapper');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

startBtn.addEventListener('click', startQuiz);
prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));
submitBtn.addEventListener('click', submitQuiz);
restartBtn.addEventListener('click', resetQuiz);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        setTheme(isDark);
    });
    updateThemeFromStorage();
}

switchView('start');

function normalizeBase(baseUrl) {
    if (!baseUrl) return '';
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function isLocalDevOrigin() {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function getApiCandidates() {
    const ordered = [];
    const seen = new Set();
    const pushCandidate = (value) => {
        const normalized = normalizeBase(value);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        ordered.push(normalized);
    };

    pushCandidate(activeApiBase);
    pushCandidate(EXPLICIT_API_BASE);
    pushCandidate('');

    if (isLocalDevOrigin() && window.location.port !== String(FALLBACK_API_PORT)) {
        pushCandidate(`http://localhost:${FALLBACK_API_PORT}`);
    }

    return ordered;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function requestApi(path, options = {}) {
    const candidates = getApiCandidates();
    let lastError;

    for (const baseUrl of candidates) {
        const endpoint = `${baseUrl}${path}`;
        try {
            const response = await fetchWithTimeout(endpoint, options);
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Request failed (${response.status}): ${body || response.statusText}`);
            }

            activeApiBase = baseUrl;
            return await response.json();
        } catch (error) {
            lastError = error;
            console.error(`API request failed for ${endpoint}`, error);
        }
    }

    throw lastError || new Error('Unable to connect to quiz backend.');
}

function showStartError(message) {
    if (!startErrorMessage) return;
    startErrorMessage.textContent = message;
    startErrorMessage.classList.remove('hidden');
}

function hideStartError() {
    if (!startErrorMessage) return;
    startErrorMessage.classList.add('hidden');
    startErrorMessage.textContent = '';
}

function switchView(viewName) {
    Object.values(views).forEach((view) => view.classList.remove('active'));
    views[viewName].classList.add('active');

    if (themeToggleWrapper) {
        themeToggleWrapper.classList.toggle('hidden', viewName !== 'start');
    }
}

function setTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.src = 'icon-sun.svg';
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.src = 'icon-moon.svg';
    }
}

function updateThemeFromStorage() {
    const theme = localStorage.getItem('theme');
    setTheme(theme === 'dark');
}

async function startQuiz() {
    try {
        hideStartError();
        startBtn.textContent = 'Loading...';
        startBtn.disabled = true;

        let limit = Number.parseInt(document.getElementById('num-questions').value, 10);
        if (Number.isNaN(limit)) limit = 10;
        if (limit < 10) limit = 10;
        if (limit > 30) limit = 30;

        quizData = await requestApi(`/api/questions?limit=${limit}`);
        currentQuestionIndex = 0;
        userAnswers = {};

        switchView('quiz');
        loadQuestion();
    } catch (error) {
        showStartError('Could not load quiz data. Confirm backend is running and CORS/API settings are correct.');
    } finally {
        startBtn.textContent = 'Start Quiz';
        startBtn.disabled = false;
    }
}

function loadQuestion() {
    const currentQ = quizData[currentQuestionIndex];
    questionText.textContent = currentQ.question;
    questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.length}`;

    const progressPercent = (currentQuestionIndex / quizData.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    optionsContainer.innerHTML = '';
    currentQ.options.forEach((option, index) => {
        const label = document.createElement('label');
        label.classList.add('option-label');

        if (userAnswers[currentQ.id] === index) label.classList.add('selected');

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'quiz-option';
        input.value = index;
        input.checked = userAnswers[currentQ.id] === index;

        input.addEventListener('change', (event) => {
            document.querySelectorAll('.option-label').forEach((el) => el.classList.remove('selected'));
            label.classList.add('selected');
            userAnswers[currentQ.id] = Number.parseInt(event.target.value, 10);
            errorMessage.classList.add('hidden');
        });

        const span = document.createElement('span');
        span.classList.add('option-text');
        span.textContent = option;

        label.appendChild(input);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === quizData.length - 1) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }

    errorMessage.classList.add('hidden');
}

function navigate(direction) {
    if (direction === 1) {
        const currentQ = quizData[currentQuestionIndex];
        if (userAnswers[currentQ.id] === undefined) {
            errorMessage.classList.remove('hidden');
            return;
        }
    }

    currentQuestionIndex += direction;
    if (currentQuestionIndex >= 0 && currentQuestionIndex < quizData.length) {
        loadQuestion();
    }
}

async function submitQuiz() {
    const currentQ = quizData[currentQuestionIndex];
    if (userAnswers[currentQ.id] === undefined) {
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        const result = await requestApi('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAnswers })
        });

        renderResult(result);
    } catch (error) {
        errorMessage.textContent = 'Could not submit answers. Please try again.';
        errorMessage.classList.remove('hidden');
    } finally {
        submitBtn.textContent = 'Submit Quiz';
        submitBtn.disabled = false;
    }
}

function renderResult(result) {
    const { score, total, breakdown } = result;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

    const breakdownHtml = breakdown.map((item, index) => {
        const userAnswer =
            item.userAnswerIndex !== null && item.userAnswerIndex !== undefined
                ? item.options[item.userAnswerIndex]
                : 'Not answered';

        return `
            <article class="breakdown-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <div class="breakdown-top">
                    <h3 class="breakdown-q">${index + 1}. ${item.question}</h3>
                    <span class="status-badge ${item.isCorrect ? 'correct' : 'incorrect'}">
                        ${item.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                </div>
                <p class="answer-line"><strong>Your answer:</strong> ${userAnswer}</p>
                ${!item.isCorrect ? `<p class="answer-line"><strong>Correct answer:</strong> ${item.options[item.correctAnswerIndex]}</p>` : ''}
            </article>
        `;
    }).join('');

    finalScoreEl.textContent = String(score);
    document.querySelector('.score-circle .total').textContent = `/ ${total}`;
    correctCountEl.textContent = String(score);
    attemptedCountEl.textContent = String(total);
    accuracyEl.textContent = `${accuracy}%`;
    breakdownContainer.innerHTML = breakdownHtml;

    progressBar.style.width = '100%';
    switchView('result');
}

function resetQuiz() {
    hideStartError();
    errorMessage.textContent = 'Please select an answer to continue.';
    errorMessage.classList.add('hidden');
    switchView('start');
}
