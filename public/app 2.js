//Variables
        let studentName = '', quizzes = [], currentQuiz = null, questions = [];
let currentQuestionIndex = 0, userAnswers = [], correctAnswers = 0;
let startTime = null, timerInterval = null;

//Add an event listener to the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', init);

            async function init() {
    try {
                  const response = await fetch('http://localhost:3000/quizzes');
  if (!response.ok) throw new Error('Failed to load quizzes');
        
                 quizzes = await response.json();
                 console.log('Loaded quizzes:', quizzes);
        renderWelcomeScreen();
             } catch (error) {
                 console.error('Error:', error);
 document.getElementById('app-container').innerHTML = `
            <div class="alert alert-danger"><strong>Error:</strong> ${error.message}</div>`;
    }
}

//First and welcome screen
function renderWelcomeScreen() {
    const template = Handlebars.compile(document.getElementById('welcomeTemplate').innerHTML);
    document.getElementById('app-container').innerHTML = template({ quizzes });
                document.getElementById('welcomeForm').addEventListener('submit', handleWelcomeForm);
}

//Get question count for a quiz
async function getQuestionCount(quizId) {
    try {
                    const response = await fetch(`http://localhost:3000/questions?quizId=${quizId}`);
              if (!response.ok) throw new Error('Failed to load questions');
          return (await response.json()).length;
    } catch (error) {
        console.error('Error getting question count:', error);
           return 7; // Fallback
    }   }

//When we submit the form
async function handleWelcomeForm(e) {
                 e.preventDefault();
    
             const nameInput = document.getElementById('nameStudent');
  const selectedQuiz = document.querySelector('input[name="quiz-select"]:checked');
    
    if (!nameInput.value.trim()) {
        alert('Please enter your name');
        return;
    }
    
    if (!selectedQuiz) {
        alert('Please select a quiz');
        return;
    }
    
    studentName = nameInput.value.trim();
    const quizId = parseInt(selectedQuiz.value);
    
    // Find the selected quiz
    currentQuiz = quizzes.find(q => Number(q.id) === quizId);
    
    if (!currentQuiz) {
        alert(`Error: Quiz with ID ${quizId} not found.`);
        return;
    }
    
    // Set quiz properties and initialize state
    currentQuiz.totalQuestions = await getQuestionCount(quizId);
    currentQuestionIndex = 0;
    userAnswers = [];
    correctAnswers = 0;
    questions = [];
    startTime = new Date();
    
    startTimer();
    loadQuestion(quizId);
}

// Timer functions
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.textContent = timeString;
}

// Load a question
async function loadQuestion(quizId) {
    try {
        const response = await fetch(`http://localhost:3000/questions?quizId=${quizId}`);
        if (!response.ok) throw new Error('Failed to load questions');
        
        const allQuestions = await response.json();
        
        // Check if we've reached the end or no questions found
        if (allQuestions.length === 0 || currentQuestionIndex >= allQuestions.length) {
            showResults();
            return;
        }
        
        const question = allQuestions[currentQuestionIndex];
        if (!question) {
            showResults();
            return;
        }
        
        questions.push(question);
        renderQuestion(question);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('app-container').innerHTML = `
            <div class="alert alert-danger"><strong>Error:</strong> ${error.message}</div>`;
    }
}

// Render the current question
function renderQuestion(question) {
    const template = Handlebars.compile(document.getElementById('questionlayout').innerHTML);
    
    document.getElementById('app-container').innerHTML = template({
        question,
        currentIndex: currentQuestionIndex + 1,
        totalQuestions: currentQuiz.totalQuestions || 7,
        isMultipleChoice: question.type === 'multiple-choice',
        isTrueFalse: question.type === 'true-false',
        codeSnippet: question.codeSnippet,
        answered: userAnswers.length,
        score: calculateScore(),
        time: getElapsedTime()
    });
    
    document.getElementById('answer-form').addEventListener('submit', handleAnswer);
}

// Helper functions
function calculateScore() {
    return userAnswers.length === 0 ? 0 : Math.round((correctAnswers / userAnswers.length) * 100);
}

function getElapsedTime() {
    if (!startTime) return '0:00';
    
    const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Handle answer submission
function handleAnswer(e) {
    e.preventDefault();
    
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    
    if (!selectedOption) {
        alert('Please select an answer');
        return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    let userAnswer = selectedOption.value;
    
    if (currentQuestion.type === 'true-false') {
        userAnswer = userAnswer === 'true';
    }
    
    userAnswers.push(userAnswer);
    
    if (userAnswer === currentQuestion.correctAnswer) {
        correctAnswers++;
        showCorrectFeedback();
    } else {
        showIncorrectFeedback(userAnswer, currentQuestion.correctAnswer, currentQuestion.explanation);
    }
}

// Show feedback for correct answer
function showCorrectFeedback() {
    const messages = ['Brilliant!', 'Awesome!', 'Good work!', 'Excellent!', 'Great job!'];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const template = Handlebars.compile(document.getElementById('correct-template').innerHTML);
    document.getElementById('app-container').innerHTML = template({ message: randomMessage });
    
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion(currentQuiz.id);
    }, 1000);
}

// Show feedback for incorrect answer
function showIncorrectFeedback(userAnswer, correctAnswer, explanation) {
    const template = Handlebars.compile(document.getElementById('incorrect-template').innerHTML);
    
    document.getElementById('app-container').innerHTML = template({
        userAnswer, correctAnswer, explanation
    });
    
    document.getElementById('got-it-btn').addEventListener('click', () => {
        currentQuestionIndex++;
        loadQuestion(currentQuiz.id);
    });
}

// Show quiz results
function showResults() {
    if (timerInterval) clearInterval(timerInterval);
    
    const score = calculateScore();
    const passed = score >= 80;
    
    const template = Handlebars.compile(document.getElementById('results-template').innerHTML);
    
    document.getElementById('app-container').innerHTML = template({
        name: studentName,
        score,
        passed,
        correct: correctAnswers,
        total: userAnswers.length,
        time: getElapsedTime()
    });
    
    // Add button event listeners
    document.getElementById('retake-btn').addEventListener('click', () => {
        currentQuestionIndex = 0;
        userAnswers = [];
        correctAnswers = 0;
        questions = [];
        startTime = new Date();
        startTimer();
        loadQuestion(currentQuiz.id);
    });
    
    document.getElementById('home-btn').addEventListener('click', renderWelcomeScreen);
}