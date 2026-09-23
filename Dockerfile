# Używamy oficjalnego, lekkiego obrazu Pythona
FROM python:3.11-slim

# Ustawiamy katalog roboczy w kontenerze
WORKDIR /app

# Kopiujemy plik z wymaganiami do kontenera
COPY requirements.txt .

# Instalujemy zależności bez tworzenia zbędnych cache
RUN pip install --no-cache-dir -r requirements.txt

# Kopiujemy resztę plików projektu do kontenera
COPY . .

# Otwieramy port 5000, na którym działa aplikacja
EXPOSE 5000

# Komenda startowa uruchamiająca Gunicorna w trybie produkcyjnym (-w 1 jest kluczowe dla stanu RAM)
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:5000", "app:app"]
