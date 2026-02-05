const fs = require('fs');

let content = fs.readFileSync('game.js', 'utf8');

const menuButtonCode = `
        
        // Create Menu button dynamically
        const menuBtn = document.createElement('button');
        menuBtn.textContent = '← Menu';
        menuBtn.style.cssText = 'position: fixed; bottom: 6rem; left: 1.5rem; padding: 0.75rem 1.5rem; background: rgba(26, 26, 46, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); color: white; border-radius: 12px; cursor: pointer; font-family: "Outfit", sans-serif; font-size: 1rem; font-weight: 600; transition: all 0.3s ease; z-index: 100;';
        menuBtn.onmouseover = () => { menuBtn.style.background = 'rgba(251, 191, 36, 0.2)'; menuBtn.style.borderColor = 'rgba(251, 191, 36, 0.5)'; };
        menuBtn.onmouseout = () => { menuBtn.style.background = 'rgba(26, 26, 46, 0.9)'; menuBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)'; };
        menuBtn.onclick = () => window.location.href = 'menu.html';
        document.body.appendChild(menuBtn);`;

// Find the line with restartBtn addEventListener
const marker = "this.restartBtn.addEventListener('click', () => this.restartGame());";
const index = content.indexOf(marker);

if (index !== -1) {
    // Find the closing brace of the init method
    const methodEnd = content.indexOf('\n    }', index);
    if (methodEnd !== -1) {
        content = content.substring(0, methodEnd) + menuButtonCode + content.substring(methodEnd);
        fs.writeFileSync('game.js', content, 'utf8');
        console.log('Menu button code added successfully!');
    } else {
        console.log('ERROR: Could not find method closing brace');
    }
} else {
    console.log('ERROR: Could not find restartBtn marker');
}
