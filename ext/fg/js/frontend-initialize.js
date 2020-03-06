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

/*global PopupProxyHost, PopupProxy, Frontend*/

async function main() {
    await yomichan.prepare();

    const data = window.frontendInitializationData || {};
    const {id, depth=0, parentFrameId, url, proxy=false} = data;

    let popup;
    if (proxy) {
        popup = new PopupProxy(null, depth + 1, id, parentFrameId, url);
    } else {
        const popupHost = new PopupProxyHost();
        await popupHost.prepare();

        popup = popupHost.getOrCreatePopup();
    }

    const frontend = new Frontend(popup);
    await frontend.prepare();
}

main();
