let myPlayerName = localStorage.getItem('monopoly_username') || "Widz";
let currentRoomId = null;
let syncInterval = null;

function switchTab(tabId) {
    document.querySelectorAll('.container').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).style.display = 'flex';
    event.target.classList.add('active');
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

let playerColors = {};
let lastState = null;

function init() { showLobby(); }

function showLobby() {
    currentRoomId = null;
    if(syncInterval) clearInterval(syncInterval);
    document.getElementById('lobby-screen').style.display = 'flex';
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-wrapper').style.display = 'none';
    document.querySelector('.nav').style.display = 'none';
    document.getElementById('bottom-console').style.display = 'none';
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
            <li style="background:#333; padding:15px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
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
    hideLobby();
    fetchState();
    syncInterval = setInterval(fetchState, 500);
}

function leaveRoom() { showLobby(); }

function generatePlayerInputs() {
    const count = parseInt(document.getElementById('setup-count').value);
    const container = document.getElementById('setup-players-container');
    container.innerHTML = '';
    const defaultNames = ["Gracz 1", "Gracz 2", "Gracz 3", "Gracz 4", "Gracz 5", "Gracz 6"];
    const defaultColors = ["#ff5252", "#00bcd4", "#4caf50", "#ffeb3b", "#9c27b0", "#ff9800"];
    for(let i=0; i<count; i++) {
        container.innerHTML += `
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" id="p-name-${i}" value="${defaultNames[i]}" style="flex:2; padding:6px; background:#333; color:#fff; border:1px solid #555; border-radius:4px; min-width:80px;">
                <input type="color" id="p-color-${i}" value="${defaultColors[i]}" style="flex:1; height:32px; border:none; cursor:pointer; background:none;">
                <label style="display:flex; align-items:center; gap:5px; font-size:0.9rem; flex:1;">
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
        showToast("Tylko Host moze restartowac gre!");
        return;
    }
    if(!confirm("Czy na pewno chcesz zrestartowac pokoj?")) return;
    const res = await fetch(`/api/${currentRoomId}/restart`, { method: 'POST' });
    if(res.ok) { showToast("Zrestartowano gre!"); fetchState(); }
}

async function renamePlayer(idx, oldName) {
    const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
    if(lastState && lastState.enforce_permissions && !isHost) {
        showToast("Tylko Host moze zmieniac nazwy!");
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
            showToast(err.error);
        } else {
            if(myPlayerName === oldName) {
                myPlayerName = cleanName;
                localStorage.setItem('monopoly_username', myPlayerName);
            }
            fetchState();
        }
    }
}

function renderBoard(data) {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '<div class="tile empty-center"><div class="logo-text">MONOPOLY</div></div>';
    
    playerColors = {};
    data.players.forEach(p => { playerColors[p.name] = p.color; });
    
    data.board.forEach((tile, index) => {
        const div = document.createElement('div');
        div.className = 'tile' + (tile.is_mortgaged ? ' mortgaged' : '');
        div.onclick = () => showDeed(index);
        
        // ZACHOWANIE 11x11 (Od 0 do 40 pół po obwodzie)
        let col=1, row=1;
        if (index <= 10) { col = 11 - index; row = 11; }
        else if (index <= 20) { col = 1; row = 11 - (index - 10); }
        else if (index <= 30) { col = 1 + (index - 20); row = 1; }
        else { col = 11; row = 1 + (index - 30); }
        div.style.gridColumn = col; div.style.gridRow = row;
        
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
        
        const pawns = data.players.filter(p => p.position === index && !p.is_bankrupt);
        if (pawns.length > 0) {
            html += `<div class="pawn-container">`;
            pawns.forEach(p => {
                const pawnColor = playerColors[p.name] || "#888";
                const initialLetter = p.name.charAt(0).toUpperCase();
                const isJumping = (p.name === data.current_player && data.turn_dice) ? 'jumping' : '';
                html += `<div class="pawn ${isJumping}" style="background-color: ${pawnColor}" title="${p.name}">${initialLetter}</div>`;
            });
            html += `</div>`;
        }
        
        div.innerHTML = html;
        boardEl.appendChild(div);
    });
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
    
    if(playerTiles.length === 0) {
        grid.innerHTML = '<p style="color:#aaa; text-align:center;">Brak nieruchomosci w portfelu.</p>';
        return;
    }
    
    playerTiles.forEach(tile => {
        const card = document.createElement('div');
        card.className = 'inv-card' + (tile.is_mortgaged ? ' mortgaged' : '');
        let bg = tile.group ? tile.group : '#ccc';
        let txtColor = ['gold', 'lightblue', '#ccc', 'yellow'].includes(bg) ? '#000' : '#fff';
        if (tile.type === 'railroad' || tile.type === 'utility') { bg = '#fff'; txtColor = '#000'; }
        
        let html = `<div class="deed-header" style="background-color:${bg}; color:${txtColor}; font-size:0.85rem; padding:8px 4px; margin:0; border-bottom:2px solid #000;">${tile.name}</div>`;
        html += `<div style="padding: 8px; text-align:center; display:flex; flex-direction:column; justify-content:center; flex-grow:1;">`;
        
        if (tile.is_mortgaged) {
            html += `<p style="color:#d32f2f; font-weight:bold; margin-top:0; margin-bottom:10px;">ZASTAWIONE</p>`;
            const cost = Math.floor(tile.mortgage * 1.1);
            if (selectedPlayer === myPlayerName || !lastState.enforce_permissions) {
                html += `<button class="action-btn" style="background:#4caf50; padding:6px; font-size:0.85rem;" onclick="sendAction('UNMORTGAGE', ${tile.id})">Wykup ($${cost})</button>`;
            }
        } else {
            if(tile.type === 'property') {
                html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px;">Zabudowa: ${tile.houses}</p>`;
            } else {
                html += `<p style="margin-top:0; font-weight:bold; margin-bottom:10px;">Aktywna</p>`;
            }
            
            if (selectedPlayer === myPlayerName || !lastState.enforce_permissions) {
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
                    html += `<p style="font-size:0.7rem; color:#666; margin:0;">Najpierw sprzedaj domy by zastawic.</p>`;
                }
                html += `</div>`;
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
        li.style.borderBottom = '1px solid #333';
        li.style.fontSize = '0.9rem';
        li.innerText = log;
        list.appendChild(li);
    });
}

function updateTradeCheckboxes() {
    if(!lastState) return;
    const targetSelect = document.getElementById('trade-target');
    const proposerName = myPlayerName !== "Widz" ? myPlayerName : lastState.current_player;
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
        offerContainer.innerHTML += `<label style="font-size:0.85rem; display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" class="offer-tile-chk" value="${t.id}" ${chk}> ${t.name}</label>`;
    });
    
    reqContainer.innerHTML = '';
    if(targetName) {
        lastState.board.filter(t => t.owner === targetName).forEach(t => {
            const chk = checkedReqs.includes(t.id.toString()) ? 'checked' : '';
            reqContainer.innerHTML += `<label style="font-size:0.85rem; display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" class="request-tile-chk" value="${t.id}" ${chk}> ${t.name}</label>`;
        });
    }
}

function handleTradeAlert(data) {
    const alertBox = document.getElementById('trade-alert');
    const me = data.players.find(p => p.name === myPlayerName);
    const isHumanUser = me && me.is_human;

    if (data.active_trade && data.active_trade.to === myPlayerName && isHumanUser) {
        let offTiles = data.active_trade.offer_tile_ids.map(id => data.board[id].name).join(', ') || 'brak';
        let reqTiles = data.active_trade.request_tile_ids.map(id => data.board[id].name).join(', ') || 'brak';
        document.getElementById('trade-alert-text').innerHTML = `Od <strong>${data.active_trade['from']}</strong>:<br><br><span style="color:#4caf50;">Dostaniesz:</span> <strong>${offTiles} + $${data.active_trade.offer_money}</strong><br><span style="color:#f44336;">Oddasz:</span> <strong>${reqTiles} + $${data.active_trade.request_money}</strong>`;
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
            isMyTurn = isCurrentPlayerHuman; // W trybie luźnym każdy żywy gracz może klikać za dowolnego człowieka
        }
    }
    
    if (isMyTurn && data.waiting_for_human) {
        document.getElementById('console-title').innerText = (data.enforce_permissions && data.current_player === myPlayerName) ? `Twoja Tura!` : `Tura: ${data.current_player}`;
        
        if (data.human_action === 'BUY') panel.style.borderTopColor = '#4caf50';
        else if (data.human_action === 'ROLL') panel.style.borderTopColor = '#2196f3';
        else panel.style.borderTopColor = '#f44336';
        
        const diceDisplay = document.getElementById('turn-dice-display');
        if(data.turn_dice) {
            diceDisplay.innerHTML = `[Kosci] ${data.turn_dice[0]} + ${data.turn_dice[1]} = <strong>${data.turn_dice[0]+data.turn_dice[1]}</strong>`;
            diceDisplay.style.display = 'block';
        } else { diceDisplay.style.display = 'none'; }
        
        const cardDisplay = document.getElementById('turn-card-display');
        if(data.turn_card) {
            cardDisplay.innerText = "Karta: " + data.turn_card;
            cardDisplay.style.display = 'block';
        } else { cardDisplay.style.display = 'none'; }
        
        document.getElementById('turn-message-display').innerText = data.turn_message;
        
        if (currP && currP.in_jail && data.human_action === 'ROLL') {
            document.getElementById('modal-btn-roll').style.display = 'none';
            document.getElementById('modal-btn-jail-pay').style.display = 'block';
            document.getElementById('modal-btn-jail-roll').style.display = 'block';
        } else {
            document.getElementById('modal-btn-roll').style.display = (data.human_action === 'ROLL') ? 'block' : 'none';
            document.getElementById('modal-btn-jail-pay').style.display = 'none';
            document.getElementById('modal-btn-jail-roll').style.display = 'none';
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
        document.getElementById('turn-message-display').innerText = data.waiting_for_human ? "Oczekuje na ruch..." : data.turn_message;
        document.getElementById('turn-dice-display').style.display = 'none';
        document.getElementById('turn-card-display').style.display = 'none';
        panel.style.display = 'flex';
    }
}

async function fetchState() {
    if(!currentRoomId) return;
    const res = await fetch(`/api/${currentRoomId}/state`);
    if(!res.ok) { leaveRoom(); return; }
    const data = await res.json();
    lastState = data;
    
    const roleSel = document.getElementById('role-select');
    if (data.game_started) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('lobby-screen').style.display = 'none';
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
        const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
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
    
    const isHost = localStorage.getItem(`monopoly_host_${currentRoomId}`) === 'true';
    document.getElementById('btn-restart').style.display = (isHost || !data.enforce_permissions) ? 'block' : 'none';
    document.getElementById('turn-count').innerText = `${data.turns} / ${data.max_turns}`;
    if (!data.winner) document.getElementById('latest-log').innerText = data.latest_log;
    else document.getElementById('latest-log').innerHTML = `WYGRYWA: ${data.winner}`;
    
    handleTurnPanel(data);
    handleTradeAlert(data);
    renderBoard(data);
    renderInventory();
    renderHistory(data.history_logs);
    updateTradeCheckboxes();
    
    const sb = document.getElementById('scoreboard');
    sb.innerHTML = '';
    data.players.forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = `player-card ${p.is_bankrupt ? 'bankrupt' : ''}`;
        li.style.borderColor = p.color || "#888";
        let editIcon = (p.is_human && (isHost || !data.enforce_permissions)) ? `<span style="cursor:pointer;" title="Zmien nazwe" onclick="renamePlayer(${idx}, '${p.name}')">[Edytuj]</span>` : '';
        let aiIcon = p.is_human ? "[G]" : "[AI]";
        li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><strong style="font-size:1.1rem;">${aiIcon}${p.name} ${editIcon}</strong></div>Gotowka:$${p.money}<br>Posiadlosci:${p.properties}`;
        sb.appendChild(li);
    });
}

async function sendAction(action, tile_id=null) {
    if(!currentRoomId) return;
    
    const turnActions = ['ROLL', 'BUY', 'PASS', 'ACKNOWLEDGE', 'JAIL_PAY', 'JAIL_ROLL'];
    if (turnActions.includes(action)) {
        if (myPlayerName === 'Widz') { 
            showToast("Jestes widzem i nie mozesz sterowac gra!"); 
            return; 
        }
        if (lastState.enforce_permissions && lastState.current_player !== myPlayerName) { 
            showToast("To nie Twoja tura!"); 
            return; 
        }
    }

    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: action, tile_id: tile_id})
    });
    if (!res.ok) { const err = await res.json(); showToast(err.error); }
    fetchState();
}

async function proposeMultiTrade() {
    if(!currentRoomId) return;
    if(myPlayerName === 'Widz') { showToast("Widzowie nie handluja!"); return; }
    const target = document.getElementById('trade-target').value;
    let offerIds = [];
    document.querySelectorAll('.offer-tile-chk:checked').forEach(el => { offerIds.push(parseInt(el.value)); });
    let requestIds = [];
    document.querySelectorAll('.request-tile-chk:checked').forEach(el => { requestIds.push(parseInt(el.value)); });
    const offMoney = document.getElementById('trade-offer-money').value;
    const reqMoney = document.getElementById('trade-request-money').value;
    
    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'PROPOSE_TRADE', from_player: myPlayerName, target_player: target,
            offer_tile_ids: offerIds, request_tile_ids: requestIds, offer_money: offMoney, request_money: reqMoney
        })
    });
    if(res.ok) { showToast("Wyslano oferte!"); switchTab('board-tab'); }
    else { const err = await res.json(); showToast(err.error); }
}

async function respondTrade(accept) {
    if(!currentRoomId) return;
    if(myPlayerName === 'Widz') { showToast("Widzowie nie klikaja wymian!"); return; }
    const res = await fetch(`/api/${currentRoomId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'RESPOND_TRADE', accept: accept})
    });
    if(res.ok) { showToast(accept ? "Zaakceptowano!" : "Odrzucono."); document.getElementById('trade-alert').style.display = 'none'; }
    else { const err = await res.json(); showToast(err.error); }
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
