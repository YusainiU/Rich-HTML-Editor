<div align="center">
    <h1>Laravel Rich Editor</h1>
</div>

<p align="center">
    <a href="https://packagist.org/packages/simply-digital/laravel-rich-editor"><img src="https://img.shields.io/packagist/v/simply-digital/laravel-rich-editor.svg?style=flat-square" alt="Packagist"></a>
    <a href="https://packagist.org/packages/simply-digital/laravel-rich-editor"><img src="https://img.shields.io/packagist/php-v/simply-digital/laravel-rich-editor.svg?style=flat-square" alt="PHP from Packagist"></a>
    <a href="https://packagist.org/packages/simply-digital/laravel-rich-editor"><img src="https://badge.laravel.cloud/badge/simply-digital/laravel-rich-editor?style=flat" alt="Laravel versions"></a>
    <a href="https://github.com/simply-digital/laravel-rich-editor/actions"><img alt="GitHub Workflow Status (main)" src="https://img.shields.io/github/actions/workflow/status/simply-digital/laravel-rich-editor/tests.yml?branch=main&label=Tests&style=flat-square"></a>
    <a href="https://packagist.org/packages/simply-digital/laravel-rich-editor"><img src="https://img.shields.io/packagist/dt/simply-digital/laravel-rich-editor.svg?style=flat-square" alt="Total Downloads"></a>
</p>

Laravel HTML rich editor

## Installation

You can install the package via Composer:

```bash
composer require simply-digital/laravel-rich-editor
```

You may publish all of the package's resources at once:

```bash
php artisan vendor:publish --tag="laravel-rich-editor"
```

Or, you may publish each resource individually:

### Publishing the Configuration File

```bash
php artisan vendor:publish --tag="laravel-rich-editor-config"
```

### Publishing and Running the Migrations

```bash
php artisan vendor:publish --tag="laravel-rich-editor-migrations"
php artisan migrate
```

### Publishing the Views

```bash
php artisan vendor:publish --tag="laravel-rich-editor-views"
```

### Publishing the Translations

```bash
php artisan vendor:publish --tag="laravel-rich-editor-lang"
```

### Publishing the Public Assets

```bash
php artisan vendor:publish --tag="laravel-rich-editor-assets"
```

## Usage

<!-- Add a basic usage example here. -->

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Thank you for considering contributing to Laravel Rich Editor! Please review our [contributing guide](.github/CONTRIBUTING.md) to get started.

## Security Vulnerabilities

Please review [our security policy](.github/SECURITY.md) on how to report security vulnerabilities.

## Credits

- [Yusaini Usulludin](https://github.com/simply-digital)
- [All Contributors](../../contributors)

## License

Laravel Rich Editor is open-sourced software licensed under the [MIT license](LICENSE.md).
