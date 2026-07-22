const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // pozwala na połączenia z dowolnego IP w sieci lokalnej
    methods: ["GET", "POST"]
  }
});

// Ogromna baza słów podzielona na kategorie z podpowiedziami dla Kłamcy
const WORD_BASE = {
  "Jedzenie i Napoje": [
    { word: "Pizza", hint: "Trójkąt" },        // krojona w trójkąty / pudełko
    { word: "Burger", hint: "Uścisk" },        // trzymanie oburącz
    { word: "Frytki", hint: "Papier" },        // torba z papieru / tłuszcz
    { word: "Kebab", hint: "Kolejka" },       // nocne stanie w kolejce
    { word: "Kawa", hint: "Budzik" },          // nawiązanie do rano/pobudki
    { word: "Herbata", hint: "Para" },          // parowanie z kubka
    { word: "Lody", hint: "Język" },          // lizanie
    { word: "Czekolada", hint: "Srebrno" },     // sreberko w opakowaniu
    { word: "Serek wiejski", hint: "Kuleczki" }, // struktura grudkowa
    { word: "Jabłko", hint: "Grawitacja" },   // Newton / spadek z drzewa
    { word: "Banan", hint: "Krzywa" },        // kształt
    { word: "Truskawka", hint: "Szypułka" },    // zielone na górze
    { word: "Pierogi", hint: "Falbanka" },    // lepienie brzegów
    { word: "Ramen", hint: "Głęboko" },       // głęboka miska / bulion
    { word: "Sushi", hint: "Mata" },          // zwijanie na macie bambusowej
    { word: "Spaghetti", hint: "Widelec" },     // nawijanie
    { word: "Naleśniki", hint: "Obrót" },        // przerzucanie na patelni
    { word: "Pączek", hint: "Nadzienie" },    // ukryte w środku
    { word: "Chleb", hint: "Piętka" },        // brzeg bochenka
    { word: "Arbuz", hint: "Pestka" },        // wypluwanie
    { word: "Popcorn", hint: "Hałas" },         // strzelanie na patelni/w kinie
    { word: "Piwo", hint: "Kapsel" },         // otwieranie
    { word: "Płatki z mlekiem", hint: "Chrupanie" }, // dźwięk w misce
    { word: "Tort", hint: "Dmuchanie" },     // świeczki
    { word: "Keczup", hint: "Pukanie" },       // pukanie w dno butelki
    { word: "Pomidor", hint: "Miąższ" },      // środek warzywa
    { word: "Ogórek konserwowy", hint: "Słoik" } // miejsce przechowywania
  ],
  "Miejsca i Budynki": [
    { word: "Plaża", hint: "Ręcznik" },       // leżenie
    { word: "Szkoła", hint: "Przerwa" },       // dzwonek/czas wolny
    { word: "Siłownia", hint: "Lustra" },      // wszechobecne na ścianach
    { word: "Kino", hint: "Bilet" },          // kontrola przy wejściu
    { word: "Szpital", hint: "Korytarz" },     // czekanie/strefa
    { word: "Lotnisko", hint: "Taśma" },        // odbiór bagażu
    { word: "Las", hint: "Cień" },            // koron drzew
    { word: "Góry", hint: "Kamień" },         // szlak / skały
    { word: "Park rozrywki", hint: "Krzyk" },   // emocje na kolejkach
    { word: "Restauracja", hint: "Napiwek" },   // płatność
    { word: "Supermarket", hint: "Moneta" },    // do wózka
    { word: "Basen", hint: "Chlor" },         // zapach
    { word: "Klub nocny", hint: "Stroboskop" },// światła
    { word: "Muzeum", hint: "Gablota" },      // eksponaty za szkłem
    { word: "Stacja benzynowa", hint: "Pistolet" }, // licznik paliwa
    { word: "Kościół", hint: "Echo" },         // akustyka wysokiego wnętrza
    { word: "Biblioteka", hint: "Karta" },     // czytelnika
    { word: "Cmentarz", hint: "Znicz" },        // płomień
    { word: "Wieżowiec", hint: "Piętro" },      // guziki w windzie
    { word: "Poczta", hint: "Okienko" },      // obsługa
    { word: "Żabka", hint: "Róg" },           // sklepy na rogach ulic
    { word: "Stadion", hint: "Oświetlenie" },  // wielkie reflektory
    { word: "ZOO", hint: "Krata" },           // wybiegi
    { word: "Piekarnia", hint: "Mąka" },        // pył w powietrzu
    { word: "Dworzec kolejowy", hint: "Zegar" } // spóźnienia / rozkład
  ],
  "Przedmioty codziennego użytku": [
    { word: "Telefon", hint: "Kciuk" },       // przewijanie ekranu
    { word: "Komputer", hint: "Klik" },        // myszka / klawiatura
    { word: "Rower", hint: "Łańcuch" },      // napęd
    { word: "Telewizor", hint: "Pilot" },       // zmiana kanałów
    { word: "Słuchawki", hint: "Kabel" },      // lub brak (bluetooth)
    { word: "Zegarek", hint: "Pasek" },       // zapięcie na ręce
    { word: "Portfel", hint: "Przegródka" },  // na dokumenty/karty
    { word: "Klucze", hint: "Brelok" },       // ozdoba do pęku
    { word: "Ładowarka", hint: "Gniazdo" },    // wtykanie do ściany
    { word: "Okulary", hint: "Oprawka" },     // oprawa szkieł
    { word: "Szczoteczka do zębów", hint: "Włosie" }, // główka
    { word: "Ręcznik", hint: "Wieszak" },     // suszenie
    { word: "Książka", hint: "Grzbiet" },     // budowa tomu
    { word: "Długopis", hint: "Pstryk" },      // mechanizm włączania
    { word: "Łóżko", hint: "Rama" },          // konstrukcja
    { word: "Poduszka", hint: "Poszewka" },   // materiał ochronny
    { word: "Lustro", hint: "Szkło" },        // powierzchnia
    { word: "Czajnik", hint: "Gwizdek" },     // dźwięk gotowania
    { word: "Mikrofalówka", hint: "Talerz" },   // obracanie w środku
    { word: "Lodówka", hint: "Uszczelka" },   // drzwi
    { word: "Mydło", hint: "Piana" },         // efekt mycia
    { word: "Grzebień", hint: "Ząbki" },       // rozczesywanie
    { word: "Kubek", hint: "Ucho" },          // trzymanie
    { word: "Nożyczki", hint: "Oczko" },       // na palce
    { word: "Parasol", hint: "Druty" }        // stelaż
  ],
  "Zwierzęta": [
    { word: "Pies", hint: "Smycz" },          // spacer
    { word: "Kot", hint: "Siatka" },         // na balkonie / okno
    { word: "Koń", hint: "Ostroga" },        // jeździectwo
    { word: "Papuga", hint: "Pióro" },        // upierzenie
    { word: "Delfin", hint: "Woda" },         // środowisko
    { word: "Niedźwiedź", hint: "Gawra" },     // legowisko zimowe
    { word: "Chomik", hint: "Trociny" },      // wyściółka klatki
    { word: "Lew", hint: "Słońce" },          // sawanna
    { word: "Tygrys", hint: "Cień" },         // kamuflaż w trawie
    { word: "Słoń", hint: "Pamięć" },         // przysłowiowa słoniowa pamięć
    { word: "Żyrafa", hint: "Liście" },       // jedzenie z koron drzew
    { word: "Wilk", hint: "Księżyc" },       // motyw z baśni/mitów
    { word: "Lis", hint: "Nora" },            // kryjówka pod ziemią
    { word: "Rekin", hint: "Cień" },          // sylwetka pod wodą
    { word: "Żaba", hint: "Lilia" },          // liść na stawie
    { word: "Wąż", hint: "Kamień" },         // wygrzewanie się
    { word: "Krowa", hint: "Łąka" },          // wypas
    { word: "Świnia", hint: "Koryto" },        // karmienie
    { word: "Kura", hint: "Grzęda" },         // spanie w kurniku
    { word: "Orzeł", hint: "Gniazdo" },       // wysoko na skałach
    { word: "Gołąb", hint: "Parapet" },      // miasto
    { word: "Pająk", hint: "Kąt" },           // narożniki pokoju
    { word: "Ślimak", hint: "Mokro" },        // wychodzenie po deszczu
    { word: "Pingwin", hint: "Lód" }          // otoczenie
  ],
  "Czynności i Hobby": [
    { word: "Piłka nożna", hint: "Gwizdek" },   // sędzia
    { word: "Koncert", hint: "Tłum" },         // widownia
    { word: "Gra na gitarze", hint: "Kostka" }, // do szarpania strun
    { word: "Pływanie", hint: "Okularki" },    // ochrona oczu
    { word: "Bieganie", hint: "Asfalt" },      // nawierzchnia
    { word: "Taniec", hint: "Krok" },          // sekwencja
    { word: "Jazda na nartach", hint: "Kij" },  // podparcie
    { word: "Gotowanie", hint: "Fartuch" },    // ochrona przed plamami
    { word: "Malowanie", hint: "Płótno" },     // podłoże
    { word: "Rysowanie", hint: "Gumka" },      // ścieranie
    { word: "Czytanie", hint: "Zakładka" },   // zaznaczanie strony
    { word: "Śpiewanie", hint: "Mikrofon" },   // nagłośnienie
    { word: "Jazda na rolkach", hint: "Ochraniacz" }, // na kolana/łokcie
    { word: "Fotografia", hint: "Błysk" },     // lampa błyskowa
    { word: "Wędkarstwo", hint: "Spławik" },   // obserwacja na wodzie
    { word: "Gry wideo", hint: "Pad" },         // kontroler
    { word: "Podróżowanie", hint: "Walizka" },  // pakowanie
    { word: "Joga", hint: "Mata" }             // ćwiczenia na podłodze
  ],
  "Pojazdy i Transport": [
    { word: "Samochód", hint: "Szyba" },       // czołowa / wycieraczki
    { word: "Autobus", hint: "KASOWNIK" },    // bilet
    { word: "Pociąg", hint: "Gwizd" },        // sygnał odjazdu
    { word: "Samolot", hint: "Chmury" },      // widok z okna
    { word: "Hulajnoga elektryczna", hint: "Chodnik" }, // miejsce jazdy
    { word: "Motocykl", hint: "Kask" },       // ochrona głowy
    { word: "Statek", hint: "Kotwica" },      // unieruchomienie
    { word: "Helikopter", hint: "Hałas" },     // obracające się łopaty
    { word: "Karetka", hint: "Korytarz" },   // korytarz życia na drodze
    { word: "Czołg", hint: "Gąsienica" },    // napęd
    { word: "Rakieta kosmiczna", hint: "Odtwarzanie" }, // odliczanie do startu
    { word: "Tramwaj", hint: "Iskra" },       // na pantografie/trakcji
    { word: "Taksówka", hint: "Kogut" },       // lampka na dachu
    { word: "Rower miejski", hint: "Aplikacja" }, // odblokowywanie
    { word: "Koparka", hint: "Dół" }          // efekt pracy
  ],
  "Zawody": [
    { word: "Policjant", hint: "Kajdanki" },   // wyposażenie
    { word: "Strażak", hint: "Wąż" },          // gaśniczy
    { word: "Lekarz", hint: "Recepta" },      // wypisywanie
    { word: "Nauczyciel", hint: "Kreda" },     // pisanie na tablicy
    { word: "Programista", hint: "Kawa" },     // sterotyp pracy przed ekranem
    { word: "Kucharz", hint: "Czapka" },      // budka/budownictwo gastronomiczne
    { word: "Pilot", hint: "Słuchawki" },    // łączność z wieżą
    { word: "Kierowca", hint: "Pauza" },       // czas pracy/odpoczynek
    { word: "Aktor", hint: "Maska" },         // wcielanie się w role
    { word: "Piosenkarz", hint: "Odsłuch" },   // słuchawka douszna na scenie
    { word: "Żołnierz", hint: "Rozkaz" },     // hierarchia
    { word: "Pisarz", hint: "Korekta" },      // poprawianie tekstu
    { word: "Fryzjer", hint: "Fartuch" },     // peleryna dla klienta
    { word: "Budowlaniec", hint: "Młot" },     // narzędzie
    { word: "Hydraulik", hint: "Uszczelka" }, // naprawa przecieków
    { word: "Prezydent", hint: "Podpis" }      // zatwierdzanie ustaw
  ],
  "Natura i Pogoda": [
    { word: "Wulkan", hint: "Popiół" },       // po erupcji
    { word: "Piorun", hint: "Huk" },          // grzmot po błysku
    { word: "Śnieg", hint: "Łopata" },       // odśnieżanie
    { word: "Deszcz", hint: "Kałuża" },       // po opadzie
    { word: "Słońce", hint: "Cień" },         // rzucany przez obiekty
    { word: "Tęcza", hint: "Kropla" },        // rozszczepienie światła
    { word: "Rzeka", hint: "Kamyk" },         // szlifowany przez wodę
    { word: "Ocean", hint: "Horyzont" },     // linia połączenia z niebem
    { word: "Wodospad", hint: "Piana" },       // u dołu spadku
    { word: "Pustynia", hint: "Wiatr" },      // wydmy / przemieszczanie piasku
    { word: "Jaskinia", hint: "Latarka" },    // eksploracja
    { word: "Ziemia", hint: "Warstwa" },      // skorupa / gleba
    { word: "Księżyc", hint: "Faza" },         // pevector / sierpień
    { word: "Gwiazda", hint: "Życzenie" },    // spadająca gwiazda
    { word: "Chmura", hint: "Kształt" }       // doszukiwanie się wzorów
  ]
};

// Zmienna przechowująca zużyte słowa w danej sesji
let usedWords = new Set();

// Funkcja losująca niepowtarzające się słowo
function getRandomWord() {
  const categories = Object.keys(WORD_BASE);
  let availableWords = [];

  // Zbierz wszystkie dostępne słowa
  categories.forEach(cat => {
    WORD_BASE[cat].forEach(item => {
      if (!usedWords.has(item.word)) {
        availableWords.push({ category: cat, word: item.word, hint: item.hint });
      }
    });
  });

  // Jeśli wykorzystaliśmy już wszystkie słowa, zrestartuj pulę
  if (availableWords.length === 0) {
    usedWords.clear();
    return getRandomWord();
  }

  // Wylosuj słowo
  const selected = availableWords[Math.floor(Math.random() * availableWords.length)];
  usedWords.add(selected.word);

  return selected;
}

// Stan gry w pamięci serwera
let gameState = {
  players: [], // { id, name, isHost, role: 'SECRET' | 'LIAR', word: string }
  status: 'LOBBY', // 'LOBBY' | 'PLAYING'
  currentWord: '',
  currentCategory: '',
  currentHint: '',
  liarsCount: 1
};

io.on('connection', (socket) => {
  console.log(`Połączono: ${socket.id}`);

  // 1. Gracze dołączają
  socket.on('join_game', ({ name }) => {
    const isFirstPlayer = gameState.players.length === 0;
    
    const newPlayer = {
      id: socket.id,
      name: name || `Gracz ${gameState.players.length + 1}`,
      isHost: isFirstPlayer, // Pierwsza osoba zostaje Hostem
      role: null,
      word: null
    };

    gameState.players.push(newPlayer);
    
    // Wyślij zaktualizowany stan gry do wszystkich
    io.emit('game_state_update', gameState);
  });

  // 2. Start rundy (tylko Host)
  socket.on('start_game', ({ liarsCount }) => {
    if (gameState.players.length < 3) return; // Wymaganych min. 3 graczy

    gameState.liarsCount = Math.min(liarsCount || 1, gameState.players.length - 1);
    gameState.status = 'PLAYING';
    
    // Losowanie nowego słowa, kategorii i podpowiedzi
    const selectedData = getRandomWord();
    gameState.currentWord = selectedData.word;
    gameState.currentCategory = selectedData.category;
    gameState.currentHint = selectedData.hint;

    // Losowanie kłamców
    const playerIndexes = gameState.players.map((_, index) => index);
    const liarIndexes = new Set();
    
    while (liarIndexes.size < gameState.liarsCount) {
      const randomIndex = Math.floor(Math.random() * playerIndexes.length);
      liarIndexes.add(randomIndex);
    }

    // Przypisanie ról i wiadomości
    gameState.players = gameState.players.map((player, index) => {
      const isLiar = liarIndexes.has(index);
      return {
        ...player,
        role: isLiar ? 'LIAR' : 'SECRET',
        word: isLiar 
          ? `Jesteś KŁAMCĄ!\nKategoria: ${gameState.currentCategory}\nPodpowiedź: ${gameState.currentHint}`
          : gameState.currentWord
      };
    });

    // Wysyłamy do każdego gracza jego indywidualną rolę i tekst
    gameState.players.forEach((player) => {
      io.to(player.id).emit('your_role', {
        role: player.role,
        word: player.word
      });
    });

    io.emit('game_state_update', gameState);
  });

  // 3. Zakończenie rundy i powrót do lobby (tylko Host)
  socket.on('reset_game', () => {
    gameState.status = 'LOBBY';
    gameState.currentWord = '';
    gameState.currentCategory = '';
    gameState.currentHint = '';
    gameState.players = gameState.players.map(p => ({
      ...p,
      role: null,
      word: null
    }));

    io.emit('game_state_update', gameState);
  });

  // Obsługa rozłączenia gracza
  socket.on('disconnect', () => {
    console.log(`Rozłączono: ${socket.id}`);
    const disconnectedPlayer = gameState.players.find(p => p.id === socket.id);
    gameState.players = gameState.players.filter(p => p.id !== socket.id);

    // Jeśli rozłączył się Host, przekaż Hosta pierwszemu graczowi z brzegu
    if (disconnectedPlayer?.isHost && gameState.players.length > 0) {
      gameState.players[0].isHost = true;
    }

    if (gameState.players.length === 0) {
      gameState.status = 'LOBBY';
      usedWords.clear();
    }

    io.emit('game_state_update', gameState);
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serwer gry Kłamca działa na porcie ${PORT}`);
});