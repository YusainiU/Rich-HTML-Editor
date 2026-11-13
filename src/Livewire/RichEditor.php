<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Livewire;

use Illuminate\Contracts\View\View;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
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

    public function mount(
        ?string $value = null,
        ?string $placeholder = null,
        ?int $minHeight = null,
        ?bool $showWordCount = null,
    ): void {
        $this->value = $value ?? '';

        $this->placeholder = $placeholder
            ?? (string) config('laravel-rich-editor.editor.placeholder', 'Start writing...');

        $this->minHeight = max(
            120,
            $minHeight ?? (int) config('laravel-rich-editor.editor.min_height', 240),
        );

        $this->showWordCount = $showWordCount
            ?? (bool) config('laravel-rich-editor.editor.show_word_count', true);
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

        $disk = config('laravel-rich-editor.images.disk', 'public');

        $directory = config(
            'laravel-rich-editor.images.directory',
            'rich-editor',
        );

        if (! \is_string($disk) || ! \is_string($directory)) {
            throw new RuntimeException(
                'Invalid Rich Editor image storage configuration.',
            );
        }

        $directory = trim($directory, '/');

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
            if($disk === 'public'){
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
