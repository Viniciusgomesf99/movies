// Adaptador temporário de persistência. Enquanto os placeholders não forem trocados,
// a aplicação continua funcionando com localStorage. Depois da configuração,
// crie a tabela `movies` com as colunas descritas no README e o adaptador passa a usar o Supabase.
(function () {
  const config = window.SUPABASE_CONFIG || {};
  const ready = window.supabase && config.url && config.anonKey && !config.url.includes('SEU-PROJETO') && !config.anonKey.includes('SUA_ANON');
  const client = ready ? window.supabase.createClient(config.url, config.anonKey) : null;

  window.movieStore = {
    isRemote: Boolean(client),
    async loadMovies() {
      if (!client) return JSON.parse(localStorage.getItem('domingoMovies') || 'null') || [];
      const { data, error } = await client.from('movies').select('*').order('date', { ascending: false });
      if (error) { console.warn('Supabase load:', error.message); return []; }
      const { data: ratingRows } = await client.from('movie_ratings').select('movie_id,user_id,rating');
        const { data: profiles } = await client.from('profiles').select('id,username,display_name');
      const displayNames = { nefasto: 'Nefasto', shaco: 'Shaco', pachenko: 'Pachenko' };
      const usernames = Object.fromEntries((profiles || []).map(profile => [profile.id, displayNames[String(profile.username || '').toLowerCase()] || profile.display_name || profile.username]));
      const normalizeRatings = source => Object.fromEntries(Object.entries(source || {}).map(([name, value]) => [displayNames[String(name).toLowerCase()] || name, value]));
      const ratingsByMovie = {};
      (ratingRows || []).forEach(row => { (ratingsByMovie[row.movie_id] ||= {})[usernames[row.user_id] || row.user_id] = row.rating; });
      return (data || []).map(row => {
        const ratings = { ...normalizeRatings(row.ratings), ...(ratingsByMovie[row.id] || {}) };
        const values = Object.values(ratings).map(Number).filter(Number.isFinite);
        return { ...row, ratings, group: values.length ? (values.reduce((a, value) => a + value, 0) / values.length).toFixed(1) : row.group_score };
      });
    },
    async saveMovies(items) {
      localStorage.setItem('domingoMovies', JSON.stringify(items));
      if (!client) return;
      const currentId = window.currentUser?.id;
      const currentUsername = window.currentUser?.username;
      const ownedItems = items.filter(movie => movie.created_by === currentId || movie.created_by_username === currentUsername);
      const { data: existing } = await client.from('movies').select('id').eq('created_by', currentId);
      const ids = ownedItems.map(movie => String(movie.id));
      const removed = (existing || []).map(row => String(row.id)).filter(id => !ids.includes(id));
      if (removed.length) await client.from('movies').delete().in('id', removed);
      const payload = ownedItems.map(movie => ({
        id: String(movie.id), title: movie.title, year: movie.year, score: movie.score,
        group_score: movie.group, member: movie.member, date: movie.date,
        poster: movie.poster || null, backdrop: movie.backdrop || null,
        overview: movie.overview || null, ratings: movie.ratings || {},
        created_by: movie.created_by || window.currentUser?.id || null,
        created_by_username: movie.created_by_username || window.currentUser?.username || null
      }));
      const { error } = await client.from('movies').upsert(payload, { onConflict: 'id' });
      if (error) console.warn('Supabase save:', error.message);
    },
    async deleteMovie(id) {
      if (client) {
        const { error } = await client.from('movies').delete().eq('id', String(id));
        if (error) console.warn('Supabase delete:', error.message);
      }
    },
    async saveRating(movieId, rating) {
      localStorage.setItem('domingoMovies', JSON.stringify(window.__domingoMovies || []));
      if (!client || !window.currentUser?.id) return;
      const { error } = await client.from('movie_ratings').upsert({ movie_id: String(movieId), user_id: window.currentUser.id, rating: Number(rating) }, { onConflict: 'movie_id,user_id' });
      if (error) console.warn('Supabase rating:', error.message);
    }
  };
})();
