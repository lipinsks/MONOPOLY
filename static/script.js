let myPlayerName = localStorage.getItem('monopoly_username') || "Widz";
let currentRoomId = null;
let syncInterval = null;

const diceChars = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']; 

// INIT MOTYWU
function initTheme() {
    let savedTheme = localStorage.getItem('monopoly_theme') || 'system';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    if (theme === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
    } else if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }
}

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if(localStorage.getItem('monopoly_theme') === 'system') applyTheme('system');
});

function switchTab(tabId) {
    document.querySelectorAll('.container').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'flex';
    event.target.classList.add('active');
}

let playerColors = {};
let lastState = null;

function init() { 
    initTheme();
    generatePlayerInputs();
    showLobby(); 
}

window.addEventListener('resize', () => {
    if (document.getElementById('pawns-layer')) arrangePawns();
});

function showLobby() {
    currentRoomId = null;
    if(syncInterval) clearInterval(syncInterval);
    document.getElementById('lobby-screen').style.display = 'flex';
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-wrapper').style.display = 'none';
    document.querySelector('.nav').style.display = 'none';
    document.getElementById('bottom-console').style.display = 'none';
    document.getElementById('trade-alert').style.display = 'none';
    fetchRooms();
    syncInterval = setInterval(fetchRooms, 2000);
}

function hideLobby() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.querySelector('.nav').style.display = 'flex';
    document.getElementById('main-wrapper').style.display = 'flex';
}

async function fetchRooms() {
    if(currentRoomId) return;
    const res = await fetch('/api/rooms');
    const data = await res.json();
    const list = document.getElementById('rooms-list');
    list.innerHTML = '';
    if(data.rooms.length === 0) {
        list.innerHTML = '<li style="color:#aaa; text-align:center;">Brak aktywnych pokoi. Stworz nowy!</li>';
        return;
    }
    data.rooms.forEach(r => {
        let status = r.started ? `<span style="color:#4caf50;">Gra Trwa (${r.players_count} graczy)</span>` : `<span style="color:#ff9800;">Oczekuje na start...</span>`;
        list.innerHTML += `
            <li style="background:var(--card-bg); padding:15px; border-radius:5px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:1.2rem;">${r.name}</strong><br>
                    <small>${status}</small>
                </div>
                <button class="action-btn" style="width:auto; margin:0; background:#2196f3;" onclick="joinRoom('${r.id}')">Wejdz</button>
            </li>
        `;
    });
}

async function createRoom() {
    const name = document.getElementById('new-room-name').value;
    const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name})
    });
    const data = await res.json();
    if(res.ok) {
        localStorage.setItem(`monopoly_host_${data.room_id}`, 'true');
        joinRoom(data.room_id);
    }
}

function joinRoom(id) {
    currentRoomId = id;
    if(syncInterval) clearInterval(syncInterval);
    document.getElementById('lobby-screen').style.display = 'none';
    fetchState();
    syncInterval = setInterval(fetchState, 500);
}

function leaveRoom() { showLobby(); }

function generatePlayerInputs() {
    const count = parseInt(document.getElementById('setup-count').value) || 2;
    const container = document.getElementById('setup-players-container');
    if (!container) return;
    container.innerHTML = '';
    const defaultNames = ["Gracz 1", "Gracz 2", "Gracz 3", "Gracz 4", "Gracz 5", "Gracz 6"];
    const defaultColors = ["#ff5252", "#00bcd4", "#4caf50", "#ffeb3b", "#9c27b0", "#ff9800"];
    for(let i=0; i<count; i++) {
        container.innerHTML += `
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" id="p-name-${i}" value="${defaultNames[i]}" style="flex:2; padding:6px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px; min-width:80px;">
                <input type="color" id="p-color-${i}" value="${defaultColors[i]}" style="flex:1; height:32px; border:none; cursor:pointer; background:none;">
                <label for="p-ai-${i}" style="display:flex; align-items:center; gap:5px; font-size:0.9rem; flex:1; cursor:pointer;">
                    <input type="checkbox" id="p-ai-${i}" style="width:18px; height:18px;"> AI
                </label>
            </div>
        `;
    }
}

async function submitSetup() {
    const count = parseInt(document.getElementById('setup-count').value);
    
    let players = [];
    for(let i=0; i<count; i++) {
        players.push({
            name: document.getElementById(`p-name-${i}`).value.trim(),
            color: document.getElementById(`p-color-${i}`).value,
            is_ai: document.getElementById(`p-ai-${i}`).checked
        });
    }
    const res = await fetch(`/api/${currentRoomId}/setup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({players: players})
    });
    if(res.ok) {
        document.getElementById('setup-screen').style.display = 'none';
        const firstHuman = players.find(p => !p.is_ai);
        myPlayerName = firstHuman ? firstHuman.name : "Widz";
        fetchState();
    } else {
        const err = await res.json();
        alert(err.error);
    }
}

function changeRole() {
    myPlayerName = document.getElementById('role-select').value;
    localStorage.setItem('monopoly_username', myPlayerName);
    fetchState();
}

async function restartGame() {
    const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
    if(lastState && lastState.enforce_permissions && !isHost) {
        alert("Tylko Host moze restartowac gre!");
        return;
    }
    if(!confirm("Czy na pewno chcesz zrestartowac pokoj?")) return;
    const res = await fetch(`/api/${currentRoomId}/restart`, { method: 'POST' });
    if(res.ok) { fetchState(); }
}

async function renamePlayer(idx, oldName) {
    const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
    if(lastState && lastState.enforce_permissions && !isHost) {
        alert("Tylko Host moze zmieniac nazwy!");
        return;
    }
    const newName = prompt(`Zmien nazwe dla ${oldName}:`, oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        const cleanName = newName.trim();
        const res = await fetch(`/api/${currentRoomId}/action`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'RENAME_PLAYER', player_index: idx, new_name: cleanName})
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.error);
        } else {
            if(myPlayerName === oldName) {
                myPlayerName = cleanName;
                localStorage.setItem('monopoly_username', myPlayerName);
            }
            fetchState();
        }
    }
}

function openSettings() {
    if(!lastState) return;
    document.getElementById('settings-modal').style.display = 'block';
    const savedTheme = localStorage.getItem('monopoly_theme') || 'system';
    document.getElementById('theme-select').value = savedTheme;
    
    if(lastState.ai_delay !== undefined) {
        document.getElementById('ai-speed-slider').value = lastState.ai_delay;
        document.getElementById('ai-speed-val').innerText = lastState.ai_delay + 's';
    }
    if(lastState.max_turns !== undefined) {
        document.getElementById('settings-max-turns').value = lastState.max_turns;
    }
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function changeTheme() {
    const theme = document.getElementById('theme-select').value;
    localStorage.setItem('monopoly_theme', theme);
    applyTheme(theme);
}

function updateSpeedVal() {
    document.getElementById('ai-speed-val').innerText = document.getElementById('ai-speed-slider').value + 's';
}

async function saveSpeed() {
    const speed = document.getElementById('ai-speed-slider').value;
    if(!currentRoomId) return;
    await fetch(`/api/${currentRoomId}/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ai_delay: speed})
    });
}

async function saveSettings() {
    const maxT = document.getElementById('settings-max-turns').value;
    if(!currentRoomId) return;
    await fetch(`/api/${currentRoomId}/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({max_turns: maxT})
    });
}

async function endGame() {
    if(!confirm("Zakonczyc gre i trwale usunac pokoj?")) return;
    if(!currentRoomId) return;
    await fetch(`/api/${currentRoomId}/settings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({end_game: true})
    });
    closeSettings();
    showLobby();
}

function getTileCenter(index) {
    const tile = document.getElementById(`tile-${index}`);
    if (!tile) return {x: 0, y: 0};
    const x = tile.offsetLeft + tile.offsetWidth / 2;
    const y = tile.offsetTop + tile.offsetHeight / 2;
    return {x, y};
}

function arrangePawns() {
    let tileGroups = {};
    Array.from(document.getElementById('pawns-layer').children).forEach(pawn => {
        if(pawn.dataset.animating === "true") return; 
        let pos = pawn.dataset.pos;
        if(!tileGroups[pos]) tileGroups[pos] = [];
        tileGroups[pos].push(pawn);
    });
    
    for(let pos in tileGroups) {
        let pawns = tileGroups[pos];
        let center = getTileCenter(parseInt(pos));
        if(pawns.length === 1) {
            pawns[0].style.left = center.x + 'px';
            pawns[0].style.top = center.y + 'px';
        } else {
            let radius = 12;
            let angleStep = (Math.PI * 2) / pawns.length;
            pawns.forEach((pawn, idx) => {
                let angle = idx * angleStep;
                pawn.style.left = (center.x + Math.cos(angle) * radius) + 'px';
                pawn.style.top = (center.y + Math.sin(angle) * radius) + 'px';
            });
        }
    }
}

function animatePawn(pawnEl, startPos, endPos, inJail, callback) {
    let steps = 0;
    let directJump = false;
    let stepDirection = 1; 
    
    if (inJail && endPos === 10) {
        steps = 1; directJump = true;
    } else if (endPos < startPos) {
        if (startPos - endPos <= 12) {
             steps = startPos - endPos;
             stepDirection = -1;
        } else {
             steps = (endPos - startPos + 40) % 40; 
        }
    } else {
        steps = endPos - startPos;
    }
    
    if (steps === 0) { callback(); return; }
    
    let durationPerStep = directJump ? 500 : 200; 
    let totalDuration = steps * durationPerStep;
    if(totalDuration > 1500) totalDuration = 1500; 
    
    let startTime = performance.now();
    
    function step(currentTime) {
        let elapsed = currentTime - startTime;
        let progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            callback();
            return;
        }
        
        let currentStepFloat = progress * steps;
        let currentStepIndex = Math.floor(currentStepFloat);
        let stepProgress = currentStepFloat - currentStepIndex;
        
        let t1, t2;
        if (directJump) {
            t1 = startPos;
            t2 = endPos;
        } else {
            t1 = (startPos + currentStepIndex * stepDirection + 40) % 40;
            t2 = (startPos + (currentStepIndex + 1) * stepDirection + 40) % 40;
        }
        
        let c1 = getTileCenter(t1);
        let c2 = getTileCenter(t2);
        
        let baseX = c1.x + (c2.x - c1.x) * stepProgress;
        let baseY = c1.y + (c2.y - c1.y) * stepProgress;
        
        let bounceHeight = directJump ? 80 : 30;
        let bounce = Math.sin(stepProgress * Math.PI) * bounceHeight; 
        
        pawnEl.style.left = baseX + 'px';
        pawnEl.style.top = (baseY - bounce) + 'px';
        
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderBoard(data) {
    const boardEl = document.getElementById('board');
    if(boardEl.innerHTML.trim() === '') {
        boardEl.innerHTML = '<div class="tile empty-center"><div class="logo-text">MONOPOLY</div></div>';
        
        data.board.forEach((tile, index) => {
            const div = document.createElement('div');
            div.id = `tile-${index}`;
            div.className = 'tile' + (tile.is_mortgaged ? ' mortgaged' : '');
            div.onclick = () => showDeed(index);
            
            let col=1, row=1;
            if (index <= 10) { col = 11 - index; row = 11; }
            else if (index <= 20) { col = 1; row = 11 - (index - 10); }
            else if (index <= 30) { col = 1 + (index - 20); row = 1; }
            else { col = 11; row = 1 + (index - 30); }
            div.style.gridColumn = col; div.style.gridRow = row;
            
            boardEl.appendChild(div);
        });
    }
    
    playerColors = {};
    data.players.forEach(p => { playerColors[p.name] = p.color; });
    
    data.board.forEach((tile, index) => {
        const div = document.getElementById(`tile-${index}`);
        div.className = 'tile' + (tile.is_mortgaged ? ' mortgaged' : '');
        
        let html = '';
        if (tile.group && !tile.is_mortgaged) {
            html += `<div class="group-bar" style="background-color: ${tile.group}"></div>`;
            if (tile.houses > 0) {
                html += `<div class="buildings">`;
                if (tile.houses === 5) html += `<div class="hotel"></div>`;
                else for(let i=0; i<tile.houses; i++) html += `<div class="house"></div>`;
                html += `</div>`;
            }
        }
        
        html += `<strong>${tile.name}</strong>`;
        html += `<div class="tile-info">`;
        if (tile.price) html += `<div class="tile-price">$${tile.price}</div>`;
        html += `</div>`;
        
        if (tile.owner) {
            const ownerColor = playerColors[tile.owner] || "#888";
            html += `<div class="owner-indicator" style="background-color: ${ownerColor}"></div>`;
        }
        
        div.innerHTML = html;
    });
}

function updatePawns(players) {
    const layer = document.getElementById('pawns-layer');
    if(!layer) return;
    
    let activeNames = players.filter(p => !p.is_bankrupt).map(p => p.name);
    
    Array.from(layer.children).forEach(child => {
        if(!activeNames.includes(child.dataset.name)) {
            child.remove();
        }
    });
    
    let needsArrange = false;
    
    players.filter(p => !p.is_bankrupt).forEach(p => {
        let pawnId = 'pawn-' + p.name.replace(/\s+/g, '-');
        let pawn = document.getElementById(pawnId);
        
        if(!pawn) {
            pawn = document.createElement('div');
            pawn.id = pawnId;
            pawn.className = 'pawn';
            pawn.dataset.name = p.name;
            pawn.style.backgroundColor = p.color || '#888';
            pawn.innerText = p.name.charAt(0).toUpperCase();
            pawn.title = p.name;
            pawn.style.position = 'absolute';
            pawn.style.transform = 'translate(-50%, -50%)';
            pawn.style.transition = 'none'; 
            pawn.style.zIndex = 100;
            layer.appendChild(pawn);
            
            pawn.dataset.pos = p.position;
            needsArrange = true;
        } else {
            let oldPos = parseInt(pawn.dataset.pos);
            if(oldPos !== p.position && pawn.dataset.animating !== "true") {
                pawn.dataset.animating = "true";
                pawn.dataset.pos = p.position; 
                pawn.style.zIndex = 1000;
                animatePawn(pawn, oldPos, p.position, p.in_jail, () => {
                    pawn.dataset.animating = "false";
                    pawn.style.zIndex = 100;
                    arrangePawns();
                });
            }
        }
    });
    
    if(needsArrange) arrangePawns();
}

function renderInventory(forceRedraw = false) {
    if(!lastState) return;
    const select = document.getElementById('inv-player-select');
    let invOpts = lastState.players.map(p=>p.name);
    let invStr = invOpts.join('|');
    let currInvStr = Array.from(select.options).map(o=>o.value).join('|');
    
    if (invStr !== currInvStr || forceRedraw) {
        let curVal = select.value;
        select.innerHTML = '';
        invOpts.forEach(name => { select.innerHTML += `<option value="${name}">${name}</option>`; });
        if(curVal && invOpts.includes(curVal)) select.value = curVal;
        else select.value = (myPlayerName !== "Widz") ? myPlayerName : lastState.current_player;
    }
    
    const selectedPlayer = select.value;
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    const playerTiles = lastState.board.filter(t => t.owner === selectedPlayer);
    const pData = lastState.players.find(p => p.name === selectedPlayer);
    
    if(playerTiles.length === 0 && (!pData || pData.get_out_of_jail_cards === 0)) {
        grid.innerHTML = '<p style="color:#aaa; text-align:center;">Brak przedmiotow w portfelu.</p>';
        return;
    }
    
    if(pData && pData.get_out_of_jail_cards > 0) {
        const card = document.createElement('div');
        card.className = 'inv-card';
        let html = `<div class="deed-header" style="background-color:#9c27b0; color:#fff; font-size:0.85rem; padding:8px 4px; margin:0; border-bottom:2px solid #000;">KARTA SZANSY</div>`;
        html += `<div style="padding: 8px; text-align:center; display:flex; flex-direction:column; justify-content:center; flex-grow:1;">`;
        html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px;">Wyjdz bezplatnie z wiezienia</p>`;
        html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px; color:#2196f3;">Ilosc: ${pData.get_out_of_jail_cards}</p>`;
        html += `</div>`;
        card.innerHTML = html;
        grid.appendChild(card);
    }
    
    playerTiles.forEach(tile => {
        const card = document.createElement('div');
        card.className = 'inv-card' + (tile.is_mortgaged ? ' mortgaged' : '');
        let bg = tile.group ? tile.group : '#ccc';
        let txtColor = ['gold', 'lightblue', '#ccc', 'yellow'].includes(bg) ? '#000' : '#fff';
        if (tile.type === 'railroad' || tile.type === 'utility') { bg = '#fff'; txtColor = '#000'; }
        
        let html = `<div class="deed-header" style="background-color:${bg}; color:${txtColor}; font-size:0.85rem; padding:8px 4px; margin:0; border-bottom:2px solid #000;">${tile.name}</div>`;
        html += `<div style="padding: 8px; text-align:center; display:flex; flex-direction:column; justify-content:center; flex-grow:1;">`;
        
        let canManage = (selectedPlayer === myPlayerName || !lastState.enforce_permissions) && (lastState.current_player === selectedPlayer);
        
        if (tile.is_mortgaged) {
            html += `<p style="color:#d32f2f; font-weight:bold; margin-top:0; margin-bottom:10px;">ZASTAWIONE</p>`;
            const cost = Math.floor(tile.mortgage * 1.1);
            if (canManage) {
                html += `<button class="action-btn" style="background:#4caf50; padding:6px; font-size:0.85rem;" onclick="sendAction('UNMORTGAGE', ${tile.id})">Wykup ($${cost})</button>`;
            } else {
                html += `<p style="font-size:0.75rem; color:#aaa; margin:0;">Zarzadzaj w swojej turze</p>`;
            }
        } else {
            if(tile.type === 'property') {
                html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px;">Zabudowa: ${tile.houses}</p>`;
            } else {
                html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px;">Aktywna</p>`;
            }
            
            if (canManage) {
                html += `<div style="display:flex; flex-direction:column; gap:5px;">`;
                
                if (tile.type === 'property') {
                    const groupTiles = lastState.board.filter(t => t.group === tile.group);
                    const ownedGroupTiles = groupTiles.filter(t => t.owner === selectedPlayer);
                    const hasMonopoly = (groupTiles.length > 0 && groupTiles.length === ownedGroupTiles.length);
                    const isAnyMortgaged = groupTiles.some(t => t.is_mortgaged);
                    
                    if (hasMonopoly && !isAnyMortgaged && tile.houses < 5) {
                        html += `<button class="action-btn" style="background:#2196f3; padding:6px; font-size:0.85rem;" onclick="sendAction('BUILD', ${tile.id})">Buduj ($${tile.house_cost})</button>`;
                    }
                }
                
                if (tile.houses === 0) {
                    html += `<button class="action-btn" style="background:#f44336; padding:6px; font-size:0.85rem;" onclick="sendAction('MORTGAGE', ${tile.id})">Zastaw (+$${tile.mortgage})</button>`;
                } else {
                    html += `<p style="font-size:0.7rem; color:var(--text-color); margin:0;">Najpierw sprzedaj domy by zastawic.</p>`;
                }
                html += `</div>`;
            } else {
                html += `<p style="font-size:0.75rem; color:#aaa; margin:0;">Zarzadzaj w swojej turze</p>`;
            }
        }
        html += `</div>`;
        card.innerHTML = html;
        grid.appendChild(card);
    });
}

function renderHistory(logs) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    logs.forEach(log => {
        const li = document.createElement('li');
        li.style.padding = '8px 12px';
        li.style.borderBottom = '1px solid var(--border-color)';
        li.style.fontSize = '0.9rem';
        li.innerText = log;
        list.appendChild(li);
    });
}

function updateTradeCheckboxes() {
    if(!lastState) return;
    const targetSelect = document.getElementById('trade-target');
    let proposerName = lastState.enforce_permissions ? myPlayerName : lastState.current_player;
    if (proposerName === "Widz") proposerName = lastState.current_player;
    
    let targetOpts = lastState.players.filter(p => p.name !== proposerName && !p.is_bankrupt).map(p=>p.name);
    let targetStr = targetOpts.join('|');
    let currTargetStr = Array.from(targetSelect.options).map(o=>o.value).join('|');
    
    if (targetStr !== currTargetStr) {
        let curTarget = targetSelect.value;
        targetSelect.innerHTML = '';
        targetOpts.forEach(name => { targetSelect.innerHTML += `<option value="${name}">${name}</option>`; });
        if (curTarget && targetOpts.includes(curTarget)) targetSelect.value = curTarget;
    }
    
    const targetName = targetSelect.value || targetSelect.options[0]?.value;
    const offerContainer = document.getElementById('trade-offer-tiles');
    const reqContainer = document.getElementById('trade-request-tiles');
    const checkedOffers = Array.from(document.querySelectorAll('.offer-tile-chk:checked')).map(el => el.value);
    const checkedReqs = Array.from(document.querySelectorAll('.request-tile-chk:checked')).map(el => el.value);
    
    offerContainer.innerHTML = '';
    lastState.board.filter(t => t.owner === proposerName).forEach(t => {
        const chk = checkedOffers.includes(t.id.toString()) ? 'checked' : '';
        offerContainer.innerHTML += `
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="offer_${t.id}" class="offer-tile-chk" value="${t.id}" ${chk}>
                <label for="offer_${t.id}" style="font-size:0.85rem; cursor:pointer;">${t.name}</label>
            </div>
        `;
    });
    
    reqContainer.innerHTML = '';
    if(targetName) {
        lastState.board.filter(t => t.owner === targetName).forEach(t => {
            const chk = checkedReqs.includes(t.id.toString()) ? 'checked' : '';
            reqContainer.innerHTML += `
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="req_${t.id}" class="request-tile-chk" value="${t.id}" ${chk}>
                    <label for="req_${t.id}" style="font-size:0.85rem; cursor:pointer;">${t.name}</label>
                </div>
            `;
        });
    }
}

function handleTradeAlert(data) {
    const alertBox = document.getElementById('trade-alert');
    if (data.active_trade) {
        let offTiles = data.active_trade.offer_tile_ids.map(id => data.board[id].name).join(', ') || 'brak';
        let reqTiles = data.active_trade.request_tile_ids.map(id => data.board[id].name).join(', ') || 'brak';
        
        document.getElementById('trade-alert-text').innerHTML = `Od <strong>${data.active_trade['from']}</strong>:<br><br><span style="color:#4caf50;">Otrzymuje:</span> <strong>${offTiles} +$${data.active_trade.offer_money}</strong><br><span style="color:#f44336;">Oddaje:</span> <strong>${reqTiles} +$${data.active_trade.request_money}</strong>`;
        
        const me = data.players.find(p => p.name === myPlayerName);
        const isMe = (data.active_trade.to === myPlayerName && me && me.is_human);
        
        let buttonsHtml = '';
        if (isMe) {
            buttonsHtml = `<button onclick="respondTrade(true)" class="action-btn" style="background:#4caf50;">Zgoda</button><button onclick="respondTrade(false)" class="action-btn" style="background:#f44336;">Odrzuc</button>`;
        } else {
            buttonsHtml = `<p style="color:var(--text-color); font-weight:bold; font-size:0.9rem;">Oczekiwanie na decyzje...</p>`;
        }
        document.getElementById('trade-alert-buttons').innerHTML = buttonsHtml;
        alertBox.style.display = 'block';
    } else {
        alertBox.style.display = 'none';
    }
}

function handleTurnPanel(data) {
    const panel = document.getElementById('bottom-console');
    
    const currP = data.players.find(p => p.name === data.current_player);
    const isCurrentPlayerHuman = currP ? currP.is_human : false;
    
    let isMyTurn = false;
    if (myPlayerName !== "Widz") {
        if (data.enforce_permissions) {
            isMyTurn = (data.current_player === myPlayerName && isCurrentPlayerHuman);
        } else {
            isMyTurn = isCurrentPlayerHuman;
        }
    }
    
    const cardDisplay = document.getElementById('turn-card-display');
    if(data.turn_card) {
        cardDisplay.innerText = "Karta: " + data.turn_card;
        cardDisplay.style.display = 'block';
    } else { 
        cardDisplay.style.display = 'none'; 
    }

    const diceDisplay = document.getElementById('turn-dice-display');
    if(data.turn_dice) {
        let d1 = diceChars[data.turn_dice[0]];
        let d2 = diceChars[data.turn_dice[1]];
        diceDisplay.innerHTML = `<span class="dice-icon">${d1}</span><span class="dice-icon">${d2}</span>`;
        diceDisplay.style.display = 'block';
    } else { 
        diceDisplay.style.display = 'none'; 
    }
    
    document.getElementById('turn-info-display').innerText = `Tura ${data.turns} /${data.max_turns}`;
    
    if (data.active_trade) {
        document.getElementById('console-title').innerText = "Wymiana";
        document.getElementById('turn-actions').style.display = 'none';
        
        if (data.active_trade.to === myPlayerName) {
            document.getElementById('turn-message-display').innerText = "Oczekujaca oferta. Podejmij decyzje w oknie wyzej.";
            panel.style.borderTopColor = '#4caf50';
        } else if (data.active_trade.from === myPlayerName) {
            document.getElementById('turn-message-display').innerText = "Czekasz na odpowiedz gracza...";
            panel.style.borderTopColor = '#ff9800';
        } else {
            document.getElementById('turn-message-display').innerText = "Trwaja negocjacje handlowe...";
            panel.style.borderTopColor = '#ff9800';
        }
        panel.style.display = 'flex';
        return; 
    }
    
    if (isMyTurn && data.waiting_for_human) {
        document.getElementById('console-title').innerText = (data.enforce_permissions && data.current_player === myPlayerName) ? `Twoja Tura!` : `Tura: ${data.current_player}`;
        
        if (data.human_action === 'BUY') panel.style.borderTopColor = '#4caf50';
        else if (data.human_action === 'ROLL') panel.style.borderTopColor = '#2196f3';
        else panel.style.borderTopColor = '#f44336';
        
        document.getElementById('turn-message-display').innerText = data.turn_message;
        
        if (currP && currP.in_jail && data.human_action === 'ROLL') {
            document.getElementById('modal-btn-roll').style.display = 'none';
            document.getElementById('modal-btn-jail-pay').style.display = 'block';
            document.getElementById('modal-btn-jail-roll').style.display = 'block';
            document.getElementById('modal-btn-jail-card').style.display = (currP.get_out_of_jail_cards > 0) ? 'block' : 'none';
        } else {
            document.getElementById('modal-btn-roll').style.display = (data.human_action === 'ROLL') ? 'block' : 'none';
            document.getElementById('modal-btn-jail-pay').style.display = 'none';
            document.getElementById('modal-btn-jail-roll').style.display = 'none';
            document.getElementById('modal-btn-jail-card').style.display = 'none';
        }
        document.getElementById('modal-btn-buy').style.display = (data.human_action === 'BUY') ? 'block' : 'none';
        document.getElementById('modal-btn-pass').style.display = (data.human_action === 'BUY') ? 'block' : 'none';
        document.getElementById('modal-btn-ack').style.display = (data.human_action === 'ACKNOWLEDGE') ? 'block' : 'none';
        
        document.getElementById('turn-actions').style.display = 'flex';
        panel.style.display = 'flex';
    } else {
        document.getElementById('console-title').innerText = `Tura: ${data.current_player}`;
        panel.style.borderTopColor = '#555';
        document.getElementById('turn-actions').style.display = 'none';
        
        let mainLog = data.winner ? `WYGRYWA: ${data.winner}` : data.latest_log;
        document.getElementById('turn-message-display').innerText = data.waiting_for_human ? mainLog : data.turn_message;
        panel.style.display = 'flex';
    }
}

async function fetchState() {
    if(!currentRoomId) return;
    const res = await fetch(`/api/${currentRoomId}/state`);
    if(!res.ok) { leaveRoom(); return; }
    const data = await res.json();
    if(data.game_started === false && !data.room_name) {
        leaveRoom();
        return;
    }
    
    lastState = data;
    const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
    const roleSel = document.getElementById('role-select');
    
    if (data.game_started) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('main-wrapper').style.display = 'flex';
        document.querySelector('.nav').style.display = 'flex';
        
        let roleStr = "Widz|" + data.players.filter(p=>p.is_human).map(p=>p.name).join('|');
        let currRoleStr = Array.from(roleSel.options).map(o=>o.value).join('|');
        if(roleStr !== currRoleStr) {
            let val = roleSel.value;
            roleSel.innerHTML = `<option value="Widz">Widz</option>`;
            data.players.filter(p=>p.is_human).forEach(p => {
                roleSel.innerHTML += `<option value="${p.name}">${p.name}</option>`;
            });
            if(val && Array.from(roleSel.options).some(o => o.value === val)) roleSel.value = val;
            else if (myPlayerName && Array.from(roleSel.options).some(o => o.value === myPlayerName)) roleSel.value = myPlayerName;
            else { roleSel.value = "Widz"; myPlayerName = "Widz"; }
        }
    } else {
        document.getElementById('setup-screen').style.display = 'flex';
        document.getElementById('setup-room-name').innerText = data.room_name;
        if (!isHost) {
            document.getElementById('setup-controls').style.display = 'none';
            document.getElementById('setup-waiting').style.display = 'block';
        } else {
            document.getElementById('setup-controls').style.display = 'block';
            document.getElementById('setup-waiting').style.display = 'none';
        }
    }
    
    if(!data.game_started) return;
    
    document.getElementById('btn-restart').style.display = (isHost || !data.enforce_permissions) ? 'block' : 'none';
    
    handleTurnPanel(data);
    handleTradeAlert(data);
    renderBoard(data);
    updatePawns(data.players); 
    renderInventory();
    renderHistory(data.history_logs);
    updateTradeCheckboxes();
    
    const sb = document.getElementById('scoreboard');
    sb.innerHTML = '';
    data.players.forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = `player-card ${p.is_bankrupt ? 'bankrupt' : ''}`;
        li.style.borderColor = p.color || "#888";
        let editIcon = (p.is_human && (isHost || !data.enforce_permissions)) ? `<span style="cursor:pointer; margin-left:10px;" title="Zmien nazwe" onclick="renamePlayer(${idx}, '${p.name}')">✏️</span>` : '';
        let aiIcon = p.is_human ? "" : "🤖 ";
        li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><strong style="font-size:1.1rem;">${aiIcon}${p.name} ${editIcon}</strong></div>Gotowka:$${p.money}<br>Posiadlosci:${p.properties}`;
        sb.appendChild(li);
    });
}

async function sendAction(action, tile_id=null) {
    if(!currentRoomId) return;
    
    if (myPlayerName === 'Widz') { 
        alert("Jestes widzem i nie mozesz sterowac gra!"); 
        return; 
    }
    
    const turnActions = ['ROLL', 'BUY', 'PASS', 'ACKNOWLEDGE', 'JAIL_PAY', 'JAIL_ROLL', 'JAIL_CARD', 'BUILD', 'MORTGAGE', 'UNMORTGAGE'];
    if (turnActions.includes(action) && lastState.enforce_permissions && lastState.current_player !== myPlayerName) { 
        alert("To nie Twoja tura!"); 
        return; 
    }

    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: action, tile_id: tile_id})
    });
    if (!res.ok) { const err = await res.json(); alert(err.error); }
    fetchState();
}

async function proposeMultiTrade() {
    if(!currentRoomId) return;
    if(myPlayerName === 'Widz') { alert("Widzowie nie moga proponowac wymian!"); return; }
    
    let proposerName = lastState.enforce_permissions ? myPlayerName : lastState.current_player;
    if (lastState.enforce_permissions && myPlayerName !== lastState.current_player) {
        alert("Wymiany mozesz proponowac tylko w swojej turze!");
        return;
    }
    
    const target = document.getElementById('trade-target').value;
    let offerIds = [];
    document.querySelectorAll('.offer-tile-chk:checked').forEach(el => { offerIds.push(parseInt(el.value)); });
    let requestIds = [];
    document.querySelectorAll('.request-tile-chk:checked').forEach(el => { requestIds.push(parseInt(el.value)); });
    const offMoney = document.getElementById('trade-offer-money').value;
    const reqMoney = document.getElementById('trade-request-money').value;
    const offCards = document.getElementById('trade-offer-cards').value;
    const reqCards = document.getElementById('trade-request-cards').value;
    
    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'PROPOSE_TRADE', from_player: proposerName, target_player: target,
            offer_tile_ids: offerIds, request_tile_ids: requestIds, offer_money: offMoney, request_money: reqMoney,
            offer_cards: offCards, request_cards: reqCards
        })
    });
    if(res.ok) { switchTab('board-tab'); }
    else { const err = await res.json(); alert(err.error); }
}

async function respondTrade(accept) {
    if(!currentRoomId) return;
    if(myPlayerName === 'Widz') { alert("Widzowie nie moga odpowiadac na wymiany!"); return; }
    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'RESPOND_TRADE', accept: accept})
    });
    if(!res.ok) { const err = await res.json(); alert(err.error); }
    fetchState();
}

function showDeed(index) {
    if(!lastState) return;
    const tile = lastState.board[index];
    if(!tile.price) return;
    const modal = document.getElementById('deed-modal');
    const details = document.getElementById('deed-details');
    let html = ``;
    if(tile.type === 'property') {
        html += `<div class="deed-header" style="background-color:${tile.group}; color:${['gold','lightblue'].includes(tile.group)?'#000':'#fff'};">TITLE DEED<br>${tile.name}</div>`;
        html += `<div class="deed-body"><div style="text-align:center; margin-bottom:8px;">Rent $${tile.rents[0]}</div>`;
        html += `<div class="deed-row"><span>1 House</span><span>$${tile.rents[1]}</span></div>`;
        html += `<div class="deed-row"><span>2 Houses</span><span>$${tile.rents[2]}</span></div>`;
        html += `<div class="deed-row"><span>3 Houses</span><span>$${tile.rents[3]}</span></div>`;
        html += `<div class="deed-row"><span>4 Houses</span><span>$${tile.rents[4]}</span></div>`;
        html += `<div class="deed-row"><span>HOTEL</span><span>$${tile.rents[5]}</span></div>`;
        html += `<div class="deed-footer">Mortgage $${tile.mortgage}<br>House cost $${tile.house_cost}</div></div>`;
    } else if (tile.type === 'railroad') {
        html += `<div class="deed-header" style="background-color:#fff; color:#000;">${tile.name}</div>`;
        html += `<div class="deed-body"><div class="deed-row"><span>1 RR</span><span>$${tile.rents[0]}</span></div>`;
        html += `<div class="deed-row"><span>2 RRs</span><span>$${tile.rents[1]}</span></div>`;
        html += `<div class="deed-row"><span>3 RRs</span><span>$${tile.rents[2]}</span></div>`;
        html += `<div class="deed-row"><span>4 RRs</span><span>$${tile.rents[3]}</span></div>`;
        html += `<div class="deed-footer">Mortgage $${tile.mortgage}</div></div>`;
    } else if (tile.type === 'utility') {
        html += `<div class="deed-header" style="background-color:#fff; color:#000;">${tile.name}</div>`;
        html += `<div class="deed-body"><div style="font-size:0.85rem; margin-bottom:8px;">1 Util: 4x roll</div><div style="font-size:0.85rem;">2 Utils: 10x roll</div><div class="deed-footer">Mortgage $${tile.mortgage}</div></div>`;
    }
    details.innerHTML = html;
    modal.style.display = "block";
}

function closeModal() { document.getElementById('deed-modal').style.display = "none"; }
window.onclick = function(event) { if (event.target == document.getElementById('deed-modal')) closeModal(); }
window.onload = init;
