# -*- coding: utf-8 -*-
"""Aplica layout unificado (capa, faixa, cartões) em todos os manuais HTML."""
from __future__ import annotations

from pathlib import Path

MANUALS_DIR = Path(__file__).resolve().parent.parent / "manuals"

CSS_BLOCK = r"""
    /* --- Leitura: um título na capa; capítulos com respiro; rótulos ligados ao texto abaixo --- */
    header.cover-block h1.cover-main-title {
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .manual-part .print-section + .print-section {
      margin-top: 2.5rem;
    }

    .manual-header-banner .banner-kicker,
    .manual-article-lead .banner-kicker {
      display: block;
      margin-bottom: 0.55rem;
    }

    .manual-header-banner .banner-title,
    .manual-article-lead .banner-title {
      margin-top: 0.1rem;
    }

    .manual-header-banner .banner-lead,
    .manual-article-lead .banner-lead {
      margin-top: 1.1rem !important;
      line-height: 1.58;
    }

    .print-topic .section-cards {
      margin-top: 1.25rem;
    }

    .content-card > p.text-xs.font-semibold.uppercase:first-of-type {
      margin-bottom: 0.35rem;
    }

    .content-card > p.text-xs.font-semibold.uppercase:first-of-type + p,
    .content-card > p.text-xs.font-semibold.uppercase:first-of-type + ul {
      margin-top: 0.5rem !important;
    }
"""

COVER_OLD = """      <p class="text-xs font-semibold uppercase tracking-[0.35em] text-gf-latte">Cafeteria</p>
      <h1 class="font-display mt-3 text-4xl font-semibold leading-tight text-gf-coffee md:text-5xl">
        Gabi Fontes
      </h1>"""

COVER_NEW = """      <h1 class="font-display cover-main-title mt-4 text-3xl font-semibold leading-tight text-gf-coffee sm:text-4xl md:text-[2.6rem]">
        Cafeteria Gabi Fontes
      </h1>"""

SINGLE_CARD_OLD = """        <div class="mt-8">
          <div class="content-card"""

SINGLE_CARD_NEW = """        <div class="section-cards section-cards--single">
          <div class="content-card"""


def process(html: str) -> str:
    if COVER_OLD not in html:
        raise ValueError("Padrão de capa esperado não encontrado")

    html = html.replace(COVER_OLD, COVER_NEW, 1)

    if CSS_BLOCK.strip() not in html:
        if "    @media print {" not in html:
            raise ValueError("@media print não encontrado")
        html = html.replace("    @media print {", CSS_BLOCK + "\n    @media print {", 1)

    html = html.replace(
        '<p class="text-xs font-semibold uppercase tracking-[0.25em] text-gf-latte">',
        '<p class="banner-kicker text-xs font-semibold uppercase tracking-[0.25em] text-gf-latte">',
    )
    html = html.replace(
        '<h2 class="font-display mt-2 text-3xl font-semibold text-gf-coffee md:text-4xl">',
        '<h2 class="banner-title font-display text-3xl font-semibold text-gf-coffee md:text-4xl">',
    )
    html = html.replace(
        'class="mt-2 font-body text-sm font-normal text-gf-coffeeSoft/90"',
        'class="banner-lead font-body text-sm font-normal text-gf-coffeeSoft/90"',
    )

    html = html.replace(
        '<div class="mb-12 border-b border-gf-latte/30 pb-8 text-center md:text-left">',
        '<div class="manual-article-lead mb-12 border-b border-gf-latte/30 pb-8 text-center md:text-left">',
        1,
    )

    html = html.replace('<div class="mt-8 space-y-6">', '<div class="section-cards space-y-8">')
    html = html.replace(SINGLE_CARD_OLD, SINGLE_CARD_NEW)

    return html


def main() -> None:
    for path in sorted(MANUALS_DIR.glob("*.html")):
        if path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8")
        try:
            new = process(text)
        except ValueError as e:
            print(path.name, "SKIP:", e)
            continue
        if new != text:
            path.write_text(new, encoding="utf-8")
            print("OK", path.name)
        else:
            print("—", path.name, "(sem mudança)")


if __name__ == "__main__":
    main()
