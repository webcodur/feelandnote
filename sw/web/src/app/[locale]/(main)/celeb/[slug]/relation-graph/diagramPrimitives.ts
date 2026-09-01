import type { DiagramData, DiagramTheme, PersonNode } from "./types";

export interface RowBranch {
  hub: string;
  personIds: string[];
  y: number;
}
export type CenterRay = "up" | "left" | "right" | "down";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const face = (avatarUrl: string | null) => avatarUrl
  ? `<img src="${escapeHtml(avatarUrl)}" alt="" draggable="false" />`
  : `<span class="relation-profile-fallback" aria-hidden="true">`
    + `<svg viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="35" r="22"></circle>`
    + `<path d="M-4 108C-2 78 19 60 50 60s52 18 54 48H-4Z"></path></svg></span>`;

export class DiagramBuilder {
  readonly data: DiagramData = { nodes: [], edges: [], combos: [] };
  private edgeSequence = 0;

  constructor(private readonly theme: DiagramTheme) {}

  person(person: PersonNode, x: number, y: number, anchor: "top" | "bottom") {
    const html = `<button class="relation-person is-anchored-${anchor}" type="button" data-relation-person="${escapeHtml(person.id)}">`
      + `<span class="relation-face">${face(person.avatarUrl)}</span>`
      + `<strong title="${escapeHtml(person.name)}">${escapeHtml(person.name)}</strong></button>`;
    this.data.nodes.push({
      id: `person:${person.id}`, type: "html",
      data: { kind: "person", nodeType: "html", personId: person.id, personIds: [person.id] },
      style: { x, y, size: [78, 96], dx: -39, dy: -48, innerHTML: html, zIndex: 10 },
    });
  }

  center(name: string, avatarUrl: string | null, x: number, y: number, rays: CenterRay[]) {
    const rayHtml = rays.map((ray) => `<i class="relation-ray is-${ray}" aria-hidden="true"></i>`).join("");
    const html = `<button class="relation-person relation-center" type="button">${rayHtml}<span class="relation-face">${face(avatarUrl)}</span>`
      + `<strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong></button>`;
    this.data.nodes.push({
      id: "center", type: "html", data: { kind: "center", nodeType: "html" },
      style: { x, y, size: [154, 160], dx: -77, dy: -80, innerHTML: html, zIndex: 12 },
    });
  }

  lane(id: string, label: string, count: number, x: number, y: number, personIds: string[], compact = false) {
    if (!count) return;
    const html = `<div class="relation-lane${compact ? " is-compact" : ""}">`
      + `<span>${escapeHtml(label)}</span></div>`;
    const width = compact ? 88 : 220;
    this.data.nodes.push({
      id, type: "html", data: { kind: "lane", nodeType: "html", personIds },
      style: { x, y, size: [width, 30], dx: -width / 2, dy: -15, innerHTML: html, zIndex: 11 },
    });
  }

  junction(id: string, x: number, y: number, personIds: string[]) {
    this.data.nodes.push({
      id, type: "rect", data: { kind: "junction", nodeType: "rect", personIds },
      style: { x, y, size: [1, 1], fill: "transparent", stroke: "transparent", lineWidth: 0, zIndex: 3 },
    });
    return id;
  }

  edge(source: string, target: string, personIds: string[]) {
    const id = `relation-edge-${this.edgeSequence++}`;
    this.data.edges.push({
      id: `${id}:ink`, source, target, type: "polyline", data: { personIds, layer: "ink" },
      style: { stroke: this.theme.edge, lineWidth: 1.1, halo: false,
        lineCap: "square", lineJoin: "miter", radius: 0, zIndex: 1 },
    });
  }

  horizontalRow(id: string, people: PersonNode[], nodeY: number, busY: number, anchorX: number, xs: number[]): RowBranch | null {
    if (!people.length) return null;
    const personIds = people.map((person) => person.id);
    const hub = this.junction(`${id}:hub`, anchorX, busY, personIds);
    const entries = people.map((person, index) => ({ person, x: xs[index] }));
    const sides = [
      entries.filter(({ x }) => x < anchorX).sort((a, b) => b.x - a.x),
      entries.filter(({ x }) => x >= anchorX).sort((a, b) => a.x - b.x),
    ];
    for (const side of sides) {
      let previous = hub;
      side.forEach((entry, index) => {
        const remaining = side.slice(index).map(({ person }) => person.id);
        const junction = Math.abs(entry.x - anchorX) < 1
          ? hub : this.junction(`${id}:junction:${entry.person.id}`, entry.x, busY, remaining);
        if (junction !== previous) this.edge(previous, junction, remaining);
        this.person(entry.person, entry.x, nodeY, busY > nodeY ? "bottom" : "top");
        this.edge(junction, `person:${entry.person.id}`, [entry.person.id]);
        previous = junction;
      });
    }
    return { hub, personIds, y: busY };
  }

  connectChain(origin: string, rows: RowBranch[]) {
    let previous = origin;
    rows.forEach((row, index) => {
      const remaining = rows.slice(index).flatMap((item) => item.personIds);
      this.edge(previous, row.hub, remaining);
      previous = row.hub;
    });
  }
}
