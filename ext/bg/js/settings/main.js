/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

async function getOptionsArray() {
    const optionsFull = await apiOptionsGetFull();
    return optionsFull.profiles.map((profile) => profile.options);
}

async function formRead(options) {
    options.general.enable = $('#enable').prop('checked');
    options.general.showGuide = $('#show-usage-guide').prop('checked');
    options.general.compactTags = $('#compact-tags').prop('checked');
    options.general.compactGlossaries = $('#compact-glossaries').prop('checked');
    options.general.resultOutputMode = $('#result-output-mode').val();
    options.general.debugInfo = $('#show-debug-info').prop('checked');
    options.general.showAdvanced = $('#show-advanced-options').prop('checked');
    options.general.maxResults = parseInt($('#max-displayed-results').val(), 10);
    options.general.popupDisplayMode = $('#popup-display-mode').val();
    options.general.popupHorizontalTextPosition = $('#popup-horizontal-text-position').val();
    options.general.popupVerticalTextPosition = $('#popup-vertical-text-position').val();
    options.general.popupWidth = parseInt($('#popup-width').val(), 10);
    options.general.popupHeight = parseInt($('#popup-height').val(), 10);
    options.general.popupHorizontalOffset = parseInt($('#popup-horizontal-offset').val(), 0);
    options.general.popupVerticalOffset = parseInt($('#popup-vertical-offset').val(), 10);
    options.general.popupHorizontalOffset2 = parseInt($('#popup-horizontal-offset2').val(), 0);
    options.general.popupVerticalOffset2 = parseInt($('#popup-vertical-offset2').val(), 10);
    options.general.popupTheme = $('#popup-theme').val();
    options.general.popupOuterTheme = $('#popup-outer-theme').val();
    options.general.customPopupCss = $('#custom-popup-css').val();
    options.general.customPopupOuterCss = $('#custom-popup-outer-css').val();

    options.audio.enabled = $('#audio-playback-enabled').prop('checked');
    options.audio.autoPlay = $('#auto-play-audio').prop('checked');
    options.audio.volume = parseFloat($('#audio-playback-volume').val());
    options.audio.customSourceUrl = $('#audio-custom-source').val();
    options.audio.textToSpeechVoice = $('#text-to-speech-voice').val();

    options.scanning.middleMouse = $('#middle-mouse-button-scan').prop('checked');
    options.scanning.touchInputEnabled = $('#touch-input-enabled').prop('checked');
    options.scanning.selectText = $('#select-matched-text').prop('checked');
    options.scanning.alphanumeric = $('#search-alphanumeric').prop('checked');
    options.scanning.autoHideResults = $('#auto-hide-results').prop('checked');
    options.scanning.deepDomScan = $('#deep-dom-scan').prop('checked');
    options.scanning.enablePopupSearch = $('#enable-search-within-first-popup').prop('checked');
    options.scanning.enableOnPopupExpressions = $('#enable-scanning-of-popup-expressions').prop('checked');
    options.scanning.enableOnSearchPage = $('#enable-scanning-on-search-page').prop('checked');
    options.scanning.delay = parseInt($('#scan-delay').val(), 10);
    options.scanning.length = parseInt($('#scan-length').val(), 10);
    options.scanning.modifier = $('#scan-modifier-key').val();
    options.scanning.popupNestingMaxDepth = parseInt($('#popup-nesting-max-depth').val(), 10);

    options.parsing.enableScanningParser = $('#parsing-scan-enable').prop('checked');
    options.parsing.enableMecabParser = $('#parsing-mecab-enable').prop('checked');
    options.parsing.readingMode = $('#parsing-reading-mode').val();

    const optionsAnkiEnableOld = options.anki.enable;
    options.anki.enable = $('#anki-enable').prop('checked');
    options.anki.tags = utilBackgroundIsolate($('#card-tags').val().split(/[,; ]+/));
    options.anki.sentenceExt = parseInt($('#sentence-detection-extent').val(), 10);
    options.anki.server = $('#interface-server').val();
    options.anki.screenshot.format = $('#screenshot-format').val();
    options.anki.screenshot.quality = parseInt($('#screenshot-quality').val(), 10);
    options.anki.fieldTemplates = $('#field-templates').val();

    if (optionsAnkiEnableOld && !ankiErrorShown()) {
        options.anki.terms.deck = $('#anki-terms-deck').val();
        options.anki.terms.model = $('#anki-terms-model').val();
        options.anki.terms.fields = utilBackgroundIsolate(ankiFieldsToDict(document.querySelectorAll('#terms .anki-field-value')));
        options.anki.kanji.deck = $('#anki-kanji-deck').val();
        options.anki.kanji.model = $('#anki-kanji-model').val();
        options.anki.kanji.fields = utilBackgroundIsolate(ankiFieldsToDict(document.querySelectorAll('#kanji .anki-field-value')));
    }
}

async function formWrite(options) {
    $('#enable').prop('checked', options.general.enable);
    $('#show-usage-guide').prop('checked', options.general.showGuide);
    $('#compact-tags').prop('checked', options.general.compactTags);
    $('#compact-glossaries').prop('checked', options.general.compactGlossaries);
    $('#result-output-mode').val(options.general.resultOutputMode);
    $('#show-debug-info').prop('checked', options.general.debugInfo);
    $('#show-advanced-options').prop('checked', options.general.showAdvanced);
    $('#max-displayed-results').val(options.general.maxResults);
    $('#popup-display-mode').val(options.general.popupDisplayMode);
    $('#popup-horizontal-text-position').val(options.general.popupHorizontalTextPosition);
    $('#popup-vertical-text-position').val(options.general.popupVerticalTextPosition);
    $('#popup-width').val(options.general.popupWidth);
    $('#popup-height').val(options.general.popupHeight);
    $('#popup-horizontal-offset').val(options.general.popupHorizontalOffset);
    $('#popup-vertical-offset').val(options.general.popupVerticalOffset);
    $('#popup-horizontal-offset2').val(options.general.popupHorizontalOffset2);
    $('#popup-vertical-offset2').val(options.general.popupVerticalOffset2);
    $('#popup-theme').val(options.general.popupTheme);
    $('#popup-outer-theme').val(options.general.popupOuterTheme);
    $('#custom-popup-css').val(options.general.customPopupCss);
    $('#custom-popup-outer-css').val(options.general.customPopupOuterCss);

    $('#audio-playback-enabled').prop('checked', options.audio.enabled);
    $('#auto-play-audio').prop('checked', options.audio.autoPlay);
    $('#audio-playback-volume').val(options.audio.volume);
    $('#audio-custom-source').val(options.audio.customSourceUrl);
    $('#text-to-speech-voice').val(options.audio.textToSpeechVoice).attr('data-value', options.audio.textToSpeechVoice);

    $('#middle-mouse-button-scan').prop('checked', options.scanning.middleMouse);
    $('#touch-input-enabled').prop('checked', options.scanning.touchInputEnabled);
    $('#select-matched-text').prop('checked', options.scanning.selectText);
    $('#search-alphanumeric').prop('checked', options.scanning.alphanumeric);
    $('#auto-hide-results').prop('checked', options.scanning.autoHideResults);
    $('#deep-dom-scan').prop('checked', options.scanning.deepDomScan);
    $('#enable-search-within-first-popup').prop('checked', options.scanning.enablePopupSearch);
    $('#enable-scanning-of-popup-expressions').prop('checked', options.scanning.enableOnPopupExpressions);
    $('#enable-scanning-on-search-page').prop('checked', options.scanning.enableOnSearchPage);
    $('#scan-delay').val(options.scanning.delay);
    $('#scan-length').val(options.scanning.length);
    $('#scan-modifier-key').val(options.scanning.modifier);
    $('#popup-nesting-max-depth').val(options.scanning.popupNestingMaxDepth);

    $('#parsing-scan-enable').prop('checked', options.parsing.enableScanningParser);
    $('#parsing-mecab-enable').prop('checked', options.parsing.enableMecabParser);
    $('#parsing-reading-mode').val(options.parsing.readingMode);

    $('#anki-enable').prop('checked', options.anki.enable);
    $('#card-tags').val(options.anki.tags.join(' '));
    $('#sentence-detection-extent').val(options.anki.sentenceExt);
    $('#interface-server').val(options.anki.server);
    $('#screenshot-format').val(options.anki.screenshot.format);
    $('#screenshot-quality').val(options.anki.screenshot.quality);
    $('#field-templates').val(options.anki.fieldTemplates);

    onAnkiTemplatesValidateCompile();
    await onAnkiOptionsChanged(options);
    await onDictionaryOptionsChanged(options);

    formUpdateVisibility(options);
}

function formSetupEventListeners() {
    $('input, select, textarea').not('.anki-model').not('.ignore-form-changes *').change((e) => onFormOptionsChanged(e));
}

function formUpdateVisibility(options) {
    document.documentElement.dataset.optionsAnkiEnable = `${!!options.anki.enable}`;
    document.documentElement.dataset.optionsGeneralDebugInfo = `${!!options.general.debugInfo}`;
    document.documentElement.dataset.optionsGeneralShowAdvanced = `${!!options.general.showAdvanced}`;
    document.documentElement.dataset.optionsGeneralResultOutputMode = `${options.general.resultOutputMode}`;

    if (options.general.debugInfo) {
        const temp = utilIsolate(options);
        temp.anki.fieldTemplates = '...';
        const text = JSON.stringify(temp, null, 4);
        $('#debug').text(text);
    }
}

async function onFormOptionsChanged() {
    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);

    await formRead(options);
    await settingsSaveOptions();
    formUpdateVisibility(options);

    await onAnkiOptionsChanged(options);
}


function settingsGetSource() {
    return new Promise((resolve) => {
        chrome.tabs.getCurrent((tab) => resolve(`settings${tab ? tab.id : ''}`));
    });
}

async function settingsSaveOptions() {
    const source = await settingsGetSource();
    await apiOptionsSave(source);
}

async function onOptionsUpdate({source}) {
    const thisSource = await settingsGetSource();
    if (source === thisSource) { return; }

    const optionsContext = getOptionsContext();
    const options = await apiOptionsGet(optionsContext);
    await formWrite(options);
}

function onMessage({action, params}, sender, callback) {
    switch (action) {
        case 'optionsUpdate':
            onOptionsUpdate(params);
            break;
        case 'getUrl':
            callback({url: window.location.href});
            break;
    }
}


function showExtensionInformation() {
    const node = document.getElementById('extension-info');
    if (node === null) { return; }

    const manifest = chrome.runtime.getManifest();
    node.textContent = `${manifest.name} v${manifest.version}`;
}


async function onReady() {
    showExtensionInformation();

    formSetupEventListeners();
    appearanceInitialize();
    await audioSettingsInitialize();
    await profileOptionsSetup();
    await dictSettingsInitialize();
    ankiInitialize();
    ankiTemplatesInitialize();

    storageInfoInitialize();

    chrome.runtime.onMessage.addListener(onMessage);
}

$(document).ready(() => onReady());
