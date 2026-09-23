import random
import json
import os
import signal
import sys
import time

from monopoly import MonopolyGame, Player

OUTPUT_FILE = "best_model_MORE_EPISODES.json"
TOTAL_EPISODES = 150000  # Optymalny, matematyczny próg nasycenia dla modelu
SAVE_INTERVAL = 5000

agent_instance = None

def signal_handler(sig, frame):
    print("\n[!] Przechwycono sygnał przerwania (Ctrl+C lub kill).")
    print("[!] Trwa bezpieczne zapisywanie modelu przed wyłączeniem...")
    if agent_instance:
        agent_instance.save_model(OUTPUT_FILE)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

class SmartAIAgent:
    def __init__(self, name="SmartAI", learning_rate=0.1, discount_factor=0.9, exploration_rate=1.0):
        self.name = name
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = exploration_rate
        self.q_table = {}

    def get_state_key(self, game, player):
        money_bracket = player.money // 250
        properties_count = len(player.properties)
        in_jail_state = 1 if player.in_jail else 0
        monopolies = sum(1 for group in set([t.get('group') for t in player.properties if t.get('group')]) 
                         if game.has_monopoly(player, group))
        return f"m:{money_bracket}_p:{properties_count}_j:{in_jail_state}_mon:{monopolies}"

    def choose_action(self, state_key, valid_actions):
        if not valid_actions: return None
        if random.random() < self.epsilon: return random.choice(valid_actions)
        
        state_actions = self.q_table.get(state_key, {})
        if not state_actions: return random.choice(valid_actions)
        
        best_action = max(valid_actions, key=lambda a: state_actions.get(a, 0.0))
        return best_action

    def update_q_table(self, state_key, action, reward, next_state_key):
        if state_key not in self.q_table: self.q_table[state_key] = {}
        
        current_q = self.q_table[state_key].get(action, 0.0)
        next_state_actions = self.q_table.get(next_state_key, {})
        max_next_q = max(next_state_actions.values()) if next_state_actions else 0.0
        
        new_q = current_q + self.lr * (reward + self.gamma * max_next_q - current_q)
        self.q_table[state_key][action] = new_q

    def save_model(self, filepath):
        model_data = {"q_table": self.q_table}
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(model_data, f)
        print(f" -> Zapisano macierz Q-table (nauczone stany: {len(self.q_table)}) w pliku: {filepath}")

    def load_model(self, filepath):
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.q_table = data.get("q_table", {})
                print(f" -> Wczytano istniejący model z {filepath}. Wznawiam naukę (stanów: {len(self.q_table)}).")
                self.epsilon = max(0.05, 1.0 - (len(self.q_table) / 5000))
            except Exception as e:
                print(f"Błąd odczytu {filepath}: {e}. Rozpoczynam z czystą pamięcią.")
        else:
            print(f"Plik {filepath} nie istnieje. Rozpoczynam trening od zera.")

def simulate_training_night():
    global agent_instance
    print("==================================================")
    print(f" START TRENINGU AI: OPTYMALNY PROG {TOTAL_EPISODES} GIER")
    print(f" PLIK WYJŚCIOWY: {OUTPUT_FILE}")
    print("==================================================")
    
    agent = SmartAIAgent(name="MasterAI")
    agent_instance = agent
    agent.load_model(OUTPUT_FILE)
    
    start_time = time.time()
    
    for episode in range(1, TOTAL_EPISODES + 1):
        players_data = [
            {"name": "MasterAI", "color": "#ff5252", "is_ai": True},
            {"name": "BotLosowy1", "color": "#00bcd4", "is_ai": True},
            {"name": "BotLosowy2", "color": "#4caf50", "is_ai": True},
            {"name": "BotLosowy3", "color": "#ff9800", "is_ai": True}
        ]
        game = MonopolyGame(players_data, max_turns=150)
        
        while game.turns < game.max_turns:
            active_players = [p for p in game.players if not p.is_bankrupt]
            if len(active_players) <= 1: break
                
            current_p = game.players[game.current_player_index]
            if current_p.is_bankrupt:
                game.next_player()
                continue
                
            state_key = agent.get_state_key(game, current_p)
            req = game.human_action_required
            valid_actions = []
            
            if req == 'ROLL':
                if current_p.in_jail and current_p.money >= 50:
                    valid_actions = ['JAIL_PAY', 'JAIL_ROLL']
                else:
                    valid_actions = ['ROLL']
            elif req == 'BUY':
                if current_p.money >= game.current_tile_for_buy['price']:
                    valid_actions = ['BUY', 'PASS']
                else:
                    valid_actions = ['PASS']
            elif req == 'ACKNOWLEDGE':
                valid_actions = ['ACKNOWLEDGE']
                
            if current_p.name == "MasterAI":
                action = agent.choose_action(state_key, valid_actions)
            else:
                action = random.choice(valid_actions) if valid_actions else 'ACKNOWLEDGE'
                
            old_money = current_p.money
            
            if action == 'ROLL':
                game.execute_roll_and_move(current_p)
            elif action == 'JAIL_PAY':
                current_p.pay(50, game.board)
                current_p.in_jail = False
                current_p.jail_turns = 0
                game.execute_roll_and_move(current_p)
            elif action == 'JAIL_ROLL':
                current_p.pay(50, game.board)
                game.execute_roll_and_move(current_p)
            elif action == 'BUY':
                game.buy_property(current_p, game.current_tile_for_buy)
                game.next_player()
            elif action == 'PASS' or action == 'ACKNOWLEDGE':
                game.next_player()
                
            if current_p.name == "MasterAI":
                reward = (current_p.money - old_money) + (len(current_p.properties) * 20)
                if current_p.is_bankrupt:
                    reward -= 1000
                elif len(active_players) == 1 and active_players[0].name == "MasterAI":
                    reward += 2000
                    
                next_state_key = agent.get_state_key(game, current_p)
                agent.update_q_table(state_key, action, reward, next_state_key)

        if agent.epsilon > 0.05:
            agent.epsilon *= 0.9998

        if episode % SAVE_INTERVAL == 0:
            elapsed = round((time.time() - start_time) / 60, 2)
            print(f"[{elapsed} min] Ukończono epizod: {episode}/{TOTAL_EPISODES} | Epsilon: {agent.epsilon:.3f}")
            agent.save_model(OUTPUT_FILE)

    print("Trening zakończony osiągnięciem optymalnego limitu 150 000 epizodów.")
    agent.save_model(OUTPUT_FILE)

if __name__ == "__main__":
    simulate_training_night()
