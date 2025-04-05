// js/mcq.js
document.addEventListener('DOMContentLoaded', () => {
    const quizArea = document.getElementById('quiz-area');
    const loadingMessage = document.getElementById('loading-message');
    const timerDisplay = document.getElementById('time');
    const submitTestBtn = document.getElementById('submit-test-btn');

    let testConfig = null;
    let questions = [];
    let userAnswers = {}; // Store answers like { questionIndex: selectedOptionKey }
    let currentQuestionIndex = 0; // Track which question is potentially displayed (if paginated later)
    let timerInterval = null;
    let timeRemaining = 0;

    // --- Initialization ---
    function initializeQuiz() {
        // 1. Get Configuration
        const configString = sessionStorage.getItem('mcqTestConfig');
        if (!configString) {
            showError("Configuration not found. Please go back and set up the test.");
            submitTestBtn.disabled = true;
            return;
        }
        testConfig = JSON.parse(configString);
        timeRemaining = testConfig.timeLimit; // Time is already in seconds

        // 2. Get Correct Question Bank
        let questionBank = [];
        if (testConfig.level === 'see') {
            questionBank = typeof seeQuestions !== 'undefined' ? seeQuestions : [];
        } else if (testConfig.level === 'basic') {
            questionBank = typeof basicQuestions !== 'undefined' ? basicQuestions : []; // Assuming basic_questions.js exists
        } else if (testConfig.level === 'ktm') {
            questionBank = typeof ktmQuestions !== 'undefined' ? ktmQuestions : []; // Assuming ktm_questions.js exists
        }

        if (questionBank.length === 0) {
             showError(`Question bank for level "${testConfig.level}" not found or empty.`);
             submitTestBtn.disabled = true;
             return;
        }


        // 3. Filter and Select Questions
        questions = selectQuestions(questionBank, testConfig);

        if (questions.length === 0) {
             showError("No questions available for the selected criteria.");
              submitTestBtn.disabled = true;
             return;
        }
        if (questions.length < testConfig.numQuestions) {
            console.warn(`Warning: Only ${questions.length} questions available for selected criteria, requested ${testConfig.numQuestions}. Using available questions.`);
            testConfig.numQuestions = questions.length; // Adjust if needed
        }


        // 4. Render Questions
        renderQuestions(questions);

        // 5. Start Timer
        startTimer();

        // 6. Setup Submit Button
        submitTestBtn.addEventListener('click', submitQuiz);

        loadingMessage.style.display = 'none'; // Hide loading message
    }

    // --- Question Selection Logic ---
    function selectQuestions(bank, config) {
        const selectedSubjects = config.subjects;
        const numQuestionsNeeded = config.numQuestions;

        // Filter by selected subjects
        const availableQuestionsBySubject = {};
        selectedSubjects.forEach(subj => {
            availableQuestionsBySubject[subj] = bank.filter(q => q.subject === subj);
            // Shuffle within each subject pool for randomness
            shuffleArray(availableQuestionsBySubject[subj]);
        });

        let finalQuestions = [];
        const numSubjects = selectedSubjects.length;

        if (numSubjects === 0) return []; // Should not happen due to selection page validation

        // Determine questions per subject
        const baseQuestionsPerSubject = Math.floor(numQuestionsNeeded / numSubjects);
        let remainderQuestions = numQuestionsNeeded % numSubjects;

        // Priority order for remainder (SEE: Sci > Soc > Math > OptM; Basic/KTM: Eng > Bio > Chem > Phy > Math - adjust if needed)
         const subjectPriority = {
            see: ['Science', 'Social', 'Math', 'Opt Math'],
            basic: ['English', 'Biology', 'Chemistry', 'Physics', 'Math'], // Confirm this priority order
            ktm: ['English', 'Biology', 'Chemistry', 'Physics', 'Math']   // Confirm this priority order
        };
        const priorityOrder = subjectPriority[config.level] || selectedSubjects; // Fallback if level not found

        // Allocate questions
        priorityOrder.forEach(subj => {
             if (!selectedSubjects.includes(subj)) return; // Skip if subject wasn't selected

            let questionsToTake = baseQuestionsPerSubject;

            // Add remainder based on priority
            if (remainderQuestions > 0) {
                questionsToTake++;
                remainderQuestions--;
            }

            // Take questions from the shuffled pool for this subject
            const questionsFromThisSubject = availableQuestionsBySubject[subj].slice(0, questionsToTake);
            finalQuestions = finalQuestions.concat(questionsFromThisSubject);

             // Adjust needed number if bank had fewer questions than needed for this subject
             if(questionsFromThisSubject.length < questionsToTake) {
                 console.warn(`Subject ${subj} only had ${questionsFromThisSubject.length} questions, needed ${questionsToTake}.`);
                 // Note: This simple implementation doesn't reallocate shortages.
                 // A more complex version could try to fill the gap from other subjects if desired.
             }

        });

         // Shuffle the final list of questions so subjects aren't always grouped in the same final order
         shuffleArray(finalQuestions);

         // If somehow we got more questions than needed (shouldn't happen with this logic, but safety check)
         finalQuestions = finalQuestions.slice(0, numQuestionsNeeded);

        return finalQuestions;
    }


    // --- Rendering ---
     function renderQuestions(qs) {
        quizArea.innerHTML = ''; // Clear previous content/loading msg
        let currentSubjectHeader = null;

        qs.forEach((q, index) => {
             // Add Subject Subheader if it changes
            if(q.subject !== currentSubjectHeader) {
                const headerElement = document.createElement('h2');
                headerElement.className = 'subject-header';
                headerElement.textContent = `Subject: ${q.subject}`;
                quizArea.appendChild(headerElement);
                currentSubjectHeader = q.subject;
            }


            const questionBlock = document.createElement('section');
            questionBlock.className = 'question-block';
            questionBlock.dataset.questionIndex = index; // Store index

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${q.question}`; // Add question number
            questionBlock.appendChild(questionText);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';

            // Create options (assuming a, b, c, d keys)
            for (const key in q.options) {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `q${index}`; // Unique name for each question's radio group
                input.value = key;
                input.dataset.questionIndex = index; // Add index for easier event handling

                // Add event listener to update answers object
                input.addEventListener('change', handleAnswerSelection);

                label.appendChild(input);
                label.appendChild(document.createTextNode(` ${key.toUpperCase()}) ${q.options[key]}`)); // e.g., A) Option Text
                optionsDiv.appendChild(label);
                optionsDiv.appendChild(document.createElement('br')); // Line break for clarity
            }

            questionBlock.appendChild(optionsDiv);
            quizArea.appendChild(questionBlock);
        });
    }

    function handleAnswerSelection(event) {
         const selectedOption = event.target;
         const questionIndex = parseInt(selectedOption.dataset.questionIndex, 10);
         const answerValue = selectedOption.value;
         userAnswers[questionIndex] = answerValue; // Store the selected key (e.g., 'a', 'b')
         // console.log(`Q${questionIndex} answered:`, answerValue); // For debugging
    }

    // --- Timer ---
    function startTimer() {
        updateTimerDisplay(); // Initial display
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "Time out";
                timerDisplay.style.color = "red";
                submitQuiz(true); // Auto-submit when time runs out
            }
        }, 1000); // Update every second
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // --- Submission ---
    function submitQuiz(isTimeout = false) {
        clearInterval(timerInterval); // Stop the timer

        const results = {
            config: testConfig,
            questionsAsked: questions, // Include the actual questions shown
            userAnswers: userAnswers,
            timeTaken: testConfig.timeLimit - timeRemaining, // Calculate time elapsed in seconds
            timeout: isTimeout
        };

        sessionStorage.setItem('mcqTestResults', JSON.stringify(results));
        window.location.href = 'results.html';
    }

    // --- Utility ---
    function showError(message) {
        loadingMessage.textContent = message;
        loadingMessage.style.color = 'red';
        loadingMessage.style.display = 'block';
    }

    // Fisher-Yates (Knuth) Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Start ---
    initializeQuiz();

});
