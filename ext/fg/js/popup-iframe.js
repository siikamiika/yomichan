/*
 * Copyright (C) 2020  Alex Yatskov <alex@foosoft.net>
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

/*global apiForward*/

class PopupIframe {
    constructor(frameId) {
        this._frameId = frameId;
        this._options = null;
    }

    // Public properties

    get parent() {
        return null;
    }

    get depth() {
        return 0;
    }

    get url() {
        return window.location.href;
    }

    // Public functions

    isProxy() {
        return true; // TODO hack
    }

    async setOptions(options) {
        this._options = options;
    }

    hide(_changeFocus) {
        apiForward('popupIframeHide');
    }

    async isVisible() {
        return false;
    }

    setVisibleOverride(_visible) {
        // NOP
    }

    async containsPoint(_x, _y) {
        return false;
    }

    async showContent(elementRect, writingMode, type=null, details=null) {
        const frameId = this._frameId;
        const viewportDimensions = {
            width: document.body.clientWidth,
            height: window.innerHeight
        };
        const elementRectJson = PopupIframe._convertDOMRectToJson(elementRect);
        apiForward('popupIframeShowContent', {frameId, viewportDimensions, elementRectJson, writingMode, type, details});
    }

    clearAutoPlayTimer() {
        // NOP
    }

    setDisplayInitialized() {
        // NOP
    }

    // Private functions

    static _convertDOMRectToJson(domRect) {
        return {
            x: domRect.x,
            y: domRect.y,
            width: domRect.width,
            height: domRect.height
        };
    }
}
