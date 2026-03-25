document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let apiKey = localStorage.getItem('simplify_api_key') || '';
    let apiModel = localStorage.getItem('simplify_api_model') || '';
    let savedTopics = JSON.parse(localStorage.getItem('simplify_saved_topics')) || [];
    let currentExplanation = null; // { topic, language, content }

    // --- DOM Elements ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiStatus = document.getElementById('apiStatus');
    
    const topicInput = document.getElementById('topicInput');
    const languageSelect = document.getElementById('languageSelect');
    const explainBtn = document.getElementById('explainBtn');
    const errorMsg = document.getElementById('errorMsg');
    
    const resultSection = document.getElementById('resultSection');
    const resultTitle = document.getElementById('resultTitle');
    const resultContent = document.getElementById('resultContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const saveBtn = document.getElementById('saveBtn');
    const copyBtn = document.getElementById('copyBtn');
    const resultActions = document.querySelector('.result-actions');
    
    const savedList = document.getElementById('savedList');
    const savedCount = document.getElementById('savedCount');
    const emptyLibraryMsg = document.getElementById('emptyLibraryMsg');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    // --- Init ---
    init();

    function init() {
        renderSavedTopics();
        apiKeyInput.value = apiKey;
    }

    // --- Event Listeners ---
    
    // Modal controls
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        settingsModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        setTimeout(() => settingsModal.classList.add('hidden'), 300); // Wait for transition
    });

    saveSettingsBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Verifying...';
            apiStatus.style.color = 'var(--text-main)';
            apiStatus.textContent = 'Testing connection & finding models...';
            
            try {
                // Instantly verifying API usability against the key's allowed models directly
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                const data = await res.json();
                
                if(!res.ok) throw new Error(data.error?.message || "Invalid Key");

                // Dynamically discover the best flash model this API key supports
                const supportedModels = data.models.filter(m => 
                    m.name.includes('flash') && 
                    m.supportedGenerationMethods && 
                    m.supportedGenerationMethods.includes('generateContent')
                );

                if (supportedModels.length === 0) {
                    throw new Error("No compatible 'generateContent' flash models found for this API key.");
                }

                // E.g. "models/gemini-2.5-flash" -> "gemini-2.5-flash"
                const bestModel = supportedModels[0].name.replace('models/', '');

                // If perfectly recognized, save configuration unconditionally
                apiKey = key;
                apiModel = bestModel;
                localStorage.setItem('simplify_api_key', key);
                localStorage.setItem('simplify_api_model', apiModel);
                
                apiStatus.style.color = 'var(--success)';
                apiStatus.textContent = `Connected! Auto-Selected: ${bestModel}`;
                
                setTimeout(() => {
                    settingsModal.classList.remove('active');
                    setTimeout(() => settingsModal.classList.add('hidden'), 300);
                    showToast('Settings saved successfully!');
                    errorMsg.classList.add('hidden');
                    apiStatus.textContent = '';
                }, 1200);
            } catch(e) {
                apiStatus.style.color = 'var(--error)';
                apiStatus.textContent = 'Verification Failed: ' + e.message;
            } finally {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = 'Verify & Save Settings';
            }
        } else {
            apiStatus.style.color = 'var(--error)';
            apiStatus.textContent = 'Please enter a valid API key.';
        }
    });

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
        }
    });

    // Explain Button
    explainBtn.addEventListener('click', handleExplain);
    topicInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleExplain();
    });

    // Save Explanation Button
    saveBtn.addEventListener('click', handleSaveExplanation);

    // Copy Explanation Button
    copyBtn.addEventListener('click', handleCopyExplanation);

    // --- Core Functions ---

    async function handleExplain() {
        const topic = topicInput.value.trim();
        const language = languageSelect.value;
        
        errorMsg.classList.add('hidden');
        
        if (!topic) {
            showError("Please enter a topic you'd like explained.");
            return;
        }

        if (!apiKey) {
            showError("Please set up your Google Gemini API Key in the settings first.");
            settingsModal.classList.add('active');
            settingsModal.classList.remove('hidden');
            return;
        }

        // Setup UI for loading
        resultSection.classList.remove('hidden');
        resultSection.classList.add('fade-in');
        resultTitle.textContent = `Explaining: ${topic}`;
        resultContent.innerHTML = '';
        loadingIndicator.classList.remove('hidden');
        resultActions.classList.add('hidden'); // Hide actions until done
        explainBtn.disabled = true;
        explainBtn.style.opacity = '0.7';
        explainBtn.querySelector('.btn-text').textContent = 'Simplifying...';
        
        currentExplanation = null;

        try {
            const explanation = await fetchExplanation(topic, language);
            
            // Success
            loadingIndicator.classList.add('hidden');
            resultContent.innerHTML = marked.parse(explanation);
            resultActions.classList.remove('hidden');
            saveBtn.classList.remove('hidden');
            copyBtn.classList.remove('hidden');
            
            // Store current explanation state in case user wants to save
            currentExplanation = {
                id: Date.now().toString(),
                topic,
                language,
                content: explanation,
                timestamp: new Date().toISOString()
            };

            // Smooth scroll to result
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error("API Error:", error);
            loadingIndicator.classList.add('hidden');
            showError(error.message || "Failed to get an explanation. Please check your API key and try again.");
            resultSection.classList.add('hidden');
        } finally {
            explainBtn.disabled = false;
            explainBtn.style.opacity = '1';
            explainBtn.querySelector('.btn-text').textContent = 'Simplify It';
        }
    }

    async function fetchExplanation(topic, language) {
        // Construct an advanced, highly-structured prompt targeting an ELI5 style but demanding much more detail
        const prompt = `You are a friendly, expert teacher. Explain the concept of "${topic}" so simply that a 5-year-old or complete beginner can understand it, but make sure your explanation is comprehensive, deeply informative, and very detailed. 
        Structure your response strictly in Markdown with these EXACT headings:
        ## 🌟 The Short Version
        [A simple, engaging 2-3 sentence summary]
        ## 📖 The Real-World Analogy
        [A detailed, relatable story or everyday analogy that perfectly illustrates exactly how it works]
        ## 🧠 Breaking it Down
        * [Provide 4 to 6 detailed bullet points.]
        * [Explain the core mechanics clearly.]
        * [Answer the "how" and "why" behind it.]
        * [Ensure each point is packed with easy-to-understand detail.]
        ## 🚀 Why Does It Matter?
        [Explain its impact on the real world, why scientists/people care about it so much, and what it achieves]
        Do not use complex jargon without explaining it immediately. Keep it exceptionally engaging, educational, and fun. Write the ENTIRE response in the following language: ${language}.`;

        const payload = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.7
            }
        };

        // User dynamically obtained the best model previously verified in settings
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const err = data.error ? data.error.message : 'Unknown API error';
            throw new Error(`API Error (${apiModel}): ${err}`);
        }

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unexpected response format from API.");
        }
    }

    function handleSaveExplanation() {
        if (!currentExplanation) return;
        
        // Prevent duplicate saves of the same generated ID
        const exists = savedTopics.find(t => t.id === currentExplanation.id);
        if (exists) {
            showToast("Already saved to library!");
            return;
        }

        savedTopics.unshift(currentExplanation);
        localStorage.setItem('simplify_saved_topics', JSON.stringify(savedTopics));
        
        renderSavedTopics();
        showToast("Saved to your library!");
        
        // Pulse animation on button
        saveBtn.style.transform = 'scale(1.2)';
        saveBtn.style.color = 'var(--primary)';
        setTimeout(() => {
            saveBtn.style.transform = '';
        }, 200);
    }

    async function handleCopyExplanation() {
        if (!currentExplanation) return;
        try {
            await navigator.clipboard.writeText(currentExplanation.content);
            showToast("Copied to clipboard!");
            copyBtn.style.transform = 'scale(1.2)';
            copyBtn.style.color = 'var(--success)';
            setTimeout(() => {
                copyBtn.style.transform = '';
                copyBtn.style.color = '';
            }, 1000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showError('Failed to copy text.');
        }
    }

    function deleteTopic(id) {
        savedTopics = savedTopics.filter(t => t.id !== id);
        localStorage.setItem('simplify_saved_topics', JSON.stringify(savedTopics));
        renderSavedTopics();
        showToast("Topic removed");
        
        // If we are currently viewing the deleted topic, hide the result area
        if (currentExplanation && currentExplanation.id === id) {
            resultSection.classList.add('hidden');
            currentExplanation = null;
        }
    }

    function loadSavedTopic(id) {
        const topic = savedTopics.find(t => t.id === id);
        if (!topic) return;
        
        currentExplanation = topic; // Set as current
        
        // UI updates
        resultSection.classList.remove('hidden');
        resultTitle.textContent = `Explaining: ${topic.topic}`;
        resultContent.innerHTML = marked.parse(topic.content);
        loadingIndicator.classList.add('hidden');
        
        // Show actions but hide save button since it's already saved
        resultActions.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        copyBtn.classList.remove('hidden');

        // Scroll
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update input to reflect loaded
        topicInput.value = topic.topic;
        languageSelect.value = topic.language;
    }

    // --- Rendering Helpers ---

    function renderSavedTopics() {
        savedCount.textContent = savedTopics.length;
        
        if (savedTopics.length === 0) {
            savedList.innerHTML = '';
            savedList.appendChild(emptyLibraryMsg);
            return;
        }
        
        // Detach empty state and clear list
        if (emptyLibraryMsg.parentNode) {
            emptyLibraryMsg.parentNode.removeChild(emptyLibraryMsg);
        }
        savedList.innerHTML = '';

        savedTopics.forEach(topic => {
            const dateStr = new Date(topic.timestamp).toLocaleDateString();
            
            const card = document.createElement('div');
            card.className = 'saved-card fade-in';
            card.innerHTML = `
                <h4>${escapeHTML(topic.topic)}</h4>
                <p>${escapeHTML(topic.language)} • ${dateStr}</p>
                <button class="delete-saved-btn" aria-label="Delete saved topic" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            
            // Load content on click
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking delete button
                if (e.target.closest('.delete-saved-btn')) return;
                loadSavedTopic(topic.id);
            });
            
            // Delete handler
            const delBtn = card.querySelector('.delete-saved-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove "${topic.topic}" from saved?`)) {
                    deleteTopic(topic.id);
                }
            });
            
            savedList.appendChild(card);
        });
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 400); // Wait for transition
        }, 3000);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
