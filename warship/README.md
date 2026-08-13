# 🚢 Battleship Pro – Gra w Statki Online

W pełni responsywna, sieciowa gra w statki typu **Full-Stack (Node.js + React + Socket.io)**, obsługująca dynamiczne lobby, system wyzwań graczy, rygorystyczną walidację floty oraz grę w czasie rzeczywistym na urządzeniach mobilnych i desktopach.

---

## 🛠️ Architektura i Technologie
* **Backend:** Node.js, Express, Socket.io (WebSocket), Crypto (generowanie sesji i bezpiecznych ID pokojów).
* **Frontend:** React (Vite), Socket.io-client.
* **Stylizacja:** Czysty CSS z podejściem **Mobile-First** (elastyczne siatki, dynamiczne etykiety szachownicowe, panel historii).

---

## 📂 Struktura Projektu
```text
warship/
├── client/                 # Aplikacja frontendowa (React)
│   ├── src/
│   │   ├── App.jsx         # Główny komponent logiki gry i interfejsu
│   │   ├── App.css         # Stylizacja responsywna i responsywne siatki plansz
│   │   └── main.jsx        # Punkt wejścia Reacta
│   └── package.json
├── server.js               # Serwer API, obsługa WebSocket i logika biznesowa gry
├── package.json            # Konfiguracja głównego projektu i paczek backendowych
└── package-lock.json

⚙️ Wymagania oraz Oficjalny Zasób Floty
---------------------------------------

Gra pilnuje reguł klasycznych statków – brak możliwości oszukiwania czy stawiania dowolnej liczby małych jednostek.

### Wymagany Zestaw Statków (Suma: 10 jednostek):

*   **1x** Statek 4-masztowy
    
*   **2x** Statki 3-masztowe
    
*   **3x** Statki 2-masztowe
    
*   **4x** Statki 1-masztowe
    

**Zasada budowy:** Statki nie mogą nakładać się na siebie ani stykać bokami i rogami (wymóg bufora 1 kratki dookoła każdej jednostki).

🚀 Instrukcja Uruchomienia (Krok po Kroku)
------------------------------------------

1.  Bashnpm install
    
2.  Bashcd clientnpm installnpm run buildcd ..
    
3.  Bashnpm start
    
4.  **Otwórz przeglądarkę:**Wejdź pod adres http://localhost:3000. Serwer Node.js serwuje zarówno aplikację React, jak i obsługuje komunikację Socket.io na jednym porcie.
    

📱 Najważniejsze Funkcje Gry
----------------------------

*   **System Lobby P2P:** Wpisujesz swój nick, trafiasz do publicznego lobby, widzisz listę innych graczy online i możesz wysłać wyzwanie bojowe (z opcją akceptacji lub odrzucenia przez przeciwnika).
    
*   **Nowoczesna Logika Mobilna:** Koniec z trudnym przeciąganiem (drag-and-drop) na ekranach dotykowych. Rozstawianie floty odbywa się intuicyjnie: **klikasz pole początkowe statku, a następnie pole końcowe** (dla 1-masztowca wystarczy jedno kliknięcie).
    
*   **Etykiety Szachownicowe:** Plansze posiadają pełne oznaczenia kolumn (**A–J**) oraz rzędów (**1–10**), co ułatwia precyzyjne oddawanie strzałów.
    
*   **Panel Historii Ruchów:** Wbudowany log rozgrywki na żywo, który informuje graczy o każdym wykonanym ruchu (np. _"Gracz A trafił w B4 — Trafiony! 🔥"_).