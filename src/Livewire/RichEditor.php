<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Livewire;

use Illuminate\Contracts\View\View;
use Livewire\Attributes\Modelable;
use Livewire\Component;

class RichEditor extends Component
{
    #[Modelable]
    public string $value = '';

    public string $placeholder = '';

    public int $minHeight = 240;

    public bool $showWordCount = true;

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

    public function render(): View
    {
        /** @var view-string $view */
        $view = 'laravel-rich-editor::livewire.rich-editor';

        return view($view);
    }
}
