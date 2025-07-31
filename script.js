document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatLog = document.getElementById('chat-log');
    const attachBtn = document.getElementById('attach-btn');
    const imageInput = document.getElementById('image-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const welcomeContainer = document.querySelector('.welcome-message-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const modelSelectorActive = document.getElementById('model-selector-active');
    const modelDropdown = document.getElementById('model-dropdown');
    const selectedModelNameEl = document.getElementById('selected-model-name');
    const historyList = document.getElementById('history-list');
    const userProfilePic = document.getElementById('user-profile-pic');
    const welcomeHeader = document.getElementById('welcome-header');
    
    // --- ELEMENTOS DO MODAL DE PERFIL ---
    const modalBackdrop = document.getElementById('modal-backdrop');
    const allModals = document.querySelectorAll('.modal');
    const profileModal = document.getElementById('profile-modal');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicInput = document.getElementById('profile-pic-input');
    const profileNameInput = document.getElementById('profile-name-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    // --- VARIÁVEIS DE ESTADO ---
    const SYNAPSE_GEMINI_API_URL = '/api/gemini';
    let geminiSelectedFile = null;
    let localProfile = {};
    let currentChatId = null; 
    let currentChatHistory = [];

    // --- LÓGICA DE SELEÇÃO DE MODELO ---
    const availableModels = {
        'gemini-2.5-pro': { name: "Gemini 2.5 Pro", desc: "Novo! Performance de ponta para tarefas complexas." },
        'gemini-2.5-flash': { name: "Gemini 2.5 Flash", desc: "Novo! Alta velocidade com performance aprimorada." },
        'gemini-1.5-pro-latest': { name: "Gemini 1.5 Pro", desc: "Modelo poderoso e preciso (Legado)." },
        'gemini-1.5-flash-latest': { name: "Gemini 1.5 Flash", desc: "Equilíbrio entre velocidade e performance (Legado)." },
    };

    let selectedModel = 'gemini-2.5-pro';

    marked.setOptions({
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
      langPrefix: 'hljs language-',
      breaks: true,
    });
    
    // --- LÓGICA DE PERFIL LOCAL ---
    const loadProfile = () => {
        const savedProfile = JSON.parse(localStorage.getItem('synapse-profile')) || {};
        localProfile = {
            name: savedProfile.name || 'Usuário',
            profilePic: savedProfile.profilePic || 'https://i.ibb.co/7zS4Q1s/profile-placeholder.png'
        };
        updateUIWithProfile();
    };

    const saveProfile = (newName, newPicBase64) => {
        if (newName) localProfile.name = newName;
        if (newPicBase64) localProfile.profilePic = newPicBase64;
        
        localStorage.setItem('synapse-profile', JSON.stringify(localProfile));
        updateUIWithProfile();
        closeAllModals();
    };

    const updateUIWithProfile = () => {
        welcomeHeader.textContent = `Olá, ${localProfile.name}!`;
        userProfilePic.src = localProfile.profilePic;
        profilePicPreview.src = localProfile.profilePic;
        profileNameInput.value = localProfile.name;
    };
    
    saveProfileBtn.addEventListener('click', () => {
        const newName = profileNameInput.value.trim();
        const newPicFile = profilePicInput.files[0];

        if (newPicFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newPicBase64 = e.target.result;
                saveProfile(newName, newPicBase64);
            };
            reader.readAsDataURL(newPicFile);
        } else {
            saveProfile(newName, null); // Salva apenas o nome se não houver nova foto
        }
    });
    
    profilePicInput.addEventListener('change', () => {
        const file = profilePicInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                profilePicPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- LÓGICA DE TROCA DE TEMA ---
    const sunIcon = '<i class="fa-solid fa-sun" aria-hidden="true"></i><span>Tema Claro</span>';
    const moonIcon = '<i class="fa-solid fa-moon" aria-hidden="true"></i><span>Tema Escuro</span>';

    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            themeToggleBtn.innerHTML = moonIcon;
        } else {
            document.body.classList.remove('light-theme');
            themeToggleBtn.innerHTML = sunIcon;
        }
    };
    
    // --- FUNÇÕES DE GERENCIAMENTO DE HISTÓRICO ---
    const getChatsFromStorage = () => {
        return JSON.parse(localStorage.getItem('synapse-chats') || '{}');
    };

    const saveChatsToStorage = (chats) => {
        localStorage.setItem('synapse-chats', JSON.stringify(chats));
    };
    
    const renderHistorySidebar = () => {
        const chats = getChatsFromStorage();
        historyList.innerHTML = '';
        Object.values(chats).sort((a, b) => b.id - a.id).forEach(chat => {
            const item = document.createElement('li');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            item.dataset.chatId = chat.id;
            
            item.innerHTML = `<i class="fa-regular fa-message" aria-hidden="true"></i><span></span><button class="delete-chat-btn" aria-label="Deletar conversa"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>`;
            item.querySelector('span').textContent = chat.title;
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-chat-btn')) return;
                loadChat(chat.id);
            });

            item.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            });
            historyList.appendChild(item);
        });
    };
    
    const saveCurrentChat = () => {
        if (!currentChatId || currentChatHistory.length === 0) return;
        const chats = getChatsFromStorage();
        const firstUserMessage = currentChatHistory.find(m => m.role === 'user');
        const title = firstUserMessage ? firstUserMessage.parts.find(p => p.text)?.text.substring(0, 30) + '...' : 'Nova Conversa';
        
        chats[currentChatId] = { id: currentChatId, title, history: currentChatHistory };
        saveChatsToStorage(chats);
        renderHistorySidebar();
    };

    const loadChat = (chatId) => {
        const chats = getChatsFromStorage();
        if (!chats[chatId]) return;

        const chat = chats[chatId];
        currentChatId = chat.id;
        currentChatHistory = chat.history;

        chatLog.innerHTML = '';
        if (welcomeContainer) welcomeContainer.style.display = 'none';

        currentChatHistory.forEach(message => {
            const type = message.role === 'user' ? 'user' : 'bot';
            const text = message.parts.find(p => p.text)?.text || '';
            const imageUrl = message.role === 'user' ? (message.previewUrl || null) : null;
            appendMessage(text, type, imageUrl);
        });
        renderHistorySidebar();
    };
    
    const deleteChat = (chatId) => {
        const chats = getChatsFromStorage();
        delete chats[chatId];
        saveChatsToStorage(chats);
        
        if (String(chatId) === String(currentChatId)) {
            startNewChat();
        } else {
            renderHistorySidebar();
        }
    };
    
    const startNewChat = () => {
        currentChatId = null;
        currentChatHistory = [];
        chatLog.innerHTML = '';
        if (welcomeContainer) {
            welcomeContainer.style.display = 'flex';
        }
        resetImageSelection();
        chatInput.value = '';
        renderHistorySidebar();
    };

    // --- FUNÇÕES DE CHAT ---
    const handleChatSubmit = async (event, promptOverride = null) => {
        if(event) event.preventDefault();
        const promptText = promptOverride || chatInput.value.trim();
        if (!promptText && !geminiSelectedFile) return;
        
        if (!currentChatId) {
            currentChatId = Date.now();
        }

        const userMessage = {
            role: "user",
            parts: [{ text: promptText }],
            previewUrl: null
        };

        if (geminiSelectedFile) {
            userMessage.parts.push({ inline_data: { mime_type: geminiSelectedFile.mimeType, data: geminiSelectedFile.base64 } });
            userMessage.previewUrl = geminiSelectedFile.previewUrl;
        }

        currentChatHistory.push(userMessage);
        appendMessage(promptText, 'user', geminiSelectedFile?.previewUrl);
        
        chatInput.value = '';
        resetImageSelection();

        const loadingMessage = appendMessage('...', 'loading');
        
        const apiHistory = currentChatHistory.slice(0, -1).map(msg => ({ role: msg.role, parts: msg.parts }));

        try {
            const response = await fetch(SYNAPSE_GEMINI_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ history: apiHistory, prompt: { role: userMessage.role, parts: userMessage.parts }, model: selectedModel })
            });

            loadingMessage.remove();
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
                throw new Error(errorData.message || `A API retornou um erro ${response.status}.`);
            }

            const data = await response.json();
            const botMessage = { role: 'model', parts: [{ text: data.response }] };
            currentChatHistory.push(botMessage);
            appendMessage(data.response, 'bot');
            saveCurrentChat();

        } catch (error) {
            loadingMessage.remove();
            appendMessage(`Desculpe, ocorreu um erro: ${error.message}`, 'error');
            currentChatHistory.pop();
        }
    };

    const appendMessage = (text, type, imageUrl = null) => {
        if (welcomeContainer) welcomeContainer.style.display = 'none';

        const messageEl = document.createElement('div');
        messageEl.classList.add('gemini-message', `${type}-message`);
        
        let htmlContent = '';
        if (type === 'loading') {
            htmlContent = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        } else if (type === 'error') {
            htmlContent = text;
        } else {
            htmlContent = marked.parse(text);
        }

        if (type === 'user' && imageUrl) {
            messageEl.innerHTML = `<p>${text}</p><img src="${imageUrl}" alt="Anexo do usuário" class="user-image-attachment">`;
        } else {
            messageEl.innerHTML = htmlContent;
        }
        
        chatLog.appendChild(messageEl);
        addCopyButtonsToCodeBlocks(messageEl);
        chatLog.scrollTop = chatLog.scrollHeight;
        return messageEl;
    };

    const addCopyButtonsToCodeBlocks = (container) => {
        container.querySelectorAll('pre').forEach((preElement) => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-btn';
            copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
            
            copyButton.addEventListener('click', () => {
                const code = preElement.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
                    }, 2000);
                });
            });
            preElement.appendChild(copyButton);
        });
    };
    
    const resetImageSelection = () => {
        geminiSelectedFile = null;
        imageInput.value = '';
        imagePreviewContainer.style.display = 'none';
    };
    
    // --- LÓGICA DOS MODAIS ---
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        if (modalId === 'activity-modal') {
            const activityList = document.getElementById('activity-history-list');
            activityList.innerHTML = '';
            const chats = getChatsFromStorage();
            if(Object.keys(chats).length > 0) {
                 Object.values(chats).sort((a,b) => b.id - a.id).forEach(chat => {
                    const li = document.createElement('li');
                    li.textContent = chat.title;
                    activityList.appendChild(li);
                 });
            } else {
                activityList.innerHTML = '<li>Nenhuma atividade registrada.</li>';
            }
        }

        modalBackdrop.classList.add('visible');
        modal.classList.add('visible');
    };

    const closeAllModals = () => {
        modalBackdrop.classList.remove('visible');
        allModals.forEach(modal => modal.classList.remove('visible'));
    };

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    const initializeApp = () => {
        const savedTheme = localStorage.getItem('synapse-theme') || 'dark';
        applyTheme(savedTheme);
        
        loadProfile();
        startNewChat();
        populateModelDropdown();
        selectedModelNameEl.textContent = availableModels[selectedModel].name;

        // Listeners Principais
        chatForm.addEventListener('submit', handleChatSubmit);
        newChatBtn.addEventListener('click', startNewChat);
        attachBtn.addEventListener('click', () => imageInput.click());
        removeImageBtn.addEventListener('click', resetImageSelection);
        
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('synapse-theme', newTheme);
            applyTheme(newTheme);
        });

        modelSelectorActive.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = modelDropdown.classList.toggle('visible');
            modelSelectorActive.setAttribute('aria-expanded', isVisible);
        });
        document.addEventListener('click', () => {
            if (modelDropdown.classList.contains('visible')) {
                modelDropdown.classList.remove('visible');
                modelSelectorActive.setAttribute('aria-expanded', 'false');
            }
        });

        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    geminiSelectedFile = {
                        base64: e.target.result.split(',')[1],
                        mimeType: file.type,
                        previewUrl: e.target.result
                    };
                    imagePreview.src = geminiSelectedFile.previewUrl;
                    imagePreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(button.dataset.modalTarget);
            });
        });
        document.querySelectorAll('.close-modal-btn').forEach(button => button.addEventListener('click', closeAllModals));
        modalBackdrop.addEventListener('click', closeAllModals);

        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                chatInput.value = prompt;
                handleChatSubmit(null, prompt);
            });
        });
    };
    
    function populateModelDropdown() {
        modelDropdown.innerHTML = '';
        for (const [id, model] of Object.entries(availableModels)) {
            const option = document.createElement('div');
            option.classList.add('model-option');
            option.dataset.modelId = id;
            option.innerHTML = `<strong>${model.name}</strong><span>${model.desc}</span>`;
            option.addEventListener('click', () => {
                selectedModel = id;
                selectedModelNameEl.textContent = model.name;
                modelDropdown.classList.remove('visible');
                modelSelectorActive.setAttribute('aria-expanded', 'false');
            });
            modelDropdown.appendChild(option);
        }
    }

    initializeApp();
});