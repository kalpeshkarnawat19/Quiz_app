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
let timerIntervalId = null;
let quizStartedAt = null;
let transitionTimeoutId = null;

const views = {
    start: document.getElementById('start-page'),
    quiz: document.getElementById('quiz-page'),
    review: document.getElementById('review-page'),
    result: document.getElementById('result-page')
};

const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const quickSubmitBtn = document.getElementById('quick-submit-btn');
const backToQuizBtn = document.getElementById('back-to-quiz-btn');
const finalSubmitBtn = document.getElementById('final-submit-btn');
const restartBtn = document.getElementById('restart-btn');
const optionsContainer = document.getElementById('options-container');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const progressBar = document.getElementById('progress');
const errorMessage = document.getElementById('error-message');
const startErrorMessage = document.getElementById('start-error-message');
const questionContainer = document.getElementById('question-container');
const timerDisplay = document.getElementById('timer-display');
const questionPalette = document.getElementById('question-palette');
const answeredCount = document.getElementById('answered-count');

const reviewTotalEl = document.getElementById('review-total');
const reviewAnsweredEl = document.getElementById('review-answered');
const reviewUnansweredEl = document.getElementById('review-unanswered');
const reviewListEl = document.getElementById('review-list');

const finalScoreEl = document.getElementById('final-score');
const scoreRatioEl = document.getElementById('score-ratio');
const percentageValueEl = document.getElementById('percentage-value');
const performanceLabelEl = document.getElementById('performance-label');
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
submitBtn.addEventListener('click', openReviewStep);
quickSubmitBtn.addEventListener('click', submitQuiz);
backToQuizBtn.addEventListener('click', () => switchView('quiz'));
finalSubmitBtn.addEventListener('click', submitQuiz);
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

function formatElapsedTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getElapsedSeconds() {
    if (!quizStartedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - quizStartedAt) / 1000));
}

function updateTimerDisplay() {
    if (!timerDisplay) return;
    timerDisplay.textContent = formatElapsedTime(getElapsedSeconds());
}

function startTimer() {
    stopTimer();
    quizStartedAt = Date.now();
    updateTimerDisplay();
    timerIntervalId = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
}

function animateQuestionTransition(renderFn) {
    if (!questionContainer) {
        renderFn();
        return;
    }

    if (transitionTimeoutId) clearTimeout(transitionTimeoutId);
    questionContainer.classList.remove('transition-in');
    questionContainer.classList.add('transition-out');

    transitionTimeoutId = setTimeout(() => {
        renderFn();
        questionContainer.classList.remove('transition-out');
        questionContainer.classList.add('transition-in');
        transitionTimeoutId = setTimeout(() => {
            questionContainer.classList.remove('transition-in');
        }, 260);
    }, 130);
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
        startTimer();

        switchView('quiz');
        loadQuestion(false);
    } catch (error) {
        showStartError('Could not load quiz data. Confirm backend is running and CORS/API settings are correct.');
    } finally {
        startBtn.textContent = 'Start Quiz';
        startBtn.disabled = false;
    }
}

function buildQuestionPalette() {
    if (!questionPalette) return;

    questionPalette.innerHTML = quizData.map((_, index) => {
        return `<button class="palette-btn" type="button" data-index="${index}" aria-label="Go to question ${index + 1}">${index + 1}</button>`;
    }).join('');

    questionPalette.querySelectorAll('.palette-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const targetIndex = Number.parseInt(button.dataset.index, 10);
            if (!Number.isNaN(targetIndex)) {
                currentQuestionIndex = targetIndex;
                loadQuestion();
            }
        });
    });
}

function updateQuestionPalette() {
    if (!questionPalette || !quizData.length) return;
    const totalAnswered = Object.keys(userAnswers).length;
    if (answeredCount) {
        answeredCount.textContent = `${totalAnswered} / ${quizData.length} answered`;
    }

    questionPalette.querySelectorAll('.palette-btn').forEach((button, index) => {
        const question = quizData[index];
        const answered = userAnswers[question.id] !== undefined;
        button.classList.toggle('answered', answered);
        button.classList.toggle('current', index === currentQuestionIndex);
    });
}

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;

    const isLastQuestion = currentQuestionIndex === quizData.length - 1;
    nextBtn.classList.toggle('hidden', isLastQuestion);
    submitBtn.classList.toggle('hidden', !isLastQuestion);
    quickSubmitBtn.classList.toggle('hidden', !isLastQuestion);
}

function renderCurrentQuestion() {
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
            updateQuestionPalette();
        });

        const span = document.createElement('span');
        span.classList.add('option-text');
        span.textContent = option;

        label.appendChild(input);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    updateNavigationButtons();
    updateQuestionPalette();
    errorMessage.classList.add('hidden');
}

function loadQuestion(withAnimation = true) {
    if (!quizData.length) return;

    if (!questionPalette.children.length) {
        buildQuestionPalette();
    }

    if (withAnimation) {
        animateQuestionTransition(renderCurrentQuestion);
    } else {
        renderCurrentQuestion();
    }
}

function navigate(direction) {
    if (direction === 1) {
        const currentQ = quizData[currentQuestionIndex];
        if (userAnswers[currentQ.id] === undefined) {
            errorMessage.classList.remove('hidden');
            return;
        }
    }

    const targetIndex = currentQuestionIndex + direction;
    if (targetIndex >= 0 && targetIndex < quizData.length) {
        currentQuestionIndex = targetIndex;
        loadQuestion();
    }
}

function openReviewStep() {
    const total = quizData.length;
    const answered = Object.keys(userAnswers).length;
    const unanswered = Math.max(total - answered, 0);

    reviewTotalEl.textContent = String(total);
    reviewAnsweredEl.textContent = String(answered);
    reviewUnansweredEl.textContent = String(unanswered);

    reviewListEl.innerHTML = quizData.map((question, index) => {
        const selectedIndex = userAnswers[question.id];
        const selectedText = selectedIndex === undefined ? 'Not answered' : question.options[selectedIndex];

        return `
            <article class="review-item">
                <div class="review-item-head">
                    <h3 class="review-q">${index + 1}. ${question.question}</h3>
                    <button class="secondary-btn review-edit-btn" type="button" data-review-index="${index}">Edit</button>
                </div>
                <p class="review-answer"><strong>Selected:</strong> ${selectedText}</p>
            </article>
        `;
    }).join('');

    reviewListEl.querySelectorAll('.review-edit-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const targetIndex = Number.parseInt(button.dataset.reviewIndex, 10);
            if (!Number.isNaN(targetIndex)) {
                currentQuestionIndex = targetIndex;
                switchView('quiz');
                loadQuestion(false);
            }
        });
    });

    switchView('review');
}

function getPerformanceLabel(percentage) {
    if (percentage >= 85) return 'Excellent';
    if (percentage >= 65) return 'Good';
    return 'Needs Improvement';
}

function setSubmitLoadingState(isLoading) {
    finalSubmitBtn.disabled = isLoading;
    quickSubmitBtn.disabled = isLoading;
    finalSubmitBtn.textContent = isLoading ? 'Submitting...' : 'Final Submit';
    quickSubmitBtn.textContent = isLoading ? 'Submitting...' : 'Submit Now';
}

async function submitQuiz() {
    if (views.quiz.classList.contains('active')) {
        const currentQ = quizData[currentQuestionIndex];
        if (userAnswers[currentQ.id] === undefined) {
            errorMessage.classList.remove('hidden');
            return;
        }
    }

    try {
        setSubmitLoadingState(true);
        const payloadAnswers = quizData.reduce((acc, question) => {
            acc[question.id] = userAnswers[question.id] ?? null;
            return acc;
        }, {});

        const result = await requestApi('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAnswers: payloadAnswers })
        });

        renderResult(result);
    } catch (error) {
        errorMessage.textContent = 'Could not submit answers. Please try again.';
        errorMessage.classList.remove('hidden');
        switchView('quiz');
    } finally {
        setSubmitLoadingState(false);
    }
}

function renderResult(result) {
    const { score, total, breakdown } = result;
    const attempted = breakdown.filter((item) => item.userAnswerIndex !== null && item.userAnswerIndex !== undefined).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const performance = getPerformanceLabel(percentage);

    const breakdownHtml = breakdown.map((item, index) => {
        const hasUserAnswer = item.userAnswerIndex !== null && item.userAnswerIndex !== undefined;
        const userAnswer = hasUserAnswer ? item.options[item.userAnswerIndex] : 'Not answered';
        const correctAnswer = item.options[item.correctAnswerIndex];
        const userChipClass = hasUserAnswer ? (item.isCorrect ? 'correct' : 'incorrect') : '';

        return `
            <article class="breakdown-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <div class="breakdown-top">
                    <h3 class="breakdown-q">${index + 1}. ${item.question}</h3>
                    <span class="status-badge ${item.isCorrect ? 'correct' : 'incorrect'}">
                        ${item.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                </div>
                <p class="answer-row">
                    <strong>Your answer:</strong>
                    <span class="answer-chip ${userChipClass}">${userAnswer}</span>
                </p>
                <p class="answer-row">
                    <strong>Correct answer:</strong>
                    <span class="answer-chip correct">${correctAnswer}</span>
                </p>
            </article>
        `;
    }).join('');

    finalScoreEl.textContent = String(score);
    document.querySelector('.score-circle .total').textContent = `/ ${total}`;
    scoreRatioEl.textContent = `${score} / ${total}`;
    percentageValueEl.textContent = `${percentage}%`;
    performanceLabelEl.textContent = performance;
    correctCountEl.textContent = String(score);
    attemptedCountEl.textContent = String(attempted);
    accuracyEl.textContent = `${percentage}%`;
    breakdownContainer.innerHTML = breakdownHtml;

    progressBar.style.width = '100%';
    stopTimer();
    switchView('result');
}

function resetQuiz() {
    hideStartError();
    stopTimer();
    quizStartedAt = null;
    updateTimerDisplay();
    quizData = [];
    userAnswers = {};
    currentQuestionIndex = 0;
    if (questionPalette) questionPalette.innerHTML = '';
    if (answeredCount) answeredCount.textContent = '0 / 10 answered';
    errorMessage.textContent = 'Please select an answer to continue.';
    errorMessage.classList.add('hidden');
    switchView('start');
}
