(function () {
  const fallbackPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
  const fallbackProfile = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';
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
    document.querySelectorAll('.pick-poster,.news-poster,.discover-card-poster,.table-poster,.movie-thumb,.catalog-result-image').forEach(image => image.onerror = () => { image.onerror = null; image.src = image.classList.contains('person-result-image') ? fallbackProfile : fallbackPoster; });
    const featured = document.querySelector('#featuredMovie');
    if (featured) { const background = featured.style.backgroundImage; if (background && !background.includes('unsplash')) { const url = background.slice(5, -2); const test = new Image(); test.onerror = () => { featured.style.backgroundImage = `url(${fallbackPoster})`; }; test.src = url; } }
  }
  const escapeDiscover = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const discoverPoster = movie => movie.poster || fallbackPoster;
  function ensureDiscoverResults() {
    const grid = document.querySelector('#view-discover .discover-grid');
    if (!grid) return null;
    let panel = document.querySelector('#discoverResultsPanel');
    if (!panel) { panel = document.createElement('section'); panel.id = 'discoverResultsPanel'; panel.className = 'panel discover-results-panel'; grid.insertAdjacentElement('afterend', panel); }
    return panel;
  }
  function renderEditorialLists(list) {
    const top = document.querySelector('#suggestionList');
    const panel = ensureDiscoverResults();
    const cards = list.slice(1, 4);
    if (top) { top.className = 'discover-top-list'; top.innerHTML = cards.map(movie => `<button type="button" class="news-card" data-movie-detail="${movie.id}"><img class="news-poster" src="${discoverPoster(movie)}" alt=""><span><strong>${escapeDiscover(movie.title)}</strong><small>${escapeDiscover(movie.year || 'sem ano')} · ★ ${escapeDiscover(movie.score)}</small></span></button>`).join(''); }
    if (panel) { panel.innerHTML = `<div class="panel-heading"><div><h3>Todos os resultados</h3><span>Filmes encontrados para esta curadoria.</span></div><span class="pill muted">${list.length} títulos</span></div><div class="discover-feed">${list.slice(4).map(movie => `<button type="button" class="discover-card" data-movie-detail="${movie.id}"><img class="discover-card-poster" src="${discoverPoster(movie)}" alt=""><span><strong>${escapeDiscover(movie.title)}</strong><small>${escapeDiscover(movie.year || 'sem ano')} · ★ ${escapeDiscover(movie.score)}</small><em>${escapeDiscover(movie.overview || 'Sem descrição disponível.')}</em></span></button>`).join('')}</div>`; }
  }
  function setDiscoverSearchContext(person) {
    let context = document.querySelector('#discoverSearchContext');
    if (!person) { context?.remove(); return; }
    if (!context) { context = document.createElement('div'); context.id = 'discoverSearchContext'; context.className = 'discover-search-context'; document.querySelector('#view-discover .discover-controls')?.insertAdjacentElement('afterend', context); }
    context.innerHTML = `<img class="catalog-result-image person-result-image" src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : fallbackProfile}" alt=""><span><small>FILMOGRAFIA DO ATOR</small><strong>${escapeDiscover(person.name)}</strong></span>`;
    context.querySelector('img').onerror = () => { context.querySelector('img').src = fallbackProfile; };
  }
  function wireDiscoverDetails(list) {
    const findMovie = id => list.find(movie => String(movie.id) === String(id));
    document.querySelectorAll('[data-movie-detail]').forEach(card => card.onclick = () => { const movie = findMovie(card.dataset.movieDetail); if (movie) openMovieDetails(movie); });
    const featured = document.querySelector('#featuredMovie');
    if (featured && list[0]) featured.onclick = event => { if (!event.target.closest('#featureAdd')) openMovieDetails(list[0]); };
  }
  const baseDiscover = renderDiscover;
  renderDiscover = list => {
    const activeList = Array.isArray(list) && list.length ? list : window.__discoverItems?.length ? window.__discoverItems : picks;
    baseDiscover(activeList);
    window.__discoverItems = activeList;
    const featureLabel = document.querySelector('#featuredMovie .featured-copy .pill');
    if (featureLabel) featureLabel.textContent = document.querySelector('#discoverSearchContext') ? 'FILMOGRAFIA DO ATOR' : topic === 'top100' ? 'TOP 100 · MELHORES NOTAS' : 'SUGESTÃO TMDB';
    renderEditorialLists(list);
    wireDiscoverDetails(activeList);
    decorateDiscoverImages();
  };
  const suggestionHost = document.querySelector('#suggestionList');
  if (suggestionHost) new MutationObserver(() => {
    if (!window.__discoverItems?.length || !suggestionHost.querySelector('.pick-row')) return;
    renderEditorialLists(window.__discoverItems);
    wireDiscoverDetails(window.__discoverItems);
    decorateDiscoverImages();
  }).observe(suggestionHost, { childList: true });

  let initialDiscoverLoaded = false;
  let initialDiscoverLoading = false;
  let initialDiscoverRetries = 0;
  async function loadInitialDiscover() {
    if (initialDiscoverLoaded || initialDiscoverLoading || !apiKey) return;
    initialDiscoverLoading = true;
    const featured = document.querySelector('#featuredMovie');
    if (featured) featured.classList.add('tmdb-loading');
    try {
      topic = categoryCatalog[0].id;
      const initialList = await fetchCategoryMovies(categoryCatalog[0]);
      if (initialList.length) { renderDiscover(initialList); initialDiscoverLoaded = true; return; }
      const response = await fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=pt-BR&page=1`);
      if (!response.ok) throw new Error('TMDB request failed');
      const data = await response.json();
      const list = (data.results || []).filter(movie => movie.title).map(movie => ({ id: movie.id, title: movie.title, year: movie.release_date?.slice(0, 4) || '', score: Number(movie.vote_average || 0).toFixed(1), group: '—', poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '', backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : '', overview: movie.overview || 'Sem descrição disponível.' }));
      if (list.length) { renderDiscover(list); initialDiscoverLoaded = true; }
    } catch (error) {
      console.warn('TMDB initial discovery:', error.message);
      if (initialDiscoverRetries < 2 && window.currentUser) { initialDiscoverRetries += 1; setTimeout(loadInitialDiscover, 1500); }
    } finally {
      initialDiscoverLoading = false;
      if (featured) featured.classList.remove('tmdb-loading');
    }
  }

  async function catalogSearch(query) {
    if (!apiKey || !query) return { suggestions: [], movies: [] };
    try {
      const params = `api_key=${apiKey}&language=pt-BR&include_adult=false&query=${encodeURIComponent(query)}`;
      const [peopleResponse, moviesResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/person?${params}`),
        fetch(`https://api.themoviedb.org/3/search/movie?${params}`)
      ]);
      if (!peopleResponse.ok || !moviesResponse.ok) throw new Error('TMDB search failed');
      const [peopleData, moviesData] = await Promise.all([peopleResponse.json(), moviesResponse.json()]);
      const personResults = (peopleData.results || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      const movieResultsClean = (moviesData.results || []).filter(item => item.title).map(item => ({ id: item.id, title: item.title, year: item.release_date?.slice(0, 4) || '', score: Number(item.vote_average || 0).toFixed(1), poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '', backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '', overview: item.overview || 'Sem descricao disponivel.' }));
      const combinedSuggestions = [...personResults.map(item => ({ ...item, media_type: 'person' })), ...movieResultsClean.map(item => ({ ...item, media_type: 'movie' }))];
      window.__catalogImages = Object.fromEntries([...personResults.map(item => [`person:${item.id}`, item.profile_path ? `https://image.tmdb.org/t/p/w185${item.profile_path}` : fallbackProfile]), ...movieResultsClean.map(item => [`movie:${item.id}`, item.poster || fallbackPoster])]);
      return { suggestions: combinedSuggestions, people: personResults, movies: movieResultsClean };
    } catch { return { suggestions: [], movies: [] }; }
  }

  async function personMovies(personId) {
    try {
      const creditsResponse = await fetch(`https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}&language=pt-BR`); const creditsData = await creditsResponse.json();
      return (creditsData.cast || []).filter(item => item.title).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).map(item => ({ id: item.id, title: item.title, year: item.release_date?.slice(0, 4) || '', score: Number(item.vote_average || 0).toFixed(1), poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '', backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '', overview: item.overview || 'Sem descrição disponível.' }));
    } catch { return []; }
  }

  function ensureMovieDetailModal() {
    let backdrop = document.querySelector('#movieDetailBackdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'movieDetailBackdrop';
    backdrop.className = 'movie-detail-backdrop';
    backdrop.innerHTML = '<article class="movie-detail-modal" role="dialog" aria-modal="true"><button type="button" class="movie-detail-close" aria-label="Fechar">×</button><div id="movieDetailContent"></div></article>';
    document.body.appendChild(backdrop);
    backdrop.querySelector('.movie-detail-close').onclick = () => backdrop.classList.remove('open');
    backdrop.onclick = event => { if (event.target === backdrop) backdrop.classList.remove('open'); };
    return backdrop;
  }
  async function openMovieDetails(movie) {
    if (!movie) return;
    const backdrop = ensureMovieDetailModal();
    const content = backdrop.querySelector('#movieDetailContent');
    backdrop.classList.add('open');
    content.innerHTML = '<div class="movie-detail-loading">Carregando informações do filme...</div>';
    try {
      const params = `api_key=${apiKey}&language=pt-BR`;
      const [detailsResponse, videosResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?${params}&append_to_response=credits`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?${params}`)
      ]);
      const details = detailsResponse.ok ? await detailsResponse.json() : movie;
      const videos = videosResponse.ok ? await videosResponse.json() : { results: [] };
      const trailer = (videos.results || []).filter(video => video.site === 'YouTube' && video.type === 'Trailer').sort((a, b) => Number(b.official) - Number(a.official))[0];
      const cast = (details.credits?.cast || []).slice(0, 8);
      const posterPath = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : discoverPoster(movie);
      const year = details.release_date?.slice(0, 4) || movie.year || 'sem ano';
      const score = Number(details.vote_average ?? movie.score ?? 0).toFixed(1);
      const genreNames = (details.genres || []).map(genre => genre.name).join(' · ');
      content.innerHTML = `<div class="movie-detail-hero" style="background-image:linear-gradient(0deg,rgba(20,20,20,.96),rgba(20,20,20,.05)),url('${posterPath}')"><div class="movie-detail-copy"><span class="pill orange">${escapeDiscover(year)} · ★ ${escapeDiscover(score)}</span><h2>${escapeDiscover(details.title || movie.title)}</h2><p>${escapeDiscover(details.overview || movie.overview || 'Sem descrição disponível.')}</p><div class="movie-detail-meta">${escapeDiscover(genreNames || 'Filme')} ${details.runtime ? ` · ${details.runtime} min` : ''}</div><button type="button" class="primary-button" id="detailAddButton">＋ adicionar à sessão</button></div></div>${trailer ? `<div class="movie-detail-trailer"><h3>Trailer</h3><iframe src="https://www.youtube.com/embed/${encodeURIComponent(trailer.key)}" title="Trailer de ${escapeDiscover(details.title || movie.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '<p class="movie-detail-no-trailer">Trailer não disponível para este título.</p>'}<div class="movie-detail-cast"><h3>Elenco principal</h3><div class="cast-grid">${cast.length ? cast.map(person => `<div class="cast-card"><img src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : fallbackProfile}" class="catalog-result-image person-result-image" alt=""><strong>${escapeDiscover(person.name)}</strong><small>${escapeDiscover(person.character || 'Elenco')}</small></div>`).join('') : '<span class="movie-detail-no-trailer">Elenco não disponível.</span>'}</div></div>`;
      content.querySelector('#detailAddButton').onclick = () => { backdrop.classList.remove('open'); openModal({ ...movie, title: details.title || movie.title, year, score, poster: posterPath, backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : movie.backdrop, overview: details.overview || movie.overview }); };
      decorateDiscoverImages();
    } catch (error) {
      content.innerHTML = `<div class="movie-detail-error"><h2>${escapeDiscover(movie.title)}</h2><p>Não foi possível carregar os detalhes agora.</p></div>`;
    }
  }
  window.openMovieDetails = openMovieDetails;

  const searchInput = document.querySelector('#movieSearch');
  const searchButton = document.querySelector('#searchMovie');
  if (searchInput && searchButton) {
    const box = searchInput.closest('.search-box'); const menu = document.createElement('div'); menu.id = 'catalogAutocomplete'; menu.className = 'catalog-autocomplete'; box.parentElement.appendChild(menu);
    let timer;
    const decorateAutocomplete = () => { menu.querySelectorAll('button[data-person],button[data-movie]').forEach(button => { if (button.querySelector('img')) return; const kind = button.dataset.person ? 'person' : 'movie'; const image = document.createElement('img'); image.className = `catalog-result-image ${kind === 'person' ? 'person-result-image' : ''}`; image.src = window.__catalogImages?.[`${kind}:${button.dataset[kind]}`] || (kind === 'person' ? fallbackProfile : fallbackPoster); image.alt = ''; button.prepend(image); }); };
    new MutationObserver(decorateAutocomplete).observe(menu, { childList: true });
    const fillAutocomplete = async () => {
      const query = searchInput.value.trim(); clearTimeout(timer); if (query.length < 2) { menu.innerHTML = ''; return; }
      timer = setTimeout(async () => { const data = await catalogSearch(query); const suggestions = data.suggestions.filter(item => item.media_type === 'person' || item.media_type === 'movie'); menu.innerHTML = suggestions.slice(0, 6).map(item => item.media_type === 'person' ? `<button type="button" data-person="${item.id}"><b>ator</b> ${item.name}</button>` : `<button type="button" data-movie="${item.id}"><b>filme</b> ${item.title}</button>`).join(''); menu.querySelectorAll('[data-person]').forEach(button => button.onclick = async () => { const person = data.people.find(item => String(item.id) === button.dataset.person); const list = await personMovies(button.dataset.person); setDiscoverSearchContext(person); renderDiscover(list.length ? list : picks); menu.innerHTML = ''; }); menu.querySelectorAll('[data-movie]').forEach(button => button.onclick = () => { const movie = data.movies.find(item => String(item.id) === button.dataset.movie); setDiscoverSearchContext(null); if (movie) renderDiscover([movie, ...data.movies.filter(item => item.id !== movie.id)]); menu.innerHTML = ''; }); }, 300);
    };
    searchInput.addEventListener('input', fillAutocomplete);
    searchButton.onclick = async () => { const data = await catalogSearch(searchInput.value.trim()); if (data.people?.length) { const person = data.people[0]; const credits = await personMovies(person.id); setDiscoverSearchContext(person); renderDiscover(credits.length ? credits : data.movies.length ? data.movies : picks); } else { setDiscoverSearchContext(null); renderDiscover(data.movies.length ? data.movies : picks); } menu.innerHTML = ''; if (!data.people?.length && !data.movies.length) toast('Nenhum filme encontrado'); };
  }

  const categoryCatalog = [
    { id: 'top100', label: 'Top 100 · melhores notas', kind: 'top' },
    { id: 'popular', label: 'Mais populares', kind: 'popular' },
    { id: 'now-playing', label: 'Em cartaz', kind: 'now' },
    { id: 'upcoming', label: 'Em breve', kind: 'upcoming' },
    { id: 'action', label: 'Ação', genre: 28 },
    { id: 'adventure', label: 'Aventura', genre: 12 },
    { id: 'animation', label: 'Animação', genre: 16 },
    { id: 'comedy', label: 'Comédia', genre: 35 },
    { id: 'crime', label: 'Crime', genre: 80 },
    { id: 'documentary', label: 'Documentários', genre: 99 },
    { id: 'drama', label: 'Drama', genre: 18 },
    { id: 'family', label: 'Família', genre: 10751 },
    { id: 'fantasy', label: 'Fantasia', genre: 14 },
    { id: 'history', label: 'História', genre: 36 },
    { id: 'horror', label: 'Terror', genre: 27 },
    { id: 'mystery', label: 'Mistério', genre: 9648 },
    { id: 'romance', label: 'Romance', genre: 10749 },
    { id: 'scifi', label: 'Ficção científica', genre: 878 },
    { id: 'thriller', label: 'Suspense', genre: 53 },
    { id: 'war', label: 'Guerra', genre: 10752 },
    { id: 'western', label: 'Faroeste', genre: 37 },
    { id: 'music', label: 'Musicais', genre: 10402 }
  ];
  function mapDiscoverMovie(movie) { return { id: movie.id, title: movie.title, year: movie.release_date?.slice(0, 4) || '', score: Number(movie.vote_average || 0).toFixed(1), group: '—', poster: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '', backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : '', overview: movie.overview || 'Sem descrição disponível.' }; }
  async function fetchCategoryMovies(category) {
    const pages = category.kind === 'top' ? 5 : category.kind === 'popular' ? 3 : category.kind === 'now' || category.kind === 'upcoming' ? 2 : 2;
    const endpoint = category.kind === 'top' ? 'movie/top_rated' : category.kind === 'popular' ? 'movie/popular' : category.kind === 'now' ? 'movie/now_playing' : category.kind === 'upcoming' ? 'movie/upcoming' : 'discover/movie';
    const query = category.genre ? `&sort_by=popularity.desc&vote_count.gte=100&with_genres=${category.genre}` : '';
    const responses = await Promise.all(Array.from({ length: pages }, (_, index) => fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&language=pt-BR&include_adult=false&page=${index + 1}${query}`)));
    const payloads = await Promise.all(responses.filter(response => response.ok).map(response => response.json()));
    const unique = new Map();
    payloads.flatMap(payload => payload.results || []).filter(movie => movie.title).forEach(movie => unique.set(movie.id, movie));
    return [...unique.values()].map(mapDiscoverMovie);
  }
  async function loadDiscoverCategory(category) {
    if (!apiKey) return renderDiscover(picks);
    setDiscoverSearchContext(null);
    const view = document.querySelector('#view-discover');
    view?.classList.add('discover-loading-state');
    const list = document.querySelector('#suggestionList');
    if (list) list.innerHTML = '<div class="discover-loading">Carregando catálogo...</div>';
    try { const movies = await fetchCategoryMovies(category); renderDiscover(movies.length ? movies : picks); }
    catch (error) { console.warn('TMDB category:', error.message); renderDiscover(picks); toast('Não foi possível carregar esta categoria'); }
    finally { view?.classList.remove('discover-loading-state'); }
  }
  const topicTabs = document.querySelector('.topic-tabs');
  if (topicTabs) {
    topicTabs.innerHTML = categoryCatalog.map(category => `<button class="topic${category.id === 'top100' ? ' active' : ''}" data-topic="${category.id}">${category.label}</button>`).join('');
    topicTabs.querySelectorAll('.topic').forEach(button => button.onclick = () => { topicTabs.querySelectorAll('.topic').forEach(item => item.classList.remove('active')); button.classList.add('active'); topic = button.dataset.topic; loadDiscoverCategory(categoryCatalog.find(category => category.id === button.dataset.topic) || categoryCatalog[0]); });
  }

  function shuffleDiscoverItems() {
    const source = (window.__discoverItems?.length ? window.__discoverItems : picks).slice();
    for (let index = source.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [source[index], source[swap]] = [source[swap], source[index]];
    }
    return source;
  }
  const randomMovieButton = document.querySelector('#randomMovie');
  if (randomMovieButton) randomMovieButton.onclick = () => { renderDiscover(shuffleDiscoverItems()); toast('Nova sugestão gerada'); };
  const morePicksButton = document.querySelector('#morePicks');
  if (morePicksButton) morePicksButton.onclick = () => renderDiscover(shuffleDiscoverItems());

  function syncWheel() {
    const wheel = document.querySelector('#rouletteWheel'); if (!wheel) return;
    const available = members.filter(person => !chosenThisWeek.includes(person.name));
    const colors = ['#f8c084', '#ee9650', '#f9d39e', '#e9ad70'];
    wheel.innerHTML = available.length ? available.map(person => `<span class="wheel-name">${person.name}</span>`).join('') : '<span class="wheel-name">sem membros</span>';
    const amount = Math.max(available.length, 1);
    wheel.style.background = `conic-gradient(from -90deg, ${available.map((_, index) => `${colors[index % colors.length]} ${index * 100 / amount}% ${(index + 1) * 100 / amount}%`).join(', ') || '#eceae5 0 100%'})`;
    wheel.querySelectorAll('.wheel-name').forEach((label, index) => { const angle = (-90 + ((index + .5) * 360 / amount)) * Math.PI / 180; label.style.right = 'auto'; label.style.bottom = 'auto'; label.style.left = `${50 + Math.cos(angle) * 32}%`; label.style.top = `${50 + Math.sin(angle) * 32}%`; });
  }
  syncWheel();
  const baseRouletteRender = renderRoulette;
  renderRoulette = () => { baseRouletteRender(); syncWheel(); };
  const eligible = document.querySelector('#eligibleList'); if (eligible) new MutationObserver(syncWheel).observe(eligible, { childList: true });
  let modalSpinning = false;
  const spin = document.querySelector('#spinButton');
  if (spin) spin.onclick = () => {
    if (modalSpinning) return; const available = members.filter(person => !chosenThisWeek.includes(person.name)); if (!available.length) { toast('Inclua pelo menos um membro na roleta'); return; }
    modalSpinning = true; const wheel = document.querySelector('#rouletteWheel'); const winner = available[Math.floor(Math.random() * available.length)]; wheel.classList.add('spinning');
    setTimeout(() => { wheel.classList.remove('spinning'); modalSpinning = false; window.rouletteController?.setWinner(winner.name); document.querySelector('#rouletteResult').innerHTML = `<span class="result-icon">✦</span><div><small>RESULTADO DO SORTEIO</small><h3>${winner.name} escolhe o próximo filme.</h3></div>`; showWinner(winner.name); }, 1500);
  };
  function showWinner(name) { let modal = document.querySelector('#winnerModal'); if (!modal) { modal = document.createElement('div'); modal.id = 'winnerModal'; modal.className = 'winner-modal'; modal.innerHTML = '<div class="winner-dialog"><button class="winner-close">×</button><span>✦</span><small>PRÓXIMO ESCOLHEDOR</small><h2></h2><p>Agora é só encontrar o filme da sessão.</p><button class="primary-button winner-ok">continuar</button></div>'; document.body.appendChild(modal); modal.querySelector('.winner-close').onclick = () => modal.classList.remove('open'); modal.querySelector('.winner-ok').onclick = () => modal.classList.remove('open'); } modal.querySelector('h2').textContent = name; modal.classList.add('open'); }

  const baseOpenModal = openModal;
  openModal = film => { baseOpenModal(film); document.querySelectorAll('.rating-fields input').forEach(input => { input.value = ''; }); const field = document.querySelector(personField[currentMember()] || '#ratingYou'); if (field) { field.disabled = false; field.style.display = ''; } const helper = document.querySelector('.field-help'); if (helper) helper.textContent = 'Minha nota pro filme, de 0 a 10'; };
  document.addEventListener('auth:ready', () => { renderPendingRatings(); homeMonthlyScores(); monthlyRanking(); loadInitialDiscover(); });
  if (window.currentUser) loadInitialDiscover();
  window.addEventListener('load', () => { if (window.currentUser) loadInitialDiscover(); });
  const table = document.querySelector('#historyTable'); if (table) new MutationObserver(renderRatingChips).observe(table, { childList: true });
  renderRatingChips();
})();
