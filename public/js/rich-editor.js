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
    function normalizeImageUrl(value) {
        const input = value.trim();
        if (!input) return null;
        try {
            const url = new URL(input);
            if (!["https:", "http:"].includes(url.protocol)) return null;
            if (
                ["unsplash.com", "www.unsplash.com"].includes(url.hostname) &&
                url.pathname.startsWith("/photos/")
            )
                return null;
            return url.href;
        } catch {
            return null;
        }
    }

    // Rebuild untrusted HTML from an allowlist rather than copying unsafe nodes.
    function sanitizeEditorHtml(html) {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const allowed = new Set(["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "S", "H1", "H2", "H3", "UL", "OL", "LI", "A", "IMG", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "SPAN", "BLOCKQUOTE"]);
        const blocked = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "TEMPLATE", "META", "LINK", "BASE"]);
        function clean(node) {
            if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
            if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
            if (blocked.has(node.tagName)) return document.createDocumentFragment();
            const fragment = document.createDocumentFragment();
            const tag = node.tagName;
            const output = allowed.has(tag) ? document.createElement(tag.toLowerCase()) : fragment;
            if (tag === "A" && output !== fragment) {
                const href = normalizeLinkUrl(node.getAttribute("href") || "");
                if (href) output.setAttribute("href", href);
            }
            if (tag === "IMG" && output !== fragment) {
                const src = normalizeImageUrl(node.getAttribute("src") || "");
                if (!src) return fragment;
                output.setAttribute("src", src);
                output.setAttribute("alt", node.getAttribute("alt") || "");
            }
            if (tag === "SPAN" && output !== fragment) {
                const color = node.style.color;
                if (color && window.CSS?.supports("color", color)) output.style.color = color;
            }
            for (const child of Array.from(node.childNodes)) output.appendChild(clean(child));
            return output;
        }
        const container = document.createElement("div");
        for (const node of Array.from(parsed.body.childNodes)) container.appendChild(clean(node));
        return container.innerHTML;
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
    function parseTableDimension(value) {
        if (value === null) {
            return null;
        }
        const input = value.trim();
        if (!/^\d+$/.test(input)) {
            return null;
        }
        const number = Number(input);
        if (!Number.isSafeInteger(number) || number < 1 || number > 20) {
            return null;
        }
        return number;
    }
    function createTableElement(rows, columns) {
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const headerRow = document.createElement("tr");
        for (let column = 0; column < columns; column++) {
            const cell = document.createElement("th");
            cell.setAttribute("scope", "col");
            cell.appendChild(document.createElement("br"));
            headerRow.appendChild(cell);
        }
        thead.appendChild(headerRow);
        for (let row = 1; row < rows; row++) {
            const tableRow = document.createElement("tr");
            for (let column = 0; column < columns; column++) {
                const cell = document.createElement("td");
                cell.appendChild(document.createElement("br"));
                tableRow.appendChild(cell);
            }
            tbody.appendChild(tableRow);
        }
        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }
    function placeCaretInFirstTableCell(table, surface) {
        const firstCell = table.querySelector("th, td");
        if (!firstCell) {
            return;
        }
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(firstCell);
        range.collapse(true);
        surface.focus();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    function insertTable(surface, savedRange, rows, columns) {
        if (!restoreRange(surface, savedRange)) {
            return false;
        }
        const range = getEditorRange(surface);
        if (!range) {
            return false;
        }
        if (!range.collapsed) {
            window.alert(
                "Place the cursor at an insertion point without selecting text.",
            );
            return false;
        }
        // Avoid nesting a table inside another table.
        const startElement =
            range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer.parentElement
                : range.startContainer;
        const listItem = startElement.closest("li");
        if (listItem && surface.contains(listItem)) {
            window.alert(
                "Move the cursor outside the list before inserting a table.",
            );
            return false;
        }
        if (startElement?.closest("table")) {
            window.alert(
                "Move the cursor outside the existing table before inserting another table.",
            );
            return false;
        }
        const table = createTableElement(rows, columns);
        // Insert at block level, immediately after the
        // current paragraph or heading.
        const block = closestBlock(range.startContainer, surface);
        if (block) {
            let insertionPoint = block;
            while (
                insertionPoint.parentElement &&
                insertionPoint.parentElement !== surface
            ) {
                insertionPoint = insertionPoint.parentElement;
            }
            insertionPoint.after(table);
        } else if (surface.textContent.trim() === "") {
            surface.appendChild(table);
        } else {
            window.alert(
                "Place the cursor inside a paragraph or heading before inserting a table.",
            );
            return false;
        }
        // Add a paragraph after the table so users can
        // continue typing outside it.
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        table.after(paragraph);
        placeCaretInFirstTableCell(table, surface);
        return true;
    }
    function getTableContext(surface) {
        const range = getEditorRange(surface);
        if (!range || !range.collapsed) {
            return null;
        }
        const node = range.startContainer;
        const element =
            node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const cell = element?.closest("td, th");
        if (!cell || !surface.contains(cell)) {
            return null;
        }
        const row = cell.closest("tr");
        const table = cell.closest("table");
        if (!row || !table || !surface.contains(table)) {
            return null;
        }
        const rowIndex = row.rowIndex;
        const columnIndex = cell.cellIndex;
        if (rowIndex < 0 || columnIndex < 0) {
            return null;
        }
        return {
            table,
            row,
            cell,
            rowIndex,
            columnIndex,
        };
    }
    function createEmptyTableCell(tagName) {
        const cell = document.createElement(tagName);
        if (tagName === "th") {
            cell.setAttribute("scope", "col");
        }
        cell.appendChild(document.createElement("br"));
        return cell;
    }
    function focusTableCell(surface, cell) {
        if (!cell) {
            surface.focus();
            return;
        }
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        const range = document.createRange();
        range.selectNodeContents(cell);
        range.collapse(true);
        surface.focus();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    function editTable(surface, action) {
        const context = getTableContext(surface);
        if (!context) {
            return false;
        }
        const { table, row, cell, rowIndex, columnIndex } = context;
        const rows = Array.from(table.rows);
        const columnCount = rows[0]?.cells.length ?? 0;
        // This stage supports rectangular tables without
        // merged cells (colspan or rowspan).
        const hasMergedCells = table.querySelector(
            "td[colspan], td[rowspan], th[colspan], th[rowspan]",
        );
        const isRectangular = rows.every(
            (item) => item.cells.length === columnCount,
        );
        if (hasMergedCells || !isRectangular) {
            window.alert(
                "Editing merged or irregular tables is not supported yet.",
            );
            return false;
        }
        if (action === "delete-table") {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            table.replaceWith(paragraph);
            focusTableCell(surface, null);
            placeCaretAtEnd(paragraph);
            return true;
        }
        if (action === "row-above" || action === "row-below") {
            if (rows.length >= 20) {
                window.alert("A table can contain at most 20 rows.");
                return false;
            }
            const newRow = document.createElement("tr");
            const isHeaderRow = row.parentElement.tagName === "THEAD";
            for (let column = 0; column < columnCount; column++) {
                newRow.appendChild(
                    createEmptyTableCell(
                        isHeaderRow && action === "row-above" ? "th" : "td",
                    ),
                );
            }
            if (action === "row-above") {
                row.before(newRow);
            } else {
                if (row.parentElement.tagName === "THEAD") {
                    let tbody = table.tBodies[0];
                    if (!tbody) {
                        tbody = document.createElement("tbody");
                        table.appendChild(tbody);
                    }
                    tbody.prepend(newRow);
                } else {
                    row.after(newRow);
                }
            }
            focusTableCell(surface, newRow.cells[columnIndex]);
            return true;
        }
        if (action === "column-left" || action === "column-right") {
            if (columnCount >= 20) {
                window.alert("A table can contain at most 20 columns.");
                return false;
            }
            for (const currentRow of rows) {
                const existingCell = currentRow.cells[columnIndex];
                const tagName =
                    currentRow.parentElement.tagName === "THEAD" ? "th" : "td";
                const newCell = createEmptyTableCell(tagName);
                if (action === "column-left") {
                    existingCell.before(newCell);
                } else {
                    existingCell.after(newCell);
                }
            }
            const newIndex =
                action === "column-left" ? columnIndex : columnIndex + 1;
            focusTableCell(surface, row.cells[newIndex]);
            return true;
        }
        if (action === "delete-row") {
            if (rows.length === 1) {
                window.alert(
                    "Cannot delete the only row. Use Delete Table instead.",
                );
                return false;
            }
            // Do not remove the only header row.
            if (row.parentElement.tagName === "THEAD") {
                window.alert(
                    "The header row cannot be deleted in this version.",
                );
                return false;
            }
            row.remove();
            const remainingRows = Array.from(table.rows);
            const nextRow =
                remainingRows[Math.min(rowIndex, remainingRows.length - 1)];
            focusTableCell(surface, nextRow?.cells[columnIndex]);
            return true;
        }
        if (action === "delete-column") {
            if (columnCount === 1) {
                window.alert(
                    "Cannot delete the only column. Use Delete Table instead.",
                );
                return false;
            }
            for (const currentRow of rows) {
                currentRow.cells[columnIndex].remove();
            }
            const nextIndex = Math.min(columnIndex, columnCount - 2);
            focusTableCell(surface, row.cells[nextIndex]);
            return true;
        }
        return false;
    }
    function insertImage(surface, savedRange, url, altText) {
        if (!restoreRange(surface, savedRange)) {
            return false;
        }
        const range = getEditorRange(surface);
        if (!range || !range.collapsed) {
            window.alert(
                "Place the cursor where you want to insert the image.",
            );
            return false;
        }
        const startNode = range.startContainer;
        const startElement =
            startNode.nodeType === Node.ELEMENT_NODE
                ? startNode
                : startNode.parentElement;
        // Keep this stage simple: do not insert images
        // inside tables.
        const table = startElement?.closest("table");
        if (table && surface.contains(table)) {
            window.alert(
                "Move the cursor outside the table before inserting an image.",
            );
            return false;
        }
        const image = document.createElement("img");
        image.setAttribute("src", url);
        image.setAttribute("alt", altText);
        image.setAttribute("loading", "lazy");
        image.setAttribute("decoding", "async");
        // Use a paragraph as the image's block container.
        const paragraph = document.createElement("p");
        paragraph.appendChild(image);
        const currentBlock = closestBlock(range.startContainer, surface);
        if (currentBlock) {
            let insertionPoint = currentBlock;
            while (
                insertionPoint.parentElement &&
                insertionPoint.parentElement !== surface
            ) {
                insertionPoint = insertionPoint.parentElement;
            }
            insertionPoint.after(paragraph);
        } else if (surface.textContent.trim() === "") {
            surface.appendChild(paragraph);
        } else {
            window.alert(
                "Place the cursor inside a paragraph or heading before inserting an image.",
            );
            return false;
        }
        // Allow users to continue typing after the image.
        const nextParagraph = document.createElement("p");
        nextParagraph.appendChild(document.createElement("br"));
        paragraph.after(nextParagraph);
        placeCaretAtEnd(nextParagraph);
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
            surface.innerHTML = sanitizeEditorHtml(initialValue.value);
        }
        const alpine = window.Alpine;
        if (alpine) {
            alpine.effect(() => {
                const state = alpine.$data(editor);
                const incoming = state.html;
                if (typeof incoming === "string" && incoming !== surface.innerHTML && document.activeElement !== surface && editor.dataset.editorInitialized === "true") {
                    surface.innerHTML = sanitizeEditorHtml(incoming);
                    notifyChange(editor, surface);
                }
            });
        }
        const history = createHistory(editor, surface);
        const source = editor.querySelector("[data-rich-editor-source]");
        const sourceToggle = editor.querySelector(
            "[data-rich-editor-source-toggle]",
        );
        const uploadButton = editor.querySelector(
            "[data-rich-editor-upload-button]",
        );
        const uploadInput = editor.querySelector(
            "[data-rich-editor-image-upload]",
        );
        let savedUploadRange = null;
        let uploadInProgress = false;
        let isSourceMode = false;
        let sourceChanged = false;
        function finishImageUpload() {
            uploadInProgress = false;
            if (uploadButton) {
                uploadButton.disabled = isSourceMode;
            }
            if (uploadInput) {
                uploadInput.value = "";
            }
            savedUploadRange = null;
        }
        function commitChange(groupTyping = false) {
            history.pushSnapshot(groupTyping);
            notifyChange(editor, surface);
            updateTableActionButtons();
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
                surface.innerHTML = sanitizeEditorHtml(nextHtml);
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
        const tableActionButtons = Array.from(
            editor.querySelectorAll("[data-rich-editor-table-action]"),
        );
        function updateTableActionButtons() {
            const insideTable =
                !isSourceMode && getTableContext(surface) !== null;
            tableActionButtons.forEach((button) => {
                button.disabled = !insideTable;
            });
        }
        const toolbar = editor.querySelector(".lre-toolbar");
        if (toolbar) {
            let savedLinkRange = null;
            let savedColorRange = null;
            let savedTableRange = null;
            let savedImageRange = null;
            toolbar.addEventListener("mousedown", (event) => {
                const button = event.target.closest(
                    "[data-rich-editor-table-action]",
                );
                if (!button || !toolbar.contains(button)) {
                    return;
                }
                // Preserve the selection inside the table.
                event.preventDefault();
            });
            toolbar.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-rich-editor-table-action]",
                );
                if (!button || !toolbar.contains(button) || button.disabled) {
                    return;
                }
                history.breakTypingGroup();
                const action = button.dataset.richEditorTableAction;
                if (editTable(surface, action)) {
                    commitChange();
                }
                updateTableActionButtons();
            });
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
                if (button.dataset.richEditorCommand === "insert-table") {
                    const range = getEditorRange(surface);
                    savedTableRange = range ? range.cloneRange() : null;
                }
                if (button.dataset.richEditorCommand === "insert-image") {
                    const range = getEditorRange(surface);
                    savedImageRange = range ? range.cloneRange() : null;
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
                } else if (command === "insert-table") {
                    if (!savedTableRange) {
                        window.alert(
                            "Place the cursor inside the editor before inserting a table.",
                        );
                    } else {
                        const rowsInput = window.prompt(
                            "Number of rows (1–20, including header):",
                            "3",
                        );
                        if (rowsInput !== null) {
                            const rows = parseTableDimension(rowsInput);
                            if (rows === null) {
                                window.alert(
                                    "Please enter a whole number between 1 and 20 for rows.",
                                );
                            } else {
                                const columnsInput = window.prompt(
                                    "Number of columns (1–20):",
                                    "3",
                                );
                                if (columnsInput !== null) {
                                    const columns =
                                        parseTableDimension(columnsInput);
                                    if (columns === null) {
                                        window.alert(
                                            "Please enter a whole number between 1 and 20 for columns.",
                                        );
                                    } else {
                                        changed = insertTable(
                                            surface,
                                            savedTableRange,
                                            rows,
                                            columns,
                                        );
                                    }
                                }
                            }
                        }
                    }
                    savedTableRange = null;
                } else if (command === "insert-image") {
                    if (!savedImageRange) {
                        window.alert(
                            "Place the cursor inside the editor before inserting an image.",
                        );
                    } else {
                        const urlInput = window.prompt(
                            "Enter image URL (https:// or http://):",
                            "https://",
                        );
                        if (urlInput !== null) {
                            const url = normalizeImageUrl(urlInput);
                            if (!url) {
                                window.alert(
                                    "Please enter a valid HTTPS or HTTP image URL.",
                                );
                            } else {
                                const altInput = window.prompt(
                                    "Describe the image for accessibility (alt text):",
                                    "",
                                );
                                if (altInput !== null) {
                                    const altText = altInput.trim();
                                    changed = insertImage(
                                        surface,
                                        savedImageRange,
                                        url,
                                        altText,
                                    );
                                }
                            }
                        }
                    }
                    savedImageRange = null;
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
        // STEP 5.6.4 — IMAGE UPLOAD HANDLERS
        if (uploadButton && uploadInput) {
            uploadButton.addEventListener("mousedown", (event) => {
                event.preventDefault();
            });
            uploadButton.addEventListener("click", () => {
                if (isSourceMode || uploadInProgress) {
                    return;
                }
                const range = getEditorRange(surface);
                if (!range || !range.collapsed) {
                    window.alert(
                        "Place the cursor inside the editor before uploading an image.",
                    );
                    return;
                }
                savedUploadRange = range.cloneRange();
                // Allow choosing the same file again.
                uploadInput.value = "";
                uploadInput.click();
            });
            uploadInput.addEventListener("change", () => {
                const file = uploadInput.files?.[0];
                if (!file) {
                    savedUploadRange = null;
                    return;
                }
                if (
                    ![
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                    ].includes(file.type)
                ) {
                    window.alert(
                        "Please select a JPEG, PNG, WebP, or GIF image.",
                    );
                    finishImageUpload();
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    window.alert("The image must be 5 MB or smaller.");
                    finishImageUpload();
                    return;
                }
                if (!window.Livewire) {
                    window.alert(
                        "Livewire is not available for image uploads.",
                    );
                    finishImageUpload();
                    return;
                }
                const componentRoot = editor.closest("[wire\\:id]");
                const componentId = componentRoot?.getAttribute("wire:id");
                const component = componentId
                    ? window.Livewire.find(componentId)
                    : null;
                if (!component) {
                    window.alert(
                        "Could not find the Livewire editor component.",
                    );
                    finishImageUpload();
                    return;
                }
                uploadInProgress = true;
                uploadButton.disabled = true;
                component.upload(
                    "imageUpload",
                    file,
                    async () => {
                        try {
                            const url = await component.uploadEditorImage();
                            if (!url || typeof url !== "string") {
                                throw new Error(
                                    "The server did not return an image URL.",
                                );
                            }
                            if (!savedUploadRange) {
                                throw new Error(
                                    "The image insertion position was lost.",
                                );
                            }
                            const changed = insertImage(
                                surface,
                                savedUploadRange,
                                url,
                                file.name,
                            );
                            if (changed) {
                                commitChange();
                            }
                        } catch (error) {
                            console.error(
                                "Rich Editor image upload failed:",
                                error,
                            );
                            window.alert(
                                "The image could not be inserted. Check the browser console and Laravel logs.",
                            );
                        } finally {
                            finishImageUpload();
                        }
                    },
                    (error) => {
                        console.error(
                            "Rich Editor temporary upload failed:",
                            error,
                        );
                        window.alert(
                            "The image upload failed. Check the file size and Laravel upload configuration.",
                        );
                        finishImageUpload();
                    },
                );
            });
        }

        // REMOVE ALL HTML TAGS WHILE PRESERVING TEXT
        const clearFormattingButton = editor.querySelector(
            "[data-rich-editor-clear-formatting]",
        );

        if (clearFormattingButton) {
            clearFormattingButton.addEventListener("click", () => {
                if (uploadInProgress) {
                    window.alert("Please wait for the image upload to finish.");
                    return;
                }

                const currentHtml =
                    isSourceMode && source ? source.value : surface.innerHTML;

                if (!currentHtml.trim()) {
                    return;
                }

                const confirmed = window.confirm(
                    "Remove all HTML formatting and keep the text content?",
                );

                if (!confirmed) {
                    return;
                }

                // Convert the current HTML (including unsaved source edits) directly
                // to plain text; innerText is unreliable on hidden editor surfaces.
                const html = isSourceMode && source ? source.value : surface.innerHTML;
                const parsed = new DOMParser().parseFromString(html, "text/html");
                for (const element of parsed.body.querySelectorAll("script, style, template, iframe, object, svg, math")) {
                    element.remove();
                }
                const blocks = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TR", "BLOCKQUOTE"]);
                function extractText(node) {
                    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
                    if (node.nodeType !== Node.ELEMENT_NODE) return "";
                    if (node.tagName === "BR") return "\n";
                    const text = Array.from(node.childNodes).map(extractText).join("");
                    return blocks.has(node.tagName) ? text + "\n" : text;
                }
                const plainText = Array.from(parsed.body.childNodes)
                    .map(extractText)
                    .join("")
                    .replace(/\u00a0/g, " ")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();

                if (isSourceMode) {
                    // Leave source mode without applying the HTML being discarded.
                    sourceChanged = false;
                    source.value = surface.innerHTML;
                    exitSourceMode();
                }
                history.breakTypingGroup();
                // Keep the result as one text node: no span/div/br markup remains.
                // CSS white-space: pre-wrap displays the preserved newlines.
                surface.textContent = plainText;
                if (source) source.value = surface.innerHTML;
                commitChange();

                surface.focus();
            });
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
                    updateTableActionButtons();
                }
            });
        }
        if (redoButton) {
            redoButton.addEventListener("click", () => {
                if (history.redo()) {
                    notifyChange(editor, surface);
                    updateTableActionButtons();
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
            if (uploadButton) {
                uploadButton.disabled = isSourceMode || uploadInProgress;
            }
            updateTableActionButtons();
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
        surface.addEventListener("paste", (event) => {
            history.breakTypingGroup();
            if (!event.clipboardData) return;
            event.preventDefault();
            const html = event.clipboardData.getData("text/html");
            const plain = event.clipboardData.getData("text/plain");
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!surface.contains(range.commonAncestorContainer)) return;
            const template = document.createElement("template");
            if (html) template.innerHTML = sanitizeEditorHtml(html);
            else template.content.appendChild(document.createTextNode(plain));
            const last = template.content.lastChild;
            range.deleteContents();
            range.insertNode(template.content);
            if (last) {
                range.setStartAfter(last);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            commitChange();
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
        surface.addEventListener("mouseup", updateTableActionButtons);
        surface.addEventListener("keyup", updateTableActionButtons);
        surface.addEventListener("focusin", updateTableActionButtons);
        updateTableActionButtons();
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
    // Nested Livewire components may be mounted after DOMContentLoaded, especially
    // when their parent is conditionally rendered in a tab.
    if (window.Livewire?.hook) {
        window.Livewire.hook("morph.added", ({ el }) => {
            if (el.matches?.("[data-rich-editor]")) initializeEditor(el);
            el.querySelectorAll?.("[data-rich-editor]").forEach(initializeEditor);
        });
    }
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (node.matches?.("[data-rich-editor]")) initializeEditor(node);
                node.querySelectorAll?.("[data-rich-editor]").forEach(initializeEditor);
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
