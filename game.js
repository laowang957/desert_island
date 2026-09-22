const game = document.getElementById("game-main");
const ctx = game.getContext("2d");
game.tabIndex = 0;
game.style.outline = "none";
game.addEventListener("pointerdown", () => {
    game.focus({
        preventScroll: true
    });
});
const visionCanvas = document.createElement("canvas");
const visionCtx = visionCanvas.getContext("2d");

const spriteAssets = {};
function resolveGameScriptUrl() {
    if (document.currentScript && document.currentScript.src) return document.currentScript.src;
    const scripts = Array.from(document.getElementsByTagName("script"));
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src;
        if (!src) continue;
        try {
            const url = new URL(src, window.location.href);
            if (url.pathname.endsWith("/game.js") || url.pathname.endsWith("\\game.js")) return url.href;
        } catch (_) {}
    }
    for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src) return scripts[i].src;
    }
    return window.location.href;
}
const GAME_SCRIPT_URL = resolveGameScriptUrl();
const ASSET_BASE_URL = new URL("./assets/", GAME_SCRIPT_URL);
console.log("game.js URL:", GAME_SCRIPT_URL);
console.log("资源目录:", ASSET_BASE_URL.href);
function loadSprite(name, src) {
    const image = new Image();
    image.src = new URL(src.replace(/^assets\//, ""), ASSET_BASE_URL).href;
    image.onerror = () => console.error("资源加载失败:", name, image.src);
    spriteAssets[name] = image;
    return image;
}
const assets = {
    pistol: loadSprite("pistol", "assets/pistol.png"),
    rifle: loadSprite("rifle", "assets/rifle.png"),
    shotgun: loadSprite("shotgun", "assets/shotgun.png"),
    katana: loadSprite("katana", "assets/katana.png"),
    chainsaw: loadSprite("chainsaw", "assets/chainsaw.png"),
    bullet: loadSprite("bullet", "assets/bullet.png"),
    medkit: loadSprite("medkit", "assets/medkit.png"),
    key: loadSprite("key", "assets/key.png"),
    gemRed: loadSprite("gemRed", "assets/gem_red.png"),
    gemYellow: loadSprite("gemYellow", "assets/gem_yellow.png"),
    gemBlue: loadSprite("gemBlue", "assets/gem_blue.png"),
    rifleAmmo: loadSprite("rifleAmmo", "assets/rifleAmmo.png"),
    shotgunAmmo: loadSprite("shotgunAmmo", "assets/shotgunAmmo.png"),
    whetstone: loadSprite("whetstone", "assets/whetstone.png"),
    oil: loadSprite("oil", "assets/oil.png")
};
const themeAssets = {
    urban: {
        wall: loadSprite("wall_urban", "assets/wall_urban.png"),
        door: loadSprite("door_urban", "assets/door_urban.png"),
        floor: loadSprite("floor_urban", "assets/floor_urban.png"),
        player: loadSprite("player_urban", "assets/player_urban.png"),
        zombie: loadSprite("zombie_urban", "assets/zombie_urban.png")
    },
    rust: {
        wall: loadSprite("wall_rust", "assets/wall_rust.png"),
        door: loadSprite("door_rust", "assets/door_rust.png"),
        floor: loadSprite("floor_rust", "assets/floor_rust.png"),
        player: loadSprite("player_rust", "assets/player_rust.png"),
        zombie: loadSprite("zombie_rust", "assets/zombie_rust.png")
    },
    lab: {
        wall: loadSprite("wall_lab", "assets/wall_lab.png"),
        door: loadSprite("door_lab", "assets/door_lab.png"),
        floor: loadSprite("floor_lab", "assets/floor_lab.png"),
        player: loadSprite("player_lab", "assets/player_lab.png"),
        zombie: loadSprite("zombie_lab", "assets/zombie_lab.png")
    }
};
const themeNames = Object.keys(themeAssets);
function getCurrentThemeAssets() {
    return themeAssets[maze.theme] || themeAssets.urban;
}

// 高清展示的奥秘😏
function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    game.style.width = width + "px";
    game.style.height = height + "px";
    game.width = width * dpr;
    game.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    visionCanvas.width = width;
    visionCanvas.height = height;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
game.style.cursor = "none";

// 鼠标与准星
const mouse = {
    x: window.innerWidth >> 1,
    y: window.innerHeight >> 1,
    allowNear: false
};
const crosshair = {
    x: window.innerWidth >> 1,
    y: window.innerHeight >> 1,
    size: 10,
    gap: 4,
    lineWidth: 2,
    scale: 1,
    targetScale: 1,
    minDistance: 85,
    maxDistance: 430,
    distance: 430
};
const aim = {
    angle: 0,
    targetAngle: 0,
    turnSpeed: 14,
    deadZone: 24
};

// 玩家
const player = {
    x: 0,
    y: 0,
    angle: 0,
    speed: 220,
    runSpeed: 340,
    moving: false,
    running: false,
    walkTime: 0,
    radius: 14,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    staminaUse: 28,
    staminaRecover: 11,
    keys: 0,
    hurtFlash: 0,
    staminaFlash: 0,
    dash: null,
    gems: {red: false, yellow: false, blue: false},
    exploredRooms: new Set(),
    exploredTiles: new Set(),
    invisibleTime: 0,
    shields: 0,
    maxShields: 2,
    fireSlowTime: 0,
    monsterSlowTime: 0
};

// 武器与子弹
const bullets = [];
const weaponState = {
    current: "pistol",
    owned: new Set(["pistol"]),
    triggerDown: false,
    fireTimer: 0,
    reloadTimer: 0,
    reloading: false,
    rifleBurst: 0,
    rifleReset: 0,
    meleeTimer: 0,
    meleeAnim: null,
    meleeSwingDir: 1,
    chainsawContactTimer: 0,
    chainsawNoiseTimer: 0,
    chainsawRage: false,
    chainsawRageTime: 0,
    chainsawRageAngle: 0,
    secondary: null,
    uiSwap: 0,
    uiFrom: "pistol"
};
const weapons = {
    pistol: {
        name: "手枪",
        type: "gun",
        magSize: 10,
        mag: 10,
        reserve: Infinity,
        reload: 0.85,
        interval: 0.30,
        damage: 12,
        speed: 1050,
        noise: 280
    },
    rifle: {
        name: "步枪",
        type: "gun",
        magSize: 30,
        mag: 0,
        reserve: 0,
        reload: 1.35,
        interval: 0.095,
        damage: 17,
        speed: 1200,
        noise: 440
    },
    shotgun: {
        name: "霰弹枪",
        type: "gun",
        magSize: 8,
        mag: 0,
        reserve: 0,
        reload: 0.58,
        interval: 0.72,
        damage: 13,
        speed: 900,
        noise: 660
    },
    katana: {name: "武士刀", type: "melee", durability: 10, maxDurability: 10, interval: 0.72, damage: 50, noise: 55},
    chainsaw: {name: "电锯", type: "melee", durability: 30, maxDurability: 30, interval: 0.32, damage: 999, noise: 820}
};

// 视野
const vision = {
    angle: Math.PI * 0.32,
    edgeFade: 0.28,
    rays: 96
};

// 地图
const maze = {
    cols: 41,
    rows: 31,
    tileSize: 90,
    grid: [],
    doors: new Map(),
    items: [],
    lamps: [],
    rooms: [],
    roomGrid: [],
    portal: null,
    scene: 1,
    theme: "urban"
};

// 镜头
const camera = {
    x: 0,
    y: 0
};

// 怪物
const monsters = [];
const monsterSpawner = {
    timer: 2.5,
    interval: 4.5,
    max: 30,
    hordeMax: 200,
    minPlayerDistance: 450
};

// 陷阱与画面反馈
const trapEffects = [];
const danger = {
    near: false,
    blocked: false,
    timer: 0.5,
    blackout: 0
};
const thunder = {
    cooldown: random(12, 24),
    active: false,
    elapsed: 0,
    duration: 0,
    flashes: [],
    flashAlpha: 0
};
const feedback = {
    damageAlpha: 0,
    damagePulse: 0,
    shake: 0
};
const notices = [];

function showNotice(text, type = "normal") {
    notices.push({text, type, life: 1.15, maxLife: 1.15, offset: 0});
    if (notices.length > 4) notices.shift();
}

function updateNotices(dt) {
    for (let i = notices.length - 1; i >= 0; i--) {
        notices[i].life -= dt;
        notices[i].offset += dt * 18;
        if (notices[i].life <= 0) notices.splice(i, 1);
    }
}

function drawNotices() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "18px sans-serif";
    for (let i = 0; i < notices.length; i++) {
        const notice = notices[i];
        const alpha = clamp(notice.life / 0.35, 0, 1);
        const y = window.innerHeight * 0.66 - notice.offset - (notices.length - 1 - i) * 24;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(notice.text, window.innerWidth / 2, y);
        ctx.fillStyle = notice.type === "warn" ? "#ff8a8a" : notice.type === "good" ? "#9dff9d" : "white";
        ctx.fillText(notice.text, window.innerWidth / 2, y);
    }
    ctx.restore();
}

// 当前按下的按键
const keys = new Set();
const blockKeys = new Set([
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "shift",
    "e",
    "r",
    "q",
    " ",
    "tab"
]);

const clones = [];
const trapQte = {
    active: false,
    phase: "idle",
    warningTime: 0,
    activeTime: 0,
    needleAngle: 0,
    startAngle: 0,
    travel: 0,
    speed: 0,
    successStart: 0,
    successSize: 0,
    greatStart: 0,
    greatSize: 0,
    door: null
};
function loadBankedCoins() {
    try {
        const value = Number(localStorage.getItem("maze_escape_coins"));
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (_) {
        return 0;
    }
}
function saveBankedCoins(value) {
    try { localStorage.setItem("maze_escape_coins", String(Math.max(0, Math.floor(value)))); } catch (_) {}
}
const sceneState = {
    timer: 480,
    horde: false,
    transitionTime: 0,
    transitionDuration: 0.8,
    dead: false,
    sceneCoins: 0,
    bankedCoins: loadBankedCoins()
};
const monsterExplosionEffects = [];
const deathUi = { button: { x: 0, y: 0, w: 220, h: 54 } };
const cameraFx = {
    flyTime: 0,
    flyDuration: 0.85,
    startOffsetX: 0,
    startOffsetY: 0
};

// 键盘
window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (sceneState.dead) {
        e.preventDefault();
        return;
    }
    if (!blockKeys.has(key)) {
        e.preventDefault();
        return;
    }
    e.preventDefault();
    keys.add(key);
    if (key === "e" && !e.repeat) interact();
    if (key === "r" && !e.repeat) startReload();
    if (key === " " && !e.repeat) useStaminaSkill();
    if (key === "q" && !e.repeat) toggleWeapon();
});
window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (!blockKeys.has(key)) {
        e.preventDefault();
        return;
    }
    e.preventDefault();
    keys.delete(key);
});

// 鼠标
function updateMousePosition(e) {
    const rect = game.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    const screen = getPlayerScreenPosition();
    mouse.allowNear = Math.hypot(mouse.x - screen.x, mouse.y - screen.y) < crosshair.minDistance;
}

game.addEventListener("contextmenu", (e) => e.preventDefault());
game.addEventListener("wheel", (e) => e.preventDefault(), {passive: false});
game.addEventListener("mousemove", updateMousePosition);
game.addEventListener("mousedown", (e) => {
    game.focus({preventScroll: true});
    if (e.button === 2) {
        if (trapQte.active) resolveTrapQte();
        return;
    }
    if (e.button !== 0) return;
    if (sceneState.dead) {
        const rect = game.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const b = deathUi.button;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) restartGame();
        return;
    }
    crosshair.targetScale = 1.3;
    weaponState.triggerDown = true;
    weaponState.fireTimer = 0;
    tryAttack(true);
});
window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        crosshair.targetScale = 1;
        weaponState.triggerDown = false;
    }
});

// 通用
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function random(min, max) {
    return min + Math.random() * (max - min);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

function lerpAngle(current, target, amount) {
    return current + normalizeAngle(target - current) * amount;
}

function getPlayerScreenPosition() {
    return {
        x: player.x - camera.x,
        y: player.y - camera.y
    };
}

function dualStroke(draw, outerWidth = 5, innerWidth = 2) {
    ctx.beginPath();
    draw();
    ctx.strokeStyle = "black";
    ctx.lineWidth = outerWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = "white";
    ctx.lineWidth = innerWidth;
    ctx.stroke();
}

function drawSpriteCentered(image, x, y, width, height, angle = 0, alpha = 1) {
    if (!image || !image.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
    return true;
}

function getWeaponSprite(weaponId) {
    return assets[weaponId] || null;
}

// 生成迷宫
function generateMaze() {
    maze.grid = Array.from({length: maze.rows}, () => Array(maze.cols).fill(1));
    maze.roomGrid = Array.from({length: maze.rows}, () => Array(maze.cols).fill(-1));
    maze.rooms.length = 0;
    maze.doors.clear();
    maze.items.length = 0;
    maze.lamps.length = 0;
    maze.theme = themeNames[Math.floor(Math.random() * themeNames.length)];
    monsters.length = 0;
    bullets.length = 0;
    const stack = [[1, 1]];
    maze.grid[1][1] = 0;
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const x = current[0];
        const y = current[1];
        const directions = shuffle([
            [0, -2],
            [2, 0],
            [0, 2],
            [-2, 0]
        ]);
        let moved = false;
        for (const direction of directions) {
            const nx = x + direction[0];
            const ny = y + direction[1];
            if (nx <= 0 || ny <= 0 || nx >= maze.cols - 1 || ny >= maze.rows - 1) continue;
            if (maze.grid[ny][nx] !== 1) continue;
            maze.grid[y + direction[1] / 2][x + direction[0] / 2] = 0;
            maze.grid[ny][nx] = 0;
            stack.push([nx, ny]);
            moved = true;
            break;
        }
        if (!moved) stack.pop();
    }
    braidMaze();
    addExtraMazeLoops(0.018);
    generateRooms(12);
    repairCorridorConnectivity();
    generatePassageDoors(4);
    const spawn = randomFloorPosition(0);
    player.x = spawn.x;
    player.y = spawn.y;
    player.stamina = player.maxStamina;
    player.keys = 0;
    player.gems = {red: false, yellow: false, blue: false};
    player.exploredRooms = new Set();
    player.exploredTiles = new Set();
    // 分身、护盾等玩家状态跨场景保留；传送门交互本身会解除隐身。
    createRandomItems("key", 10, 250);
    createRandomItems("medkit", 4, 300);
    populateSpecialRooms();
    generateLamps();
    sceneState.timer = 480;
    sceneState.horde = false;
    sceneState.sceneCoins = 0;
    monsterSpawner.interval = 4.5;
    monsterSpawner.max = 30;
    monsterSpawner.timer = 2.5;
}


function getLogicalMazeDegree(col, row) {
    let degree = 0;
    const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    for (const direction of directions) {
        const nx = col + direction[0];
        const ny = row + direction[1];
        if (nx <= 0 || ny <= 0 || nx >= maze.cols - 1 || ny >= maze.rows - 1) continue;
        if (maze.grid[ny][nx] !== 0) continue;
        const wallX = col + direction[0] / 2;
        const wallY = row + direction[1] / 2;
        if (maze.grid[wallY][wallX] === 0) degree++;
    }
    return degree;
}

function getDeadEndEscapeOptions(col, row) {
    const options = [];
    const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    for (const direction of directions) {
        const nx = col + direction[0];
        const ny = row + direction[1];
        if (nx <= 0 || ny <= 0 || nx >= maze.cols - 1 || ny >= maze.rows - 1) continue;
        if (maze.grid[ny][nx] !== 0) continue;
        const wallX = col + direction[0] / 2;
        const wallY = row + direction[1] / 2;
        if (maze.grid[wallY][wallX] === 0) continue;
        options.push({
            wallX,
            wallY,
            targetDegree: getLogicalMazeDegree(nx, ny),
            nx,
            ny
        });
    }
    return options;
}

function measureDeadEndBranchLength(col, row) {
    if (getLogicalMazeDegree(col, row) !== 1) return 0;
    let previousCol = -1;
    let previousRow = -1;
    let currentCol = col;
    let currentRow = row;
    let length = 1;
    for (let step = 0; step < 20; step++) {
        const next = [];
        const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
        for (const direction of directions) {
            const nx = currentCol + direction[0];
            const ny = currentRow + direction[1];
            if (nx <= 0 || ny <= 0 || nx >= maze.cols - 1 || ny >= maze.rows - 1) continue;
            if (nx === previousCol && ny === previousRow) continue;
            if (maze.grid[ny][nx] !== 0) continue;
            const wallX = currentCol + direction[0] / 2;
            const wallY = currentRow + direction[1] / 2;
            if (maze.grid[wallY][wallX] !== 0) continue;
            next.push([nx, ny]);
        }
        if (next.length !== 1) break;
        previousCol = currentCol;
        previousRow = currentRow;
        currentCol = next[0][0];
        currentRow = next[0][1];
        length++;
        if (getLogicalMazeDegree(currentCol, currentRow) !== 2) break;
    }
    return length;
}

function braidMaze() {
    const logicalCells = [];
    for (let row = 1; row < maze.rows - 1; row += 2) {
        for (let col = 1; col < maze.cols - 1; col += 2) {
            if (maze.grid[row][col] === 0) logicalCells.push([col, row]);
        }
    }
    shuffle(logicalCells);
    for (const cell of logicalCells) {
        const col = cell[0];
        const row = cell[1];
        if (getLogicalMazeDegree(col, row) !== 1) continue;
        const branchLength = measureDeadEndBranchLength(col, row);
        let keepChance = 0;
        if (branchLength >= 5) keepChance = 0.38;
        else if (branchLength >= 3) keepChance = 0.16;
        if (Math.random() < keepChance) continue;
        const options = getDeadEndEscapeOptions(col, row);
        if (options.length === 0) continue;
        options.sort((a, b) => a.targetDegree - b.targetDegree || Math.random() - 0.5);
        const preferred = options.filter((option) => option.targetDegree <= 2);
        const pool = preferred.length > 0 ? preferred : options;
        const choice = pool[Math.floor(Math.random() * Math.min(pool.length, 2))];
        maze.grid[choice.wallY][choice.wallX] = 0;
    }
}

function addExtraMazeLoops(chance = 0.018) {
    for (let row = 2; row < maze.rows - 2; row++) {
        for (let col = 2; col < maze.cols - 2; col++) {
            if (maze.grid[row][col] !== 1 || Math.random() > chance) continue;
            const horizontal = maze.grid[row][col - 1] === 0 && maze.grid[row][col + 1] === 0;
            const vertical = maze.grid[row - 1][col] === 0 && maze.grid[row + 1][col] === 0;
            if (!horizontal && !vertical) continue;
            const nearOpen = [
                maze.grid[row - 1][col - 1], maze.grid[row - 1][col + 1],
                maze.grid[row + 1][col - 1], maze.grid[row + 1][col + 1]
            ].filter((tile) => tile === 0).length;
            if (nearOpen >= 3) continue;
            maze.grid[row][col] = 0;
        }
    }
}

function getRoomBoundsFromCells(cells) {
    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    for (const cell of cells) {
        minCol = Math.min(minCol, cell[0]);
        maxCol = Math.max(maxCol, cell[0]);
        minRow = Math.min(minRow, cell[1]);
        maxRow = Math.max(maxRow, cell[1]);
    }
    return {minCol, maxCol, minRow, maxRow};
}

function roomCandidateOverlapsExisting(x0, y0, width, height) {
    const bx0 = x0 - 1;
    const by0 = y0 - 1;
    const bx1 = x0 + width;
    const by1 = y0 + height;
    for (const room of maze.rooms) {
        const bounds = room.bounds || getRoomBoundsFromCells(room.cells);
        const otherBx0 = bounds.minCol - 1;
        const otherBy0 = bounds.minRow - 1;
        const otherBx1 = bounds.maxCol + 1;
        const otherBy1 = bounds.maxRow + 1;
        if (bx1 < otherBx0 || bx0 > otherBx1 || by1 < otherBy0 || by0 > otherBy1) continue;
        return true;
    }
    return false;
}

function findRoomDoorCandidates(x0, y0, width, height) {
    const bx0 = x0 - 1;
    const by0 = y0 - 1;
    const bx1 = x0 + width;
    const by1 = y0 + height;
    const result = [];
    const sides = [];
    for (let col = x0; col < x0 + width; col++) {
        sides.push({doorCol: col, doorRow: by0, dx: 0, dy: -1});
        sides.push({doorCol: col, doorRow: by1, dx: 0, dy: 1});
    }
    for (let row = y0; row < y0 + height; row++) {
        sides.push({doorCol: bx0, doorRow: row, dx: -1, dy: 0});
        sides.push({doorCol: bx1, doorRow: row, dx: 1, dy: 0});
    }
    for (const side of sides) {
        const connector = [];
        for (let distance = 1; distance <= 3; distance++) {
            const col = side.doorCol + side.dx * distance;
            const row = side.doorRow + side.dy * distance;
            if (!isInsideMap(col, row) || col <= 0 || row <= 0 || col >= maze.cols - 1 || row >= maze.rows - 1) break;
            if (maze.roomGrid[row][col] !== -1) break;
            if (maze.doors.has(col + "," + row)) break;
            if (maze.grid[row][col] === 0) {
                result.push({
                    ...side,
                    outsideCol: col,
                    outsideRow: row,
                    connector: [...connector],
                    connectorLength: connector.length
                });
                break;
            }
            if (maze.grid[row][col] === 2) break;
            connector.push([col, row]);
        }
    }
    return result;
}

function evaluateRoomCandidate(x0, y0, width, height) {
    const bx0 = x0 - 1;
    const by0 = y0 - 1;
    const bx1 = x0 + width;
    const by1 = y0 + height;
    if (bx0 <= 1 || by0 <= 1 || bx1 >= maze.cols - 2 || by1 >= maze.rows - 2) return null;
    if (Math.hypot(x0 - 1, y0 - 1) < 7) return null;
    if (roomCandidateOverlapsExisting(x0, y0, width, height)) return null;
    for (let row = by0 - 1; row <= by1 + 1; row++) {
        for (let col = bx0 - 1; col <= bx1 + 1; col++) {
            if (!isInsideMap(col, row)) return null;
            if (maze.roomGrid[row][col] !== -1) return null;
            if (maze.doors.has(col + "," + row)) return null;
        }
    }
    let interiorWalls = 0;
    let perimeterOpen = 0;
    for (let row = y0; row < y0 + height; row++) {
        for (let col = x0; col < x0 + width; col++) {
            if (maze.grid[row][col] === 1) interiorWalls++;
        }
    }
    for (let row = by0; row <= by1; row++) {
        for (let col = bx0; col <= bx1; col++) {
            const perimeter = row === by0 || row === by1 || col === bx0 || col === bx1;
            if (!perimeter) continue;
            if (maze.grid[row][col] === 0) perimeterOpen++;
        }
    }
    const doors = findRoomDoorCandidates(x0, y0, width, height);
    if (doors.length === 0) return null;
    doors.sort((a, b) => a.connectorLength - b.connectorLength || Math.random() - 0.5);
    const bestConnector = doors[0].connectorLength;
    const score = interiorWalls * 0.65 + perimeterOpen * 1.15 + bestConnector * 2.2 + Math.random() * 0.35;
    return {x0, y0, width, height, bx0, by0, bx1, by1, doors, score};
}

function isCorridorNetworkConnected() {
    let start = null;
    let total = 0;
    for (let row = 1; row < maze.rows - 1; row++) {
        for (let col = 1; col < maze.cols - 1; col++) {
            if (maze.grid[row][col] !== 0 || maze.roomGrid[row][col] !== -1) continue;
            total++;
            if (!start) start = [col, row];
        }
    }
    if (!start || total <= 1) return true;
    const visited = Array.from({length: maze.rows}, () => Array(maze.cols).fill(false));
    const queue = [start];
    visited[start[1]][start[0]] = true;
    let head = 0;
    let count = 0;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < queue.length) {
        const current = queue[head++];
        count++;
        for (const direction of directions) {
            const col = current[0] + direction[0];
            const row = current[1] + direction[1];
            if (!isInsideMap(col, row) || visited[row][col]) continue;
            if (maze.grid[row][col] !== 0 || maze.roomGrid[row][col] !== -1) continue;
            visited[row][col] = true;
            queue.push([col, row]);
        }
    }
    return count === total;
}

function stampRoom(candidate, doorCandidate) {
    const gridBackup = maze.grid.map((row) => row.slice());
    const roomGridBackup = maze.roomGrid.map((row) => row.slice());
    const doorsBackup = new Map(maze.doors);
    const roomId = maze.rooms.length;
    const {x0, y0, width, height, bx0, by0, bx1, by1} = candidate;

    // 先强制构造完整外墙。原本这里是路也会补成墙。
    for (let row = by0; row <= by1; row++) {
        for (let col = bx0; col <= bx1; col++) {
            const perimeter = row === by0 || row === by1 || col === bx0 || col === bx1;
            if (perimeter) maze.grid[row][col] = 1;
        }
    }

    // 再强制清空房间内部。原本这里无论有多少迷宫墙，都直接敲掉。
    const cells = [];
    for (let row = y0; row < y0 + height; row++) {
        for (let col = x0; col < x0 + width; col++) {
            maze.grid[row][col] = 0;
            maze.roomGrid[row][col] = roomId;
            cells.push([col, row]);
        }
    }

    // 如果房门和主路之间隔着一两格墙，就顺手凿出短连接道。
    for (const cell of doorCandidate.connector) {
        maze.grid[cell[1]][cell[0]] = 0;
    }

    maze.grid[doorCandidate.doorRow][doorCandidate.doorCol] = 2;
    const roll = Math.random();
    let content = "empty";
    if (roll < 0.18) content = "trap";
    else if (roll < 0.52) content = "monster";
    const door = {
        x: doorCandidate.doorCol,
        y: doorCandidate.doorRow,
        open: false,
        content,
        roomId,
        roomDoor: true,
        triggered: false,
        trapType: ["fire", "arrow", "spike"][Math.floor(Math.random() * 3)]
    };
    maze.doors.set(door.x + "," + door.y, door);
    const room = {
        id: roomId,
        cells,
        door,
        center: getRoomCenter(cells),
        bounds: {
            minCol: x0,
            maxCol: x0 + width - 1,
            minRow: y0,
            maxRow: y0 + height - 1
        }
    };
    maze.rooms.push(room);

    if (!isSealedRoom(room)) {
        maze.grid = gridBackup;
        maze.roomGrid = roomGridBackup;
        maze.doors = doorsBackup;
        maze.rooms.pop();
        return false;
    }
    return true;
}

function getCorridorComponents() {
    const componentGrid = Array.from({length: maze.rows}, () => Array(maze.cols).fill(-1));
    const components = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let row = 1; row < maze.rows - 1; row++) {
        for (let col = 1; col < maze.cols - 1; col++) {
            if (maze.grid[row][col] !== 0 || maze.roomGrid[row][col] !== -1 || componentGrid[row][col] !== -1) continue;
            const id = components.length;
            const cells = [];
            const queue = [[col, row]];
            componentGrid[row][col] = id;
            let head = 0;
            while (head < queue.length) {
                const current = queue[head++];
                cells.push(current);
                for (const direction of directions) {
                    const nx = current[0] + direction[0];
                    const ny = current[1] + direction[1];
                    if (!isInsideMap(nx, ny) || componentGrid[ny][nx] !== -1) continue;
                    if (maze.grid[ny][nx] !== 0 || maze.roomGrid[ny][nx] !== -1) continue;
                    componentGrid[ny][nx] = id;
                    queue.push([nx, ny]);
                }
            }
            components.push(cells);
        }
    }
    return {componentGrid, components};
}

function isProtectedRoomStructureCell(col, row) {
    for (const room of maze.rooms) {
        const bounds = room.bounds || getRoomBoundsFromCells(room.cells);
        const minCol = bounds.minCol - 1;
        const maxCol = bounds.maxCol + 1;
        const minRow = bounds.minRow - 1;
        const maxRow = bounds.maxRow + 1;
        if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) return true;
    }
    return false;
}

function carveConnectionToOtherComponent(componentInfo) {
    const {componentGrid, components} = componentInfo;
    if (components.length <= 1) return false;
    let mainId = 0;
    for (let i = 1; i < components.length; i++) {
        if (components[i].length > components[mainId].length) mainId = i;
    }
    const dist = Array.from({length: maze.rows}, () => Array(maze.cols).fill(Infinity));
    const parent = Array.from({length: maze.rows}, () => Array(maze.cols).fill(null));
    const open = [];
    for (const cell of components[mainId]) {
        dist[cell[1]][cell[0]] = 0;
        open.push({col: cell[0], row: cell[1], cost: 0});
    }
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let target = null;
    while (open.length > 0) {
        open.sort((a, b) => a.cost - b.cost);
        const current = open.shift();
        if (current.cost !== dist[current.row][current.col]) continue;
        const componentId = componentGrid[current.row][current.col];
        if (componentId >= 0 && componentId !== mainId) {
            target = [current.col, current.row];
            break;
        }
        for (const direction of directions) {
            const col = current.col + direction[0];
            const row = current.row + direction[1];
            if (col <= 0 || row <= 0 || col >= maze.cols - 1 || row >= maze.rows - 1) continue;
            if (maze.roomGrid[row][col] !== -1) continue;
            if (maze.grid[row][col] === 2) continue;
            if (maze.grid[row][col] === 1 && isProtectedRoomStructureCell(col, row)) continue;
            const extraCost = maze.grid[row][col] === 1 ? 1 : 0;
            const nextCost = current.cost + extraCost;
            if (nextCost >= dist[row][col]) continue;
            dist[row][col] = nextCost;
            parent[row][col] = [current.col, current.row];
            open.push({col, row, cost: nextCost});
        }
    }
    if (!target) return false;
    let current = target;
    let carved = 0;
    while (current) {
        const col = current[0];
        const row = current[1];
        if (maze.grid[row][col] === 1 && !isProtectedRoomStructureCell(col, row)) {
            maze.grid[row][col] = 0;
            carved++;
        }
        current = parent[row][col];
    }
    return carved > 0;
}

function repairCorridorConnectivity() {
    for (let pass = 0; pass < 20; pass++) {
        const info = getCorridorComponents();
        if (info.components.length <= 1) return true;
        if (!carveConnectionToOtherComponent(info)) return false;
    }
    return getCorridorComponents().components.length <= 1;
}

function generateRooms(targetCount) {
    let rounds = 0;
    while (maze.rooms.length < targetCount && rounds < 36) {
        rounds++;
        const candidates = [];
        const sizes = [[2, 2], [2, 3], [3, 2], [3, 3]];
        for (let row = 3; row < maze.rows - 4; row++) {
            for (let col = 3; col < maze.cols - 4; col++) {
                for (const size of sizes) {
                    const candidate = evaluateRoomCandidate(col, row, size[0], size[1]);
                    if (candidate) candidates.push(candidate);
                }
            }
        }
        if (candidates.length === 0) break;
        candidates.sort((a, b) => a.score - b.score);
        let placed = false;
        const tryCount = Math.min(candidates.length, 90);
        for (let i = 0; i < tryCount && !placed; i++) {
            const candidate = candidates[i];
            const doorPool = candidate.doors.slice(0, Math.min(4, candidate.doors.length));
            for (const doorCandidate of doorPool) {
                if (stampRoom(candidate, doorCandidate)) {
                    placed = true;
                    break;
                }
            }
        }
        if (!placed) break;
    }
    console.log("房间生成:", maze.rooms.length + "/" + targetCount);
}

function tryCreateRoom(x0, y0, width, height) {
    const candidate = evaluateRoomCandidate(x0, y0, width, height);
    if (!candidate) return false;
    for (const doorCandidate of candidate.doors.slice(0, Math.min(4, candidate.doors.length))) {
        if (stampRoom(candidate, doorCandidate)) return true;
    }
    return false;
}

function isSealedRoom(room) {
    if (!room || !room.door || !room.roomId && room.id == null) return false;
    if (!Array.isArray(room.cells) || room.cells.length < 4) return false;
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    const cellSet = new Set();
    for (const cell of room.cells) {
        minCol = Math.min(minCol, cell[0]);
        maxCol = Math.max(maxCol, cell[0]);
        minRow = Math.min(minRow, cell[1]);
        maxRow = Math.max(maxRow, cell[1]);
        cellSet.add(cell[0] + "," + cell[1]);
    }
    const width = maxCol - minCol + 1;
    const height = maxRow - minRow + 1;
    if (width < 2 || width > 3 || height < 2 || height > 3) return false;
    if (room.cells.length !== width * height) return false;
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            if (!cellSet.has(col + "," + row)) return false;
        }
    }
    const door = room.door;
    let doorCount = 0;
    for (let col = minCol - 1; col <= maxCol + 1; col++) {
        for (const row of [minRow - 1, maxRow + 1]) {
            if (col < minCol || col > maxCol) continue;
            if (col === door.x && row === door.y) doorCount++;
            else if (!isSolidTile(col, row)) return false;
        }
    }
    for (let row = minRow; row <= maxRow; row++) {
        for (const col of [minCol - 1, maxCol + 1]) {
            if (row < minRow || row > maxRow) continue;
            if (col === door.x && row === door.y) doorCount++;
            else if (!isSolidTile(col, row)) return false;
        }
    }
    return doorCount === 1;
}

function getRoomCenter(cells) {
    let x = 0;
    let y = 0;
    for (const cell of cells) {
        const point = tileCenter(cell[0], cell[1]);
        x += point.x;
        y += point.y;
    }
    return {
        x: x / cells.length,
        y: y / cells.length
    };
}

function generatePassageDoors(targetCount) {
    const candidates = [];
    for (let row = 1; row < maze.rows - 1; row++) {
        for (let col = 1; col < maze.cols - 1; col++) {
            if (maze.grid[row][col] !== 0 || maze.roomGrid[row][col] !== -1) continue;
            const horizontal = maze.grid[row][col - 1] === 0 && maze.grid[row][col + 1] === 0 && maze.grid[row - 1][col] === 1 && maze.grid[row + 1][col] === 1;
            const vertical = maze.grid[row - 1][col] === 0 && maze.grid[row + 1][col] === 0 && maze.grid[row][col - 1] === 1 && maze.grid[row][col + 1] === 1;
            if ((horizontal || vertical) && Math.hypot(col - 1, row - 1) >= 5) candidates.push([col, row]);
        }
    }
    shuffle(candidates);
    let count = 0;
    for (const candidate of candidates) {
        if (count >= targetCount) break;
        const col = candidate[0];
        const row = candidate[1];
        if (maze.doors.has(col + "," + row)) continue;
        maze.grid[row][col] = 2;
        maze.doors.set(col + "," + row, {
            x: col,
            y: row,
            open: false,
            content: "passage",
            roomId: -1,
            roomDoor: false,
            triggered: false,
            trapType: ""
        });
        count++;
    }
}

// 地图工具
function isInsideMap(col, row) {
    return col >= 0 && row >= 0 && col < maze.cols && row < maze.rows;
}

function isWalkableTile(col, row) {
    return isInsideMap(col, row) && maze.grid[row][col] === 0;
}

function isSolidTile(col, row) {
    if (!isInsideMap(col, row)) return true;
    return maze.grid[row][col] === 1 || maze.grid[row][col] === 2;
}

function worldToTile(x, y) {
    return {
        col: Math.floor(x / maze.tileSize),
        row: Math.floor(y / maze.tileSize)
    };
}

function tileCenter(col, row) {
    return {
        x: (col + 0.5) * maze.tileSize,
        y: (row + 0.5) * maze.tileSize
    };
}

function randomFloorPosition(minDistanceFromPlayer = 0) {
    for (let i = 0; i < 500; i++) {
        const col = 1 + Math.floor(Math.random() * (maze.cols - 2));
        const row = 1 + Math.floor(Math.random() * (maze.rows - 2));
        if (!isWalkableTile(col, row) || maze.roomGrid[row][col] !== -1) continue;
        const point = tileCenter(col, row);
        if (minDistanceFromPlayer > 0 && Math.hypot(point.x - player.x, point.y - player.y) < minDistanceFromPlayer) continue;
        return point;
    }
    return tileCenter(1, 1);
}

function createRandomItems(type, count, minDistanceFromPlayer) {
    for (let i = 0; i < count; i++) {
        const point = randomFloorPosition(minDistanceFromPlayer);
        maze.items.push({
            type,
            x: point.x,
            y: point.y,
            collected: false
        });
    }
}

function generateLamps() {
    const used = [];
    for (let row = 1; row < maze.rows - 1; row++) {
        for (let col = 1; col < maze.cols - 1; col++) {
            if (!isWalkableTile(col, row) || maze.roomGrid[row][col] !== -1) continue;
            const horizontal = isWalkableTile(col - 1, row) && isWalkableTile(col + 1, row);
            const vertical = isWalkableTile(col, row - 1) && isWalkableTile(col, row + 1);
            if (!horizontal && !vertical) continue;
            if (Math.random() > 0.05) continue;
            const point = tileCenter(col, row);
            let okay = true;
            for (const lamp of used) {
                if (Math.hypot(point.x - lamp.x, point.y - lamp.y) < maze.tileSize * 3.2) {
                    okay = false;
                    break;
                }
            }
            if (!okay) continue;
            const lamp = {
                x: point.x,
                y: point.y,
                radius: random(95, 130)
            };
            used.push(lamp);
            maze.lamps.push(lamp);
        }
    }
}

function getRoomRandomPoint(room, margin = 18) {
    const cell = room.cells[Math.floor(Math.random() * room.cells.length)];
    const base = tileCenter(cell[0], cell[1]);
    return {
        x: base.x + random(-maze.tileSize / 2 + margin, maze.tileSize / 2 - margin),
        y: base.y + random(-maze.tileSize / 2 + margin, maze.tileSize / 2 - margin)
    };
}

function addRoomItem(room, type, extra = {}) {
    const point = getRoomRandomPoint(room);
    maze.items.push({type, x: point.x, y: point.y, collected: false, roomId: room.id, ...extra});
}

function placeRoomItem(room, type, extra = {}) {
    const point = getRoomRandomPoint(room);
    maze.items.push({type, x: point.x, y: point.y, collected: false, roomId: room.id, life: 0, ...extra});
    room.primaryLoot = type;
}

function chooseFarRooms(count, candidates) {
    const selected = [];
    const shuffled = shuffle([...candidates]);
    for (const room of shuffled) {
        let ok = true;
        for (const chosen of selected) {
            if (Math.hypot(room.center.x - chosen.center.x, room.center.y - chosen.center.y) < maze.tileSize * 7) {
                ok = false;
                break;
            }
        }
        if (ok) selected.push(room);
        if (selected.length >= count) break;
    }
    while (selected.length < count) {
        const room = shuffled.find((r) => !selected.includes(r));
        if (!room) break;
        selected.push(room);
    }
    return selected;
}

function populateSpecialRooms() {
    for (const room of maze.rooms) {
        room.primaryLoot = null;
        room.isRepairRoom = false;
        room.isGemRoom = false;
    }
    const eligible = maze.rooms.filter((room) => room.door.content !== "trap");
    const gemRooms = chooseFarRooms(3, eligible);
    const colors = ["red", "yellow", "blue"];
    gemRooms.forEach((room, i) => {
        room.isGemRoom = true;
        placeRoomItem(room, "gem", {gemColor: colors[i]});
    });
    const portalRoom = eligible.find((room) => !gemRooms.includes(room)) || maze.rooms[maze.rooms.length - 1];
    maze.portal = {
        x: portalRoom.center.x,
        y: portalRoom.center.y,
        roomId: portalRoom.id,
        active: false,
        visibleOnRadar: false,
        inserted: {red: false, yellow: false, blue: false}
    };
    let remaining = eligible.filter((room) => !gemRooms.includes(room) && room !== portalRoom);
    const pool = [];
    if (Math.random() < 0.45) pool.push("rifle");
    if (Math.random() < 0.40) pool.push("shotgun");
    if (Math.random() < 0.33) pool.push("katana");
    if (Math.random() < 0.26) pool.push("chainsaw");
    if (Math.random() < 0.68) pool.push("rifleAmmo");
    if (Math.random() < 0.58) pool.push("shotgunAmmo");
    if (Math.random() < 0.34) pool.push(Math.random() < 0.58 ? "rifleAmmo" : "shotgunAmmo");
    shuffle(pool);
    const spawnedMelee = [];
    for (const type of pool) {
        const room = remaining.shift();
        if (!room) break;
        if (type === "rifle" || type === "shotgun") placeRoomItem(room, type, {weaponMag: weapons[type].magSize});
        else placeRoomItem(room, type);
        if (type === "katana" || type === "chainsaw") spawnedMelee.push(type);
    }
    let repairTargets = [];
    if (spawnedMelee.includes("katana")) repairTargets.push("whetstone");
    if (spawnedMelee.includes("chainsaw")) repairTargets.push("oil");
    while (repairTargets.length < 2 && repairTargets.length > 0 && Math.random() < 0.45) repairTargets.push(repairTargets[0]);
    repairTargets = repairTargets.slice(0, 2);
    for (const type of repairTargets) {
        const room = remaining.shift();
        if (!room) break;
        room.isRepairRoom = true;
        placeRoomItem(room, type, {uses: 0, cooldown: 0});
    }
    for (const room of maze.rooms) {
        if (!room.isRepairRoom && Math.random() < 0.30) addRoomItem(room, "medkit");
        if (Math.random() < 0.44) addRoomItem(room, "coin", {amount: 1 + Math.floor(Math.random() * 10)});
        if (room.door.content === "trap" && Math.random() < 0.48) {
            const trapLoot = Math.random() < 0.58 ? "rifleAmmo" : Math.random() < 0.82 ? "shotgunAmmo" : "key";
            addRoomItem(room, trapLoot);
        }
    }
}

function circleRectCollision(x, y, radius, rx, ry, rw, rh) {
    const closestX = clamp(x, rx, rx + rw);
    const closestY = clamp(y, ry, ry + rh);
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
}

function canCircleMoveTo(x, y, radius) {
    const size = maze.tileSize;
    const startX = Math.floor((x - radius) / size);
    const endX = Math.floor((x + radius) / size);
    const startY = Math.floor((y - radius) / size);
    const endY = Math.floor((y + radius) / size);
    for (let row = startY; row <= endY; row++) {
        for (let col = startX; col <= endX; col++) {
            if (!isSolidTile(col, row)) continue;
            if (circleRectCollision(x, y, radius, col * size, row * size, size, size)) return false;
        }
    }
    return true;
}

function moveCircle(entity, dx, dy, radius) {
    const targetX = entity.x + dx;
    if (canCircleMoveTo(targetX, entity.y, radius)) entity.x = targetX;
    const targetY = entity.y + dy;
    if (canCircleMoveTo(entity.x, targetY, radius)) entity.y = targetY;
}

function hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return true;
    const steps = Math.ceil(distance / 12);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const tile = worldToTile(x1 + dx * t, y1 + dy * t);
        if (isSolidTile(tile.col, tile.row)) return false;
    }
    return true;
}

// 镜头与瞄准
function updateCamera() {
    const mapWidth = maze.cols * maze.tileSize;
    const mapHeight = maze.rows * maze.tileSize;
    let baseX = clamp(player.x - window.innerWidth / 2, 0, Math.max(0, mapWidth - window.innerWidth));
    let baseY = clamp(player.y - window.innerHeight / 2, 0, Math.max(0, mapHeight - window.innerHeight));
    if (cameraFx.flyTime > 0) {
        const t = 1 - cameraFx.flyTime / cameraFx.flyDuration;
        const ease = 1 - Math.pow(1 - t, 3);
        baseX += cameraFx.startOffsetX * (1 - ease);
        baseY += cameraFx.startOffsetY * (1 - ease);
        cameraFx.flyTime = Math.max(0, cameraFx.flyTime - 1 / 60);
    }
    camera.x = baseX;
    camera.y = baseY;
}

function updateAim(dt) {
    const screen = getPlayerScreenPosition();
    const dx = mouse.x - screen.x;
    const dy = mouse.y - screen.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= aim.deadZone) aim.targetAngle = Math.atan2(dy, dx);
    const turnAmount = 1 - Math.exp(-aim.turnSpeed * dt);
    aim.angle = lerpAngle(aim.angle, aim.targetAngle, turnAmount);
    let targetDistance = Math.min(distance, crosshair.maxDistance);
    if (!mouse.allowNear && targetDistance < crosshair.minDistance) targetDistance = crosshair.minDistance;
    const distanceAmount = 1 - Math.exp(-20 * dt);
    crosshair.distance += (targetDistance - crosshair.distance) * distanceAmount;
    crosshair.x = screen.x + Math.cos(aim.angle) * crosshair.distance;
    crosshair.y = screen.y + Math.sin(aim.angle) * crosshair.distance;
    crosshair.x = clamp(crosshair.x, 0, window.innerWidth);
    crosshair.y = clamp(crosshair.y, 0, window.innerHeight);
}

// 玩家状态
function getHealthRatio() {
    return clamp(player.health / player.maxHealth, 0, 1);
}

function getMoveSpeedMultiplier() {
    return 0.65 + getHealthRatio() * 0.35;
}

function getStaminaUseMultiplier() {
    return 1 + (1 - getHealthRatio()) * 0.9;
}

function getStaminaRecoverMultiplier() {
    return 0.45 + getHealthRatio() * 0.55;
}

function getVisionRange() {
    let range = player.health < 20 ? crosshair.maxDistance * 0.64 : crosshair.maxDistance;
    if (clones.length === 1) range += 55;
    if (clones.length >= 2) range += 90;
    return range;
}

function getVisionAngle() {
    let angle = player.health < 20 ? vision.angle * 0.78 : vision.angle;
    if (clones.length === 1) angle *= 1.08;
    if (clones.length >= 2) angle *= 1.16;
    return angle;
}

function damagePlayer(amount, source = "") {
    if (amount <= 0) return;
    if (player.shields > 0) {
        player.shields--;
        feedback.damageAlpha = Math.max(feedback.damageAlpha, 0.25);
        feedback.damagePulse = 1;
        feedback.shake = Math.max(feedback.shake, 0.35);
        showNotice("护盾抵挡伤害", "good");
        return;
    }
    player.health = Math.max(0, player.health - amount);
    player.hurtFlash = 1;
    feedback.damageAlpha = 1;
    feedback.damagePulse = 1;
    feedback.shake = 1;
    if (source === "monster") {
        danger.blocked = true;
        danger.blackout = 0;
    }
    if (player.health <= 0) killPlayer();
}

function killPlayer() {
    if (sceneState.dead) return;
    sceneState.sceneCoins = 0;
    sceneState.dead = true;
    weaponState.triggerDown = false;
    weaponState.reloading = false;
    weaponState.chainsawRage = false;
    player.dash = null;
    trapQte.active = false;
    trapQte.phase = "idle";
    keys.clear();
    game.style.cursor = "default";
}

function respawnPlayer() {
    let point = randomFloorPosition(0);
    for (let i = 0; i < 100; i++) {
        const candidate = randomFloorPosition(0);
        let safe = true;
        for (const monster of monsters) {
            if (Math.hypot(candidate.x - monster.x, candidate.y - monster.y) < 450) {
                safe = false;
                break;
            }
        }
        if (safe) {
            point = candidate;
            break;
        }
    }
    player.x = point.x;
    player.y = point.y;
    player.health = player.maxHealth;
    player.stamina = player.maxStamina;
    player.hurtFlash = 0;
    weaponState.triggerDown = false;
    weaponState.reloading = false;
    weaponState.chainsawRage = false;
    player.dash = null;
    danger.blocked = false;
    danger.blackout = 0;
    updateCamera();
    const screen = getPlayerScreenPosition();
    mouse.x = clamp(screen.x + crosshair.maxDistance, 0, window.innerWidth);
    mouse.y = screen.y;
    aim.angle = 0;
    aim.targetAngle = 0;
    crosshair.distance = crosshair.maxDistance;
    startCameraFlyIn();
}

function movePlayerWithWallAssist(dx, dy) {
    const totalDistance = Math.hypot(dx, dy);
    if (totalDistance === 0) return {x: 0, y: 0};
    const steps = Math.max(1, Math.ceil(totalDistance / 5));
    const stepX = dx / steps;
    const stepY = dy / steps;
    let movedX = 0;
    let movedY = 0;
    for (let i = 0; i < steps; i++) {
        if (canCircleMoveTo(player.x + stepX, player.y + stepY, player.radius)) {
            player.x += stepX;
            player.y += stepY;
            movedX += stepX;
            movedY += stepY;
            continue;
        }
        const stepDistance = Math.hypot(stepX, stepY);
        const diagonal = Math.min(Math.abs(stepX), Math.abs(stepY)) / Math.max(0.001, stepDistance) > 0.08;
        if (!diagonal) continue;
        const canX = canCircleMoveTo(player.x + stepX, player.y, player.radius);
        const canY = canCircleMoveTo(player.x, player.y + stepY, player.radius);
        if (canX && !canY) {
            const slide = Math.sign(stepX) * stepDistance;
            if (canCircleMoveTo(player.x + slide, player.y, player.radius)) {
                player.x += slide;
                movedX += slide;
            } else {
                player.x += stepX;
                movedX += stepX;
            }
            continue;
        }
        if (canY && !canX) {
            const slide = Math.sign(stepY) * stepDistance;
            if (canCircleMoveTo(player.x, player.y + slide, player.radius)) {
                player.y += slide;
                movedY += slide;
            } else {
                player.y += stepY;
                movedY += stepY;
            }
            continue;
        }
        const desiredAngle = Math.atan2(stepY, stepX);
        const offsets = [12, -12, 24, -24, 36, -36, 48, -48];
        for (const offset of offsets) {
            const angle = desiredAngle + offset * Math.PI / 180;
            const sx = Math.cos(angle) * stepDistance;
            const sy = Math.sin(angle) * stepDistance;
            if (!canCircleMoveTo(player.x + sx, player.y + sy, player.radius)) continue;
            player.x += sx;
            player.y += sy;
            movedX += sx;
            movedY += sy;
            break;
        }
    }
    return {x: movedX, y: movedY};
}

function getWeaponSpeedMultiplier() {
    if (weaponState.current === "katana") return 1.13;
    if (weaponState.current === "chainsaw") return 0.76;
    if (weaponState.current === "shotgun") return 0.92;
    if (weaponState.current === "rifle") return 0.96;
    return 1;
}

function updateSceneTimer(dt) {
    if (!sceneState.horde) {
        sceneState.timer = Math.max(0, sceneState.timer - dt);
        if (sceneState.timer <= 0) {
            sceneState.horde = true;
            thunder.flashAlpha = 1;
            thunder.active = false;
            monsterSpawner.interval = 0.55;
            monsterSpawner.max = monsterSpawner.hordeMax;
            monsterSpawner.timer = 0.2;
            for (const monster of monsters) makeMonsterFrenzy(monster, true);
        }
    }
    updateClones(dt);
}

function breakStealth(show = true) {
    if (!(player.invisibleTime > 0)) return;
    player.invisibleTime = 0;
    if (show) showNotice("隐身解除", "warn");
}

function useStealthPotion() {
    player.invisibleTime = Infinity;
    for (const monster of monsters) {
        if (monster.chaseTarget === "player" || monster.state === "chase") {
            monster.state = "patrol";
            monster.chaseTarget = null;
            monster.path = [];
            monster.pathIndex = 0;
            monster.wait = random(0.4, 1.5);
        }
    }
}

function teleportPlayerToCorridor() {
    const p = randomFloorPosition(0);
    player.x = p.x;
    player.y = p.y;
}

function summonClone() {
    if (clones.length >= 2) return false;
    const maxHealth = Math.max(1, player.maxHealth * 0.30);
    clones.push({
        x: player.x,
        y: player.y,
        health: maxHealth,
        maxHealth,
        fireTimer: 0,
        slot: clones.length,
        angle: aim.angle
    });
    return true;
}

function damageClone(clone, amount) {
    if (!clone || !clones.includes(clone)) return;
    clone.health = Math.max(0, clone.health - amount);
    if (clone.health <= 0) {
        const index = clones.indexOf(clone);
        if (index >= 0) clones.splice(index, 1);
        showNotice("分身被击破", "warn");
        for (const monster of monsters) {
            if (monster.chaseTarget === clone) monster.chaseTarget = null;
        }
    }
}

function updateClones(dt) {
    for (let i = clones.length - 1; i >= 0; i--) {
        const clone = clones[i];
        if (clone.health <= 0) {
            clones.splice(i, 1);
            continue;
        }
        const targetX = player.x + Math.cos(timeNow * 0.002 + i * Math.PI) * 38;
        const targetY = player.y + Math.sin(timeNow * 0.002 + i * Math.PI) * 30;
        clone.x += (targetX - clone.x) * Math.min(1, dt * 8);
        clone.y += (targetY - clone.y) * Math.min(1, dt * 8);
        const target = monsters.find((m) => Math.hypot(m.x - clone.x, m.y - clone.y) < 380 && hasLineOfSight(clone.x, clone.y, m.x, m.y));
        clone.fireTimer -= dt;
        if (target) {
            clone.angle = Math.atan2(target.y - clone.y, target.x - clone.x);
            if (clone.fireTimer <= 0) {
                bullets.push({
                    x: clone.x + Math.cos(clone.angle) * 26,
                    y: clone.y + Math.sin(clone.angle) * 26,
                    vx: Math.cos(clone.angle) * weapons.pistol.speed,
                    vy: Math.sin(clone.angle) * weapons.pistol.speed,
                    damage: 8,
                    kind: "pistol",
                    distance: 0,
                    maxRange: 700,
                    fromClone: true
                });
                clone.fireTimer = 0.42;
            }
        } else {
            clone.angle = aim.angle;
        }
    }
}

function updatePlayer(dt) {
    if (player.dash) {
        updateDash(dt);
        if (player.hurtFlash > 0) player.hurtFlash = Math.max(0, player.hurtFlash - dt * 2.7);
        updateFeedback(dt);
        return;
    }
    if (weaponState.chainsawRage) {
        updateChainsawRage(dt);
        if (player.hurtFlash > 0) player.hurtFlash = Math.max(0, player.hurtFlash - dt * 2.7);
        updateFeedback(dt);
        return;
    }
    let moveX = 0;
    let moveY = 0;
    if (keys.has("w") || keys.has("arrowup")) moveY -= 1;
    if (keys.has("s") || keys.has("arrowdown")) moveY += 1;
    if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
    if (keys.has("d") || keys.has("arrowright")) moveX += 1;
    player.moving = moveX !== 0 || moveY !== 0;
    player.running = player.moving && keys.has("shift") && player.stamina > 0;
    if (player.moving) {
        const length = Math.hypot(moveX, moveY);
        moveX /= length;
        moveY /= length;
        const baseSpeed = player.running ? player.runSpeed : player.speed;
        const fireSlow = player.fireSlowTime > 0 ? 0.38 : 1;
        const monsterSlow = player.monsterSlowTime > 0 ? 0.55 : 1;
        const hordeMove = sceneState.horde ? 1.30 : 1;
        const speed = baseSpeed * getMoveSpeedMultiplier() * getWeaponSpeedMultiplier() * fireSlow * monsterSlow * hordeMove;
        const moved = movePlayerWithWallAssist(moveX * speed * dt, moveY * speed * dt);
        if (moved.x !== 0 || moved.y !== 0) {
            const moveAngle = Math.atan2(moved.y, moved.x);
            player.angle = lerpAngle(player.angle, moveAngle, 1 - Math.exp(-16 * dt));
        }
        player.walkTime += dt * (player.running ? 18 : 12);
    }
    if (player.running) {
        player.stamina -= player.staminaUse * getStaminaUseMultiplier() * dt;
        player.stamina = Math.max(0, player.stamina);
    } else if (!weaponState.triggerDown) {
        const idleRecover = player.moving ? 1 : 1.45;
        const hordeRecover = sceneState.horde ? 1.5 : 1;
        player.stamina += player.staminaRecover * getStaminaRecoverMultiplier() * idleRecover * hordeRecover * dt;
        player.stamina = Math.min(player.maxStamina, player.stamina);
    }
    player.fireSlowTime = Math.max(0, player.fireSlowTime - dt);
    player.monsterSlowTime = Math.max(0, player.monsterSlowTime - dt);
    if (player.hurtFlash > 0) player.hurtFlash = Math.max(0, player.hurtFlash - dt * 2.7);
    updateFeedback(dt);
}

function updateFeedback(dt) {
    player.staminaFlash = Math.max(0, player.staminaFlash - dt * 3.4);
    feedback.damageAlpha = Math.max(0, feedback.damageAlpha - dt * 2.2);
    feedback.damagePulse = Math.max(0, feedback.damagePulse - dt * 1.7);
    feedback.shake = Math.max(0, feedback.shake - dt * 3.3);
}

function useStaminaSkill() {
    if (player.stamina < player.maxStamina - 0.01) {
        player.staminaFlash = 1;
        showNotice("体力未满，无法释放技能", "warn");
        return;
    }
    breakStealth();
    const skillAngle = aim.angle;
    player.angle = skillAngle;
    if (weaponState.current === "chainsaw") {
        weaponState.chainsawRage = true;
        weaponState.chainsawRageTime = 10;
        weaponState.chainsawRageAngle = skillAngle;
        emitNoise(weapons.chainsaw.noise);
        return;
    }
    player.stamina = 0;
    const noPhase = weaponState.current === "katana";
    player.dash = {
        angle: skillAngle,
        remaining: maze.tileSize + 46,
        speed: 820,
        phaseWall: !noPhase,
        katana: noPhase,
        hit: new Set(),
        killed: 0,
        lastSafeX: player.x,
        lastSafeY: player.y,
        refunded: false,
        moved: 0
    };
}

function isInsideClosedRoomPoint(x, y) {
    const tile = worldToTile(x, y);
    const roomId = isInsideMap(tile.col, tile.row) ? maze.roomGrid[tile.row][tile.col] : -1;
    if (roomId < 0) return false;
    const room = maze.rooms[roomId];
    return !!(room && isSealedRoom(room) && room.door && !room.door.open);
}

function updateDash(dt) {
    const dash = player.dash;
    if (!dash) return;
    const step = Math.min(dash.remaining, dash.speed * dt);
    const dx = Math.cos(dash.angle) * step;
    const dy = Math.sin(dash.angle) * step;
    dash.trail = dash.trail || [];
    dash.trail.push({x: player.x, y: player.y, life: 0.18});
    if (dash.trail.length > 8) dash.trail.shift();
    if (dash.phaseWall) {
        if (canCircleMoveTo(player.x, player.y, player.radius)) {
            dash.lastSafeX = player.x;
            dash.lastSafeY = player.y;
        }
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (isInsideClosedRoomPoint(nx, ny)) {
            finishDash();
            return;
        }
        player.x = nx;
        player.y = ny;
        const mapWidth = maze.cols * maze.tileSize;
        const mapHeight = maze.rows * maze.tileSize;
        player.x = clamp(player.x, player.radius, mapWidth - player.radius);
        player.y = clamp(player.y, player.radius, mapHeight - player.radius);
    } else {
        if (!canCircleMoveTo(player.x + dx, player.y + dy, player.radius) || isInsideClosedRoomPoint(player.x + dx, player.y + dy)) {
            finishDash();
            return;
        }
        player.x += dx;
        player.y += dy;
    }
    if (dash.katana) hitMonstersAlongKatanaDash(dash);
    dash.moved += step;
    dash.remaining -= step;
    if (dash.remaining <= 0) finishDash();
}

function finishDash() {
    if (!player.dash) return;
    const dash = player.dash;
    let refund = false;
    if (dash.phaseWall && !canCircleMoveTo(player.x, player.y, player.radius)) {
        let landed = false;
        const tolerance = 34;
        for (let d = 0; d <= maze.tileSize + 46 + tolerance; d += 4) {
            const offsets = d === 0 ? [0] : [d, -d];
            for (const offset of offsets) {
                const nx = player.x + Math.cos(dash.angle) * offset;
                const ny = player.y + Math.sin(dash.angle) * offset;
                if (isInsideClosedRoomPoint(nx, ny)) continue;
                if (!canCircleMoveTo(nx, ny, player.radius)) continue;
                player.x = nx;
                player.y = ny;
                landed = true;
                break;
            }
            if (landed) break;
        }
        if (!landed) {
            player.x = dash.lastSafeX;
            player.y = dash.lastSafeY;
            refund = !dash.katana;
        }
    }
    if (dash.phaseWall && !dash.katana && isInsideClosedRoomPoint(player.x, player.y)) {
        player.x = dash.lastSafeX;
        player.y = dash.lastSafeY;
        refund = true;
    }
    if (dash.phaseWall && !dash.katana && dash.moved < maze.tileSize * 0.32) refund = true;
    if (refund && !dash.katana) {
        player.stamina = player.maxStamina;
        showNotice("冲刺失败，体力已返还", "warn");
    }
    if (dash.katana && dash.killed > 0 && weapons.katana.durability > 0) {
        const cost = sceneState.horde ? 0.5 : 1;
        weapons.katana.durability = Math.max(0, weapons.katana.durability - cost);
    }
    player.dash = null;
}

function hitMonstersAlongKatanaDash(dash) {
    for (const monster of [...monsters]) {
        if (dash.hit.has(monster)) continue;
        if (Math.hypot(monster.x - player.x, monster.y - player.y) > 30) continue;
        dash.hit.add(monster);
        if (weapons.katana.durability > 0) {
            killMonster(monster);
            dash.killed++;
        } else knockbackMonster(monster, dash.angle, 34);
    }
}

function updateChainsawRage(dt) {
    const angle = weaponState.chainsawRageAngle;
    const speed = 510 * getMoveSpeedMultiplier();
    const step = speed * dt;
    const nx = player.x + Math.cos(angle) * step;
    const ny = player.y + Math.sin(angle) * step;
    if (!canCircleMoveTo(nx, ny, player.radius)) {
        stopChainsawRage();
        return;
    }
    player.x = nx;
    player.y = ny;
    player.angle = angle;
    player.moving = true;
    player.running = true;
    player.walkTime += dt * 23;
    player.stamina = Math.max(0, player.stamina - 10 * dt);
    weaponState.chainsawRageTime -= dt;
    chainsawHit(true);
    emitNoise(weapons.chainsaw.noise);
    if (weaponState.chainsawRageTime <= 0 || player.stamina <= 0) stopChainsawRage();
}

function stopChainsawRage() {
    weaponState.chainsawRage = false;
    weaponState.chainsawRageTime = 0;
}

// 交互
// 交互
function getNearestInteractable() {
    let result = null;
    let bestDistance = Infinity;
    for (const door of maze.doors.values()) {
        if (door.open) continue;
        const point = tileCenter(door.x, door.y);
        const distance = Math.hypot(point.x - player.x, point.y - player.y);
        if (distance <= 75 && distance < bestDistance) {
            result = {type: "door", target: door, distance};
            bestDistance = distance;
        }
    }
    for (const item of maze.items) {
        if (item.collected || (item.type !== "whetstone" && item.type !== "oil")) continue;
        const distance = Math.hypot(item.x - player.x, item.y - player.y);
        if (distance <= 68 && distance < bestDistance) {
            result = {type: "item", target: item, distance};
            bestDistance = distance;
        }
    }
    if (maze.portal) {
        const distance = Math.hypot(maze.portal.x - player.x, maze.portal.y - player.y);
        if (distance <= 72 && distance < bestDistance) result = {type: "portal", target: maze.portal, distance};
    }
    return result;
}

function interact() {
    const target = getNearestInteractable();
    if (!target) return;
    if (target.type === "door") {
        openDoor(target.target);
        return;
    }
    if (target.type === "portal") {
        interactPortal();
        return;
    }
    interactItem(target.target);
}

function interactItem(item) {
    if (item.type === "medkit") {
        if (player.health >= player.maxHealth) return;
        player.health = Math.min(player.maxHealth, player.health + 10);
        item.collected = true;
        showNotice("使用医疗包 +10", "good");
        return;
    }
    if (item.type === "smallMed") {
        player.health = Math.min(player.maxHealth, player.health + 3);
        item.collected = true;
        showNotice("恢复生命 +3", "good");
        return;
    }
    if (item.type === "staminaDrop") {
        player.stamina = Math.min(player.maxStamina, player.stamina + 1);
        item.collected = true;
        showNotice("恢复体力 +1", "good");
        return;
    }
    if (item.type === "warpPotion") {
        teleportPlayerToCorridor();
        item.collected = true;
        showNotice("随机传送", "good");
        return;
    }
    if (item.type === "gem") {
        player.gems[item.gemColor] = true;
        item.collected = true;
        if (maze.portal) maze.portal.visibleOnRadar = true;
        showNotice("获得" + ({red: "红", yellow: "黄", blue: "蓝"}[item.gemColor]) + "色宝石", "good");
        return;
    }
    if (["rifle", "shotgun", "katana", "chainsaw"].includes(item.type)) {
        equipSecondaryFromItem(item);
        return;
    }
    if (item.type === "rifleAmmo") {
        weapons.rifle.reserve += 30;
        item.collected = true;
        showNotice("步枪备弹 +30", "good");
        return;
    }
    if (item.type === "shotgunAmmo") {
        weapons.shotgun.reserve += 8;
        item.collected = true;
        showNotice("霰弹枪备弹 +8", "good");
        return;
    }
    if (item.type === "whetstone") {
        useRepairStation(item, "katana");
        return;
    }
    if (item.type === "oil") useRepairStation(item, "chainsaw");
}

function useRepairStation(item, weaponId) {
    if (!weaponState.owned.has(weaponId) || item.cooldown > 0 || item.uses >= 3) return;
    const weapon = weapons[weaponId];
    if (weapon.durability >= weapon.maxDurability) return;
    breakStealth();
    const rates = [0.8, 0.4, 0.2];
    const restored = rates[item.uses];
    weapon.durability = Math.min(weapon.maxDurability, weapon.durability + weapon.maxDurability * restored);
    showNotice("维修完成 +" + Math.round(restored * 100) + "%", "good");
    item.uses++;
    if (item.uses >= 3) item.collected = true;
    else item.cooldown = 100;
}

function canAutoPickupItem(item) {
    if (item.collected) return false;
    if (item.type === "whetstone" || item.type === "oil") return false;
    if ((item.type === "medkit" || item.type === "smallMed") && player.health >= player.maxHealth) return false;
    if ((item.type === "shield" || item.type === "staminaDrop") && player.shields >= player.maxShields) return false;
    if (item.type === "clonePotion" && clones.length >= 2) return false;
    return true;
}

function autoPickupItem(item) {
    if (!canAutoPickupItem(item)) return false;
    if (item.type === "key") {
        breakStealth();
        player.keys++;
        item.collected = true;
        showNotice("拾取钥匙 +1", "good");
        return true;
    }
    if (item.type === "gem") {
        breakStealth();
        player.gems[item.gemColor] = true;
        player.health = player.maxHealth;
        item.collected = true;
        if (maze.portal) maze.portal.visibleOnRadar = true;
        showNotice("获得" + ({red: "红", yellow: "黄", blue: "蓝"}[item.gemColor]) + "色宝石，生命已恢复", "good");
        return true;
    }
    if (item.type === "medkit") {
        breakStealth();
        player.health = Math.min(player.maxHealth, player.health + 10);
        item.collected = true;
        showNotice("使用医疗包 +10", "good");
        return true;
    }
    if (item.type === "smallMed") {
        breakStealth();
        player.health = Math.min(player.maxHealth, player.health + 3);
        item.collected = true;
        showNotice("恢复生命 +3", "good");
        return true;
    }
    if (item.type === "shield" || item.type === "staminaDrop") {
        breakStealth();
        player.shields = Math.min(player.maxShields, player.shields + 1);
        item.collected = true;
        showNotice("获得护盾 " + player.shields + "/" + player.maxShields, "good");
        return true;
    }
    if (item.type === "stealthPotion") {
        breakStealth(false);
        useStealthPotion();
        item.collected = true;
        showNotice("进入隐身状态", "good");
        return true;
    }
    if (item.type === "clonePotion") {
        breakStealth();
        if (!summonClone()) return false;
        item.collected = true;
        showNotice("召唤分身", "good");
        return true;
    }
    if (item.type === "warpPotion") {
        breakStealth();
        item.collected = true;
        teleportPlayerToCorridor();
        showNotice("随机传送", "good");
        return true;
    }
    if (["rifle", "shotgun", "katana", "chainsaw"].includes(item.type)) {
        breakStealth();
        equipSecondaryFromItem(item);
        return true;
    }
    if (item.type === "rifleAmmo") {
        breakStealth();
        weapons.rifle.reserve += 30;
        item.collected = true;
        showNotice("步枪备弹 +30", "good");
        return true;
    }
    if (item.type === "shotgunAmmo") {
        breakStealth();
        weapons.shotgun.reserve += 8;
        item.collected = true;
        showNotice("霰弹枪备弹 +8", "good");
        return true;
    }
    if (item.type === "coin") {
        sceneState.sceneCoins += Math.max(1, item.amount || 1);
        item.collected = true;
        showNotice("金币 +" + Math.max(1, item.amount || 1), "good");
        return true;
    }
    return false;
}

function updateItems(dt) {
    for (const item of maze.items) {
        if (item.collected) continue;
        if ((item.type === "whetstone" || item.type === "oil") && item.cooldown > 0) item.cooldown = Math.max(0, item.cooldown - dt);
        if (item.life > 0) {
            item.life -= dt;
            if (item.life <= 0) {
                item.collected = true;
                continue;
            }
        }
        if (!canAutoPickupItem(item)) continue;
        const distance = Math.hypot(item.x - player.x, item.y - player.y);
        if (distance <= 54) autoPickupItem(item);
    }
    const tile = worldToTile(player.x, player.y);
    if (isInsideMap(tile.col, tile.row)) {
        player.exploredTiles.add(tile.col + "," + tile.row);
        const roomId = maze.roomGrid[tile.row][tile.col];
        if (roomId >= 0) player.exploredRooms.add(roomId);
    }
    if (maze.portal && maze.portal.active && Math.hypot(maze.portal.x - player.x, maze.portal.y - player.y) <= 34) nextScene();
}

function interactPortal() {
    if (!maze.portal) return;
    const room = maze.rooms[maze.portal.roomId];
    if (room && room.door && !room.door.open) return;
    breakStealth();
    const order = ["red", "yellow", "blue"];
    for (const color of order) {
        if (player.gems[color] && !maze.portal.inserted[color]) {
            player.gems[color] = false;
            maze.portal.inserted[color] = true;
            showNotice("宝石已镶嵌", "good");
            break;
        }
    }
    const count = order.filter((color) => maze.portal.inserted[color]).length;
    maze.portal.active = count === 3;
}

function startCameraFlyIn() {
    cameraFx.flyTime = cameraFx.flyDuration;
    const edge = Math.floor(Math.random() * 4);
    const amountX = window.innerWidth * random(0.7, 1.15);
    const amountY = window.innerHeight * random(0.7, 1.15);
    cameraFx.startOffsetX = edge === 0 ? -amountX : edge === 1 ? amountX : 0;
    cameraFx.startOffsetY = edge === 2 ? -amountY : edge === 3 ? amountY : 0;
}

function bankSceneCoins() {
    if (sceneState.sceneCoins <= 0) return;
    sceneState.bankedCoins += sceneState.sceneCoins;
    saveBankedCoins(sceneState.bankedCoins);
    sceneState.sceneCoins = 0;
}

function nextScene() {
    bankSceneCoins();
    maze.scene++;
    player.keys = 0;
    player.stamina = player.maxStamina;
    generateMaze();
    for (const clone of clones) { clone.x = player.x; clone.y = player.y; }
    startCameraFlyIn();
    updateCamera();
    const screen = getPlayerScreenPosition();
    mouse.x = clamp(screen.x + crosshair.maxDistance, 0, window.innerWidth);
    mouse.y = screen.y;
    aim.angle = 0;
    aim.targetAngle = 0;
    crosshair.distance = crosshair.maxDistance;
    startCameraFlyIn();
    spawnInitialMonsterGroups();
}

function openDoor(door) {
    if (door.open || player.keys <= 0) return;
    breakStealth();
    player.keys--;
    door.open = true;
    maze.grid[door.y][door.x] = 0;
    if (door.roomId >= 0) player.exploredRooms.add(door.roomId);
    if (door.content === "trap") {
        startTrapQte(door);
        return;
    }
    if (door.content === "monster" || door.content === "both") spawnDoorMonster(door);
    if (door.content === "medkit" || door.content === "both") spawnDoorMedkit(door);
}

function getDoorInsidePoint(door) {
    if (door.roomDoor && door.roomId >= 0 && maze.rooms[door.roomId]) return maze.rooms[door.roomId].center;
    const neighbors = [[door.x + 1, door.y], [door.x - 1, door.y], [door.x, door.y + 1], [door.x, door.y - 1]];
    const candidates = [];
    for (const item of neighbors) {
        if (!isWalkableTile(item[0], item[1])) continue;
        const point = tileCenter(item[0], item[1]);
        candidates.push({point, distance: Math.hypot(point.x - player.x, point.y - player.y)});
    }
    candidates.sort((a, b) => b.distance - a.distance);
    return candidates.length > 0 ? candidates[0].point : tileCenter(door.x, door.y);
}

function spawnDoorMonster(door) {
    const point = getDoorInsidePoint(door);
    spawnMonster(point.x, point.y);
}

function spawnDoorMedkit(door) {
    const point = getDoorInsidePoint(door);
    maze.items.push({
        type: "medkit",
        x: point.x + random(-12, 12),
        y: point.y + random(-12, 12),
        collected: false,
        roomId: door.roomId
    });
}

function normalizePositiveAngle(angle) {
    const two = Math.PI * 2;
    angle %= two;
    if (angle < 0) angle += two;
    return angle;
}

function angleInsideArc(angle, start, size) {
    const a = normalizePositiveAngle(angle - start);
    return a >= 0 && a <= size;
}

function startTrapQte(door) {
    if (trapQte.active || door.triggered) return;
    door.triggered = true;
    trapQte.active = true;
    trapQte.phase = "warning";
    trapQte.warningTime = random(0.72, 0.98);
    trapQte.activeTime = 0;
    trapQte.successSize = random(0.95, 1.25);
    trapQte.greatSize = trapQte.successSize * random(0.20, 0.28);
    trapQte.successStart = random(0.35, Math.PI * 2 - trapQte.successSize - 0.15);
    trapQte.greatStart = trapQte.successStart + (trapQte.successSize - trapQte.greatSize) * random(0.42, 0.58);
    trapQte.startAngle = normalizePositiveAngle(trapQte.successStart - random(1.35, 2.10));
    trapQte.needleAngle = trapQte.startAngle;
    trapQte.travel = 0;
    trapQte.speed = random(3.1, 3.8);
    trapQte.door = door;
}

function applyTrapFailure(door) {
    const point = tileCenter(door.x, door.y);
    const angle = Math.atan2(player.y - point.y, player.x - point.x);
    trapEffects.push({type: door.trapType, x: point.x, y: point.y, angle, time: 0.65, duration: 0.65});
    damagePlayer(10, "trap");
    showNotice("QTE失败", "warn");
}

function grantGreatQteReward() {
    const roll = Math.random();
    if (roll < 0.46) {
        const buffs = [];
        if (player.health < player.maxHealth) buffs.push("heal");
        if (player.shields < player.maxShields) buffs.push("shield");
        buffs.push("stealth");
        if (clones.length < 2) buffs.push("clone");
        const reward = buffs[Math.floor(Math.random() * buffs.length)];
        if (reward === "heal") { player.health = Math.min(player.maxHealth, player.health + 15); showNotice("高精准：医疗补给 +15", "good"); }
        else if (reward === "shield") { player.shields++; showNotice("高精准：获得护盾", "good"); }
        else if (reward === "stealth") { useStealthPotion(); showNotice("高精准：获得隐身", "good"); }
        else if (reward === "clone") { summonClone(); showNotice("高精准：获得分身", "good"); }
        return;
    }
    if (roll < 0.76) {
        if (Math.random() < 0.62) { weapons.rifle.reserve += 30; showNotice("高精准：步枪弹药 +30", "good"); }
        else { weapons.shotgun.reserve += 8; showNotice("高精准：霰弹枪弹药 +8", "good"); }
        return;
    }
    if (roll < 0.93) {
        player.keys++;
        showNotice("高精准：钥匙 +1", "good");
        return;
    }
    const weaponId = ["rifle", "shotgun", "katana", "chainsaw"][Math.floor(Math.random() * 4)];
    const item = {type: weaponId, x: player.x, y: player.y, roomId: -1, collected: false};
    if (weaponId === "rifle" || weaponId === "shotgun") item.weaponMag = weapons[weaponId].magSize;
    equipSecondaryFromItem(item);
    showNotice("高精准：获得" + weapons[weaponId].name, "good");
}

function resolveTrapQte() {
    if (!trapQte.active || trapQte.phase !== "active") return;
    const needle = normalizePositiveAngle(trapQte.needleAngle);
    if (angleInsideArc(needle, trapQte.greatStart, trapQte.greatSize)) {
        showNotice("高精准判定！", "good");
        grantGreatQteReward();
    } else if (angleInsideArc(needle, trapQte.successStart, trapQte.successSize)) {
        showNotice("QTE成功", "good");
    } else {
        applyTrapFailure(trapQte.door);
    }
    trapQte.active = false;
    trapQte.phase = "idle";
    trapQte.door = null;
}

function updateTrapQte(dt) {
    if (!trapQte.active) return;
    if (trapQte.phase === "warning") {
        trapQte.warningTime -= dt;
        if (trapQte.warningTime <= 0) {
            trapQte.phase = "active";
            trapQte.activeTime = 0;
        }
        return;
    }
    trapQte.activeTime += dt;
    const step = trapQte.speed * dt;
    trapQte.needleAngle = normalizePositiveAngle(trapQte.needleAngle + step);
    trapQte.travel += step;
    if (trapQte.travel >= Math.PI * 2) {
        applyTrapFailure(trapQte.door);
        trapQte.active = false;
        trapQte.phase = "idle";
        trapQte.door = null;
    }
}

// 寻路
// 寻路
function findPath(startX, startY, endX, endY) {
    const start = worldToTile(startX, startY);
    const end = worldToTile(endX, endY);
    if (!isWalkableTile(start.col, start.row) || !isWalkableTile(end.col, end.row)) return [];
    const visited = Array.from({length: maze.rows}, () => Array(maze.cols).fill(false));
    const parent = Array.from({length: maze.rows}, () => Array(maze.cols).fill(null));
    const queue = [[start.col, start.row]];
    visited[start.row][start.col] = true;
    let head = 0;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < queue.length) {
        const current = queue[head++];
        const x = current[0];
        const y = current[1];
        if (x === end.col && y === end.row) break;
        for (const direction of directions) {
            const nx = x + direction[0];
            const ny = y + direction[1];
            if (!isWalkableTile(nx, ny) || visited[ny][nx]) continue;
            visited[ny][nx] = true;
            parent[ny][nx] = [x, y];
            queue.push([nx, ny]);
        }
    }
    if (!visited[end.row][end.col]) return [];
    const path = [];
    let current = [end.col, end.row];
    while (!(current[0] === start.col && current[1] === start.row)) {
        path.push(tileCenter(current[0], current[1]));
        current = parent[current[1]][current[0]];
        if (!current) return [];
    }
    path.reverse();
    return path;
}

function choosePatrolPath(monster) {
    const tile = worldToTile(monster.x, monster.y);
    for (let i = 0; i < 25; i++) {
        const col = clamp(tile.col + Math.floor(random(-7, 8)), 1, maze.cols - 2);
        const row = clamp(tile.row + Math.floor(random(-7, 8)), 1, maze.rows - 2);
        if (!isWalkableTile(col, row)) continue;
        const target = tileCenter(col, row);
        const path = findPath(monster.x, monster.y, target.x, target.y);
        if (path.length > 0) {
            monster.path = path;
            monster.pathIndex = 0;
            return;
        }
    }
    monster.wait = random(1, 3);
}

// 怪物
function getMonsterVisualRange(monster) {
    return maze.tileSize * 3.65;
}

function getMonsterChaseRange(monster) {
    return maze.tileSize * (monster.frenzy ? 17 : 12);
}

function isPointInsidePlayerFlashlight(x, y) {
    const dx = x - player.x;
    const dy = y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > getVisionRange() + maze.tileSize * 0.25) return false;
    const angle = Math.abs(normalizeAngle(Math.atan2(dy, dx) - aim.angle));
    if (angle > getVisionAngle() / 2 + 0.12) return false;
    return hasLineOfSight(player.x, player.y, x, y);
}

function isNearPortalSpawnBlock(x, y) {
    if (!maze.portal) return false;
    const room = maze.rooms[maze.portal.roomId];
    if (!room) return Math.hypot(x - maze.portal.x, y - maze.portal.y) < maze.tileSize * 3.5;
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    for (const cell of room.cells) {
        minCol = Math.min(minCol, cell[0]); maxCol = Math.max(maxCol, cell[0]);
        minRow = Math.min(minRow, cell[1]); maxRow = Math.max(maxRow, cell[1]);
    }
    const t = worldToTile(x, y);
    return t.col >= minCol - 3 && t.col <= maxCol + 3 && t.row >= minRow - 3 && t.row <= maxRow + 3;
}

function isValidAmbientMonsterSpawn(x, y) {
    const tile = worldToTile(x, y);
    if (!isWalkableTile(tile.col, tile.row)) return false;
    if (maze.roomGrid[tile.row][tile.col] !== -1) return false;
    if (!canCircleMoveTo(x, y, 15)) return false;
    if (isNearPortalSpawnBlock(x, y)) return false;
    if (isPointInsidePlayerFlashlight(x, y)) return false;
    const distance = Math.hypot(x - player.x, y - player.y);
    if (distance < maze.tileSize * 5 && hasLineOfSight(player.x, player.y, x, y)) return false;
    return true;
}

function findAmbientSpawnNearRoom(room) {
    if (!room || room.id === (maze.portal && maze.portal.roomId)) return null;
    const centerTile = worldToTile(room.center.x, room.center.y);
    for (let i = 0; i < 45; i++) {
        const radius = 2 + Math.floor(Math.random() * 4);
        const angle = Math.random() * Math.PI * 2;
        const col = Math.round(centerTile.col + Math.cos(angle) * radius);
        const row = Math.round(centerTile.row + Math.sin(angle) * radius);
        if (!isInsideMap(col, row)) continue;
        const point = tileCenter(col, row);
        if (isValidAmbientMonsterSpawn(point.x, point.y)) return point;
    }
    return null;
}

function findAmbientCorridorSpawn() {
    for (let i = 0; i < 160; i++) {
        const col = 1 + Math.floor(Math.random() * (maze.cols - 2));
        const row = 1 + Math.floor(Math.random() * (maze.rows - 2));
        const point = tileCenter(col, row);
        if (isValidAmbientMonsterSpawn(point.x, point.y)) return point;
    }
    return null;
}

function makeMonsterIdle(monster) {
    if (!monster || monster.frenzyLocked) return;
    monster.state = "idle";
    monster.frenzy = false;
    monster.pursuitTime = 0;
    monster.idleTime = random(0.8, 1.8);
    monster.path = [];
    monster.pathIndex = 0;
    monster.chaseTarget = null;
    monster.attackPhase = null;
    monster.attackPhaseTimer = 0;
    monster.alertX = null;
    monster.alertY = null;
}

function makeMonsterFrenzy(monster, locked = false) {
    if (!monster) return;
    monster.frenzy = true;
    monster.frenzyLocked = locked || monster.frenzyLocked;
    monster.state = "frenzy";
    monster.attackPhase = null;
    monster.attackPhaseTimer = 0;
    monster.path = [];
    monster.pathIndex = 0;
    monster.repathTimer = 0;
    monster.chaseTarget = player;
}

function spawnMonster(x = null, y = null, options = {}) {
    if (monsters.length >= monsterSpawner.max) return null;
    let point = null;
    if (x != null && y != null) point = {x, y};
    else point = findAmbientCorridorSpawn();
    if (!point) return null;
    const frenzy = !!options.frenzy;
    const monster = {
        x: point.x,
        y: point.y,
        angle: random(-Math.PI, Math.PI),
        radius: 15,
        speed: 82,
        health: 50,
        maxHealth: 50,
        state: frenzy ? "frenzy" : "idle",
        path: [],
        pathIndex: 0,
        wait: 0,
        idleTime: random(0.8, 1.8),
        repathTimer: 0,
        stunTime: 0,
        slowTime: 0,
        attackDamage: 10,
        attackAnim: 0,
        attackPhase: null,
        attackPhaseTimer: 0,
        chaseTarget: frenzy ? player : null,
        lastSeenX: point.x,
        lastSeenY: point.y,
        alertX: null,
        alertY: null,
        pursuitTime: 0,
        frenzy,
        frenzyLocked: !!options.frenzyLocked,
        wrongBranchCooldown: 0,
        weight: options.weight || 1
    };
    monsters.push(monster);
    return monster;
}

function spawnMonsterGroupNearRoom(count, frenzy = false) {
    const rooms = maze.rooms.filter((room) => room.id !== (maze.portal && maze.portal.roomId) && room.door && room.door.content !== "trap" && !room.isGemRoom && !room.isRepairRoom);
    if (rooms.length === 0) return 0;
    shuffle(rooms);
    let spawned = 0;
    for (const room of rooms) {
        for (let i = 0; i < count * 4 && spawned < count && monsters.length < monsterSpawner.max; i++) {
            const point = findAmbientSpawnNearRoom(room);
            if (!point) continue;
            if (spawnMonster(point.x, point.y, {frenzy, frenzyLocked: frenzy})) spawned++;
        }
        if (spawned >= count) break;
    }
    return spawned;
}

function spawnMonsterGroupCorridor(count, frenzy = false) {
    let spawned = 0;
    for (let i = 0; i < count * 18 && spawned < count && monsters.length < monsterSpawner.max; i++) {
        const point = findAmbientCorridorSpawn();
        if (!point) continue;
        if (spawnMonster(point.x, point.y, {frenzy, frenzyLocked: frenzy})) spawned++;
    }
    return spawned;
}

function spawnAmbientGroup(frenzy = false) {
    if (monsters.length >= monsterSpawner.max) return 0;
    const remaining = monsterSpawner.max - monsters.length;
    const roomGroup = Math.random() < 0.68;
    const targetCount = Math.min(remaining, roomGroup ? 5 : 3);
    return roomGroup ? spawnMonsterGroupNearRoom(targetCount, frenzy) : spawnMonsterGroupCorridor(targetCount, frenzy);
}

function spawnInitialMonsterGroups() {
    const target = sceneState.horde ? 45 : 15;
    let guard = 0;
    while (monsters.length < target && guard++ < 12) {
        if (spawnAmbientGroup(sceneState.horde) === 0) break;
    }
}

function updateMonsterSpawner(dt) {
    monsterSpawner.max = sceneState.horde ? monsterSpawner.hordeMax : 30;
    if (monsters.length >= monsterSpawner.max) return;
    monsterSpawner.timer -= dt;
    if (monsterSpawner.timer > 0) return;
    monsterSpawner.timer = sceneState.horde ? 0.55 : 4.5;
    if (sceneState.horde) {
        for (let i = 0; i < 2 && monsters.length < monsterSpawner.max; i++) spawnAmbientGroup(true);
    } else {
        spawnAmbientGroup(false);
    }
}

function moveMonsterOnPath(monster, dt) {
    if (monster.pathIndex >= monster.path.length) return true;
    const target = monster.path[monster.pathIndex];
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) {
        monster.pathIndex++;
        return monster.pathIndex >= monster.path.length;
    }
    const angle = Math.atan2(dy, dx);
    monster.angle = lerpAngle(monster.angle, angle, 1 - Math.exp(-10 * dt));
    const slowMultiplier = monster.slowTime > 0 ? 0.52 : 1;
    const stateBoost = monster.frenzy ? 1.48 : (monster.state === "chase" ? 1.12 : 1);
    const step = Math.min(distance, monster.speed * slowMultiplier * stateBoost * dt);
    moveCircle(monster, Math.cos(angle) * step, Math.sin(angle) * step, monster.radius);
    return false;
}

function choosePatrolPath(monster) {
    const tile = worldToTile(monster.x, monster.y);
    for (let i = 0; i < 30; i++) {
        const col = clamp(tile.col + Math.floor(random(-5, 6)), 1, maze.cols - 2);
        const row = clamp(tile.row + Math.floor(random(-5, 6)), 1, maze.rows - 2);
        if (!isWalkableTile(col, row)) continue;
        const target = tileCenter(col, row);
        const path = findPath(monster.x, monster.y, target.x, target.y);
        if (path.length > 0) {
            monster.path = path;
            monster.pathIndex = 0;
            return;
        }
    }
    monster.wait = random(0.8, 2.2);
}

function getVisibleMonsterTarget(monster) {
    let bestClone = null;
    let bestDistance = Infinity;
    for (const clone of clones) {
        const d = Math.hypot(clone.x - monster.x, clone.y - monster.y);
        if (d > getMonsterVisualRange(monster) || d >= bestDistance) continue;
        if (!hasLineOfSight(monster.x, monster.y, clone.x, clone.y)) continue;
        bestClone = clone;
        bestDistance = d;
    }
    if (bestClone) return bestClone;
    if (player.invisibleTime > 0) return null;
    const d = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (d <= getMonsterVisualRange(monster) && hasLineOfSight(monster.x, monster.y, player.x, player.y)) return player;
    return null;
}

function isValidMonsterTarget(target) {
    if (!target) return false;
    if (target === player) return !sceneState.dead;
    return clones.includes(target) && target.health > 0;
}

function getHordeTarget(monster) {
    let cloneTarget = null;
    let cloneDistance = Infinity;
    for (const clone of clones) {
        const d = Math.hypot(clone.x - monster.x, clone.y - monster.y);
        if (d < cloneDistance && d <= maze.tileSize * 3.2) { cloneTarget = clone; cloneDistance = d; }
    }
    return cloneTarget || player;
}

function pickAlertPoint(soundX, soundY) {
    const source = worldToTile(soundX, soundY);
    for (let i = 0; i < 24; i++) {
        const col = clamp(source.col + Math.floor(random(-2, 3)), 1, maze.cols - 2);
        const row = clamp(source.row + Math.floor(random(-2, 3)), 1, maze.rows - 2);
        if (!isWalkableTile(col, row)) continue;
        return tileCenter(col, row);
    }
    return {x: soundX, y: soundY};
}

function enterAlertState(monster, soundX, soundY) {
    if (!monster || monster.frenzyLocked || monster.state === "attack" || monster.state === "chase" || monster.state === "frenzy") return;
    const point = pickAlertPoint(soundX, soundY);
    monster.state = "alert";
    monster.alertX = point.x;
    monster.alertY = point.y;
    monster.path = findPath(monster.x, monster.y, point.x, point.y);
    monster.pathIndex = 0;
    monster.repathTimer = 0.4;
    monster.wait = 0;
}

function getWalkableDegreeAtWorld(x, y) {
    const t = worldToTile(x, y);
    let count = 0;
    for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) if (isWalkableTile(t.col + d[0], t.row + d[1])) count++;
    return count;
}

function chooseWrongBranch(monster) {
    const t = worldToTile(monster.x, monster.y);
    const choices = [];
    for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const col = t.col + d[0], row = t.row + d[1];
        if (!isWalkableTile(col, row)) continue;
        const p = tileCenter(col, row);
        choices.push(p);
    }
    if (choices.length < 3) return false;
    const bestAngle = Math.atan2(monster.lastSeenY - monster.y, monster.lastSeenX - monster.x);
    choices.sort((a,b) => Math.abs(normalizeAngle(Math.atan2(b.y-monster.y,b.x-monster.x)-bestAngle)) - Math.abs(normalizeAngle(Math.atan2(a.y-monster.y,a.x-monster.x)-bestAngle)));
    const wrong = choices.slice(1);
    if (wrong.length === 0) return false;
    const target = wrong[Math.floor(Math.random()*wrong.length)];
    monster.path = findPath(monster.x, monster.y, target.x, target.y);
    monster.pathIndex = 0;
    monster.wrongBranchCooldown = 1.3;
    return monster.path.length > 0;
}

function enterAttackState(monster, target) {
    monster.state = "attack";
    monster.chaseTarget = target;
    monster.attackPhase = "windup";
    monster.attackPhaseTimer = monster.frenzy ? 0.34 : 0.55;
    monster.path = [];
    monster.pathIndex = 0;
}

function updateMonsterAttack(monster, dt) {
    const target = isValidMonsterTarget(monster.chaseTarget) ? monster.chaseTarget : null;
    if (!target) { makeMonsterIdle(monster); return; }
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const distance = Math.hypot(dx, dy);
    const attackRange = maze.tileSize * 0.92 + monster.radius * 0.25;
    monster.angle = lerpAngle(monster.angle, Math.atan2(dy, dx), 1 - Math.exp(-14 * dt));
    monster.attackPhaseTimer -= dt;
    if (monster.attackPhase === "windup") {
        monster.attackAnim = Math.max(monster.attackAnim, 0.12 + (monster.frenzy ? 0.12 : 0.18));
        if (monster.attackPhaseTimer > 0) return;
        if (distance <= attackRange + 12 && hasLineOfSight(monster.x, monster.y, target.x, target.y)) {
            monster.attackAnim = 0.30;
            if (target === player) damagePlayer(monster.attackDamage, "monster");
            else damageClone(target, monster.attackDamage);
        }
        monster.attackPhase = "recovery";
        monster.attackPhaseTimer = monster.frenzy ? 0.48 : 0.75;
        return;
    }
    if (monster.attackPhase === "recovery" && monster.attackPhaseTimer <= 0) {
        if (distance <= attackRange && hasLineOfSight(monster.x, monster.y, target.x, target.y)) {
            monster.attackPhase = "windup";
            monster.attackPhaseTimer = monster.frenzy ? 0.34 : 0.55;
        } else {
            monster.state = monster.frenzy ? "frenzy" : "chase";
            monster.attackPhase = null;
            monster.repathTimer = 0;
        }
    }
}

function updateMonsters(dt) {
    for (const monster of [...monsters]) {
        if (!monsters.includes(monster)) continue;
        monster.repathTimer -= dt;
        monster.stunTime = Math.max(0, (monster.stunTime || 0) - dt);
        monster.slowTime = Math.max(0, (monster.slowTime || 0) - dt);
        monster.attackAnim = Math.max(0, (monster.attackAnim || 0) - dt);
        monster.wrongBranchCooldown = Math.max(0, (monster.wrongBranchCooldown || 0) - dt);
        if (monster.stunTime > 0) continue;

        if (sceneState.horde) {
            if (!monster.frenzyLocked) makeMonsterFrenzy(monster, true);
            monster.chaseTarget = getHordeTarget(monster);
        }

        const visibleTarget = sceneState.horde ? getHordeTarget(monster) : getVisibleMonsterTarget(monster);
        if (!sceneState.horde && visibleTarget && monster.state !== "attack") {
            monster.chaseTarget = visibleTarget;
            monster.lastSeenX = visibleTarget.x;
            monster.lastSeenY = visibleTarget.y;
            monster.state = monster.frenzy ? "frenzy" : "chase";
        }

        if (monster.state === "idle") {
            if (visibleTarget) { monster.state = "chase"; monster.chaseTarget = visibleTarget; continue; }
            monster.idleTime -= dt;
            if (monster.idleTime <= 0) {
                monster.state = "patrol";
                monster.wait = random(0.2, 0.7);
                monster.path = [];
            }
            continue;
        }

        if (monster.state === "patrol") {
            if (visibleTarget) { monster.state = "chase"; monster.chaseTarget = visibleTarget; continue; }
            if (monster.wait > 0) { monster.wait -= dt; continue; }
            if (monster.path.length === 0 || monster.pathIndex >= monster.path.length) choosePatrolPath(monster);
            else if (moveMonsterOnPath(monster, dt)) { monster.path = []; monster.pathIndex = 0; monster.wait = random(0.35, 1.1); }
            continue;
        }

        if (monster.state === "alert") {
            if (visibleTarget) { monster.state = "chase"; monster.chaseTarget = visibleTarget; monster.pursuitTime = 0; continue; }
            if (monster.path.length === 0 || monster.pathIndex >= monster.path.length) {
                if (monster.wait <= 0) monster.wait = random(0.7, 1.5);
                monster.wait -= dt;
                if (monster.wait <= 0) makeMonsterIdle(monster);
            } else moveMonsterOnPath(monster, dt);
            continue;
        }

        if (monster.state === "attack") {
            monster.pursuitTime += dt;
            if (!monster.frenzy && monster.pursuitTime >= 15) { monster.frenzy = true; }
            updateMonsterAttack(monster, dt);
            continue;
        }

        if (monster.state === "chase" || monster.state === "frenzy") {
            monster.pursuitTime += dt;
            if (!monster.frenzy && monster.pursuitTime >= 15) {
                monster.frenzy = true;
                monster.state = "frenzy";
            }
            let target = sceneState.horde ? getHordeTarget(monster) : monster.chaseTarget;
            if (!isValidMonsterTarget(target)) target = visibleTarget;
            if (visibleTarget) {
                target = visibleTarget;
                monster.chaseTarget = target;
                monster.lastSeenX = target.x;
                monster.lastSeenY = target.y;
            }
            if (!target) { makeMonsterIdle(monster); continue; }
            const chaseDistance = Math.hypot(target.x - monster.x, target.y - monster.y);
            if (!sceneState.horde && chaseDistance > getMonsterChaseRange(monster)) { makeMonsterIdle(monster); continue; }
            const directSight = hasLineOfSight(monster.x, monster.y, target.x, target.y) && (target !== player || player.invisibleTime <= 0);
            if (directSight || sceneState.horde) {
                monster.lastSeenX = target.x;
                monster.lastSeenY = target.y;
            }
            const attackRange = maze.tileSize * 0.92 + monster.radius * 0.25;
            if (chaseDistance <= attackRange && (sceneState.horde || directSight)) {
                enterAttackState(monster, target);
                continue;
            }
            if (monster.repathTimer <= 0) {
                monster.repathTimer = monster.frenzy ? 0.22 : 0.38;
                if (!directSight && !sceneState.horde && monster.wrongBranchCooldown <= 0 && getWalkableDegreeAtWorld(monster.x, monster.y) >= 3 && Math.random() < 0.22) {
                    if (!chooseWrongBranch(monster)) {
                        monster.path = findPath(monster.x, monster.y, monster.lastSeenX, monster.lastSeenY);
                        monster.pathIndex = 0;
                    }
                } else {
                    const tx = sceneState.horde ? target.x : (directSight ? target.x : monster.lastSeenX);
                    const ty = sceneState.horde ? target.y : (directSight ? target.y : monster.lastSeenY);
                    monster.path = findPath(monster.x, monster.y, tx, ty);
                    monster.pathIndex = 0;
                }
            }
            if (monster.path.length > 0) moveMonsterOnPath(monster, dt);
            else if (!directSight && !sceneState.horde) makeMonsterIdle(monster);
            continue;
        }
    }
}

function emitNoise(radius) {
    if (sceneState.horde) return;
    for (const monster of monsters) {
        if (monster.state === "chase" || monster.state === "attack" || monster.state === "frenzy") continue;
        if (Math.hypot(monster.x - player.x, monster.y - player.y) > radius) continue;
        enterAlertState(monster, player.x, player.y);
    }
}

// 开枪与子弹
// 开枪与子弹
function getSecondaryWeapon() {
    return weaponState.secondary;
}

function triggerWeaponUiSwap(previousWeapon) {
    weaponState.uiFrom = previousWeapon;
    weaponState.uiSwap = 0.22;
}
function toggleWeapon() {
    if (!weaponState.secondary) {
        showNotice("没有可切换的副武器", "warn");
        return;
    }
    const previousWeapon = weaponState.current;
    weaponState.current = weaponState.current === "pistol" ? weaponState.secondary : "pistol";
    weaponState.reloading = false;
    weaponState.reloadTimer = 0;
    weaponState.rifleBurst = 0;
    triggerWeaponUiSwap(previousWeapon);
    showNotice("切换至 " + weapons[weaponState.current].name);
}

function dropSecondaryInRoom(itemX, itemY, roomId) {
    const old = weaponState.secondary;
    if (!old) return;
    const extra = {collected: false, roomId, x: itemX, y: itemY, type: old};
    if (old === "rifle" || old === "shotgun") extra.weaponMag = weapons[old].mag;
    maze.items.push(extra);
}

function equipSecondaryFromItem(item) {
    const oldCurrent = weaponState.current;
    const old = weaponState.secondary;
    if (old && old !== item.type) dropSecondaryInRoom(item.x + 10, item.y + 10, item.roomId);
    weaponState.secondary = item.type;
    weaponState.current = item.type;
    weaponState.owned = new Set(["pistol", item.type]);
    if (item.type === "rifle" || item.type === "shotgun") weapons[item.type].mag = item.weaponMag == null ? weapons[item.type].magSize : item.weaponMag;
    item.collected = true;
    triggerWeaponUiSwap(oldCurrent);
    showNotice("拾取 " + weapons[item.type].name, "good");
}

function startReload() {
    const weapon = weapons[weaponState.current];
    if (!weapon || weapon.type !== "gun" || weaponState.reloading) return;
    if (weapon.mag >= weapon.magSize) return;
    if (weaponState.current !== "pistol" && !sceneState.horde && weapon.reserve <= 0) {
        showNotice("没有备用弹药", "warn");
        return;
    }
    weaponState.reloading = true;
    weaponState.reloadTimer = weapon.reload;
    showNotice(weaponState.current === "shotgun" ? "装填中" : "换弹中");
}

function finishReload() {
    const weapon = weapons[weaponState.current];
    if (!weapon || weapon.type !== "gun") {
        weaponState.reloading = false;
        return;
    }
    if (weaponState.current === "shotgun") {
        if (weapon.mag < weapon.magSize && (sceneState.horde || weapon.reserve > 0)) {
            weapon.mag++;
            if (!sceneState.horde) weapon.reserve--;
        }
        if (weapon.mag < weapon.magSize && (sceneState.horde || weapon.reserve > 0)) {
            weaponState.reloadTimer = weapon.reload;
            weaponState.reloading = true;
        } else {
            weaponState.reloading = false;
        }
        return;
    }
    if (weaponState.current === "pistol") weapon.mag = weapon.magSize;
    else if (sceneState.horde) weapon.mag = weapon.magSize;
    else {
        const amount = Math.min(weapon.magSize, weapon.reserve);
        weapon.mag = amount;
        weapon.reserve -= amount;
    }
    weaponState.reloading = false;
}

function tryAttack(initial = false) {
    if ((weaponState.reloading && weaponState.current !== "shotgun") || weaponState.chainsawRage || player.dash) return;
    const weapon = weapons[weaponState.current];
    if (!weapon) return;
    if (weapon.type === "gun") {
        if (weaponState.current === "rifle") {
            if (initial) fireGun();
            return;
        }
        if (initial) fireGun();
        return;
    }
    if (initial) meleeAttack();
}

function fireGun() {
    const weapon = weapons[weaponState.current];
    const shotgunCanFireWhileReloading = weaponState.current === "shotgun" && weaponState.reloading && weapon.mag > 0;
    if (!weapon || weapon.type !== "gun" || weaponState.fireTimer > 0 || (weaponState.reloading && !shotgunCanFireWhileReloading)) return;
    if (weapon.mag <= 0) {
        startReload();
        return;
    }
    weapon.mag--;
    weaponState.fireTimer = weapon.interval;
    emitNoise(weapon.noise);
    if (weaponState.current === "shotgun") fireShotgun();
    else if (weaponState.current === "rifle") fireRifle();
    else spawnBullet(aim.angle, weapon.damage, weapon.speed, "pistol");
    if (weapon.mag <= 0) startReload();
}

function spawnBullet(angle, damage, speed, kind, maxRange = 900) {
    bullets.push({
        x: player.x + Math.cos(angle) * 34,
        y: player.y + Math.sin(angle) * 34,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage, kind, distance: 0, maxRange
    });
}

function fireRifle() {
    let spread = 0;
    if (weaponState.rifleBurst >= 5) spread = Math.min(0.12, (weaponState.rifleBurst - 4) * 0.012);
    const angle = aim.angle + random(-spread, spread);
    weaponState.rifleBurst++;
    weaponState.rifleReset = 0.34;
    spawnBullet(angle, weapons.rifle.damage, weapons.rifle.speed, "rifle", 1050);
}

function fireShotgun() {
    player.fireSlowTime = 0.16;
    feedback.shake = Math.max(feedback.shake, 0.32);
    const count = 8;
    const spread = 0.32;
    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = aim.angle + (t - 0.5) * spread + random(-0.018, 0.018);
        spawnBullet(angle, weapons.shotgun.damage, weapons.shotgun.speed, "shotgun", 430);
    }
}

function startMeleeAnimation(weaponId) {
    weaponState.meleeSwingDir *= -1;
    const duration = weaponId === "katana" ? 0.36 : 0.28;
    weaponState.meleeAnim = {
        weapon: weaponId,
        time: duration,
        duration,
        dir: weaponState.meleeSwingDir
    };
}

function meleeAttack() {
    if (weaponState.meleeTimer > 0) return;
    const weapon = weapons[weaponState.current];
    if (!weapon || weapon.type !== "melee") return;
    weaponState.meleeTimer = weapon.interval;
    startMeleeAnimation(weaponState.current);
    emitNoise(weapon.noise);
    if (weaponState.current === "katana") katanaHit();
    if (weaponState.current === "chainsaw") chainsawHit(false, true);
}

function katanaHit() {
    let killed = 0;
    const range = 124;
    const halfArc = 0.78;
    for (const monster of [...monsters]) {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > range + monster.radius * 0.25) continue;
        const angle = Math.abs(normalizeAngle(Math.atan2(dy, dx) - aim.angle));
        if (angle > halfArc) continue;
        if (!hasLineOfSight(player.x, player.y, monster.x, monster.y)) continue;
        if (weapons.katana.durability > 0) {
            monster.health -= weapons.katana.damage;
            monster.stunTime = Math.max(monster.stunTime || 0, 0.16);
            knockbackMonster(monster, Math.atan2(dy, dx), 16);
            if (monster.health <= 0) {
                killMonster(monster);
                killed++;
            }
        } else {
            knockbackMonster(monster, aim.angle, 30);
        }
    }
    if (killed > 0 && weapons.katana.durability > 0) {
        const cost = killed * (sceneState.horde ? 0.5 : 1);
        weapons.katana.durability = Math.max(0, weapons.katana.durability - cost);
    }
}

function chainsawContactDamage() {
    if (weaponState.current !== "chainsaw" || weaponState.chainsawRage || player.dash) return;
    if (weapons.chainsaw.durability <= 0) return;
    const range = 48;
    for (const monster of [...monsters]) {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > range + monster.radius) continue;
        if (!hasLineOfSight(player.x, player.y, monster.x, monster.y)) continue;
        const angle = Math.abs(normalizeAngle(Math.atan2(dy, dx) - aim.angle));
        if (angle > 0.95) continue;
        monster.health -= 18;
        monster.stunTime = Math.max(monster.stunTime || 0, 0.08);
        knockbackMonster(monster, Math.atan2(dy, dx), 4);
        if (monster.health <= 0) killMonster(monster);
    }
}

function chainsawHit(rage, activeSweep = false) {
    let kills = 0;
    const useAngle = rage ? weaponState.chainsawRageAngle : aim.angle;
    const range = rage ? 64 : 112;
    const halfArc = rage ? 0.72 : 1.02;
    for (const monster of [...monsters]) {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > range + monster.radius * 0.2) continue;
        const angle = Math.abs(normalizeAngle(Math.atan2(dy, dx) - useAngle));
        if (angle > halfArc) continue;
        if (!hasLineOfSight(player.x, player.y, monster.x, monster.y)) continue;
        if (weapons.chainsaw.durability > 0) {
            killMonster(monster);
            kills++;
        } else {
            knockbackMonster(monster, useAngle, 22);
        }
    }
    if (activeSweep && kills > 0 && weapons.chainsaw.durability > 0) {
        const cost = kills * (sceneState.horde ? 0.5 : 1);
        weapons.chainsaw.durability = Math.max(0, weapons.chainsaw.durability - cost);
    }
}

function knockbackMonster(monster, angle, distance) {
    const nx = monster.x + Math.cos(angle) * distance;
    const ny = monster.y + Math.sin(angle) * distance;
    if (canCircleMoveTo(nx, ny, monster.radius)) {
        monster.x = nx;
        monster.y = ny;
    }
}

function maybeSpawnMonsterDrop(monster) {
    if (sceneState.horde) return;
    const roll = Math.random();
    let type = null;
    if (roll < 0.07) type = "smallMed";
    else if (roll < 0.12) type = "shield";
    else if (roll < 0.155) type = "stealthPotion";
    else if (roll < 0.19) type = "warpPotion";
    else if (roll < 0.225) type = "clonePotion";
    if (!type) return;
    maze.items.push({type, x: monster.x, y: monster.y, collected: false, roomId: -1, life: 10});
}

function killMonster(monster) {
    maybeSpawnMonsterDrop(monster);
    if ((monster.weight || 1) > 1 && Math.random() < 0.48) {
        maze.items.push({type: "coin", amount: 1 + Math.floor(Math.random() * 10), x: monster.x + random(-10, 10), y: monster.y + random(-10, 10), collected: false, roomId: -1, life: 0});
    }
    const index = monsters.indexOf(monster);
    if (index >= 0) monsters.splice(index, 1);
}

function updateWeapon(dt) {
    weaponState.fireTimer = Math.max(0, weaponState.fireTimer - dt);
    weaponState.meleeTimer = Math.max(0, weaponState.meleeTimer - dt);
    weaponState.chainsawContactTimer = Math.max(0, weaponState.chainsawContactTimer - dt);
    if (weaponState.meleeAnim) {
        weaponState.meleeAnim.time -= dt;
        if (weaponState.meleeAnim.time <= 0) weaponState.meleeAnim = null;
    }
    weaponState.rifleReset = Math.max(0, weaponState.rifleReset - dt);
    if (weaponState.rifleReset <= 0) weaponState.rifleBurst = 0;
    if (weaponState.reloading) {
        weaponState.reloadTimer -= dt * (sceneState.horde ? 1.5 : 1);
        if (weaponState.reloadTimer <= 0) finishReload();
    }
    if (weaponState.triggerDown && !weaponState.reloading && !weaponState.chainsawRage && !player.dash) {
        if (weaponState.current === "rifle") fireGun();
        if (weaponState.current === "chainsaw") meleeAttack();
    }
    if (weaponState.current === "chainsaw") {
        if (!weaponState.chainsawRage && weaponState.chainsawContactTimer <= 0) {
            weaponState.chainsawContactTimer = 0.12;
            chainsawContactDamage();
        }
        weaponState.chainsawNoiseTimer -= dt;
        if (weaponState.chainsawNoiseTimer <= 0) {
            weaponState.chainsawNoiseTimer = 0.55;
            emitNoise(weapons.chainsaw.noise);
        }
    } else {
        weaponState.chainsawNoiseTimer = 0;
        weaponState.chainsawContactTimer = 0;
    }
}

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const mx = bullet.vx * dt;
        const my = bullet.vy * dt;
        bullet.x += mx;
        bullet.y += my;
        bullet.distance += Math.hypot(mx, my);
        const tile = worldToTile(bullet.x, bullet.y);
        if (isSolidTile(tile.col, tile.row) || bullet.distance > bullet.maxRange) {
            bullets.splice(i, 1);
            continue;
        }
        let hit = false;
        for (let j = monsters.length - 1; j >= 0; j--) {
            const monster = monsters[j];
            if (Math.hypot(bullet.x - monster.x, bullet.y - monster.y) > monster.radius + 4) continue;
            let damage = bullet.damage;
            if (bullet.kind === "shotgun") {
                damage *= clamp(1 - bullet.distance / bullet.maxRange * 0.72, 0.28, 1);
                monster.stunTime = Math.max(monster.stunTime || 0, 0.14);
                const push = 5.5;
                const nx = monster.x + bullet.vx / Math.max(1, Math.hypot(bullet.vx, bullet.vy)) * push;
                const ny = monster.y + bullet.vy / Math.max(1, Math.hypot(bullet.vx, bullet.vy)) * push;
                if (canCircleMoveTo(nx, ny, monster.radius)) {
                    monster.x = nx;
                    monster.y = ny;
                }
            }
            monster.health -= damage;
            if (monster.health <= 0) killMonster(monster);
            bullets.splice(i, 1);
            hit = true;
            break;
        }
        if (hit) continue;
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;
        if (screenX < -30 || screenY < -30 || screenX > window.innerWidth + 30 || screenY > window.innerHeight + 30) bullets.splice(i, 1);
    }
}

function updateMonsterExplosionEffects(dt) {
    for (let i = monsterExplosionEffects.length - 1; i >= 0; i--) {
        monsterExplosionEffects[i].life -= dt;
        if (monsterExplosionEffects[i].life <= 0) monsterExplosionEffects.splice(i, 1);
    }
}

function drawMonsterExplosionEffects() {
    for (const effect of monsterExplosionEffects) {
        const t = 1 - effect.life / effect.maxLife;
        ctx.save();
        ctx.globalAlpha = (1 - t) * (effect.merge ? 0.55 : 0.7);
        ctx.strokeStyle = effect.merge ? "#e7d667" : "#87c8ff";
        ctx.lineWidth = effect.merge ? 5 : 7;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (0.25 + t * 0.75), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// 陷阱效果
// 陷阱效果
function updateTrapEffects(dt) {
    for (let i = trapEffects.length - 1; i >= 0; i--) {
        trapEffects[i].time -= dt;
        if (trapEffects[i].time <= 0) trapEffects.splice(i, 1);
    }
}

// 怪物接近闪烁
function updateDangerFlicker(dt) {
    danger.near = monsters.some((monster) => Math.hypot(monster.x - player.x, monster.y - player.y) < 310);
    if (!danger.near) {
        danger.blocked = false;
        danger.timer = random(0.45, 1.1);
        danger.blackout = 0;
        return;
    }
    if (danger.blocked) return;
    if (danger.blackout > 0) {
        danger.blackout = Math.max(0, danger.blackout - dt);
        return;
    }
    danger.timer -= dt;
    if (danger.timer <= 0) {
        danger.blackout = random(0.045, 0.085);
        danger.timer = random(0.35, 0.9);
    }
}

function startThunderEvent() {
    thunder.active = true;
    thunder.elapsed = 0;
    thunder.flashes = [];
    thunder.flashAlpha = 0;
    const count = 1 + Math.floor(Math.random() * 3);
    let time = random(0.1, 0.7);
    for (let i = 0; i < count; i++) {
        const duration = random(0.12, 0.5);
        thunder.flashes.push({
            start: time,
            end: time + duration,
            triggered: false
        });
        time += duration + random(0.15, 0.95);
    }
    thunder.duration = thunder.flashes[thunder.flashes.length - 1].end + 0.2;
}

function updateThunder(dt) {
    if (!thunder.active) {
        thunder.cooldown -= dt;
        if (thunder.cooldown <= 0) {
            startThunderEvent();
            thunder.cooldown = random(14, 28);
        }
        return;
    }
    thunder.elapsed += dt;
    thunder.flashAlpha = 0;
    for (const flash of thunder.flashes) {
        if (thunder.elapsed >= flash.start && thunder.elapsed <= flash.end) {
            const progress = (thunder.elapsed - flash.start) / Math.max(0.001, flash.end - flash.start);
            thunder.flashAlpha = Math.max(thunder.flashAlpha, 0.55 + Math.sin(progress * Math.PI) * 0.45);
            if (!flash.triggered) flash.triggered = true;
        }
    }
    if (thunder.elapsed >= thunder.duration) {
        thunder.active = false;
        thunder.elapsed = 0;
        thunder.duration = 0;
        thunder.flashes = [];
        thunder.flashAlpha = 0;
    }
}

// 绘制地图
function drawMaze() {
    const theme = getCurrentThemeAssets();
    const size = maze.tileSize;
    const startCol = Math.max(0, Math.floor(camera.x / size));
    const endCol = Math.min(maze.cols - 1, Math.ceil((camera.x + window.innerWidth) / size));
    const startRow = Math.max(0, Math.floor(camera.y / size));
    const endRow = Math.min(maze.rows - 1, Math.ceil((camera.y + window.innerHeight) / size));
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const tile = maze.grid[row][col];
            const x = col * size;
            const y = row * size;
            if (tile === 0 || tile === 2) {
                if (!drawSpriteCentered(theme.floor, x + size / 2, y + size / 2, size, size)) {
                    ctx.fillStyle = "#444";
                    ctx.fillRect(x, y, size, size);
                }
            }
            if (tile === 1) {
                if (!drawSpriteCentered(theme.wall, x + size / 2, y + size / 2, size, size)) {
                    ctx.fillStyle = "#3d3d3d";
                    ctx.fillRect(x, y, size, size);
                }
            }
            if (tile === 2) {
                if (!drawSpriteCentered(theme.door, x + size / 2, y + size / 2, size, size)) {
                    ctx.fillStyle = "#725033";
                    ctx.fillRect(x + 7, y + 7, size - 14, size - 14);
                }
            }
        }
    }
}

function drawLamps() {
}

function drawLampGlow() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const lamp of maze.lamps) {
        const sx = lamp.x - camera.x;
        const sy = lamp.y - camera.y;
        if (sx < -lamp.radius || sy < -lamp.radius || sx > window.innerWidth + lamp.radius || sy > window.innerHeight + lamp.radius) continue;
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, lamp.radius);
        gradient.addColorStop(0, "rgba(155,108,34,0.32)");
        gradient.addColorStop(0.45, "rgba(128,84,24,0.20)");
        gradient.addColorStop(1, "rgba(92,55,12,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, lamp.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    if (maze.portal) {
        const room = maze.rooms[maze.portal.roomId];
        if (room && room.door && room.door.open) {
            const sx = room.center.x - camera.x;
            const sy = room.center.y - camera.y;
            const radius = maze.tileSize * 2.4;
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
            gradient.addColorStop(0, "rgba(164,120,210,0.22)");
            gradient.addColorStop(1, "rgba(110,70,160,0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// 绘制道具
// 绘制道具
function drawItems() {
    const gemImageMap = {red: assets.gemRed, yellow: assets.gemYellow, blue: assets.gemBlue};
    const iconMap = {
        key: assets.key,
        medkit: assets.medkit,
        rifle: assets.rifle,
        shotgun: assets.shotgun,
        katana: assets.katana,
        chainsaw: assets.chainsaw,
        rifleAmmo: assets.rifleAmmo,
        shotgunAmmo: assets.shotgunAmmo,
        whetstone: assets.whetstone,
        oil: assets.oil
    };
    for (const item of maze.items) {
        if (item.collected) continue;
        ctx.save();
        ctx.translate(item.x, item.y);
        let drawn = false;
        if (item.type === "gem") drawn = drawSpriteCentered(gemImageMap[item.gemColor], 0, 0, 30, 30);
        else if (iconMap[item.type]) drawn = drawSpriteCentered(iconMap[item.type], 0, 0, item.type === "rifle" || item.type === "shotgun" || item.type === "katana" || item.type === "chainsaw" ? 44 : 34, item.type === "rifle" || item.type === "shotgun" || item.type === "katana" || item.type === "chainsaw" ? 44 : 34);
        ctx.restore();
        if (drawn) continue;
        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === "key") {
            ctx.drawImage(assets.key, -17, -17, 34, 34);
        } else if (item.type === "medkit") {
            ctx.drawImage(assets.medkit, -17, -17, 34, 34);
        } else if (item.type === "gem") {
            ctx.drawImage(gemImageMap[item.gemColor], -15, -15, 30, 30);
        } else if (["rifle", "shotgun", "katana", "chainsaw"].includes(item.type)) {
            ctx.drawImage(iconMap[item.type], -22, -22, 44, 44);
        } else if (item.type === "rifleAmmo" || item.type === "shotgunAmmo") {
            ctx.drawImage(iconMap[item.type], -17, -17, 34, 34);
        } else if (item.type === "whetstone" || item.type === "oil") {
            ctx.globalAlpha = item.cooldown > 0 ? 0.35 : 1;
            ctx.drawImage(iconMap[item.type], -17, -17, 34, 34);
        } else if (item.type === "smallMed") {
            ctx.fillStyle = "#2fa85e";
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (item.type === "shield" || item.type === "staminaDrop") {
            ctx.strokeStyle = "#72d8ff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 10, -Math.PI * 0.85, Math.PI * 0.85);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 6, -Math.PI * 0.80, Math.PI * 0.80);
            ctx.stroke();
        } else if (item.type === "stealthPotion") {
            ctx.fillStyle = "rgba(160,120,255,0.75)";
            ctx.fillRect(-7, -10, 14, 20);
            ctx.strokeStyle = "white";
            ctx.strokeRect(-7, -10, 14, 20);
        } else if (item.type === "warpPotion") {
            ctx.fillStyle = "#c765ff";
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (item.type === "clonePotion") {
            ctx.fillStyle = "#6ad7e6";
            ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeStyle = "white";
            ctx.strokeRect(-8, -8, 16, 16);
        } else if (item.type === "coin") {
            ctx.fillStyle = "#f1c84a";
            ctx.strokeStyle = "#6b4b10";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#6b4b10";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(item.amount || 1), 0, 0);
        }
        ctx.restore();
    }
}

function drawPortal() {
    if (!maze.portal) return;
    ctx.save();
    ctx.translate(maze.portal.x, maze.portal.y);
    const pulse = (Math.sin(performance.now() * 0.004) + 1) / 2;
    const colors = ["#db3f4f", "#e7c84a", "#4b7de8"];
    const inserted = [maze.portal.inserted.red, maze.portal.inserted.yellow, maze.portal.inserted.blue];
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.strokeStyle = inserted[i] ? colors[i] : "rgba(120,80,145,0.45)";
        ctx.arc(0, 0, 27 + pulse * 3, -Math.PI / 2 + i * Math.PI * 2 / 3 + 0.05, -Math.PI / 2 + (i + 1) * Math.PI * 2 / 3 - 0.05);
        ctx.stroke();
    }
    ctx.strokeStyle = maze.portal.active ? "#e6b6ff" : "rgba(155,86,200,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = maze.portal.active ? 0.34 + pulse * 0.18 : 0.08 + inserted.filter(Boolean).length * 0.05;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    gradient.addColorStop(0, "rgba(170,80,255,0.8)");
    gradient.addColorStop(1, "rgba(120,40,200,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();
    if (maze.portal.active) {
        ctx.globalAlpha = 0.24 + pulse * 0.12;
        const beam = ctx.createLinearGradient(0, -90, 0, 15);
        beam.addColorStop(0, "rgba(190,120,255,0)");
        beam.addColorStop(0.65, "rgba(175,95,255,0.62)");
        beam.addColorStop(1, "rgba(150,70,235,0.12)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(-18, 5);
        ctx.lineTo(-8, -88);
        ctx.lineTo(8, -88);
        ctx.lineTo(18, 5);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// 绘制子弹
// 绘制子弹
function drawBullets() {
    for (const bullet of bullets) {
        const angle = Math.atan2(bullet.vy, bullet.vx);
        if (!drawSpriteCentered(assets.bullet, bullet.x, bullet.y, 16, 16, angle)) {
            const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
            const dx = bullet.vx / speed;
            const dy = bullet.vy / speed;
            dualStroke(() => {
                ctx.moveTo(bullet.x, bullet.y);
                ctx.lineTo(bullet.x - dx * 11, bullet.y - dy * 11);
            }, 4, 2);
        }
    }
}

// 绘制玩家
function drawHeldWeaponSprite(x, y, aimAngle, weaponId, alpha = 1) {
    const image = getWeaponSprite(weaponId);
    if (!image || !image.complete || !image.naturalWidth) return false;
    const sizes = {pistol: [34, 34], rifle: [44, 44], shotgun: [42, 42], katana: [54, 54], chainsaw: [52, 52]};
    const size = sizes[weaponId] || [36, 36];
    let drawAngle = aimAngle;
    let offset = weaponId === "pistol" ? 16 : 18;
    const anim = weaponState.meleeAnim && weaponState.meleeAnim.weapon === weaponId ? weaponState.meleeAnim : null;
    if (anim) {
        const p = clamp(1 - anim.time / anim.duration, 0, 1);
        const sweep = (p * 2 - 1) * anim.dir;
        const strength = weaponId === "katana" ? 1.12 : 0.92;
        drawAngle += sweep * strength;
        offset += Math.sin(p * Math.PI) * (weaponId === "katana" ? 14 : 10);
    }
    const drawn = drawSpriteCentered(image, x + Math.cos(drawAngle) * offset, y + Math.sin(drawAngle) * offset, size[0], size[1], drawAngle, alpha);
    if (anim) drawMeleeAttackArc(x, y, aimAngle, weaponId, anim, alpha);
    return drawn;
}

function drawMeleeAttackArc(x, y, aimAngle, weaponId, anim, alpha) {
    const p = clamp(1 - anim.time / anim.duration, 0, 1);
    const pulse = Math.sin(p * Math.PI);
    if (pulse <= 0.02) return;
    const dir = anim.dir;
    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.lineCap = "round";
    if (weaponId === "katana") {
        const radius = 104;
        const start = aimAngle - 1.05 * dir;
        const end = aimAngle + 1.05 * dir;
        ctx.strokeStyle = "rgba(220,240,255,0.88)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        if (dir > 0) ctx.arc(x, y, radius, start, end);
        else ctx.arc(x, y, radius, end, start, true);
        ctx.stroke();
        ctx.strokeStyle = "rgba(120,190,255,0.38)";
        ctx.lineWidth = 18;
        ctx.stroke();
    } else if (weaponId === "chainsaw") {
        const radius = 90;
        const start = aimAngle - 0.95 * dir;
        const end = aimAngle + 0.95 * dir;
        ctx.strokeStyle = "rgba(255,176,95,0.82)";
        ctx.lineWidth = 11;
        ctx.beginPath();
        if (dir > 0) ctx.arc(x, y, radius, start, end);
        else ctx.arc(x, y, radius, end, start, true);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,70,45,0.26)";
        ctx.lineWidth = 20;
        ctx.stroke();
    }
    ctx.restore();
}

function drawActorSprite(x, y, bodyAngle, fill, bodyImage, aimAngle = null, weaponId = null, alpha = 1, scale = 1) {
    const shadowAlpha = alpha * 0.2;
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(x, y + 12 * scale, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const bodyDrawn = drawSpriteCentered(bodyImage, x, y, 46 * scale, 46 * scale, bodyAngle + Math.PI / 2, alpha);
    if (!bodyDrawn) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(x, y, 16 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    if (weaponId && aimAngle != null) drawHeldWeaponSprite(x, y, aimAngle, weaponId, alpha);
}

function drawDashTrail() {
    if (!player.dash || !player.dash.trail) return;
    let alpha = 0.42;
    const theme = getCurrentThemeAssets();
    for (const node of player.dash.trail) {
        drawActorSprite(node.x, node.y, player.angle, "#d8d8ff", theme.player, aim.angle, weaponState.current, alpha, 0.98);
        alpha *= 0.72;
    }
}

function drawClones() {
    const theme = getCurrentThemeAssets();
    for (const clone of clones) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#7fe7ff";
        ctx.beginPath();
        ctx.arc(clone.x, clone.y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawActorSprite(clone.x, clone.y, player.angle, "#8fe4ff", theme.player, clone.angle, "pistol", 0.48);
        const ratio = clamp(clone.health / clone.maxHealth, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(clone.x - 18, clone.y - 31, 36, 5);
        ctx.fillStyle = "#7fe7ff";
        ctx.fillRect(clone.x - 17, clone.y - 30, 34 * ratio, 3);
    }
}

function drawPlayerShields() {
    if (player.shields <= 0) return;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < player.shields; i++) {
        const radius = 27 + i * 7;
        const pulse = 0.70 + Math.sin(timeNow * 0.006 + i) * 0.18;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = i === 0 ? "#6bdcff" : "#9de9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, -Math.PI * 0.82, Math.PI * 0.18);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, Math.PI * 0.30, Math.PI * 1.30);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPlayer() {
    const theme = getCurrentThemeAssets();
    drawPlayerShields();
    drawActorSprite(player.x, player.y, player.angle, player.invisibleTime > 0 ? "#b8a8ff" : "white", theme.player, aim.angle, weaponState.current, player.invisibleTime > 0 ? 0.68 : 1);
}

function getMonsterRenderScale(monster) {
    return (monster.weight || 1) > 1 ? Math.min(1.8, 1 + Math.log2(monster.weight) * 0.25) : 1;
}

function drawMonsters() {
    const theme = getCurrentThemeAssets();
    for (const monster of monsters) {
        const scale = getMonsterRenderScale(monster);
        let drawX = monster.x;
        let drawY = monster.y;
        if ((monster.attackAnim || 0) > 0) {
            const p = 1 - monster.attackAnim / 0.30;
            const lunge = Math.sin(clamp(p, 0, 1) * Math.PI) * 13 * scale;
            drawX += Math.cos(monster.angle) * lunge;
            drawY += Math.sin(monster.angle) * lunge;
        }
        drawActorSprite(drawX, drawY, monster.angle, "#bdbdbd", theme.zombie, monster.angle, null, 1, scale);
        if (monster.state === "alert") {
            ctx.save();
            ctx.font = "bold 24px sans-serif";
            ctx.textAlign = "center";
            ctx.lineWidth = 5;
            ctx.strokeStyle = "black";
            ctx.strokeText("?", monster.x, monster.y - 34 * scale);
            ctx.fillStyle = "#ffd84a";
            ctx.fillText("?", monster.x, monster.y - 34 * scale);
            ctx.restore();
        } else if (monster.state === "chase" || monster.state === "attack" || monster.state === "frenzy") {
            ctx.save();
            ctx.font = "bold 24px sans-serif";
            ctx.textAlign = "center";
            ctx.lineWidth = 5;
            ctx.strokeStyle = "black";
            ctx.strokeText("!", monster.x, monster.y - 34 * scale);
            ctx.fillStyle = monster.frenzy ? "#ff3939" : "#ff6767";
            ctx.fillText("!", monster.x, monster.y - 34 * scale);
            ctx.restore();
        }
        if (monster.frenzy) {
            const fx = Math.cos(monster.angle), fy = Math.sin(monster.angle);
            const rx = -fy, ry = fx;
            const ex = monster.x + fx * 8 * scale;
            const ey = monster.y + fy * 8 * scale;
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#ff2020";
            ctx.fillStyle = "#ff3030";
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(ex + rx * side * 4 * scale, ey + ry * side * 4 * scale, 2.4 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        if (monster.state === "attack" && monster.attackPhase === "windup") {
            const duration = monster.frenzy ? 0.34 : 0.55;
            const p = 1 - clamp(monster.attackPhaseTimer / duration, 0, 1);
            ctx.save();
            ctx.globalAlpha = 0.35 + p * 0.45;
            ctx.strokeStyle = "#ff6a5e";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(monster.x, monster.y, 24 + p * 10, monster.angle - 0.65, monster.angle + 0.65);
            ctx.stroke();
            ctx.restore();
        }
        if (monster.health < monster.maxHealth) {
            const barWidth = 36 * scale;
            ctx.fillStyle = "black";
            ctx.fillRect(monster.x - barWidth / 2 - 2, monster.y - 28 * scale, barWidth + 4, 6);
            ctx.fillStyle = "white";
            ctx.fillRect(monster.x - barWidth / 2, monster.y - 26 * scale, barWidth * (monster.health / monster.maxHealth), 2);
        }
    }
}

// 绘制陷阱
function drawTrapEffects() {
    for (const effect of trapEffects) {
        const progress = 1 - effect.time / effect.duration;
        const alpha = 1 - progress;
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = alpha;
        if (effect.type === "fire") {
            ctx.fillStyle = "#ff7a22";
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(95, 0);
            ctx.lineTo(0, 20);
            ctx.closePath();
            ctx.fill();
        }
        if (effect.type === "arrow") {
            for (let i = 0; i < 3; i++) {
                const x = 20 + progress * 90 + i * 12;
                dualStroke(() => {
                    ctx.moveTo(x - 14, -12 + i * 12);
                    ctx.lineTo(x + 12, -12 + i * 12);
                }, 4, 2);
            }
        }
        if (effect.type === "spike") {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 13, 14);
                ctx.lineTo(i * 13 + 6, -22);
                ctx.lineTo(i * 13 + 12, 14);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

// 绘制准星
function drawCrosshair() {
    crosshair.scale += (crosshair.targetScale - crosshair.scale) * 0.2;
    const x = crosshair.x;
    const y = crosshair.y;
    const size = crosshair.size * crosshair.scale;
    const gap = crosshair.gap * crosshair.scale;
    ctx.save();
    dualStroke(() => {
        ctx.moveTo(x, y - gap);
        ctx.lineTo(x, y - gap - size);
        ctx.moveTo(x, y + gap);
        ctx.lineTo(x, y + gap + size);
        ctx.moveTo(x - gap, y);
        ctx.lineTo(x - gap - size, y);
        ctx.moveTo(x + gap, y);
        ctx.lineTo(x + gap + size, y);
    }, 5, crosshair.lineWidth);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// 绘制视野
function buildVisionFan(halfAngle, range) {
    const screen = getPlayerScreenPosition();
    visionCtx.beginPath();
    visionCtx.moveTo(screen.x, screen.y);
    visionCtx.arc(screen.x, screen.y, range, aim.angle - halfAngle, aim.angle + halfAngle);
    visionCtx.closePath();
}

function punchLampLight(screenX, screenY, radius) {
    const gradient = visionCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0.88)");
    gradient.addColorStop(0.65, "rgba(0,0,0,0.45)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    visionCtx.beginPath();
    visionCtx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    visionCtx.fillStyle = gradient;
    visionCtx.fill();
}

function clearPortalRoomFromVisionMask() {
    if (!maze.portal) return;
    const room = maze.rooms[maze.portal.roomId];
    if (!room || !room.door || !room.door.open || !isSealedRoom(room)) return;
    visionCtx.save();
    visionCtx.globalCompositeOperation = "destination-out";
    visionCtx.globalAlpha = 1;
    visionCtx.fillStyle = "black";
    for (const cell of room.cells) {
        const x = cell[0] * maze.tileSize - camera.x;
        const y = cell[1] * maze.tileSize - camera.y;
        visionCtx.fillRect(x, y, maze.tileSize, maze.tileSize);
    }
    visionCtx.restore();
}

function drawVisionMask() {
    if (thunder.flashAlpha > 0 && !sceneState.horde) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const screen = getPlayerScreenPosition();
    const range = getVisionRange();
    const half = getVisionAngle() / 2;
    const innerHalf = half * (1 - vision.edgeFade);
    visionCtx.clearRect(0, 0, width, height);
    visionCtx.globalCompositeOperation = "source-over";
    visionCtx.globalAlpha = 1;
    visionCtx.fillStyle = sceneState.horde ? "rgba(0,0,0,0.18)" : "black";
    visionCtx.fillRect(0, 0, width, height);
    visionCtx.globalCompositeOperation = "destination-out";
    const gradient = visionCtx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, range);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.82, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    const fadeSteps = 12;
    for (let i = 0; i < fadeSteps; i++) {
        const t = i / (fadeSteps - 1);
        const currentHalf = innerHalf + (half - innerHalf) * t;
        visionCtx.globalAlpha = 0.075;
        buildVisionFan(currentHalf, range);
        visionCtx.fillStyle = gradient;
        visionCtx.fill();
    }
    visionCtx.globalAlpha = 1;
    buildVisionFan(innerHalf, range);
    visionCtx.fillStyle = gradient;
    visionCtx.fill();
    for (const lamp of maze.lamps) {
        const sx = lamp.x - camera.x;
        const sy = lamp.y - camera.y;
        if (sx < -lamp.radius || sy < -lamp.radius || sx > width + lamp.radius || sy > height + lamp.radius) continue;
        punchLampLight(sx, sy, lamp.radius);
    }
    for (const clone of clones) {
        const sx = clone.x - camera.x;
        const sy = clone.y - camera.y;
        const radius = 62;
        const cloneLight = visionCtx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        cloneLight.addColorStop(0, "rgba(0,0,0,0.95)");
        cloneLight.addColorStop(0.72, "rgba(0,0,0,0.55)");
        cloneLight.addColorStop(1, "rgba(0,0,0,0)");
        visionCtx.beginPath();
        visionCtx.arc(sx, sy, radius, 0, Math.PI * 2);
        visionCtx.fillStyle = cloneLight;
        visionCtx.fill();
    }
    clearPortalRoomFromVisionMask();
    visionCtx.globalCompositeOperation = "source-over";
    visionCtx.globalAlpha = 1;
    ctx.drawImage(visionCanvas, 0, 0, width, height);
}

function drawThunderFlash() {
    if (thunder.flashAlpha <= 0) return;
    ctx.fillStyle = "rgba(255,255,255," + (0.18 + thunder.flashAlpha * 0.3) + ")";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawClosedRoomDarkness() {
    ctx.save();
    ctx.fillStyle = "black";
    for (const room of maze.rooms) {
        if (!room.door || room.door.open || !isSealedRoom(room)) continue;
        for (const cell of room.cells) {
            const x = cell[0] * maze.tileSize - camera.x;
            const y = cell[1] * maze.tileSize - camera.y;
            if (x + maze.tileSize < 0 || y + maze.tileSize < 0 || x > window.innerWidth || y > window.innerHeight) continue;
            ctx.fillRect(x, y, maze.tileSize, maze.tileSize);
        }
    }
    ctx.restore();
}

// 绘制交互提示
function drawInteractPrompt() {
    const target = getNearestInteractable();
    if (!target) return;
    let text = "";
    if (target.type === "item") {
        const item = target.target;
                if (item.type === "whetstone") text = item.cooldown > 0 ? "磨刀石冷却 " + Math.ceil(item.cooldown) + "s" : "E 使用磨刀石";
        if (item.type === "oil") text = item.cooldown > 0 ? "机油冷却 " + Math.ceil(item.cooldown) + "s" : "E 使用机油";
    }
    if (target.type === "door") text = player.keys > 0 ? "E 开门" : "需要钥匙";
    if (target.type === "portal") {
        const insertedCount = Object.values(target.target.inserted || {}).filter(Boolean).length;
        const heldCount = Number(player.gems.red) + Number(player.gems.yellow) + Number(player.gems.blue);
        text = target.target.active ? "进入传送门" : heldCount > 0 ? "E 镶嵌宝石  " + insertedCount + "/3" : "传送门宝石 " + insertedCount + "/3";
    }
    if (!text) return;
    ctx.save();
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const x = window.innerWidth / 2;
    const y = window.innerHeight - 92;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "white";
    ctx.fillText(text, x, y);
    ctx.restore();
}

// 绘制状态栏
// 绘制状态栏
function drawMouseRightIcon(cx, cy, scale = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-18, -26, 36, 52, 16);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, -5);
    ctx.stroke();
    ctx.fillStyle = "#ff6767";
    ctx.beginPath();
    ctx.roundRect(1, -24, 15, 18, [0, 12, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("右键", 0, 11);
    ctx.restore();
}

function drawTrapQte() {
    if (!trapQte.active) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.42;
    ctx.save();
    if (trapQte.phase === "warning") {
        const pulse = 0.65 + Math.sin(timeNow * 0.018) * 0.25;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#ff6868";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 54, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawMouseRightIcon(cx, cy, 0.95);
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "black";
        ctx.strokeText("陷阱！准备判定", cx, cy + 82);
        ctx.fillStyle = "#ff8b8b";
        ctx.fillText("陷阱！准备判定", cx, cy + 82);
        ctx.restore();
        return;
    }
    const r = 72;
    ctx.fillStyle = "rgba(0,0,0,0.76)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#8fd69a";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, trapQte.successStart, trapQte.successStart + trapQte.successSize);
    ctx.stroke();
    ctx.strokeStyle = "#ffd966";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, trapQte.greatStart, trapQte.greatStart + trapQte.greatSize);
    ctx.stroke();
    const nx = cx + Math.cos(trapQte.needleAngle) * r;
    const ny = cy + Math.sin(trapQte.needleAngle) * r;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.fillStyle = "#ff5d5d";
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawMouseRightIcon(cx, cy, 0.72);
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("绿色：成功   金色：高精准", cx, cy + 112);
    ctx.restore();
}

function drawWeaponHud() {
    const mainWeaponId = weaponState.current;
    const subWeaponId = weaponState.current === "pistol" ? weaponState.secondary : "pistol";
    const baseX = 86;
    const baseY = window.innerHeight - 86;
    const mainR = 42;
    const subR = 28;
    const anim = weaponState.uiSwap > 0 ? weaponState.uiSwap / 0.22 : 0;
    const ease = 1 - Math.pow(1 - anim, 2);
    const slide = ease * 16;
    function drawSlot(cx, cy, r, weaponId, active, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = active ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = active ? 3 : 2;
        ctx.strokeStyle = active ? "white" : "rgba(255,255,255,0.55)";
        ctx.stroke();
        if (weaponId) {
            const image = getWeaponSprite(weaponId);
            if (image && image.complete && image.naturalWidth) {
                const size = r * 1.35;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(active ? -0.20 : 0.14);
                ctx.drawImage(image, -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        }
        ctx.restore();
    }
    drawSlot(baseX + (mainWeaponId === "pistol" ? 0 : slide), baseY, mainR, mainWeaponId, true);
    drawSlot(baseX + 66 - (mainWeaponId === "pistol" ? slide * 0.45 : 0), baseY + 20, subR, subWeaponId, false, subWeaponId ? 1 : 0.35);
    const weapon = weapons[mainWeaponId];
    let ammoText = "";
    if (weapon.type === "gun") ammoText = weapon.mag + "/" + (mainWeaponId === "pistol" || sceneState.horde ? "∞" : weapon.reserve);
    else ammoText = Math.ceil(weapon.durability) + "/∞";
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "22px sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "black";
    ctx.strokeText(ammoText, baseX + 56, baseY - 2);
    ctx.fillStyle = "white";
    ctx.fillText(ammoText, baseX + 56, baseY - 2);
    ctx.restore();
}

function drawGemObjectiveHud() {
    const cx = window.innerWidth / 2;
    if (sceneState.horde) {
        const pulse = 0.72 + Math.sin(timeNow * 0.012) * 0.28;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = "bold 28px sans-serif";
        ctx.lineWidth = 7;
        ctx.strokeStyle = "rgba(30,0,0,0.95)";
        ctx.strokeText("你已暴露，逃命吧", cx, 18);
        ctx.fillStyle = "rgba(255,45,45," + pulse + ")";
        ctx.fillText("你已暴露，逃命吧", cx, 18);
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "16px sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.strokeText("集齐三颗宝石激活传送门，逃离此地", cx, 10);
    ctx.fillStyle = "white";
    ctx.fillText("集齐三颗宝石激活传送门，逃离此地", cx, 10);
    const t = Math.ceil(sceneState.timer);
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(t % 60).padStart(2, "0");
    ctx.font = "bold 24px sans-serif";
    ctx.strokeText(mm + ":" + ss, cx, 34);
    ctx.fillText(mm + ":" + ss, cx, 34);
    const colors = ["red", "yellow", "blue"];
    const images = {red: assets.gemRed, yellow: assets.gemYellow, blue: assets.gemBlue};
    const startX = cx - 42;
    for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const x = startX + i * 42;
        const y = 76;
        const active = !!player.gems[color] || !!(maze.portal && maze.portal.inserted && maze.portal.inserted[color]);
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = active ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.55)";
        ctx.fill();
        ctx.strokeStyle = active ? "white" : "rgba(255,255,255,0.35)";
        ctx.lineWidth = active ? 2.5 : 1.5;
        ctx.stroke();
        const image = images[color];
        if (active && image && image.complete && image.naturalWidth) ctx.drawImage(image, x - 10, y - 10, 20, 20);
    }
    ctx.restore();
}

function drawKeysAndHelp() {
    const startX = 20;
    const y = 48;
    const size = 20;
    for (let i = 0; i < player.keys; i++) {
        const x = startX + i * 18;
        if (assets.key && assets.key.complete && assets.key.naturalWidth) ctx.drawImage(assets.key, x, y, size, size);
    }
    ctx.save();
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    const help = "WASD移动   鼠标左键攻击   鼠标右键QTE   E交互   Q切枪   R换子弹   空格释放技能";
    ctx.strokeText(help, 20, 74);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(help, 20, 74);
    ctx.font = "13px sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    const coinText = "金币  本局 " + sceneState.sceneCoins + "   背包 " + sceneState.bankedCoins;
    ctx.strokeText(coinText, 20, 94);
    ctx.fillStyle = "#f1c84a";
    ctx.fillText(coinText, 20, 94);
    ctx.restore();
}

function drawStatus() {
    const healthWidth = 180;
    const healthHeight = 12;
    const x = 20;
    const y = 20;
    ctx.fillStyle = "black";
    ctx.fillRect(x - 3, y - 3, healthWidth + 6, healthHeight + 6);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, healthWidth + 6, healthHeight + 6);
    ctx.fillStyle = "#d74242";
    ctx.fillRect(x, y, healthWidth * getHealthRatio(), healthHeight);
    drawKeysAndHelp();
    drawGemObjectiveHud();
    if (player.stamina < player.maxStamina - 0.1 || player.staminaFlash > 0 || weaponState.chainsawRage) {
        const width = 220;
        const height = 12;
        const sx = (window.innerWidth - width) / 2;
        const sy = window.innerHeight - 48;
        ctx.fillStyle = "black";
        ctx.fillRect(sx - 3, sy - 3, width + 6, height + 6);
        const red = player.staminaFlash > 0 ? Math.min(1, player.staminaFlash) : 0;
        ctx.strokeStyle = red > 0 ? "rgba(255,70,70," + (0.35 + red * 0.65) + ")" : "white";
        ctx.lineWidth = red > 0 ? 4 : 2;
        ctx.strokeRect(sx - 3, sy - 3, width + 6, height + 6);
        ctx.fillStyle = "white";
        ctx.fillRect(sx, sy, width * (player.stamina / player.maxStamina), height);
    }
    drawWeaponHud();
}

function drawRadar() {
    const radius = 76;
    const cx = window.innerWidth - 94;
    const cy = 94;
    const scale = 0.055;
    const rot = -aim.angle - Math.PI / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    function radarPos(wx, wy) {
        const dx = (wx - player.x) * scale;
        const dy = (wy - player.y) * scale;
        return {x: dx * cos - dy * sin, y: dx * sin + dy * cos};
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.translate(cx, cy);
    for (const key of player.exploredTiles) {
        const parts = key.split(",");
        const col = Number(parts[0]);
        const row = Number(parts[1]);
        const p = tileCenter(col, row);
        const pos = radarPos(p.x, p.y);
        if (Math.hypot(pos.x, pos.y) > radius + 8) continue;
        ctx.fillStyle = "#555";
        ctx.fillRect(pos.x - 2.5, pos.y - 2.5, 5, 5);
    }
    for (const roomId of player.exploredRooms) {
        const room = maze.rooms[roomId];
        if (!room) continue;
        const pos = radarPos(room.center.x, room.center.y);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pos.x - 8, pos.y - 8, 16, 16);
        for (const item of maze.items) {
            if (item.collected || item.roomId !== roomId) continue;
            const ip = radarPos(item.x, item.y);
            ctx.fillStyle = item.type === "gem" ? ({red: "#db3f4f", yellow: "#e7c84a", blue: "#4b7de8"}[item.gemColor]) : item.type === "medkit" ? "#2fa85e" : "#ddd";
            ctx.beginPath();
            ctx.arc(ip.x, ip.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for (const item of maze.items) {
        if (item.collected || item.type !== "key") continue;
        const distance = Math.hypot(item.x - player.x, item.y - player.y);
        if (distance > maze.tileSize * 4.2) continue;
        const kp = radarPos(item.x, item.y);
        if (Math.hypot(kp.x, kp.y) > radius - 5) continue;
        ctx.save();
        ctx.translate(kp.x, kp.y);
        ctx.rotate(-rot);
        ctx.strokeStyle = "#3a2b00";
        ctx.fillStyle = "#f4cf43";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(1, -1.5, 8, 3);
        ctx.fillRect(6, 0, 2, 4);
        ctx.restore();
    }
    if (maze.portal && maze.portal.visibleOnRadar) {
        const pos = radarPos(maze.portal.x, maze.portal.y);
        const d = Math.hypot(pos.x, pos.y);
        let x = pos.x;
        let y = pos.y;
        if (d > radius - 10) {
            x = x / d * (radius - 10);
            y = y / d * (radius - 10);
        }
        ctx.fillStyle = "#b06cff";
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// 绘制受伤反馈
// 绘制受伤反馈
function drawDamageOverlay(time) {
    let alpha = 0;
    if (player.hurtFlash > 0) alpha = Math.max(alpha, player.hurtFlash * 0.58);
    if (player.health < 40) {
        const pulse = (Math.sin(time * 0.009) + 1) / 2;
        alpha = Math.max(alpha, 0.13 + pulse * 0.20 * (1 - player.health / 40));
    }
    if (alpha <= 0) return;
    ctx.save();
    const gradient = ctx.createRadialGradient(
        window.innerWidth / 2, window.innerHeight / 2, Math.min(window.innerWidth, window.innerHeight) * 0.12,
        window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight) * 0.72
    );
    gradient.addColorStop(0, "rgba(140,0,0,0)");
    gradient.addColorStop(0.7, "rgba(180,0,0," + (alpha * 0.35) + ")");
    gradient.addColorStop(1, "rgba(220,0,0," + alpha + ")");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    if (player.hurtFlash > 0.45) {
        ctx.globalAlpha = 0.22 + player.hurtFlash * 0.18;
        ctx.fillStyle = "#ff1f1f";
        const band = 18 + player.hurtFlash * 20;
        ctx.fillRect(0, 0, window.innerWidth, band);
        ctx.fillRect(0, window.innerHeight - band, window.innerWidth, band);
        ctx.fillRect(0, 0, band, window.innerHeight);
        ctx.fillRect(window.innerWidth - band, 0, band, window.innerHeight);
    }
    ctx.restore();
}

function drawBlackout() {
    if (danger.blackout <= 0) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawDeathOverlay() {
    if (!sceneState.dead) return;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 44px sans-serif";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";
    ctx.strokeText("你已死亡", window.innerWidth / 2, window.innerHeight / 2 - 70);
    ctx.fillStyle = "#ffdddd";
    ctx.fillText("你已死亡", window.innerWidth / 2, window.innerHeight / 2 - 70);
    const w = 220;
    const h = 54;
    const x = window.innerWidth / 2 - w / 2;
    const y = window.innerHeight / 2 + 5;
    deathUi.button = {x, y, w, h};
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText("重新开始游戏", window.innerWidth / 2, y + h / 2);
    ctx.restore();
}

function restartGame() {
    sceneState.dead = false;
    sceneState.sceneCoins = 0;
    maze.scene = 1;
    player.health = player.maxHealth;
    player.stamina = player.maxStamina;
    player.monsterSlowTime = 0;
    player.invisibleTime = 0;
    player.shields = 0;
    clones.length = 0;
    trapQte.active = false;
    trapQte.phase = "idle";
    weaponState.current = "pistol";
    weaponState.secondary = null;
    weaponState.owned = new Set(["pistol"]);
    weaponState.reloading = false;
    weaponState.triggerDown = false;
    weapons.pistol.mag = weapons.pistol.magSize;
    weapons.rifle.mag = 0;
    weapons.rifle.reserve = 0;
    weapons.shotgun.mag = 0;
    weapons.shotgun.reserve = 0;
    weapons.katana.durability = weapons.katana.maxDurability;
    weapons.chainsaw.durability = weapons.chainsaw.maxDurability;
    monsterExplosionEffects.length = 0;
    notices.length = 0;
    game.style.cursor = "none";
    generateMaze();
    updateCamera();
    aim.angle = 0;
    aim.targetAngle = 0;
    crosshair.distance = crosshair.maxDistance;
    spawnInitialMonsterGroups();
    startCameraFlyIn();
}

// 初始化
function initializeGame() {
    sceneState.dead = false;
    game.style.cursor = "none";
    player.health = player.maxHealth;
    player.shields = 0;
    player.invisibleTime = 0;
    clones.length = 0;
    trapQte.active = false;
    trapQte.phase = "idle";
    weaponState.secondary = null;
    weaponState.owned = new Set(["pistol"]);
    weaponState.current = "pistol";
    generateMaze();
    updateCamera();
    const screen = getPlayerScreenPosition();
    mouse.x = clamp(screen.x + crosshair.maxDistance, 0, window.innerWidth);
    mouse.y = screen.y;
    aim.angle = 0;
    aim.targetAngle = 0;
    crosshair.distance = crosshair.maxDistance;
    spawnInitialMonsterGroups();
}

initializeGame();

// 游戏循环
let timeNow = performance.now();
let lastTime = timeNow;
(function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    timeNow = time;
    weaponState.uiSwap = Math.max(0, weaponState.uiSwap - dt);
    updateCamera();
    updateAim(dt);
    if (!sceneState.dead) {
        updatePlayer(dt);
        updateCamera();
        updateAim(dt);
        updateSceneTimer(dt);
        updateMonsterSpawner(dt);
        updateMonsters(dt);
        updateWeapon(dt);
        updateBullets(dt);
        updateItems(dt);
        updateTrapEffects(dt);
        updateTrapQte(dt);
        updateDangerFlicker(dt);
        updateThunder(dt);
        updateNotices(dt);
        updateMonsterExplosionEffects(dt);
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawMaze();
    drawLamps();
    drawItems();
    drawPortal();
    drawTrapEffects();
    drawBullets();
    drawMonsters();
    drawMonsterExplosionEffects();
    drawClones();
    drawDashTrail();
    ctx.restore();
    drawVisionMask();
    drawLampGlow();
    drawClosedRoomDarkness();
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawPlayer();
    ctx.restore();
    drawThunderFlash();
    drawCrosshair();
    drawInteractPrompt();
    drawStatus();
    drawRadar();
    drawTrapQte();
    drawNotices();
    drawDamageOverlay(time);
    drawBlackout();
    drawDeathOverlay();
    requestAnimationFrame(gameLoop);
})(lastTime);
