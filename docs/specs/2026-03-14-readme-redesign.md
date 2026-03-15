# README Redesign — Design Spec
Date: 2026-03-14

## Goal

Rewrite the OSS README to be product-first (PostHog/Cal.com style): lead with value proposition and screenshot before technical setup. Target audience is a developer landing on the GitHub repo for the first time.

## Structure

1. **Hero** — name, one-line tagline, badge row (license), screenshot placeholder
2. **Feature highlights** — 5-6 bullets: self-hostable, no auth, multi-DB, embeddable, open source
3. **Quick Start (Docker)** — primary path, prominent
4. **Supported Databases** — brief list
5. **Configuration** — env var table
6. **Local Development** — contributor setup
7. **Embedding** — `@openflow/core` frontend + backend
8. **License** — short line

## Tone

Punchy headline, brief feature list, then clean technical content. No marketing fluff.

## Changes from Current README

- Add hero section with tagline + screenshot placeholder
- Add feature bullet list
- Reorder: value prop → quick start → rest
- Add license section (currently missing)
- Minor copy tightening
