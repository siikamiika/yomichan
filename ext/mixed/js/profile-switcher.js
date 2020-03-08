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

class ProfileSwitcher {
    constructor(profiles, selectedIndex=0) {
        this._index = selectedIndex;
        this._profiles = profiles;
    }

    get options() {
        return this._profiles[this._index].profile.options;
    }

    get profile() {
        return this._profiles[this._index].profile;
    }

    get globalProfileIndex() {
        return this._profiles[this._index].index;
    }

    getIndex() {
        return this._index;
    }

    setIndex(index) {
        if (index >= this._profiles.length) {
            throw new Error('Profile index is out of bounds');
        }
        this._index = index;
    }

    getProfiles() {
        return this._profiles;
    }

    getProfileCount() {
        return this._profiles.length;
    }
}
