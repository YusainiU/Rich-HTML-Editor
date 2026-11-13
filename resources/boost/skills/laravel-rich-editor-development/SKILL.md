---
name: laravel-rich-editor-development
description: >
  Configure and apply the Laravel Rich Editor package in Laravel applications.
license: MIT
metadata:
  author: Yusaini Usulludin
---

# Laravel Rich Editor

Use this skill when a Laravel application needs to integrate the Laravel Rich Editor package.

## Primary Goal

- apply the `simply-digital/laravel-rich-editor` package's public API in the smallest correct way

## Workflow

### 1. Install and load the package

- Follow the installation and asset-publishing steps in the package README.
- Confirm Livewire is installed and the published JavaScript and CSS assets load once.

### 2. Bind editor content in Livewire

- Mount the package's Livewire editor in the form and bind it to a public string property with `wire:model`.
- Keep validation, authorization, HTML sanitization, and persistence in the host application.

### 3. Match the host theme

- The editor follows the system light/dark preference by default.
- For an app-controlled theme, wrap it in `.dark` or `data-theme="dark"` to force dark mode; use `.light` or `data-theme="light"` to force light mode.

## References

- Read the package README for installation, Livewire binding, image storage, and HTML-sanitization guidance.

## Anti-patterns

- Do not assume the editor sanitizes HTML or persists content for the host application.
- Do not load the published editor assets twice.
