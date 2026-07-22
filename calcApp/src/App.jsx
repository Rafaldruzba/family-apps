import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Wallet, 
  TrendingDown, 
  Filter, 
  X, 
  Download, 
  Upload, 
  FileJson,
  Calendar
} from 'lucide-react';

export default function App() {
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('expenses_app_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTag, setSelectedTag] = useState(null);

  const fileInputRef = useRef(null);

  // Zapis do localStorage
  useEffect(() => {
    localStorage.setItem('expenses_app_data', JSON.stringify(expenses));
  }, [expenses]);

  // Pomocnik formatowania tagów
  const parseTags = (rawInput) => {
    if (!rawInput.trim()) return [];
    return rawInput
      .split(',')
      .map(tag => tag.trim().replace(/^#+/, ''))
      .filter(tag => tag.length > 0)
      .map(tag => `#${tag.toLowerCase()}`);
  };

  // Dodawanie nowego wydatku
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount)) return;

    const newExpense = {
      id: Date.now(),
      title: title.trim(),
      amount: parseFloat(amount),
      description: description.trim(),
      tags: parseTags(tagsInput),
      date: date || new Date().toISOString().split('T')[0]
    };

    setExpenses([newExpense, ...expenses]);
    setTitle('');
    setAmount('');
    setTagsInput('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  // Usuwanie wydatku
  const handleDelete = (id) => {
    setExpenses(expenses.filter(item => item.id !== id));
  };

  // Unikalne tagi
  const allTags = Array.from(
    new Set(expenses.flatMap(item => item.tags || []))
  );

  // Przefiltrowane wydatki
  const filteredExpenses = selectedTag
    ? expenses.filter(item => (item.tags || []).includes(selectedTag))
    : expenses;

  // Suma ogólna
  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // GRUPOWANIE WYDATKÓW WEDŁUG DATI (od najnowszej)
  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
    const day = expense.date || 'Brak daty';
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(expense);
    return groups;
  }, {});

  // Posortowane daty od najnowszej do najstarszej
  const sortedDays = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

  // Eksport bazy do pliku JSON
  const handleExportJSON = () => {
    if (expenses.length === 0) {
      alert('Brak danych do wyeksportowania!');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expenses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wydatki_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import danych z JSON
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          alert('Nieprawidłowy format pliku JSON. Wymagana jest tablica obiektów.');
          return;
        }

        const mode = window.confirm(
          "Kliknij OK, aby POŁĄCZYĆ importowane dane z obecnymi.\nKliknij Anuluj, aby ZASTĄPIĆ obecne dane nowymi."
        );

        if (mode) {
          setExpenses(prev => [...importedData, ...prev]);
        } else {
          setExpenses(importedData);
        }
      } catch (err) {
        alert('Błąd odczytu pliku JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Nagłówek */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-indigo-600" />
            Menedżer Wydatków
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Wprowadzaj wydatki, grupuj je po dniach i analizuj tagi
          </p>
        </div>

        {/* Akcje Import / Eksport */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Importuj wydatki z pliku JSON"
          >
            <Upload className="w-4 h-4 text-slate-500" /> Import JSON
          </button>
          
          <button
            onClick={handleExportJSON}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Pobierz wydatki jako JSON"
          >
            <Download className="w-4 h-4 text-slate-500" /> Pobierz JSON
          </button>
        </div>
      </header>

      {/* Podsumowanie */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {selectedTag ? `Suma dla tagu ${selectedTag}` : 'Łączna Suma Wydatków'}
            </span>
            <span className="text-3xl font-bold text-slate-900">
              {totalAmount.toFixed(2)} <span className="text-lg font-normal text-slate-500">PLN</span>
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          Liczba transakcji: <span className="font-semibold text-slate-700">{filteredExpenses.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Formularz */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddExpense} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" /> Dodaj Wydatek
            </h2>
            
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nazwa wydatku *</label>
              <input
                type="text"
                placeholder="np. Zakupy spożywcze"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kwota (PLN) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tagi (po przecinku, bez #)
              </label>
              <input
                type="text"
                placeholder="np. jedzenie, paliwo"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Krótki opis / Uwagi</label>
              <textarea
                rows="2"
                placeholder="Dodatkowe informacje..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm shadow-sm hover:shadow"
            >
              Zapisz Wydatek
            </button>
          </form>
        </div>

        {/* Lista z podziałem na dni */}
        <div className="md:col-span-2 space-y-6">
          {/* Pasek Tagów */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" /> Filtruj po tagu
              </span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <X className="w-3 h-3" /> Pokaż wszystkie
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Brak zapisanych tagów</span>
              ) : (
                allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      selectedTag === tag
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Dni i Transakcje */}
          {sortedDays.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <FileJson className="w-8 h-8 text-slate-300" />
              <span>Brak wpisanych wydatków. Dodaj pierwszy wydatek lub zaimportuj JSON!</span>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map(dayDate => {
                const dayExpenses = groupedExpenses[dayDate];
                const dayTotal = dayExpenses.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <div key={dayDate} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Nagłówek Dnia */}
                    <div className="p-3.5 px-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>{dayDate}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-full">
                        Suma dnia: {dayTotal.toFixed(2)} PLN
                      </span>
                    </div>

                    {/* Transakcje w danym dniu */}
                    <ul className="divide-y divide-slate-100">
                      {dayExpenses.map((expense) => (
                        <li key={expense.id} className="p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {expense.title}
                            </p>
                            
                            {/* Opis */}
                            {expense.description && (
                              <p className="text-xs text-slate-500">
                                {expense.description}
                              </p>
                            )}

                            {/* Tagi */}
                            {expense.tags && expense.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {expense.tags.map((t, idx) => (
                                  <span key={idx} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[11px] font-medium">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
                              -{expense.amount.toFixed(2)} PLN
                            </span>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-slate-300 hover:text-red-500 transition p-1"
                              title="Usuń wydatek"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}