// Icônes SVG inline, trait, couleur héritée (currentColor). Construites par createElementNS, jamais par innerHTML.

const NS = 'http://www.w3.org/2000/svg';

const TRACES = {
  accueil: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  liste: ['M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2'],
  personnes: ['M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2', { cercle: [9, 8, 3.5] }],
  plus: ['M12 5v14M5 12h14'],
  sortie: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11'],
  recherche: ['M20 20l-4.5-4.5', { cercle: [10.5, 10.5, 6.5] }],
};

export function icone(nom, taille = 22) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(taille));
  svg.setAttribute('height', String(taille));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const t of TRACES[nom] || []) {
    if (typeof t === 'string') {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', t);
      svg.appendChild(p);
    } else if (t.cercle) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(t.cercle[0]));
      c.setAttribute('cy', String(t.cercle[1]));
      c.setAttribute('r', String(t.cercle[2]));
      svg.appendChild(c);
    }
  }
  return svg;
}
