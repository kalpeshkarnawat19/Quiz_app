// App State
let quizData = [];
let currentQuestionIndex = 0;
// userAnswers will now be an object mapped by question ID
let userAnswers = {};

// DOM Elements
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
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const optionsContainer = document.getElementById('options-container');
const questionNumber = document.getElementById('question-number');
const progressBar = document.getElementById('progress');
const errorMessage = document.getElementById('error-message');

const finalScoreEl = document.getElementById('final-score');
const breakdownContainer = document.getElementById('breakdown-container');

// Event Listeners
startBtn.addEventListener('click', startQuiz);
prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));
submitBtn.addEventListener('click', submitQuiz);
restartBtn.addEventListener('click', resetQuiz);
// Theme toggle logic with icon
function setTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.src = 'icon-sun.svg';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        if (themeIcon) themeIcon.src = 'icon-moon.svg';
        localStorage.setItem('theme', 'light');
    }
    // Force update of all CSS variables by toggling class on <body>
    document.body.offsetHeight; // force reflow
}

function updateThemeFromStorage() {
    const theme = localStorage.getItem('theme');
    setTheme(theme === 'dark');
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        setTheme(isDark);
    });
    // On load, set theme and icon from localStorage
    updateThemeFromStorage();
}

function switchView(viewName) {
    Object.values(views).forEach(view => view.classList.remove('active'));
    views[viewName].classList.add('active');
}

async function startQuiz() {
    try {
        startBtn.textContent = "Loading...";
        startBtn.disabled = true;

        let limit = document.getElementById('num-questions').value;
        if (limit < 10) limit = 10;
        if (limit > 30) limit = 30;

        const response = await fetch(`/api/questions?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch questions');

        quizData = await response.json();

        currentQuestionIndex = 0;
        userAnswers = {}; // Reset answers mapping

        startBtn.textContent = "Start Quiz";
        startBtn.disabled = false;

        switchView('quiz');
        loadQuestion();
    } catch (error) {
        console.error(error);
        alert('Could not load quiz data. Please check if the backend is running.');
        startBtn.textContent = "Start Quiz";
        startBtn.disabled = false;
    }
}

function loadQuestion() {
    const currentQ = quizData[currentQuestionIndex];
    questionText.textContent = currentQ.question;
    questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.length}`;

    // Update progress bar
    const progressPercent = ((currentQuestionIndex) / quizData.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Render options
    optionsContainer.innerHTML = '';
    currentQ.options.forEach((option, index) => {
        const label = document.createElement('label');
        label.classList.add('option-label');

        // Check if previously selected
        if (userAnswers[currentQ.id] === index) {
            label.classList.add('selected');
        }

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'quiz-option';
        input.value = index;
        if (userAnswers[currentQ.id] === index) {
            input.checked = true;
        }

        input.addEventListener('change', (e) => {
            // Remove selected class from all
            document.querySelectorAll('.option-label').forEach(el => el.classList.remove('selected'));
            // Add to current
            label.classList.add('selected');
            userAnswers[currentQ.id] = parseInt(e.target.value);
            errorMessage.classList.add('hidden');
        });

        const span = document.createElement('span');
        span.classList.add('option-text');
        span.textContent = option;

        label.appendChild(input);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    // Update buttons
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
        // Validate answer selection when moving forward
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
    // Validate last question
    const currentQ = quizData[currentQuestionIndex];
    if (userAnswers[currentQ.id] === undefined) {
        errorMessage.classList.remove('hidden');
        return;
    }

    try {
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;

        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userAnswers })
        });

        if (!response.ok) throw new Error('Failed to submit quiz');

        const result = await response.json();
        renderResult(result);
    } catch (error) {
        console.error(error);
        alert('Could not submit answers.');
    } finally {
        submitBtn.textContent = "Submit Quiz";
        submitBtn.disabled = false;
    }
}

function renderResult(result) {
    const { score, total, breakdown } = result;

    const breakdownHtml = breakdown.map((item, index) => {
        return `
            <div class="breakdown-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <div class="breakdown-q">${index + 1}. ${item.question}</div>
                <div class="breakdown-ans">
                    <span class="user-ans">Your Answer: ${item.userAnswerIndex !== null && item.userAnswerIndex !== undefined ? item.options[item.userAnswerIndex] : 'Not answered'}</span>
                    ${!item.isCorrect ? `<span class="correct-ans">Correct Answer: ${item.options[item.correctAnswerIndex]}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Update result view
    finalScoreEl.textContent = score;
    document.querySelector('.score-circle .total').textContent = `/ ${total}`;
    breakdownContainer.innerHTML = breakdownHtml;

    // Set final progress to 100%
    progressBar.style.width = '100%';

    setTimeout(() => {
        switchView('result');
    }, 300);
}

function resetQuiz() {
    switchView('start');
}
