<?php

declare(strict_types=1);

use LaravelRichEditor\LaravelRichEditor\Livewire\RichEditor;
use Livewire\Livewire;

it('renders the rich editor component', function () {
    Livewire::test(RichEditor::class)
        ->assertStatus(200)
        ->assertSee('contenteditable="true"', escape: false);
});

it('uses the configured placeholder', function () {
    Livewire::test(RichEditor::class)
        ->assertSee('Start writing...');
});

it('accepts a custom placeholder', function () {
    Livewire::test(RichEditor::class, [
        'placeholder' => 'Write your article...',
    ])->assertSee('Write your article...');
});

it('accepts initial HTML content', function () {
    Livewire::test(RichEditor::class, [
        'value' => '<p>Hello world</p>',
    ])->assertSet('value', '<p>Hello world</p>');
});

it('allows the word count footer to be disabled', function () {
    Livewire::test(RichEditor::class, [
        'showWordCount' => false,
    ])->assertDontSee('Word count will appear here.');
});
