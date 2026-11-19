# Installing Laravel Rich Editor

**Package:** `simply-digital/laravel-rich-editor`

## Public installation (Packagist)

Once a release has been published and the package is registered on [Packagist](https://packagist.org/), install it in a Laravel 12/13 application with Livewire 4.4 or newer:

```bash
composer require simply-digital/laravel-rich-editor
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
php artisan storage:link
```

Bind the editor to a public property in a parent Livewire component:

```blade
<livewire:laravel-rich-editor wire:model="contentHtml" />
```

For an existing record, initialize the parent's `$contentHtml` property from the saved HTML before rendering the editor. The parent application owns validation, authorization, server-side HTML sanitization, and persistence.

After upgrading the package, republish assets and hard-refresh your browser:

```bash
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
php artisan view:clear
```

See [README.md](README.md) for configuration, image uploads, and usage examples.

## Install from GitHub before the first Packagist release

Add this repository as a VCS source in your Laravel application's `composer.json`:

```json
"repositories": [
    {
        "type": "vcs",
        "url": "https://github.com/YusainiU/Rich-HTML-Editor"
    }
]
```

Then install the main development branch:

```bash
composer require simply-digital/laravel-rich-editor:"dev-main"
```

A development branch is not a stable release. Remove the custom VCS repository once the package is available on Packagist and update the requirement to a tagged version.

## Local package development

Clone the repository into your application's local packages directory:

```bash
mkdir -p packages
git clone https://github.com/YusainiU/Rich-HTML-Editor.git packages/Rich-HTML-Editor
```

Add a path repository to the consuming application's `composer.json`:

```json
"repositories": [
    {
        "type": "path",
        "url": "packages/Rich-HTML-Editor",
        "options": { "symlink": true }
    }
]
```

Then require the package without changing the package's own `composer.json`:

```bash
composer require simply-digital/laravel-rich-editor:"dev-main"
```

If the local clone is on another branch, use the corresponding Composer development version. Commit your changes to the package repository separately from the consuming Laravel application.
