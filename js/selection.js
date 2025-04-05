// js/selection.js (FINAL VERSION - Use this whole file)
document.addEventListener('DOMContentLoaded', () => {
    const configForm = document.getElementById('config-form');
    const numQuestionsInput = document.getElementById('num-questions');
    const timeLimitInput = document.getElementById('time-limit');
    const subjectCheckboxes = document.querySelectorAll('input[name="subject"]');
    const startTestBtn = document.getElementById('start-test-btn');
    const configMessage = document.getElementById('config-message');
    const errorNumQuestions = document.getElementById('error-num-questions');
    const errorTimeLimit = document.getElementById('error-time-limit');
    const errorSubjects = document.getElementById('error-subjects');

    // --- Determine Level ---
    // Simple way: Infer from filename (requires specific naming)
    let currentLevel = 'unknown';
    const path = window.location.pathname;
    if (path.includes('selection_see.html')) {
        currentLevel = 'see';
    } else if (path.includes('selection_basic.html')) {
        currentLevel = 'basic';
    } else if (path.includes('selection_ktm.html')) {
        currentLevel = 'ktm';
    }
    // Disable subject selection if not SEE
    if (currentLevel !== 'see' && document.getElementById('subject-selection-fieldset')) {
       document.getElementById('subject-selection-fieldset').style.display = 'none'; // Assuming you add this ID to the fieldset
    }


    configForm.addEventListener('submit', (event) => {
        event.preventDefault();
        clearErrors();

        // --- Validation ---
        let isValid = true;
        const numQuestions = parseInt(numQuestionsInput.value, 10);
        const timeLimit = parseInt(timeLimitInput.value, 10);

        if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 100) {
            showError(errorNumQuestions, 'Please enter a number between 1 and 100.');
            isValid = false;
        }

        if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 180) {
            showError(errorTimeLimit, 'Please enter a number between 1 and 180.');
            isValid = false;
        }

        let selectedSubjects = [];
        if (currentLevel === 'see') {
            selectedSubjects = [...subjectCheckboxes]
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
            if (selectedSubjects.length === 0 && errorSubjects) {
                showError(errorSubjects, 'Please select at least one subject.');
                showMessage(configMessage, 'Please select at least one subject.', 'error');
                isValid = false;
            }
        } else if (currentLevel === 'basic' || currentLevel === 'ktm') {
            selectedSubjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'English']; // Fixed list
        } else {
            // Unknown level - shouldn't happen if filename check works
             showMessage(configMessage, 'Error: Could not determine test level.', 'error');
             isValid = false;
        }

        if (!isValid) {
            return;
        }

        // --- Store Configuration ---
        const configuration = {
            level: currentLevel,
            numQuestions: numQuestions,
            timeLimit: timeLimit * 60, // Store time in seconds
            subjects: selectedSubjects
        };
        sessionStorage.setItem('mcqTestConfig', JSON.stringify(configuration));

        // --- Navigate to MCQ Page (with level parameter) ---
        // This redirection will be checked by the middleware
        window.location.href = `mcq.html?level=${configuration.level}`; // <-- ADDED LEVEL PARAMETER HERE

    });

    function showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            element.style.color = 'red';
        }
    }

    function showMessage(element, text, type = 'info', duration = 2000) {
        if (!element) return;
        element.textContent = text;
        element.className = `message ${type}`;
        element.style.display = 'block';

        if (element.timeoutId) { clearTimeout(element.timeoutId); } // Clear previous timeout

        if (duration > 0) {
            element.timeoutId = setTimeout(() => {
               if (element.textContent === text) {
                 element.style.display = 'none';
                 element.textContent = '';
                 element.className = 'message';
                 element.timeoutId = null;
               }
            }, duration);
        } else {
             element.timeoutId = null;
        }
    }

    function clearErrors() {
        [errorNumQuestions, errorTimeLimit, errorSubjects, configMessage].forEach(el => {
            if (el) {
                el.textContent = '';
                el.style.display = 'none';
            }
        });
        if(configMessage) {
             configMessage.style.display = 'none';
              if(configMessage.timeoutId) {
                   clearTimeout(configMessage.timeoutId);
                   configMessage.timeoutId = null;
              }
        }

    }

    // --- Update Price Display Based on Level ---
    const priceDisplayArea = document.getElementById('price-display'); // Add this ID to a <span> or <p> in the config notice
    const prices = { see: 80, basic: 100, ktm: 150 };
    if(priceDisplayArea && prices[currentLevel]) {
        priceDisplayArea.textContent = `${prices[currentLevel]} NPR`;
    }
});

// **ACTION NEEDED in HTML**:
// In selection_see.html, selection_basic.html, selection_ktm.html:
// 1. Add `id="subject-selection-fieldset"` to the <fieldset> containing the subject checkboxes (only in selection_see.html).
// 2. In the "config-notice" div, change the price line to something like:
//    `<p>Price for <span id="level-name-display">this level</span> Access: <strong><span id="price-display">--</span></strong></p>`
// 3. (Optional but good) Add `<span id="level-name-display">SEE NEB</span>` etc. in the right place based on the page. JS can update the price.
