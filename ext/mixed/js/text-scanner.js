/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


class TextScanner {
    constructor(node, ignoreNodes, ignoreElements, ignorePoints) {
        this.node = node;
        this.ignoreNodes = (Array.isArray(ignoreNodes) && ignoreNodes.length > 0 ? ignoreNodes.join(',') : null);
        this.ignoreElements = ignoreElements;
        this.ignorePoints = ignorePoints;

        this.scanTimerPromise = null;
        this.textSourceCurrent = null;
        this.pendingLookup = false;
        this.options = null;

        this.enabled = false;
        this.eventListeners = [];

        this.primaryTouchIdentifier = null;
        this.preventNextContextMenu = false;
        this.preventNextMouseDown = false;
        this.preventNextClick = false;
        this.preventScroll = false;
    }

    onMouseOver(e) {
        if (this.ignoreElements.includes(e.target)) {
            this.scanTimerClear();
        }
    }

    onMouseMove(e) {
        this.scanTimerClear();

        if (this.pendingLookup || DOM.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const scanningOptions = this.options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            TextScanner.isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && DOM.isMouseButtonDown(e, 'auxiliary'))
        )) {
            return;
        }

        const search = async () => {
            if (scanningModifier === 'none') {
                if (!await this.scanTimerWait()) {
                    // Aborted
                    return;
                }
            }

            await this.searchAt(e.clientX, e.clientY, 'mouse');
        };

        search();
    }

    onMouseDown(e) {
        if (this.preventNextMouseDown) {
            this.preventNextMouseDown = false;
            this.preventNextClick = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (DOM.isMouseButtonDown(e, 'primary')) {
            this.scanTimerClear();
            this.onSearchClear(true);
        }
    }

    onMouseOut() {
        this.scanTimerClear();
    }

    onClick(e) {
        if (this.preventNextClick) {
            this.preventNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    onAuxClick() {
        this.preventNextContextMenu = false;
    }

    onContextMenu(e) {
        if (this.preventNextContextMenu) {
            this.preventNextContextMenu = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    onTouchStart(e) {
        if (this.primaryTouchIdentifier !== null || e.changedTouches.length === 0) {
            return;
        }

        this.preventScroll = false;
        this.preventNextContextMenu = false;
        this.preventNextMouseDown = false;
        this.preventNextClick = false;

        const primaryTouch = e.changedTouches[0];
        if (DOM.isPointInSelection(primaryTouch.clientX, primaryTouch.clientY, this.node.getSelection())) {
            return;
        }

        this.primaryTouchIdentifier = primaryTouch.identifier;

        if (this.pendingLookup) {
            return;
        }

        const textSourceCurrentPrevious = this.textSourceCurrent !== null ? this.textSourceCurrent.clone() : null;

        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchStart')
        .then(() => {
            if (
                this.textSourceCurrent === null ||
                this.textSourceCurrent.equals(textSourceCurrentPrevious)
            ) {
                return;
            }

            this.preventScroll = true;
            this.preventNextContextMenu = true;
            this.preventNextMouseDown = true;
        });
    }

    onTouchEnd(e) {
        if (
            this.primaryTouchIdentifier === null ||
            TextScanner.getIndexOfTouch(e.changedTouches, this.primaryTouchIdentifier) < 0
        ) {
            return;
        }

        this.primaryTouchIdentifier = null;
        this.preventScroll = false;
        this.preventNextClick = false;
        // Don't revert context menu and mouse down prevention,
        // since these events can occur after the touch has ended.
        // this.preventNextContextMenu = false;
        // this.preventNextMouseDown = false;
    }

    onTouchCancel(e) {
        this.onTouchEnd(e);
    }

    onTouchMove(e) {
        if (!this.preventScroll || !e.cancelable || this.primaryTouchIdentifier === null) {
            return;
        }

        const touches = e.changedTouches;
        const index = TextScanner.getIndexOfTouch(touches, this.primaryTouchIdentifier);
        if (index < 0) {
            return;
        }

        const primaryTouch = touches[index];
        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchMove');

        e.preventDefault(); // Disable scroll
    }

    async onSearchSource(_textSource, _cause) {
        throw new Error('Override me');
    }

    onCopy() {
        const range = document.getSelection().getRangeAt(0);
        const textSource = new TextSourceRange(range, '', null);
        this.search(textSource, 'mouse');
    }


    onError(error) {
        logError(error, false);
    }

    async scanTimerWait() {
        const delay = this.options.scanning.delay;
        const promise = promiseTimeout(delay, true);
        this.scanTimerPromise = promise;
        try {
            return await promise;
        } finally {
            if (this.scanTimerPromise === promise) {
                this.scanTimerPromise = null;
            }
        }
    }

    scanTimerClear() {
        if (this.scanTimerPromise !== null) {
            this.scanTimerPromise.resolve(false);
            this.scanTimerPromise = null;
        }
    }

    setEnabled(enabled) {
        if (enabled) {
            if (!this.enabled) {
                this.hookEvents();
                this.enabled = true;
            }
        } else {
            if (this.enabled) {
                this.clearEventListeners();
                this.enabled = false;
            }
            this.onSearchClear(false);
        }
    }

    hookEvents() {
        let eventListeners = this.getMouseEventListeners();
        if (this.options.scanning.touchInputEnabled) {
            eventListeners = eventListeners.concat(this.getTouchEventListeners());
        }

        for (const [node, type, listener, options] of eventListeners) {
            this.addEventListener(node, type, listener, options);
        }
    }

    getMouseEventListeners() {
        return [
            [this.node, 'mousedown', this.onMouseDown.bind(this)],
            [this.node, 'mousemove', this.onMouseMove.bind(this)],
            [this.node, 'mouseover', this.onMouseOver.bind(this)],
            [this.node, 'mouseout', this.onMouseOut.bind(this)],
            [this.node, 'copy', this.onCopy.bind(this)]
        ];
    }

    getTouchEventListeners() {
        return [
            [this.node, 'click', this.onClick.bind(this)],
            [this.node, 'auxclick', this.onAuxClick.bind(this)],
            [this.node, 'touchstart', this.onTouchStart.bind(this)],
            [this.node, 'touchend', this.onTouchEnd.bind(this)],
            [this.node, 'touchcancel', this.onTouchCancel.bind(this)],
            [this.node, 'touchmove', this.onTouchMove.bind(this), {passive: false}],
            [this.node, 'contextmenu', this.onContextMenu.bind(this)]
        ];
    }

    addEventListener(node, type, listener, options) {
        node.addEventListener(type, listener, options);
        this.eventListeners.push([node, type, listener, options]);
    }

    clearEventListeners() {
        for (const [node, type, listener, options] of this.eventListeners) {
            node.removeEventListener(type, listener, options);
        }
        this.eventListeners = [];
    }

    setOptions(options) {
        this.options = options;
        this.setEnabled(this.options.general.enable);
    }

    async searchAt(x, y, cause) {
        try {
            this.scanTimerClear();

            if (this.pendingLookup) {
                return;
            }

            for (const ignorePointFn of this.ignorePoints) {
                if (await ignorePointFn(x, y)) {
                    return;
                }
            }

            const textSource = docRangeFromPoint(x, y, this.options.scanning.deepDomScan);
            if (this.textSourceCurrent !== null && this.textSourceCurrent.equals(textSource)) {
                return;
            }

            await this.search(textSource, cause);
        } catch (e) {
            this.onError(e);
        }
    }

    async search(textSource, cause) {
        try {
            this.pendingLookup = true;
            const result = await this.onSearchSource(textSource, cause);
            if (result !== null) {
                this.textSourceCurrent = textSource;
                if (this.options.scanning.selectText) {
                    textSource.select();
                }
            }
            this.pendingLookup = false;
        } finally {
            if (textSource !== null) {
                textSource.cleanup();
            }
        }
    }

    setTextSourceScanLength(textSource, length) {
        textSource.setEndOffset(length);
        if (this.ignoreNodes === null || !textSource.range) {
            return;
        }

        length = textSource.text().length;
        while (textSource.range && length > 0) {
            const nodes = TextSourceRange.getNodesInRange(textSource.range);
            if (!TextSourceRange.anyNodeMatchesSelector(nodes, this.ignoreNodes)) {
                break;
            }
            --length;
            textSource.setEndOffset(length);
        }
    }

    onSearchClear(_) {
        if (this.textSourceCurrent !== null) {
            if (this.options.scanning.selectText) {
                this.textSourceCurrent.deselect();
            }
            this.textSourceCurrent = null;
        }
    }

    getCurrentTextSource() {
        return this.textSourceCurrent;
    }

    setCurrentTextSource(textSource) {
        return this.textSourceCurrent = textSource;
    }

    static isScanningModifierPressed(scanningModifier, mouseEvent) {
        switch (scanningModifier) {
            case 'alt': return mouseEvent.altKey;
            case 'ctrl': return mouseEvent.ctrlKey;
            case 'shift': return mouseEvent.shiftKey;
            case 'none': return true;
            default: return false;
        }
    }

    static getIndexOfTouch(touchList, identifier) {
        for (const i in touchList) {
            const t = touchList[i];
            if (t.identifier === identifier) {
                return i;
            }
        }
        return -1;
    }
}
