const clientId = 'lsm6not7foe0dh0jpebck3bq9r8r2p';
const clientSecret = 'vck9el3vzznewjqto5ey8fca5ua973';
const baseUrl = 'https://api.twitch.tv/helix/streams';

let accessToken = null;
let currentPage = 1;
let paginationCursor = null; // Cursor for next page
const resultsPerPage = 10;
const cache = {}; // Cache for storing previous pages

// Format date / time
function formatISODate(isoDate) {
  const date = new Date(isoDate);

  // Options for formatting the date
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: undefined,
    hour12: true,
    timeZone: 'UTC',
  };

  return date.toLocaleString('en-US', options);
}

// Fetch an access token using Client Credentials Flow
async function fetchAccessToken() {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params,
  });
  const data = await response.json();
  accessToken = data.access_token;
  console.log('Access Token:', accessToken);
}

// Initiate search for streams
async function searchStreams() {
  currentPage = 1;
  paginationCursor = null;
  Object.keys(cache).forEach((key) => delete cache[key]); // Clear cache
  const gameName = document.getElementById('query').value.trim();
  if (!gameName) return displayError('Please enter a game name or query.');
  document.getElementById('results').innerHTML = '';
  document.getElementById('pagination').innerHTML = '';
  await fetchStreams(gameName);
}

// Fetch streams from the Twitch API
async function fetchStreams(gameName) {
  showSpinner(true);
  clearError();

  if (cache[currentPage]) {
    // Load from cache for previous pages
    console.log('Loading from cache:', cache[currentPage]);
    displayResults(cache[currentPage].streams);
    paginationCursor = cache[currentPage].nextCursor;
    showPagination();
    showSpinner(false);
    return;
  }

  const params = new URLSearchParams({
    game_name: gameName, // Stream search by game name
    first: resultsPerPage,
  });
  if (paginationCursor) params.append('after', paginationCursor);

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    console.log('Streams Data:', data);

    if (!data.data || data.data.length === 0) {
      displayError('No streams found.');
      showSpinner(false);
      return;
    }

    displayResults(data.data);

    // Cache the current page
    cache[currentPage] = {
      streams: data.data,
      nextCursor: data.pagination?.cursor || null,
    };

    paginationCursor = data.pagination?.cursor || null; // Update cursor
    showPagination();
  } catch (error) {
    displayError('Failed to fetch streams. Please try again.');
    console.error(error);
  } finally {
    showSpinner(false);
  }
}

// Display the streams
function displayResults(streams) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = ''; // Clear previous results

  streams.forEach((stream) => {
    // Safely handle tags array
    const tagsHtml = stream.tags
      ? stream.tags.map((tag) => `<span class="tag">${tag}</span>`).join(' ')
      : 'No Tags';

    const card = `
      <div class="card">
        <img src="${stream.thumbnail_url
          .replace('{width}', '120')
          .replace('{height}', '120')}" alt="Stream Thumbnail" />
        <div class="card-details">
          <div class="title"><h3>${stream.title}</h3>${
      stream.type === 'live'
        ? '<div class="online"></div>'
        : '<div class="offline"></div>'
    }</div>
          <p>${'<strong>Game Name: </strong>' + stream.game_name} - ${
      '<strong>Language: </strong>' + stream.language
    } - ${'<strong>Viewers: </strong>' + stream.viewer_count} </p>
          <p>${'<strong>Username: </strong>' + stream.user_name} ${
      '<strong>Tags: </strong>' + tagsHtml
    } </p>
    <p>${'<strong>Started At: </strong>' + formatISODate(stream.started_at)}</p>
    <a href="https://twitch.tv/${
      stream.user_login
    }" target="_blank">Visit Channel</a>
        </div>
      </div>
    `;
    resultsDiv.innerHTML += card;
  });
}

// Show pagination controls
function showPagination() {
  const paginationDiv = document.getElementById('pagination');
  paginationDiv.innerHTML = '';

  // Previous Page Button
  const prevButton = document.createElement('button');
  prevButton.innerText = '◀';
  prevButton.onclick = () => changePage('prev');
  prevButton.disabled = currentPage === 1;
  paginationDiv.appendChild(prevButton);

  // Page Info
  const pageInfo = document.createElement('span');
  pageInfo.innerText = ` Page ${currentPage} `;
  paginationDiv.appendChild(pageInfo);

  // Next Page Button
  const nextButton = document.createElement('button');
  nextButton.innerText = '▶';
  nextButton.onclick = () => changePage('next');
  nextButton.disabled = !paginationCursor;
  paginationDiv.appendChild(nextButton);
}

// Change page
function changePage(direction) {
  const gameName = document.getElementById('query').value.trim();

  if (direction === 'next' && paginationCursor) {
    currentPage++;
    fetchStreams(gameName);
  } else if (direction === 'prev' && currentPage > 1) {
    currentPage--;
    fetchStreams(gameName);
  }
}

// Show spinner
function showSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'block' : 'none';
}

// Display error
function displayError(message) {
  document.getElementById('error').innerText = message;
}

// Clear error message
function clearError() {
  document.getElementById('error').innerText = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchAccessToken);
