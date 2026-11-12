<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \LaravelRichEditor\LaravelRichEditor\LaravelRichEditor
 */
class LaravelRichEditor extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \LaravelRichEditor\LaravelRichEditor\LaravelRichEditor::class;
    }
}
