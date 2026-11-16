// Progressive enhancement only. Every page is complete without this file.
(() => {
  const root = document.documentElement;

  // Menu on small screens
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      root.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".menu-toggle__text").textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", () => setOpen(!root.classList.contains("menu-open")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("menu-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    matchMedia("(min-width: 64.01rem)").addEventListener("change", (e) => e.matches && setOpen(false));
  }

  // Specimen drawings reveal once when they scroll into view.
  const reveal = document.querySelectorAll("[data-reveal]");
  if (reveal.length) {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      reveal.forEach((el) => io.observe(el));
      root.classList.add("reveal-ready");
    }
  }

  // Filters: people by research area, news by kind. They dim or hide;
  // they never reorder, so alphabetical and date order always hold.
  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    const scope = document.getElementById(group.dataset.filterGroup);
    const status = group.querySelector("[role='status']");
    if (!scope) return;
    group.hidden = false;
    group.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-value]");
      if (!button) return;
      group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      const value = button.dataset.value;
      if (value === "all") scope.removeAttribute("data-filter");
      else scope.setAttribute("data-filter", value);
      if (status) status.textContent = value === "all" ? "Filter cleared." : `Filter: ${button.firstChild.textContent.trim()}.`;
    });

    // Name search: hides people who do not match, and any group left empty.
    const input = group.querySelector("[data-search-input]");
    if (!input) return;
    const items = [...scope.querySelectorAll("[data-search]")];
    const sections = [...scope.querySelectorAll(".people-section")];
    input.addEventListener("input", () => {
      const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      items.forEach((el) => {
        const hit = terms.every((t) => el.dataset.search.includes(t));
        el.hidden = !hit;
        if (hit) shown += 1;
      });
      scope.querySelectorAll(".org-card, .people-subgroup").forEach((card) => {
        card.hidden = ![...card.querySelectorAll("[data-search]")].some((el) => !el.hidden);
      });
      sections.forEach((s) => {
        const any = [...s.querySelectorAll("[data-search]")].some((el) => !el.hidden);
        s.classList.toggle("is-empty", !any);
        const none = s.querySelector(".people-section__none");
        if (none) none.hidden = any;
      });
      status.textContent = terms.length ? `${shown} ${shown === 1 ? "person matches" : "people match"}` : "";
    });
  });
  // Photo viewer for news galleries. Without script each photo is a link.
  const galleries = document.querySelectorAll("[data-gallery]");
  if (galleries.length && typeof HTMLDialogElement === "function") {
    const box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML =
      '<div class="lightbox__bar"><span class="lightbox__count"></span>' +
      '<button type="button" class="lightbox__close" aria-label="Close">&#x2715;</button></div>' +
      '<div class="lightbox__stage"><button type="button" class="lightbox__prev" aria-label="Previous photo">&#x2190;</button>' +
      '<img class="lightbox__img" alt=""><button type="button" class="lightbox__next" aria-label="Next photo">&#x2192;</button></div>' +
      '<p class="lightbox__cap"></p>';
    document.body.append(box);
    const img = box.querySelector(".lightbox__img");
    const cap = box.querySelector(".lightbox__cap");
    const count = box.querySelector(".lightbox__count");
    let set = [];
    let at = 0;
    const show = (i) => {
      at = (i + set.length) % set.length;
      const a = set[at];
      const pic = a.querySelector("img");
      img.src = a.href;
      img.alt = pic.alt;
      cap.textContent = pic.alt;
      const credit = document.createElement("span");
      credit.textContent = "Photo: " + a.dataset.credit;
      cap.append(credit);
      count.textContent = String(at + 1).padStart(2, "0") + " / " + String(set.length).padStart(2, "0");
      const single = set.length < 2;
      box.querySelector(".lightbox__prev").hidden = single;
      box.querySelector(".lightbox__next").hidden = single;
    };
    galleries.forEach((g) => {
      const links = [...g.querySelectorAll("[data-photo]")];
      links.forEach((a, i) =>
        a.addEventListener("click", (e) => {
          e.preventDefault();
          set = links;
          show(i);
          root.classList.add("lightbox-open");
          box.showModal();
        })
      );
    });
    box.querySelector(".lightbox__prev").addEventListener("click", () => show(at - 1));
    box.querySelector(".lightbox__next").addEventListener("click", () => show(at + 1));
    box.querySelector(".lightbox__close").addEventListener("click", () => box.close());
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.classList.contains("lightbox__stage")) box.close();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(at - 1);
      if (e.key === "ArrowRight") show(at + 1);
    });
    box.addEventListener("close", () => {
      root.classList.remove("lightbox-open");
      set[at] && set[at].focus();
    });
  }
})();
