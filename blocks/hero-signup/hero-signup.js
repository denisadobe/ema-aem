import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Authored rows (UE model, grouped cells):
//   media   - picture and/or video link
//   content - rich text (eyebrow, heading, description)
//   form    - label paragraph, placeholder paragraph, button link
const VIDEO_RE = /\.(mp4|webm|ogg|m3u8)(\?|$)|youtube\.com|youtu\.be|vimeo\.com/i;
const VIDEO_FILE_RE = /\.(mp4|webm|ogg)(\?|$)/i;
const HEADING = 'h1, h2, h3, h4, h5, h6';

function cellOf(row) {
  return row.querySelector(':scope > div') || row;
}

function isVideoLink(a) {
  return VIDEO_RE.test(a.href);
}

function classifyRows(rows) {
  const groups = { media: [], content: [], form: [] };
  if (rows.length === 3) {
    [groups.media, groups.content, groups.form] = rows.map((r) => [r]);
    return groups;
  }
  // content-based fallback for differently shaped content
  rows.forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('picture, img')) return;
    const hasHeading = row.querySelector(HEADING);
    const hasMedia = row.querySelector('picture, img')
      || [...row.querySelectorAll('a[href]')].some(isVideoLink);
    if (hasMedia && !hasHeading) groups.media.push(row);
    else if (hasHeading) groups.content.push(row);
    else groups.form.push(row);
  });
  return groups;
}

function buildVideo(url) {
  if (!VIDEO_FILE_RE.test(url)) return null;
  const video = document.createElement('video');
  video.className = 'hero-signup-video';
  video.muted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  const source = document.createElement('source');
  source.src = url;
  video.append(source);
  return video;
}

function buildMedia(rows, block) {
  const media = document.createElement('div');
  media.className = 'hero-signup-media';
  rows.forEach((row) => {
    moveInstrumentation(row, media);
    const cell = cellOf(row);
    const pic = cell.querySelector('picture') || cell.querySelector('img');
    if (pic) media.append(pic);
    const links = [...cell.querySelectorAll('a[href]')];
    let videoUrl = links.find(isVideoLink)?.href;
    if (!videoUrl) {
      // plain-text URL authored without a link
      const txt = cell.textContent.trim();
      if (VIDEO_RE.test(txt)) videoUrl = txt;
    }
    if (videoUrl) {
      const video = buildVideo(videoUrl);
      if (video) {
        media.append(video);
        block.classList.add('hero-signup-has-video');
      } else {
        const a = links.find(isVideoLink);
        if (a) {
          a.classList.add('hero-signup-video-link');
          media.append(a);
        }
      }
    }
  });
  return media;
}

function buildText(rows) {
  const text = document.createElement('div');
  text.className = 'hero-signup-text';
  rows.forEach((row, i) => {
    if (i === 0) moveInstrumentation(row, text);
    text.append(...cellOf(row).childNodes);
  });
  const heading = text.querySelector(HEADING);
  if (heading) {
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P') prev.classList.add('hero-signup-eyebrow');
      prev = prev.previousElementSibling;
    }
  }
  return text;
}

function buildForm(rows) {
  let link = null;
  const plain = [];
  rows.forEach((row) => {
    const cell = cellOf(row);
    const blocks = cell.querySelector('p, div') ? [...cell.children] : [cell];
    blocks.forEach((el) => {
      const a = el.querySelector('a[href]') || (el.matches('a[href]') ? el : null);
      if (a && !link) link = a;
      else if (el.textContent.trim()) plain.push(el.textContent.trim());
    });
  });
  const [labelText = '', placeholderText = ''] = plain;
  if (!labelText && !placeholderText && !link) return null;

  const form = document.createElement('form');
  form.className = 'hero-signup-form';
  form.noValidate = true;
  if (rows[0]) moveInstrumentation(rows[0], form);

  if (labelText) {
    const title = document.createElement('p');
    title.className = 'hero-signup-form-title';
    title.textContent = labelText;
    form.append(title);
  }

  const fieldId = `hero-signup-field-${Math.random().toString(36).slice(2, 8)}`;
  const label = document.createElement('label');
  label.className = 'hero-signup-label';
  label.htmlFor = fieldId;
  label.textContent = placeholderText || labelText || 'Input';
  const input = document.createElement('input');
  input.className = 'hero-signup-input';
  input.id = fieldId;
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  if (placeholderText) input.placeholder = placeholderText;
  form.append(label, input);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'hero-signup-submit';
  button.textContent = link ? link.textContent.trim() : 'Continue';
  form.append(button);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (link) window.location.href = link.href;
  });
  return form;
}

export default function decorate(block) {
  const groups = classifyRows([...block.children]);

  const media = buildMedia(groups.media, block);
  const content = document.createElement('div');
  content.className = 'hero-signup-content';
  if (groups.content.some((r) => r.textContent.trim())) content.append(buildText(groups.content));
  const form = buildForm(groups.form);
  if (form) content.append(form);

  const hasMedia = media.childNodes.length > 0;
  block.replaceChildren(...(hasMedia ? [media] : []), content);
  if (!hasMedia) block.classList.add('hero-signup-no-media');

  block.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const picture = createOptimizedPicture(img.src, img.alt, true, [{ width: '1200' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    img.closest('picture').replaceWith(picture);
  });
}
