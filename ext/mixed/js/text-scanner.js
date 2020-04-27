/*
 * Copyright (C) 2019-2020  Yomichan Authors
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

/* global
 * DOM
 * TextSourceRange
 * docRangeFromPoint
 */

class TextScanner {
    constructor(node, ignoreElements, ignorePoints) {
        this.node = node;
        this.ignoreElements = ignoreElements;
        this.ignorePoints = ignorePoints;

        this.ignoreNodes = null;

        this.scanTimerPromise = null;
        this.causeCurrent = null;
        this.textSourceCurrent = null;
        this.pendingLookup = false;
        this.options = null;

        this.enabled = false;
        this.eventListeners = new EventListenerCollection();

        this.primaryTouchIdentifier = null;
        this.preventNextContextMenu = false;
        this.preventNextMouseDown = false;
        this.preventNextClick = false;
        this.preventScroll = false;

        this.keyCombinations = [];
        this.isScanModifierNone = false;
    }

    onMouseOver(e) {
        if (this.ignoreElements().includes(e.target)) {
            this.scanTimerClear();
        }
    }

    onMouseMove(e) {
        this.scanTimerClear();

        if (this.pendingLookup || DOM.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const scanningOptions = this.options.scanning;
        if (!(
            this.isScanningKeyCombinationActive(e) ||
            (scanningOptions.middleMouse && DOM.isMouseButtonDown(e, 'auxiliary'))
        )) {
            return;
        }

        const search = async () => {
            if (this.isScanModifierNone) {
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
        if (DOM.isPointInSelection(primaryTouch.clientX, primaryTouch.clientY, window.getSelection())) {
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
            TextScanner.getTouch(e.changedTouches, this.primaryTouchIdentifier) === null
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

        const primaryTouch = TextScanner.getTouch(e.changedTouches, this.primaryTouchIdentifier);
        if (primaryTouch === null) {
            return;
        }

        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchMove');

        e.preventDefault(); // Disable scroll
    }

    async onSearchSource(_textSource, _cause) {
        throw new Error('Override me');
    }

    onError(error) {
        yomichan.logError(error);
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

    setEnabled(enabled, canEnable) {
        if (enabled && canEnable) {
            if (!this.enabled) {
                this.hookEvents();
                this.enabled = true;
            }
        } else {
            if (this.enabled) {
                this.eventListeners.removeAllEventListeners();
                this.enabled = false;
            }
            this.onSearchClear(false);
        }
    }

    hookEvents() {
        let eventListenerInfos = this.getMouseEventListeners();
        if (this.options.scanning.touchInputEnabled) {
            eventListenerInfos = eventListenerInfos.concat(this.getTouchEventListeners());
        }

        for (const [node, type, listener, options] of eventListenerInfos) {
            this.eventListeners.addEventListener(node, type, listener, options);
        }
    }

    getMouseEventListeners() {
        return [
            [this.node, 'mousedown', this.onMouseDown.bind(this)],
            [this.node, 'mousemove', this.onMouseMove.bind(this)],
            [this.node, 'mouseover', this.onMouseOver.bind(this)],
            [this.node, 'mouseout', this.onMouseOut.bind(this)]
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

    setOptions(options, canEnable=true) {
        this.options = options;
        this.setEnabled(this.options.general.enable, canEnable);
        this.keyCombinations = options.scanning.keyCombinations
            .map((keyCombination) => this.parseKeyCombination(keyCombination));
        this.isScanModifierNone = (
            this.keyCombinations.length === 0 ||
            this.keyCombinations.some((keyCombination) => keyCombination.mouseEventProperties.size === 0)
        );
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
            try {
                if (this.textSourceCurrent !== null && this.textSourceCurrent.equals(textSource)) {
                    return;
                }

                this.pendingLookup = true;
                const result = await this.onSearchSource(textSource, cause);
                if (result !== null) {
                    this.causeCurrent = cause;
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
        } catch (e) {
            this.onError(e);
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

    parseKeyCombination(keyCombination) {
        const mouseEventProperties = new Set();
        for (const keyCombinationPart of keyCombination.split(/\s+/g)) {
            if (keyCombinationPart === '') { continue; }
            const [type, value] = keyCombinationPart.split('.');
            switch (type) {
                case 'MouseEvent':
                    mouseEventProperties.add(value);
                    break;
                default:
                    throw new Error(`Unable to parse key combination part: ${keyCombinationPart}`);
            }
        }
        return {mouseEventProperties};
    }

    isScanningKeyCombinationActive(mouseEvent) {
        if (this.isScanModifierNone) { return true; }
        for (const {mouseEventProperties} of this.keyCombinations) {
            if (setDifference(mouseEventProperties, this.getActiveModifiers(mouseEvent)).size !== 0) { continue; }
            return true;
        }
        return false;
    }

    getActiveModifiers(mouseEvent) {
        const modifiers = new Set();
        if (mouseEvent.altKey) { modifiers.add('altKey'); }
        if (mouseEvent.ctrlKey) { modifiers.add('ctrlKey'); }
        if (mouseEvent.metaKey) { modifiers.add('metaKey'); }
        if (mouseEvent.shiftKey) { modifiers.add('shiftKey'); }
        return modifiers;
    }

    static getTouch(touchList, identifier) {
        for (const touch of touchList) {
            if (touch.identifier === identifier) {
                return touch;
            }
        }
        return null;
    }
}
