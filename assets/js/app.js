/* =========================================================
   Mariette Mandjan - Prototype : interactions
   Aucune dépendance. Les contenus proviennent de content.js.
   ========================================================= */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* Nom de l'accueil : une lettre par span pour l'animation (avant tout le reste, même sans contenus) */
  (function splitHeroName() {
    var h1 = document.getElementById("hero-name");
    if (!h1) return;
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim()); // lu en entier par les lecteurs d'écran
    Array.prototype.forEach.call(h1.querySelectorAll(".h-in"), function (word, line) {
      var text = word.textContent;
      word.textContent = "";
      word.setAttribute("aria-hidden", "true");
      text.split("").forEach(function (ch, i) {
        var s = document.createElement("span");
        s.className = "char";
        s.textContent = ch;
        s.style.setProperty("--i", i);
        s.style.setProperty("--l", line);
        word.appendChild(s);
      });
    });

    // Effet machine à écrire : les lettres apparaissent une à une derrière un curseur
    var chars = h1.querySelectorAll(".char");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Array.prototype.forEach.call(chars, function (c) { c.classList.add("is-typed"); });
      return;
    }
    h1.classList.add("is-typing");
    var caret = document.createElement("span");
    caret.className = "hero-caret";
    caret.setAttribute("aria-hidden", "true");
    var k = 0;
    function type() {
      var c = chars[k];
      c.classList.add("is-typed");
      c.parentNode.insertBefore(caret, c.nextSibling); // le curseur suit la dernière lettre
      k++;
      if (k >= chars.length) { // fin : le curseur clignote encore puis s'efface
        setTimeout(function () { caret.classList.add("is-done"); h1.classList.remove("is-typing"); }, 2400);
        return;
      }
      var newLine = chars[k].parentNode !== c.parentNode;
      setTimeout(type, newLine ? 450 : 85 + Math.random() * 90); // rythme de frappe légèrement irrégulier
    }
    function start() {
      chars[0].parentNode.insertBefore(caret, chars[0]);
      setTimeout(type, 500);
    }
    // On écrit une fois l'écran de chargement disparu
    var root = document.documentElement;
    if (!root.classList.contains("is-loading")) start();
    else new MutationObserver(function (m, obs) {
      if (!root.classList.contains("is-loading")) { obs.disconnect(); start(); }
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  })();

  var C = window.CONTENT;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* C4 - Contenus absents ou invalides : erreur explicite + présentation de secours */
  if (!C || typeof C !== "object" || !C.fr || typeof C.fr !== "object") {
    console.error("[Mariette preview] window.CONTENT est absent ou invalide : vérifier le chargement de assets/js/content.js (avant app.js).");
    document.documentElement.classList.remove("js"); // aucun élément ne reste masqué par les animations
    var mainEl = document.getElementById("main");
    if (mainEl) {
      var note = document.createElement("p");
      note.setAttribute("role", "alert");
      note.className = "mono small";
      note.style.cssText = "padding:calc(var(--header, 72px) + 24px) var(--pad, 24px) 24px;margin:0";
      note.textContent = "Contenu momentanément indisponible / Content temporarily unavailable.";
      mainEl.insertBefore(note, mainEl.firstChild);
    }
    return;
  }
  if (!C.en) C.en = C.fr;

  /* ---------- Données de structure (contenus = clés i18n) ---------- */
  var EXPERTISE = [1, 2, 3, 4, 5];
  var PROJECTS = [
    { id: "mypikine", n: 1, img: "assets/img/logo-mypikine.png", logo: true, // img : photo authentique (sinon emplacement « à fournir »)
      docs: [ // docs : rubrique « Photos & documents » du panneau
        { src: "assets/img/mypikine-seance.jpg", key: "proj.1.doc1" },
        { src: "assets/img/mypikine.jpg", key: "proj.1.doc2" }
      ] },
    { id: "guides-du-benin", n: 2, img: "assets/img/logo-guides-benin.jpg", logo: true, // logo : affiché en entier, sans recadrage
      docs: [
        { src: "assets/img/guides-unite-aimey.jpg", key: "proj.2.doc2" },
        { src: "assets/img/guides-seance.jpg", key: "proj.2.doc3" },
        { src: "assets/img/guides-bibliotheque.jpg", key: "proj.2.doc4" },
        { src: "assets/img/guides-echange.jpg", key: "proj.2.doc5" },
        { src: "assets/img/guides-releve.jpg", key: "proj.2.doc1" }
      ] },
    { id: "tepp", n: 3, img: "assets/img/tepp.jpg",
      docs: [ // photos déjà utilisées ailleurs : même fichier et mêmes textes
        { src: "assets/img/tepp-wtd-groupe.jpg", key: "proj.3.doc1" },
        { src: "assets/img/tepp-wtd-selfie1.jpg", key: "proj.3.doc2" },
        { src: "assets/img/tepp-wtd-selfie2.jpg", key: "proj.3.doc3" },
        { src: "assets/img/tepp-groupe-aimey.jpg", key: "proj.3.doc4" },
        { src: "assets/img/guides-unite-aimey.jpg", key: "proj.2.doc2" },
        { src: "assets/img/guides-seance.jpg", key: "proj.2.doc3" },
        { src: "assets/img/guides-echange.jpg", key: "proj.2.doc5" },
        { src: "assets/img/mypikine-seance.jpg", key: "proj.1.doc1" },
        { src: "assets/img/guides-releve.jpg", key: "proj.2.doc1" }
      ] },
    // extras : rubriques supplémentaires du panneau, lues dans proj.N.<nom>.h / .p / .list / .note
    { id: "intrusion-saline", n: 4, extras: ["research", "field", "partner", "join"] }
  ];
  /* C3 - Seuls les identifiants de projets réellement déclarés sont acceptés depuis l'URL */
  var PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function validProject(id) {
    return typeof id === "string" && PROJECT_ID.test(id) &&
      PROJECTS.some(function (p) { return p.id === id; }) ? id : null;
  }
  function hashProject() {
    var m = location.hash.match(/^#projet-(.+)$/);
    return m ? validProject(m[1]) : null;
  }
  var PUBLICATIONS = [
    // Du plus récent au plus ancien
    { n: 5, type: "training" }, // Master GRME, d'après le portail « Eau, climat et mangroves »
    { n: 4, type: "training" },
    { n: 3, type: "training" },
    { n: 2, type: "publication", link: true }, // lien de l'article à fournir ; article issu du colloque, donc postérieur à l'atelier
    { n: 1, type: "workshop" }
  ];

  /* ---------- Rendu ---------- */
  function renderExpertise() {
    var ul = $(".index");
    ul.innerHTML = EXPERTISE.map(function (n) {
      var num = ("0" + n).slice(-2);
      return '<li class="idx-item reveal">' +
        '<h3 style="font:inherit;margin:0"><button class="idx-btn" type="button" aria-expanded="false" aria-controls="idx-p' + n + '" id="idx-b' + n + '">' +
        '<span class="idx-num mono">' + num + '</span>' +
        '<span class="idx-title" data-i18n="exp.' + n + '.t"></span>' +
        '<span class="idx-sign" aria-hidden="true"></span></button></h3>' +
        '<div class="idx-panel" id="idx-p' + n + '" role="region" aria-labelledby="idx-b' + n + '" hidden>' +
        '<p data-i18n="exp.' + n + '.d"></p>' +
        '<div class="idx-kw mono"><span data-i18n="exp.' + n + '.k1"></span><span data-i18n="exp.' + n + '.k2"></span><span data-i18n="exp.' + n + '.k3"></span></div>' +
        '</div></li>';
    }).join("");
  }

  function renderProjects() {
    var wrap = $(".proj-list");
    var total = ("0" + PROJECTS.length).slice(-2);
    wrap.innerHTML = PROJECTS.map(function (p) {
      var num = ("0" + p.n).slice(-2);
      return '<article class="proj" id="p-' + p.id + '" aria-labelledby="pt-' + p.id + '">' +
        '<figure class="proj-media">' +
          '<div class="proj-frame' + (p.logo ? ' is-logo' : '') + '">' + (p.img
            ? '<img src="' + p.img + '" alt="" data-i18n-alt="proj.' + p.n + '.alt" loading="lazy">'
            : '<div class="ph" role="img" data-i18n-aria="proj.photo"><span class="ph-label mono" data-i18n="proj.photo"></span></div>') + '</div>' +
          '<figcaption class="mono cap" data-i18n="' + (p.img ? 'proj.' + p.n + '.caption' : 'proj.caption') + '"></figcaption>' +
        '</figure>' +
        '<div class="proj-text reveal">' +
          '<span class="proj-count" aria-hidden="true">' + num + '<small>/ ' + total + '</small></span>' +
          '<h3 id="pt-' + p.id + '" data-i18n="proj.' + p.n + '.t"></h3>' +
          '<span class="rule rule-gold" aria-hidden="true"></span>' +
          '<p class="proj-desc" data-i18n="proj.' + p.n + '.d"></p>' +
          '<dl class="meta">' + ["role", "period", "place"].filter(function (k) { // seules les infos fournies
            return C.fr["proj." + p.n + "." + k];
          }).map(function (k) {
            return '<div><dt class="mono" data-i18n="proj.' + k + '"></dt><dd data-i18n="proj.' + p.n + '.' + k + '"></dd></div>';
          }).join("") + '</dl>' +
          '<a class="tlink tlink-light proj-open" href="#projet-' + p.id + '" data-project="' + p.id + '" aria-haspopup="dialog">' +
            '<span data-i18n="proj.read"></span><span class="arr" aria-hidden="true">→</span></a>' +
        '</div></article>';
    }).join("");
  }

  function renderPublications() {
    $(".biblio").innerHTML = PUBLICATIONS.map(function (p) {
      return '<li class="bib reveal" data-type="' + p.type + '">' +
        '<span class="bib-year mono" data-i18n="res.' + p.n + '.y"></span>' +
        '<h3 data-i18n="res.' + p.n + '.t"></h3>' +
        '<div class="bib-meta"><span data-i18n="res.' + p.n + '.m"></span><span class="tag mono" data-i18n="res.t.' + p.type + '"></span></div>' +
        (p.link ? '<span class="bib-pdf is-placeholder" data-i18n="res.' + p.n + '.link"></span>' : '') +
        '</li>';
    }).join("");
  }

  /* ---------- Bilinguisme ---------- */
  var lang = "fr";

  function applyLang(next) {
    var dict = C[next] || C.fr;
    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });
    $$("[data-i18n-html]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-html")];
      if (v != null) el.innerHTML = v; // contenu interne et maîtrisé (balises <em> uniquement)
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", v);
    });
    $$("[data-i18n-alt]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-alt")];
      if (v != null) el.setAttribute("alt", v);
    });
    document.documentElement.lang = next;
    if (dict["meta.title"]) document.title = dict["meta.title"];
    $$("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === next));
    });
    lang = next; // avant fillPanel, qui lit C[lang]
    if (menu && menu.classList.contains("is-open")) $(".sr", menuBtn).textContent = dict["nav.close"];
    if (panelProject) fillPanel(panelProject);
    refreshJourney();
  }

  function switchLang(next) {
    if (next === lang) return;
    try { localStorage.setItem("mm-lang", next); } catch (e) {}
    var url = new URL(location.href);
    url.searchParams.set("lang", next);
    history.replaceState(history.state, "", url);
    if (reduced) { applyLang(next); return; }
    var root = document.documentElement;
    root.classList.add("lang-switching");
    setTimeout(function () {
      applyLang(next);
      requestAnimationFrame(function () { root.classList.remove("lang-switching"); });
    }, 150);
  }

  function initialLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "fr" || q === "en") return q;
    try { var s = localStorage.getItem("mm-lang"); if (s === "fr" || s === "en") return s; } catch (e) {}
    return "fr"; // la langue du navigateur n'impose aucune redirection
  }

  /* ---------- Header : état compact + progression ---------- */
  var header = $(".site-header");
  var bar = $(".progress span");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      header.classList.toggle("is-compact", y > 80);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      ticking = false;
    });
  }

  /* ---------- Section active ---------- */
  function initActive() {
    var links = $$('.nav a, .mobile-menu a');
    var ids = ["hero", "profil", "expertise", "projets", "publications", "engagements", "collaborer", "contact"];
    if (!("IntersectionObserver" in window)) return; // J1 - indicateur facultatif : la navigation reste fonctionnelle
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        links.forEach(function (a) {
          if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Ancres : focus sur le titre de section ---------- */
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-project")) return;
      var id = a.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMenu(false);
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.pushState(null, "", "#" + id);
      var h = target.querySelector("h1, h2") || target;
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      setTimeout(function () { h.focus({ preventScroll: true }); }, reduced ? 0 : 500);
    });
  }

  /* ---------- Menu mobile ---------- */
  var menu = $("#mobile-menu");
  var menuBtn = $(".menu-btn");
  var menuTimer = null;
  function openMenu() {
    clearTimeout(menuTimer); // C1 - une fermeture en cours ne doit pas masquer le menu réouvert
    menu.hidden = false;
    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";
    menuBtn.setAttribute("aria-expanded", "true");
    $(".sr", menuBtn).textContent = C[lang]["nav.close"];
    void menu.offsetWidth; // applique l'état initial pour conserver le fondu
    menu.classList.add("is-open");
    // J5 - focus après que le menu soit visible (un élément visibility:hidden ne peut pas le recevoir)
    var first = $("a", menu); if (first) first.focus();
  }
  function closeMenu(restore) {
    if (menu.hidden || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open"); // visibility:hidden + pointer-events:none immédiatement côté interaction
    document.body.classList.remove("menu-open");
    document.body.style.overflow = "";
    menuBtn.setAttribute("aria-expanded", "false");
    $(".sr", menuBtn).textContent = C[lang]["nav.menu"];
    clearTimeout(menuTimer);
    menuTimer = setTimeout(function () { menu.hidden = true; }, reduced ? 0 : 220);
    if (restore !== false) menuBtn.focus();
  }
  function initMenu() {
    menuBtn.addEventListener("click", function () {
      menuBtn.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key !== "Tab") return;
      // Piège de focus : menu + bouton + sélecteur de langue de l'en-tête
      var f = $$(".header-tools button").concat($$("a", menu));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1080) closeMenu(false); });
  }

  /* ---------- Accordéons d'expertise ---------- */
  function initAccordion() {
    $(".index").addEventListener("click", function (e) {
      var btn = e.target.closest(".idx-btn");
      if (!btn) return;
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      document.getElementById(btn.getAttribute("aria-controls")).hidden = open;
    });
  }

  /* ---------- Filtres publications ---------- */
  function initFilters() {
    var btns = $$(".filters button");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var shown = 0;
        $$(".bib").forEach(function (li) {
          var ok = f === "all" || li.getAttribute("data-type") === f;
          li.classList.toggle("is-hidden", !ok);
          if (ok) shown++;
        });
        $(".biblio-empty").hidden = shown > 0;
      });
    });
  }

  /* ---------- Panneau projet (<dialog>) ---------- */
  var dialog = $("#project-panel");
  var panelProject = null;
  var opener = null;

  // Texte simple, ou liste à puces si la valeur est un tableau
  function fillText(el, v) {
    el.textContent = "";
    if (Array.isArray(v)) v.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; el.appendChild(li); });
    else el.textContent = v || "";
  }

  function fillPanel(id) {
    var p = PROJECTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return false;
    var d = C[lang] || C.fr;
    $("#panel-title").textContent = d["proj." + p.n + ".t"];
    $(".panel-summary").textContent = d["proj." + p.n + ".d"];
    $(".panel-count").textContent = ("0" + p.n).slice(-2) + " / " + ("0" + PROJECTS.length).slice(-2);
    // Photo du panneau : la photo du projet si elle existe, sinon l'emplacement « à fournir »
    var img = $(".panel-img", dialog);
    img.hidden = !p.img;
    $(".panel-photo .ph-label", dialog).hidden = !!p.img;
    $(".panel-photo", dialog).classList.toggle("is-logo", !!p.logo);
    if (p.img) { img.src = p.img; img.alt = d["proj." + p.n + ".alt"] || ""; } else { img.removeAttribute("src"); img.alt = ""; }
    // Rubrique « Photos & documents » : galerie si le projet en a, sinon la mention « à fournir »
    var docs = p.docs || [], gal = $(".panel-gallery", dialog);
    $(".panel-docs-tbd", dialog).hidden = docs.length > 0;
    gal.textContent = "";
    docs.forEach(function (doc) {
      var fig = document.createElement("figure"), a = document.createElement("a"),
          im = document.createElement("img"), cap = document.createElement("figcaption");
      a.href = doc.src; a.target = "_blank"; a.rel = "noopener"; // ouvre la photo en grand
      im.src = doc.src; im.alt = d[doc.key + ".alt"] || ""; im.loading = "lazy";
      cap.textContent = d[doc.key + ".cap"] || "";
      a.appendChild(im); fig.appendChild(a); fig.appendChild(cap); gal.appendChild(fig);
    });
    $$("[data-pk]", dialog).forEach(function (el) {
      var v = d["proj." + p.n + "." + el.getAttribute("data-pk")];
      el.parentNode.hidden = !v; // rubrique ou ligne masquée si le projet ne la renseigne pas
      fillText(el, v);
    });
    // Rubriques supplémentaires propres au projet
    var extras = $(".panel-extras", dialog);
    extras.textContent = "";
    (p.extras || []).forEach(function (x) {
      var base = "proj." + p.n + "." + x + ".", sec = document.createElement("section");
      var h = document.createElement("h3");
      h.className = "mono label"; h.textContent = d[base + "h"] || "";
      sec.appendChild(h);
      [["p", "p", ""], ["list", "ul", "panel-list"], ["note", "p", "panel-note"]].forEach(function (f) {
        if (!d[base + f[0]]) return;
        var el = document.createElement(f[1]);
        if (f[2]) el.className = f[2];
        fillText(el, d[base + f[0]]);
        sec.appendChild(el);
      });
      extras.appendChild(sec);
    });
    return true;
  }

  function openPanel(id, push) {
    if (!fillPanel(id)) return;
    panelProject = id;
    if (push) history.pushState({ panel: id }, "", "#projet-" + id);
    $(".panel-body").scrollTop = 0;
    dialog.showModal();
    document.body.classList.add("panel-open");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { dialog.classList.add("is-open"); });
    });
    $("#panel-title").focus();
  }

  var closing = false; // N1 - évite plusieurs history.back() lors de clics rapides

  function finishClose() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.remove("is-open");
    dialog.classList.add("is-closing");
    var done = function () {
      dialog.classList.remove("is-closing");
      dialog.close();
      document.body.classList.remove("panel-open");
      panelProject = null;
      closing = false;
      var back = opener || $('[data-project]');
      if (back) back.focus({ preventScroll: true });
    };
    reduced ? done() : setTimeout(done, 220);
  }

  // Fermeture demandée par l'utilisateur : passe par l'historique si le panneau y est inscrit
  function requestClose() {
    if (closing || !dialog.open) return;
    closing = true;
    if (history.state && history.state.panel) history.back();
    else { history.replaceState(null, "", "#projets"); finishClose(); }
  }

  function initPanel() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-project]");
      if (!a) return;
      e.preventDefault();
      opener = a;
      openPanel(a.getAttribute("data-project"), true);
    });
    $("[data-close]", dialog).addEventListener("click", requestClose);
    // Fermeture native non interceptée (ex. Échap non annulable sous Chromium) : nettoyage + historique
    dialog.addEventListener("close", function () {
      if (!document.body.classList.contains("panel-open")) return;
      if (!closing && history.state && history.state.panel) history.back();
      dialog.classList.remove("is-open", "is-closing");
      document.body.classList.remove("panel-open");
      panelProject = null;
      closing = false;
      var back = opener || $('[data-project]');
      if (back) back.focus({ preventScroll: true });
    });
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); requestClose(); }); // Échap
    dialog.addEventListener("click", function (e) { if (e.target === dialog) requestClose(); }); // voile
    window.addEventListener("popstate", function () {
      var id = hashProject();
      if (id && !dialog.open) { opener = $('[data-project="' + id + '"]'); openPanel(id, false); }
      else if (!id && dialog.open) finishClose();
      else if (!id) closing = false;
    });
    // Lien partagé #projet-xxx : ouverture directe (identifiant validé)
    var id = hashProject();
    if (id) {
      opener = $('[data-project="' + id + '"]');
      history.replaceState(null, "", "#projets");
      history.pushState({ panel: id }, "", "#projet-" + id);
      var sec = $("#projets"); if (sec) sec.scrollIntoView();
      openPanel(id, false);
    } else if (/^#projet-/.test(location.hash)) {
      console.warn("[Mariette preview] Fragment de projet inconnu ignoré :", location.hash);
      history.replaceState(null, "", location.pathname + location.search + "#projets");
    }
  }

  /* ---------- Copier l'adresse (désactivé tant que l'adresse n'est pas confirmée) ---------- */
  // Adresse issue du CV transmis par le client (mettre à null pour désactiver la copie).
  var CONFIRMED_EMAIL = "mariettemandjan40@gmail.com";
  function initCopy() {
    var btn = $("#copy-email"), status = $("#copy-status");
    if (!btn) return;
    if (CONFIRMED_EMAIL && !navigator.clipboard) { btn.hidden = true; return; } // contexte non sécurisé : le lien mailto reste disponible
    if (!CONFIRMED_EMAIL) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      var na = $("span", btn); // libellé explicite « indisponible », conservé lors des changements de langue
      na.setAttribute("data-i18n", "ct.copy.na");
      na.textContent = C[lang]["ct.copy.na"];
      return;
    }
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
    btn.classList.remove("is-placeholder");
    btn.addEventListener("click", function () {
      var label = $("span", btn);
      navigator.clipboard.writeText(CONFIRMED_EMAIL).then(function () {
        var msg = C[lang]["ct.copied"]; // affiché uniquement après confirmation
        status.textContent = msg;
        label.textContent = msg;
        setTimeout(function () { label.textContent = C[lang]["ct.copy"]; }, 1600);
      }, function (err) { console.error("[Mariette preview] Copie impossible :", err); });
    });
  }

  /* ---------- Apparitions au défilement ---------- */
  function initReveal() {
    var items = $$(".reveal, .proj");
    if (!("IntersectionObserver" in window) || reduced) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    // léger décalage entre éléments frères
    items.forEach(function (el) {
      var sibs = $$(":scope > .reveal", el.parentElement);
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty("--rd", Math.min(i, 5) * 60 + "ms");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Parcours : étape active, écran, progression, connecteur ---------- */
  var jr = null;

  function renderJourney(animate) {
    var li = jr.items[jr.i];
    var fill = function () {
      var pick = function (s) { var e = $(s, li); return e ? e.textContent : ""; };
      $(".jr-idx", jr.screen).textContent = ("0" + (jr.i + 1)).slice(-2);
      $(".jr-year", jr.screen).textContent = pick(".tl-year");
      $(".jr-title", jr.screen).textContent = pick("h3");
      $(".jr-text", jr.screen).textContent = pick("p");
      $(".jr-screen-icon use", jr.screen).setAttribute("href", $("use", li).getAttribute("href"));
      jr.bar.style.setProperty("--p", (jr.i + 1) / jr.items.length);
    };
    if (!animate || reduced) { fill(); return; }
    jr.screen.classList.add("is-swapping");
    clearTimeout(jr.timer);
    jr.timer = setTimeout(function () { fill(); jr.screen.classList.remove("is-swapping"); }, 200);
  }

  function refreshJourney() { if (jr && jr.i >= 0) renderJourney(false); }

  function initJourney() {
    var list = $(".jr-list .timeline");
    if (!list) return;
    jr = { list: list, items: $$(".jr-item", list), i: -1, timer: null,
      screen: $(".jr-content"), bar: $(".jr-bar"), grid: $(".jr-grid"), phone: $(".jr-phone"),
      path: $(".jr-link path"), dot: $(".jr-link circle") };
    $(".jr-total").textContent = ("0" + jr.items.length).slice(-2);
    var ticking = false;

    function setActive(i) {
      if (i === jr.i) return;
      var first = jr.i < 0;
      jr.i = i;
      jr.items.forEach(function (li, k) {
        li.classList.toggle("is-active", k === i);
        li.classList.toggle("is-past", k < i);
      });
      renderJourney(!first);
      if (!reduced && jr.path) { // la courbe se redessine vers la nouvelle étape
        jr.path.classList.remove("is-drawing");
        void jr.path.getBoundingClientRect();
        jr.path.classList.add("is-drawing");
      }
    }

    function update() {
      ticking = false;
      var mid = window.innerHeight * 0.5, i = 0;
      jr.items.forEach(function (li, k) { if ($(".jr-dot", li).getBoundingClientRect().top <= mid) i = k; });
      var r = list.getBoundingClientRect(), end = r.bottom <= window.innerHeight * 0.85; // fin de liste visible : dernière étape atteinte
      if (end) i = jr.items.length - 1;
      setActive(i);
      list.style.setProperty("--jp", end ? 1 : Math.max(0, Math.min(1, (mid - r.top) / r.height)));
      // Connecteur : du bord droit de l'écran au cercle actif (desktop uniquement)
      if (!jr.path || !jr.phone.offsetParent) return;
      var g = jr.grid.getBoundingClientRect(), p = jr.phone.getBoundingClientRect(),
          d = $(".jr-dot", jr.items[jr.i]).getBoundingClientRect();
      var x1 = p.right - g.left, y1 = p.top + p.height * 0.5 - g.top,
          x2 = d.left - g.left - 6, y2 = d.top + d.height * 0.5 - g.top, dx = (x2 - x1) * 0.55;
      jr.path.setAttribute("d", "M" + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + " " + (x2 - dx) + " " + y2 + " " + x2 + " " + y2);
      jr.dot.setAttribute("cx", x1); jr.dot.setAttribute("cy", y1);
    }
    function onTick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onTick, { passive: true });
    window.addEventListener("resize", onTick);
    update();
  }

  /* ---------- Formulaire de contact : ouvre la messagerie du visiteur (mailto, sans serveur) ---------- */
  function initContactForm() {
    var form = $("#contact-form");
    if (!form) return;
    var status = $("#cf-status");
    var fields = $$("#cf-name, #cf-subject, #cf-message", form);
    var t = function (k) { return (C[lang] || C.fr)[k] || ""; };

    // Le message porte sa clé i18n : applyLang() le traduit lors d'un changement de langue
    function say(el, key) {
      if (key) { el.setAttribute("data-i18n", key); el.textContent = t(key); }
      else { el.removeAttribute("data-i18n"); el.textContent = ""; }
    }
    function check(f) {
      var v = f.value.trim(), key = "";
      if (!v) key = "cf.err.required";
      else if (f.name === "message" && v.length < 10) key = "cf.err.short";
      var err = $("#" + f.id + "-err");
      f.setAttribute("aria-invalid", String(!!key));
      if (err) { err.hidden = !key; say(err, key); }
      return !key;
    }
    function show(key, state) { say(status, key); status.className = "cf-status" + (state ? " is-" + state : ""); }

    // Un champ déjà signalé se revalide pendant la saisie, sans décaler la mise en page sous le pointeur
    fields.forEach(function (f) {
      f.addEventListener(f.tagName === "SELECT" ? "change" : "input", function () {
        if (f.getAttribute("aria-invalid") === "true") check(f);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!fields.map(check).every(Boolean)) { show("cf.err.form", "error"); $("[aria-invalid=true]", form).focus(); return; }
      var v = function (id) { return $(id, form).value.trim(); };
      var sel = $("#cf-subject", form), org = v("#cf-org");
      var subject = "[Portfolio] " + sel.options[sel.selectedIndex].text + ", " + v("#cf-name");
      var body = t("cf.mail.name") + " : " + v("#cf-name") + "\n" +
        (org ? t("cf.mail.org") + " : " + org + "\n" : "") + "\n" + v("#cf-message") + "\n";
      var a = document.createElement("a");
      a.href = form.getAttribute("action") + "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));
      a.click(); // ouvre la messagerie du visiteur ; c'est lui qui envoie
      show("cf.ok", "ok");
    });
  }

  /* ---------- Init ---------- */
  renderExpertise();
  renderProjects();
  renderPublications();
  applyLang(initialLang());

  $$("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { switchLang(b.getAttribute("data-lang")); });
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  initActive();
  initAnchors();
  initMenu();
  initAccordion();
  initFilters();
  initPanel();
  initCopy();
  initReveal();
  initJourney();
  initContactForm();
})();
