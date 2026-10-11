/*
	Uday Veer Singh — portfolio effects.
	Background circuit, hero intro, floating toolkit field, cover packets, tilt and scroll motion.
	Uses GSAP (ScrollTrigger, SplitText, ScrambleText) when it loads; everything else is plain canvas/DOM.
	Every effect stops when the "Animations" switch is off, and the page stays fully usable without this file.
*/
(function() {
	'use strict';

	var root = document.documentElement;
	var gsap = window.gsap;
	var ScrollTrigger = window.ScrollTrigger;
	var SplitText = window.SplitText;
	var ScrambleTextPlugin = window.ScrambleTextPlugin;
	var finePointer = window.matchMedia('(pointer: fine)').matches;

	if (gsap) {
		[ScrollTrigger, SplitText, ScrambleTextPlugin].forEach(function(plugin) {
			if (plugin)
				gsap.registerPlugin(plugin);
		});
	}

	function motionOn() {
		return !root.classList.contains('motion-off');
	}

	function cssVar(name) {
		return getComputedStyle(root).getPropertyValue(name).trim();
	}

	function rand(min, max) {
		return min + Math.random() * (max - min);
	}

	function fontsReady(timeout) {
		var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
		return Promise.race([ready, new Promise(function(resolve) { window.setTimeout(resolve, timeout); })]);
	}

	/* =====================================================
	   Background: a circuit board with travelling packets
	   ===================================================== */

	function createCircuit() {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		if (!ctx)
			return null;

		canvas.className = 'fx-canvas';
		canvas.setAttribute('aria-hidden', 'true');
		document.body.insertBefore(canvas, document.body.firstChild);
		root.classList.add('fx-on');

		var STEP = 44;
		var SPOT = 170;
		var dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 1.5 : 1);
		var W = 0, H = 0;
		var base, bright, spot;
		var traces = [], packets = [], colors = {};
		var pointer = { x: -1e4, y: -1e4, on: false };
		var running = false, raf = 0, last = 0;

		function layer(w, h) {
			var c = document.createElement('canvas');
			c.width = Math.ceil(w * dpr);
			c.height = Math.ceil(h * dpr);
			c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
			return c;
		}

		function readColors() {
			colors = {
				trace: cssVar('--fx-trace'),
				via: cssVar('--fx-via'),
				bright: cssVar('--fx-bright'),
				a: cssVar('--accent'),
				b: cssVar('--accent-2')
			};
		}

		// Random walks on a grid: mostly straight, occasional right-angle turns, no crossings.
		function generate() {
			traces = [];
			var cols = Math.floor(W / STEP) + 1;
			var rows = Math.floor(H / STEP) + 1;
			var offX = (W - (cols - 1) * STEP) / 2;
			var offY = (H - (rows - 1) * STEP) / 2;
			var used = {};
			var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
			var target = Math.round(W * H / 24000);

			for (var attempt = 0; attempt < target * 4 && traces.length < target; attempt++) {
				var cx = Math.floor(Math.random() * cols);
				var cy = Math.floor(Math.random() * rows);
				if (used[cx + ',' + cy])
					continue;

				var d = Math.floor(Math.random() * 4);
				var cells = [[cx, cy]];
				var length = 5 + Math.floor(Math.random() * 16);
				used[cx + ',' + cy] = true;

				for (var k = 0; k < length; k++) {
					if (Math.random() < 0.28)
						d = (d + (Math.random() < 0.5 ? 1 : 3)) % 4;
					var nx = cx + dirs[d][0];
					var ny = cy + dirs[d][1];
					if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || used[nx + ',' + ny])
						break;
					cx = nx;
					cy = ny;
					used[cx + ',' + cy] = true;
					cells.push([cx, cy]);
				}

				if (cells.length < 4)
					continue;

				// Keep only the corners, in pixels.
				var pts = [];
				for (var i = 0; i < cells.length; i++) {
					var prev = cells[i - 1], cur = cells[i], next = cells[i + 1];
					var corner = !prev || !next || (prev[0] - cur[0]) !== (cur[0] - next[0]) || (prev[1] - cur[1]) !== (cur[1] - next[1]);
					if (corner)
						pts.push([offX + cur[0] * STEP, offY + cur[1] * STEP]);
				}

				var segs = [], total = 0;
				for (var s = 1; s < pts.length; s++) {
					var len = Math.abs(pts[s][0] - pts[s - 1][0]) + Math.abs(pts[s][1] - pts[s - 1][1]);
					segs.push(len);
					total += len;
				}
				traces.push({ pts: pts, segs: segs, total: total });
			}
		}

		function paint(target, stroke, width, via) {
			var c = target.getContext('2d');
			c.clearRect(0, 0, W, H);
			c.lineWidth = width;
			c.lineJoin = 'round';
			c.strokeStyle = stroke;
			traces.forEach(function(tr) {
				c.beginPath();
				c.moveTo(tr.pts[0][0], tr.pts[0][1]);
				for (var i = 1; i < tr.pts.length; i++)
					c.lineTo(tr.pts[i][0], tr.pts[i][1]);
				c.stroke();
			});
			c.strokeStyle = via;
			traces.forEach(function(tr) {
				[tr.pts[0], tr.pts[tr.pts.length - 1]].forEach(function(p) {
					c.beginPath();
					c.arc(p[0], p[1], 2.4, 0, Math.PI * 2);
					c.stroke();
				});
			});
		}

		function paintLayers() {
			paint(base, colors.trace, 1, colors.via);
			paint(bright, colors.bright, 1.2, colors.bright);
		}

		function newPacket(anywhere) {
			var tr = traces[Math.floor(Math.random() * traces.length)];
			return {
				tr: tr,
				d: anywhere ? Math.random() * tr.total : 0,
				v: rand(45, 120),
				c: Math.random() < 0.7 ? colors.a : colors.b,
				trail: []
			};
		}

		function pointAt(tr, d) {
			for (var i = 0; i < tr.segs.length; i++) {
				if (d <= tr.segs[i]) {
					var a = tr.pts[i], b = tr.pts[i + 1], t = d / tr.segs[i];
					return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
				}
				d -= tr.segs[i];
			}
			return tr.pts[tr.pts.length - 1];
		}

		function build() {
			W = window.innerWidth;
			H = window.innerHeight;
			canvas.width = Math.ceil(W * dpr);
			canvas.height = Math.ceil(H * dpr);
			canvas.style.width = W + 'px';
			canvas.style.height = H + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			readColors();
			generate();
			base = layer(W, H);
			bright = layer(W, H);
			spot = layer(SPOT * 2, SPOT * 2);
			paintLayers();

			packets = [];
			if (traces.length) {
				var count = Math.min(26, Math.round(traces.length * 0.35));
				for (var i = 0; i < count; i++)
					packets.push(newPacket(true));
			}
			draw(0, motionOn());
		}

		function drawSpotlight() {
			var s = spot.getContext('2d');
			var size = spot.width;
			s.save();
			s.setTransform(1, 0, 0, 1, 0, 0);
			s.globalCompositeOperation = 'source-over';
			s.clearRect(0, 0, size, size);
			s.drawImage(bright, (pointer.x - SPOT) * dpr, (pointer.y - SPOT) * dpr, size, size, 0, 0, size, size);
			s.globalCompositeOperation = 'destination-in';
			var g = s.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
			g.addColorStop(0, 'rgba(0,0,0,1)');
			g.addColorStop(1, 'rgba(0,0,0,0)');
			s.fillStyle = g;
			s.fillRect(0, 0, size, size);
			s.restore();
			ctx.drawImage(spot, pointer.x - SPOT, pointer.y - SPOT, SPOT * 2, SPOT * 2);
		}

		function draw(dt, live) {
			ctx.clearRect(0, 0, W, H);
			ctx.drawImage(base, 0, 0, W, H);
			if (!live)
				return;

			if (pointer.on)
				drawSpotlight();

			ctx.lineWidth = 1.5;
			ctx.lineCap = 'round';
			for (var i = 0; i < packets.length; i++) {
				var p = packets[i];
				p.d += p.v * dt;
				if (p.d >= p.tr.total) {
					packets[i] = newPacket(false);
					continue;
				}
				var pt = pointAt(p.tr, p.d);
				p.trail.push(pt);
				if (p.trail.length > 12)
					p.trail.shift();

				ctx.strokeStyle = p.c;
				ctx.fillStyle = p.c;
				for (var t = 1; t < p.trail.length; t++) {
					ctx.globalAlpha = (t / p.trail.length) * 0.55;
					ctx.beginPath();
					ctx.moveTo(p.trail[t - 1][0], p.trail[t - 1][1]);
					ctx.lineTo(p.trail[t][0], p.trail[t][1]);
					ctx.stroke();
				}
				ctx.globalAlpha = 0.16;
				ctx.beginPath();
				ctx.arc(pt[0], pt[1], 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.beginPath();
				ctx.arc(pt[0], pt[1], 1.8, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		function frame(now) {
			raf = window.requestAnimationFrame(frame);
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			draw(dt, true);
		}

		function start() {
			if (running || !motionOn() || document.hidden)
				return;
			running = true;
			last = performance.now();
			raf = window.requestAnimationFrame(frame);
		}

		function stop() {
			running = false;
			window.cancelAnimationFrame(raf);
			draw(0, false);
		}

		if (finePointer) {
			window.addEventListener('pointermove', function(event) {
				pointer.x = event.clientX;
				pointer.y = event.clientY;
				pointer.on = true;
			}, { passive: true });
			document.addEventListener('pointerleave', function() { pointer.on = false; });
			window.addEventListener('blur', function() { pointer.on = false; });
		}

		document.addEventListener('visibilitychange', function() {
			if (document.hidden) {
				running = false;
				window.cancelAnimationFrame(raf);
			} else {
				start();
			}
		});

		// Rebuild on real resizes only (ignore mobile URL-bar height jitter).
		var resizeTimer = 0;
		window.addEventListener('resize', function() {
			window.clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(function() {
				if (window.innerWidth !== W || Math.abs(window.innerHeight - H) > 120)
					build();
			}, 200);
		});

		build();
		start();

		return {
			start: start,
			stop: stop,
			recolor: function() {
				readColors();
				paintLayers();
				packets.forEach(function(p) { p.c = Math.random() < 0.7 ? colors.a : colors.b; });
				draw(0, running);
			}
		};
	}

	/* =====================================================
	   Toolkit: floating, draggable skill field
	   ===================================================== */

	function createField() {
		var toolkit = document.querySelector('.toolkit');
		if (!toolkit)
			return null;

		var stage = document.createElement('div');
		stage.className = 'tk-stage';
		toolkit.parentNode.insertBefore(stage, toolkit);
		stage.appendChild(toolkit);

		var field = document.createElement('div');
		field.className = 'tk-field';
		field.setAttribute('aria-hidden', 'true');
		var lines = document.createElement('canvas');
		lines.className = 'tk-lines';
		var hint = document.createElement('p');
		hint.className = 'tk-hint';
		hint.textContent = 'drag the chips · pick a group on the left';
		var status = document.createElement('p');
		status.className = 'tk-status';
		field.append(lines, hint, status);
		stage.appendChild(field);

		var lctx = lines.getContext('2d');
		var wide = window.matchMedia('(min-width: 1000px)');
		var groups = [], chips = [], anchors = [];
		var active = null;
		var W = 0, H = 0;
		var running = false, raf = 0, last = 0, inView = false, placed = false;
		var drag = null;
		var pointer = { x: -1e4, y: -1e4 };

		toolkit.querySelectorAll('.tool-group').forEach(function(group, gi) {
			var heading = group.querySelector('h3');
			var name = heading.textContent.trim();
			var items = group.querySelectorAll('.tags li');

			items.forEach(function(li) {
				li.style.setProperty('--d', (-Math.random() * 5).toFixed(2) + 's');
			});

			var button = document.createElement('button');
			button.type = 'button';
			button.className = 'tk-filter';
			button.setAttribute('aria-pressed', 'false');
			var num = document.createElement('span');
			num.className = 'tk-num';
			num.setAttribute('aria-hidden', 'true');
			num.textContent = String(gi + 1).padStart(2, '0');
			var label = document.createElement('span');
			label.textContent = name;
			var count = document.createElement('span');
			count.className = 'tk-count';
			count.textContent = String(items.length);
			var countLabel = document.createElement('span');
			countLabel.className = 'visually-hidden';
			countLabel.textContent = ' tools';
			count.appendChild(countLabel);
			button.append(num, label, count);
			heading.textContent = '';
			heading.appendChild(button);

			groups.push({ el: group, button: button, name: name, color: '' });

			button.addEventListener('click', function() {
				setActive(active === gi ? null : gi);
			});

			items.forEach(function(li, k) {
				var chip = document.createElement('span');
				chip.className = 'tk-chip' + (li.classList.contains('tag-learning') ? ' is-learning' : '');
				chip.textContent = li.textContent;
				chip.style.setProperty('--c', 'var(--g' + (gi + 1) + ')');
				field.appendChild(chip);
				chips.push({ el: chip, g: gi, k: k, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, ph: Math.random() * Math.PI * 2 });
			});
		});

		function readColors() {
			groups.forEach(function(group, i) {
				group.color = cssVar('--g' + (i + 1));
			});
		}

		function updateStatus() {
			status.textContent = '';
			status.append(active === null ? 'showing ' : 'focus: ');
			var b = document.createElement('b');
			b.textContent = active === null ? 'all groups' : groups[active].name.toLowerCase();
			status.appendChild(b);
		}

		function computeAnchors() {
			var cx = W / 2, cy = H / 2, n = groups.length;
			anchors = groups.map(function(group, i) {
				if (active === null) {
					// Three columns by two rows of clusters.
					var col = i % 3, row = Math.floor(i / 3);
					return { x: W * (col * 2 + 1) / 6, y: H * (row === 0 ? 0.3 : 0.72) };
				}
				if (i === active)
					return { x: cx, y: cy };
				var j = i < active ? i : i - 1;
				var b = -Math.PI / 2 + (j + 0.5) * 2 * Math.PI / (n - 1);
				return { x: cx + Math.cos(b) * W * 0.42, y: cy + Math.sin(b) * H * 0.4 };
			});
		}

		function measure() {
			W = field.clientWidth;
			H = field.clientHeight;
			var ratio = Math.min(window.devicePixelRatio || 1, 2);
			lines.width = Math.ceil(W * ratio);
			lines.height = Math.ceil(H * ratio);
			lctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			chips.forEach(function(c) {
				c.w = c.el.offsetWidth;
				c.h = c.el.offsetHeight;
			});
			computeAnchors();
		}

		// Each chip's home: a slot on a golden-angle spiral around its group's anchor,
		// stretched horizontally because chips are wide.
		function home(c) {
			var a = anchors[c.g];
			var spacing = active === null ? 22 : (c.g === active ? 30 : 14);
			var angle = c.k * 2.39996 + c.g;
			var r = spacing * Math.sqrt(c.k + 0.5);
			return { x: a.x + Math.cos(angle) * r * 1.8, y: a.y + Math.sin(angle) * r };
		}

		function scatter(fromCenter) {
			chips.forEach(function(c) {
				var a = home(c);
				var bx = fromCenter ? W / 2 : a.x;
				var by = fromCenter ? H / 2 : a.y;
				c.x = bx + rand(-1, 1) * (fromCenter ? 20 : 90) - c.w / 2;
				c.y = by + rand(-1, 1) * (fromCenter ? 20 : 60) - c.h / 2;
				c.vx = fromCenter ? rand(-4, 4) : 0;
				c.vy = fromCenter ? rand(-4, 4) : 0;
			});
		}

		function collide(a, b) {
			var dx = (b.x + b.w / 2) - (a.x + a.w / 2);
			var dy = (b.y + b.h / 2) - (a.y + a.h / 2);
			var ox = (a.w + b.w) / 2 + 8 - Math.abs(dx);
			var oy = (a.h + b.h) / 2 + 6 - Math.abs(dy);
			if (ox <= 0 || oy <= 0)
				return;

			var aFixed = drag && drag.c === a;
			var bFixed = drag && drag.c === b;
			var ra = aFixed ? 0 : (bFixed ? 1 : 0.5);
			var rb = bFixed ? 0 : (aFixed ? 1 : 0.5);

			if (ox < oy) {
				var sx = dx < 0 ? -1 : 1;
				a.x -= sx * ox * ra;
				b.x += sx * ox * rb;
				a.vx -= sx * 0.4 * ra;
				b.vx += sx * 0.4 * rb;
			} else {
				var sy = dy < 0 ? -1 : 1;
				a.y -= sy * oy * ra;
				b.y += sy * oy * rb;
				a.vy -= sy * 0.4 * ra;
				b.vy += sy * 0.4 * rb;
			}
		}

		function step(k, wander) {
			var n = chips.length, i, c;
			for (i = 0; i < n; i++) {
				c = chips[i];
				if (drag && drag.c === c)
					continue;
				var a = home(c);
				var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
				var pull = active === null || c.g === active ? 0.0022 : 0.0016;
				c.vx += (a.x - cx) * pull * k;
				c.vy += (a.y - cy) * pull * k;
				if (wander) {
					c.ph += 0.012 * k;
					c.vx += Math.cos(c.ph * 1.3) * 0.03 * k;
					c.vy += Math.sin(c.ph) * 0.03 * k;
				}
				var dx = cx - pointer.x, dy = cy - pointer.y;
				var d = Math.sqrt(dx * dx + dy * dy);
				if (d < 120 && d > 0.1) {
					var f = (120 - d) / 120 * 0.8 * k;
					c.vx += dx / d * f;
					c.vy += dy / d * f;
				}
			}

			// Several passes keep dense clusters from overlapping.
			for (var pass = 0; pass < 3; pass++)
				for (i = 0; i < n; i++)
					for (var j = i + 1; j < n; j++)
						collide(chips[i], chips[j]);

			var damp = Math.pow(0.88, k);
			for (i = 0; i < n; i++) {
				c = chips[i];
				if (drag && drag.c === c)
					continue;
				c.vx *= damp;
				c.vy *= damp;
				c.x += c.vx * k;
				c.y += c.vy * k;
				if (c.x < 10) { c.x = 10; c.vx = Math.abs(c.vx) * 0.5; }
				if (c.x + c.w > W - 10) { c.x = W - 10 - c.w; c.vx = -Math.abs(c.vx) * 0.5; }
				if (c.y < 36) { c.y = 36; c.vy = Math.abs(c.vy) * 0.5; }
				if (c.y + c.h > H - 36) { c.y = H - 36 - c.h; c.vy = -Math.abs(c.vy) * 0.5; }
			}
		}

		function render() {
			var n = chips.length;
			for (var i = 0; i < n; i++)
				chips[i].el.style.transform = 'translate3d(' + chips[i].x.toFixed(1) + 'px,' + chips[i].y.toFixed(1) + 'px,0)';

			lctx.clearRect(0, 0, W, H);
			var maxD = 170;
			lctx.lineWidth = 1;
			for (var a = 0; a < n; a++) {
				var ca = chips[a];
				if (active !== null && ca.g !== active)
					continue;
				for (var b = a + 1; b < n; b++) {
					var cb = chips[b];
					if (cb.g !== ca.g)
						continue;
					var x1 = ca.x + ca.w / 2, y1 = ca.y + ca.h / 2;
					var x2 = cb.x + cb.w / 2, y2 = cb.y + cb.h / 2;
					var d = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
					if (d > maxD)
						continue;
					lctx.strokeStyle = groups[ca.g].color;
					lctx.globalAlpha = (1 - d / maxD) * (active === null ? 0.3 : 0.75);
					lctx.beginPath();
					lctx.moveTo(x1, y1);
					lctx.lineTo(x2, y2);
					lctx.stroke();
				}
			}
			lctx.globalAlpha = 1;
		}

		function settle() {
			for (var i = 0; i < 260; i++)
				step(1, false);
			render();
		}

		function frame(now) {
			raf = window.requestAnimationFrame(frame);
			var k = Math.min((now - last) / 16.67, 3);
			last = now;
			step(k, true);
			render();
		}

		function enabled() {
			return stage.classList.contains('tk-on') && motionOn();
		}

		function start() {
			if (running || !enabled() || !inView || document.hidden)
				return;
			running = true;
			last = performance.now();
			raf = window.requestAnimationFrame(frame);
		}

		function stop() {
			running = false;
			window.cancelAnimationFrame(raf);
		}

		function setActive(index) {
			active = index;
			groups.forEach(function(group, i) {
				group.button.setAttribute('aria-pressed', String(i === index));
				group.el.classList.toggle('is-active', i === index);
			});
			toolkit.classList.toggle('has-focus', index !== null);
			field.classList.toggle('has-focus', index !== null);
			chips.forEach(function(c) {
				c.el.classList.toggle('is-on', c.g === index);
			});
			updateStatus();
			if (stage.classList.contains('tk-on')) {
				computeAnchors();
				if (!running)
					settle();
			}
		}

		function applyMode() {
			var on = wide.matches;
			stage.classList.toggle('tk-on', on);
			if (!on) {
				stop();
				return;
			}
			readColors();
			measure();
			if (!placed) {
				scatter(motionOn());
				placed = true;
			}
			if (motionOn())
				render();
			else
				settle();
			start();
		}

		// Dragging
		field.addEventListener('pointerdown', function(event) {
			var el = event.target.closest('.tk-chip');
			if (!el)
				return;
			var chip = chips.find(function(c) { return c.el === el; });
			var rect = field.getBoundingClientRect();
			drag = {
				c: chip,
				ox: event.clientX - rect.left - chip.x,
				oy: event.clientY - rect.top - chip.y,
				lx: event.clientX,
				ly: event.clientY,
				vx: 0,
				vy: 0
			};
			el.classList.add('is-dragging');
			el.setPointerCapture(event.pointerId);
			event.preventDefault();
		});

		field.addEventListener('pointermove', function(event) {
			var rect = field.getBoundingClientRect();
			pointer.x = event.clientX - rect.left;
			pointer.y = event.clientY - rect.top;
			if (!drag)
				return;
			var c = drag.c;
			c.x = Math.max(0, Math.min(W - c.w, pointer.x - drag.ox));
			c.y = Math.max(0, Math.min(H - c.h, pointer.y - drag.oy));
			drag.vx = event.clientX - drag.lx;
			drag.vy = event.clientY - drag.ly;
			drag.lx = event.clientX;
			drag.ly = event.clientY;
			if (!running)
				render();
		});

		function endDrag() {
			if (!drag)
				return;
			drag.c.vx = drag.vx * 0.5;
			drag.c.vy = drag.vy * 0.5;
			drag.c.el.classList.remove('is-dragging');
			drag = null;
			if (!running)
				settle();
		}

		field.addEventListener('pointerup', endDrag);
		field.addEventListener('pointercancel', endDrag);
		field.addEventListener('pointerleave', function() {
			pointer.x = -1e4;
			pointer.y = -1e4;
		});

		new IntersectionObserver(function(entries) {
			inView = entries[0].isIntersecting;
			if (inView)
				start();
			else
				stop();
		}, { rootMargin: '80px' }).observe(field);

		if ('ResizeObserver' in window) {
			new ResizeObserver(function() {
				if (!stage.classList.contains('tk-on'))
					return;
				measure();
				if (!running)
					settle();
			}).observe(field);
		}

		wide.addEventListener('change', applyMode);
		updateStatus();
		applyMode();

		return {
			start: start,
			stop: function() {
				stop();
				if (stage.classList.contains('tk-on'))
					settle();
			},
			recolor: function() {
				readColors();
				render();
			}
		};
	}

	/* =====================================================
	   Case-study covers: packets moving along the drawn paths
	   ===================================================== */

	function createPackets() {
		var NS = 'http://www.w3.org/2000/svg';
		var items = [];

		document.querySelectorAll('.cover-art').forEach(function(svg) {
			var paths = svg.querySelectorAll('.track');
			if (!paths.length)
				return;
			var item = { packets: [], visible: false };
			paths.forEach(function(path) {
				var len = path.getTotalLength();
				for (var k = 0; k < 2; k++) {
					var halo = document.createElementNS(NS, 'circle');
					halo.setAttribute('r', '7');
					halo.setAttribute('class', 'packet-halo');
					var dot = document.createElementNS(NS, 'circle');
					dot.setAttribute('r', '3');
					dot.setAttribute('class', 'packet');
					svg.append(halo, dot);
					item.packets.push({ path: path, len: len, d: Math.random() * len, v: rand(40, 75), dot: dot, halo: halo });
				}
			});
			new IntersectionObserver(function(entries) {
				item.visible = entries[0].isIntersecting;
			}).observe(svg);
			items.push(item);
		});

		if (!items.length)
			return null;

		var running = false, raf = 0, last = 0;

		function place(p) {
			var pt = p.path.getPointAtLength(p.d);
			p.dot.setAttribute('cx', pt.x.toFixed(1));
			p.dot.setAttribute('cy', pt.y.toFixed(1));
			p.halo.setAttribute('cx', pt.x.toFixed(1));
			p.halo.setAttribute('cy', pt.y.toFixed(1));
		}

		function frame(now) {
			raf = window.requestAnimationFrame(frame);
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			items.forEach(function(item) {
				if (!item.visible)
					return;
				item.packets.forEach(function(p) {
					p.d = (p.d + p.v * dt) % p.len;
					place(p);
				});
			});
		}

		items.forEach(function(item) { item.packets.forEach(place); });

		return {
			start: function() {
				if (running || !motionOn())
					return;
				running = true;
				last = performance.now();
				raf = window.requestAnimationFrame(frame);
			},
			stop: function() {
				running = false;
				window.cancelAnimationFrame(raf);
			}
		};
	}

	/* =====================================================
	   Pointer details: tilt with glare, magnetic buttons
	   ===================================================== */

	function setupPointerFx() {
		if (!finePointer)
			return;

		document.querySelectorAll('[data-tilt]').forEach(function(el) {
			el.addEventListener('pointermove', function(event) {
				if (!motionOn())
					return;
				var r = el.getBoundingClientRect();
				var px = (event.clientX - r.left) / r.width;
				var py = (event.clientY - r.top) / r.height;
				var max = r.height > 520 ? 2 : 5;
				el.style.setProperty('--rx', ((0.5 - py) * max).toFixed(2) + 'deg');
				el.style.setProperty('--ry', ((px - 0.5) * max * 1.3).toFixed(2) + 'deg');
				el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
				el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
				el.classList.add('is-tilting');
			});
			el.addEventListener('pointerleave', function() {
				el.classList.remove('is-tilting');
				el.style.setProperty('--rx', '0deg');
				el.style.setProperty('--ry', '0deg');
			});
		});

		document.querySelectorAll('.button, .icon-button').forEach(function(el) {
			el.classList.add('magnetic');
			el.addEventListener('pointermove', function(event) {
				if (!motionOn())
					return;
				var r = el.getBoundingClientRect();
				var dx = (event.clientX - (r.left + r.width / 2)) / r.width;
				var dy = (event.clientY - (r.top + r.height / 2)) / r.height;
				el.style.translate = (dx * 10).toFixed(1) + 'px ' + (dy * 8).toFixed(1) + 'px';
			});
			el.addEventListener('pointerleave', function() {
				el.style.translate = '';
			});
		});
	}

	/* =====================================================
	   Approach track: the train follows your scroll
	   ===================================================== */

	function setupTrack() {
		var wrap = document.querySelector('.track-wrap');
		if (!wrap)
			return null;

		var rail = wrap.querySelector('.track-rail');
		var stations = Array.prototype.slice.call(wrap.querySelectorAll('.station'));
		var thresholds = [];
		var trigger = null;
		var state = { p: 1 };

		function measure() {
			var style = getComputedStyle(rail);
			var mode = style.display === 'none' ? 'grid' : (rail.offsetHeight > rail.offsetWidth ? 'vertical' : 'horizontal');
			thresholds = stations.map(function(station, i) {
				if (mode === 'grid')
					return (i + 0.5) / stations.length * 0.92;
				if (mode === 'horizontal')
					return (station.offsetLeft + 10) / wrap.offsetWidth;
				return station.offsetTop / rail.offsetHeight;
			});
		}

		function setP(p) {
			state.p = p;
			wrap.style.setProperty('--p', p.toFixed(4));
			stations.forEach(function(station, i) {
				station.classList.toggle('is-passed', p >= thresholds[i] - 0.001);
			});
		}

		measure();
		window.addEventListener('resize', function() {
			measure();
			setP(state.p);
		});

		if (motionOn() && gsap && ScrollTrigger) {
			setP(0);
			var follow = gsap.quickTo(state, 'p', {
				duration: 0.6,
				ease: 'power3.out',
				onUpdate: function() { setP(state.p); }
			});
			trigger = ScrollTrigger.create({
				trigger: wrap,
				start: 'top 88%',
				end: 'bottom 62%',
				onUpdate: function(self) { follow(self.progress); },
				onRefresh: measure
			});
		} else {
			setP(1);
		}

		return {
			complete: function() {
				if (trigger)
					trigger.kill();
				gsap && gsap.killTweensOf(state);
				setP(1);
			}
		};
	}

	/* =====================================================
	   Hero: a draggable 3D globe of the tech stack
	   ===================================================== */

	function createOrb() {
		var wrap = document.querySelector('.hero-orb');
		if (!wrap)
			return null;
		var canvas = wrap.querySelector('.orb-canvas');
		var ctx = canvas.getContext('2d');
		if (!ctx)
			return null;

		var LABELS = ['Angular', 'TypeScript', 'RxJS', 'NestJS', 'Node.js', 'REST APIs', 'PostgreSQL', 'Prisma', 'Tailwind', 'Figma', 'Zoho', 'Webflow', 'Git'];
		var small = window.matchMedia('(max-width: 520px)').matches;
		var N = small ? 110 : 170;
		var LINK = small ? 0.36 : 0.3;
		var pts = [], edges = [], labels = [], proj = new Array(N);
		var i, j;

		// Points evenly spread on a sphere (Fibonacci lattice)
		for (i = 0; i < N; i++) {
			var y = 1 - (i / (N - 1)) * 2;
			var r = Math.sqrt(1 - y * y);
			var t = i * 2.399963;
			pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
		}
		for (i = 0; i < N; i++) {
			for (j = i + 1; j < N; j++) {
				var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
				if (dx * dx + dy * dy + dz * dz < LINK * LINK)
					edges.push([i, j]);
			}
		}
		// Spread labels with their own Fibonacci lattice, then snap each to the nearest node.
		LABELS.forEach(function(text, k) {
			var ly = 1 - ((k + 0.5) / LABELS.length) * 2;
			var lr = Math.sqrt(1 - ly * ly);
			var lt = k * 2.399963;
			var target = [Math.cos(lt) * lr, ly, Math.sin(lt) * lr];
			var best = 0, bestD = Infinity;
			pts.forEach(function(pt, n) {
				var d = (pt[0] - target[0]) * (pt[0] - target[0]) + (pt[1] - target[1]) * (pt[1] - target[1]) + (pt[2] - target[2]) * (pt[2] - target[2]);
				if (d < bestD) {
					bestD = d;
					best = n;
				}
			});
			labels.push({ text: text, i: best });
		});

		var W = 0, H = 0;
		var ax = -0.35, ay = 0, vx = 0, vy = 0.004;
		var tiltX = 0, tiltY = 0, targetTX = 0, targetTY = 0;
		var dragging = false, lastX = 0, lastY = 0;
		var running = false, raf = 0, inView = true, colors = {};

		function readColors() {
			colors = { a: cssVar('--accent'), b: cssVar('--accent-2'), ink: cssVar('--ink'), paper: cssVar('--paper') };
		}

		function resize() {
			var rect = wrap.getBoundingClientRect();
			W = rect.width;
			H = rect.height;
			var ratio = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.ceil(W * ratio);
			canvas.height = Math.ceil(H * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			draw();
		}

		function pill(x, y, w, h) {
			ctx.beginPath();
			if (ctx.roundRect)
				ctx.roundRect(x, y, w, h, h / 2);
			else
				ctx.rect(x, y, w, h);
		}

		function draw() {
			if (!W)
				return;
			ctx.clearRect(0, 0, W, H);
			var R = Math.min(W, H) * 0.34, cx = W / 2, cy = H / 2;
			var cay = Math.cos(ay + tiltY), say = Math.sin(ay + tiltY);
			var cax = Math.cos(ax + tiltX), sax = Math.sin(ax + tiltX);

			for (var n = 0; n < N; n++) {
				var p = pts[n];
				var x1 = p[0] * cay + p[2] * say;
				var z1 = -p[0] * say + p[2] * cay;
				var y1 = p[1] * cax - z1 * sax;
				var z2 = p[1] * sax + z1 * cax;
				var f = 3 / (3 - z2);
				proj[n] = [cx + x1 * R * f, cy + y1 * R * f, z2, f];
			}

			// Orbit ring with a satellite
			var ringR = R * 1.42;
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(-0.38);
			ctx.scale(1, 0.26);
			ctx.beginPath();
			ctx.arc(0, 0, ringR, 0, Math.PI * 2);
			ctx.restore();
			ctx.globalAlpha = 0.3;
			ctx.strokeStyle = colors.a;
			ctx.lineWidth = 1;
			ctx.stroke();

			var sa = ay * 2.4;
			var sx = Math.cos(sa) * ringR, sy = Math.sin(sa) * ringR * 0.26;
			var rot = -0.38;
			var satX = cx + sx * Math.cos(rot) - sy * Math.sin(rot);
			var satY = cy + sx * Math.sin(rot) + sy * Math.cos(rot);
			ctx.globalAlpha = 0.25;
			ctx.fillStyle = colors.b;
			ctx.beginPath();
			ctx.arc(satX, satY, 9, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.beginPath();
			ctx.arc(satX, satY, 3.2, 0, Math.PI * 2);
			ctx.fill();

			// Wireframe
			ctx.lineWidth = 0.8;
			for (var e = 0; e < edges.length; e++) {
				var a = proj[edges[e][0]], b = proj[edges[e][1]];
				var depth = (a[2] + b[2]) / 2;
				ctx.globalAlpha = 0.05 + (depth + 1) / 2 * 0.4;
				ctx.strokeStyle = depth > 0 ? colors.b : colors.a;
				ctx.beginPath();
				ctx.moveTo(a[0], a[1]);
				ctx.lineTo(b[0], b[1]);
				ctx.stroke();
			}

			// Nodes
			for (n = 0; n < N; n++) {
				var q = proj[n];
				ctx.globalAlpha = 0.2 + (q[2] + 1) / 2 * 0.8;
				ctx.fillStyle = q[2] > 0 ? colors.b : colors.a;
				ctx.beginPath();
				ctx.arc(q[0], q[1], 1.3 * q[3], 0, Math.PI * 2);
				ctx.fill();
			}

			// Labels on the front half, nearest drawn last
			ctx.font = '600 12px Inter, system-ui, sans-serif';
			ctx.textBaseline = 'middle';
			var visible = labels.map(function(l) { return { l: l, p: proj[l.i] }; })
				.filter(function(v) { return v.p[2] > -0.1; })
				.sort(function(m, k) { return m.p[2] - k.p[2]; });
			visible.forEach(function(v) {
				var alpha = Math.min(1, (v.p[2] + 0.1) / 0.7);
				var tw = ctx.measureText(v.l.text).width;
				// Flip the label to the left of its node near the right edge.
				var px = v.p[0] + tw + 30 > W ? v.p[0] - tw - 26 : v.p[0] + 8;
				var py = v.p[1] - 11;
				ctx.globalAlpha = alpha * 0.85;
				ctx.fillStyle = colors.paper;
				pill(px, py, tw + 18, 22);
				ctx.fill();
				ctx.globalAlpha = alpha * 0.7;
				ctx.strokeStyle = colors.a;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.globalAlpha = alpha;
				ctx.fillStyle = colors.ink;
				ctx.fillText(v.l.text, px + 9, py + 11.5);
				ctx.fillStyle = colors.b;
				ctx.beginPath();
				ctx.arc(v.p[0], v.p[1], 2.6, 0, Math.PI * 2);
				ctx.fill();
			});
			ctx.globalAlpha = 1;
		}

		function frame() {
			raf = window.requestAnimationFrame(frame);
			if (!dragging) {
				ay += vy;
				ax += vx;
				vy += (0.004 - vy) * 0.02;
				vx *= 0.94;
				ax += (-0.35 - ax) * 0.01;
			}
			tiltX += (targetTX - tiltX) * 0.05;
			tiltY += (targetTY - tiltY) * 0.05;
			draw();
		}

		function start() {
			if (running || !motionOn() || !inView || document.hidden)
				return;
			running = true;
			raf = window.requestAnimationFrame(frame);
		}

		function stop() {
			running = false;
			window.cancelAnimationFrame(raf);
			draw();
		}

		wrap.addEventListener('pointerdown', function(event) {
			dragging = true;
			lastX = event.clientX;
			lastY = event.clientY;
			wrap.setPointerCapture(event.pointerId);
		});
		wrap.addEventListener('pointermove', function(event) {
			if (!dragging)
				return;
			var dx = event.clientX - lastX, dy = event.clientY - lastY;
			lastX = event.clientX;
			lastY = event.clientY;
			ay += dx * 0.006;
			ax = Math.max(-1.2, Math.min(1.2, ax + dy * 0.006));
			vy = dx * 0.006;
			vx = dy * 0.003;
			if (!running)
				draw();
		});
		function release() {
			dragging = false;
		}
		wrap.addEventListener('pointerup', release);
		wrap.addEventListener('pointercancel', release);

		if (finePointer) {
			window.addEventListener('pointermove', function(event) {
				targetTY = (event.clientX / window.innerWidth - 0.5) * 0.5;
				targetTX = (event.clientY / window.innerHeight - 0.5) * 0.3;
			}, { passive: true });
		}

		new IntersectionObserver(function(entries) {
			inView = entries[0].isIntersecting;
			if (inView)
				start();
			else if (running) {
				running = false;
				window.cancelAnimationFrame(raf);
			}
		}).observe(wrap);

		if ('ResizeObserver' in window)
			new ResizeObserver(resize).observe(wrap);

		readColors();
		resize();
		start();

		return {
			start: start,
			stop: stop,
			recolor: function() {
				readColors();
				draw();
			}
		};
	}

	/* Card borders light up around the cursor */
	function setupGlow() {
		if (!finePointer)
			return;
		var cards = Array.prototype.slice.call(document.querySelectorAll('.glow'));
		var x = 0, y = 0, queued = false;
		window.addEventListener('pointermove', function(event) {
			x = event.clientX;
			y = event.clientY;
			if (queued)
				return;
			queued = true;
			window.requestAnimationFrame(function() {
				queued = false;
				cards.forEach(function(card) {
					var r = card.getBoundingClientRect();
					if (r.bottom < -300 || r.top > window.innerHeight + 300)
						return;
					card.style.setProperty('--mx', (x - r.left).toFixed(0) + 'px');
					card.style.setProperty('--my', (y - r.top).toFixed(0) + 'px');
				});
			});
		}, { passive: true });
	}

	/* =====================================================
	   GSAP: hero intro, headings, labels, parallax
	   ===================================================== */

	var heroTimeline = null;

	function heroIntro() {
		var cmd = document.querySelector('.term-cmd');
		var out = document.querySelector('.term-out');
		var title = document.querySelector('.hero-title');
		var command = cmd ? cmd.textContent : '';
		var split = SplitText ? SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'hero-line' }) : null;
		var mark = title.querySelector('.hero-mark');

		if (cmd)
			cmd.textContent = '';
		gsap.set(out, { opacity: 0, y: 6 });
		gsap.set(split ? split.lines : title, split ? { yPercent: 110 } : { opacity: 0, y: 30 });
		gsap.set(['.hero-lede', '.hero-actions'], { opacity: 0, y: 18 });
		gsap.set('.hero-orb', { opacity: 0, scale: 0.8, rotate: -12 });
		gsap.set('.facts > div', { opacity: 0, y: 14 });
		gsap.set('.tape', { opacity: 0 });
		root.classList.remove('fx-pending');

		var typed = { n: 0 };
		var tl = gsap.timeline({
			defaults: { ease: 'expo.out' },
			onComplete: function() {
				// Restore the plain heading; the settled class stops the underline from replaying.
				title.classList.add('is-settled');
				if (split)
					split.revert();
			}
		});

		tl.to('.hero-orb', { opacity: 1, scale: 1, rotate: 0, duration: 2, clearProps: 'transform' }, 0.1)
			.to(typed, {
				n: command.length,
				duration: 0.45,
				ease: 'none',
				onUpdate: function() {
					if (cmd)
						cmd.textContent = command.slice(0, Math.round(typed.n));
				}
			}, 0.15)
			.to(out, { opacity: 1, y: 0, duration: 0.6 }, '>0.05')
			.to(split ? split.lines : title, split ? { yPercent: 0, duration: 1.1, stagger: 0.09 } : { opacity: 1, y: 0, duration: 1 }, '<0.05');

		if (mark && ScrambleTextPlugin) {
			tl.to(mark, {
				duration: 1.2,
				ease: 'none',
				scrambleText: { text: mark.textContent, chars: '01{}<>/=;_', speed: 0.6, revealDelay: 0.2 }
			}, '<0.2');
		}

		tl.to(['.hero-lede', '.hero-actions'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '<0.2')
			.to('.facts > div', { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 1.1)
			.to('.tape', { opacity: 1, duration: 1, stagger: 0.15 }, 1.3);

		heroTimeline = tl;
	}

	// The requirement → code card plays its sequence when it scrolls into view.
	function specCardIntro() {
		var card = document.querySelector('.spec-card');
		if (!card || !ScrollTrigger)
			return;
		var codeLines = card.querySelectorAll('.code-line');
		var signals = card.querySelectorAll('.spec-signal');

		gsap.set([card.querySelector('.spec-quote'), card.querySelector('.spec-review'), card.querySelector('.spec-caption')], { opacity: 0 });
		gsap.set(codeLines, { opacity: 0, x: -8 });
		gsap.set(signals, { top: 0, opacity: 0 });

		gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 75%', once: true }, defaults: { ease: 'power2.out' } })
			.to(card.querySelector('.spec-quote'), { opacity: 1, duration: 0.6 }, 0.3)
			.fromTo(signals[0], { top: 0, opacity: 0 }, { top: 'calc(100% - 8px)', opacity: 1, duration: 0.8, ease: 'power2.inOut' })
			.to(codeLines, { opacity: 1, x: 0, duration: 0.35, stagger: 0.11 }, '>-0.1')
			.fromTo(signals[1], { top: 0, opacity: 0 }, { top: 'calc(100% - 8px)', opacity: 1, duration: 0.8, ease: 'power2.inOut' }, '>')
			.to([card.querySelector('.spec-review'), card.querySelector('.spec-caption')], { opacity: 1, duration: 0.6, stagger: 0.12 }, '>-0.1');
	}

	function headingReveals() {
		if (!SplitText || !ScrollTrigger)
			return;
		document.querySelectorAll('.section-head h2').forEach(function(heading) {
			SplitText.create(heading, {
				type: 'lines',
				mask: 'lines',
				autoSplit: true,
				onSplit: function(self) {
					return gsap.from(self.lines, {
						yPercent: 105,
						duration: 1.1,
						stagger: 0.08,
						ease: 'expo.out',
						scrollTrigger: { trigger: heading, start: 'top 88%', once: true }
					});
				}
			});
		});
	}

	function labelScrambles() {
		if (!ScrambleTextPlugin || !ScrollTrigger)
			return;
		document.querySelectorAll('.si-label').forEach(function(label) {
			gsap.to(label, {
				duration: 1.1,
				ease: 'none',
				scrambleText: { text: label.textContent, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_<>', speed: 0.5, revealDelay: 0.25 },
				scrollTrigger: { trigger: label, start: 'top 92%', once: true }
			});
		});
	}

	function coverParallax() {
		if (!ScrollTrigger)
			return;
		document.querySelectorAll('.case-cover .cover-art').forEach(function(svg) {
			gsap.fromTo(svg, { yPercent: -5 }, {
				yPercent: 5,
				ease: 'none',
				scrollTrigger: { trigger: svg.closest('.case'), start: 'top bottom', end: 'bottom top', scrub: true }
			});
		});
	}

	/* =====================================================
	   Boot
	   ===================================================== */

	var circuit = createCircuit();
	var orb = createOrb();
	setupGlow();
	var field = createField();
	var packets = createPackets();
	setupPointerFx();
	var track = setupTrack();
	if (packets)
		packets.start();

	if (gsap && motionOn()) {
		fontsReady(1500).then(function() {
			try {
				heroIntro();
			} catch (e) {
				root.classList.remove('fx-pending');
			}
			specCardIntro();
			headingReveals();
			labelScrambles();
			coverParallax();
		});
	} else {
		root.classList.remove('fx-pending');
	}

	document.addEventListener('motionchange', function(event) {
		if (event.detail.on) {
			circuit && circuit.start();
			orb && orb.start();
			field && field.start();
			packets && packets.start();
			return;
		}
		if (heroTimeline)
			heroTimeline.progress(1);
		if (ScrollTrigger) {
			ScrollTrigger.getAll().forEach(function(st) {
				if (st.animation)
					st.animation.progress(1);
			});
		}
		track && track.complete();
		circuit && circuit.stop();
		orb && orb.stop();
		field && field.stop();
		packets && packets.stop();
		document.querySelectorAll('[data-tilt]').forEach(function(el) {
			el.classList.remove('is-tilting');
			el.style.setProperty('--rx', '0deg');
			el.style.setProperty('--ry', '0deg');
		});
	});

	document.addEventListener('themechange', function() {
		circuit && circuit.recolor();
		orb && orb.recolor();
		field && field.recolor();
	});
})();
