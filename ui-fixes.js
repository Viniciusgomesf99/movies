(function () {
  const rouletteKey = 'domingoRouletteState';
  const readRoulette = () => { try { return JSON.parse(localStorage.getItem(rouletteKey) || '{"excluded":[]}'); } catch { return { excluded: [] }; } };
  let rouletteState = readRoulette();
  let selectedTMDBMovie = null;
  let searchTimer;
  let spinning = false;

  chosenThisWeek = rouletteState.excluded || [];
  renderRoulette();

  function updateNextSession() {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(12, 0, 0, 0);
    const label = nextSunday.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).replace('.', '');
    const pretty = label.charAt(0).toUpperCase() + label.slice(1);
    const remaining = daysUntilSunday === 0 ? 'é hoje' : daysUntilSunday === 1 ? 'falta 1 dia' : `faltam ${daysUntilSunday} dias`;
    const card = document.querySelector('.next-session');
    if (card) { card.querySelector('strong').textContent = pretty; card.querySelector('span').textContent = remaining; }
    const overviewDate = document.querySelector('#view-overview .page-heading .eyebrow');
    if (overviewDate) overviewDate.textContent = pretty.toUpperCase();
    const chip = document.querySelector('#view-roulette .week-chip');
    if (chip) chip.innerHTML = `${pretty.toUpperCase()} <span>●</span>`;
  }
  updateNextSession();

  function saveRoulette() {
    rouletteState.excluded = [...new Set(chosenThisWeek)];
    localStorage.setItem(rouletteKey, JSON.stringify(rouletteState));
  }

  function addRouletteControls() {
    const panel = document.querySelector('.eligible-panel .panel-heading');
    if (panel && !document.querySelector('#resetRoulette')) {
      const button = document.createElement('button');
      button.id = 'resetRoulette';
      button.className = 'reset-roulette';
      button.textContent = 'resetar';
      button.onclick = () => { chosenThisWeek = []; rouletteState = { excluded: [] }; saveRoulette(); renderAll(); toast('Roleta resetada para uma nova semana'); };
      panel.appendChild(button);
    }
  }

  function decorateEligible() {
    addRouletteControls();
    document.querySelectorAll('#eligibleList .eligible-row').forEach((row, index) => {
      const current = members[index];
      if (!current || row.querySelector('.exclude-toggle')) return;
      const toggle = document.createElement('button');
      toggle.className = 'exclude-toggle';
      toggle.title = 'Alternar participação na roleta';
      toggle.textContent = chosenThisWeek.includes(current.name) ? 'incluir' : 'remover';
      toggle.onclick = () => { chosenThisWeek = chosenThisWeek.includes(current.name) ? chosenThisWeek.filter(name => name !== current.name) : [...chosenThisWeek, current.name]; saveRoulette(); renderAll(); };
      row.appendChild(toggle);
    });
  }

  const eligibleList = document.querySelector('#eligibleList');
  if (eligibleList) new MutationObserver(decorateEligible).observe(eligibleList, { childList: true });
  decorateEligible();

  const spinButton = document.querySelector('#spinButton');
  if (spinButton) spinButton.onclick = () => {
    if (spinning) return;
    const available = members.filter(person => !chosenThisWeek.includes(person.name));
    if (!available.length) { toast('Todos foram removidos desta semana. Use resetar para começar novamente.'); return; }
    spinning = true;
    const wheel = document.querySelector('#rouletteWheel');
    const result = document.querySelector('#rouletteResult');
    const winner = available[Math.floor(Math.random() * available.length)];
    wheel.classList.add('spinning');
    result.classList.add('result-pending');
    result.innerHTML = '<span class="result-icon">↻</span><div><small>SORTEANDO</small><h3>A roleta está girando...</h3></div>';
    setTimeout(() => {
      wheel.classList.remove('spinning');
      result.classList.remove('result-pending');
      result.innerHTML = `<span class="result-icon">✦</span><div><small>RESULTADO DO SORTEIO</small><h3>${winner.name} escolhe o próximo filme.</h3></div>`;
      spinning = false;
    }, 1500);
  };

  const originalOpenModal = openModal;
  openModal = film => {
    selectedTMDBMovie = film || null;
    originalOpenModal(film);
    const results = document.querySelector('#filmSearchResults');
    if (results) results.innerHTML = '';
  };

  const titleInput = document.querySelector('#filmTitle');
  const titleLabel = titleInput?.closest('label');
  if (titleInput && titleLabel) {
    const results = document.createElement('div');
    results.id = 'filmSearchResults';
    results.className = 'film-search-results';
    titleLabel.appendChild(results);
    titleInput.addEventListener('input', () => {
      selectedTMDBMovie = null;
      clearTimeout(searchTimer);
      const query = titleInput.value.trim();
      if (query.length < 2) { results.innerHTML = ''; return; }
      results.innerHTML = '<span class="search-status">buscando no TMDB...</span>';
      searchTimer = setTimeout(async () => {
        const found = await tmdbSearch(query);
        if (!found?.length) { results.innerHTML = '<span class="search-status">nenhum filme encontrado</span>'; return; }
        results.innerHTML = found.slice(0, 5).map(movie => `<button type="button" class="tmdb-result" data-tmdb-id="${movie.id}"><img src="${poster(movie.poster)}"><span><strong>${movie.title}</strong><small>${movie.year || 'sem ano'} · ★ ${movie.score}</small></span></button>`).join('');
        results.querySelectorAll('.tmdb-result').forEach(button => button.onclick = () => {
          selectedTMDBMovie = found.find(movie => String(movie.id) === button.dataset.tmdbId);
          titleInput.value = selectedTMDBMovie.title;
          document.querySelector('#tmdbScore').value = selectedTMDBMovie.score;
          results.innerHTML = `<span class="search-status selected-film">✓ ${selectedTMDBMovie.title} selecionado do TMDB</span>`;
        });
      }, 350);
    });
  }

  function refreshPodium() {
    const hero = document.querySelector('.ranking-hero');
    if (!hero) return;
    const ranked = members.map(person => {
      const values = movies.filter(movie => movie.member === person.name && Number.isFinite(Number(movie.group))).map(movie => Number(movie.group));
      return { ...person, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, count: values.length };
    }).filter(person => person.average !== null).sort((a, b) => b.average - a.average);
    if (!ranked.length) { hero.innerHTML = '<div class="empty-podium"><strong>Ainda sem avaliações</strong><small>O pódio aparece quando o grupo der as primeiras notas.</small></div>'; return; }
    const order = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
    hero.innerHTML = order.map((person, index) => { const position = index === 1 ? 'first' : index === 0 ? 'second' : 'third'; return `<div class="podium podium-${position}">${position === 'first' ? '<span class="crown">♛</span>' : ''}<span class="rank-number">0${ranked.indexOf(person) + 1}</span><div class="avatar ${person.cls}">${person.initial}</div><strong>${person.name}</strong><small>média ${person.average.toFixed(1).replace('.', ',')}</small></div>`; }).join('');
  }
  refreshPodium();
  const rankingList = document.querySelector('#rankingList');
  if (rankingList) new MutationObserver(refreshPodium).observe(rankingList, { childList: true });

  const form = document.querySelector('#sessionForm');
  const finalSubmit = form?.onsubmit;
  if (form && finalSubmit) form.onsubmit = event => {
    const isRating = window.__ratingMovieId;
    const editId = window.__editMovieId;
    if (isRating) return finalSubmit(event);
    if (editId) {
      event.preventDefault();
      const movie = movies.find(item => String(item.id) === String(editId));
      if (!movie) return;
      const selected = selectedTMDBMovie;
      Object.assign(movie, { title: selected?.title || document.querySelector('#filmTitle').value, year: selected?.year || new Date(document.querySelector('#filmDate').value).getFullYear(), score: selected?.score || document.querySelector('#tmdbScore').value, member: document.querySelector('#memberSelect').value, date: document.querySelector('#filmDate').value });
      if (selected) Object.assign(movie, { id: selected.id, poster: selected.poster, backdrop: selected.backdrop, overview: selected.overview });
      save(); renderAll(); closeModal(); window.__editMovieId = null; selectedTMDBMovie = null; toast('Sessão atualizada');
      return;
    }
    const selected = selectedTMDBMovie;
    finalSubmit(event);
    const saved = movies[0];
    if (saved && selected) Object.assign(saved, { id: selected.id, year: selected.year || saved.year, score: selected.score, poster: selected.poster, backdrop: selected.backdrop, overview: selected.overview });
    if (selected) { save(); renderAll(); }
    const chosen = document.querySelector('#memberSelect')?.value;
    if (chosen && !chosenThisWeek.includes(chosen)) { chosenThisWeek = [...chosenThisWeek, chosen]; saveRoulette(); renderRoulette(); }
  };

  function decorateHistoryActions() {
    document.querySelectorAll('#historyTable tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const titleNode = row.querySelector('.table-film span');
      const movie = movies.find(item => item.title === titleNode?.firstChild?.textContent.trim());
      const actions = cells[cells.length - 1];
      if (!movie || !actions || actions.querySelector('.edit-row')) return;
      const edit = document.createElement('button');
      edit.className = 'edit-row'; edit.textContent = 'editar';
      edit.onclick = () => { window.__ratingMovieId = null; window.__editMovieId = movie.id; selectedTMDBMovie = null; openModal(movie); document.querySelector('#filmTitle').readOnly = false; document.querySelector('#memberSelect').value = movie.member; document.querySelector('#filmDate').value = movie.date || ''; document.querySelectorAll('.rating-fields input').forEach(input => input.disabled = input !== document.querySelector(ratingFieldForUser())); };
      actions.append(' ', edit);
      const remove = actions.querySelector('.delete-row');
      if (remove) { remove.textContent = 'excluir'; remove.classList.add('delete-action'); }
    });
  }
  const historyTable = document.querySelector('#historyTable');
  if (historyTable) new MutationObserver(decorateHistoryActions).observe(historyTable, { childList: true });
  decorateHistoryActions();
})();
