require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userModel = require('./models/userModel');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido!'));
    }
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token não fornecido!'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido ou expirado!'
    });
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios!'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres!'
      });
    }

    const existingUser = userModel.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Nome de usuário já existe!'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = userModel.addUser({
      username,
      email,
      passwordHash
    });

    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota de Login (POST /login)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validação dos campos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios!'
      });
    }

    // Buscar usuário pelo username
    const user = userModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.'
      });
    }

    // Verificar senha usando bcrypt
    const senhaValida = await bcrypt.compare(password, user.passwordHash);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Retornar token
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota de Upload Protegida (POST /upload)
app.post('/upload', verificarToken, upload.single('file'), (req, res) => {
  try {
    // Imprimir o ID do usuário que está fazendo o upload
    console.log(`[UPLOAD] Usuário ID ${req.userId} está fazendo upload`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado!'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Arquivo enviado com sucesso!',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      },
      uploadedBy: req.userId
    });

  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload do arquivo'
    });
  }
});

app.get('/users', (req, res) => {
  const users = userModel.getAllUsers();
  res.json({
    success: true,
    count: users.length,
    users
  });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  
  const user = userModel.findById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado!'
    });
  }
  
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
