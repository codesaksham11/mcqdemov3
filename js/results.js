// js/results.js (FINAL VERSION - Use this whole file)
document.addEventListener('DOMContentLoaded', () => {
    console.log("Results page loaded."); // DEBUG LOG

    const feedbackMessage = document.getElementById('feedback-message');
    const scoreDisplay = document.getElementById('score');
    const timeTakenDisplay = document.getElementById('time-taken');
    const toggleDetailsBtn = document.getElementById('toggle-details-btn');
    const detailsContainer = document.getElementById('details-container');

    // --- Load Results ---
    const resultsString = sessionStorage.getItem('mcqTestResults');
    if (!resultsString) {
        console.error("Test results not found in sessionStorage."); // DEBUG LOG
        displayError("Test results not found. Please complete a test first.");
         if(toggleDetailsBtn) toggleDetailsBtn.style.display = 'none'; // Hide button if no results
        return;
    }

    let results = null;
    try {
         results = JSON.parse(resultsString);
         console.log("Loaded results from sessionStorage:", results); // DEBUG LOG
    } catch (e) {
        console.error("Error parsing results from sessionStorage:", e); // DEBUG LOG
         displayError("Could not load test results. Data might be corrupted.");
         if(toggleDetailsBtn) toggleDetailsBtn.style.display = 'none';
         return;
    }


    // --- Validate Loaded Data ---
    if (!results || !results.config || !results.questionsAsked || !results.userAnswers || typeof results.timeTaken === 'undefined' || typeof results.timeout === 'undefined') {
         console.error("Loaded results data is incomplete:", results); // DEBUG LOG
         displayError("Loaded results data is incomplete or invalid.");
          if(toggleDetailsBtn) toggleDetailsBtn.style.display = 'none';
         return;
    }

    const config = results.config;
    const questionsAsked = results.questionsAsked;
    const userAnswers = results.userAnswers;
    const timeTaken = results.timeTaken; // In seconds
    const timeout = results.timeout; // Should be true or false

     console.log(`Timeout flag read as: ${timeout} (Type: ${typeof timeout})`); // DEBUG LOG

    // --- Calculate Score ---
    let correctAnswers = 0;
    if (Array.isArray(questionsAsked)) {
        questionsAsked.forEach((q, index) => {
            // Basic check on question structure
            if (q && typeof q.correctAnswer !== 'undefined') {
                 const correctAnswer = q.correctAnswer;
                 const userAnswer = userAnswers[index];
                 if (userAnswer === correctAnswer) {
                    correctAnswers++;
                 }
            } else {
                 console.warn(`Invalid question structure at index ${index}:`, q); // DEBUG LOG
            }
        });
    } else {
         console.error("questionsAsked is not an array:", questionsAsked); // DEBUG LOG
         displayError("Error processing question results.");
         return; // Stop further processing if questions are invalid
    }


    const totalQuestions = questionsAsked.length;
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    console.log(`Score calculated: ${correctAnswers}/${totalQuestions} (${scorePercentage}%)`); // DEBUG LOG

    // --- Display Summary ---
    // Score
    scoreDisplay.textContent = `${correctAnswers}/${totalQuestions}`;

    // Time Taken
    if (timeout === true) { // Explicitly check for true
        console.log("Displaying 'Time out'."); // DEBUG LOG
        timeTakenDisplay.textContent = "Time out";
        timeTakenDisplay.style.color = "red";
    } else {
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
         console.log(`Displaying time taken: ${minutes} min ${seconds} sec`); // DEBUG LOG
        timeTakenDisplay.textContent = `${minutes} min ${seconds.toString().padStart(2, '0')} sec`;
        timeTakenDisplay.style.color = ""; // Reset color
    }

    // Feedback Message (No changes needed here, logic seems fine)
    let feedbackText = "";
    if (scorePercentage === 100) feedbackText = "Perfect! You nailed it!";
    else if (scorePercentage >= 80) feedbackText = "Appreciable!";
    else if (scorePercentage >= 50) feedbackText = "Little more effort needed.";
    else if (scorePercentage >= 25) feedbackText = "Needs more practice.";
    else feedbackText = "Try harder!";
    feedbackMessage.textContent = feedbackText;
    feedbackMessage.className = `feedback p${Math.floor(scorePercentage/10) * 10}`;

    // --- Detailed Results ---
    if (toggleDetailsBtn && detailsContainer) { // Ensure elements exist
        toggleDetailsBtn.addEventListener('click', () => {
             console.log("Toggle details button clicked."); // DEBUG LOG
            // Use computed style to check visibility, more reliable than inline style check
            const isCurrentlyHidden = window.getComputedStyle(detailsContainer).display === 'none';
             console.log(`Details currently hidden? ${isCurrentlyHidden}`); // DEBUG LOG

            if (isCurrentlyHidden) {
                console.log("Expanding details."); // DEBUG LOG
                if (detailsContainer.innerHTML === '') { // Only generate if empty
                     console.log("Container is empty, generating details..."); // DEBUG LOG
                    generateDetailedResults(questionsAsked, userAnswers);
                } else {
                     console.log("Container not empty, just showing."); // DEBUG LOG
                }
                detailsContainer.style.display = 'block'; // Show it
                toggleDetailsBtn.textContent = 'Hide Full Details';
            } else {
                 console.log("Hiding details."); // DEBUG LOG
                detailsContainer.style.display = 'none'; // Hide it
                toggleDetailsBtn.textContent = 'Show Full Details';
            }
        });
    } else {
         console.error("Could not find toggle button or details container."); // DEBUG LOG
         if(toggleDetailsBtn) toggleDetailsBtn.style.display = 'none'; // Hide button if container missing
    }


    function generateDetailedResults(questions, answers) {
        // Ensure container exists before modifying
        if (!detailsContainer) {
             console.error("generateDetailedResults: detailsContainer not found.");
             return;
        }
        console.log(`Generating details for ${questions.length} questions.`); // DEBUG LOG

        detailsContainer.innerHTML = ''; // Clear previous content

        if (!Array.isArray(questions) || questions.length === 0) {
            console.warn("generateDetailedResults: No questions data to display."); // DEBUG LOG
            detailsContainer.innerHTML = '<p>No detailed results available.</p>';
            return;
        }


        questions.forEach((q, index) => {
             // Robust check for question validity
             if (!q || typeof q.question !== 'string' || typeof q.options !== 'object' || q.options === null || typeof q.correctAnswer === 'undefined') {
                console.warn(`Skipping invalid question object at index ${index}:`, q);
                const errorItem = document.createElement('div');
                errorItem.className = 'result-item skipped'; // Style as skipped/error
                errorItem.innerHTML = `<p class="question-text"><strong>${index + 1}. Error loading this question data.</strong></p>`;
                detailsContainer.appendChild(errorItem);
                 return; // Skip to next iteration
            }

             console.log(`Generating details for Q${index}: ${q.question.substring(0, 30)}...`); // DEBUG LOG

            const userAnswer = answers[index];
            const correctAnswerKey = q.correctAnswer;

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item'; // Base class

            let itemStatusClass = 'skipped'; // Default to skipped
            if (userAnswer === correctAnswerKey) {
                itemStatusClass = 'correct';
            } else if (userAnswer !== undefined) { // User answered, but incorrectly
                itemStatusClass = 'incorrect';
            }
            resultItem.classList.add(itemStatusClass); // Add correct/incorrect/skipped class

            const questionTextP = document.createElement('p');
            questionTextP.className = 'question-text';
            questionTextP.innerHTML = `<strong>${index + 1}. ${q.question}</strong>`;
            resultItem.appendChild(questionTextP);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options-review';

            // Loop through options
            for (const key in q.options) {
                 if (Object.hasOwnProperty.call(q.options, key)) { // Ensure it's a direct property
                    const optionText = q.options[key];
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option-result';

                    let indicator = '';
                    if (key === correctAnswerKey) {
                        indicator += ' <span class="indicator correct-indicator">✓</span>';
                    }
                    if (key === userAnswer && userAnswer !== correctAnswerKey) {
                        indicator += ' <span class="indicator incorrect-indicator">✗</span>';
                    }

                    optionDiv.innerHTML = `${key.toUpperCase()}) ${optionText}${indicator}`;

                    if (key === correctAnswerKey) {
                         optionDiv.classList.add('correct-answer-text');
                    }
                    if (key === userAnswer) {
                        optionDiv.classList.add('user-answer-text');
                    }
                    optionsDiv.appendChild(optionDiv);
                 }
            }
            resultItem.appendChild(optionsDiv);
            detailsContainer.appendChild(resultItem);
        });
         console.log("Finished generating details.");// DEBUG LOG
    }

     function displayError(message) {
         const summarySection = document.getElementById('summary-results');
         if (summarySection) {
             summarySection.innerHTML = `<p style="color: red; font-weight: bold;">${message}</p>`;
         } else {
             // Fallback if summary section not found
             document.body.insertAdjacentHTML('afterbegin', `<p style="color: red; text-align: center; padding: 1rem; background: white;">${message}</p>`);
         }
     }
});
