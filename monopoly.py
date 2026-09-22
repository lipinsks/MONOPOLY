import random

class Player:
    def __init__(self, name, color, is_human=True):
        self.name = name
        self.color = color
        self.is_human = is_human
        self.money = 1500
        self.position = 0
        self.properties = []
        self.in_jail = False
        self.jail_turns = 0
        self.is_bankrupt = False
        self.doubles_count = 0
        self.get_out_of_jail_cards = 0

    def pay(self, amount, board):
        self.money -= amount
        if self.money < 0:
            self.handle_debt(board)

    def handle_debt(self, board):
        for t in self.properties:
            if self.money >= 0: break
            if t.get('houses', 0) > 0:
                self.money += (t['houses'] * t.get('house_cost', 50)) // 2
                t['houses'] = 0
        for t in self.properties:
            if self.money >= 0: break
            if not t.get('is_mortgaged', False):
                t['is_mortgaged'] = True
                self.money += t.get('mortgage', t['price'] // 2)
                
        if self.money < 0:
            self.is_bankrupt = True
            for t in self.properties:
                t['owner'] = None
                t['is_mortgaged'] = False
                t['houses'] = 0
            self.properties = []

    def receive(self, amount):
        self.money += amount

class MonopolyGame:
    def __init__(self, players_data, max_turns=1000):
        self.players = [Player(p['name'], p['color'], not p.get('is_ai', False)) for p in players_data]
        self.current_player_index = 0
        self.board = self.init_board()
        self.chance_cards = self.init_cards()
        self.chest_cards = self.init_cards()
        random.shuffle(self.chance_cards)
        random.shuffle(self.chest_cards)
        self.max_turns = max_turns
        self.turns = 0
        self.latest_log = "Gra rozpoczeta!"
        self.history_logs = ["Gra zostala zainicjowana."]
        
        self.waiting_for_human = True
        self.human_action_required = 'ROLL'
        self.current_tile_for_buy = None
        
        self.turn_dice = None
        self.turn_message = "Oczekiwanie na ruch..."
        self.turn_card = ""
        self.active_trade = None
        self.extra_turn = False

    def add_history(self, text):
        self.history_logs.insert(0, text)
        if len(self.history_logs) > 50:
            self.history_logs.pop()

    def init_board(self):
        return [
            {"id": 0, "name": "START", "type": "start"},
            {"id": 1, "name": "Mediter. Avenue", "type": "property", "group": "saddlebrown", "price": 60, "house_cost": 50, "rents": [2, 10, 30, 90, 160, 250], "mortgage": 30, "houses": 0, "is_mortgaged": False},
            {"id": 2, "name": "Kasa Spoleczna", "type": "chest"},
            {"id": 3, "name": "Baltic Avenue", "type": "property", "group": "saddlebrown", "price": 60, "house_cost": 50, "rents": [4, 20, 60, 180, 320, 450], "mortgage": 30, "houses": 0, "is_mortgaged": False},
            {"id": 4, "name": "Podatek dochodowy", "type": "tax", "amount": 200},
            {"id": 5, "name": "Kolej Reading", "type": "railroad", "group": "railroad", "price": 200, "rents": [25, 50, 100, 200], "mortgage": 100, "is_mortgaged": False},
            {"id": 6, "name": "Oriental Avenue", "type": "property", "group": "lightblue", "price": 100, "house_cost": 50, "rents": [6, 30, 90, 270, 400, 550], "mortgage": 50, "houses": 0, "is_mortgaged": False},
            {"id": 7, "name": "Szansa", "type": "chance"},
            {"id": 8, "name": "Vermont Avenue", "type": "property", "group": "lightblue", "price": 100, "house_cost": 50, "rents": [6, 30, 90, 270, 400, 550], "mortgage": 50, "houses": 0, "is_mortgaged": False},
            {"id": 9, "name": "Connecticut Avenue", "type": "property", "group": "lightblue", "price": 120, "house_cost": 50, "rents": [8, 40, 100, 300, 450, 600], "mortgage": 60, "houses": 0, "is_mortgaged": False},
            {"id": 10, "name": "Wiezienie", "type": "jail"},
            {"id": 11, "name": "St. Charles Place", "type": "property", "group": "mediumvioletred", "price": 140, "house_cost": 100, "rents": [10, 50, 150, 450, 625, 750], "mortgage": 70, "houses": 0, "is_mortgaged": False},
            {"id": 12, "name": "Elektrocieplownia", "type": "utility", "group": "utility", "price": 150, "mortgage": 75, "is_mortgaged": False},
            {"id": 13, "name": "States Avenue", "type": "property", "group": "mediumvioletred", "price": 140, "house_cost": 100, "rents": [10, 50, 150, 450, 625, 750], "mortgage": 70, "houses": 0, "is_mortgaged": False},
            {"id": 14, "name": "Virginia Avenue", "type": "property", "group": "mediumvioletred", "price": 160, "house_cost": 100, "rents": [12, 60, 180, 500, 700, 900], "mortgage": 80, "houses": 0, "is_mortgaged": False},
            {"id": 15, "name": "Kolej Pennsylvania", "type": "railroad", "group": "railroad", "price": 200, "rents": [25, 50, 100, 200], "mortgage": 100, "is_mortgaged": False},
            {"id": 16, "name": "St. James Place", "type": "property", "group": "darkorange", "price": 180, "house_cost": 100, "rents": [14, 70, 200, 550, 750, 950], "mortgage": 90, "houses": 0, "is_mortgaged": False},
            {"id": 17, "name": "Kasa Spoleczna", "type": "chest"},
            {"id": 18, "name": "Tennessee Avenue", "type": "property", "group": "darkorange", "price": 180, "house_cost": 100, "rents": [14, 70, 200, 550, 750, 950], "mortgage": 90, "houses": 0, "is_mortgaged": False},
            {"id": 19, "name": "New York Avenue", "type": "property", "group": "darkorange", "price": 200, "house_cost": 100, "rents": [16, 80, 220, 600, 800, 1000], "mortgage": 100, "houses": 0, "is_mortgaged": False},
            {"id": 20, "name": "Bezplatny Parking", "type": "free_parking"},
            {"id": 21, "name": "Kentucky Avenue", "type": "property", "group": "red", "price": 220, "house_cost": 150, "rents": [18, 90, 250, 700, 875, 1050], "mortgage": 110, "houses": 0, "is_mortgaged": False},
            {"id": 22, "name": "Szansa", "type": "chance"},
            {"id": 23, "name": "Indiana Avenue", "type": "property", "group": "red", "price": 220, "house_cost": 150, "rents": [18, 90, 250, 700, 875, 1050], "mortgage": 110, "houses": 0, "is_mortgaged": False},
            {"id": 24, "name": "Illinois Avenue", "type": "property", "group": "red", "price": 240, "house_cost": 150, "rents": [20, 100, 300, 750, 925, 1100], "mortgage": 120, "houses": 0, "is_mortgaged": False},
            {"id": 25, "name": "Kolej B.& O.", "type": "railroad", "group": "railroad", "price": 200, "rents": [25, 50, 100, 200], "mortgage": 100, "is_mortgaged": False},
            {"id": 26, "name": "Atlantic Avenue", "type": "property", "group": "gold", "price": 260, "house_cost": 150, "rents": [22, 110, 330, 800, 975, 1150], "mortgage": 130, "houses": 0, "is_mortgaged": False},
            {"id": 27, "name": "Ventnor Avenue", "type": "property", "group": "gold", "price": 260, "house_cost": 150, "rents": [22, 110, 330, 800, 975, 1150], "mortgage": 130, "houses": 0, "is_mortgaged": False},
            {"id": 28, "name": "Wodociagi", "type": "utility", "group": "utility", "price": 150, "mortgage": 75, "is_mortgaged": False},
            {"id": 29, "name": "Marvin Gardens", "type": "property", "group": "gold", "price": 280, "house_cost": 150, "rents": [24, 120, 360, 850, 1025, 1200], "mortgage": 140, "houses": 0, "is_mortgaged": False},
            {"id": 30, "name": "Idz do Wiezienia", "type": "go_to_jail"},
            {"id": 31, "name": "Pacific Avenue", "type": "property", "group": "green", "price": 300, "house_cost": 200, "rents": [26, 130, 390, 900, 1100, 1275], "mortgage": 150, "houses": 0, "is_mortgaged": False},
            {"id": 32, "name": "North Carolina Avenue", "type": "property", "group": "green", "price": 300, "house_cost": 200, "rents": [26, 130, 390, 900, 1100, 1275], "mortgage": 150, "houses": 0, "is_mortgaged": False},
            {"id": 33, "name": "Kasa Spoleczna", "type": "chest"},
            {"id": 34, "name": "Pennsylvania Avenue", "type": "property", "group": "green", "price": 320, "house_cost": 200, "rents": [28, 150, 450, 1000, 1200, 1400], "mortgage": 160, "houses": 0, "is_mortgaged": False},
            {"id": 35, "name": "Kolej Short Line", "type": "railroad", "group": "railroad", "price": 200, "rents": [25, 50, 100, 200], "mortgage": 100, "is_mortgaged": False},
            {"id": 36, "name": "Szansa", "type": "chance"},
            {"id": 37, "name": "Park Place", "type": "property", "group": "blue", "price": 350, "house_cost": 200, "rents": [35, 175, 500, 1100, 1300, 1500], "mortgage": 175, "houses": 0, "is_mortgaged": False},
            {"id": 38, "name": "Luksusowy Podatek", "type": "tax", "amount": 100},
            {"id": 39, "name": "Boardwalk", "type": "property", "group": "blue", "price": 400, "house_cost": 200, "rents": [50, 200, 600, 1400, 1700, 2000], "mortgage": 200, "houses": 0, "is_mortgaged": False}
        ]

    def init_cards(self):
        return [
            ("Przejdz na START (Odbierz $200)", lambda p: setattr(p, 'position', 0)),
            ("Mandat za predkosc. Zaplac $50", lambda p: p.pay(50, self.board)),
            ("Zwrot z banku. Odbierz $200", lambda p: p.receive(200)),
            ("Idz do wiezienia", lambda p: self.send_to_jail(p)),
            ("Zwrot podatku. Odbierz $20", lambda p: p.receive(20)),
            ("Placisz za remont domu: $40 za kazdy dom, $115 za hotel", lambda p: self.pay_repairs(p, 40, 115)),
            ("Wygrana w konkursie pieknosci! Odbierz $100", lambda p: p.receive(100)),
            ("Masz urodziny! Kazdy z graczy daje Ci $10", lambda p: self.birthday(p, 10)),
            ("Oplacenie czesnego. Zaplac $50", lambda p: p.pay(50, self.board)),
            ("Sprzedaz akcji. Odbierz $50", lambda p: p.receive(50)),
            ("WYJDZ BEZPLATNIE Z WIEZIENIA", lambda p: setattr(p, 'get_out_of_jail_cards', p.get_out_of_jail_cards + 1))
        ]

    def pay_repairs(self, player, house_fee, hotel_fee):
        total = 0
        for t in player.properties:
            h = t.get('houses', 0)
            if h == 5: total += hotel_fee
            elif h > 0: total += h * house_fee
        player.pay(total, self.board)

    def birthday(self, player, amount):
        for p in self.players:
            if p != player and not p.is_bankrupt:
                p.pay(amount, self.board)
                player.receive(amount)

    def send_to_jail(self, player):
        player.position = 10
        player.in_jail = True
        player.jail_turns = 0
        player.doubles_count = 0

    def has_monopoly(self, owner, group):
        if not group or group in ['railroad', 'utility']: return False
        total = sum(1 for t in self.board if t.get('group') == group)
        owned = sum(1 for t in owner.properties if t.get('group') == group)
        return total == owned

    def get_rent(self, tile, owner, dice_sum):
        if tile['type'] == 'property':
            houses = tile.get('houses', 0)
            base = tile['rents'][houses]
            if houses == 0 and self.has_monopoly(owner, tile['group']):
                return base * 2
            return base
        elif tile['type'] == 'railroad':
            count = sum(1 for t in owner.properties if t.get('group') == 'railroad')
            return tile['rents'][count - 1] if count > 0 else 0
        elif tile['type'] == 'utility':
            count = sum(1 for t in owner.properties if t.get('group') == 'utility')
            return dice_sum * 4 if count == 1 else (dice_sum * 10 if count >= 2 else 0)
        return 0

    def play_turn_step(self):
        if self.active_trade:
            return

        player = self.players[self.current_player_index]
        if player.is_bankrupt:
            self.next_player()
            return

        if player.is_human and not self.waiting_for_human:
            self.waiting_for_human = True
            self.human_action_required = 'ROLL'
            self.turn_dice = None
            if self.extra_turn:
                self.turn_message = f"Masz dodatkowy rzut za dublet!"
            else:
                self.turn_message = f"Poczatek tury."
            self.turn_card = ""
            return

        if self.waiting_for_human:
            return

    def execute_roll_and_move(self, player):
        d1, d2 = random.randint(1, 6), random.randint(1, 6)
        d_sum = d1 + d2
        self.turn_dice = [d1, d2]
        self.turn_message = ""
        self.turn_card = ""

        if player.in_jail:
            player.doubles_count = 0
            if d1 == d2:
                player.in_jail = False
                self.turn_message = "Dublet! Wychodzisz z wiezienia."
                self.extra_turn = False
            else:
                player.jail_turns += 1
                if player.jail_turns >= 3:
                    player.pay(50, self.board)
                    player.in_jail = False
                    if player.is_bankrupt:
                        self.turn_message = "Bankructwo przez splate $50 z wiezienia."
                        self.human_action_required = 'ACKNOWLEDGE'
                        return
                    self.turn_message = "Koniec prob. Placisz $50 i wychodzisz."
                    self.extra_turn = False
                else:
                    self.turn_message = f"Brak dubletu. Zostajesz (Proba {player.jail_turns}/3)."
                    self.human_action_required = 'ACKNOWLEDGE'
                    self.extra_turn = False
                    self.latest_log = f"{player.name} nie wyrzuca dubletu. Zostaje w wiezieniu."
                    self.add_history(self.latest_log)
                    return
        else:
            if d1 == d2:
                player.doubles_count += 1
                if player.doubles_count == 3:
                    self.turn_message = "Trzy dublety z rzedu! Idziesz do wiezienia za oszustwo."
                    self.send_to_jail(player)
                    self.extra_turn = False
                    self.human_action_required = 'ACKNOWLEDGE'
                    self.latest_log = f"{player.name} idzie do wiezienia za 3 dublety."
                    self.add_history(self.latest_log)
                    return
                else:
                    self.extra_turn = True
            else:
                player.doubles_count = 0
                self.extra_turn = False

        old_pos = player.position
        new_pos = (player.position + d_sum) % 40
        player.position = new_pos
        
        if new_pos < old_pos and not player.in_jail:
            player.receive(200)
            self.turn_message += " Przejscie przez START (+$200)."

        tile = self.board[player.position]
        self.latest_log = f"{player.name} staje na: {tile['name']}."
        self.turn_message += f" Stanales na: {tile['name']}."
        
        self.resolve_tile(player, tile, d_sum)

    def resolve_tile(self, player, tile, dice_sum):
        t_type = tile['type']
        if t_type in ['property', 'railroad', 'utility']:
            owner = tile.get('owner')
            if owner is None:
                self.human_action_required = 'BUY'
                self.current_tile_for_buy = tile
                self.turn_message += f" Mozesz to kupic za ${tile['price']}."
                return
            elif owner != player and not tile.get('is_mortgaged', False):
                rent = self.get_rent(tile, owner, dice_sum)
                player.pay(rent, self.board)
                if not player.is_bankrupt:
                    owner.receive(rent)
                msg = f" Czynsz ${rent} dla {owner.name}."
                self.latest_log += msg
                self.turn_message += msg
        elif t_type == 'tax':
            player.pay(tile.get('amount', 100), self.board)
            msg = f" Podatek ${tile.get('amount', 100)}."
            self.latest_log += msg
            self.turn_message += msg
        elif t_type == 'go_to_jail':
            self.send_to_jail(player)
            self.latest_log += " Idzie prosto do wiezienia!"
        elif t_type in ['chance', 'chest']:
            cards = self.chance_cards if t_type == 'chance' else self.chest_cards
            card = cards.pop(0)
            card[1](player)
            cards.append(card)
            self.turn_card = card[0]
            self.latest_log += f" Wyciaga karte."

        self.add_history(self.latest_log)
        self.human_action_required = 'ACKNOWLEDGE'

    def buy_property(self, player, tile):
        if player.money >= tile['price']:
            player.pay(tile['price'], self.board)
            tile['owner'] = player
            player.properties.append(tile)
            self.latest_log = f"{player.name} kupuje {tile['name']}."
            self.add_history(self.latest_log)

    def next_player(self):
        if self.extra_turn and not self.players[self.current_player_index].is_bankrupt:
            self.extra_turn = False
            self.human_action_required = 'ROLL'
            self.current_tile_for_buy = None
            self.turn_dice = None
            self.turn_message = f"Rzucasz ponownie (Masz dublet)!"
            self.turn_card = ""
            return

        self.players[self.current_player_index].doubles_count = 0
        self.extra_turn = False
        
        active_indices = [i for i, p in enumerate(self.players) if not p.is_bankrupt]
        if not active_indices:
            return
        
        try:
            current_pos_in_active = active_indices.index(self.current_player_index)
            next_pos_in_active = (current_pos_in_active + 1) % len(active_indices)
            self.current_player_index = active_indices[next_pos_in_active]
        except ValueError:
            self.current_player_index = active_indices[0]

        self.turns += 1
        self.human_action_required = 'ROLL'
        self.current_tile_for_buy = None
        self.turn_dice = None
        self.turn_message = f"Twoja tura."
        self.turn_card = ""

    def get_state(self):
        active = [p for p in self.players if not p.is_bankrupt]
        winner = active[0].name if len(active) == 1 else None
        return {
            "turns": self.turns,
            "max_turns": self.max_turns,
            "latest_log": self.latest_log,
            "history_logs": self.history_logs,
            "winner": winner,
            "waiting_for_human": self.waiting_for_human,
            "human_action": self.human_action_required,
            "current_player": self.players[self.current_player_index].name,
            "current_player_in_jail": self.players[self.current_player_index].in_jail,
            "turn_dice": self.turn_dice,
            "turn_message": self.turn_message,
            "turn_card": self.turn_card,
            "active_trade": self.active_trade,
            "players": [
                {
                    "name": p.name,
                    "color": p.color,
                    "money": p.money,
                    "position": p.position,
                    "in_jail": p.in_jail,
                    "is_bankrupt": p.is_bankrupt,
                    "properties": len(p.properties),
                    "get_out_of_jail_cards": p.get_out_of_jail_cards,
                    "is_human": p.is_human
                } for p in self.players
            ],
            "board": [
                {
                    "id": t['id'],
                    "name": t['name'],
                    "type": t['type'],
                    "group": t.get('group'),
                    "price": t.get('price'),
                    "house_cost": t.get('house_cost'),
                    "rents": t.get('rents'),
                    "mortgage": t.get('mortgage'),
                    "owner": t.get('owner').name if t.get('owner') else None,
                    "houses": t.get('houses', 0),
                    "is_mortgaged": t.get('is_mortgaged', False)
                } for t in self.board
            ]
        }