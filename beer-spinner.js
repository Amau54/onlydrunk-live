/* global window, HTMLElement */

(function registerBeerSpinner() {
  "use strict";

  if (!window.customElements || window.customElements.get("beer-spinner")) return;

  var clamp = function (value, min, max, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };

  /**
   * Spinner pre-React utilise par l'ecran de demarrage.
   *
   * Attributs configurables : size, speed, amber, foam et glow.
   * Les memes valeurs peuvent etre surchargees avec les variables CSS
   * --beer-spinner-size, --beer-spinner-speed, --beer-spinner-amber,
   * --beer-spinner-foam et --beer-spinner-glow.
   */
  class BeerSpinner extends HTMLElement {
    static get observedAttributes() {
      return ["size", "speed", "amber", "foam", "glow"];
    }

    constructor() {
      super();
      this._flow = null;
      this._motionQuery = null;
      this._onStartupEnd = this._onStartupEnd.bind(this);
      this._onMotionPreference = this._onMotionPreference.bind(this);
    }

    connectedCallback() {
      if (!this.shadowRoot) this._render();
      this._syncVariables();
      this._flow = this.shadowRoot.querySelector(".beer-flow");
      this._motionQuery = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

      if (this._motionQuery) {
        if (this._motionQuery.addEventListener) {
          this._motionQuery.addEventListener("change", this._onMotionPreference);
        } else if (this._motionQuery.addListener) {
          this._motionQuery.addListener(this._onMotionPreference);
        }
      }

      this._startMotion();
    }

    disconnectedCallback() {
      if (this._flow) {
        this._flow.removeEventListener("animationend", this._onStartupEnd);
        this._flow.classList.remove("starting", "running");
      }

      if (this._motionQuery) {
        if (this._motionQuery.removeEventListener) {
          this._motionQuery.removeEventListener("change", this._onMotionPreference);
        } else if (this._motionQuery.removeListener) {
          this._motionQuery.removeListener(this._onMotionPreference);
        }
      }

      this._motionQuery = null;
    }

    attributeChangedCallback() {
      if (this.isConnected) this._syncVariables();
    }

    _syncVariables() {
      var size = clamp(this.getAttribute("size"), 32, 240, 90);
      var speed = clamp(this.getAttribute("speed"), 0.8, 4, 1.7);
      var foam = clamp(this.getAttribute("foam"), 0, 1, 0.62);
      var glow = clamp(this.getAttribute("glow"), 0, 1, 0.58);
      var amber = this.getAttribute("amber") || "#f5961a";

      this.style.setProperty("--beer-spinner-size", size + "px");
      this.style.setProperty("--beer-spinner-speed", speed + "s");
      this.style.setProperty("--beer-spinner-amber", amber);
      this.style.setProperty("--beer-spinner-foam", String(foam));
      this.style.setProperty("--beer-spinner-foam-low", String(foam * 0.7));
      this.style.setProperty("--beer-spinner-glow", String(glow));
      this.style.setProperty("--beer-spinner-glow-low", String(glow * 0.64));
    }

    _startMotion() {
      if (!this._flow) return;
      var reduced = !!(this._motionQuery && this._motionQuery.matches);
      this.classList.toggle("reduced-motion", reduced);
      this._flow.removeEventListener("animationend", this._onStartupEnd);
      this._flow.classList.remove("starting", "running");
      if (reduced) return;

      this._flow.classList.add("starting");
      this._flow.addEventListener("animationend", this._onStartupEnd);
    }

    _onStartupEnd(event) {
      if (!this._flow || event.animationName !== "beer-spinner-start") return;
      this._flow.removeEventListener("animationend", this._onStartupEnd);
      this._flow.classList.remove("starting");
      this._flow.classList.add("running");
    }

    _onMotionPreference() {
      this._startMotion();
    }

    _render() {
      var root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host {
            --beer-spinner-size: 90px;
            --beer-spinner-speed: 1.7s;
            --beer-spinner-amber: #f5961a;
            --beer-spinner-foam: .62;
            --beer-spinner-foam-low: .434;
            --beer-spinner-glow: .58;
            --beer-spinner-glow-low: .371;
            display: inline-grid;
            place-items: center;
            width: var(--beer-spinner-size);
            height: var(--beer-spinner-size);
            contain: layout paint style;
            line-height: 0;
          }

          svg {
            display: block;
            width: 100%;
            height: 100%;
            overflow: visible;
          }

          .beer-flow,
          .beer-organic,
          .beer-foam,
          .bubble-cloud,
          .beer-light {
            transform-box: view-box;
            transform-origin: 60px 60px;
          }

          .beer-flow,
          .beer-organic {
            will-change: transform;
          }

          .beer-foam,
          .bubble-cloud,
          .beer-light {
            will-change: transform, opacity;
          }

          .beer-flow.starting {
            animation: beer-spinner-start .2s cubic-bezier(.42, 0, .72, .58) forwards;
          }

          .beer-flow.running {
            animation: beer-spinner-spin var(--beer-spinner-speed) linear infinite;
          }

          .beer-organic {
            animation: beer-spinner-organic 1.08s ease-in-out infinite alternate;
          }

          .beer-light {
            opacity: var(--beer-spinner-glow);
            animation: beer-spinner-light 1.32s ease-in-out infinite;
          }

          .beer-foam {
            opacity: var(--beer-spinner-foam);
            animation: beer-spinner-foam-drift 1.06s ease-in-out infinite alternate;
          }

          .bubble-cloud-a {
            animation: beer-spinner-bubbles-a 1.42s ease-in-out infinite;
          }

          .bubble-cloud-b {
            animation: beer-spinner-bubbles-b 1.57s ease-in-out -.74s infinite;
          }

          @keyframes beer-spinner-start {
            from { transform: rotate(-4deg); }
            to { transform: rotate(18deg); }
          }

          @keyframes beer-spinner-spin {
            from { transform: rotate(18deg); }
            to { transform: rotate(378deg); }
          }

          @keyframes beer-spinner-organic {
            from { transform: scaleX(.991) scaleY(1.009) rotate(-.5deg); }
            to { transform: scaleX(1.011) scaleY(.989) rotate(.6deg); }
          }

          @keyframes beer-spinner-light {
            0%, 100% { opacity: var(--beer-spinner-glow-low); }
            50% { opacity: var(--beer-spinner-glow); }
          }

          @keyframes beer-spinner-foam-drift {
            from {
              opacity: var(--beer-spinner-foam-low);
              transform: rotate(-1.6deg) translate(-.45px, .3px);
            }
            to {
              opacity: var(--beer-spinner-foam);
              transform: rotate(1.8deg) translate(.65px, -.35px);
            }
          }

          @keyframes beer-spinner-bubbles-a {
            0%, 100% { opacity: .08; transform: translate(0, 2px) scale(.82); }
            48% { opacity: .72; transform: translate(1px, -2.4px) scale(1); }
          }

          @keyframes beer-spinner-bubbles-b {
            0%, 100% { opacity: .06; transform: translate(.4px, 1.5px) scale(.78); }
            52% { opacity: .62; transform: translate(-.8px, -2.8px) scale(1); }
          }

          :host(.reduced-motion) .beer-flow {
            transform: rotate(18deg);
          }

          :host(.reduced-motion) .beer-organic,
          :host(.reduced-motion) .beer-light,
          :host(.reduced-motion) .beer-foam,
          :host(.reduced-motion) .bubble-cloud {
            animation: none !important;
          }

          :host(.reduced-motion) .bubble-cloud { opacity: .3; }

          @media (prefers-reduced-motion: reduce) {
            .beer-flow,
            .beer-organic,
            .beer-light,
            .beer-foam,
            .bubble-cloud {
              animation: none !important;
            }
            .beer-flow { transform: rotate(18deg); }
            .bubble-cloud { opacity: .3; }
          }
        </style>

        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <defs>
            <path id="beer-spinner-arc" d="M 74 18 C 56 14 38 21 26 35 C 15 48 15 66 23 80 C 33 98 54 107 73 102 C 92 97 104 81 103 63 C 103 56 101 50 98 46"/>
            <linearGradient id="beer-spinner-liquid" x1="15" y1="20" x2="103" y2="101" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#713004"/>
              <stop offset=".23" stop-color="var(--beer-spinner-amber)"/>
              <stop offset=".55" stop-color="#ffc14a"/>
              <stop offset=".73" stop-color="#d86b08"/>
              <stop offset="1" stop-color="#843804"/>
            </linearGradient>
            <linearGradient id="beer-spinner-taper" x1="101" y1="50" x2="86" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#f8a11b"/>
              <stop offset="1" stop-color="#ffd071" stop-opacity=".72"/>
            </linearGradient>
            <clipPath id="beer-spinner-liquid-clip">
              <use href="#beer-spinner-arc" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
              <path d="M 101 49 C 99 43 96 38 92 34" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
            </clipPath>
          </defs>

          <g class="beer-flow">
            <g class="beer-organic">
              <use href="#beer-spinner-arc" fill="none" stroke="var(--beer-spinner-amber)" stroke-opacity=".13" stroke-width="18" stroke-linecap="round"/>
              <use href="#beer-spinner-arc" fill="none" stroke="#552103" stroke-opacity=".48" stroke-width="15.5" stroke-linecap="round"/>
              <use href="#beer-spinner-arc" fill="none" stroke="url(#beer-spinner-liquid)" stroke-width="12.4" stroke-linecap="round"/>
              <use href="#beer-spinner-arc" fill="none" stroke="#5e2502" stroke-opacity=".32" stroke-width="5.5" stroke-linecap="round"/>
              <use href="#beer-spinner-arc" fill="none" stroke="#ffe09a" stroke-opacity=".48" stroke-width="1.9" stroke-linecap="round" stroke-dasharray="8 18 4 25 13 36"/>

              <g class="beer-light">
                <use href="#beer-spinner-arc" fill="none" stroke="#ffd978" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="16 42 6 51 10 78"/>
              </g>

              <path d="M 101 49 C 99 43 96 38 92 34" fill="none" stroke="url(#beer-spinner-taper)" stroke-width="7" stroke-linecap="round"/>
              <path d="M 92 34 C 90 32 88 30 86 29" fill="none" stroke="#ffc455" stroke-opacity=".78" stroke-width="3.2" stroke-linecap="round"/>
              <ellipse cx="74" cy="18" rx="8.2" ry="6.5" fill="#d66a08" fill-opacity=".8" transform="rotate(13 74 18)"/>
              <ellipse cx="72" cy="16.8" rx="4.7" ry="2.1" fill="#ffd16d" fill-opacity=".48" transform="rotate(8 72 16.8)"/>

              <g class="beer-foam">
                <use href="#beer-spinner-arc" fill="none" stroke="#fff2cf" stroke-width="3.7" stroke-linecap="round" stroke-dasharray="22 20 7 31 15 43 5 36"/>
                <g fill="#fff4d8">
                  <circle cx="25" cy="37" r="2.7"/>
                  <circle cx="20" cy="54" r="2.1"/>
                  <circle cx="30" cy="90" r="2.5"/>
                  <circle cx="52" cy="103" r="2.2"/>
                  <circle cx="88" cy="92" r="2.45"/>
                </g>
              </g>

              <g clip-path="url(#beer-spinner-liquid-clip)" fill="#ffe4a0">
                <g class="bubble-cloud bubble-cloud-a">
                  <circle class="beer-bubble" cx="35" cy="28" r="1.45"/>
                  <circle class="beer-bubble" cx="40" cy="96" r="1.7"/>
                  <circle class="beer-bubble" cx="97" cy="78" r="1.55"/>
                </g>
                <g class="bubble-cloud bubble-cloud-b">
                  <circle class="beer-bubble" cx="20" cy="66" r="1.05"/>
                  <circle class="beer-bubble" cx="70" cy="102" r="1.1"/>
                  <circle class="beer-bubble" cx="99" cy="53" r=".9"/>
                </g>
              </g>
            </g>
          </g>
        </svg>
      `;
    }
  }

  window.customElements.define("beer-spinner", BeerSpinner);
})();
