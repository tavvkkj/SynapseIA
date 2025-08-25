document.addEventListener('DOMContentLoaded', () => {
// --- ELEMENTOS DO DOM ---
const loader = document.getElementById('loader');
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
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
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
const chatSendBtn = document.getElementById('chat-send-btn');

// --- VARIÁVEIS DE ESTADO ---
const SYNAPSE_GEMINI_API_URL = '/api/gemini';
const SYNAPSE_AUTH_API_URL = '/api/auth';
let selectedFile = null;
let localProfile = {};
let currentChatId = null;
let currentChatHistory = [];
let abortController = null;

// --- LÓGICA DE SELEÇÃO DE MODELO ---
const availableModels = {
        'gemini-1.5-pro-latest': { name: "Gemini 1.5 Pro", desc: "Modelo poderoso e preciso." },
        'gemini-1.5-flash-latest': { name: "Gemini 1.5 Flash", desc: "Equilíbrio entre velocidade e performance." },
        'gemini-pro': { name: "Gemini 1.0 Pro", desc: "Modelo padrão, rápido e capaz."}
        'gemini-2.5-pro': { name: "Gemini 2.5 Pro", desc: "Futuro modelo de ponta." },
        'gemini-2.5-flash': { name: "Gemini 2.5 Flash", desc: "Futuro modelo rápido e eficiente." },
        'gemini-1.5-pro-latest': { name: "Gemini 1.5 Pro", desc: "O modelo mais poderoso e preciso." },
        'gemini-1.5-flash-latest': { name: "Gemini 1.5 Flash", desc: "Equilíbrio ideal de velocidade e performance." },
};
    let selectedModel = 'gemini-1.5-flash-latest';
    // Define o modelo mais avançado disponível como padrão inicial
    let selectedModel = 'gemini-2.5-pro';


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
showLoginScreen();
return;
}

try {
const response = await fetch(SYNAPSE_AUTH_API_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ ra: activeRa, isSessionCheck: true })
});

if (!response.ok) {
localStorage.removeItem('synapse-active-ra');
showLoginScreen();
return;
}

const data = await response.json();
if (data.success) {
localProfile = data.profile;
showMainApp();
initializeApp();
} else {
localStorage.removeItem('synapse-active-ra');
showLoginScreen();
}
} catch (error) {
console.error("Erro ao verificar sessão:", error);
showLoginScreen();
}
};

const showLoginScreen = () => {
document.body.classList.remove('loading');
authContainer.style.display = 'flex';
mainContainer.style.display = 'none';
};

const showMainApp = () => {
document.body.classList.remove('loading');
authContainer.style.display = 'none';
mainContainer.style.display = 'flex';
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
// Simulação de chamada de API - substitua pela sua lógica real se necessário
console.log(`Tentando login para RA: ${ra}`);
if (!password) { // Simula erro de senha vazia
throw new Error('A senha não pode estar em branco.');
}
// Simulação de sucesso
const simulatedResponse = {
token: `fake-token-for-${ra}`,
DadosUsuario: {
NAME: 'Usuário Simulado',
CD_USUARIO: `cd-${ra}`,
EMAIL_GOOGLE: `${ra}@aluno.educacao.sp.gov.br`,
EMAIL_MS: `${ra}@ms.educacao.sp.gov.br`,
}
};
return new Promise(resolve => setTimeout(() => resolve(simulatedResponse), 1000));
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

localStorage.setItem('synapse-active-ra', ra);

mainContainer.style.animation = 'fadeInEnhanced 0.5s ease-in-out forwards';
showMainApp();
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
localStorage.removeItem('synapse-active-ra');
localProfile = {};
location.reload();
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
if (!promptText && !selectedFile) return;

if (!currentChatId) {
currentChatId = Date.now();
}

const userMessage = {
role: "user",
parts: [],
fileInfo: null
};

if (selectedFile) {
let filePart;
if (selectedFile.type.startsWith('image/')) {
filePart = { inline_data: { mime_type: selectedFile.type, data: selectedFile.base64 } };
} else {
// Para outros arquivos, enviamos como texto
filePart = { text: `O usuário anexou o arquivo '${selectedFile.name}' com o seguinte conteúdo:\n\n\`\`\`\n${selectedFile.content}\n\`\`\`` };
}
userMessage.parts.push(filePart);
userMessage.fileInfo = { name: selectedFile.name, type: selectedFile.type, content: selectedFile.content };
}

if (promptText) {
userMessage.parts.push({ text: promptText });
}


currentChatHistory.push(userMessage);

const apiHistory = currentChatHistory.slice(0, -1).map(msg => ({
role: msg.role,
parts: msg.parts
}));

const coreMemories = getCoreMemories();

appendMessage(promptText, 'user', userMessage.fileInfo);
chatInput.value = '';
autoResizeTextarea();
resetFileSelection();
updateSendButtonState();


const loadingMessage = appendMessage('...', 'loading');
stopGeneratingBtn.classList.add('visible');
chatSendBtn.disabled = true;

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
updateSendButtonState();
}
};

chatLog.addEventListener('click', (e) => {
const copyBtn = e.target.closest('.copy-message-btn');
if (copyBtn) {
const messageEl = copyBtn.closest('.gemini-message');
const textToCopy = messageEl.querySelector('.message-content').innerText;
navigator.clipboard.writeText(textToCopy).then(() => {
copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
setTimeout(() => {
copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
}, 2000);
}).catch(err => {
console.error('Falha ao copiar texto: ', err);
});
}
});

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

let title = 'Nova Conversa';
if (firstUserMessage) {
const textPart = firstUserMessage.parts.find(p => p.text);
if(textPart) {
title = textPart.text.substring(0, 30) + '...';
} else if (firstUserMessage.fileInfo) {
title = `Arquivo: ${firstUserMessage.fileInfo.name}`;
}
}

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
const fileInfo = message.role === 'user' ? (message.fileInfo || null) : null;
appendMessage(text, type, fileInfo);
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
resetFileSelection();
chatInput.value = '';
autoResizeTextarea();
updateSendButtonState();
renderHistorySidebar();
};

const appendMessage = (text, type, fileInfo = null) => {
if (welcomeContainer) welcomeContainer.style.display = 'none';
const messageEl = document.createElement('div');
messageEl.classList.add('gemini-message', `${type}-message`);

let contentHTML = '';

if (fileInfo) {
if (fileInfo.type.startsWith('image/')) {
contentHTML += `<img src="${fileInfo.content}" alt="Anexo: ${fileInfo.name}" class="user-image-attachment">`;
} else {
contentHTML += `<div class="user-file-attachment"><strong>${fileInfo.name}</strong><pre>${escapeHtml(fileInfo.content.substring(0, 500))}${fileInfo.content.length > 500 ? '...' : ''}</pre></div>`;
}
}

if (text || type === 'loading') {
let messageText = '';
if (type === 'loading') {
messageText = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
} else if (type === 'error') {
messageText = escapeHtml(text);
} else {
messageText = marked.parse(text);
}
contentHTML += `<div class="message-content">${messageText}</div>`;
}

let actionsHTML = '';
if (type === 'bot' || type === 'user') {
actionsHTML = `<div class="message-actions">
               <button class="message-action-btn copy-message-btn" title="Copiar"><i class="fa-regular fa-copy"></i></button>
           </div>`;
}

messageEl.innerHTML = contentHTML + actionsHTML;

chatLog.appendChild(messageEl);
if (type === 'bot') {
addCopyButtonsToCodeBlocks(messageEl);
}
chatLog.scrollTop = chatLog.scrollHeight;
return messageEl;
};

const escapeHtml = (unsafe) => {
if (typeof unsafe !== 'string') return '';
return unsafe
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

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

const handleFileSelection = (file) => {
if (!file) return;
const reader = new FileReader();

reader.onload = (e) => {
selectedFile = {
name: file.name,
type: file.type,
size: file.size,
content: e.target.result, // Para texto: conteúdo, Para imagem: base64 Data URL
base64: file.type.startsWith('image/') ? e.target.result.split(',')[1] : null
};
displayFilePreview();
updateSendButtonState();
};

if(file.type.startsWith('image/')) {
reader.readAsDataURL(file); // Lê imagem como base64
} else if (file.type.startsWith('text/') || /\.(js|py|html|css|json|md|java|c|cpp|cs|ts|jar)$/i.test(file.name)) {
reader.readAsText(file); // Lê outros como texto
} else {
// Para .jar e outros binários, podemos apenas mostrar o nome
selectedFile = { name: file.name, type: file.type, size: file.size, content: `[Arquivo binário, conteúdo não exibido]` };
displayFilePreview();
updateSendButtonState();
}
};

const displayFilePreview = () => {
filePreviewContainer.innerHTML = '';
if (!selectedFile) {
filePreviewContainer.style.display = 'none';
return;
}

let previewHTML = '';
if (selectedFile.type.startsWith('image/')) {
previewHTML = `<img src="${selectedFile.content}" alt="Preview">`;
} else {
const iconClass = getIconForFileType(selectedFile.name);
previewHTML = `<i class="${iconClass}"></i>`;
}

filePreviewContainer.innerHTML = `
           <div class="file-preview-info">
               ${previewHTML}
               <div class="file-preview-details">
                   <strong>${escapeHtml(selectedFile.name)}</strong>
                   <span>${formatBytes(selectedFile.size)} - ${selectedFile.type}</span>
               </div>
           </div>
           <button id="remove-file-btn" title="Remover arquivo">&times;</button>
       `;

filePreviewContainer.style.display = 'flex';
document.getElementById('remove-file-btn').addEventListener('click', resetFileSelection);
};

const getIconForFileType = (fileName) => {
const extension = fileName.split('.').pop().toLowerCase();
switch(extension) {
case 'js': return 'fab fa-js-square';
case 'py': return 'fab fa-python';
case 'html': return 'fab fa-html5';
case 'css': return 'fab fa-css3-alt';
case 'json': return 'fas fa-file-code';
case 'txt': return 'fas fa-file-alt';
case 'pdf': return 'fas fa-file-pdf';
case 'jar': return 'fas fa-file-archive';
default: return 'fas fa-file';
}
}

const formatBytes = (bytes, decimals = 2) => {
if (bytes === 0) return '0 Bytes';
const k = 1024;
const dm = decimals < 0 ? 0 : decimals;
const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const resetFileSelection = () => {
selectedFile = null;
fileInput.value = '';
filePreviewContainer.style.display = 'none';
updateSendButtonState();
};

const openModal = (modalId) => {
const modal = document.getElementById(modalId);
if (!modal) return;
document.body.classList.add('modal-open');
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
document.body.classList.remove('modal-open');
modalBackdrop.classList.remove('visible');
allModals.forEach(modal => modal.classList.remove('visible'));
};

const autoResizeTextarea = () => {
chatInput.style.height = 'auto';
chatInput.style.height = (chatInput.scrollHeight) + 'px';
};

const updateSendButtonState = () => {
const hasText = chatInput.value.trim().length > 0;
const hasFile = selectedFile !== null;
chatSendBtn.disabled = !hasText && !hasFile;
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
attachBtn.addEventListener('click', () => fileInput.click());
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
if (document.body.classList.contains('sidebar-visible') && e.target.classList.contains('chat-wrapper')) {
document.body.classList.remove('sidebar-visible');
}
});
historyList.addEventListener('click', (e) => {
if (e.target.closest('.history-item')) {
document.body.classList.remove('sidebar-visible');
}
});
}

chatInput.addEventListener('input', () => {
autoResizeTextarea();
updateSendButtonState();
});

chatInput.addEventListener('keydown', (e) => {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
handleChatSubmit();
}
});

chatInput.addEventListener('paste', (e) => {
if (e.clipboardData && e.clipboardData.files.length > 0) {
const file = e.clipboardData.files[0];
e.preventDefault();
handleFileSelection(file);
}
});

fileInput.addEventListener('change', () => handleFileSelection(fileInput.files[0]));
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

checkForActiveSession();
});
});
