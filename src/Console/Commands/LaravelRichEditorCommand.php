<?php

declare(strict_types=1);

namespace LaravelRichEditor\LaravelRichEditor\Console\Commands;

use Illuminate\Console\Command;

class LaravelRichEditorCommand extends Command
{
    /**
     * The command signature.
     */
    protected $signature = 'laravel-rich-editor:placeholder';

    /**
     * The command description.
     */
    protected $description = 'Placeholder Artisan command shipped by the package laravel-rich-editor.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->line('LaravelRichEditor placeholder command executed.');

        return self::SUCCESS;
    }
}
