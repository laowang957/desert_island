(() => {
    const api = window.gameMobileApi;
    if (!api) return;

    const style = document.createElement('style');
    style.textContent = `
        :root { --mc-safe-left: env(safe-area-inset-left, 0px); --mc-safe-right: env(safe-area-inset-right, 0px); --mc-safe-bottom: env(safe-area-inset-bottom, 0px); }
        #control-mode-overlay, #mobile-controls, #mobile-rotate-gate { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
        #control-mode-overlay { position:fixed; inset:0; z-index:10050; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.86); backdrop-filter:blur(5px); color:#fff; }
        #control-mode-overlay .panel { width:min(520px,86vw); padding:28px 26px 24px; border:1px solid rgba(255,255,255,.28); border-radius:18px; background:rgba(13,16,22,.94); box-shadow:0 18px 70px rgba(0,0,0,.55); text-align:center; }
        #control-mode-overlay h2 { margin:0 0 9px; font-size:24px; font-weight:650; letter-spacing:.04em; }
        #control-mode-overlay p { margin:0 0 22px; color:rgba(255,255,255,.64); font-size:13px; line-height:1.65; }
        #control-mode-overlay .mode-row { display:flex; gap:14px; }
        #control-mode-overlay button { flex:1; min-height:96px; border-radius:15px; border:1px solid rgba(255,255,255,.28); background:rgba(255,255,255,.055); color:#fff; cursor:pointer; touch-action:manipulation; }
        #control-mode-overlay button:active { transform:scale(.98); background:rgba(255,255,255,.12); }
        #control-mode-overlay .mode-icon { display:block; font-size:28px; margin-bottom:8px; }
        #control-mode-overlay .mode-title { display:block; font-size:17px; font-weight:650; }
        #control-mode-overlay .mode-sub { display:block; font-size:11px; opacity:.55; margin-top:4px; }

        #mobile-controls { position:fixed; inset:0; z-index:9000; pointer-events:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action:none; overscroll-behavior:none; display:none; overflow:hidden; contain:layout style; }
        #mobile-controls.active { display:block; }
        #mobile-controls .mc-touch { pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent; }
        #mobile-controls .mc-aim-zone { position:absolute; left:43%; right:0; top:0; bottom:0; z-index:1; background:transparent; }
        #mc-joystick { position:absolute; left:calc(28px + var(--mc-safe-left)); bottom:calc(22px + var(--mc-safe-bottom)); width:126px; height:126px; border:1.5px solid rgba(255,255,255,.30); border-radius:50%; background:rgba(0,0,0,.18); box-shadow:inset 0 0 28px rgba(255,255,255,.025); z-index:4; }
        #mc-joystick::after { content:""; position:absolute; inset:18px; border:1px solid rgba(255,255,255,.11); border-radius:50%; }
        #mc-stick { position:absolute; width:54px; height:54px; left:36px; top:36px; border-radius:50%; border:1px solid rgba(255,255,255,.48); background:rgba(255,255,255,.13); box-shadow:0 3px 18px rgba(0,0,0,.38); transform:translate3d(0,0,0); will-change:transform; }

        .mc-btn { position:absolute; display:flex; align-items:center; justify-content:center; flex-direction:column; color:#fff; border-radius:50%; border:1.5px solid rgba(255,255,255,.50); background:rgba(8,11,17,.53); text-shadow:0 1px 3px #000; box-shadow:0 4px 20px rgba(0,0,0,.25); z-index:7; }
        .mc-btn:active, .mc-btn.down { background:rgba(255,255,255,.16); transform:scale(.95); }
        .mc-btn .icon { font-size:25px; line-height:1; font-weight:700; }
        .mc-btn .label { font-size:10px; margin-top:3px; opacity:.78; }
        #mc-attack { width:82px; height:82px; right:calc(25px + var(--mc-safe-right)); bottom:calc(26px + var(--mc-safe-bottom)); border-width:2px; }
        #mc-attack .icon { font-size:32px; }
        #mc-skill { width:62px; height:62px; right:calc(112px + var(--mc-safe-right)); bottom:calc(94px + var(--mc-safe-bottom)); }
        #mc-interact { width:59px; height:59px; right:calc(113px + var(--mc-safe-right)); bottom:calc(25px + var(--mc-safe-bottom)); }
        #mc-interact.qte { border-color:#f4f1df; box-shadow:0 0 0 4px rgba(255,255,255,.10),0 0 22px rgba(255,245,200,.42); animation:mcPulse .46s infinite alternate; }
        #mc-reload, #mc-switch { width:43px; height:43px; bottom:calc(160px + var(--mc-safe-bottom)); }
        #mc-run { width:48px; height:48px; left:calc(145px + var(--mc-safe-left)); bottom:calc(30px + var(--mc-safe-bottom)); }
        #mc-run.active { background:rgba(255,255,255,.20); border-color:rgba(255,255,255,.88); box-shadow:0 0 16px rgba(255,255,255,.15); }
        #mc-run.exhausted { opacity:.40; }
        #mc-restart { display:none; position:absolute; left:50%; top:50%; transform:translate(-50%,28px); width:220px; height:56px; border-radius:12px; z-index:30; pointer-events:auto; touch-action:none; color:#fff; border:2px solid rgba(255,255,255,.90); background:rgba(18,20,26,.92); font-size:18px; font-weight:650; }
        #mobile-controls.dead #mc-restart { display:block; }
        #mobile-controls.dead #mc-aim-zone, #mobile-controls.dead #mc-joystick, #mobile-controls.dead #mc-attack, #mobile-controls.dead #mc-skill, #mobile-controls.dead #mc-interact, #mobile-controls.dead #mc-reload, #mobile-controls.dead #mc-switch, #mobile-controls.dead #mc-run { pointer-events:none; opacity:.12; }
        #mc-reload { right:calc(31px + var(--mc-safe-right)); }
        #mc-switch { right:calc(83px + var(--mc-safe-right)); }
        #mc-reload .icon, #mc-switch .icon { font-size:17px; }
        #mc-reload .label, #mc-switch .label { display:none; }
        #mc-skill-name { position:absolute; right:calc(102px + var(--mc-safe-right)); bottom:calc(161px + var(--mc-safe-bottom)); width:126px; color:rgba(255,255,255,.70); font-size:10px; text-align:right; text-shadow:0 1px 4px #000; z-index:5; pointer-events:none; }
        @keyframes mcPulse { from { transform:scale(1); } to { transform:scale(1.08); } }

        #mobile-rotate-gate { position:fixed; inset:0; z-index:10060; display:none; align-items:center; justify-content:center; background:#07090d; color:#fff; text-align:center; padding:30px; }
        #mobile-rotate-gate.show { display:flex; }
        #mobile-rotate-gate .rotate-icon { font-size:46px; margin-bottom:12px; }
        #mobile-rotate-gate .rotate-title { font-size:18px; font-weight:650; }
        #mobile-rotate-gate .rotate-sub { margin-top:8px; font-size:12px; opacity:.55; }

        @media (max-height:520px) {
            #mc-joystick { left:calc(20px + var(--mc-safe-left)); bottom:calc(16px + var(--mc-safe-bottom)); width:104px; height:104px; }
            #mc-stick { width:44px; height:44px; left:30px; top:30px; }
            #mc-attack { width:70px; height:70px; right:calc(18px + var(--mc-safe-right)); bottom:calc(18px + var(--mc-safe-bottom)); }
            #mc-attack .icon { font-size:28px; }
            #mc-skill { width:52px; height:52px; right:calc(94px + var(--mc-safe-right)); bottom:calc(78px + var(--mc-safe-bottom)); }
            #mc-interact { width:50px; height:50px; right:calc(96px + var(--mc-safe-right)); bottom:calc(18px + var(--mc-safe-bottom)); }
            #mc-reload, #mc-switch { width:38px; height:38px; bottom:calc(132px + var(--mc-safe-bottom)); }
            #mc-run { width:43px; height:43px; left:calc(126px + var(--mc-safe-left)); bottom:calc(20px + var(--mc-safe-bottom)); }
            #mc-reload { right:calc(20px + var(--mc-safe-right)); }
            #mc-switch { right:calc(64px + var(--mc-safe-right)); }
            #mc-btn .label { font-size:9px; }
            #mc-skill-name { display:none; }
        }
        @media (max-height:410px) {
            #mc-joystick { left:calc(14px + var(--mc-safe-left)); bottom:calc(10px + var(--mc-safe-bottom)); width:92px; height:92px; }
            #mc-joystick::after { inset:14px; }
            #mc-stick { width:40px; height:40px; left:26px; top:26px; }
            #mc-attack { width:64px; height:64px; right:calc(12px + var(--mc-safe-right)); bottom:calc(12px + var(--mc-safe-bottom)); }
            #mc-skill { width:47px; height:47px; right:calc(81px + var(--mc-safe-right)); bottom:calc(68px + var(--mc-safe-bottom)); }
            #mc-interact { width:46px; height:46px; right:calc(83px + var(--mc-safe-right)); bottom:calc(12px + var(--mc-safe-bottom)); }
            #mc-reload, #mc-switch { width:34px; height:34px; bottom:calc(116px + var(--mc-safe-bottom)); }
            #mc-run { width:39px; height:39px; left:calc(111px + var(--mc-safe-left)); bottom:calc(14px + var(--mc-safe-bottom)); }
            #mc-reload { right:calc(14px + var(--mc-safe-right)); }
            #mc-switch { right:calc(54px + var(--mc-safe-right)); }
            .mc-btn .icon { font-size:20px; }
            .mc-btn .label { font-size:8px; margin-top:2px; }
        }
    `;
    document.head.appendChild(style);

    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';

    const modeOverlay = document.createElement('div');
    modeOverlay.id = 'control-mode-overlay';
    modeOverlay.innerHTML = `
        <div class="panel">
            <h2>选择操作方式</h2>
            <p>本次页面打开后保持该操作方式；通过传送门进入下一场景不会再次询问。刷新页面后可重新选择。</p>
            <div class="mode-row">
                <button id="choose-keyboard"><span class="mode-icon">⌨</span><span class="mode-title">键鼠操作</span><span class="mode-sub">WASD + 鼠标</span></button>
                <button id="choose-mobile"><span class="mode-icon">◉</span><span class="mode-title">手机操作</span><span class="mode-sub">横屏触控</span></button>
            </div>
        </div>`;
    document.body.appendChild(modeOverlay);

    const mobile = document.createElement('div');
    mobile.id = 'mobile-controls';
    mobile.innerHTML = `
        <div id="mc-aim-zone" class="mc-touch mc-aim-zone"></div>
        <div id="mc-joystick" class="mc-touch"><div id="mc-stick"></div></div>
        <div id="mc-skill-name"></div>
        <div id="mc-attack" class="mc-touch mc-btn"><span class="icon">●</span><span class="label">攻击</span></div>
        <div id="mc-skill" class="mc-touch mc-btn"><span class="icon">✦</span><span class="label">技能</span></div>
        <div id="mc-interact" class="mc-touch mc-btn"><span class="icon">◎</span><span class="label">交互</span></div>
        <div id="mc-run" class="mc-touch mc-btn"><span class="icon">走</span><span class="label">走路</span></div>
        <div id="mc-reload" class="mc-touch mc-btn"><span class="icon">↻</span><span class="label">换弹</span></div>
        <div id="mc-switch" class="mc-touch mc-btn"><span class="icon">⇄</span><span class="label">切枪</span></div>
        <button id="mc-restart" class="mc-touch">重新开始游戏</button>`;
    document.body.appendChild(mobile);

    const rotateGate = document.createElement('div');
    rotateGate.id = 'mobile-rotate-gate';
    rotateGate.innerHTML = `<div><div class="rotate-icon">↻</div><div class="rotate-title">请将手机横过来</div><div class="rotate-sub">横屏后游戏会自动继续</div></div>`;
    document.body.appendChild(rotateGate);

    const joystick = mobile.querySelector('#mc-joystick');
    const stick = mobile.querySelector('#mc-stick');
    const aimZone = mobile.querySelector('#mc-aim-zone');
    const attackBtn = mobile.querySelector('#mc-attack');
    const skillBtn = mobile.querySelector('#mc-skill');
    const interactBtn = mobile.querySelector('#mc-interact');
    const runBtn = mobile.querySelector('#mc-run');
    const reloadBtn = mobile.querySelector('#mc-reload');
    const switchBtn = mobile.querySelector('#mc-switch');
    const restartBtn = mobile.querySelector('#mc-restart');
    const skillName = mobile.querySelector('#mc-skill-name');

    let mobileActive = false;
    let joyPointer = null;
    let attackPointer = null;
    let aimPointer = null;
    let attackOrigin = null;
    let aimOrigin = null;
    let joystickRect = null;
    let pendingJoyPoint = null;
    let joyMoveRaf = 0;
    let pendingAimVector = null;
    let aimMoveRaf = 0;
    let runEnabled = false;
    let joyX = 0;
    let joyY = 0;

    function stopEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function setJoystickFromPoint(clientX, clientY) {
        const rect = joystickRect || joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.34;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
        stick.style.transform = `translate3d(${dx}px,${dy}px,0)`;
        const nx = dx / maxR;
        const ny = dy / maxR;
        const mag = Math.min(1, Math.hypot(nx, ny));
        if (mag < 0.12) {
            joyX = 0; joyY = 0;
            api.setMove(0, 0, runEnabled);
        } else {
            joyX = nx; joyY = ny;
            api.setMove(nx, ny, runEnabled);
        }
    }
    function queueJoystickPoint(clientX, clientY) {
        pendingJoyPoint = {x:clientX, y:clientY};
        if (joyMoveRaf) return;
        joyMoveRaf = requestAnimationFrame(() => {
            joyMoveRaf = 0;
            if (!pendingJoyPoint || joyPointer == null) return;
            const point = pendingJoyPoint;
            pendingJoyPoint = null;
            setJoystickFromPoint(point.x, point.y);
        });
    }
    function resetJoystick() {
        joyPointer = null;
        joystickRect = null;
        pendingJoyPoint = null;
        stick.style.transform = 'translate3d(0,0,0)';
        joyX = 0; joyY = 0;
        api.setMove(0,0,runEnabled);
    }

    joystick.addEventListener('pointerdown', e => {
        if (!mobileActive) return;
        stopEvent(e); joyPointer = e.pointerId; joystickRect = joystick.getBoundingClientRect(); joystick.setPointerCapture?.(e.pointerId); setJoystickFromPoint(e.clientX, e.clientY);
    });
    joystick.addEventListener('pointermove', e => { if (e.pointerId === joyPointer) { stopEvent(e); queueJoystickPoint(e.clientX, e.clientY); } });
    joystick.addEventListener('pointerup', e => { if (e.pointerId === joyPointer) { stopEvent(e); resetJoystick(); } });
    joystick.addEventListener('pointercancel', e => { if (e.pointerId === joyPointer) resetJoystick(); });

    function setAimFromVector(dx, dy) {
        // 右侧区域相当于隐形瞄准摇杆。方向由拖动方向决定，拖动长度决定准星距离。
        // 大死区 + 主游戏更慢的转向插值，避免手机上轻轻一划就甩过头。
        const distance = Math.hypot(dx, dy);
        if (distance < 38) return;
        const ratio = Math.max(0, Math.min(1, (distance - 38) / 185));
        if (api.setAim) api.setAim(Math.atan2(dy, dx), 0.18 + ratio * 0.82);
        else api.setAimAngle(Math.atan2(dy, dx));
    }
    function queueAimVector(dx, dy) {
        pendingAimVector = {dx, dy};
        if (aimMoveRaf) return;
        aimMoveRaf = requestAnimationFrame(() => {
            aimMoveRaf = 0;
            if (!pendingAimVector) return;
            const v = pendingAimVector;
            pendingAimVector = null;
            setAimFromVector(v.dx, v.dy);
        });
    }
    aimZone.addEventListener('pointerdown', e => {
        if (!mobileActive) return;
        stopEvent(e); aimPointer = e.pointerId; aimOrigin = {x:e.clientX,y:e.clientY}; aimZone.setPointerCapture?.(e.pointerId);
    });
    aimZone.addEventListener('pointermove', e => {
        if (e.pointerId !== aimPointer || !aimOrigin) return;
        stopEvent(e); queueAimVector(e.clientX - aimOrigin.x, e.clientY - aimOrigin.y);
    });
    aimZone.addEventListener('pointerup', e => { if (e.pointerId === aimPointer) { stopEvent(e); aimPointer=null; aimOrigin=null; pendingAimVector=null; } });
    aimZone.addEventListener('pointercancel', e => { if (e.pointerId === aimPointer) { aimPointer=null; aimOrigin=null; pendingAimVector=null; } });

    attackBtn.addEventListener('pointerdown', e => {
        if (!mobileActive) return;
        stopEvent(e); attackPointer=e.pointerId; attackOrigin={x:e.clientX,y:e.clientY}; attackBtn.classList.add('down'); attackBtn.setPointerCapture?.(e.pointerId); api.attackDown();
    });
    attackBtn.addEventListener('pointermove', e => {
        if (e.pointerId !== attackPointer || !attackOrigin) return;
        stopEvent(e); queueAimVector(e.clientX - attackOrigin.x, e.clientY - attackOrigin.y);
    });
    function releaseAttack(e) {
        if (attackPointer == null || (e && e.pointerId !== attackPointer)) return;
        if (e) stopEvent(e);
        attackPointer=null; attackOrigin=null; attackBtn.classList.remove('down'); api.attackUp();
    }
    attackBtn.addEventListener('pointerup', releaseAttack);
    attackBtn.addEventListener('pointercancel', releaseAttack);

    function tapButton(el, callback) {
        el.addEventListener('pointerdown', e => { if (!mobileActive) return; stopEvent(e); el.classList.add('down'); callback(); });
        const up = e => { if (!mobileActive) return; stopEvent(e); el.classList.remove('down'); };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }
    tapButton(skillBtn, () => api.skill());
    tapButton(interactBtn, () => api.interact());
    tapButton(runBtn, () => {
        runEnabled = !runEnabled;
        runBtn.classList.toggle('active', runEnabled);
        runBtn.querySelector('.label').textContent = runEnabled ? '跑步' : '走路';
        runBtn.querySelector('.icon').textContent = runEnabled ? '跑' : '走';
        api.setMove(joyX, joyY, runEnabled);
    });
    tapButton(reloadBtn, () => api.reload());
    tapButton(switchBtn, () => api.switchWeapon());
    tapButton(restartBtn, () => api.restart?.());


    // 手机游戏模式下彻底拦截浏览器原生触控手势：双击缩放、双指缩放、长按菜单、拖拽和页面滚动。
    function blockNativeGesture(e) {
        if (!mobileActive) return;
        if (e.cancelable) e.preventDefault();
    }
    function blockMultiTouch(e) {
        if (!mobileActive) return;
        if (e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault();
    }
    document.addEventListener('touchmove', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('touchstart', blockMultiTouch, {passive:false, capture:true});
    document.addEventListener('gesturestart', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('gesturechange', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('gestureend', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('dblclick', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('contextmenu', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('dragstart', blockNativeGesture, {passive:false, capture:true});
    document.addEventListener('selectstart', blockNativeGesture, {passive:false, capture:true});

    function isPortrait() { return window.innerHeight > window.innerWidth; }
    function updateOrientationGate() {
        if (!mobileActive) { rotateGate.classList.remove('show'); api.setUiPaused(false); return; }
        const portrait = isPortrait();
        rotateGate.classList.toggle('show', portrait);
        if (portrait) {
            resetJoystick();
            releaseAttack();
            aimPointer = null;
            aimOrigin = null;
            pendingAimVector = null;
        }
        api.setUiPaused(portrait);
    }
    let orientationGateTimer = 0;
    function scheduleOrientationGate() {
        clearTimeout(orientationGateTimer);
        orientationGateTimer = setTimeout(updateOrientationGate, 80);
    }
    window.addEventListener('resize', scheduleOrientationGate, {passive:true});
    window.visualViewport?.addEventListener('resize', scheduleOrientationGate, {passive:true});
    window.addEventListener('orientationchange', scheduleOrientationGate, {passive:true});

    async function tryLandscape() {
        try {
            if (isPortrait() && document.documentElement.requestFullscreen && !document.fullscreenElement) {
                await document.documentElement.requestFullscreen({navigationUI:'hide'});
            }
        } catch (_) {}
        try {
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
        } catch (_) {}
        setTimeout(updateOrientationGate, 100);
    }

    function chooseKeyboard() {
        mobileActive = false;
        api.setMode('keyboard');
        modeOverlay.remove();
        mobile.classList.remove('active');
        rotateGate.classList.remove('show');
        document.documentElement.style.overflow = '';
        document.documentElement.style.touchAction = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.position = '';
        document.body.style.inset = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.webkitTouchCallout = '';
        const gameCanvas = document.getElementById('game-main');
        if (gameCanvas) gameCanvas.style.touchAction = '';
    }
    async function chooseMobile() {
        mobileActive = true;
        api.setMode('mobile');
        modeOverlay.remove();
        mobile.classList.add('active');
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.touchAction = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.body.style.overscrollBehavior = 'none';
        document.body.style.position = 'fixed';
        document.body.style.inset = '0';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.webkitTouchCallout = 'none';
        const gameCanvas = document.getElementById('game-main');
        if (gameCanvas) { gameCanvas.style.touchAction = 'none'; gameCanvas.style.webkitTouchCallout = 'none'; }
        await tryLandscape();
        updateOrientationGate();
    }

    modeOverlay.querySelector('#choose-keyboard').addEventListener('click', chooseKeyboard);
    modeOverlay.querySelector('#choose-mobile').addEventListener('click', chooseMobile);

    let lastQteState = null;
    let lastWeaponName = '';
    function refreshMobileLabels() {
        if (mobileActive) {
            const dead = api.isDead();
            mobile.classList.toggle('dead', dead);
            const staminaRatio = api.getStaminaRatio();
            runBtn.classList.toggle('exhausted', staminaRatio <= 0.001);
            const qte = api.isQteActive();
            if (qte !== lastQteState) {
                lastQteState = qte;
                interactBtn.classList.toggle('qte', qte);
                interactBtn.querySelector('.label').textContent = qte ? 'QTE' : '交互';
                interactBtn.querySelector('.icon').textContent = qte ? '!' : '◎';
            }
            const weapon = api.getWeapon();
            if (weapon !== lastWeaponName) {
                lastWeaponName = weapon;
                skillName.textContent = weapon === 'katana' ? '瞬斩突进' : weapon === 'chainsaw' ? '狂暴冲锋' : '穿墙闪现';
            }
        }
        setTimeout(refreshMobileLabels, 120);
    }
    refreshMobileLabels();
})();
