document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('usernameDisplay').textContent = `Usuário ID: ${payload.userId}`;
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        document.getElementById('usernameDisplay').textContent = 'Usuário autenticado';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    
    // Click na área de upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
    
    uploadForm.addEventListener('submit', handleUpload);
}

function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const submitBtn = document.getElementById('submitBtn');
    const uploadArea = document.getElementById('uploadArea');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        
        const fileIcon = document.querySelector('.file-icon');
        if (file.type.startsWith('image/')) {
            fileIcon.textContent = '🖼️';
        } else if (file.type.includes('pdf')) {
            fileIcon.textContent = '📄';
        } else if (file.type.includes('word') || file.type.includes('document')) {
            fileIcon.textContent = '📝';
        } else {
            fileIcon.textContent = '📁';
        }
        
        uploadArea.style.display = 'none';
        fileInfo.style.display = 'flex';
        submitBtn.disabled = false;
    }
}

function removeFile() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const submitBtn = document.getElementById('submitBtn');
    const uploadArea = document.getElementById('uploadArea');
    
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    submitBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message show ${type}`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

async function handleUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const submitBtn = document.getElementById('submitBtn');
    const token = localStorage.getItem('authToken');
    
    if (!fileInput.files.length) {
        showMessage('Nenhum arquivo selecionado!', 'error');
        return;
    }
    
    if (!token) {
        showMessage('Você precisa fazer login primeiro!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Enviando...</span>';
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message, 'success');
            console.log('Upload bem-sucedido!');
            console.log('Arquivo:', data.file);
            console.log('Enviado por usuário ID:', data.uploadedBy);
            
            setTimeout(() => {
                removeFile();
            }, 2000);
        } else {
            showMessage(data.message, 'error');
            
            if (response.status === 401 || response.status === 403) {
                setTimeout(() => {
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        showMessage('Erro ao enviar arquivo. Tente novamente.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span>Fazer Upload</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
        `;
    }
}
