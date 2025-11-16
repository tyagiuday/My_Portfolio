/*
	Miniport by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body'),
		$nav = $('#nav');

	// Breakpoints.
		breakpoints({
			xlarge:  [ '1281px',  '1680px' ],
			large:   [ '981px',   '1280px' ],
			medium:  [ '737px',   '980px'  ],
			small:   [ null,      '736px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Scrolly.
		$('#nav a, .scrolly').scrolly({
			speed: 1000,
			offset: function() { return $nav.height(); }
		});

	// Contact form: open default mail client with form data
		$('article#contact form').on('submit', function(e) {
			e.preventDefault();
			var to = 'udaytyagi2020@gail.com';
			var from = $('#email').val().trim();
			var subject = $('#subject').val().trim() || 'Message from portfolio';
			var message = $('#message').val().trim();

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

			var body = 'From: ' + from + '\n\n' + message;
			var mailto = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

			window.location.href = mailto;
		});

})(jQuery);