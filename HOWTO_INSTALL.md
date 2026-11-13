# Rich HTML Editor — Local Package Installation

This guide explains how to clone the [Rich HTML Editor](https://github.com/YusainiU/Rich-HTML-Editor) package into a Laravel application's local `packages` directory under the **Simplydigital** namespace and install it using Composer.

## Step 1: Create the packages directory

From the Laravel project root, run:

```bash
mkdir -p packages/Simplydigital
```

## Step 2: Clone the GitHub repository

```bash
git clone https://github.com/YusainiU/Rich-HTML-Editor.git packages/Simplydigital/Rich-HTML-Editor
```

Your project structure should look like:

```text
laravel-project/
├── app/
├── bootstrap/
├── config/
├── packages/
│   └── Simplydigital/
│       └── Rich-HTML-Editor/
│           ├── composer.json
│           └── ...
├── vendor/
├── composer.json
└── artisan
```

## Step 3: Update the package's composer.json

Open:

```text
packages/Simplydigital/Rich-HTML-Editor/composer.json
```

Update the package's `name` property to:

```json
"name": "simplydigital/rich-html-editor"
```

Keep the existing package dependencies, autoload settings, service providers, and other configuration unchanged.

## Step 4: Register the local package in Laravel's composer.json

Open your Laravel application's root `composer.json` and add the following top-level configuration:

```json
"repositories": [
    {
        "type": "path",
        "url": "packages/Simplydigital/Rich-HTML-Editor",
        "options": {
            "symlink": true
        }
    }
]
```

This tells Composer to load Rich HTML Editor from your local directory.

The `symlink` option ensures that changes to the local package source are reflected in the installed package.

## Step 5: Check the package's Git branch

Navigate into the package directory:

```bash
cd packages/Simplydigital/Rich-HTML-Editor
```

Check the current branch:

```bash
git branch --show-current
```

If the branch is `main`, its Composer development version is typically `dev-main`.

If the branch is `master`, use `dev-master`.

Return to the Laravel project root:

```bash
cd ../../..
```

## Step 6: Install the package using Composer

Assuming the package uses the `main` branch, run:

```bash
composer require simplydigital/rich-html-editor:"dev-main"
```

Composer will register the package as a project dependency, resolve its dependencies, and create a symlink in your `vendor` directory.

Your Laravel project's `composer.json` will now include:

```json
"require": {
    "simplydigital/rich-html-editor": "dev-main"
}
```

This is the new entry; keep all existing dependencies in the `require` section.

## Step 7: Verify the installation

Run:

```bash
composer show simplydigital/rich-html-editor
```

Check the symlink:

```bash
ls -la vendor/simplydigital/
```

The installed package should point to:

```text
packages/Simplydigital/Rich-HTML-Editor
```

## Step 8: Refresh Laravel

If the package supports Laravel service provider auto-discovery, run:

```bash
php artisan package:discover
```

Clear Laravel's caches:

```bash
php artisan optimize:clear
```

If you change the package's Composer autoload configuration, regenerate the autoloader:

```bash
composer dump-autoload
```

## Step 9: Modify the package locally

You can now edit the Rich HTML Editor source code inside:

```text
packages/Simplydigital/Rich-HTML-Editor/
```

Because the package uses a Composer path repository with symbolic linking, changes to its PHP source files are available directly to the Laravel application.

## Step 10: Git and deployment considerations

The cloned package contains its own Git repository. Decide whether to maintain it independently, use a Git submodule, or commit its source directly into the Laravel project.

When deploying, ensure that `packages/Simplydigital/Rich-HTML-Editor` is present before running `composer install`.

---

## Quick installation reference

**1. Create directory and clone repository**

```bash
mkdir -p packages/Simplydigital

git clone https://github.com/YusainiU/Rich-HTML-Editor.git packages/Simplydigital/Rich-HTML-Editor
```

**2. Change the package's Composer name**

In `packages/Simplydigital/Rich-HTML-Editor/composer.json`:

```json
"name": "simplydigital/rich-html-editor"
```

**3. Add the path repository to the root composer.json**

```json
"repositories": [
    {
        "type": "path",
        "url": "packages/Simplydigital/Rich-HTML-Editor",
        "options": {
            "symlink": true
        }
    }
]
```

**4. Install the package**

```bash
composer require simplydigital/rich-html-editor:"dev-main"
```

Use `dev-master` instead if the package's branch is `master`.

**5. Refresh and verify**

```bash
composer dump-autoload
php artisan package:discover
php artisan optimize:clear
composer show simplydigital/rich-html-editor
```

The Rich HTML Editor package is now configured as a local Composer dependency under the **Simplydigital** namespace.