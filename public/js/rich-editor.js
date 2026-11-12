(function () {
    
    "use strict";

    const INLINE_FORMATS = {
        bold: "strong",
        italic: "em",
        underline: "u",
        strike: "s",
    };

    const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "DIV", "LI"]);

    const BLOCK_STYLES = new Set(["p", "h1", "h2", "h3"]);

    function normalizeLinkUrl(value) {
        const input = value.trim();

        if (input === "") {
            return null;
        }

        // Permit document-relative and fragment links.
        if (input.startsWith("/") && !input.startsWith("//")) {
            return input;
        }

        if (input.startsWith("#")) {
            return input;
        }

        // Only allow explicitly supported URL schemes.
        try {
            const url = new URL(input);

            if (
                url.protocol === "https:" ||
                url.protocol === "http:" ||
                url.protocol === "mailto:"
            ) {
                return url.href;
            }
        } catch {
            return null;
        }

        return null;
    }

    const HISTORY_LIMIT = 100;
    const TYPING_GROUP_DELAY = 700;

    function nodePath(root, node) {
        const path = [];
        let current = node;

        while (current && current !== root) {
            const parent = current.parentNode;

            if (!parent) {
                return null;
            }

            path.unshift(
                Array.prototype.indexOf.call(parent.childNodes, current),
            );

            current = parent;
        }

        return current === root ? path : null;
    }

    function nodeFromPath(root, path) {
        if (!Array.isArray(path)) {
            return null;
        }

        let current = root;

        for (const index of path) {
            current = current.childNodes[index];

            if (!current) {
                return null;
            }
        }

        return current;
    }

    function captureSelection(surface) {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);

        if (
            !surface.contains(range.startContainer) ||
            !surface.contains(range.endContainer)
        ) {
            return null;
        }

        return {
            startPath: nodePath(surface, range.startContainer),
            startOffset: range.startOffset,
            endPath: nodePath(surface, range.endContainer),
            endOffset: range.endOffset,
        };
    }

    function restoreSelection(surface, saved) {
        if (!saved) {
            return;
        }

        const startNode = nodeFromPath(surface, saved.startPath);

        const endNode = nodeFromPath(surface, saved.endPath);

        if (!startNode || !endNode) {
            const selection = window.getSelection();

            if (!selection) {
                return;
            }

            const fallbackRange = document.createRange();

            fallbackRange.selectNodeContents(surface);
            fallbackRange.collapse(false);

            surface.focus();

            selection.removeAllRanges();
            selection.addRange(fallbackRange);

            return;
        }

        const range = document.createRange();

        try {
            range.setStart(
                startNode,
                Math.min(
                    saved.startOffset,
                    startNode.nodeType === Node.TEXT_NODE
                        ? startNode.textContent.length
                        : startNode.childNodes.length,
                ),
            );

            range.setEnd(
                endNode,
                Math.min(
                    saved.endOffset,
                    endNode.nodeType === Node.TEXT_NODE
                        ? endNode.textContent.length
                        : endNode.childNodes.length,
                ),
            );
        } catch {
            return;
        }

        const selection = window.getSelection();

        if (!selection) {
            return;
        }

        surface.focus();

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function createHistory(editor, surface) {
        const undoButton = editor.querySelector(
            '[data-rich-editor-history="undo"]',
        );

        const redoButton = editor.querySelector(
            '[data-rich-editor-history="redo"]',
        );

        const entries = [];
        let index = -1;
        let lastTypingAt = 0;
        let suspended = false;

        function snapshot() {
            return {
                html: surface.innerHTML,
                selection: captureSelection(surface),
            };
        }

        function updateButtons() {
            if (undoButton) {
                undoButton.disabled = suspended || index <= 0;
            }

            if (redoButton) {
                redoButton.disabled = suspended || index >= entries.length - 1;
            }
        }

        function pushSnapshot(groupTyping = false) {
            const next = snapshot();
            const current = entries[index];

            if (current?.html === next.html) {
                current.selection = next.selection;
                return;
            }

            // A new edit after Undo discards the redo branch.
            entries.splice(index + 1);

            const now = Date.now();

            const canGroupTyping =
                groupTyping &&
                lastTypingAt > 0 &&
                now - lastTypingAt < TYPING_GROUP_DELAY &&
                index > 0;

            if (canGroupTyping) {
                entries[index] = next;
            } else {
                entries.push(next);
                index = entries.length - 1;
            }

            if (entries.length > HISTORY_LIMIT) {
                entries.shift();
                index--;
            }

            lastTypingAt = groupTyping ? now : 0;

            updateButtons();
        }

        function breakTypingGroup() {
            lastTypingAt = 0;
        }

        function saveCurrentSelection() {
            const current = entries[index];

            if (current && current.html === surface.innerHTML) {
                const selection = captureSelection(surface);

                if (selection) {
                    current.selection = selection;
                }
            }
        }

        function restoreCurrentSelection() {
            const current = entries[index];

            if (current && current.html === surface.innerHTML) {
                restoreSelection(surface, current.selection);
            }
        }

        function restore(indexToRestore) {
            if (indexToRestore < 0 || indexToRestore >= entries.length) {
                return false;
            }

            index = indexToRestore;
            lastTypingAt = 0;

            const entry = entries[index];

            surface.innerHTML = entry.html;
            restoreSelection(surface, entry.selection);

            updateButtons();

            return true;
        }

        function undo() {
            return suspended ? false : restore(index - 1);
        }

        function redo() {
            return suspended ? false : restore(index + 1);
        }

        function setSuspended(value) {
            suspended = Boolean(value);
            updateButtons();
        }

        // Save the initial editor state.
        entries.push(snapshot());
        index = 0;
        updateButtons();

        return {
            pushSnapshot,
            breakTypingGroup,
            saveCurrentSelection,
            restoreCurrentSelection,
            setSuspended,
            undo,
            redo,
        };
    }

    function countWords(text) {
        const trimmed = text.trim();

        return trimmed === "" ? 0 : trimmed.split(/\s+/u).length;
    }

    function selectionInside(surface, range) {
        return (
            surface.contains(range.startContainer) &&
            surface.contains(range.endContainer)
        );
    }

    function notifyChange(editor, surface) {
        const counter = editor.querySelector("[data-rich-editor-word-count]");

        if (counter) {
            counter.textContent = String(countWords(surface.textContent || ""));
        }

        editor.dispatchEvent(
            new CustomEvent("rich-editor:change", {
                bubbles: true,
                detail: {
                    html: surface.innerHTML,
                },
            }),
        );
    }

    function getEditorRange(surface) {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);

        return selectionInside(surface, range) ? range : null;
    }

    function restoreRange(surface, savedRange) {
        if (!savedRange) {
            return false;
        }

        const selection = window.getSelection();

        if (!selection) {
            return false;
        }

        // A saved range can become invalid if its nodes
        // were removed or replaced.
        if (!selectionInside(surface, savedRange)) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(savedRange);

        return true;
    }

    function closestLink(node, surface) {
        let current =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

        while (current && current !== surface) {
            if (
                current.nodeType === Node.ELEMENT_NODE &&
                current.tagName === "A"
            ) {
                return current;
            }

            current = current.parentNode;
        }

        return null;
    }

    function applyInlineFormat(surface, tagName) {
        const range = getEditorRange(surface);

        if (!range || range.collapsed) {
            return false;
        }

        const selection = window.getSelection();
        const wrapper = document.createElement(tagName);
        const fragment = range.extractContents();

        wrapper.appendChild(fragment);
        range.insertNode(wrapper);

        const newRange = document.createRange();

        newRange.selectNodeContents(wrapper);

        selection.removeAllRanges();
        selection.addRange(newRange);

        surface.focus();

        return true;
    }

    function applyLink(surface, savedRange) {
        if (!restoreRange(surface, savedRange)) {
            return false;
        }

        const range = getEditorRange(surface);

        if (!range) {
            return false;
        }

        const existingLink = closestLink(range.startContainer, surface);

        const currentUrl = existingLink?.getAttribute("href") || "";

        const input = window.prompt(
            "Enter link URL (https://, http://, mailto:, /path or #section):",
            currentUrl,
        );

        // Cancel should leave the editor unchanged.
        if (input === null) {
            surface.focus();
            return false;
        }

        const url = normalizeLinkUrl(input);

        if (!url) {
            window.alert("Please enter a valid, supported URL.");
            surface.focus();
            return false;
        }

        if (existingLink && range.collapsed) {
            existingLink.setAttribute("href", url);
            surface.focus();
            return true;
        }

        if (range.collapsed) {
            window.alert("Select some text before inserting a link.");
            surface.focus();
            return false;
        }

        const link = document.createElement("a");

        link.setAttribute("href", url);

        const fragment = range.extractContents();

        link.appendChild(fragment);
        range.insertNode(link);

        const selection = window.getSelection();
        const newRange = document.createRange();

        newRange.selectNodeContents(link);

        selection.removeAllRanges();
        selection.addRange(newRange);

        surface.focus();

        return true;
    }

    function removeLink(surface) {
        const range = getEditorRange(surface);

        if (!range) {
            return false;
        }

        const link = closestLink(range.startContainer, surface);

        if (!link) {
            return false;
        }

        const parent = link.parentNode;

        while (link.firstChild) {
            parent.insertBefore(link.firstChild, link);
        }

        parent.removeChild(link);

        surface.focus();

        return true;
    }

    function applyTextColor(surface, savedRange, color) {
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            return false;
        }

        if (!restoreRange(surface, savedRange)) {
            return false;
        }

        const range = getEditorRange(surface);

        if (!range || range.collapsed) {
            return false;
        }

        const span = document.createElement("span");

        span.style.color = color;

        const fragment = range.extractContents();

        span.appendChild(fragment);
        range.insertNode(span);

        const selection = window.getSelection();
        const newRange = document.createRange();

        newRange.selectNodeContents(span);

        selection.removeAllRanges();
        selection.addRange(newRange);

        surface.focus();

        return true;
    }

    function closestBlock(node, surface) {
        let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

        while (current && current !== surface) {
            if (
                current.nodeType === Node.ELEMENT_NODE &&
                BLOCK_TAGS.has(current.tagName)
            ) {
                return current;
            }

            current = current.parentNode;
        }

        return null;
    }

    function selectedBlocks(surface, range) {
        const blocks = Array.from(
            surface.querySelectorAll("p, h1, h2, h3, div, li"),
        ).filter((block) => {
            // Prefer leaf-level blocks, avoiding nested containers.
            return !Array.from(block.children).some((child) =>
                BLOCK_TAGS.has(child.tagName),
            );
        });

        if (range.collapsed) {
            const block = closestBlock(range.startContainer, surface);

            return block ? [block] : [];
        }

        return blocks.filter((block) => {
            try {
                return range.intersectsNode(block);
            } catch {
                return false;
            }
        });
    }

    function replaceBlockTag(block, tagName) {
        if (block.tagName.toLowerCase() === tagName) {
            return block;
        }

        const replacement = document.createElement(tagName);

        while (block.firstChild) {
            replacement.appendChild(block.firstChild);
        }

        block.replaceWith(replacement);

        return replacement;
    }

    function placeCaretAtEnd(element) {
        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(element);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);

        element.closest("[contenteditable]")?.focus();
    }

    function ensureBlock(surface, range) {
        const existing = closestBlock(range.startContainer, surface);

        if (existing) {
            return existing;
        }

        // When the editor contains plain text, create
        // a paragraph around the current top-level content.
        const paragraph = document.createElement("p");

        while (surface.firstChild) {
            paragraph.appendChild(surface.firstChild);
        }

        surface.appendChild(paragraph);

        return paragraph;
    }

    function applyBlockStyle(surface, tagName) {
        if (!BLOCK_STYLES.has(tagName)) {
            return false;
        }

        const range = getEditorRange(surface);

        if (!range) {
            return false;
        }

        let blocks = selectedBlocks(surface, range);

        if (blocks.length === 0) {
            blocks = [ensureBlock(surface, range)];
        }

        const replacements = [];

        for (const block of blocks) {
            if (block.tagName === "LI") {
                // List items are handled separately by
                // the list commands in this stage.
                continue;
            }

            replacements.push(replaceBlockTag(block, tagName));
        }

        if (replacements.length === 0) {
            return false;
        }

        placeCaretAtEnd(replacements.at(-1));

        return true;
    }

    function createList(surface, listTag) {
        const range = getEditorRange(surface);

        if (!range) {
            return false;
        }

        let blocks = selectedBlocks(surface, range);

        if (blocks.length === 0) {
            blocks = [ensureBlock(surface, range)];
        }

        // Only convert regular blocks at the same level.
        // Existing lists will be supported by a later
        // list-editing enhancement.
        blocks = blocks.filter(
            (block) => block.tagName !== "LI" && block.parentNode === surface,
        );

        if (blocks.length === 0) {
            return false;
        }

        const list = document.createElement(listTag);

        blocks[0].before(list);

        for (const block of blocks) {
            const item = document.createElement("li");

            while (block.firstChild) {
                item.appendChild(block.firstChild);
            }

            list.appendChild(item);
            block.remove();
        }

        placeCaretAtEnd(list.lastElementChild);

        return true;
    }

    function initializeEditor(editor) {
        if (editor.dataset.editorInitialized === "true") {
            return;
        }

        const surface = editor.querySelector("[data-rich-editor-surface]");

        if (!surface) {
            return;
        }

        const initialValue = editor.querySelector(
            "[data-rich-editor-initial-value]",
        );

        if (initialValue) {
            surface.innerHTML = initialValue.value;
        }

        const history = createHistory(editor, surface);

        const source = editor.querySelector("[data-rich-editor-source]");

        const sourceToggle = editor.querySelector(
            "[data-rich-editor-source-toggle]",
        );

        let isSourceMode = false;
        let sourceChanged = false;

        function commitChange(groupTyping = false) {
            history.pushSnapshot(groupTyping);
            notifyChange(editor, surface);
        }

        function enterSourceMode() {
            if (!source || !sourceToggle || isSourceMode) {
                return;
            }

            history.breakTypingGroup();
            history.saveCurrentSelection();

            source.value = surface.innerHTML;
            sourceChanged = false;
            isSourceMode = true;
            history.setSuspended(true);
            updateFormattingControls();

            surface.hidden = true;
            source.hidden = false;

            sourceToggle.setAttribute("aria-pressed", "true");
            sourceToggle.title = "Return to visual editor";

            source.focus();
        }

        function exitSourceMode() {
            if (!source || !sourceToggle || !isSourceMode) {
                return;
            }

            const previousHtml = surface.innerHTML;
            const nextHtml = source.value;
            const htmlChanged = sourceChanged && nextHtml !== previousHtml;

            if (htmlChanged) {
                surface.innerHTML = nextHtml;
            }

            source.hidden = true;
            surface.hidden = false;
            isSourceMode = false;
            sourceChanged = false;

            history.setSuspended(false);
            updateFormattingControls();

            sourceToggle.setAttribute("aria-pressed", "false");
            sourceToggle.title = "Edit HTML source";

            if (htmlChanged) {
                placeCaretAtEnd(surface);
                commitChange();
            } else {
                history.restoreCurrentSelection();
                surface.focus();
            }
        }

        const toolbar = editor.querySelector(".lre-toolbar");

        if (toolbar) {
            let savedLinkRange = null;
            let savedColorRange = null;

            toolbar.addEventListener("mousedown", (event) => {
                const button = event.target.closest(
                    "[data-rich-editor-command]",
                );

                if (!button || !toolbar.contains(button)) {
                    return;
                }

                if (button.dataset.richEditorCommand === "link") {
                    const range = getEditorRange(surface);

                    savedLinkRange = range ? range.cloneRange() : null;
                }

                // Preserve editor selection when clicking toolbar buttons.
                event.preventDefault();
            });

            toolbar.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-rich-editor-command]",
                );

                if (!button || !toolbar.contains(button)) {
                    return;
                }

                const command = button.dataset.richEditorCommand;

                let changed = false;

                if (INLINE_FORMATS[command]) {
                    changed = applyInlineFormat(
                        surface,
                        INLINE_FORMATS[command],
                    );
                } else if (command === "unordered-list") {
                    changed = createList(surface, "ul");
                } else if (command === "ordered-list") {
                    changed = createList(surface, "ol");
                } else if (command === "link") {
                    changed = applyLink(surface, savedLinkRange);
                    savedLinkRange = null;
                } else if (command === "unlink") {
                    changed = removeLink(surface);
                }
                if (changed) {
                    commitChange();
                }
            });

            const colorInput = toolbar.querySelector(
                "[data-rich-editor-text-color]",
            );

            if (colorInput) {
                const saveColorSelection = () => {
                    const range = getEditorRange(surface);

                    if (range) {
                        savedColorRange = range.cloneRange();
                    }
                };

                colorInput.addEventListener("pointerdown", saveColorSelection);

                colorInput.addEventListener("focus", saveColorSelection);

                colorInput.addEventListener("change", () => {
                    if (
                        applyTextColor(
                            surface,
                            savedColorRange,
                            colorInput.value,
                        )
                    ) {
                        commitChange();
                    }

                    savedColorRange = null;
                });
            }

            const styleSelect = toolbar.querySelector(
                "[data-rich-editor-block-style]",
            );

            if (styleSelect) {
                // Save the selection before the dropdown
                // takes focus away from the editor.
                let savedRange = null;

                styleSelect.addEventListener("pointerdown", () => {
                    const range = getEditorRange(surface);

                    savedRange = range ? range.cloneRange() : null;
                });

                styleSelect.addEventListener("change", () => {
                    if (savedRange) {
                        const selection = window.getSelection();

                        selection.removeAllRanges();
                        selection.addRange(savedRange);
                    }

                    if (applyBlockStyle(surface, styleSelect.value)) {
                        commitChange();
                    }

                    savedRange = null;
                });
            }
        }

        const undoButton = editor.querySelector(
            '[data-rich-editor-history="undo"]',
        );

        const redoButton = editor.querySelector(
            '[data-rich-editor-history="redo"]',
        );

        if (undoButton) {
            undoButton.addEventListener("click", () => {
                if (history.undo()) {
                    notifyChange(editor, surface);
                }
            });
        }

        if (redoButton) {
            redoButton.addEventListener("click", () => {
                if (history.redo()) {
                    notifyChange(editor, surface);
                }
            });
        }

        if (sourceToggle) {
            sourceToggle.addEventListener("click", () => {
                if (isSourceMode) {
                    exitSourceMode();
                } else {
                    enterSourceMode();
                }
            });
        }

        if (source) {
            source.addEventListener("input", () => {
                sourceChanged = true;
            });
        }

        const formattingControls = editor.querySelectorAll(
            "[data-rich-editor-command], " +
                "[data-rich-editor-block-style], " +
                "[data-rich-editor-text-color]",
        );

        function updateFormattingControls() {
            formattingControls.forEach((control) => {
                control.disabled = isSourceMode;
            });
        }

        surface.addEventListener("keydown", (event) => {
            const modifier = event.ctrlKey || event.metaKey;

            if (!modifier || event.altKey) {
                return;
            }

            const key = event.key.toLowerCase();

            const undoRequested = key === "z" && !event.shiftKey;

            const redoRequested =
                (key === "z" && event.shiftKey) ||
                (key === "y" && !event.shiftKey);

            if (!undoRequested && !redoRequested) {
                return;
            }

            // Prevent the browser's native undo stack
            // from conflicting with our custom history.
            event.preventDefault();

            const changed = undoRequested ? history.undo() : history.redo();

            if (changed) {
                notifyChange(editor, surface);
            }
        });

        surface.addEventListener("beforeinput", (event) => {
            if (
                event.inputType !== "historyUndo" &&
                event.inputType !== "historyRedo"
            ) {
                return;
            }

            if (!event.cancelable) {
                return;
            }

            event.preventDefault();

            const changed =
                event.inputType === "historyUndo"
                    ? history.undo()
                    : history.redo();

            if (changed) {
                notifyChange(editor, surface);
            }
        });

        surface.addEventListener("input", (event) => {
            const isTyping =
                event.inputType === "insertText" ||
                event.inputType === "deleteContentBackward" ||
                event.inputType === "deleteContentForward";

            commitChange(isTyping);
        });

        surface.addEventListener("blur", () => {
            history.breakTypingGroup();
        });

        surface.addEventListener("paste", () => {
            history.breakTypingGroup();
        });

        surface.addEventListener("cut", () => {
            history.breakTypingGroup();
        });

        surface.addEventListener("pointerup", () => {
            history.breakTypingGroup();
        });

        surface.addEventListener("keyup", (event) => {
            if (
                event.key.startsWith("Arrow") ||
                event.key === "Home" ||
                event.key === "End" ||
                event.key === "PageUp" ||
                event.key === "PageDown"
            ) {
                history.breakTypingGroup();
            }
        });

        editor.dataset.editorInitialized = "true";

        const counter = editor.querySelector("[data-rich-editor-word-count]");

        if (counter) {
            counter.textContent = String(countWords(surface.textContent || ""));
        }
    }

    function initializeAllEditors() {
        document
            .querySelectorAll("[data-rich-editor]")
            .forEach(initializeEditor);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAllEditors);
    } else {
        initializeAllEditors();
    }

    document.addEventListener("livewire:navigated", initializeAllEditors);

})();
