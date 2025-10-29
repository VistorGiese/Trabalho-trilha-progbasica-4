const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const userModel = require('./models/userModel');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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
