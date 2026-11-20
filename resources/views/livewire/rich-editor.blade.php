@assets
    <link rel="stylesheet" href="{{ asset('vendor/laravel-rich-editor/css/rich-editor.css') }}">
    <script src="{{ asset('vendor/laravel-rich-editor/js/rich-editor.js') }}" defer></script>
@endassets

<div class="lre" data-rich-editor x-data="{
    html: $wire.entangle('value'),
    update(event) {
        this.html = event.detail.html;
    }
}" x-on:rich-editor:change="update($event)">

    <div class="lre-toolbar" role="toolbar" aria-label="Text formatting">
        <div class="lre-toolbar-group" role="group" aria-label="History">
            <button type="button" data-rich-editor-history="undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>
                ↶
            </button>
            <button type="button" data-rich-editor-history="redo" aria-label="Redo" title="Redo (Ctrl+Shift+Z)"
                disabled>
                ↷
            </button>
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Text formatting">
            <button type="button" data-rich-editor-command="bold" aria-label="Bold" title="Bold">
                <strong>B</strong>
            </button>
            <button type="button" data-rich-editor-command="italic" aria-label="Italic" title="Italic">
                <em>I</em>
            </button>
            <button type="button" data-rich-editor-command="underline" aria-label="Underline" title="Underline">
                <u>U</u>
            </button>
            <button type="button" data-rich-editor-command="strike" aria-label="Strikethrough" title="Strikethrough">
                <s>S</s>
            </button>
            <label class="lre-toolbar-label">
                <span class="sr-only">Text style</span>
                <select data-rich-editor-block-style aria-label="Text style" title="Text style">
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>
            </label>
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Lists">
            <button type="button" data-rich-editor-command="unordered-list" aria-label="Bulleted list"
                title="Bulleted list">
                • List
            </button>
            <button type="button" data-rich-editor-command="ordered-list" aria-label="Numbered list"
                title="Numbered list">
                1. List
            </button>
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Links and text colour">
            <button type="button" data-rich-editor-command="link" aria-label="Insert or edit link"
                title="Insert or edit link">
                Link
            </button>
            <button type="button" data-rich-editor-command="unlink" aria-label="Remove link" title="Remove link">
                Unlink
            </button>
            <label class="lre-toolbar-label">
                <span class="sr-only">Text colour</span>
                <input type="color" data-rich-editor-text-color value="#2563eb" aria-label="Text colour"
                    title="Text colour">
            </label>
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Insert content">
            <button type="button" data-rich-editor-command="insert-table" aria-label="Insert table"
                title="Insert table">
                Table
            </button>
            @if ($showImageTools)
            <button type="button" data-rich-editor-command="insert-image" aria-label="Insert image"
                title="Insert image from URL">
                Image
            </button>
            <input class="lre-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                data-rich-editor-image-upload tabindex="-1">
            <button type="button" data-rich-editor-upload-button title="Upload image" aria-label="Upload image">
                Upload image
            </button>
            @endif
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Table editing">
            <button type="button" data-rich-editor-table-action="row-above" aria-label="Insert row above"
                title="Insert row above">Row ↑</button>
            <button type="button" data-rich-editor-table-action="row-below" aria-label="Insert row below"
                title="Insert row below">Row ↓</button>
            <button type="button" data-rich-editor-table-action="column-left" aria-label="Insert column left"
                title="Insert column left">Col ←</button>
            <button type="button" data-rich-editor-table-action="column-right" aria-label="Insert column right"
                title="Insert column right">Col →</button>
            <button type="button" data-rich-editor-table-action="delete-row" aria-label="Delete selected row"
                title="Delete selected row">Del row</button>
            <button type="button" data-rich-editor-table-action="delete-column" aria-label="Delete selected column"
                title="Delete selected column">Del col</button>
            <button type="button" data-rich-editor-table-action="delete-table" aria-label="Delete selected table"
                title="Delete selected table">Del table</button>
        </div>

        <div class="lre-toolbar-group" role="group" aria-label="Source">
            <button type="button" data-rich-editor-source-toggle aria-label="Toggle HTML source mode"
                aria-pressed="false" title="Toggle HTML source mode">
                &lt;/&gt; HTML
            </button>
            <button type="button" class="lre-toolbar-button" data-rich-editor-clear-formatting
                title="Remove all HTML formatting and keep the text" aria-label="Remove HTML formatting">
                Clear HTML
            </button>
        </div>
    </div>

    <div wire:ignore>

        <textarea data-rich-editor-initial-value hidden>{{ $value }}</textarea>

        <div class="lre-surface" data-rich-editor-surface contenteditable="true" role="textbox"
            aria-label="Rich text editor" aria-multiline="true" data-placeholder="{{ $placeholder }}"
            style="min-height: {{ $minHeight }}px;"></div>

        <textarea class="lre-source" data-rich-editor-source aria-label="HTML source code" spellcheck="false" hidden
            wire:ignore></textarea>

    </div>

    @if ($showWordCount)
        <div class="lre-footer">
            Words:
            <span data-rich-editor-word-count>0</span>
        </div>
    @endif

</div>
