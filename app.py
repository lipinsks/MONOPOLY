import uuid
import time
import threading
import logging
import sys
import random
from flask import Flask, render_template, jsonify, request
from monopoly import MonopolyGame

log = logging.getLogger('werkzeug')
app = Flask(__name__)

ENFORCE_PERMISSIONS = False
rooms = {}

try:
    from train_ai import SmartAIAgent
    ai_agent = SmartAIAgent(name="LoadedAI")
    ai_agent.load_model("best_model.json")
    ai_agent.epsilon = 0.0
except Exception as e:
    ai_agent = None

def calc_trade_val(tiles, money, evaluator, giver, game):
    val = money
    for t in tiles:
        base = t.get('price', 0)
        group = t.get('group')
        if group:
            owned = sum(1 for pt in evaluator.properties if pt.get('group') == group)
            total = sum(1 for pt in game.board if pt.get('group') == group)
            if owned == total - 1: base *= 3.0
            elif owned > 0: base *= 1.5
        val += base
    return val

def run_game_loop():
    while True:
        try:
            for room_id, room_data in list(rooms.items()):
                game = room_data.get('game')
                ai_delay = float(room_data.get('ai_delay', 1.5))
                
                if game and room_data.get('started'):
                    
                    active = [p for p in game.players if not p.is_bankrupt]
                    if len(active) <= 1 or game.turns >= game.max_turns:
                        continue
                        
                    current_p = game.players[game.current_player_index]
                    
                    # Logika handlu dzialajaca niezaleznie od tury
                    if game.active_trade:
                        target_name = game.active_trade['to']
                        target_p = next((p for p in game.players if p.name == target_name), None)
                        
                        if target_p and not target_p.is_human:
                            time.sleep(ai_delay)
                            p_from = next((p for p in game.players if p.name == game.active_trade['from']), None)
                            if p_from:
                                off_tiles = [t for t in game.board if t['id'] in game.active_trade['offer_tile_ids']]
                                req_tiles = [t for t in game.board if t['id'] in game.active_trade['request_tile_ids']]
                                val_gained = calc_trade_val(off_tiles, game.active_trade['offer_money'], target_p, p_from, game)
                                val_lost = calc_trade_val(req_tiles, game.active_trade['request_money'], p_from, target_p, game)
                                
                                veto = False
                                for t in req_tiles:
                                    g = t.get('group')
                                    if g and game.has_monopoly(target_p, g): veto = True
                                    if g:
                                        owned_by_them = sum(1 for pt in p_from.properties if pt.get('group') == g)
                                        total_in_g = sum(1 for pt in game.board if pt.get('group') == g)
                                        if owned_by_them == total_in_g - 1 and val_gained < (t.get('price', 0) * 3):
                                            veto = True
                                            
                                if target_p.money < game.active_trade['request_money']: veto = True
                                    
                                if not veto and val_gained >= val_lost * 1.05:
                                    if p_from.money >= game.active_trade['offer_money'] and target_p.money >= game.active_trade['request_money']:
                                        p_from.money = p_from.money - game.active_trade['offer_money'] + game.active_trade['request_money']
                                        target_p.money = target_p.money + game.active_trade['offer_money'] - game.active_trade['request_money']
                                        
                                        p_from.get_out_of_jail_cards = p_from.get_out_of_jail_cards - game.active_trade['offer_cards'] + game.active_trade['request_cards']
                                        target_p.get_out_of_jail_cards = target_p.get_out_of_jail_cards + game.active_trade['offer_cards'] - game.active_trade['request_cards']
                                        
                                        for ot in off_tiles:
                                            p_from.properties.remove(ot)
                                            ot['owner'] = target_p
                                            target_p.properties.append(ot)
                                        for rt in req_tiles:
                                            target_p.properties.remove(rt)
                                            rt['owner'] = p_from
                                            p_from.properties.append(rt)
                                        msg = f"{target_p.name} akceptuje oferte wymiany od {p_from.name}."
                                        game.latest_log = msg
                                        game.add_history(msg)
                                else:
                                    msg = f"{target_p.name} odrzuca oferte wymiany od {p_from.name}."
                                    game.latest_log = msg
                                    game.add_history(msg)
                            game.active_trade = None
                        continue
                        
                    if current_p.is_bankrupt:
                        game.next_player()
                        continue
                        
                    # TURA BOTA
                    if not current_p.is_human:
                        req = game.human_action_required
                        valid_actions = []
                        
                        if req == 'ROLL':
                            monopolies = [g for g in set([t.get('group') for t in current_p.properties if t.get('group')]) if game.has_monopoly(current_p, g)]
                            for group in monopolies:
                                group_tiles = [t for t in current_p.properties if t.get('group') == group]
                                if any(t.get('is_mortgaged') for t in group_tiles): continue
                                min_houses = min([t.get('houses', 0) for t in group_tiles])
                                if min_houses < 5:
                                    for t in group_tiles:
                                        if t.get('houses', 0) == min_houses and current_p.money > t.get('house_cost', 50) + 200:
                                            current_p.pay(t['house_cost'], game.board)
                                            t['houses'] += 1
                                            game.latest_log = f"{current_p.name} buduje dom na {t['name']}."
                                            game.add_history(game.latest_log)
                                            break 

                        if req == 'ROLL':
                            monopolies = [g for g in set([t.get('group') for t in current_p.properties if t.get('group')]) if game.has_monopoly(current_p, g)]
                            if monopolies:
                                house_costs = [t['house_cost'] for t in current_p.properties if t.get('group') in monopolies]
                                if house_costs and current_p.money < min(house_costs) + 150:
                                    standalone = [t for t in current_p.properties if t.get('group') not in monopolies and not t.get('is_mortgaged') and t.get('houses', 0) == 0]
                                    if standalone:
                                        to_m = standalone[0]
                                        to_m['is_mortgaged'] = True
                                        current_p.receive(to_m['mortgage'])
                                        game.add_history(f"{current_p.name} zastawia {to_m['name']}.")
                        
                        if req == 'ROLL' and random.random() < 0.2:
                            for group in ['saddlebrown', 'lightblue', 'mediumvioletred', 'darkorange', 'red', 'gold', 'green', 'blue']:
                                owned = [t for t in current_p.properties if t.get('group') == group]
                                total = [t for t in game.board if t.get('group') == group]
                                if len(owned) == len(total) - 1:
                                    missing = [t for t in total if t not in owned][0]
                                    target = missing.get('owner')
                                    if target and target != current_p and not target.is_bankrupt:
                                        offer_cash = int(missing['price'] * 1.5)
                                        offer_tiles = []
                                        for t in current_p.properties:
                                            g = t.get('group')
                                            if g and not game.has_monopoly(current_p, g):
                                                offer_tiles.append(t['id'])
                                                offer_cash = missing['price']
                                                break
                                        if current_p.money > offer_cash + 150:
                                            game.active_trade = {
                                                "from": current_p.name,
                                                "to": target.name,
                                                "offer_tile_ids": offer_tiles,
                                                "request_tile_ids": [missing['id']],
                                                "offer_money": offer_cash,
                                                "request_money": 0,
                                                "offer_cards": 0,
                                                "request_cards": 0
                                            }
                                            game.add_history(f"{current_p.name} proponuje wymiane graczowi {target.name}.")
                                            break

                        if game.active_trade:
                            continue

                        if req == 'ROLL':
                            if current_p.in_jail:
                                if current_p.get_out_of_jail_cards > 0:
                                    valid_actions = ['JAIL_CARD']
                                elif current_p.money >= 50 and current_p.jail_turns >= 2:
                                    valid_actions = ['JAIL_PAY', 'JAIL_ROLL']
                                else:
                                    valid_actions = ['JAIL_ROLL']
                            else:
                                valid_actions = ['ROLL']
                        elif req == 'BUY':
                            if current_p.money >= game.current_tile_for_buy['price']:
                                valid_actions = ['BUY', 'PASS']
                            else:
                                valid_actions = ['PASS']
                        elif req == 'ACKNOWLEDGE':
                            valid_actions = ['ACKNOWLEDGE']
                            
                        action = None
                        if 'JAIL_CARD' in valid_actions:
                            action = 'JAIL_CARD'
                        elif ai_agent and valid_actions:
                            state_key = ai_agent.get_state_key(game, current_p)
                            action = ai_agent.choose_action(state_key, valid_actions)
                        
                        if not action:
                            if valid_actions: action = valid_actions[0]
                            else:
                                game.next_player()
                                continue
                            
                        if action == 'ROLL':
                            game.execute_roll_and_move(current_p)
                        elif action == 'JAIL_PAY':
                            current_p.pay(50, game.board)
                            current_p.in_jail = False
                            current_p.jail_turns = 0
                            game.execute_roll_and_move(current_p)
                        elif action == 'JAIL_CARD':
                            current_p.get_out_of_jail_cards -= 1
                            current_p.in_jail = False
                            current_p.jail_turns = 0
                            game.add_history(f"{current_p.name} uzywa karty darmowego wyjscia z wiezienia.")
                            game.execute_roll_and_move(current_p)
                        elif action == 'JAIL_ROLL':
                            game.add_history(f"{current_p.name} probuje wyrzucic dublet w wiezieniu.")
                            game.execute_roll_and_move(current_p)
                        elif action == 'BUY':
                            game.buy_property(current_p, game.current_tile_for_buy)
                            game.next_player()
                        elif action in ['PASS', 'ACKNOWLEDGE']:
                            game.next_player()
                            
                        if ai_delay > 0:
                            time.sleep(ai_delay)
                            
        except Exception as e:
            if 'game' in locals() and game and game.active_trade:
                game.active_trade = None
            if 'game' in locals() and game and 'current_p' in locals() and not current_p.is_human:
                game.next_player()
        time.sleep(1.0)

thread = threading.Thread(target=run_game_loop, daemon=True)
thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms_list = []
    for r_id, r_data in rooms.items():
        game = r_data.get('game')
        players_count = len(game.players) if game and r_data['started'] else 0
        rooms_list.append({
            "id": r_id,
            "name": r_data['name'],
            "started": r_data['started'],
            "players_count": players_count
        })
    return jsonify({"rooms": rooms_list})

@app.route('/api/rooms/create', methods=['POST'])
def create_room():
    data = request.json
    room_name = data.get('name', 'Nowy Pokoj').strip()
    if not room_name: room_name = 'Pokoj bez nazwy'
    room_id = str(uuid.uuid4())[:8]
    dummy_game = MonopolyGame([{"name":"Host", "color":"#fff"}])
    rooms[room_id] = {"name": room_name, "game": dummy_game, "started": False, "ai_delay": 1.5, "max_turns": 150}
    return jsonify({"status": "ok", "room_id": room_id})

@app.route('/api/<room_id>/state')
def get_state(room_id):
    if room_id not in rooms: return jsonify({"error": "Pokoj nie istnieje"}), 404
    room_data = rooms[room_id]
    game = room_data.get('game')
    
    if game:
        state = game.get_state()
        state['game_started'] = room_data['started']
        state['enforce_permissions'] = ENFORCE_PERMISSIONS
        state['room_name'] = room_data['name']
        state['ai_delay'] = room_data.get('ai_delay', 1.5)
        return jsonify(state)
    else:
        return jsonify({
            "game_started": False,
            "room_name": room_data['name'],
            "ai_delay": room_data.get('ai_delay', 1.5)
        })

@app.route('/api/<room_id>/settings', methods=['POST'])
def update_settings(room_id):
    if room_id not in rooms: return jsonify({"error": "Pokoj nie istnieje"}), 404
    data = request.json
    
    if data.get('end_game'):
        del rooms[room_id]
        return jsonify({"status": "ended"})
        
    if 'ai_delay' in data:
        rooms[room_id]['ai_delay'] = float(data['ai_delay'])
    if 'max_turns' in data:
        rooms[room_id]['game'].max_turns = int(data['max_turns'])
        
    return jsonify({"status": "ok"})

@app.route('/api/<room_id>/setup', methods=['POST'])
def setup_game(room_id):
    if room_id not in rooms: return jsonify({"error": "Pokoj nie istnieje!"}), 404
    data = request.json
    players_data = data.get('players', [])
    if len(players_data) < 2: return jsonify({"error": "Musi byc co najmniej 2 graczy!"}), 400
    names = [p['name'] for p in players_data]
    if len(names) != len(set(names)): return jsonify({"error": "Nazwy graczy musza byc unikalne!"}), 400
    
    max_turns = rooms[room_id].get('max_turns', 150)
    rooms[room_id]['game'] = MonopolyGame(players_data, max_turns=max_turns)
    rooms[room_id]['started'] = True
    return jsonify({"status": "ok"})

@app.route('/api/<room_id>/restart', methods=['POST'])
def restart_game(room_id):
    if room_id not in rooms: return jsonify({"error": "Pokoj nie istnieje!"}), 404
    game = rooms[room_id]['game']
    current_players = [{"name": p.name, "color": p.color, "is_ai": not p.is_human} for p in game.players]
    rooms[room_id]['game'] = MonopolyGame(current_players, max_turns=game.max_turns)
    rooms[room_id]['started'] = True
    return jsonify({"status": "ok"})

@app.route('/api/<room_id>/action', methods=['POST'])
def action(room_id):
    if room_id not in rooms: return jsonify({"error": "Pokoj nie istnieje!"}), 404
    game = rooms[room_id]['game']
    data = request.json
    action_type = data.get('action')
    
    if action_type == 'RENAME_PLAYER':
        player_index = data.get('player_index')
        new_name = data.get('new_name')
        if not new_name or new_name.strip() == "": return jsonify({"error": "Nazwa nie moze byc pusta!"}), 400
        if any(p.name == new_name for p in game.players): return jsonify({"error": "Ta nazwa jest juz zajeta!"}), 400
        if 0 <= player_index < len(game.players):
            game.active_trade = None
            old_name = game.players[player_index].name
            game.players[player_index].name = new_name
            game.add_history(f"Gracz '{old_name}' zmienil nazwe na '{new_name}'.")
        return jsonify({"status": "ok"})
    
    player = game.players[game.current_player_index]
    
    if action_type == 'JAIL_PAY' and game.human_action_required == 'ROLL':
        if player.money < 50: return jsonify({"error": "Brak srodkow na kaucje!"}), 400
        player.pay(50, game.board)
        player.in_jail = False
        player.jail_turns = 0
        game.add_history(f"{player.name} placi kaucje ($50) i wychodzi.")
        game.execute_roll_and_move(player)
        return jsonify({"status": "ok"})
        
    if action_type == 'JAIL_CARD' and game.human_action_required == 'ROLL':
        if player.get_out_of_jail_cards > 0:
            player.get_out_of_jail_cards -= 1
            player.in_jail = False
            player.jail_turns = 0
            game.add_history(f"{player.name} uzywa karty darmowego wyjscia ze swojego ekwipunku.")
            game.execute_roll_and_move(player)
            return jsonify({"status": "ok"})
        else:
            return jsonify({"error": "Nie masz karty!"}), 400
            
    if action_type == 'JAIL_ROLL' and game.human_action_required == 'ROLL':
        game.add_history(f"{player.name} probuje wyrzucic dublet by wyjsc.")
        game.execute_roll_and_move(player)
        return jsonify({"status": "ok"})
        
    if action_type == 'ROLL' and game.human_action_required == 'ROLL':
        game.execute_roll_and_move(player)
        return jsonify({"status": "ok"})
        
    if action_type == 'BUY' and game.human_action_required == 'BUY':
        if player.money < game.current_tile_for_buy['price']: return jsonify({"error": "Brak srodkow!"}), 400
        game.buy_property(player, game.current_tile_for_buy)
        game.next_player()
        return jsonify({"status": "ok"})
        
    if action_type == 'PASS' and game.human_action_required == 'BUY':
        game.next_player()
        return jsonify({"status": "ok"})
        
    if action_type == 'ACKNOWLEDGE' and game.human_action_required == 'ACKNOWLEDGE':
        game.next_player()
        return jsonify({"status": "ok"})
        
    if action_type == 'MORTGAGE':
        tile_id = data.get('tile_id')
        tile = game.board[tile_id]
        if not tile.get('is_mortgaged') and tile.get('houses', 0) == 0:
            tile['is_mortgaged'] = True
            tile['owner'].receive(tile['mortgage'])
            game.latest_log = f"{tile['owner'].name} zastawia {tile['name']}."
            game.add_history(game.latest_log)
        return jsonify({"status": "ok"})
        
    if action_type == 'UNMORTGAGE':
        tile_id = data.get('tile_id')
        tile = game.board[tile_id]
        if tile.get('is_mortgaged'):
            cost = int(tile['mortgage'] * 1.1)
            if tile['owner'].money >= cost:
                tile['owner'].pay(cost, game.board)
                tile['is_mortgaged'] = False
                game.latest_log = f"{tile['owner'].name} wykupuje {tile['name']}."
                game.add_history(game.latest_log)
            else: return jsonify({"error": "Brak srodkow na wykup!"}), 400
        return jsonify({"status": "ok"})
        
    if action_type == 'BUILD':
        tile_id = data.get('tile_id')
        tile = game.board[tile_id]
        owner = tile['owner']
        if tile.get('houses', 0) < 5:
            if owner.money < tile.get('house_cost', 0): return jsonify({"error": "Brak srodkow na budowe!"}), 400
            if game.has_monopoly(owner, tile['group']):
                owner.pay(tile['house_cost'], game.board)
                tile['houses'] += 1
                game.latest_log = f"{owner.name} buduje dom na {tile['name']}."
                game.add_history(game.latest_log)
            else: return jsonify({"error": "Wymagany caly kolor!"}), 400
        return jsonify({"status": "ok"})
        
    if action_type == 'PROPOSE_TRADE':
        from_name = data.get('from_player')
        target_name = data.get('target_player')
        offer_tile_ids = data.get('offer_tile_ids', [])
        request_tile_ids = data.get('request_tile_ids', [])
        offer_money = int(data.get('offer_money', 0))
        request_money = int(data.get('request_money', 0))
        offer_cards = int(data.get('offer_cards', 0))
        request_cards = int(data.get('request_cards', 0))
        
        target_player = next((p for p in game.players if p.name == target_name), None)
        if not target_player or target_player.is_bankrupt: return jsonify({"error": "Nieprawidlowy gracz docelowy."}), 400
        
        current_p = next((p for p in game.players if p.name == from_name), None)
        if current_p and current_p.get_out_of_jail_cards < offer_cards: return jsonify({"error": "Nie masz tylu kart Wyjdz z wiezienia!"}), 400
        if target_player.get_out_of_jail_cards < request_cards: return jsonify({"error": "Gracz nie ma tylu kart Wyjdz z wiezienia!"}), 400
            
        game.active_trade = {
            "from": from_name, "to": target_name,
            "offer_tile_ids": offer_tile_ids, "request_tile_ids": request_tile_ids,
            "offer_money": offer_money, "request_money": request_money,
            "offer_cards": offer_cards, "request_cards": request_cards
        }
        msg = f"{from_name} wysyla oferte do {target_name}."
        game.latest_log = msg
        game.add_history(msg)
        return jsonify({"status": "ok"})
        
    if action_type == 'RESPOND_TRADE':
        accept = data.get('accept', False)
        t = game.active_trade
        if not t: return jsonify({"error": "Brak aktywnej oferty."}), 400
        p_from = next((p for p in game.players if p.name == t['from']), None)
        p_to = next((p for p in game.players if p.name == t['to']), None)
        
        if accept and p_from and p_to:
            off_tiles = [t_obj for t_obj in game.board if t_obj['id'] in t['offer_tile_ids']]
            req_tiles = [t_obj for t_obj in game.board if t_obj['id'] in t['request_tile_ids']]
            for ot in off_tiles:
                if ot.get('owner') != p_from:
                    game.active_trade = None
                    return jsonify({"error": "Oferujacy nie posiada juz wszystkich nieruchomosci."}), 400
            for rt in req_tiles:
                if rt.get('owner') != p_to:
                    game.active_trade = None
                    return jsonify({"error": "Odbiorca nie posiada juz wszystkich nieruchomosci."}), 400
                    
            if p_from.money < t['offer_money'] or p_to.money < t['request_money']:
                game.active_trade = None
                return jsonify({"error": "Niewystarczajace srodki."}), 400
                
            p_from.money -= t['offer_money']
            p_to.money += t['offer_money']
            p_to.money -= t['request_money']
            p_from.money += t['request_money']
            
            p_from.get_out_of_jail_cards = p_from.get_out_of_jail_cards - t.get('offer_cards', 0) + t.get('request_cards', 0)
            p_to.get_out_of_jail_cards = p_to.get_out_of_jail_cards + t.get('offer_cards', 0) - t.get('request_cards', 0)
            
            for ot in off_tiles:
                p_from.properties.remove(ot)
                ot['owner'] = p_to
                p_to.properties.append(ot)
            for rt in req_tiles:
                p_to.properties.remove(rt)
                rt['owner'] = p_from
                p_from.properties.append(rt)
                
            msg = f"{p_to.name} ZAAKCEPTOWAL wymiane od {p_from.name}!"
            game.latest_log = msg
            game.add_history(msg)
        else:
            msg = f"{p_to.name} ODRZUCIL oferte od {p_from.name}."
            game.latest_log = msg
            game.add_history(msg)
            
        game.active_trade = None
        return jsonify({"status": "ok"})

    return jsonify({"error": "Nieznana akcja"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)