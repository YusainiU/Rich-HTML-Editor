<?php

declare(strict_types=1);

use LaravelRichEditor\LaravelRichEditor\LaravelRichEditor;

it('resolves the singleton', function () {
    expect(app(LaravelRichEditor::class))->toBeInstanceOf(LaravelRichEditor::class);
});

it('returns the same instance from the container', function () {
    expect(app(LaravelRichEditor::class))->toBe(app(LaravelRichEditor::class));
});

it('merges the package config', function () {
    expect(config('laravel-rich-editor.placeholder'))->toBe('default');
});

it('loads the package translations', function () {
    expect(trans('laravel-rich-editor::messages.placeholder'))->toBe('LaravelRichEditor placeholder translation.');
});

it('loads the package views', function () {
    expect(view()->exists('laravel-rich-editor::placeholder'))->toBeTrue();
});

it('registers the artisan command', function () {
    $this->artisan('laravel-rich-editor:placeholder')
        ->expectsOutputToContain('LaravelRichEditor placeholder command executed.')
        ->assertSuccessful();
});
