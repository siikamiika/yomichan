/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
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

/*global apiGetZoom, apiOptionsGet, apiTermsFind, apiKanjiFind, docSentenceExtract, TextScanner, apiProfilesGetMatching, ProfileSwitcher*/

class Frontend extends TextScanner {
    constructor(popup, ignoreNodes) {
        super(
            window,
            ignoreNodes,
            popup.isProxy() ? [] : [popup.getContainer()],
            [(x, y) => this.popup.containsPoint(x, y)]
        );

        this.popup = popup;
        this.profileSwitcher = null;

        this.optionsContext = {
            depth: popup.depth,
            url: popup.url
        };

        this._pageZoomFactor = 1.0;
        this._contentScale = 1.0;
        this._orphaned = true;
        this._lastShowPromise = Promise.resolve();

        this._windowMessageHandlers = new Map([
            ['popupClose', () => this.onSearchClear(true)],
            ['selectionCopy', () => document.execCommand('copy')]
        ]);

        this._runtimeMessageHandlers = new Map([
            ['popupSetVisibleOverride', ({visible}) => { this.popup.setVisibleOverride(visible); }]
        ]);
    }

    async prepare() {
        try {
            await this.updateOptions();
            const {zoomFactor} = await apiGetZoom();
            this._pageZoomFactor = zoomFactor;

            window.addEventListener('resize', this.onResize.bind(this), false);

            const visualViewport = window.visualViewport;
            if (visualViewport !== null && typeof visualViewport === 'object') {
                window.visualViewport.addEventListener('scroll', this.onVisualViewportScroll.bind(this));
                window.visualViewport.addEventListener('resize', this.onVisualViewportResize.bind(this));
            }

            yomichan.on('orphaned', this.onOrphaned.bind(this));
            yomichan.on('optionsUpdated', this.updateOptions.bind(this));
            yomichan.on('zoomChanged', this.onZoomChanged.bind(this));
            chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));

            this._updateContentScale();
        } catch (e) {
            this.onError(e);
        }
    }

    onResize() {
        this._updatePopupPosition();
    }

    onWindowMessage(e) {
        const action = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        handler();
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const {targetPopupId} = params || {};
        if (targetPopupId !== 'all' && targetPopupId !== this.popup.id) { return; }

        const handler = this._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(params, sender);
        callback(result);
        return false;
    }

    onOrphaned() {
        this._orphaned = true;
    }

    onZoomChanged({newZoomFactor}) {
        this._pageZoomFactor = newZoomFactor;
        this._updateContentScale();
    }

    onVisualViewportScroll() {
        this._updatePopupPosition();
    }

    onVisualViewportResize() {
        this._updateContentScale();
    }

    getMouseEventListeners() {
        return [
            ...super.getMouseEventListeners(),
            [window, 'message', this.onWindowMessage.bind(this)]
        ];
    }

    async updateOptions() {
        this.optionsContext.url = this.popup.url;
        const profileSwitcher = new ProfileSwitcher(await apiProfilesGetMatching(this.optionsContext));
        this.setOptions(profileSwitcher);
        await this.popup.setOptions(this.profileSwitcher.options);
        this._updateContentScale();
        if (this.textSourceCurrent !== null && this.causeCurrent !== null) {
            await this.onSearchSource(this.textSourceCurrent, this.causeCurrent);
        }
    }

    async onSearchSource(textSource, cause) {
        let results = null;

        try {
            if (textSource !== null) {
                results = (
                    await this.findTerms(textSource) ||
                    await this.findKanji(textSource)
                );
                if (results !== null) {
                    const focus = (cause === 'mouse');
                    this.showContent(textSource, focus, results.definitions, results.type);
                }
            }
        } catch (e) {
            if (this._orphaned) {
                if (textSource !== null && this.profileSwitcher.options.scanning.modifier !== 'none') {
                    this._showPopupContent(textSource, 'orphaned');
                }
            } else {
                this.onError(e);
            }
        } finally {
            if (results === null && this.profileSwitcher.options.scanning.autoHideResults) {
                this.onSearchClear(true);
            }
        }

        return results;
    }

    showContent(textSource, focus, definitions, type) {
        const sentence = docSentenceExtract(textSource, this.profileSwitcher.options.anki.sentenceExt);
        const url = window.location.href;
        this._showPopupContent(
            textSource,
            type,
            {definitions, context: {sentence, url, focus, disableHistory: true}}
        );
    }

    showContentCompleted() {
        return this._lastShowPromise;
    }

    async findTerms(textSource) {
        this.setTextSourceScanLength(textSource, this.profileSwitcher.options.scanning.length);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const {definitions, length} = await apiTermsFind(searchText, {}, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length);

        return {definitions, type: 'terms'};
    }

    async findKanji(textSource) {
        this.setTextSourceScanLength(textSource, 1);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const definitions = await apiKanjiFind(searchText, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        return {definitions, type: 'kanji'};
    }

    onSearchClear(changeFocus) {
        this.popup.hide(changeFocus);
        this.popup.clearAutoPlayTimer();
        super.onSearchClear(changeFocus);
    }

    getOptionsContext() {
        return {
            id: this.profileSwitcher.globalProfileIndex
        };
    }

    _showPopupContent(textSource, type=null, details=null) {
        this._lastShowPromise = this.popup.showContent(
            textSource.getRect(),
            textSource.getWritingMode(),
            type,
            details
        );
        return this._lastShowPromise;
    }

    _updateContentScale() {
        const {popupScalingFactor, popupScaleRelativeToPageZoom, popupScaleRelativeToVisualViewport} = this.profileSwitcher.options.general;
        let contentScale = popupScalingFactor;
        if (popupScaleRelativeToPageZoom) {
            contentScale /= this._pageZoomFactor;
        }
        if (popupScaleRelativeToVisualViewport) {
            contentScale /= Frontend._getVisualViewportScale();
        }
        if (contentScale === this._contentScale) { return; }

        this._contentScale = contentScale;
        this.popup.setContentScale(this._contentScale);
        this._updatePopupPosition();
    }

    async _updatePopupPosition() {
        const textSource = this.getCurrentTextSource();
        if (textSource !== null && await this.popup.isVisible()) {
            this._showPopupContent(textSource);
        }
    }

    static _getVisualViewportScale() {
        const visualViewport = window.visualViewport;
        return visualViewport !== null && typeof visualViewport === 'object' ? visualViewport.scale : 1.0;
    }
}
