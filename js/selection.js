// js/selection.js
document.addEventListener('DOMContentLoaded', () => {
    const configForm = document.getElementById('config-form');
    const numQuestionsInput = document.getElementById('num-questions');
    const timeLimitInput = document.getElementById('time-limit');
    const subjectCheckboxes = document.querySelectorAll('input[name="subject"]'); // Only relevant for SEE page
    const startTestBtn = document.getElementById('start-test-btn');
    const configMessage = document.getElementById('config-message'); // General messages
    const errorNumQuestions = document.getElementById('error-num-questions');
    const errorTimeLimit = document.getElementById('error-time-limit');
    const errorSubjects = document.getElementById('error-subjects'); // Only for SEE page

    // Determine level from URL or a data attribute if needed - assume SEE for now
    const currentLevel = 'see'; // Could be made dynamic later

    configForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Stop form submission
        clearErrors();

        // --- Validation ---
        let isValid = true;
        const numQuestions = parseInt(numQuestionsInput.value, 10);
        const timeLimit = parseInt(timeLimitInput.value, 10);

        // Validate Number of Questions
        if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 100) {
            showError(errorNumQuestions, 'Please enter a number between 1 and 100.');
            isValid = false;
        }

        // Validate Time Limit
        if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 180) {
            showError(errorTimeLimit, 'Please enter a number between 1 and 180.');
            isValid = false;
        }

        // Validate Subjects (Only for SEE level)
        let selectedSubjects = [];
        if (currentLevel === 'see' && subjectCheckboxes.length > 0) {
            selectedSubjects = [...subjectCheckboxes]
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);

            if (selectedSubjects.length === 0) {
                showError(errorSubjects, 'Please select at least one subject.');
                // Use configMessage for temporary popup as well
                 showMessage(configMessage, 'Please select at least one subject.', 'error');
                isValid = false;
            }
        }
         // Basic/KTM levels have fixed subjects, assigned later in mcq.js
         else if (currentLevel === 'basic' || currentLevel === 'ktm') {
            selectedSubjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'English']; // Fixed list
         }


        if (!isValid) {
            return; // Stop if validation fails
        }

        // --- Store Configuration ---
        const configuration = {
            level: currentLevel,
            numQuestions: numQuestions,
            timeLimit: timeLimit * 60, // Store time in seconds
            subjects: selectedSubjects
        };

        // Use Session Storage: Clears when the browser tab is closed
        sessionStorage.setItem('mcqTestConfig', JSON.stringify(configuration));

        // --- Navigate to MCQ Page ---
        // !! IMPORTANT: This navigation will be blocked by your Cloudflare Middleware
        // !! if the required COOKIE (e.g., 'see_code') is not present.
        // !! The user MUST have entered a valid code on index.html previously.
        window.location.href = 'mcq.html';

    });

    function showError(element, message) {
        if (element) { // Check if element exists (for subject errors)
            element.textContent = message;
            element.style.display = 'block'; // Make sure it's visible
             element.style.color = 'red'; // Ensure red color as requested
        }
    }

    function showMessage(element, text, type = 'info', duration = 2000) {
         if (!element) return;
         element.textContent = text;
         element.className = `message ${type}`;
         element.style.display = 'block';
         if (duration > 0) {
            setTimeout(() => {
               if (element.textContent === text) { // Clear only if msg hasn't changed
                 element.style.display = 'none';
                 element.textContent = '';
                 element.className = 'message';
               }
            }, duration);
         }
    }


    function clearErrors() {
        [errorNumQuestions, errorTimeLimit, errorSubjects, configMessage].forEach(el => {
            if (el) {
                el.textContent = '';
                el.style.display = 'none'; // Hide inline error texts
            }
        });
         // Clear popup message explicitely if needed or rely on showMessage timeout
         if(configMessage) configMessage.style.display = 'none';

    }
});
