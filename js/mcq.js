// js/mcq.js (FINAL VERSION - Use this whole file)
document.addEventListener('DOMContentLoaded', () => {
    console.log("MCQ page script loaded."); // DEBUG LOG

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
        console.log("Initializing quiz..."); // DEBUG LOG

        // 1. Get Configuration from URL and Session Storage
        const urlParams = new URLSearchParams(window.location.search);
        const urlLevel = urlParams.get('level'); // Get level from ?level=...

        const configString = sessionStorage.getItem('mcqTestConfig');
        if (!configString) {
            console.error("Configuration not found in sessionStorage."); // DEBUG LOG
            showError("Configuration not found. Please go back and set up the test.");
            if(submitTestBtn) submitTestBtn.disabled = true;
            return;
        }

        try {
            testConfig = JSON.parse(configString);
            console.log("Loaded testConfig from sessionStorage:", testConfig); // DEBUG LOG
        } catch(e) {
             console.error("Error parsing testConfig from sessionStorage:", e); // DEBUG LOG
             showError("Configuration data is corrupted. Please go back and set up the test.");
             if(submitTestBtn) submitTestBtn.disabled = true;
             return;
        }


        // --- Security/Consistency Check: Ensure URL level matches stored config level ---
        if (!urlLevel || urlLevel !== testConfig.level) {
             console.error(`Mismatch or missing level parameter. URL: '${urlLevel}', Config: '${testConfig.level}'`); // DEBUG LOG
             showError(`Configuration mismatch. Please start the test process again from the main page.`);
              if(submitTestBtn) submitTestBtn.disabled = true;
             // Consider redirecting: window.location.href = 'index.html';
             return;
        }
         console.log(`Level confirmed: ${testConfig.level}`); // DEBUG LOG

        // Set initial time from config
        timeRemaining = testConfig.timeLimit;

        // 2. Get Correct Question Bank
        let questionBank = [];
        console.log(`Attempting to load question bank for level: ${testConfig.level}`); // DEBUG LOG
        if (testConfig.level === 'see') {
            questionBank = typeof seeQuestions !== 'undefined' ? seeQuestions : [];
        } else if (testConfig.level === 'basic') {
            questionBank = typeof basicQuestions !== 'undefined' ? basicQuestions : [];
        } else if (testConfig.level === 'ktm') {
            questionBank = typeof ktmQuestions !== 'undefined' ? ktmQuestions : [];
        }

        if (!Array.isArray(questionBank)) {
             console.error(`Question bank for level "${testConfig.level}" is not an array or is missing.`); // DEBUG LOG
             showError(`Question bank data is invalid for level "${testConfig.level}".`);
             if(submitTestBtn) submitTestBtn.disabled = true;
             return;
        }
         if (questionBank.length === 0) {
             console.warn(`Question bank for level "${testConfig.level}" is empty.`); // DEBUG LOG
             showError(`No questions are available for the level "${testConfig.level}".`);
             if(submitTestBtn) submitTestBtn.disabled = true;
             return;
         }
         console.log(`Loaded ${questionBank.length} questions for level ${testConfig.level}.`); // DEBUG LOG

        // 3. Filter and Select Questions
        questions = selectQuestions(questionBank, testConfig);
         console.log(`Selected ${questions.length} questions for the test.`); // DEBUG LOG

        if (questions.length === 0) {
             console.warn("No questions matched the selection criteria."); // DEBUG LOG
             showError("No questions available for the selected criteria.");
             if(submitTestBtn) submitTestBtn.disabled = true;
             return;
        }
        // Adjust requested number if fewer available (selectQuestions handles some logging)
        if (questions.length < testConfig.numQuestions) {
            testConfig.numQuestions = questions.length; // Use the actual number selected
             console.log(`Adjusted number of questions to ${testConfig.numQuestions} based on availability.`); // DEBUG LOG
        }


        // 4. Render Questions
         console.log("Rendering questions..."); // DEBUG LOG
        renderQuestions(questions);

        // 5. Start Timer
         console.log("Starting timer..."); // DEBUG LOG
        startTimer();

        // 6. Setup Submit Button
        if (submitTestBtn) {
             console.log("Setting up submit button listener."); // DEBUG LOG
             submitTestBtn.disabled = false; // Ensure it's enabled initially
             submitTestBtn.addEventListener('click', () => {
                console.log("Submit button clicked."); // DEBUG LOG
                submitQuiz(false); // Explicitly pass false for manual submit
             });
        } else {
             console.error("Submit button element not found!"); // DEBUG LOG
        }


        if(loadingMessage) loadingMessage.style.display = 'none'; // Hide loading message
        console.log("Quiz initialization complete."); // DEBUG LOG
    }

    // --- Question Selection Logic ---
    function selectQuestions(bank, config) {
        console.log("Selecting questions based on config:", config); // DEBUG LOG
        const selectedSubjects = config.subjects;
        const numQuestionsNeeded = config.numQuestions;

        if (!Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
             console.error("Config subjects is invalid or empty."); // DEBUG LOG
             return [];
        }

        // Filter by selected subjects
        const availableQuestionsBySubject = {};
        selectedSubjects.forEach(subj => {
            availableQuestionsBySubject[subj] = bank.filter(q => q && q.subject === subj);
            // Shuffle within each subject pool for randomness
            shuffleArray(availableQuestionsBySubject[subj]);
            console.log(`Found ${availableQuestionsBySubject[subj].length} questions for subject: ${subj}`); // DEBUG LOG
        });

        let finalQuestions = [];
        const numSubjects = selectedSubjects.length;

        // Determine questions per subject
        const baseQuestionsPerSubject = Math.floor(numQuestionsNeeded / numSubjects);
        let remainderQuestions = numQuestionsNeeded % numSubjects;
        console.log(`Base questions/subject: ${baseQuestionsPerSubject}, Remainder: ${remainderQuestions}`); // DEBUG LOG

        // Priority order for remainder
        const subjectPriority = {
            see: ['Science', 'Social', 'Math', 'Opt Math'],
            basic: ['English', 'Biology', 'Chemistry', 'Physics', 'Math'], // Confirmed priority
            ktm: ['English', 'Biology', 'Chemistry', 'Physics', 'Math']   // Confirmed priority
        };
        const priorityOrder = subjectPriority[config.level] || selectedSubjects; // Fallback if level unknown

        // Allocate questions
        priorityOrder.forEach(subj => {
            if (!selectedSubjects.includes(subj)) return; // Skip if subject wasn't selected

            let questionsToTake = baseQuestionsPerSubject;

            // Check if this subject exists in our available pool
            if(!availableQuestionsBySubject[subj]) {
                 console.warn(`No questions available for prioritized subject: ${subj}`);
                 return; // Skip this subject if no questions were found for it
            }

            // Add remainder based on priority
            if (remainderQuestions > 0) {
                questionsToTake++;
                remainderQuestions--;
            }

            // Take questions, ensuring we don't take more than available
             const countAvailable = availableQuestionsBySubject[subj].length;
             const actualToTake = Math.min(questionsToTake, countAvailable);

             console.log(`Subject ${subj}: Need ${questionsToTake}, Available ${countAvailable}, Taking ${actualToTake}`); // DEBUG LOG


            const questionsFromThisSubject = availableQuestionsBySubject[subj].slice(0, actualToTake);
            finalQuestions = finalQuestions.concat(questionsFromThisSubject);

            if(actualToTake < questionsToTake) {
                 console.warn(`Could only take ${actualToTake} questions for ${subj}, needed ${questionsToTake}.`);
                 // Note: This simple logic doesn't redistribute shortages.
            }
        });

        console.log(`Total questions allocated before final shuffle: ${finalQuestions.length}`); // DEBUG LOG

        // If we allocated fewer than needed (due to shortages), use what we have
        if (finalQuestions.length < numQuestionsNeeded) {
             console.warn(`Could only gather ${finalQuestions.length} questions, requested ${numQuestionsNeeded}.`);
        } else if (finalQuestions.length > numQuestionsNeeded) {
             // This *shouldn't* happen with floor/remainder logic, but as a safeguard:
             console.warn(`Allocated ${finalQuestions.length} questions, more than requested ${numQuestionsNeeded}. Trimming.`);
             finalQuestions = finalQuestions.slice(0, numQuestionsNeeded);
        }


        // Shuffle the final list of questions
        shuffleArray(finalQuestions);
        console.log("Final question list shuffled."); // DEBUG LOG

        return finalQuestions;
    }


    // --- Rendering ---
     function renderQuestions(qs) {
        if(!quizArea) {
             console.error("Cannot render questions, quizArea element not found.");
             return;
        }
        quizArea.innerHTML = ''; // Clear previous content/loading msg
        let currentSubjectHeader = null;

        if (!Array.isArray(qs) || qs.length === 0) {
             console.warn("renderQuestions called with empty or invalid questions array.");
             quizArea.innerHTML = '<p>No questions to display.</p>';
             return;
        }

        qs.forEach((q, index) => {
             // Basic validation of question object structure
             if (!q || !q.subject || !q.question || !q.options || typeof q.options !== 'object') {
                 console.warn(`Skipping rendering invalid question object at index ${index}:`, q);
                 const errorBlock = document.createElement('section');
                 errorBlock.className = 'question-block';
                 errorBlock.innerHTML = `<p class="question-text" style="color:red;">${index + 1}. Error: Invalid question data.</p>`;
                 quizArea.appendChild(errorBlock);
                 return; // Skip this question
             }


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
            questionBlock.dataset.questionIndex = index;

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${q.question}`;
            questionBlock.appendChild(questionText);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';

            // Create options (assuming a, b, c, d keys)
            for (const key in q.options) {
                 if (Object.hasOwnProperty.call(q.options, key)) { // Important check
                    const label = document.createElement('label');
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `q${index}`;
                    input.value = key;
                    input.dataset.questionIndex = index;

                    input.addEventListener('change', handleAnswerSelection);

                    label.appendChild(input);
                    label.appendChild(document.createTextNode(` ${key.toUpperCase()}) ${q.options[key]}`));
                    optionsDiv.appendChild(label);
                    optionsDiv.appendChild(document.createElement('br'));
                 }
            }

            questionBlock.appendChild(optionsDiv);
            quizArea.appendChild(questionBlock);
        });
         console.log("Finished rendering questions."); // DEBUG LOG
    }

    function handleAnswerSelection(event) {
         const selectedOption = event.target;
         const questionIndex = parseInt(selectedOption.dataset.questionIndex, 10);
         const answerValue = selectedOption.value;
         userAnswers[questionIndex] = answerValue;
         console.log(`Q${questionIndex} answered: ${answerValue}`); // DEBUG LOG
    }

    // --- Timer ---
    function startTimer() {
         if (!timerDisplay) {
              console.error("Timer display element not found.");
              return;
         }
         updateTimerDisplay(); // Initial display

         // Clear existing interval just in case
         if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                console.log("Time ran out."); // DEBUG LOG
                if (timerInterval) { // Ensure clear happens only once
                   clearInterval(timerInterval);
                   timerInterval = null;
                   console.log("Timer interval cleared due to timeout."); // DEBUG LOG
                   if (timerDisplay) {
                       timerDisplay.textContent = "Time out";
                       timerDisplay.style.color = "red";
                   }
                   submitQuiz(true); // Auto-submit when time runs out, passing true
                }

            }
        }, 1000);
        console.log("Timer started with interval ID:", timerInterval); // DEBUG LOG
    }

    function updateTimerDisplay() {
         if (!timerDisplay || timeRemaining < 0) return; // Prevent update if display missing or time negative
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // --- Submission ---
    function submitQuiz(isTimeout = false) {
        console.log(`submitQuiz called. isTimeout = ${isTimeout}`); // DEBUG LOG

        // Prevent multiple submissions if timer is already cleared
        if (!timerInterval && !isTimeout) { // Allow timeout submission even if interval cleared
            console.warn("Submit called after timer already stopped/timeout occurred. Ignoring.");
             return;
        }

        if (timerInterval) { // Stop the timer if it's still running
            clearInterval(timerInterval);
            timerInterval = null; // Mark as stopped
            console.log("Timer interval cleared by submitQuiz."); // DEBUG LOG
        }


        // Ensure questionsAsked and config exist before proceeding
        if (!questions || questions.length === 0 || !testConfig) {
            console.error("Cannot submit quiz, essential data (questions/config) is missing.");
            // Redirect or show error
            showError("Cannot submit quiz due to missing data. Please try again.");
            // window.location.href = 'index.html'; // Go home if something is critically wrong
            return;
        }


        const results = {
            config: testConfig,
            questionsAsked: questions,
            userAnswers: userAnswers,
             // Use Math.max to prevent negative time if there's a slight delay/overlap
            timeTaken: Math.max(0, testConfig.timeLimit - timeRemaining),
            timeout: isTimeout // Use the parameter passed to the function
        };

        console.log('Saving results to sessionStorage:', results); // DEBUG LOG

        try {
            sessionStorage.setItem('mcqTestResults', JSON.stringify(results));
            console.log('Results saved successfully. Navigating to results.html'); // DEBUG LOG
             // Navigate to results page
            window.location.href = 'results.html';
        } catch (e) {
            console.error("Error saving results to sessionStorage: ", e);
            // Handle storage error
            alert("Could not save test results. Local storage might be full or disabled.");
        }
    }

    // --- Utility ---
    function showError(message) {
        if(loadingMessage) {
            loadingMessage.textContent = message;
            loadingMessage.style.color = 'red';
            loadingMessage.style.display = 'block';
        } else {
             // Fallback alert if loading message area isn't available
             console.error("Loading message element not found, showing alert instead.");
             alert(`Error: ${message}`);
        }

    }

    // Fisher-Yates (Knuth) Shuffle
    function shuffleArray(array) {
         if (!Array.isArray(array)) return; // Safety check
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Start ---
    initializeQuiz();

});
