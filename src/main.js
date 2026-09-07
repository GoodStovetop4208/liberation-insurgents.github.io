class SaveManager {
    constructor() {
        this.storageKey = 'liberationSave';
        this.directoryHandle = null;
    }

    snapshot(game) {
        if (!game.player || !game.level) return null;
        return {
            version: 1,
            savedAt: new Date().toISOString(),
            player: {
                position: { x: game.player.position.x, y: game.player.position.y, z: game.player.position.z },
                health: game.player.health,
                yaw: game.player.yaw,
                pitch: game.player.pitch,
                ammo: game.player.getWeapon().ammo,
                reserve: game.player.getWeapon().reserve
            },
            objectives: game.level.objectives,
            hostages: game.level.hostages.map(hostage => ({ isRescued: hostage.isRescued })),
            enemies: game.level.enemies.map(enemy => ({ health: enemy.health, isDead: enemy.isDead, state: enemy.state })),
            items: game.level.items.map(item => ({ type: item.type, collected: item.collected }))
        };
    }

    save(game) {
        const data = this.snapshot(game);
        if (!data) return false;
        const serialized = JSON.stringify(data, null, 2);
        localStorage.setItem(this.storageKey, serialized);
        if (this.directoryHandle) this.writeFile(serialized);
        return true;
    }

    async chooseDirectory() {
        if (!window.showDirectoryPicker) throw new Error('Folder access is not supported by this browser.');
        const documents = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const gameFolder = await documents.getDirectoryHandle('Liberation_Insurgents', { create: true });
        this.directoryHandle = await gameFolder.getDirectoryHandle('saves', { create: true });
        const saved = localStorage.getItem(this.storageKey);
        if (saved) await this.writeFile(saved);
    }

    async writeFile(serialized) {
        const file = await this.directoryHandle.getFileHandle('progress.json', { create: true });
        const writable = await file.createWritable();
        await writable.write(serialized);
        await writable.close();
    }

    load() {
        try { return JSON.parse(localStorage.getItem(this.storageKey) || 'null'); } catch (error) { return null; }
    }

    apply(game, data) {
        if (!data || !game.player || !game.level) return;
        const player = data.player;
        game.player.position = new Vec3(player.position.x, player.position.y, player.position.z);
        game.player.health = player.health;
        game.player.yaw = player.yaw;
        game.player.pitch = player.pitch;
        game.player.rotation = Quaternion.fromEuler(player.pitch, player.yaw, 0);
        const weapon = game.player.getWeapon();
        weapon.ammo = player.ammo;
        weapon.reserve = player.reserve;
        game.level.objectives = data.objectives || game.level.objectives;
        data.hostages?.forEach((saved, index) => { if (game.level.hostages[index]) game.level.hostages[index].isRescued = saved.isRescued; });
        data.enemies?.forEach((saved, index) => { if (game.level.enemies[index]) { game.level.enemies[index].health = saved.health; game.level.enemies[index].isDead = saved.isDead; game.level.enemies[index].state = saved.state; } });
        game.player.camera.position = game.player.position.add(new Vec3(0, 0.1, 0));
        game.player.camera.rotation = game.player.rotation;
    }
}

class GameManager {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        
        try {
            this.renderer = new ThreeRenderer(this.canvas);
        } catch (e) {
            console.error('Failed to initialize WebGL:', e);
            alert('WebGL 2.0 is not supported in your browser.');
            return;
        }

        this.input = new InputManager(this.canvas);
        this.ui = new UIManager();
        this.saveManager = new SaveManager();
        this.input.mouseSensitivity = this.ui.settings.sensitivity;
        this.input.keybinds = { ...this.input.keybinds, ...this.ui.settings.keybinds };
        if (this.ui.settings.graphics === 'custom') {
            this.renderer.applyGraphicsSettings(this.ui.settings);
        } else {
            this.renderer.setGraphicsQuality(this.ui.settings.graphics);
        }
        this.menuController = new MenuController(this.ui, this);

        this.player = null;
        this.level = null;
        this.camera = null;

        this.isPaused = false;
        this.isGameRunning = false;

        this.deltaTime = 0;
        this.lastFrameTime = performance.now();

        this.setup();
    }

    setup() {
        this.ui.setState('menu');

        this.input.onEscapePressed = () => this.togglePause();
        this.input.onPauseToggle = () => this.togglePause();

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('beforeunload', () => this.saveBeforeExit());

        this.gameLoop();
    }

    gameLoop() {
        const now = performance.now();
        this.deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.016); // Cap at 60fps
        this.lastFrameTime = now;

        if (!this.isPaused && this.isGameRunning) {
            this.update();
        }

        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (!this.player || !this.level || !this.camera) return;

        // Update player
        this.player.update(this.deltaTime, this.input, this.level);

        // Update level
        this.level.update(this.deltaTime, this.player);

        // Update UI
        this.ui.updateGameUI(this.player, this.player.getWeapon());
        this.ui.updateObjectives(this.level);
        if (Math.floor(performance.now() / 5000) !== this.lastSaveTick) {
            this.lastSaveTick = Math.floor(performance.now() / 5000);
            this.saveManager.save(this);
        }

        // Check win condition
        if (this.level.isComplete()) {
            this.missionComplete();
        }

        // Check lose condition
        if (this.player.isDead) {
            this.missionFailed();
        }
    }

    saveBeforeExit() {
        if (this.player && this.level) this.saveManager.save(this);
    }

    render() {
        if (this.isGameRunning && this.player && this.level) {
            this.renderer.render(this.level, this.player.camera);
        }
    }

    async startMission() {
        this.ui.setState('loading');
        this.setLoadingProgress(0);

        // Initialize level and player at the compound entrance
        this.level = new Level(this.renderer.gl, this.renderer);
        this.player = new Player(new Vec3(0, 1.7, 58));

        this.player.weaponMesh = Mesh.createBox(this.renderer.gl, 0.22, 0.18, 0.9);
        this.player.weaponMesh.baseColor = new Vec3(0.12, 0.12, 0.12);
        this.player.weaponMesh.transform.scale = new Vec3(0.7, 0.7, 1.0);
        this.renderer.addMesh(this.player.weaponMesh);

        this.camera = this.player.camera;
        this.ui.setPlayer(this.player);

        // Set up player damage callback for blood effect
        this.player.onDamage = (amount) => {
            this.ui.showBloodEffect(amount);
        };

        this.setLoadingProgress(0.35);
        await this.ui.simulateLoading(0.8);

        this.isGameRunning = true;
        this.isPaused = false;

        this.ui.setState('game');
    }

    saveProgress() {
        return this.saveManager.save(this);
    }

    async chooseSaveFolder() {
        await this.saveManager.chooseDirectory();
        this.saveManager.save(this);
    }

    async loadProgress() {
        const data = this.saveManager.load();
        if (!data) return false;
        await this.startMission();
        this.saveManager.apply(this, data);
        return true;
    }

    setLoadingProgress(progress) {
        this.ui.setLoadingProgress(progress);
    }

    togglePause() {
        if (!this.isGameRunning) return;

        this.isPaused = !this.isPaused;
        this.ui.setState(this.isPaused ? 'pause' : 'game');
    }

    unpause() {
        this.isPaused = false;
        this.ui.setState('game');
    }

    missionComplete() {
        this.isGameRunning = false;

        const stats = {
            hosagesRescued: this.level.hostages.filter(h => h.isRescued).length,
            enemiesKilled: this.level.enemies.filter(e => e.isDead).length,
            health: this.player.health
        };

        this.ui.showCompleteScreen(stats);
    }

    missionFailed() {
        this.isGameRunning = false;
        this.ui.showDeathScreen();
    }

    restartMission() {
        // Clean up current mission
        this.renderer.clearScene();
        this.player = null;
        this.level = null;

        // Start new mission
        this.startMission();
    }

    returnToMenu() {
        // Clean up
        this.renderer.clearScene();
        this.player = null;
        this.level = null;
        this.isGameRunning = false;
        this.isPaused = false;

        this.ui.setState('menu');
    }

    onWindowResize() {
        if (this.renderer) {
            this.renderer.resize();
        }
    }
}

// Initialize immediately when module loading finishes after DOMContentLoaded.
let gameManager;
const initializeGame = () => {
    gameManager = new GameManager();
    window.gameManager = gameManager;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame, { once: true });
} else {
    initializeGame();
}
