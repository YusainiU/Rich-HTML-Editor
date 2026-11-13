# Laravel Rich Editor

A lightweight rich-text editor for **Laravel and Livewire** applications, built with vanilla JavaScript and CSS. Bind the editor's HTML to your Livewire component using `wire:model`, then validate and save it using your application's own models and tables.

**Composer package:** `simply-digital/laravel-rich-editor`

> The editor provides an HTML value; it does **not** create a database table, model, API endpoint, or persistence layer for your application.

## Requirements

- PHP **8.3** or newer
- Laravel **12 or 13**
- Livewire **4.4** or newer
- Composer
- A configured Laravel filesystem disk for uploaded images (the default is `public`)

The editor uses vanilla JavaScript and CSS; a separate frontend framework is not required.

## Installation

### 1. Install the package

> Read the **HOWTO document**. It will give you a step-by-step guide on how to install the package.

Make sure Livewire is installed and configured in the host application. If it is not already installed:

```bash
composer require livewire/livewire:^4.4
```

### 2. Publish the editor assets

```bash
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
```

This publishes the editor's JavaScript and CSS assets to your application's public directory. Ensure that your application layout loads the published editor assets according to the package's registered asset paths. If your package's Blade view already loads them, do not include them a second time.

After updating the package, republish the assets and refresh the browser cache:

```bash
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
php artisan view:clear
```

### 3. Enable public image access

By default, the editor stores images on Laravel's `public` filesystem disk, inside the `rich-editor` directory.

Create the public storage symlink:

```bash
php artisan storage:link
```

Confirm that your application's `.env` contains the correct public URL, for example:

```dotenv
APP_URL=http://127.0.0.1:8000
```

Use your actual application URL in development and production. If you change environment or filesystem configuration, run:

```bash
php artisan config:clear
```

> For a standard Laravel application, the public storage link usually maps `public/storage` to `storage/app/public`. If you use a custom application skeleton or Testbench Workbench, the relevant paths can differ.

## Quick start: bind the editor to Livewire

The editor exposes its HTML through a modelable Livewire property. In your application, bind it to a parent component property:

```blade
<livewire:rich-editor wire:model="content" />
```

`content` is a property on **your** Livewire component. The editor does not decide how it is stored.

> This example assumes the package registers its component under the alias `rich-editor`. If your installed package uses a different alias, use the alias registered by its service provider.

## Tutorial: create a post

The following example assumes your application already has an `App\Models\Post` model and a `posts` table with a `body` column. If your application uses different names, substitute your own model and column.

### 1. Create a Livewire form component

```bash
php artisan make:livewire PostForm
```

In `app/Livewire/PostForm.php`:

```php
<?php

namespace App\Livewire;

use App\Models\Post;
use Livewire\Component;

class PostForm extends Component
{
    public string $content = '';

    public function save(): void
    {
        $validated = $this->validate([
            'content' => ['required', 'string'],
        ]);

        Post::create([
            'body' => $validated['content'],
        ]);

        session()->flash('status', 'Post saved successfully.');
    }

    public function render()
    {
        return view('livewire.post-form');
    }
}
```

**Important:** Configure the `Post` model's mass-assignment rules for the `body` attribute, or use your application's preferred persistence approach. Authorize writes as appropriate for your application. For production use, validate and sanitize HTML on the server before storing or rendering it.

### 2. Add the Blade form

In `resources/views/livewire/post-form.blade.php`:

```blade
<div>
    <form wire:submit="save">
        <label for="post-body">Content</label>

        <livewire:rich-editor wire:model="content" />

        @error('content')
            <p role="alert">{{ $message }}</p>
        @enderror

        <button type="submit">Save post</button>
    </form>

    @if (session('status'))
        <p role="status">{{ session('status') }}</p>
    @endif
</div>
```

The editor updates `$content` with HTML. When the user submits the form, the parent component validates and stores that HTML in its own table.

### 3. Display the form

Render your Livewire form from a page:

```blade
<livewire:post-form />
```

No editor-specific database migration or API endpoint is needed.

## Tutorial: edit an existing post

To edit an existing record, initialize the parent component property from the database and bind it to the editor.

```php
<?php

namespace App\Livewire;

use App\Models\Post;
use Livewire\Component;

class EditPost extends Component
{
    public Post $post;

    public string $content = '';

    public function mount(Post $post): void
    {
        $this->post = $post;
        $this->content = (string) $post->body;
    }

    public function save(): void
    {
        $validated = $this->validate([
            'content' => ['required', 'string'],
        ]);

        // Apply your application's authorization and HTML sanitization here.
        $this->post->update([
            'body' => $validated['content'],
        ]);

        session()->flash('status', 'Post updated successfully.');
    }

    public function render()
    {
        return view('livewire.edit-post');
    }
}
```

In `resources/views/livewire/edit-post.blade.php`:

```blade
<div>
    <form wire:submit="save">
        <livewire:rich-editor wire:model="content" />

        @error('content')
            <p role="alert">{{ $message }}</p>
        @enderror

        <button type="submit">Update post</button>
    </form>

    @if (session('status'))
        <p role="status">{{ session('status') }}</p>
    @endif
</div>
```

## Rendering saved HTML

Blade escapes output with `{{ ... }}`. To display rich-text formatting, use the unescaped Blade syntax **only for HTML you have sanitized and trust**:

```blade
<div class="prose">
    {!! $post->body !!}
</div>
```

**Security:** Rich-text HTML is user-controlled input. Sanitize it server-side using an appropriate allowlist-based HTML sanitizer before saving or rendering. Do not rely solely on the editor's client-side controls to prevent cross-site scripting (XSS). Also apply your application's authentication, authorization, and file-upload policies.

## Image uploads

The editor supports selecting and uploading images using Livewire's temporary-upload mechanism. After the upload completes, the editor receives a URL and inserts an `<img>` element into the HTML.

Current upload behavior:

- Supported formats: **JPEG, PNG, WebP, GIF**
- Maximum file size: **5 MB**
- Default filesystem disk: **`public`**
- Default storage directory: **`rich-editor`**

Uploaded files are separate from the HTML saved by the consuming application. The HTML contains image references; it does not embed the binary image data.

The host application is responsible for storage configuration, access permissions, backups, and any image cleanup or retention policy. Removing an image from editor content does not automatically imply that the file is deleted from storage.

### Configure image storage

The package's configuration file is `config/laravel-rich-editor.php`. The image disk and directory are configured under its `images` settings. If your package release registers a configuration publish tag, publish the config using that tag, then set the disk and directory for your application.

For the default `public` disk, ensure that the public storage symlink exists and that image URLs resolve to your application's domain and port. For remote disks, such as S3, configure the disk's URL and permissions appropriately.

## Appearance and themes

The editor follows the user's system light or dark preference by default. To match an application theme that is controlled separately, place the editor inside an ancestor with a `.dark` class or `data-theme="dark"` attribute. Use `.light` or `data-theme="light"` to force the light appearance.

The editor's text, toolbar controls, editing surface, source mode, tables, and focus indicators adapt with the theme. If you have published the assets, republish them after updating the package:

```bash
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
```

## Public integration contract

The intended Laravel/Livewire API is deliberately small:

| Feature | How to use it |
| --- | --- |
| Bind editor HTML | `<livewire:rich-editor wire:model="content" />` |
| Read content | Access `$this->content` in the parent Livewire component |
| Set initial content | Assign HTML to `$content` before rendering the editor |
| Validate content | Use the parent component's `$this->validate(...)` |
| Save content | Use your application's own model, service, or repository |
| Display content | Render sanitized HTML in your application's view |

There is no requirement to call a JavaScript API or to use a package-provided database table.

## Troubleshooting

### The upload button opens the file picker, but the upload fails

Verify that Livewire is loaded and that the editor's published JavaScript matches the installed package version. Republish the assets:

```bash
php artisan vendor:publish --tag=laravel-rich-editor-assets --force
```

Hard-refresh the browser and inspect the browser console and Laravel logs for the specific error.

### The image uploads but shows a broken-image icon

Inspect the generated `<img src="...">`. Make sure the image URL points to the same application host and port that serves your site, or uses a valid root-relative path for local public storage.

For example, an application running at `http://127.0.0.1:8000` will not normally serve files at `http://localhost/storage/...` (port 80).

Check the public storage link:

```bash
php artisan storage:link
```

Open the image URL directly in a new browser tab. A 404 generally indicates a URL or public-storage-path problem.

### The editor styles or buttons are missing

Republish the assets and confirm that the editor's CSS and JavaScript are loaded exactly once. Check the browser Network panel for missing asset requests.

### The parent Livewire property is not updating

Confirm that the parent component declares a public string property and that the editor is bound with the correct name:

```php
public string $content = '';
```

```blade
<livewire:rich-editor wire:model="content" />
```

Also confirm that the package's Livewire component declares its editor value as modelable.

## Local package development

If you are developing the package itself with Orchestra Testbench:

```bash
composer serve
```

Run the project's test suite:

```bash
composer test
```

To republish the editor assets into the Testbench application:

```bash
php vendor/bin/testbench vendor:publish --tag=laravel-rich-editor-assets --force
php vendor/bin/testbench view:clear
```

**Note:** Testbench may use paths under `vendor/orchestra/testbench-core/laravel` for `public_path()` and `storage_path()`. Do not assume those paths match a normal Laravel application's `public` and `storage` directories. Use Tinker or the application's runtime configuration to inspect the active paths when troubleshooting.

## Design philosophy

Laravel Rich Editor focuses on editing and returning HTML. The host Laravel application remains in control of its data model, migrations, authorization, validation, sanitization, storage policies, and presentation.

## License

See the package's `LICENSE` file for its applicable license.
