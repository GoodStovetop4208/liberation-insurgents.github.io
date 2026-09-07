class UIManager {
    constructor() {
        this.state = 'menu'; // menu, loading, game, pause, dead, complete
        this.loadingProgress = 0;
        this.loadingStartTime = 0;
        this.damagePulse = 0;
        this.player = null;
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const defaults = {
            volume: 70,
            muted: false,
            sensitivity: 1,
            graphics: 'medium',
            shadows: true,
            fog: true,
            renderScale: 1,
            keybinds: { forward: 'w', backward: 's', left: 'a', right: 'd', jump: ' ', sprint: 'shift', crouch: 'control', interact: 'e', reload: 'r' }
        };
        try {
            const saved = JSON.parse(localStorage.getItem('liberationSettings') || '{}');
            return { ...defaults, ...saved, keybinds: { ...defaults.keybinds, ...(saved.keybinds || {}) } };
        } catch (error) {
            return defaults;
        }
    }

    saveSettings() {
        localStorage.setItem('liberationSettings', JSON.stringify(this.settings));
    }

    setState(newState) {
        this.state = newState;
        this.updateUI();

        if (newState === 'menu' || newState === 'loading' || newState === 'pause' || newState === 'dead' || newState === 'complete' || newState === 'settings') {
            document.body.style.cursor = 'default';
        } else if (newState === 'game') {
            document.body.style.cursor = 'none';
        }
    }

    updateUI() {
        const menuContainer = document.getElementById('menuContainer');
        const loadingScreen = document.getElementById('loadingScreen');
        const gameUI = document.getElementById('gameUI');
        const pauseMenu = document.getElementById('pauseMenu');
        const deathScreen = document.getElementById('deathScreen');
        const missionComplete = document.getElementById('missionComplete');
        const settingsMenu = document.getElementById('settingsMenu');

        // Hide all
        menuContainer.classList.add('hidden');
        loadingScreen.classList.add('hidden');
        gameUI.classList.add('hidden');
        pauseMenu.classList.add('hidden');
        deathScreen.classList.add('hidden');
        missionComplete.classList.add('hidden');
        settingsMenu.classList.add('hidden');

        // Show relevant UI
        switch (this.state) {
            case 'menu':
                menuContainer.classList.remove('hidden');
                break;
            case 'loading':
                loadingScreen.classList.remove('hidden');
                break;
            case 'game':
                // No UI during gameplay - clean screen
                gameUI.classList.add('hidden');
                break;
            case 'pause':
                pauseMenu.classList.remove('hidden');
                break;
            case 'dead':
                deathScreen.classList.remove('hidden');
                break;
            case 'complete':
                missionComplete.classList.remove('hidden');
                break;
            case 'settings':
                settingsMenu.classList.remove('hidden');
                break;
        }
    }

    setLoadingProgress(progress) {
        this.loadingProgress = Math.min(1, progress);
        const loadingBar = document.getElementById('loadingBar');
        const loadingPercent = document.getElementById('loadingPercent');

        if (loadingBar) {
            loadingBar.style.width = (this.loadingProgress * 100) + '%';
        }
        if (loadingPercent) {
            loadingPercent.textContent = Math.round(this.loadingProgress * 100) + '%';
        }
    }

    simulateLoading(duration = 3) {
        return new Promise(resolve => {
            this.loadingStartTime = Date.now();
            const startProgress = this.loadingProgress;

            const tick = () => {
                const elapsed = (Date.now() - this.loadingStartTime) / 1000;
                const progress = startProgress + (elapsed / duration) * (1 - startProgress);

                this.setLoadingProgress(progress);

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };

            tick();
        });
    }

    updateGameUI(player, weapon) {
        const ammoDisplay = document.getElementById('ammoText');

        if (ammoDisplay && weapon) {
            ammoDisplay.textContent = weapon.getAmmoDisplay();
        }

        this.updateBloodOverlay(player);
    }

    updateBloodOverlay(player) {
        const bloodOverlay = document.getElementById('bloodOverlay');
        if (!bloodOverlay || !player) return;

        this.damagePulse = Math.max(0, this.damagePulse - 0.08);

        const healthRatio = Math.max(0, Math.min(1, player.health / player.maxHealth));
        const lowHealthIntensity = (1 - healthRatio) * 0.9;
        const pulseIntensity = this.damagePulse * 0.7;
        const opacity = Math.min(0.95, lowHealthIntensity + pulseIntensity);

        bloodOverlay.style.opacity = opacity.toFixed(3);
        bloodOverlay.classList.toggle('damage', opacity > 0.05);
    }

    showBloodEffect(amount) {
        this.damagePulse = Math.min(1, this.damagePulse + 0.55 + (amount / 25) * 0.4);
        this.updateBloodOverlay(this.player || null);
    }

    setPlayer(player) {
        this.player = player;
        this.updateBloodOverlay(player);
    }

    openSettings() {
        this.syncSettingsControls();
        this.renderKeybinds();
        this.setState('settings');
    }

    syncSettingsControls() {
        const get = id => document.getElementById(id);
        const volume = get('volumeSlider');
        const sensitivity = get('sensitivitySlider');
        const graphics = get('graphicsQuality');
        const shadows = get('shadowsToggle');
        const fog = get('fogToggle');
        const renderScale = get('renderScale');
        if (volume) volume.value = this.settings.volume;
        if (get('volumeValue')) get('volumeValue').textContent = `${this.settings.volume}%`;
        if (get('muteToggle')) get('muteToggle').checked = this.settings.muted;
        if (sensitivity) sensitivity.value = this.settings.sensitivity;
        if (get('sensitivityValue')) get('sensitivityValue').textContent = `${Number(this.settings.sensitivity).toFixed(1)}x`;
        if (graphics) graphics.value = this.settings.graphics;
        if (shadows) shadows.checked = this.settings.shadows;
        if (fog) fog.checked = this.settings.fog;
        if (renderScale) renderScale.value = this.settings.renderScale * 100;
        if (get('renderScaleValue')) get('renderScaleValue').textContent = `${Math.round(this.settings.renderScale * 100)}%`;
        get('customGraphics')?.classList.toggle('hidden', this.settings.graphics !== 'custom');
    }

    renderKeybinds() {
        const list = document.getElementById('keybindList');
        if (!list) return;
        list.innerHTML = '';
        const labels = { forward: 'Move forward', backward: 'Move backward', left: 'Move left', right: 'Move right', jump: 'Jump', sprint: 'Sprint', crouch: 'Crouch', interact: 'Interact', reload: 'Reload' };
        Object.entries(labels).forEach(([action, label]) => {
            const button = document.createElement('button');
            button.className = 'keybind-button';
            button.dataset.action = action;
            button.innerHTML = `<span>${label}</span><strong>${this.formatKey(this.settings.keybinds[action])}</strong>`;
            button.addEventListener('click', () => this.captureKeybind(button, action));
            list.appendChild(button);
        });
    }

    formatKey(key) {
        return key === ' ' ? 'Space' : key.charAt(0).toUpperCase() + key.slice(1);
    }

    captureKeybind(button, action) {
        button.classList.add('waiting');
        button.querySelector('strong').textContent = 'Press a key';
        const handler = event => {
            event.preventDefault();
            this.settings.keybinds[action] = event.key.toLowerCase();
            button.classList.remove('waiting');
            this.saveSettings();
            this.renderKeybinds();
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    }

    updateObjectives(level) {
        const objectivesList = document.getElementById('objectivesList');
        if (!objectivesList) return;

        objectivesList.innerHTML = '';

        level.objectives.forEach(obj => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'objective-item' + (obj.complete ? ' complete' : '');

            let text = obj.text;
            if (obj.rescued !== undefined) {
                text += ` (${obj.rescued}/${obj.target})`;
            }

            itemDiv.textContent = text;
            objectivesList.appendChild(itemDiv);
        });
    }

    showDeathScreen() {
        this.setState('dead');
    }

    showCompleteScreen(stats) {
        const statsText = document.getElementById('completeStats');
        if (statsText) {
            statsText.innerHTML = `
                <strong>Hostages Rescued:</strong> ${stats.hosagesRescued}/3<br>
                <strong>Enemies Eliminated:</strong> ${stats.enemiesKilled}<br>
                <strong>Health Remaining:</strong> ${Math.ceil(stats.health)}/100
            `;
        }
        this.setState('complete');
    }
}

class MenuController {
    constructor(uiManager, gameManager) {
        this.ui = uiManager;
        this.game = gameManager;

        this.setupMenuListeners();
    }

    setupMenuListeners() {
        // Main menu
        document.getElementById('deployBtn')?.addEventListener('click', () => {
            this.game.startMission();
        });

        document.getElementById('loadProgressBtn')?.addEventListener('click', async () => {
            const loaded = await this.game.loadProgress();
            if (!loaded) alert('No saved progress was found on this browser.');
        });

        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.ui.openSettings();
        });

        document.getElementById('quitBtn')?.addEventListener('click', () => {
            window.close();
        });

        // Settings menu
        document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
            this.ui.setState('menu');
        });

        document.getElementById('saveProgressBtn')?.addEventListener('click', () => {
            if (this.game.saveProgress()) {
                this.ui.setState('game');
            }
        });

        document.getElementById('chooseSaveFolderBtn')?.addEventListener('click', async () => {
            try {
                await this.game.chooseSaveFolder();
                document.getElementById('settingsStatus').textContent = 'Saving to Documents/Liberation_Insurgents/saves.';
            } catch (error) {
                document.getElementById('settingsStatus').textContent = error.message;
            }
        });

        document.querySelectorAll('[data-settings-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-settings-tab], [data-settings-panel]').forEach(element => element.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`[data-settings-panel="${tab.dataset.settingsTab}"]`)?.classList.add('active');
            });
        });

        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider?.addEventListener('input', event => {
            this.ui.settings.volume = Number(event.target.value);
            document.getElementById('volumeValue').textContent = `${this.ui.settings.volume}%`;
            this.ui.saveSettings();
        });

        document.getElementById('muteToggle')?.addEventListener('change', event => {
            this.ui.settings.muted = event.target.checked;
            this.ui.saveSettings();
        });

        document.getElementById('sensitivitySlider')?.addEventListener('input', event => {
            this.ui.settings.sensitivity = Number(event.target.value);
            this.game.input.mouseSensitivity = this.ui.settings.sensitivity;
            document.getElementById('sensitivityValue').textContent = `${this.ui.settings.sensitivity.toFixed(1)}x`;
            this.ui.saveSettings();
        });

        const graphicsQuality = document.getElementById('graphicsQuality');
        document.getElementById('recommendGraphicsBtn')?.addEventListener('click', () => {
            const hardware = this.game.renderer.getHardwareInfo();
            const memory = hardware.vram ? ` (${hardware.vram} MB VRAM)` : '';
            document.getElementById('detectedGpuText').textContent = `Your GPU: ${hardware.renderer}${memory}`;
            document.getElementById('graphicsRecommendationPopup').classList.remove('hidden');
        });

        document.querySelectorAll('[data-graphics-goal]').forEach(button => {
            button.addEventListener('click', () => {
                const recommendation = this.game.renderer.recommendGraphics(button.dataset.graphicsGoal);
                this.ui.settings.graphics = recommendation.preset;
                graphicsQuality.value = recommendation.preset;
                document.getElementById('customGraphics').classList.add('hidden');
                const status = document.getElementById('recommendStatus');
                status.textContent = `Recommended ${recommendation.preset.replace('-', ' ')}.`;
                status.classList.remove('hidden');
                document.getElementById('graphicsRecommendationPopup').classList.add('hidden');
                this.ui.saveSettings();
            });
        });

        document.getElementById('closeGraphicsPopupBtn')?.addEventListener('click', () => {
            document.getElementById('graphicsRecommendationPopup').classList.add('hidden');
        });
        graphicsQuality?.addEventListener('change', event => {
            this.ui.settings.graphics = event.target.value;
            document.getElementById('customGraphics').classList.toggle('hidden', event.target.value !== 'custom');
            if (event.target.value !== 'custom') this.game.renderer.setGraphicsQuality(event.target.value);
            this.ui.saveSettings();
        });

        document.getElementById('shadowsToggle')?.addEventListener('change', event => {
            this.ui.settings.shadows = event.target.checked;
            this.applyCustomGraphics();
        });
        document.getElementById('fogToggle')?.addEventListener('change', event => {
            this.ui.settings.fog = event.target.checked;
            this.applyCustomGraphics();
        });
        document.getElementById('renderScale')?.addEventListener('input', event => {
            this.ui.settings.renderScale = Number(event.target.value) / 100;
            document.getElementById('renderScaleValue').textContent = `${event.target.value}%`;
            this.applyCustomGraphics();
        });

        document.getElementById('exportGraphicsBtn')?.addEventListener('click', () => this.exportGraphics());

        // Pause menu
        document.getElementById('resumeBtn')?.addEventListener('click', () => {
            this.game.unpause();
        });

        document.getElementById('mainMenuBtn')?.addEventListener('click', () => {
            this.game.returnToMenu();
        });

        // Death screen
        document.getElementById('restartBtn')?.addEventListener('click', () => {
            this.game.restartMission();
        });

        document.getElementById('menuFromDeathBtn')?.addEventListener('click', () => {
            this.game.returnToMenu();
        });

        // Mission complete
        document.getElementById('nextMissionBtn')?.addEventListener('click', () => {
            this.game.startMission();
        });

        document.getElementById('menuFromCompleteBtn')?.addEventListener('click', () => {
            this.game.returnToMenu();
        });
    }

    applyCustomGraphics() {
        this.ui.settings.graphics = 'custom';
        document.getElementById('graphicsQuality').value = 'custom';
        this.game.renderer.applyGraphicsSettings({
            shadows: this.ui.settings.shadows,
            fog: this.ui.settings.fog,
            renderScale: this.ui.settings.renderScale
        });
        this.ui.saveSettings();
    }

    exportGraphics() {
        const settings = this.ui.settings;
        const cfg = [
            '# Liberation: Insurgents graphics settings',
            `preset=${settings.graphics}`,
            `renderScale=${settings.renderScale}`,
            `shadows=${settings.shadows}`,
            `fog=${settings.fog}`,
            `pixelRatio=${settings.renderScale}`
        ].join('\n');
        const blob = new Blob([cfg], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'liberation-graphics.cfg';
        link.click();
        URL.revokeObjectURL(link.href);
        document.getElementById('settingsStatus').textContent = 'Graphics configuration exported.';
    }
}
