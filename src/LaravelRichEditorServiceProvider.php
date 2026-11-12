<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor;

use Illuminate\Support\ServiceProvider;
use LaravelRichEditor\LaravelRichEditor\Console\Commands\LaravelRichEditorCommand;
use LaravelRichEditor\LaravelRichEditor\Livewire\RichEditor;
use Livewire\Livewire;

class LaravelRichEditorServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../config/laravel-rich-editor.php',
            'laravel-rich-editor',
        );

        $this->app->singleton(LaravelRichEditor::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->booted(function (): void {
            Livewire::component('laravel-rich-editor', RichEditor::class);
        });

        $this->loadRoutesFrom(__DIR__.'/../routes/laravel-rich-editor.php');

        $this->loadViewsFrom(__DIR__.'/../resources/views', 'laravel-rich-editor');

        $this->loadTranslationsFrom(__DIR__.'/../lang', 'laravel-rich-editor');

        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            __DIR__.'/../config/laravel-rich-editor.php' => config_path('laravel-rich-editor.php'),
        ], ['laravel-rich-editor', 'laravel-rich-editor-config']);

        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/laravel-rich-editor'),
        ], ['laravel-rich-editor', 'laravel-rich-editor-views']);

        $this->publishes([
            __DIR__.'/../lang' => $this->app->langPath('vendor/laravel-rich-editor'),
        ], ['laravel-rich-editor', 'laravel-rich-editor-lang']);

        $this->publishes([
            __DIR__.'/../public' => public_path('vendor/laravel-rich-editor'),
        ], ['laravel-rich-editor', 'laravel-rich-editor-assets']);

        $this->publishesMigrations([
            __DIR__.'/../database/migrations' => database_path('migrations'),
        ], ['laravel-rich-editor', 'laravel-rich-editor-migrations']);

        $this->commands([
            LaravelRichEditorCommand::class,
        ]);
    }
}
