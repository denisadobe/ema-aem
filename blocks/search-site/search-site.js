/*
 * Search Site Block
 * Rounded search field (search icon, input, clear button) with client-side
 * results from the query index.
 *
 * Authored structure (all rows optional):
 * - a row with a link (or a path / URL as text): query index source
 *   (defaults to /query-index.json)
 * - a row with plain text: input placeholder (defaults to placeholders or "Search...")
 */

import {
  createOptimizedPicture,
  decorateIcons,
} from '../../scripts/aem.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const { searchParams } = new URL(window.location.href);

function findNextHeading(el) {
  let preceedingEl = el.parentElement.previousElement || el.parentElement.parentElement;
  let h = 'H2';
  while (preceedingEl) {
    const lastHeading = [...preceedingEl.querySelectorAll('h1, h2, h3, h4, h5, h6')].pop();
    if (lastHeading) {
      const level = parseInt(lastHeading.nodeName[1], 10);
      h = level < 6 ? `H${level + 1}` : 'H6';
      preceedingEl = false;
    } else {
      preceedingEl = preceedingEl.previousElement || preceedingEl.parentElement;
    }
  }
  return h;
}

function highlightTextElements(terms, elements) {
  elements.forEach((element) => {
    if (!element || !element.textContent) return;

    const matches = [];
    const { textContent } = element;
    terms.forEach((term) => {
      let start = 0;
      let offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      while (offset >= 0) {
        matches.push({ offset, term: textContent.substring(offset, offset + term.length) });
        start = offset + term.length;
        offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      }
    });

    if (!matches.length) return;

    matches.sort((a, b) => a.offset - b.offset);
    let currentIndex = 0;
    const fragment = matches.reduce((acc, { offset, term }) => {
      if (offset < currentIndex) return acc;
      const textBefore = textContent.substring(currentIndex, offset);
      if (textBefore) acc.appendChild(document.createTextNode(textBefore));
      const markedTerm = document.createElement('mark');
      markedTerm.textContent = term;
      acc.appendChild(markedTerm);
      currentIndex = offset + term.length;
      return acc;
    }, document.createDocumentFragment());
    const textAfter = textContent.substring(currentIndex);
    if (textAfter) fragment.appendChild(document.createTextNode(textAfter));
    element.innerHTML = '';
    element.appendChild(fragment);
  });
}

export async function fetchData(source) {
  const response = await fetch(source);
  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error('error loading API response', response);
    return null;
  }

  const json = await response.json();
  if (!json) {
    // eslint-disable-next-line no-console
    console.error('empty API response', source);
    return null;
  }

  return json.data;
}

function resultPicture(src) {
  const url = new URL(src, window.location.href);
  if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) {
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = url.href;
    img.alt = '';
    img.loading = 'lazy';
    picture.append(img);
    return picture;
  }
  return createOptimizedPicture(src, '', false, [{ width: '375' }]);
}

function renderResult(result, searchTerms, titleTag) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = result.path;
  const section = (result.path || '').split('/').filter(Boolean).slice(0, -1).join('/');
  if (section) {
    const path = document.createElement('p');
    path.className = 'search-site-result-path';
    path.textContent = `${section}/`;
    a.append(path);
  }
  if (result.image) {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-site-result-image';
    wrapper.append(resultPicture(result.image));
    a.append(wrapper);
  }
  if (result.title) {
    const title = document.createElement(titleTag);
    title.className = 'search-site-result-title';
    const span = document.createElement('span');
    span.textContent = result.title;
    highlightTextElements(searchTerms, [span]);
    title.append(span);
    a.append(title);
  }
  if (result.description) {
    const description = document.createElement('p');
    description.textContent = result.description;
    highlightTextElements(searchTerms, [description]);
    a.append(description);
  }
  li.append(a);
  return li;
}

function clearSearchResults(block) {
  const searchResults = block.querySelector('.search-site-results');
  searchResults.innerHTML = '';
}

function clearSearch(block) {
  clearSearchResults(block);
  block.classList.remove('search-site-has-value');
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
  }
}

async function renderResults(block, config, filteredData, searchTerms) {
  clearSearchResults(block);
  const searchResults = block.querySelector('.search-site-results');
  const headingTag = searchResults.dataset.h;

  if (filteredData.length) {
    searchResults.classList.remove('no-results');
    filteredData.forEach((result) => {
      searchResults.append(renderResult(result, searchTerms, headingTag));
    });
  } else {
    const noResultsMessage = document.createElement('li');
    searchResults.classList.add('no-results');
    noResultsMessage.textContent = config.placeholders.searchNoResults || 'No results found.';
    searchResults.append(noResultsMessage);
  }
}

function compareFound(hit1, hit2) {
  return hit1.minIdx - hit2.minIdx;
}

function filterData(searchTerms, data) {
  const foundInHeader = [];
  const foundInMeta = [];

  data.forEach((result) => {
    let minIdx = -1;

    searchTerms.forEach((term) => {
      const idx = (result.header || result.title || '').toLowerCase().indexOf(term);
      if (idx < 0) return;
      if (minIdx < idx) minIdx = idx;
    });

    if (minIdx >= 0) {
      foundInHeader.push({ minIdx, result });
      return;
    }

    const metaContents = `${result.title} ${result.description} ${(result.path || '').split('/').pop()}`.toLowerCase();
    searchTerms.forEach((term) => {
      const idx = metaContents.indexOf(term);
      if (idx < 0) return;
      if (minIdx < idx) minIdx = idx;
    });

    if (minIdx >= 0) foundInMeta.push({ minIdx, result });
  });

  return [
    ...foundInHeader.sort(compareFound),
    ...foundInMeta.sort(compareFound),
  ].map((item) => item.result);
}

async function handleSearch(e, block, config) {
  const searchValue = e.target.value;
  block.classList.toggle('search-site-has-value', !!searchValue);
  searchParams.set('q', searchValue);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchValue);
    window.history.replaceState({}, '', url.toString());
  }

  if (searchValue.length < 3) {
    clearSearchResults(block);
    return;
  }
  const searchTerms = searchValue.toLowerCase().split(/\s+/).filter((term) => !!term);

  const data = await fetchData(config.source);
  if (!data) return;
  const filteredData = filterData(searchTerms, data);
  await renderResults(block, config, filteredData, searchTerms);
}

function searchResultsContainer(block) {
  const results = document.createElement('ul');
  results.className = 'search-site-results';
  results.dataset.h = findNextHeading(block);
  return results;
}

function searchInput(block, config) {
  const input = document.createElement('input');
  input.setAttribute('type', 'search');
  input.className = 'search-site-input';
  input.id = `search-site-input-${document.querySelectorAll('.search-site-input').length}`;

  // the placeholder text renders as a floating label; a blank placeholder keeps
  // :placeholder-shown usable for the label float
  input.placeholder = ' ';

  input.addEventListener('input', (e) => {
    handleSearch(e, block, config);
  });

  input.addEventListener('keyup', (e) => {
    if (e.code === 'Escape') {
      input.value = '';
      clearSearch(block);
    }
  });

  return input;
}

function searchLabel(input, config) {
  const label = document.createElement('label');
  label.className = 'search-site-label';
  label.htmlFor = input.id;
  label.textContent = config.label;
  return label;
}

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search-light', 'search-site-icon');
  return icon;
}

function clearButton(block, config) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-site-clear';
  const label = config.placeholders.searchClear || 'Clear';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', () => {
    const input = block.querySelector('.search-site-input');
    input.value = '';
    clearSearch(block);
    input.focus();
  });
  return button;
}

function searchBox(block, config) {
  const box = document.createElement('div');
  box.classList.add('search-site-box');
  const input = searchInput(block, config);
  box.append(
    input,
    searchLabel(input, config),
    searchIcon(),
    clearButton(block, config),
  );
  return box;
}

function readConfig(block) {
  let source = '';
  let placeholder = '';
  [...block.children].forEach((row) => {
    const link = row.querySelector('a[href]');
    const text = row.textContent.trim();
    if (link && !source) {
      source = link.href;
    } else if (/^(https?:\/\/|\/)/.test(text) && !source) {
      source = text;
    } else if (text && !placeholder) {
      placeholder = text;
    }
  });
  return { source, placeholder };
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const authored = readConfig(block);
  const source = authored.source || `${window.hlx.codeBasePath}/query-index.json`;
  const label = authored.placeholder || placeholders.searchPlaceholder || 'Search...';
  const config = { source, label, placeholders };

  block.innerHTML = '';
  block.append(
    searchBox(block, config),
    searchResultsContainer(block),
  );

  if (searchParams.get('q')) {
    const input = block.querySelector('input');
    input.value = searchParams.get('q');
    input.dispatchEvent(new Event('input'));
  }

  decorateIcons(block);
}
