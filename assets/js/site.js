/*
	Uday Tyagi — portfolio interactions.
	Plain JavaScript; every feature degrades to a readable static page.
*/
(function() {
	'use strict';

	var root = document.documentElement;

	/* ---------- Theme toggle ---------- */

	var themeToggle = document.querySelector('.theme-toggle');

	// Dark is the default; the head script always sets data-theme.
	function currentTheme() {
		return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
	}

	function syncThemeToggle() {
		if (!themeToggle)
			return;
		var next = currentTheme() === 'dark' ? 'light' : 'dark';
		themeToggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
	}

	if (themeToggle) {
		syncThemeToggle();
		themeToggle.addEventListener('click', function() {
			var next = currentTheme() === 'dark' ? 'light' : 'dark';
			root.setAttribute('data-theme', next);
			try {
				localStorage.setItem('theme', next);
			} catch (e) {}
			syncThemeToggle();
			document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
		});
	}

	/* ---------- Motion switch ---------- */

	var motionToggle = document.querySelector('.motion-toggle');

	function syncMotionToggle() {
		var on = !root.classList.contains('motion-off');
		motionToggle.setAttribute('aria-pressed', String(on));
		motionToggle.textContent = 'Animations: ' + (on ? 'on' : 'off');
	}

	if (motionToggle) {
		syncMotionToggle();
		motionToggle.addEventListener('click', function() {
			var on = root.classList.contains('motion-off');
			root.classList.toggle('motion-off', !on);
			try {
				localStorage.setItem('motion', on ? 'on' : 'off');
			} catch (e) {}
			syncMotionToggle();
			document.dispatchEvent(new CustomEvent('motionchange', { detail: { on: on } }));
		});
	}

	/* ---------- Navigation ---------- */

	var nav = document.getElementById('nav');
	var navToggle = document.querySelector('.nav-toggle');
	var navLinks = document.querySelectorAll('.nav-links a');

	function setNavOpen(open) {
		nav.classList.toggle('nav-open', open);
		navToggle.setAttribute('aria-expanded', String(open));
		navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	}

	if (nav && navToggle) {
		navToggle.addEventListener('click', function() {
			setNavOpen(!nav.classList.contains('nav-open'));
		});

		navLinks.forEach(function(link) {
			link.addEventListener('click', function() {
				setNavOpen(false);
			});
		});

		document.addEventListener('keydown', function(event) {
			if (event.key === 'Escape' && nav.classList.contains('nav-open')) {
				setNavOpen(false);
				navToggle.focus();
			}
		});

		document.addEventListener('click', function(event) {
			if (nav.classList.contains('nav-open') && !nav.contains(event.target))
				setNavOpen(false);
		});
	}

	// Hairline under the nav once the page has scrolled.
	if (nav) {
		var ticking = false;
		var onScroll = function() {
			if (ticking)
				return;
			ticking = true;
			window.requestAnimationFrame(function() {
				nav.classList.toggle('is-scrolled', window.scrollY > 8);
				ticking = false;
			});
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
	}

	/* ---------- Case study expand / collapse ---------- */

	document.querySelectorAll('.case-toggle').forEach(function(toggle) {
		var panel = document.getElementById(toggle.getAttribute('aria-controls'));
		var label = toggle.querySelector('.case-toggle-label');
		if (!panel)
			return;

		function setExpanded(expanded) {
			toggle.setAttribute('aria-expanded', String(expanded));
			panel.classList.toggle('is-collapsed', !expanded);
			panel.inert = !expanded;
			if (label)
				label.textContent = expanded ? 'Close the case study' : 'Read the case study';
		}

		setExpanded(false);

		toggle.addEventListener('click', function() {
			setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
		});
	});

	/* ---------- Reveal on scroll & active section ---------- */

	// Stagger stations on the approach track.
	document.querySelectorAll('.track .station').forEach(function(station, index) {
		station.style.setProperty('--i', index);
	});

	// Stagger sibling reveals inside grids so groups don't pop in at once.
	document.querySelectorAll('.toolkit, .case-pair').forEach(function(group) {
		group.querySelectorAll(':scope > .reveal').forEach(function(node, index) {
			node.style.setProperty('--reveal-delay', (index % 3) * 90 + 'ms');
		});
	});

	var revealNodes = document.querySelectorAll('.reveal');

	if ('IntersectionObserver' in window) {
		var revealObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (!entry.isIntersecting)
					return;
				entry.target.classList.add('is-visible');
				revealObserver.unobserve(entry.target);
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

		revealNodes.forEach(function(node) {
			revealObserver.observe(node);
		});

		var linkById = {};
		navLinks.forEach(function(link) {
			linkById[link.getAttribute('href').slice(1)] = link;
		});

		var sectionObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (!entry.isIntersecting)
					return;
				navLinks.forEach(function(link) {
					link.classList.remove('is-active');
					link.removeAttribute('aria-current');
				});
				var active = linkById[entry.target.id];
				if (active) {
					active.classList.add('is-active');
					active.setAttribute('aria-current', 'true');
				}
			});
		}, { rootMargin: '-45% 0px -50% 0px' });

		document.querySelectorAll('main section[id]').forEach(function(section) {
			sectionObserver.observe(section);
		});
	} else {
		revealNodes.forEach(function(node) {
			node.classList.add('is-visible');
		});
	}

	/* ---------- Hero grid spotlight (fine pointers only) ---------- */

	var hero = document.querySelector('.hero');
	var finePointer = window.matchMedia('(pointer: fine)');

	if (hero && finePointer.matches) {
		var frame = 0;
		hero.addEventListener('pointermove', function(event) {
			if (frame || root.classList.contains('motion-off'))
				return;
			frame = window.requestAnimationFrame(function() {
				var rect = hero.getBoundingClientRect();
				hero.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
				hero.style.setProperty('--my', ((event.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
				frame = 0;
			});
		});
	}

	/* ---------- Copy email ---------- */

	var copyStatus = document.querySelector('.copy-status');

	document.querySelectorAll('[data-copy]').forEach(function(button) {
		var label = button.querySelector('.copy-label');
		var resetTimer = 0;

		button.addEventListener('click', function() {
			var text = button.getAttribute('data-copy');
			var done = function(ok) {
				label.textContent = ok ? 'Copied' : 'Press Ctrl+C';
				button.classList.toggle('is-done', ok);
				if (copyStatus)
					copyStatus.textContent = ok ? 'Email address copied to clipboard.' : 'Copy failed. Select the address to copy it.';
				window.clearTimeout(resetTimer);
				resetTimer = window.setTimeout(function() {
					label.textContent = 'Copy';
					button.classList.remove('is-done');
				}, 2200);
			};

			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(function() { done(true); }, function() { done(false); });
			} else {
				done(false);
			}
		});
	});

	/* ---------- Contact form → mailto draft ---------- */

	var form = document.getElementById('contact-form');

	if (form) {
		var fields = {
			name: form.querySelector('#name'),
			email: form.querySelector('#email'),
			subject: form.querySelector('#subject'),
			message: form.querySelector('#message')
		};

		var setError = function(input, message) {
			var error = document.getElementById(input.id + '-error');
			input.setAttribute('aria-invalid', message ? 'true' : 'false');
			if (error)
				error.textContent = message;
		};

		var validate = function() {
			var email = fields.email.value.trim();
			var firstInvalid = null;

			if (!email) {
				setError(fields.email, 'Please add your email so I can reply.');
				firstInvalid = fields.email;
			} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				setError(fields.email, 'That email address doesn’t look right.');
				firstInvalid = fields.email;
			} else {
				setError(fields.email, '');
			}

			if (!fields.message.value.trim()) {
				setError(fields.message, 'Please write a short message.');
				firstInvalid = firstInvalid || fields.message;
			} else {
				setError(fields.message, '');
			}

			return firstInvalid;
		};

		[fields.email, fields.message].forEach(function(input) {
			input.addEventListener('input', function() {
				if (input.getAttribute('aria-invalid') === 'true')
					validate();
			});
		});

		form.addEventListener('submit', function(event) {
			event.preventDefault();

			var invalid = validate();
			if (invalid) {
				invalid.focus();
				return;
			}

			var name = fields.name.value.trim();
			var role = fields.subject.value.trim() || 'Opportunity';
			var subject = (name || 'Portfolio contact') + ' — ' + role;
			var body = fields.message.value.trim() + '\n\nReply to: ' + fields.email.value.trim();

			window.location.href = 'mailto:udaytyagi2020@gmail.com' +
				'?subject=' + encodeURIComponent(subject) +
				'&body=' + encodeURIComponent(body);
		});
	}

	/* ---------- Footer year ---------- */

	var year = document.getElementById('year');
	if (year)
		year.textContent = String(new Date().getFullYear());

	/* ---------- Status bar clock (Delhi time) ---------- */

	var clock = document.getElementById('clock');
	if (clock) {
		var formatter;
		try {
			formatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
		} catch (e) {}

		var tick = function() {
			if (!formatter)
				return;
			var now = new Date();
			clock.textContent = formatter.format(now);
			clock.setAttribute('datetime', now.toISOString());
		};
		tick();
		window.setInterval(tick, 20000);
	}
})();
