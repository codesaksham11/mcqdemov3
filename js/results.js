// js/results.js
document.addEventListener('DOMContentLoaded', () => {
    const feedbackMessage = document.getElementById('feedback-message');
    const scoreDisplay = document.getElementById('score');
    const timeTakenDisplay = document.getElementById('time-taken');
    const toggleDetailsBtn = document.getElementById('toggle-details-btn');
    const detailsContainer = document.getElementById('details-container');

    // --- Load Results ---
    const resultsString = sessionStorage.getItem('mcqTestResults');
    if (!resultsString) {
        displayError("Test results not found. Please complete a test first.");
        return;
    }

    const results = JSON.parse(resultsString);
    const config = results.config;
    const questionsAsked = results.questionsAsked;
    const userAnswers = results.userAnswers;
    const timeTaken = results.timeTaken; // In seconds
    const timeout = results.timeout;

    // --- Calculate Score ---
    let correctAnswers = 0;
    questionsAsked.forEach((q, index) => {
        const correctAnswer = q.correctAnswer; // e.g., 'c'
        const userAnswer = userAnswers[index]; // e.g., 'a', 'c', or undefined if skipped
        if (userAnswer === correctAnswer) {
            correctAnswers++;
        }
    });
    const totalQuestions = questionsAsked.length;
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // --- Display Summary ---
    // Score
    scoreDisplay.textContent = `${correctAnswers}/${totalQuestions}`;

    // Time Taken
    if (timeout) {
        timeTakenDisplay.textContent = "Time out";
        timeTakenDisplay.style.color = "red";
    } else {
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        timeTakenDisplay.textContent = `${minutes} min ${seconds.toString().padStart(2, '0')} sec`;
         timeTakenDisplay.style.color = ""; // Reset color if not timeout
    }

    // Feedback Message
    let feedbackText = "";
    if (scorePercentage === 100) {
        feedbackText = "Perfect! You nailed it!";
    } else if (scorePercentage >= 80) { // >= 80 and < 100 (implicit)
        feedbackText = "Appreciable!";
    } else if (scorePercentage >= 50) { // >= 50 and < 80
        feedbackText = "Little more effort needed.";
    } else if (scorePercentage >= 25) { // >= 25 and < 50
        feedbackText = "Needs more practice.";
    } else { // < 25
        feedbackText = "Try harder!";
    }
     feedbackMessage.textContent = feedbackText;
     feedbackMessage.className = `feedback p${Math.floor(scorePercentage/10) * 10}`; // Add class for potential styling based on score range

    // --- Detailed Results ---
    toggleDetailsBtn.addEventListener('click', () => {
        const isHidden = detailsContainer.style.display === 'none';
        detailsContainer.style.display = isHidden ? 'block' : 'none';
        toggleDetailsBtn.textContent = isHidden ? 'Hide Full Details' : 'Show Full Details';
        if (isHidden && detailsContainer.innerHTML === '') { // Only generate if hidden and empty
             generateDetailedResults(questionsAsked, userAnswers);
        }
    });

    function generateDetailedResults(questions, answers) {
        detailsContainer.innerHTML = ''; // Clear existing

        questions.forEach((q, index) => {
            const userAnswer = answers[index]; // 'a', 'b', undefined etc.
            const correctAnswerKey = q.correctAnswer; // 'c'

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item'; // Base class

            let itemStatusClass = '';
             let correctIndicatorAdded = false; // Ensure tick is only on the truly correct answer

            // Question Text
            const questionTextP = document.createElement('p');
            questionTextP.className = 'question-text';
            questionTextP.innerHTML = `<strong>${index + 1}. ${q.question}</strong>`; // Bold question
            resultItem.appendChild(questionTextP);

             const optionsDiv = document.createElement('div');
             optionsDiv.className = 'options-review'; // Specific class for review layout

             // Determine overall status for background color
            if (userAnswer === undefined) {
                itemStatusClass = 'skipped'; // White background (default or specific class)
                 resultItem.classList.add(itemStatusClass);
            } else if (userAnswer === correctAnswerKey) {
                 itemStatusClass = 'correct'; // Less bright green
                 resultItem.classList.add(itemStatusClass);
            } else {
                itemStatusClass = 'incorrect'; // Less bright red
                 resultItem.classList.add(itemStatusClass);
            }


            // Loop through options (a, b, c, d)
            for (const key in q.options) {
                 const optionDiv = document.createElement('div');
                 optionDiv.className = 'option-result'; // Class for styling individual options

                let indicator = '';
                // Check if this option is the correct answer
                 if (key === correctAnswerKey) {
                      indicator += ' <span class="indicator correct-indicator">✓</span>'; // Correct answer indicator
                       correctIndicatorAdded = true;
                 }
                 // Check if this was the user's (wrong) answer
                if (key === userAnswer && userAnswer !== correctAnswerKey) {
                     indicator += ' <span class="indicator incorrect-indicator">✗</span>'; // User's wrong choice indicator
                }


                optionDiv.innerHTML = `${key.toUpperCase()}) ${q.options[key]}${indicator}`;

                 // Optionally add extra styling for the chosen/correct option text itself
                if (key === correctAnswerKey) {
                     optionDiv.classList.add('correct-answer-text'); // Style the text of the right answer
                }
                if (key === userAnswer) {
                    optionDiv.classList.add('user-answer-text'); // Style the text of the user's selected answer
                }


                optionsDiv.appendChild(optionDiv);
            }
             resultItem.appendChild(optionsDiv);


            detailsContainer.appendChild(resultItem);
        });
    }

     function displayError(message) {
         // Display error within the summary section perhaps
         const summarySection = document.getElementById('summary-results');
         if (summarySection) {
             summarySection.innerHTML = `<p style="color: red;">${message}</p>`;
         }
          if(toggleDetailsBtn) toggleDetailsBtn.style.display = 'none'; // Hide details button
     }
});
