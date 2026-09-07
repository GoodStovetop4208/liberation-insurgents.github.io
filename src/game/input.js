class InputManager {
    constructor(canvas) {
        this.keys = {};
        this.mouseSensitivity = 1;
        this.keybinds = {
            forward: 'w',
            backward: 's',
            left: 'a',
            right: 'd',
            jump: ' ',
            sprint: 'shift',
            crouch: 'control',
            interact: 'e',
            reload: 'r'
        };
        this.mouse = {
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            clicked: false,
            down: false
        };

        this.setupListeners(canvas);
        this.mouseEnabled = true;
    }

    setupListeners(canvas) {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape') this.onEscapePressed?.();
            if (e.key === 'p' || e.key === 'P') this.onPauseToggle?.();
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseEnabled) return;

            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;

            this.mouse.dx += e.movementX;
            this.mouse.dy += e.movementY;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.down = true;
                this.mouse.clicked = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
            }
        });

        canvas.addEventListener('click', () => {
            if (document.pointerLockElement === null) {
                canvas.requestPointerLock?.();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.mouseEnabled = document.pointerLockElement !== null;
            document.body.style.cursor = document.pointerLockElement ? 'none' : 'default';
        });
    }

    getMovementVector() {
        let x = 0, y = 0;
        if (this.isKeyDown('forward') || this.keys['arrowup']) y += 1;
        if (this.isKeyDown('backward') || this.keys['arrowdown']) y -= 1;
        if (this.isKeyDown('left') || this.keys['arrowleft']) x -= 1;
        if (this.isKeyDown('right') || this.keys['arrowright']) x += 1;
        return { x, y };
    }

    isKeyDown(action) {
        return Boolean(this.keys[this.keybinds[action]]);
    }

    isJumping() {
        return this.isKeyDown('jump');
    }

    isSprinting() {
        return this.isKeyDown('sprint');
    }

    isCrouching() {
        return this.isKeyDown('crouch');
    }

    isAiming() {
        return this.keys['alt'] || this.mouse.down;
    }

    isFiring() {
        return this.mouse.clicked;
    }

    consumeFireClick() {
        this.mouse.clicked = false;
    }

    getMouseDelta() {
        const dx = this.mouse.dx;
        const dy = this.mouse.dy;
        this.mouse.dx = 0;
        this.mouse.dy = 0;
        return { dx, dy };
    }

    isInteracting() {
        return this.isKeyDown('interact');
    }

    isReloading() {
        return this.isKeyDown('reload');
    }
}
