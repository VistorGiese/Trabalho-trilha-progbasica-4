let users = [];
let nextId = 1;

function addUser(user) {
  const newUser = {
    id: nextId++,
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: new Date()
  };
  
  users.push(newUser);
  return newUser;
}

function findByUsername(username) {
  return users.find(user => user.username === username);
}

function findById(id) {
  return users.find(user => user.id === parseInt(id));
}

function getAllUsers() {
  return users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt
  }));
}

module.exports = {
  addUser,
  findByUsername,
  findById,
  getAllUsers
};
