(function($) {

	var $window = $(window);
	var $body = $('body');
	var $nav = $('#nav');

	breakpoints({
		xlarge: ['1281px', '1680px'],
		large: ['981px', '1280px'],
		medium: ['737px', '980px'],
		small: [null, '736px']
	});

	$window.on('load', function() {
		window.setTimeout(function() {
			$body.removeClass('is-preload');
		}, 80);
	});

	var cursorOrb = document.querySelector('.cursor-orb');
	var cursorGlow = document.querySelector('.cursor-glow');
	var roleRotator = document.getElementById('role-rotator');
	var navToggle = document.querySelector('.nav-toggle');
	var navLinksWrap = document.querySelector('.nav-links');
	var hoverTargets = document.querySelectorAll(
		'a, button, .button, .nav-cta, .brand-pill, .signal-chip, .tag-cloud li, .magnetic-card, input, textarea'
	);

	if (navToggle) {
		navToggle.addEventListener('click', function() {
			var isOpen = $nav.hasClass('nav-open');

			$nav.toggleClass('nav-open', !isOpen);
			navToggle.setAttribute('aria-expanded', String(!isOpen));
		});

		if (navLinksWrap) {
			navLinksWrap.querySelectorAll('a').forEach(function(link) {
				link.addEventListener('click', function() {
					$nav.removeClass('nav-open');
					navToggle.setAttribute('aria-expanded', 'false');
				});
			});
		}

		document.addEventListener('keydown', function(event) {
			if (event.key !== 'Escape')
				return;

			$nav.removeClass('nav-open');
			navToggle.setAttribute('aria-expanded', 'false');
		});
	}

	if (cursorOrb && cursorGlow && window.matchMedia('(pointer: fine)').matches) {
		document.body.classList.add('cursor-ready');

		window.addEventListener('mousemove', function(event) {
			var isHover = document.body.classList.contains('cursor-hover');
			var orbScale = isHover ? 1.5 : 1;
			var glowScale = isHover ? 1.28 : 1;

			cursorOrb.style.transform =
				'translate3d(' + (event.clientX - 9) + 'px,' + (event.clientY - 9) + 'px,0) scale(' + orbScale + ')';
			cursorGlow.style.transform =
				'translate3d(' + (event.clientX - 23) + 'px,' + (event.clientY - 23) + 'px,0) scale(' + glowScale + ')';
		});

		document.addEventListener('mouseleave', function() {
			document.body.classList.remove('cursor-ready');
		});

		document.addEventListener('mouseenter', function() {
			document.body.classList.add('cursor-ready');
		});

		hoverTargets.forEach(function(target) {
			target.addEventListener('mouseenter', function() {
				document.body.classList.add('cursor-hover');
			});
			target.addEventListener('mouseleave', function() {
				document.body.classList.remove('cursor-hover');
			});
		});
	}

	if (roleRotator) {
		var roles = [
			"I'm a Frontend Engineer",
			"I'm a Full Stack Software Engineer",
			"I'm an Angular Specialist",
			"I'm an Enterprise Workflow Engineer",
			"I'm a Project Manager",
			"I'm a Healthcare-Tech Engineer"
		];
		var roleIndex = 0;
		roleRotator.textContent = roles[roleIndex];

		window.setInterval(function() {
			roleRotator.classList.add('is-switching');

			window.setTimeout(function() {
				roleIndex = (roleIndex + 1) % roles.length;
				roleRotator.textContent = roles[roleIndex];
				roleRotator.classList.remove('is-switching');
			}, 1000);
		}, 1000);
	}

	function navOffset() {
		return ($nav.outerHeight() || 0) + 18;
	}

	$('#nav a[href^="#"], .scrolly').on('click', function(event) {
		var href = $(this).attr('href');
		if (!href || href.charAt(0) !== '#')
			return;

		var $target = $(href);
		if (!$target.length)
			return;

		event.preventDefault();

		$('html, body').stop().animate({
			scrollTop: $target.offset().top - navOffset()
		}, 620, 'swing');
	});

	$('#contact form').on('submit', function(event) {
		event.preventDefault();

		var to = 'udaytyagi2020@gmail.com';
		var from = $('#email').val().trim();
		var role = $('#subject').val().trim() || 'Opportunity';
		var message = $('#message').val().trim();
		var name = $('#name').val().trim();

		if (!from) {
			alert('Please enter your email address.');
			$('#email').focus();
			return;
		}

		if (!message) {
			alert('Please enter a message.');
			$('#message').focus();
			return;
		}

		var subject = (name || 'Portfolio Contact') + ' - ' + role;
		var body = message + '\n\nReply to: ' + from;

		window.location.href = 'mailto:' + to +
			'?subject=' + encodeURIComponent(subject) +
			'&body=' + encodeURIComponent(body);
	});

	if ('IntersectionObserver' in window) {
		var revealNodes = document.querySelectorAll('.reveal');
		var revealObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (entry.isIntersecting && entry.intersectionRatio > 0.16)
					entry.target.classList.add('is-visible');
				else
					entry.target.classList.remove('is-visible');
			});
		}, {
			threshold: [0, 0.16, 0.32, 0.6],
			rootMargin: '-8% 0px -10% 0px'
		});

		revealNodes.forEach(function(node) {
			revealObserver.observe(node);
		});

		var sectionNodes = document.querySelectorAll('main section[id]');
		var navLinks = document.querySelectorAll('#nav a[href^="#"]');
		var navMap = {};

		navLinks.forEach(function(link) {
			var href = link.getAttribute('href');
			if (href)
				navMap[href.slice(1)] = link;
		});

		var sectionObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (!entry.isIntersecting || entry.intersectionRatio < 0.35)
					return;

				navLinks.forEach(function(link) {
					link.classList.remove('active');
				});

				var active = navMap[entry.target.id];
				if (active)
					active.classList.add('active');
			});
		}, {
			threshold: [0.35, 0.6, 0.85],
			rootMargin: '-18% 0px -50% 0px'
		});

		sectionNodes.forEach(function(section) {
			sectionObserver.observe(section);
		});
	} else {
		$('.reveal').addClass('is-visible');
	}

})(jQuery);
