
<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Livewire;

use Illuminate\Contracts\View\View;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Modelable;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use RuntimeException;

class RichEditor extends Component
{
    use WithFileUploads;

    #[Modelable]
    public string $value = '';

    public string $placeholder = '';

    public int $minHeight = 240;

    public bool $showWordCount = true;

    public ?TemporaryUploadedFile $imageUpload = null;

    #[Locked]
    public string $imageDirectory = '';

    public function mount(
        ?string $value = null,
        ?string $placeholder = null,
        ?int $minHeight = null,
        ?bool $showWordCount = null,
        ?string $imageDirectory = null,
    ): void {
        $this->value = $value ?? '';

        $this->placeholder = $placeholder
            ?? (string) config(
                'laravel-rich-editor.editor.placeholder',
                'Start writing...',
            );

        $this->minHeight = max(
            120,
            $minHeight ?? (int) config(
                'laravel-rich-editor.editor.min_height',
                240,
            ),
        );

        $this->showWordCount = $showWordCount
            ?? (bool) config(
                'laravel-rich-editor.editor.show_word_count',
                true,
            );

        $this->imageDirectory = $imageDirectory
            ?? (string) config(
                'laravel-rich-editor.images.directory',
                'rich-editor',
            );
    }

    public function uploadEditorImage(): ?string
    {
        $this->validate([
            'imageUpload' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp,gif',
                'max:5120',
            ],
        ]);

        $disk = config(
            'laravel-rich-editor.images.disk',
            'public',
        );

        if (! \is_string($disk) || $disk === '') {
            throw new RuntimeException(
                'Invalid Rich Editor image storage disk.',
            );
        }

        $directory = trim($this->imageDirectory, '/');

        if ($directory === '') {
            throw ValidationException::withMessages([
                'imageDirectory' => 'The image directory cannot be empty.',
            ]);
        }

        foreach (explode('/', $directory) as $segment) {
            if (
                $segment === ''
                || ! preg_match('/^[a-zA-Z0-9_-]+$/D', $segment)
            ) {
                throw ValidationException::withMessages([
                    'imageDirectory' => 'The image directory is invalid.',
                ]);
            }
        }

        try {
            $path = $this->imageUpload->storePublicly(
                $directory,
                $disk,
            );

            if (! $path) {
                throw new RuntimeException(
                    'The image could not be stored.',
                );
            }

            /** @var FilesystemAdapter $filesystem */
            $filesystem = Storage::disk($disk);

            $url = $filesystem->url($path);

            // Use a root-relative URL for the local public disk.
            // This avoids incorrect APP_URL hostnames in development.
            if (
                $disk === 'public'
                && config('filesystems.disks.public.driver') === 'local'
            ) {
                $url = parse_url($url, PHP_URL_PATH) ?: $url;
            }

            return $url;
        } finally {
            $this->reset('imageUpload');
        }
    }

    public function render(): View
    {
        /** @var view-string $view */
        $view = 'laravel-rich-editor::livewire.rich-editor';

        return view($view);
    }
}
