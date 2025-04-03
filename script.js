document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.querySelector('.game-container');
    const battlefield = document.querySelector('.battlefield');
    const castle = document.querySelector('.castle');
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('start-btn');
    const addSoldierButton = document.getElementById('add-soldier-btn');
    const addFirefighterButton = document.getElementById('add-firefighter-btn');

    let gameRunning = false;
    let score = 0;
    let attackers = [];
    let soldiers = [];
    let firefighters = [];
    let attackerId = 0;
    let soldierId = 0;
    let firefighterId = 0;
    let attackerInterval;
    let gameInterval;
    let castleBurning = false;
    let fireIntensity = 0; // 0-100, 0 je uhašeno, 100 je maximální požár
    let explosionTimeout = null; // Časovač pro výbuch hradu
    let castleExploded = false; // Stav zda hrad vybouchl

    // Castle position
    const castlePosition = {
        x: gameContainer.offsetWidth / 2, // Střed hradu
        y: gameContainer.offsetHeight * 0.6 // Pozice hradu (60% výšky kontejneru)
    };

    // Start game
    startButton.addEventListener('click', () => {
        if (!gameRunning) {
            gameRunning = true;
            score = 0;
            scoreElement.textContent = score;
            startButton.textContent = 'Zastavit';
            startGame();
        } else {
            gameRunning = false;
            startButton.textContent = 'Start';
            stopGame();
        }
    });

    // Add soldier
    addSoldierButton.addEventListener('click', () => {
        if (gameRunning && !castleExploded) {
            createSoldier();
        }
    });

    // Add firefighter
    addFirefighterButton.addEventListener('click', () => {
        if (gameRunning && !castleExploded) {
            createFirefighter();
        }
    });

    function startGame() {
        // Clear existing intervals
        if (attackerInterval) clearInterval(attackerInterval);
        if (gameInterval) clearInterval(gameInterval);
        if (explosionTimeout) clearTimeout(explosionTimeout);

        // Clear battlefield
        battlefield.innerHTML = '';
        attackers = [];
        soldiers = [];
        firefighters = [];
        
        // Reset castle burning state
        castleBurning = false;
        fireIntensity = 0;
        castleExploded = false;
        castle.classList.remove('burning');
        castle.classList.remove('exploded');

        // Remove any existing explosion elements
        const existingExplosions = document.querySelectorAll('.explosion');
        existingExplosions.forEach(explosion => {
            gameContainer.removeChild(explosion);
        });

        // Create new attackers at intervals (zrychleno z 2000ms na 1000ms)
        attackerInterval = setInterval(createAttacker, 1000);

        // Update game state (zrychleno z 50ms na 30ms)
        gameInterval = setInterval(updateGame, 30);
    }

    function stopGame() {
        clearInterval(attackerInterval);
        clearInterval(gameInterval);
        if (explosionTimeout) clearTimeout(explosionTimeout);
    }

    function createAttacker() {
        // Pokud hrad vybouchl, zastavit vytváření útočníků
        if (castleExploded) return;

        const attacker = document.createElement('div');
        
        // Náhodně rozhodnout, jestli vytvořit bosse (15% šance)
        const isBoss = Math.random() < 0.15;
        
        attacker.className = isBoss ? 'attacker boss' : 'attacker';
        attacker.id = `attacker-${attackerId}`;
        attackerId++;

        // Random position at the bottom of the screen
        const xPos = Math.random() * (gameContainer.offsetWidth - 20);
        const yPos = gameContainer.offsetHeight - 30;

        attacker.style.left = `${xPos}px`;
        attacker.style.bottom = '0';

        // Store attacker data
        attackers.push({
            element: attacker,
            x: xPos,
            y: 0,
            id: attacker.id,
            health: isBoss ? 8 : 2, // Boss má více zdraví
            isBoss: isBoss,
            speed: isBoss ? 0.8 : 1.5 // Boss je pomalejší
        });

        gameContainer.appendChild(attacker);
    }

    function createSoldier() {
        const soldier = document.createElement('div');
        soldier.className = 'soldier';
        soldier.id = `soldier-${soldierId}`;
        soldierId++;

        // Position near the castle
        const castleRect = castle.getBoundingClientRect();
        const xPos = castleRect.left + Math.random() * castleRect.width - 10;
        const yPos = castleRect.bottom;

        soldier.style.left = `${xPos}px`;
        soldier.style.bottom = `${gameContainer.offsetHeight - yPos}px`;

        // Store soldier data
        soldiers.push({
            element: soldier,
            x: xPos,
            y: gameContainer.offsetHeight - yPos,
            id: soldier.id,
            targetId: null,
            health: 1 // Vojáci mají jen jedno zdraví
        });

        gameContainer.appendChild(soldier);
    }

    function createFirefighter() {
        const firefighter = document.createElement('div');
        firefighter.className = 'firefighter';
        firefighter.id = `firefighter-${firefighterId}`;
        firefighterId++;

        // Position near the castle
        const castleRect = castle.getBoundingClientRect();
        const xPos = castleRect.left + Math.random() * castleRect.width - 10;
        const yPos = castleRect.bottom;

        firefighter.style.left = `${xPos}px`;
        firefighter.style.bottom = `${gameContainer.offsetHeight - yPos}px`;

        // Store firefighter data
        firefighters.push({
            element: firefighter,
            x: xPos,
            y: gameContainer.offsetHeight - yPos,
            id: firefighter.id,
            isSpraying: false
        });

        gameContainer.appendChild(firefighter);
    }

    function updateGame() {
        if (!castleExploded) {
            moveAttackers();
            moveSoldiers();
            moveFirefighters();
            checkCollisions();
            updateCastleFire();
        }
    }

    function moveAttackers() {
        for (let i = 0; i < attackers.length; i++) {
            const attacker = attackers[i];
            
            // Move towards castle center
            const deltaX = castlePosition.x - attacker.x;
            const deltaY = castlePosition.y - attacker.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > 5) {
                // Použij rychlost podle typu útočníka
                attacker.x += (deltaX / distance) * attacker.speed;
                attacker.y += (deltaY / distance) * attacker.speed;
                
                attacker.element.style.left = `${attacker.x}px`;
                attacker.element.style.bottom = `${attacker.y}px`;
            } else {
                // Útočník dosáhl hradu
                if (gameRunning) {
                    score -= attacker.isBoss ? 20 : 10; // Boss způsobí větší ztrátu bodů
                    scoreElement.textContent = score;
                    
                    // Zvýší intenzitu požáru
                    fireIntensity += attacker.isBoss ? 20 : 10;
                    fireIntensity = Math.min(fireIntensity, 100); // Omezit na max 100
                    
                    // Přidej efekt hořícího hradu
                    if (!castleBurning && fireIntensity > 0) {
                        castle.classList.add('burning');
                        castleBurning = true;
                        
                        // Nastavíme časovač pro výbuch, pokud požár dosáhne maxima
                        startExplosionTimer();
                    }
                    
                    removeAttacker(attacker.id);
                }
            }
        }
    }

    function startExplosionTimer() {
        // Pokud už časovač běží, nerušíme ho
        if (explosionTimeout) return;
        
        // Nastavíme 15 sekund do výbuchu, pokud intenzita požáru dosáhne maxima
        explosionTimeout = setTimeout(() => {
            if (castleBurning && fireIntensity >= 100 && !castleExploded) {
                explodeCastle();
            }
            explosionTimeout = null;
        }, 15000);
    }

    function explodeCastle() {
        // Hrad vybouchne
        castleExploded = true;
        
        // Vizuální efekt exploze
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = `${castlePosition.x}px`;
        explosion.style.top = `${castlePosition.y}px`;
        gameContainer.appendChild(explosion);
        
        // Zvukový efekt exploze (kdyby byl potřeba)
        // const explosionSound = new Audio('explosion.mp3');
        // explosionSound.play();
        
        // Upravíme vzhled hradu (poničený)
        castle.classList.remove('burning');
        castle.classList.add('exploded');
        
        // Velká ztráta bodů
        score -= 100;
        scoreElement.textContent = score;
        
        // Zabít všechny vojáky a hasiče v okolí hradu
        const castleAreaRadius = 150;
        
        // Odstranit vojáky v okolí výbuchu
        for (let i = soldiers.length - 1; i >= 0; i--) {
            const soldier = soldiers[i];
            const deltaX = castlePosition.x - soldier.x;
            const deltaY = castlePosition.y - soldier.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < castleAreaRadius) {
                removeSoldier(soldier.id);
            }
        }
        
        // Odstranit hasiče v okolí výbuchu
        for (let i = firefighters.length - 1; i >= 0; i--) {
            const firefighter = firefighters[i];
            const deltaX = castlePosition.x - firefighter.x;
            const deltaY = castlePosition.y - firefighter.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < castleAreaRadius) {
                removeFirefighter(firefighter.id);
            }
        }
        
        // Zastavit vytváření nových útočníků
        clearInterval(attackerInterval);
        
        // Zobrazit zprávu o konci hry po 2 sekundách
        setTimeout(() => {
            alert('Hrad vybouchl! Konec hry. Tvoje skóre: ' + score);
            gameRunning = false;
            startButton.textContent = 'Start';
        }, 2000);
    }

    function moveSoldiers() {
        for (let i = 0; i < soldiers.length; i++) {
            const soldier = soldiers[i];
            
            // Find closest attacker if no target or target is gone
            if (!soldier.targetId || !attackers.find(a => a.id === soldier.targetId)) {
                let closestAttacker = null;
                let closestDistance = Infinity;
                
                for (const attacker of attackers) {
                    const deltaX = attacker.x - soldier.x;
                    const deltaY = attacker.y - soldier.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestAttacker = attacker;
                    }
                }
                
                if (closestAttacker) {
                    soldier.targetId = closestAttacker.id;
                }
            }
            
            // Move towards target
            const targetAttacker = attackers.find(a => a.id === soldier.targetId);
            if (targetAttacker) {
                const deltaX = targetAttacker.x - soldier.x;
                const deltaY = targetAttacker.y - soldier.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > 15) {
                    // Zrychleno z 1.2x na 2x
                    soldier.x += deltaX / distance * 2;
                    soldier.y += deltaY / distance * 2;
                    
                    soldier.element.style.left = `${soldier.x}px`;
                    soldier.element.style.bottom = `${soldier.y}px`;
                }
            }
        }
    }

    function moveFirefighters() {
        for (let i = 0; i < firefighters.length; i++) {
            const firefighter = firefighters[i];
            
            // Pokud hrad hoří, hasiči se pohybují k hradu
            if (castleBurning) {
                const deltaX = castlePosition.x - firefighter.x;
                const deltaY = castlePosition.y - firefighter.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > 30) {
                    // Pohyb k hradu
                    firefighter.x += deltaX / distance * 1.5;
                    firefighter.y += deltaY / distance * 1.5;
                    
                    firefighter.element.style.left = `${firefighter.x}px`;
                    firefighter.element.style.bottom = `${firefighter.y}px`;
                    
                    // Není dost blízko, aby stříkal vodu
                    firefighter.isSpraying = false;
                    firefighter.element.classList.remove('spraying');
                } else {
                    // Je dost blízko, začne hasit
                    firefighter.isSpraying = true;
                    firefighter.element.classList.add('spraying');
                }
            } else {
                // Když hrad nehoří, hasiči se pohybují náhodně
                if (Math.random() < 0.02) {
                    const randomAngle = Math.random() * Math.PI * 2;
                    const moveX = Math.cos(randomAngle) * 2;
                    const moveY = Math.sin(randomAngle) * 2;
                    
                    firefighter.x += moveX;
                    firefighter.y += moveY;
                    
                    // Omezení pohybu hasiče na herní plochu
                    firefighter.x = Math.max(0, Math.min(gameContainer.offsetWidth - 20, firefighter.x));
                    firefighter.y = Math.max(0, Math.min(gameContainer.offsetHeight * 0.4, firefighter.y));
                    
                    firefighter.element.style.left = `${firefighter.x}px`;
                    firefighter.element.style.bottom = `${firefighter.y}px`;
                }
                
                // Není dost blízko, aby stříkal vodu
                firefighter.isSpraying = false;
                firefighter.element.classList.remove('spraying');
            }
        }
    }

    function updateCastleFire() {
        // Pokud hrad hoří a jsou hasiči, kteří stříkají vodu, sniž intenzitu požáru
        if (castleBurning) {
            const sprayingFirefighters = firefighters.filter(f => f.isSpraying).length;
            
            if (sprayingFirefighters > 0) {
                // Každý hasič sníží intenzitu o 0.5 za snímek
                fireIntensity -= sprayingFirefighters * 0.5;
                
                if (fireIntensity <= 0) {
                    // Hrad je uhašen
                    fireIntensity = 0;
                    castleBurning = false;
                    castle.classList.remove('burning');
                    
                    // Zrušíme časovač pro výbuch
                    if (explosionTimeout) {
                        clearTimeout(explosionTimeout);
                        explosionTimeout = null;
                    }
                    
                    // Bonus za uhašení
                    score += 30;
                    scoreElement.textContent = score;
                }
            } else {
                // Pokud nikdo nehasí a oheň je na maximu, zvyšujeme šanci na výbuch
                if (fireIntensity >= 100 && !castleExploded) {
                    // Zvyšujeme šanci, že výbuch nastane dříve
                    if (explosionTimeout && Math.random() < 0.001) {
                        clearTimeout(explosionTimeout);
                        explodeCastle();
                    }
                }
            }
        }
    }

    function checkCollisions() {
        // Projít všechny vojáky
        for (let i = soldiers.length - 1; i >= 0; i--) {
            const soldier = soldiers[i];
            let soldierKilled = false;
            
            // Kontrola kolize s útočníky
            for (let j = 0; j < attackers.length; j++) {
                const attacker = attackers[j];
                
                const deltaX = attacker.x - soldier.x;
                const deltaY = attacker.y - soldier.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance < 20) {
                    // Voják útočí na útočníka a zároveň je zabit
                    attacker.health -= 1;
                    soldierKilled = true;
                    
                    // Útočník je poražen
                    if (attacker.health <= 0) {
                        score += attacker.isBoss ? 5 : 1; // Boss dá více bodů
                        scoreElement.textContent = score;
                        removeAttacker(attacker.id);
                    }
                    
                    // Ukončit kontrolu dalších útočníků pro tohoto vojáka
                    break;
                }
            }
            
            // Pokud byl voják zabit, odstraň ho
            if (soldierKilled) {
                removeSoldier(soldier.id);
            }
        }
        
        // Projít všechny hasiče
        for (let i = firefighters.length - 1; i >= 0; i--) {
            const firefighter = firefighters[i];
            let firefighterKilled = false;
            
            // Kontrola kolize s útočníky
            for (let j = 0; j < attackers.length; j++) {
                const attacker = attackers[j];
                
                const deltaX = attacker.x - firefighter.x;
                const deltaY = attacker.y - firefighter.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance < 20) {
                    // Hasič je zabit útočníkem
                    firefighterKilled = true;
                    
                    // Ukončit kontrolu dalších útočníků pro tohoto hasiče
                    break;
                }
            }
            
            // Pokud byl hasič zabit, odstraň ho
            if (firefighterKilled) {
                removeFirefighter(firefighter.id);
            }
        }
    }

    function removeAttacker(id) {
        const attackerIndex = attackers.findIndex(a => a.id === id);
        if (attackerIndex !== -1) {
            const attacker = attackers[attackerIndex];
            gameContainer.removeChild(attacker.element);
            attackers.splice(attackerIndex, 1);
        }
    }
    
    function removeSoldier(id) {
        const soldierIndex = soldiers.findIndex(s => s.id === id);
        if (soldierIndex !== -1) {
            const soldier = soldiers[soldierIndex];
            gameContainer.removeChild(soldier.element);
            soldiers.splice(soldierIndex, 1);
        }
    }
    
    function removeFirefighter(id) {
        const firefighterIndex = firefighters.findIndex(f => f.id === id);
        if (firefighterIndex !== -1) {
            const firefighter = firefighters[firefighterIndex];
            gameContainer.removeChild(firefighter.element);
            firefighters.splice(firefighterIndex, 1);
        }
    }
}); 