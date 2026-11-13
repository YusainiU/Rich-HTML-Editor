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

        <button type="button" data-rich-editor-history="undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled>
            ↶
        </button>

        <button type="button" data-rich-editor-history="redo" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled>
            ↷
        </button>

        <span class="lre-toolbar-divider" aria-hidden="true"></span>

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

        <span class="lre-toolbar-divider" aria-hidden="true"></span>

        <label class="lre-toolbar-label">
            <span class="sr-only">Text style</span>

            <select data-rich-editor-block-style aria-label="Text style" title="Text style">
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
            </select>
        </label>

        <button type="button" data-rich-editor-command="unordered-list" aria-label="Bulleted list"
            title="Bulleted list">
            • List
        </button>

        <button type="button" data-rich-editor-command="ordered-list" aria-label="Numbered list" title="Numbered list">
            1. List
        </button>

        <span class="lre-toolbar-divider" aria-hidden="true"></span>

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

        <span class="lre-toolbar-divider" aria-hidden="true"></span>

        <button type="button" data-rich-editor-command="insert-table" aria-label="Insert table" title="Insert table">
            Table
        </button>

        <button type="button" data-rich-editor-command="insert-image" aria-label="Insert image"
            title="Insert image from URL">
            Image
        </button>

        <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp,image/gif" 
            data-rich-editor-image-upload  
            style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden;"
        >

        <button type="button" data-rich-editor-upload-button title="Upload image" aria-label="Upload image">
            Upload Image
        </button>

        <button type="button" data-rich-editor-table-action="row-above" title="Insert row above">
            Row ↑
        </button>

        <button type="button" data-rich-editor-table-action="row-below" title="Insert row below">
            Row ↓
        </button>

        <button type="button" data-rich-editor-table-action="column-left" title="Insert column left">
            Col ←
        </button>

        <button type="button" data-rich-editor-table-action="column-right" title="Insert column right">
            Col →
        </button>

        <button type="button" data-rich-editor-table-action="delete-row" title="Delete selected row">
            Del Row
        </button>

        <button type="button" data-rich-editor-table-action="delete-column" title="Delete selected column">
            Del Col
        </button>

        <button type="button" data-rich-editor-table-action="delete-table" title="Delete selected table">
            Del Table
        </button>

        <button type="button" data-rich-editor-source-toggle aria-label="Toggle HTML source mode"
            aria-pressed="false" title="Toggle HTML source mode">
            &lt;/&gt; HTML
        </button>

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
