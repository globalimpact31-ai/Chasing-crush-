/* --- GAME CONFIGURATION --- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let isPlaying = false;
let score = 0; // 0 to 100
let lives = 3;
let frameId;

// Names
let playerName = "You";
let crushName = "Crush";

// Entities
let player = { x: 0, y: 0, size: 40, emoji: "😍" };
let crush = { x: 0, y: 0, size: 40, emoji: "😘", dx: 0, dy: 0, timer: 0 };
let enemies = [];
let particles = [];
let floatingTexts = [];

// Input
let mouseX = 0;
let mouseY = 0;

/* --- INITIALIZATION --- */
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
// Call resize immediately to set initial size
resize();

// Input Listeners
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Stop scroll
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchstart', (e) => {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
});

function startGame() {
    const pName = document.getElementById('playerNameInput').value.trim();
    const cName = document.getElementById('crushNameInput').value.trim();

    if (!pName || !cName) {
        alert("Please enter both names to start the romance!");
        return;
    }

    playerName = pName;
    crushName = cName;

    // Reset Game State
    isPlaying = true;
    score = 0;
    lives = 3;
    enemies = [];
    particles = [];
    floatingTexts = [];
    
    // Set initial positions
    mouseX = canvas.width / 2;
    mouseY = canvas.height / 2;
    player.x = mouseX;
    player.y = mouseY;
    moveCrush();

    // Update UI
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hud').classList.add('flex');
    updateHUD();

    // Start Loop
    if (frameId) cancelAnimationFrame(frameId);
    gameLoop();
}

function resetGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

/* --- GAME LOOP --- */
function gameLoop() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    update();
    draw();

    frameId = requestAnimationFrame(gameLoop);
}

function update() {
    // 1. Move Player (Smooth lerp to mouse)
    player.x += (mouseX - player.x) * 0.1;
    player.y += (mouseY - player.y) * 0.1;

    // 2. Move Crush (Moves randomly occasionally)
    crush.timer++;
    if (crush.timer > 100) {
        crush.dx = (Math.random() - 0.5) * 4;
        crush.dy = (Math.random() - 0.5) * 4;
        crush.timer = 0;
    }
    // Bounce off walls
    if (crush.x < 50 || crush.x > canvas.width - 50) crush.dx *= -1;
    if (crush.y < 50 || crush.y > canvas.height - 50) crush.dy *= -1;
    
    crush.x += crush.dx;
    crush.y += crush.dy;

    // Keep crush in bounds
    crush.x = Math.max(50, Math.min(canvas.width - 50, crush.x));
    crush.y = Math.max(50, Math.min(canvas.height - 50, crush.y));

    // 3. Manage Enemies (Red Flags)
    if (Math.random() < 0.03) {
        spawnEnemy();
    }

    enemies.forEach((enemy, index) => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        enemy.angle += 0.05;

        // Remove if off screen
        if (enemy.x < -100 || enemy.x > canvas.width + 100 || 
            enemy.y < -100 || enemy.y > canvas.height + 100) {
            enemies.splice(index, 1);
        }

        // Collision with Player
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < (player.size/2 + enemy.size/2)) {
            hitEnemy(index);
        }
    });

    // 4. Check Win Condition (Catch Crush)
    const distToCrush = Math.hypot(player.x - crush.x, player.y - crush.y);
    if (distToCrush < (player.size/2 + crush.size/2)) {
        catchCrush();
    }

    // 5. Particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    });

    // 6. Floating Text
    floatingTexts.forEach((t, i) => {
        t.y -= 1;
        t.life -= 0.02;
        if (t.life <= 0) floatingTexts.splice(i, 1);
    });
}

function draw() {
    // Draw Grid (Background detail)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for(let x=0; x<canvas.width; x+=gridSize) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=gridSize) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }

    // Draw Crush
    ctx.font = `${crush.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(crush.emoji, crush.x, crush.y);
    
    ctx.fillStyle = "#e11d48";
    ctx.font = "bold 16px Fredoka";
    ctx.fillText(crushName, crush.x, crush.y - 30);

    // Draw Player
    ctx.font = `${player.size}px Arial`;
    ctx.fillText(player.emoji, player.x, player.y);
    
    ctx.fillStyle = "#4f46e5";
    ctx.font = "bold 16px Fredoka";
    ctx.fillText(playerName, player.x, player.y - 30);

    // Draw Enemies
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(Math.sin(enemy.angle) * 0.2); // Wiggle effect
        ctx.font = `${enemy.size}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.emoji, 0, 0);
        ctx.restore();
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    // Draw Floating Text
    floatingTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.font = "bold 20px Fredoka";
        ctx.globalAlpha = Math.min(1, t.life * 2);
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
    });
}

/* --- GAME MECHANICS --- */

function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
    let x, y, vx, vy;
    const speed = 2 + (score / 20); // Gets harder

    if (edge === 0) { x = Math.random() * canvas.width; y = -50; vx = (Math.random()-0.5)*2; vy = speed; }
    else if (edge === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; vx = -speed; vy = (Math.random()-0.5)*2; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; vx = (Math.random()-0.5)*2; vy = -speed; }
    else { x = -50; y = Math.random() * canvas.height; vx = speed; vy = (Math.random()-0.5)*2; }

    const type = Math.random();
    let emoji = "🚩"; // Red flag
    let size = 40;
    
    if (type > 0.8) emoji = "🛑"; // Stop sign (Friend zone)
    if (type > 0.9) { emoji = "👻"; size = 45; } // Ghosting

    enemies.push({ x, y, vx, vy, emoji, size, angle: 0 });
}

function hitEnemy(index) {
    const enemy = enemies[index];
    createParticles(enemy.x, enemy.y, "#ef4444");
    
    // Funny Texts
    const phrases = ["Red Flag!", "Ghosted!", "Friend Zoned!", "Left on Read", "Too Clingy!", "Drama!"];
    spawnFloatingText(player.x, player.y, phrases[Math.floor(Math.random() * phrases.length)], "#ef4444");

    enemies.splice(index, 1);
    lives--;
    updateHUD();

    // Screen shake
    canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
    setTimeout(() => canvas.style.transform = "none", 200);

    if (lives <= 0) {
        endGame(false);
    }
}

function catchCrush() {
    score += 10;
    createParticles(crush.x, crush.y, "#f43f5e");
    spawnFloatingText(crush.x, crush.y - 30, "+10 Love", "#f43f5e");
    
    updateHUD();
    
    if (score >= 100) {
        endGame(true);
    } else {
        moveCrush();
    }
}

function moveCrush() {
    crush.x = Math.random() * (canvas.width - 100) + 50;
    crush.y = Math.random() * (canvas.height - 100) + 50;
}

function createParticles(x, y, color) {
    for(let i=0; i<10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 1 });
}

function updateHUD() {
    // Lives
    let heartString = "";
    for(let i=0; i<lives; i++) heartString += "❤️";
    document.getElementById('livesDisplay').innerText = heartString;

    // Score Bar
    document.getElementById('loveBar').style.width = `${score}%`;
}

function endGame(win) {
    isPlaying = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('flex');

    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMessage');
    const emoji = document.getElementById('resultEmoji');
    const scoreText = document.getElementById('finalScoreText');

    if (win) {
        title.innerText = "IT'S A MATCH! 💍";
        title.className = "text-3xl font-bold text-rose-600 mb-2";
        msg.innerText = `${playerName} & ${crushName} are meant to be!`;
        emoji.innerText = "🥰";
        scoreText.innerText = "SOULMATES";
        
        // Confetti
        setInterval(() => {
            createParticles(Math.random()*canvas.width, Math.random()*canvas.height, ["#f43f5e", "#fb7185", "#ffe4e6"][Math.floor(Math.random()*3)]);
            draw(); // Manual draw call for background confetti
        }, 100);

    } else {
        title.innerText = "GAME OVER";
        title.className = "text-3xl font-bold text-gray-800 mb-2";
        
        const burn = [
            "Maybe try Tinder?",
            "You got ghosted hard.",
            "They're just not that into you.",
            "Seen at 11:45 PM."
        ];
        msg.innerText = burn[Math.floor(Math.random() * burn.length)];
        emoji.innerText = "💔";
        scoreText.innerText = "SINGLE FOREVER";
    }
}