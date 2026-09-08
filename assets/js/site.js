(function () {
  'use strict';

  // Mobile navigation toggle. The button is in the markup; this only wires it.
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-primary');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Rebuilds the contact address in the browser so the plain string never
  // appears in the served HTML, where bulk-mail scrapers harvest it.
  function decode(element) {
    var user = element.getAttribute('data-u');
    var domain = element.getAttribute('data-d');
    return user && domain ? user + '@' + domain : '';
  }
  var spans = document.querySelectorAll('span.md-email');
  for (var i = 0; i < spans.length; i += 1) {
    var address = decode(spans[i]);
    if (address) spans[i].textContent = address;
  }
  var links = document.querySelectorAll('a.md-email-link');
  for (var j = 0; j < links.length; j += 1) {
    var target = decode(links[j]);
    if (target) links[j].setAttribute('href', 'mail' + 'to:' + target);
  }
})();
