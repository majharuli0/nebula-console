# Contributing to Nebula Console

First off, thanks for taking the time to contribute! 🎉

We want to make contributing to Nebula Console as easy and transparent as possible, whether it's:

*   Reporting a bug
*   Discussing the current state of the code
*   Submitting a fix
*   Proposing new features
*   Becoming a maintainer

## 🚀 How to Contribute

### 1. Fork & Clone
Fork the repository on GitHub, then clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/nebula-console.git
cd nebula-console
```

### 2. Create a Branch
Create a new branch for your feature or fix:
```bash
git checkout -b feature/amazing-new-game
```

### 3. Develop
Make your changes! If you're adding a new game, here's a quick guide:

#### Adding a New Game
1.  **Create Game Scene:** Add a new Phaser scene file in `client/src/games/` (e.g., `MyNewGame.js`).
2.  **Register Game:** Update `client/src/constants.js` (or `shared/constants.js` if unified) to include your new game ID.
3.  **Update Selector:** Add your game to the list in `client/src/host/GameSelector.jsx`.
4.  **Update Container:** Import your scene in `client/src/host/GameContainer.jsx` and add it to the `useEffect` scene logic.
5.  **Test:** Ensure both the Host and Controller work correctly with your new game.

### 4. Commit & Push
Commit your changes with a clear message:
```bash
git commit -m "Add Amazing New Game"
git push origin feature/amazing-new-game
```

### 5. Pull Request
Open a Pull Request on the main repository. Describe your changes, what they do, and any testing you've performed.

## 🐛 Reporting Bugs

If you find a bug, please open an issue on GitHub. Include:
*   Steps to reproduce
*   Expected behavior
*   Actual behavior
*   Screenshots (if applicable)

## 📜 Code of Conduct

Please be respectful and considerate of others. We want to build a welcoming community for everyone.

Happy Coding! 🚀
