// js/index.js
document.addEventListener('DOMContentLoaded', () => {
    const portals = document.querySelectorAll('.portal');
    const codeEntryArea = document.getElementById('code-entry-area');
    const showCodeEntryBtn = document.getElementById('show-code-entry-btn');
    const levelCodeSelect = document.getElementById('level-code-select');
    const codeInput = document.getElementById('code-input');
    const submitCodeBtn = document.getElementById('submit-code-btn');
    const codeMessage = document.getElementById('code-message');

    const levelPaths = {
        see: 'selection_see.html',
        basic: 'selection_basic.html',
        ktm: 'selection_ktm.html'
    };

    // --- Portal Interaction ---
    portals.forEach(portal => {
        // Check initial lock status based on Local Storage
        const level = portal.dataset.level;
        updatePortalStatus(level);

        portal.addEventListener('click', () => {
            const path = levelPaths[level];
            if (path) {
                // Navigate only if path exists (basic safety)
                window.location.href = path;
            } else {
                console.error('No path defined for level:', level);
            }
        });

        // Add hover effects via CSS :hover if preferred
        // portal.addEventListener('mouseenter', () => portal.classList.add('hover'));
        // portal.addEventListener('mouseleave', () => portal.classList.remove('hover'));
    });

    // --- Code Entry Logic ---
    showCodeEntryBtn.addEventListener('click', () => {
        codeEntryArea.style.display = codeEntryArea.style.display === 'none' ? 'block' : 'none';
        showCodeEntryBtn.textContent = codeEntryArea.style.display === 'none' ? 'Enter Access Code' : 'Hide Code Entry';
        updateLevelSelectOptions(); // Disable already unlocked levels
    });

    submitCodeBtn.addEventListener('click', handleCodeSubmission);
    codeInput.addEventListener('keypress', function(event) {
        if (event.key === "Enter") {
          event.preventDefault(); // Prevent default form submission if any
          handleCodeSubmission();
        }
      });

    async function handleCodeSubmission() {
        const level = levelCodeSelect.value;
        const code = codeInput.value.trim();

        if (!level) {
            showMessage(codeMessage, 'Please select a level.', 'error');
            return;
        }
        if (!code) {
            showMessage(codeMessage, 'Please enter a code.', 'error');
            return;
        }

        // **IMPORTANT: Replace this with the actual fetch call to your Cloudflare Function**
        // Simulate API Call
        showMessage(codeMessage, 'Validating...', 'info'); // Indicate processing
        submitCodeBtn.disabled = true; // Prevent multiple clicks
        try {
            // const response = await fetch('/api/validate-code', { // Your actual Function endpoint
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ level: level, code: code })
            // });
            // const result = await response.json();

            // **Placeholder Simulation:** Replace with actual response handling
            let result;
            const correctCodes = { // !! DO NOT keep real codes here in production client-side JS !!
                see: 'ILSSOMICDAFH',
                basic: 'IKSDLMBIWSLHLM',
                ktm: 'EIWMSTLIWTHINL'
            };
            if (correctCodes[level] && code === correctCodes[level]) {
                 result = { success: true };
                 // In a real scenario, the Function would also set the HttpOnly cookie here
            } else {
                 result = { success: false, message: "Incorrect code." };
            }
            // End Placeholder Simulation

            if (result.success) {
                // Store status flag in Local Storage (for UI convenience only)
                localStorage.setItem(`${level}_code_status`, 'unlocked');
                showMessage(codeMessage, 'Token accepted!', 'success');
                codeInput.value = ''; // Clear input
                updatePortalStatus(level); // Update visual indicator
                updateLevelSelectOptions(); // Update dropdown
                // Optionally hide code entry area after success
                // codeEntryArea.style.display = 'none';
                // showCodeEntryBtn.textContent = 'Enter Access Code';
            } else {
                showMessage(codeMessage, result.message || 'Incorrect code.', 'error');
            }
        } catch (error) {
            console.error("Code validation error:", error);
            showMessage(codeMessage, 'Error validating code. Please try again.', 'error');
        } finally {
             submitCodeBtn.disabled = false; // Re-enable button
        }
    }

    function showMessage(element, text, type = 'info', duration = 2000) {
        element.textContent = text;
        element.className = `message ${type}`; // Apply class for styling (error, success, info)
        element.style.display = 'block';

        if (duration > 0) {
            setTimeout(() => {
                element.style.display = 'none';
                element.textContent = '';
                element.className = 'message';
            }, duration);
        }
    }

    function updatePortalStatus(level) {
        const statusIndicator = document.getElementById(`status-${level}`);
        if (localStorage.getItem(`${level}_code_status`) === 'unlocked') {
            // Add a class or text to indicate unlocked status visually
            statusIndicator.textContent = '✓'; // Example: Checkmark
            statusIndicator.style.color = 'green';
            // Maybe disable the code entry option for this level
        } else {
            statusIndicator.textContent = '🔒'; // Example: Lock icon
            statusIndicator.style.color = 'grey';
        }
    }

    function updateLevelSelectOptions() {
        const options = levelCodeSelect.options;
        for (let i = 0; i < options.length; i++) {
            const level = options[i].value;
            if (level && localStorage.getItem(`${level}_code_status`) === 'unlocked') {
                options[i].disabled = true; // Disable option if already unlocked
                 options[i].textContent = `${options[i].textContent.replace(' (Unlocked)', '')} (Unlocked)`; // Add visual cue
            } else if (level) {
                options[i].disabled = false;
                 options[i].textContent = options[i].textContent.replace(' (Unlocked)', ''); // Remove cue if not unlocked
            }
        }
         // Reset selection if current selection becomes disabled (edge case)
        if(levelCodeSelect.options[levelCodeSelect.selectedIndex]?.disabled) {
            levelCodeSelect.value = "";
        }
    }

    // Initial setup
    updateLevelSelectOptions(); // Set initial state of dropdown
});
