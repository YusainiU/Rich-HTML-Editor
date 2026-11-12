<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Tests;

use LaravelRichEditor\LaravelRichEditor\LaravelRichEditorServiceProvider;
use Livewire\LivewireServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [
            LivewireServiceProvider::class,
            LaravelRichEditorServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set(
            'app.key',
            'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        );

        $app['config']->set('app.cipher', 'AES-256-CBC');
    }
}
