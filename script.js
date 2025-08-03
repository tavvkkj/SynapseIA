document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const mainContainer = document.querySelector('.main-container');
    const authContainer = document.getElementById('auth-container');
    const authForm = document.getElementById('auth-form');
    const authButton = document.getElementById('auth-button');
    const notificationArea = document.getElementById('notification-area');
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
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeHeader = document.getElementById('welcome-header');
    const stopGeneratingBtn = document.getElementById('stop-generating-btn');
    const historySearchInput = document.getElementById('history-search-input');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const allModals = document.querySelectorAll('.modal');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicInput = document.getElementById('profile-pic-input');
    const profileNameInput = document.getElementById('profile-name-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const settingsModal = document.getElementById('settings-modal');
    const tabButtons = settingsModal.querySelectorAll('.tab-btn');
    const tabContents = settingsModal.querySelectorAll('.tab-content');
    const addMemoryForm = document.getElementById('add-memory-form');
    const memoryInput = document.getElementById('memory-input');
    const memoryList = document.getElementById('memory-list');
    const clearAllChatsBtn = document.getElementById('clear-all-chats-btn');

    // --- VARIÁVEIS DE ESTADO ---
    const SYNAPSE_GEMINI_API_URL = '/api/gemini';
    const SYNAPSE_AUTH_API_URL = '/api/auth';
    let geminiSelectedFile = null;
    let localProfile = {};
    let currentChatId = null;
    let currentChatHistory = [];
    let abortController = null;
    
    // --- LÓGICA DE SELEÇÃO DE MODELO ---
    const availableModels = {
        'gemini-1.5-pro-latest': { name: "Gemini 1.5 Pro", desc: "Modelo poderoso e preciso." },
        'gemini-1.5-flash-latest': { name: "Gemini 1.5 Flash", desc: "Equilíbrio entre velocidade e performance." },
    };
    let selectedModel = 'gemini-1.5-pro-latest';

    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true,
    });
    
    // =================================================================
    // INICIALIZAÇÃO E SESSÃO
    // =================================================================
    
    const checkForActiveSession = async () => {
        const activeRa = localStorage.getItem('synapse-active-ra');
        if (!activeRa) {
            // Se não há RA ativo, garante que a tela de login seja exibida.
            authContainer.style.display = 'flex';
            mainContainer.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(SYNAPSE_AUTH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ra: activeRa, isSessionCheck: true })
            });

            if (!response.ok) {
                // Se o perfil não for encontrado ou houver erro, limpa a sessão inválida e mostra o login.
                localStorage.removeItem('synapse-active-ra');
                authContainer.style.display = 'flex';
                mainContainer.style.display = 'none';
                return;
            }
            
            const data = await response.json();
            if (data.success) {
                localProfile = data.profile;
                authContainer.style.display = 'none';
                mainContainer.style.display = 'flex';
                initializeApp();
            } else {
                localStorage.removeItem('synapse-active-ra');
                authContainer.style.display = 'flex';
                mainContainer.style.display = 'none';
            }
        } catch (error) {
            console.error("Erro ao verificar sessão:", error);
            authContainer.style.display = 'flex';
            mainContainer.style.display = 'none';
        }
    };

    // =================================================================
    // SEÇÃO: LÓGICA DE AUTENTICAÇÃO, PERFIL E AVATAR
    // =================================================================

    const showNotification = (message, type = 'error') => {
        notificationArea.innerHTML = `<div class="notification-banner ${type}">${message}</div>`;
    };

    const normalizeRA = (raValue) => {
        if (!raValue) return "";
        const alphanumericPart = raValue.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
        const raWithoutSP = alphanumericPart.endsWith('SP') ? alphanumericPart.slice(0, -2) : alphanumericPart;
        return `${raWithoutSP}SP`;
    };
    
    const generateInitialsAvatar = (fullName) => {
        if (!fullName) return 'https://i.ibb.co/7zS4Q1s/profile-placeholder.png';
        const names = fullName.split(' ');
        const firstName = names[0];
        const lastName = names.length > 1 ? names[names.length - 1] : '';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        const colors = ["#ef5350", "#ab47bc", "#5c6bc0", "#29b6f6", "#26a69a", "#ffca28", "#ff7043", "#78909c"];
        let hash = 0;
        for (let i = 0; i < fullName.length; i++) hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
        const color = colors[Math.abs(hash % colors.length)];
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 52px Poppins';
        context.fillStyle = '#FFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(initials, canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    };

    const loginCompletoToken = async (ra, password) => {
        const response = await fetch("https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Ocp-Apim-Subscription-Key': '2b03c1db3884488795f79c37c069381a',
                'Origin': 'https://saladofuturo.educacao.sp.gov.br',
                'Referer': 'https://saladofuturo.educacao.sp.gov.br/'
            },
            body: JSON.stringify({ user: ra, senha: password })
        });
        if (!response.ok) throw new Error(`Falha no login da SED: ${response.statusText}`);
        const data = await response.json();
        if (!data.token) throw new Error('Token não encontrado na resposta do login da SED.');
        return data;
    };
    
    const saveProfileToApi = async (profileData) => {
        try {
            const response = await fetch(SYNAPSE_AUTH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            if (!response.ok) throw new Error('Falha ao salvar o perfil no servidor.');
            return await response.json();
        } catch (error) {
            console.error("Erro ao salvar perfil na API:", error);
            showNotification('Não foi possível salvar seu perfil. Suas alterações podem não persistir.');
            return null;
        }
    };

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const raNumber = document.getElementById('auth-ra-number').value;
        const raDigit = document.getElementById('auth-ra-digit').value;
        const raState = document.getElementById('auth-ra-state').value;
        const password = document.getElementById('auth-password').value;
        const combinedRa = `${raNumber}${raDigit}${raState}`;
        const ra = normalizeRA(combinedRa);
        authButton.disabled = true;
        authButton.querySelector('span').textContent = 'Verificando...';
        authButton.querySelector('i').style.display = 'inline-block';
        notificationArea.innerHTML = '';

        try {
            const loginData = await loginCompletoToken(ra, password);
            const fullName = loginData.DadosUsuario?.NAME || 'Usuário';
            const firstName = fullName.split(' ')[0];
            const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
            const generatedAvatar = generateInitialsAvatar(fullName);
            const defaultProfileData = {
                ra,
                name: formattedName,
                fullName: fullName,
                profilePic: generatedAvatar,
                userId: loginData.DadosUsuario?.CD_USUARIO,
                emails: {
                    google: loginData.DadosUsuario?.EMAIL_GOOGLE,
                    microsoft: loginData.DadosUsuario?.EMAIL_MS
                },
                isLoginEvent: true
            };
            const apiResponse = await saveProfileToApi(defaultProfileData);
            if (!apiResponse || !apiResponse.success) {
                throw new Error("Não foi possível salvar ou carregar o perfil do servidor.");
            }
            localProfile = apiResponse.profile;

            // ADICIONADO: Salva o RA no localStorage para criar a sessão
            localStorage.setItem('synapse-active-ra', ra);

            authContainer.style.display = 'none';
            mainContainer.style.display = 'flex';
            mainContainer.style.animation = 'fadeIn 0.5s ease-in-out';
            initializeApp();
        } catch (error) {
            showNotification(`Erro de autenticação: ${error.message}`);
        } finally {
            authButton.disabled = false;
            authButton.querySelector('span').textContent = 'Entrar';
            authButton.querySelector('i').style.display = 'none';
        }
    });
    
    const handleLogout = () => {
        // MODIFICADO: Limpa o RA do localStorage para encerrar a sessão
        localStorage.removeItem('synapse-active-ra');
        localProfile = {}; // Limpa o perfil local
        location.reload(); // Recarrega a página para voltar à tela de login
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
        const profileUpdate = { ra: localProfile.ra };
        const handleSave = (newPicBase64) => {
            if (newName && newName !== localProfile.name) profileUpdate.name = newName;
            if (newPicBase64) profileUpdate.profilePic = newPicBase64;
            if (Object.keys(profileUpdate).length > 1) {
                saveProfileToApi(profileUpdate).then(apiResponse => {
                    if (apiResponse && apiResponse.success) {
                        localProfile = apiResponse.profile;
                        updateUIWithProfile();
                        closeAllModals();
                    }
                });
            } else {
                closeAllModals();
            }
        };
        if (newPicFile) {
            const reader = new FileReader();
            reader.onload = (e) => handleSave(e.target.result);
            reader.readAsDataURL(newPicFile);
        } else {
            handleSave(null);
        }
    });

    profilePicInput.addEventListener('change', () => {
        const file = profilePicInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => { profilePicPreview.src = e.target.result; };
            reader.readAsDataURL(file);
        }
    });

    // ... (O restante do seu arquivo script.js, como as funções de chat, etc. permanecem as mesmas)
    // Apenas certifique-se de que o listener do botão de logout chame a nova função handleLogout.

    // ... (código existente) ...

    const getCoreMemories = () => JSON.parse(localStorage.getItem(`synapse-memories-${localProfile.ra}`) || '[]');
    const saveCoreMemories = (memories) => localStorage.setItem(`synapse-memories-${localProfile.ra}`, JSON.stringify(memories));
    
    const renderMemoryList = () => {
        const memories = getCoreMemories();
        memoryList.innerHTML = '';
        if (memories.length === 0) {
            memoryList.innerHTML = '<li>Nenhuma memória definida.</li>';
            return;
        }
        memories.forEach((mem, index) => {
            const li = document.createElement('li');
            li.className = 'memory-item';
            li.innerHTML = `<span></span><button data-index="${index}">&times;</button>`;
            li.querySelector('span').textContent = mem;
            memoryList.appendChild(li);
        });
    };

    addMemoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newMemory = memoryInput.value.trim();
        if (newMemory) {
            const memories = getCoreMemories();
            memories.push(newMemory);
            saveCoreMemories(memories);
            renderMemoryList();
            memoryInput.value = '';
        }
    });

    memoryList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index, 10);
            let memories = getCoreMemories();
            memories.splice(index, 1);
            saveCoreMemories(memories);
            renderMemoryList();
        }
    });

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

        const apiHistory = currentChatHistory.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: msg.parts.filter(p => !p.previewUrl)
        }));

        const coreMemories = getCoreMemories();

        appendMessage(promptText, 'user', geminiSelectedFile?.previewUrl);
        chatInput.value = '';
        resetImageSelection();

        const loadingMessage = appendMessage('...', 'loading');
        stopGeneratingBtn.classList.add('visible');
        chatForm.querySelector('button[type="submit"]').disabled = true;

        abortController = new AbortController();

        try {
            const response = await fetch(SYNAPSE_GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: apiHistory,
                    prompt: { role: userMessage.role, parts: userMessage.parts },
                    model: selectedModel,
                    coreMemories: coreMemories
                }),
                signal: abortController.signal
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
            if (error.name === 'AbortError') {
                appendMessage('Geração interrompida pelo usuário.', 'error');
            } else {
                appendMessage(`Desculpe, ocorreu um erro: ${error.message}`, 'error');
            }
            currentChatHistory.pop();
        } finally {
            stopGeneratingBtn.classList.remove('visible');
            chatForm.querySelector('button[type="submit"]').disabled = false;
        }
    };

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

    const getChatsFromStorage = () => JSON.parse(localStorage.getItem(`synapse-chats-${localProfile.ra}`) || '{}');
    const saveChatsToStorage = (chats) => localStorage.setItem(`synapse-chats-${localProfile.ra}`, JSON.stringify(chats));

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
                if (confirm('Tem certeza que deseja deletar esta conversa do histórico?')) {
                    deleteChat(chat.id);
                }
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
            chatLog.appendChild(welcomeContainer);
            welcomeContainer.style.display = 'flex';
        }
        resetImageSelection();
        chatInput.value = '';
        renderHistorySidebar();
    };

    const appendMessage = (text, type, imageUrl = null) => {
        if (welcomeContainer) welcomeContainer.style.display = 'none';
        const messageEl = document.createElement('div');
        messageEl.classList.add('gemini-message', `${type}-message`);
        let htmlContent = (type === 'loading') ? `<i class="fa-solid fa-spinner fa-spin"></i>` : marked.parse(text);
        
        if (type === 'error') {
            htmlContent = text;
        }
        
        if (type === 'user') {
            messageEl.innerHTML = `<p>${text}</p>`;
            if (imageUrl) {
                messageEl.innerHTML += `<img src="${imageUrl}" alt="Anexo do usuário" class="user-image-attachment">`;
            }
        } else {
            messageEl.innerHTML = htmlContent;
        }

        chatLog.appendChild(messageEl);
        if (type === 'bot') {
            addCopyButtonsToCodeBlocks(messageEl);
        }
        chatLog.scrollTop = chatLog.scrollHeight;
        return messageEl;
    };
    
    const addCopyButtonsToCodeBlocks = (container) => {
        container.querySelectorAll('pre').forEach((preElement) => {
            if (preElement.querySelector('.copy-code-btn')) return;
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-btn';
            copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
            copyButton.addEventListener('click', () => {
                const code = preElement.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
                    setTimeout(() => { copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar'; }, 2000);
                });
            });
            preElement.appendChild(copyButton);
        });
    };

    const handleImageFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                 const base64 = e.target.result.split(',')[1];
                 geminiSelectedFile = {
                     mimeType: file.type,
                     base64: base64,
                     previewUrl: e.target.result
                 };
                 imagePreview.src = e.target.result;
                 imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    const resetImageSelection = () => {
        geminiSelectedFile = null;
        imageInput.value = '';
        imagePreviewContainer.style.display = 'none';
    };

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
        if (modalId === 'settings-modal') {
            renderMemoryList();
        }
        modalBackdrop.classList.add('visible');
        modal.classList.add('visible');
    };

    const closeAllModals = () => {
        modalBackdrop.classList.remove('visible');
        allModals.forEach(modal => modal.classList.remove('visible'));
    };
    
    const initializeApp = () => {
        const savedTheme = localStorage.getItem('synapse-theme') || 'dark';
        applyTheme(savedTheme);
        updateUIWithProfile();
        startNewChat();
        populateModelDropdown();
        selectedModelNameEl.textContent = availableModels[selectedModel].name;
        chatForm.addEventListener('submit', handleChatSubmit);
        newChatBtn.addEventListener('click', startNewChat);
        attachBtn.addEventListener('click', () => imageInput.click());
        removeImageBtn.addEventListener('click', resetImageSelection);
        stopGeneratingBtn.addEventListener('click', () => { if (abortController) abortController.abort(); });
        historySearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#history-list .history-item').forEach(item => {
                const title = item.querySelector('span').textContent.toLowerCase();
                item.style.display = title.includes(searchTerm) ? 'flex' : 'none';
            });
        });

        if (menuToggleBtn) {
            menuToggleBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-visible'));
            const chatWrapper = document.querySelector('.chat-wrapper');
            chatWrapper.addEventListener('click', (e) => {
                if (document.body.classList.contains('sidebar-visible') && e.target === chatWrapper) {
                     document.body.classList.remove('sidebar-visible');
                }
            });
            historyList.addEventListener('click', (e) => {
                if (e.target.closest('.history-item')) {
                    document.body.classList.remove('sidebar-visible');
                }
            });
        }
        
        chatInput.addEventListener('paste', (e) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                    e.preventDefault();
                    handleImageFile(file);
                }
            }
        });

        imageInput.addEventListener('change', () => handleImageFile(imageInput.files[0]));
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
            localStorage.setItem('synapse-theme', newTheme);
            applyTheme(newTheme);
        });
        modelSelectorActive.addEventListener('click', (e) => {
            e.stopPropagation();
            modelDropdown.classList.toggle('visible');
        });
        userProfilePic.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('visible');
        });
        
        // MODIFICADO: Chama a função de logout correta.
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });

        document.addEventListener('click', (e) => {
            if (modelDropdown.classList.contains('visible') && !modelSelectorActive.contains(e.target)) modelDropdown.classList.remove('visible');
            if (profileDropdown.classList.contains('visible') && !userProfilePic.contains(e.target) && !profileDropdown.contains(e.target)) profileDropdown.classList.remove('visible');
        });
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });
        clearAllChatsBtn.addEventListener('click', () => {
            if (confirm("Você tem certeza? Todas as suas conversas salvas serão apagadas permanentemente.")) {
                localStorage.removeItem(`synapse-chats-${localProfile.ra}`);
                startNewChat();
                alert("Histórico de conversas limpo.");
            }
        });
        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', (e) => { e.preventDefault(); openModal(button.dataset.modalTarget); });
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
            });
            modelDropdown.appendChild(option);
        }
    }
    
    // Inicia o processo de verificação da sessão assim que o DOM estiver pronto.
    checkForActiveSession();
});