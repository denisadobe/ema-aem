import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '96' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

/**
 * Default channel icon (from /icons/contact-*.svg, drawn by CSS) used when the
 * author did not provide an icon image.
 */
function channelIcon(name) {
  const icon = document.createElement('span');
  icon.className = `cards-contact-icon cards-contact-icon-${name}`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function iconForLink(a) {
  const href = (a.getAttribute('href') || '').toLowerCase();
  const text = a.textContent.toLowerCase();
  if (href.startsWith('tel:')) return 'phone';
  if (/libras|callvideo/.test(href) || text.includes('libras')) return 'libras';
  if (/formulario|form|\.pdf/.test(href)) return 'document';
  return 'nu';
}

/** A paragraph holding nothing but one link. */
function isLinkParagraph(el) {
  if (el.tagName !== 'P') return false;
  const a = el.querySelector(':scope > a');
  return !!a && el.children.length === 1 && el.textContent.trim() === a.textContent.trim();
}

/** Paragraph that starts with an authored inline icon image. */
function leadingPicture(el) {
  const first = el.firstElementChild;
  return el.tagName === 'P' && first && first.tagName === 'PICTURE' ? first : null;
}

function makeRow(className, icon, nodes) {
  const row = document.createElement('div');
  row.className = className;
  const iconWrap = document.createElement('span');
  iconWrap.className = `${className}-icon`;
  iconWrap.append(icon);
  const content = document.createElement('div');
  content.className = `${className}-content`;
  content.append(...nodes);
  row.append(iconWrap, content);
  return row;
}

/**
 * Card body patterns:
 * - phone card: intro text, then phone links each followed by a description line
 * - link card: one link per paragraph, each shown as icon + link row
 * - message card: plain text shown beside a chat icon
 * The authored icon cell (if any) replaces the default icon of the card header.
 */
function decorateBody(body, authoredIcon) {
  const items = [...body.children];
  const hasPhone = !!body.querySelector('a[href^="tel:"]');
  const allLinks = items.length > 0
    && items.every((el) => isLinkParagraph(el) || leadingPicture(el));
  const rendered = [];

  if (allLinks && !hasPhone) {
    items.forEach((el, i) => {
      const pic = leadingPicture(el);
      let icon;
      if (pic) icon = pic;
      else if (i === 0 && authoredIcon) icon = authoredIcon;
      else icon = channelIcon(iconForLink(el.querySelector('a')));
      el.querySelectorAll('a').forEach((a) => a.classList.add('cards-contact-link'));
      rendered.push(makeRow('cards-contact-row', icon, [el]));
    });
  } else {
    const firstLink = hasPhone ? items.findIndex(isLinkParagraph) : -1;
    const intro = firstLink === -1 ? items : items.slice(0, firstLink);
    const rest = firstLink === -1 ? [] : items.slice(firstLink);
    if (intro.length) {
      const icon = authoredIcon || channelIcon(hasPhone ? 'phone' : 'chat');
      rendered.push(makeRow('cards-contact-header', icon, intro));
    }
    if (rest.length) {
      const list = document.createElement('div');
      list.className = 'cards-contact-phones';
      let group;
      rest.forEach((el) => {
        if (isLinkParagraph(el) || !group) {
          group = document.createElement('div');
          group.className = 'cards-contact-phone';
          list.append(group);
        }
        if (isLinkParagraph(el)) el.classList.add('cards-contact-phone-number');
        group.append(el);
      });
      rendered.push(list);
    }
  }
  body.replaceChildren(...rendered);
}

export default function decorate(block) {
  // phone numbers and channel links are text links here, not pill buttons
  block.querySelectorAll('.button-container').forEach((p) => p.classList.remove('button-container'));
  block.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-contact-card';
    moveInstrumentation(row, li);
    let authoredIcon = null;
    let body = null;
    [...row.children].forEach((div) => {
      const hasText = !!div.textContent.trim();
      const pic = div.querySelector('picture');
      if (!hasText && pic && !authoredIcon) {
        authoredIcon = pic;
      } else if (hasText && !body) {
        body = div;
      }
    });
    if (!body) return;
    body.className = 'cards-contact-card-body';
    decorateBody(body, authoredIcon);
    li.append(body);
    ul.append(li);
  });
  optimizeImages(ul);
  block.replaceChildren(ul);
}
