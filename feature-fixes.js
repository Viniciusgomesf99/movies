(function () {
  const fallbackPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
  const personField = { Pachenko: '#ratingYou', Nefasto: '#ratingNefasto', Shaco: '#ratingShaco' };
  const currentMember = () => window.currentUser?.displayName || 'Pachenko';
  const numericRatings = movie => Object.values(movie.ratings || {}).map(Number).filter(Number.isFinite);
  const filmRating = movie => { const values = numericRatings(movie); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; };
  const currentMonth = () => new Date().toISOString().slice(0, 7);
  const monthMovies = () => movies.filter(movie => String(movie.date || '').slice(0, 7) === currentMonth());

  function renderPendingRatings() {
    const view = document.querySelector('#view-overview');
    if (!view || !window.currentUser) return;
    let panel = document.querySelector('#pendingRatingsPanel');
    if (!panel) { panel = document.createElement('div'); panel.id = 'pendingRatingsPanel'; panel.className = 'panel pending-ratings-panel'; const stats = view.querySelector('.stats-grid'); stats?.before(panel); }
    const pending = movies.filter(movie => movie.ratings?.[currentMember()] === undefined || movie.ratings?.[currentMember()] === null || movie.ratings?.[currentMember()] === '');
    if (!pending.length) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    panel.innerHTML = `<div class="panel-heading"><div><h3>Filmes esperando sua nota</h3><span>Ajude a atualizar a média do grupo.</span></div><span class="pill orange">${pending.length} pendente${pending.length > 1 ? 's' : ''}</span></div><div class="pending-rating-list">${pending.slice(0, 4).map(movie => `<button class="pending-rating-card" data-rating-id="${movie.id}"><img src="${movie.poster || fallbackPoster}" onerror="this.src='${fallbackPoster}'"><span><strong>${movie.title}</strong><small>${movie.member} escolheu · ${movie.year || ''}</small></span><b>dar nota →</b></button>`).join('')}</div>`;
    panel.querySelectorAll('[data-rating-id]').forEach(button => button.onclick = () => openRatingModal(movies.find(movie => String(movie.id) === button.dataset.ratingId)));
  }

  function openRatingModal(movie) {
    if (!movie) return;
    window.__ratingMovieId = movie.id;
    window.__editMovieId = null;
    openModal(movie);
    const field = document.querySelector(personField[currentMember()] || '#ratingYou');
    document.querySelectorAll('.rating-fields input').forEach(input => { input.value = ''; input.disabled = input !== field; input.style.display = input === field ? '' : 'none'; });
    field.value = movie.ratings?.[currentMember()] ?? '';
    document.querySelector('#memberSelect').value = movie.member;
    document.querySelector('#filmTitle').readOnly = true;
    const helper = document.querySelector('.field-help'); if (helper) helper.textContent = 'Minha nota para este filme, de 0 a 10';
  }

  function renderRatingChips() {
    document.querySelectorAll('#historyTable tr').forEach(row => {
      const titleNode = row.querySelector('.table-film span');
      const movie = movies.find(item => item.title === titleNode?.firstChild?.textContent.trim());
      const filmCell = row.querySelector('.table-film');
      if (!movie || !filmCell || filmCell.querySelector('.film-rating-chips')) return;
      const chips = document.createElement('div'); chips.className = 'film-rating-chips';
      chips.innerHTML = members.map(person => `<span>${person.initial}: ${movie.ratings?.[person.name] ?? '—'}</span>`).join('');
      filmCell.appendChild(chips);
    });
  }

  function monthlyRanking() {
    const source = monthMovies();
    const rows = members.map(person => {
      const ratedFilms = source.filter(movie => movie.member === person.name).map(filmRating).filter(Number.isFinite);
      const average = ratedFilms.length ? ratedFilms.reduce((sum, value) => sum + value, 0) / ratedFilms.length : null;
      return { ...person, average, filmCount: ratedFilms.length };
    }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
    const list = document.querySelector('#rankingList');
    if (list) list.innerHTML = rows.map((person, index) => `<div class="rank-row"><span class="rank-pos">0${index + 1}</span><div class="rank-person"><div class="avatar ${person.cls}">${person.initial}</div><strong>${person.name}</strong></div><div class="rank-bar-wrap"><div class="rank-bar" style="width:${person.average === null ? 0 : person.average * 10}%"></div></div><div class="rank-average">${person.average === null ? '—' : person.average.toFixed(1).replace('.', ',')} <small>${person.filmCount} filme${person.filmCount === 1 ? '' : 's'} avaliados</small></div></div>`).join('');
    const hero = document.querySelector('.ranking-hero');
    const podium = rows.filter(person => person.average !== null);
    if (hero) {
      if (!podium.length) hero.innerHTML = '<div class="empty-podium"><strong>Ainda sem avaliações neste mês</strong><small>O pódio aparece depois das primeiras notas do mês.</small></div>';
      else hero.innerHTML = [podium[1], podium[0], podium[2]].filter(Boolean).map((person, index) => { const position = index === 1 ? 'first' : index === 0 ? 'second' : 'third'; return `<div class="podium podium-${position}">${position === 'first' ? '<span class="crown">♛</span>' : ''}<span class="rank-number">0${podium.indexOf(person) + 1}</span><div class="avatar ${person.cls}">${person.initial}</div><strong>${person.name}</strong><small>média ${person.average.toFixed(1).replace('.', ',')}</small></div>`; }).join('');
    }
  }

  function homeMonthlyScores() {
    const source = monthMovies();
    document.querySelectorAll('#membersList .member-row').forEach(row => {
      const name = row.querySelector('strong')?.textContent;
      const values = source.filter(movie => movie.member === name).map(filmRating).filter(Number.isFinite);
      const score = row.querySelector('.member-score b'); if (score) score.textContent = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1).replace('.', ',') : '—';
      const label = row.querySelector('.member-score small'); if (label) label.textContent = 'média do mês';
    });
    const myRatings = source.map(movie => Number(movie.ratings?.[currentMember()])).filter(Number.isFinite);
    const myAverage = document.querySelector('#groupAverage');
    if (myAverage) myAverage.textContent = myRatings.length ? (myRatings.reduce((sum, value) => sum + value, 0) / myRatings.length).toFixed(1).replace('.', ',') : '—';
  }

  const baseOverview = renderOverview;
  renderOverview = () => { baseOverview(); homeMonthlyScores(); renderPendingRatings(); };
  const baseRanking = renderRanking;
  renderRanking = () => { baseRanking(); monthlyRanking(); };
  const baseHistory = renderHistory;
  renderHistory = () => { baseHistory(); renderRatingChips(); };

  function decorateDiscoverImages() {
    document.querySelectorAll('.pick-poster,.table-poster,.movie-thumb').forEach(image => image.onerror = () => { image.onerror = null; image.src = fallbackPoster; });
    const featured = document.querySelector('#featuredMovie');
    if (featured) { const background = featured.style.backgroundImage; if (background && !background.includes('unsplash')) { const url = background.slice(5, -2); const test = new Image(); test.onerror = () => { featured.style.backgroundImage = `url(${fallbackPoster})`; }; test.src = url; } }
  }
  const baseDiscover = renderDiscover;
  renderDiscover = list => { baseDiscover(list); decorateDiscoverImages(); };

  async function catalogSearch(query) {
    if (!apiKey || !query) return { suggestions: [], movies: [] };
    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=pt-BR&include_adult=false&query=${encodeURIComponent(query)}`);
      const data = await response.json(); const suggestions = data.results || [];
      const movieResults = suggestions.filter(item => item.media_type === 'movie').map(item => ({ id: item.id, title: item.title, year: item.release_date?.slice(0, 4) || '', score: Number(item.vote_average || 0).toFixed(1), poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '', backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '', overview: item.overview || 'Sem descrição disponível.' }));
      return { suggestions, movies: movieResults };
    } catch { return { suggestions: [], movies: [] }; }
  }

  async function personMovies(personId) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${apiKey}&language=pt-BR`); const data = await response.json();
      return (data.cast || []).filter(item => item.media_type === 'movie').sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 12).map(item => ({ id: item.id, title: item.title, year: item.release_date?.slice(0, 4) || '', score: Number(item.vote_average || 0).toFixed(1), poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '', backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '', overview: item.overview || 'Sem descrição disponível.' }));
    } catch { return []; }
  }

  const searchInput = document.querySelector('#movieSearch');
  const searchButton = document.querySelector('#searchMovie');
  if (searchInput && searchButton) {
    const box = searchInput.closest('.search-box'); const menu = document.createElement('div'); menu.id = 'catalogAutocomplete'; menu.className = 'catalog-autocomplete'; box.parentElement.appendChild(menu);
    let timer;
    const fillAutocomplete = async () => {
      const query = searchInput.value.trim(); clearTimeout(timer); if (query.length < 2) { menu.innerHTML = ''; return; }
      timer = setTimeout(async () => { const data = await catalogSearch(query); menu.innerHTML = data.suggestions.slice(0, 6).map(item => item.media_type === 'person' ? `<button type="button" data-person="${item.id}"><b>ator</b> ${item.name}</button>` : `<button type="button" data-movie="${item.id}"><b>filme</b> ${item.title}</button>`).join(''); menu.querySelectorAll('[data-person]').forEach(button => button.onclick = async () => { const list = await personMovies(button.dataset.person); renderDiscover(list.length ? list : picks); menu.innerHTML = ''; }); menu.querySelectorAll('[data-movie]').forEach(button => button.onclick = () => { const movie = data.movies.find(item => String(item.id) === button.dataset.movie); if (movie) renderDiscover([movie, ...data.movies.filter(item => item.id !== movie.id)]); menu.innerHTML = ''; }); }, 300);
    };
    searchInput.addEventListener('input', fillAutocomplete);
    searchButton.onclick = async () => { const data = await catalogSearch(searchInput.value.trim()); renderDiscover(data.movies.length ? data.movies : picks); menu.innerHTML = ''; if (!data.movies.length) toast('Nenhum filme encontrado'); };
  }

  function syncWheel() {
    const wheel = document.querySelector('#rouletteWheel'); if (!wheel) return;
    const available = members.filter(person => !chosenThisWeek.includes(person.name));
    wheel.innerHTML = available.length ? available.map(person => `<span>${person.name}</span>`).join('') : '<span>sem membros</span>';
  }
  syncWheel();
  const eligible = document.querySelector('#eligibleList'); if (eligible) new MutationObserver(syncWheel).observe(eligible, { childList: true });
  let modalSpinning = false;
  const spin = document.querySelector('#spinButton');
  if (spin) spin.onclick = () => {
    if (modalSpinning) return; const available = members.filter(person => !chosenThisWeek.includes(person.name)); if (!available.length) { toast('Inclua pelo menos um membro na roleta'); return; }
    modalSpinning = true; const wheel = document.querySelector('#rouletteWheel'); const winner = available[Math.floor(Math.random() * available.length)]; wheel.classList.add('spinning');
    setTimeout(() => { wheel.classList.remove('spinning'); modalSpinning = false; document.querySelector('#rouletteResult').innerHTML = `<span class="result-icon">✦</span><div><small>RESULTADO DO SORTEIO</small><h3>${winner.name} escolhe o próximo filme.</h3></div>`; showWinner(winner.name); }, 1500);
  };
  function showWinner(name) { let modal = document.querySelector('#winnerModal'); if (!modal) { modal = document.createElement('div'); modal.id = 'winnerModal'; modal.className = 'winner-modal'; modal.innerHTML = '<div class="winner-dialog"><button class="winner-close">×</button><span>✦</span><small>PRÓXIMO ESCOLHEDOR</small><h2></h2><p>Agora é só encontrar o filme da sessão.</p><button class="primary-button winner-ok">continuar</button></div>'; document.body.appendChild(modal); modal.querySelector('.winner-close').onclick = () => modal.classList.remove('open'); modal.querySelector('.winner-ok').onclick = () => modal.classList.remove('open'); } modal.querySelector('h2').textContent = name; modal.classList.add('open'); }

  const baseOpenModal = openModal;
  openModal = film => { baseOpenModal(film); document.querySelectorAll('.rating-fields input').forEach(input => { input.value = ''; }); const field = document.querySelector(personField[currentMember()] || '#ratingYou'); if (field) { field.disabled = false; field.style.display = ''; } const helper = document.querySelector('.field-help'); if (helper) helper.textContent = 'Minha nota pro filme, de 0 a 10'; };
  document.addEventListener('auth:ready', () => { renderPendingRatings(); homeMonthlyScores(); monthlyRanking(); });
  const table = document.querySelector('#historyTable'); if (table) new MutationObserver(renderRatingChips).observe(table, { childList: true });
  renderRatingChips();
})();
