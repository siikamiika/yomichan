/*
 * Copyright (C) 2020  Yomichan Authors
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


class Environment {
    constructor() {
        this._cachedEnvironmentInfo = null;
    }

    async prepare() {
        this._cachedEnvironmentInfo = await this._loadEnvironmentInfo();
    }

    getInfo() {
        if (this._cachedEnvironmentInfo === null) { throw new Error('Not prepared'); }
        return this._cachedEnvironmentInfo;
    }

    async _loadEnvironmentInfo() {
        const browser = await this._getBrowser();
        const platform = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
        const modifierKeys = this._getModifierKeys(browser, platform.os);
        return {
            browser,
            platform: {
                os: platform.os
            },
            modifierKeys
        };
    }

    async _getBrowser() {
        if (EXTENSION_IS_BROWSER_EDGE) {
            return 'edge';
        }
        if (typeof browser !== 'undefined') {
            try {
                const info = await browser.runtime.getBrowserInfo();
                if (info.name === 'Fennec') {
                    return 'firefox-mobile';
                }
            } catch (e) {
                // NOP
            }
            return 'firefox';
        } else {
            return 'chrome';
        }
    }

    _getModifierKeys(browser, os) {
        let osModifierKeys;
        if (os === 'win') {
            osModifierKeys = [
                ['alt', 'Alt'],
                ['ctrl', 'Ctrl'],
                ['shift', 'Shift'],
                ['meta', 'Windows']
            ];
        } else if (os === 'mac') {
            osModifierKeys = [
                ['alt', 'Option'],
                ['ctrl', 'Control'],
                ['shift', 'Shift'],
                ['meta', 'Command']
            ];
        } else if (os === 'linux' || os === 'openbsd' || os === 'cros' || os === 'android') {
            osModifierKeys = [
                ['alt', 'Alt'],
                ['ctrl', 'Ctrl'],
                ['shift', 'Shift'],
                ['meta', 'Super']
            ];
        } else {
            throw new Error('Invalid OS');
        }

        const isFirefox = (browser === 'firefox' || browser === 'firefox-mobile');
        const modifierKeys = [];

        for (const [value, name] of osModifierKeys) {
            // Firefox doesn't support event.metaKey on platforms other than macOS
            if (value === 'meta' && isFirefox && os !== 'mac') { continue; }
            modifierKeys.push({value, name});
        }

        return modifierKeys;
    }
}
