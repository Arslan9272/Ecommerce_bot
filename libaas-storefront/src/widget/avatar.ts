// 2D avatar = front-end SVG. Mouth animates while audio plays (lean alternative to a video stream).
export class Avatar {
  private mouth: SVGEllipseElement | null = null;
  private timer: number | null = null;
  private reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  constructor(private host: ShadowRoot) {}

  static svg(): string {
    return `<svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
      <circle cx="30" cy="28" r="15" fill="#F7D9A0"/>
      <path d="M14 30a16 11 0 0 1 32 0q0-16-16-16t-16 16z" fill="#C9A227"/>
      <circle cx="25" cy="27" r="2" fill="#3d1b34"/>
      <circle cx="35" cy="27" r="2" fill="#3d1b34"/>
      <circle cx="22" cy="31" r="2" fill="#e89a9a" opacity=".5"/>
      <circle cx="38" cy="31" r="2" fill="#e89a9a" opacity=".5"/>
      <ellipse id="mouth" cx="30" cy="35" rx="4" ry="1.8" fill="#7a2e3a"/>
      <path d="M30 43v6" stroke="#5B2A4E" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
  }

  bind(): void {
    this.mouth = this.host.querySelector<SVGEllipseElement>("#mouth");
  }

  start(): void {
    if (!this.mouth || this.reduced) return;
    let big = false;
    this.timer = window.setInterval(() => {
      big = !big;
      this.mouth?.setAttribute("ry", big ? "4.5" : "1.3");
    }, 120);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.mouth?.setAttribute("ry", "1.8");
  }
}
