// ==UserScript==
// @name         Wikidata Link Suggester
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Suggest properties and values from links
// @author       Lockal
// @match        https://test.wikidata.org/wiki/*
// @match        https://www.wikidata.org/wiki/*
// @icon         https://www.wikidata.org/static/favicon/wikidata.ico
// @grant        unsafeWindow
// ==/UserScript==

/* eslint-disable unicorn/prefer-module */
/* eslint-env browser */
/* global unsafeWindow */

// How to edit userscripts with your favorite editor:
// https://violentmonkey.github.io/posts/how-to-edit-scripts-with-your-favorite-editor/

(function () {
	'use strict';

	// For release:
	const reflectEndpoint = 'https://reflector.toolforge.org/api/v1/reflect';
	// For debugging:
	// const reflectEndpoint = 'http://localhost:5173/api/v1/reflect';

	const attachUserscript = fn => {
		const config = unsafeWindow.RLCONF;
		if (config === undefined) {
			return;
		}

		const contentModel = config.wgPageContentModel;
		const isProbablyEditable = config.wgIsProbablyEditable;
		const isRedirect = config.wgIsRedirect;
		const isEditView = config.wbIsEditView;

		if (!['wikibase-item', 'wikibase-property', 'wikibase-lexeme'].includes(contentModel) || !isProbablyEditable || isRedirect || !isEditView) {
			return;
		}

		// Install global variable to disallow multiple versions
		if (unsafeWindow.wgReflectorLoaded) {
			console.log('Wikidata Link Reflector: not loaded, because other version was already loaded');
			return;
		}

		unsafeWindow.wgReflectorLoaded = true;

		(new window.MutationObserver((_changes, observer) => {
			if (unsafeWindow.jQuery?.ui && unsafeWindow.mw?.hook) {
				fn(unsafeWindow.jQuery, unsafeWindow.mw);
				observer.disconnect();
			}
		})).observe(document, {childList: true, subtree: true});
	};

	attachUserscript(($, mw) => {
		const fillPropertyWithValue = (propInput, suggestion) => {
			const entityselector = propInput.data('entityselector');
			const snakValueNode = propInput.closest('.wikibase-snakview').data('snakview').$snakValue[0];
			(new window.MutationObserver((changes, observer) => {
				for (const change of changes) {
					for (const addedNode of change.addedNodes) {
						if (addedNode.classList.contains('valueview-input')) {
							// Set the value and notify view about change
							$(addedNode).val(suggestion.value).trigger('input');
							observer.disconnect();
						}
					}
				}
			})).observe(snakValueNode, {childList: true, subtree: true});

			const propertyLabel = suggestion.label || suggestion.id;
			entityselector.element.val(propertyLabel);
			entityselector._select(suggestion);
			entityselector._close();
		};

		const createLabelFromSuggestion = (element, suggestion) => {
			const $label = $('<span>', {class: 'ui-entityselector-label'}).text(suggestion.label || suggestion.id);
			const $description = $('<span>', {class: 'ui-entityselector-description'});

			if (suggestion.description && suggestion.description.length > 0) {
				$description.text(suggestion.description);
			}

			const $linkBlock = $('<span>', {class: 'ui-entityselector-itemcontent'}).append($label).append($description);
			const action = () => {
				fillPropertyWithValue(element, suggestion);
			};

			const url = '/wiki/Property:' + suggestion.id;
			const item = new $.ui.ooMenu.CustomItem($linkBlock, null, action, null, url);
			item.source = 'lsuggester-tool';
			return item;
		};

		const getContext = element => {
			if (element.closest('.wikibase-statementview-qualifiers').length > 0) {
				return 'qualifier';
			}

			if (element.closest('.wikibase-statementview-references').length > 0) {
				return 'reference';
			}

			if (element.closest('.wikibase-statementview-mainsnak').length > 0) {
				return 'mainsnak';
			}

			return 'other';
		};

		const getPropertyId = element => {
			try {
				return element.closest('.wikibase-statementlistview').find('.wikibase-statementview-mainsnak .wikibase-snakview.wb-edit').data('snakview')?.propertyId();
			} catch {
				// Pass
			}
		};

		const getSubpropertyId = element => {
			try {
				return element.closest('.wikibase-snakview').data('snakview')?.propertyId();
			} catch {
				// Pass
			}
		};

		const reflect = async options => {
			const response = await fetch(reflectEndpoint + '?' + new URLSearchParams(options).toString());
			const responseData = await response.json();
			return responseData.items;
		};

		const canBeReflected = term => {
			if (/^https?:\/\/(?:www\.|m\.|test\.)?wikidata\.org\//.test(term)) {
				return false;
			}

			if (!/^https?:\/\//.test(term)) {
				return false;
			}

			return true;
		};

		const onEntityselectorSearch = ({element, options, term}, addPromise) => {
			if (['item', 'property'].includes(options.type) && !canBeReflected(term)) {
				return;
			}

			// Assuming context === 'predicate' => type === 'property'
			// eslint-disable-next-line no-unused-vars
			const context = element.closest('.wikibase-snakview-property-container').length > 0 ? 'predicate' : 'value';
			const subcontext = getContext(element);
			const type = options.type;
			const lang = options.language;
			// eslint-disable-next-line no-unused-vars
			const property = subcontext === 'qualifier' || subcontext === 'reference' ? getPropertyId(element) : undefined;

			// Remove old entries, if any
			options.menu.option('customItems', options.menu.option('customItems').filter(x => x.source !== 'lsuggester-tool'));

			// Attach random value to input to track and prevent race conditions
			const oracle = Math.random();
			element.linkSuggesterLoadOracle = oracle;

			const load = async () => {
				let suggestions;
				try {
					suggestions = await reflect({url: term, lang, type});
				} catch (error) {
					console.error('Wikidata Link Reflector: Unable to call reflect API', error.message);
					return [];
				}

				if (element.linkSuggesterLoadOracle !== oracle) {
					// Reject obsolete request
					return [];
				}

				if (suggestions.length > 0) {
					const customItems = options.menu.option('customItems');
					for (const option of customItems) {
						if (option.getCssClass() === 'ui-entityselector-notfound') {
							option.setVisibility(false);
							break;
						}
					}

					customItems.unshift(...suggestions.map(suggestion => createLabelFromSuggestion(element, suggestion)));
				}

				return [];
			};

			addPromise(load());
		};

		mw.hook('wikibase.entityselector.search').add(onEntityselectorSearch);

		// Suggester for string inputs
		$.widget('ui.wikidatalinkreflectorsuggester', $.ui.suggester, {
			_create() {
				$.ui.suggester.prototype._create.call(this);
				this.options.menu.element.addClass('ui-entityselector-list');
			},

			destroy() {
				$.ui.suggester.prototype.destroy.call(this);
			},

			_getSuggestions(term) {
				// Hello darling my old jquery... Caller expects to see done(), so no promises here.
				// eslint-disable-next-line new-cap
				const deferred = $.Deferred();
				if (!canBeReflected(term)) {
					return deferred.resolve([], term).promise();
				}

				const property = this.options.subproperty ?? this.options.property;
				const lang = this.options.language;
				reflect({url: term, property, lang})
					.then(items => deferred.resolve(items, term)).catch(error => deferred.reject(error));

				return deferred.promise();
			},

			_createMenuItemFromSuggestion(suggestion) {
				const $label = $('<span>', {class: 'ui-entityselector-label'}).text(suggestion.value);
				const $description = $('<span>', {class: 'ui-entityselector-description'}).text('Automatically generated from link');
				const $item = $('<span>', {class: 'ui-entityselector-itemcontent'}).append($label).append($description);
				const value = suggestion.value;
				return new $.ui.ooMenu.Item($item, value, null);
			},

			_initMenu(ooMenu) {
				$.ui.suggester.prototype._initMenu.call(this, ooMenu);

				$(this.options.menu)
					.on('selected.suggester', () => {
						// Notify the view about the change
						this.element.trigger('eachchange');
						// Clear menu, so it does not resuggest value on click
						this.options.menu.option('items', []);
					});

				return ooMenu;
			},
		});

		const createValueSuggester = ($input, options) => {
			$input.wikidatalinkreflectorsuggester(options);
			// Remove focus from the original text field
			$input.off('blur');
		};

		$('.wikibase-statementgrouplistview', this).on('valueviewafterstartediting', event => {
			const element = $(event.target);
			const $input = element.find('.valueview-expert-StringValue-input');

			if ($input.length === 0) {
				return; // Not a StringValue statement
			}

			const subcontext = getContext(element);
			const property = getPropertyId(element);
			const subproperty = subcontext === 'qualifier' || subcontext === 'reference' ? getSubpropertyId(element) : undefined;
			const language = mw.config.get('wgUserLanguage');

			createValueSuggester($input, {subcontext, property, subproperty, language});
		});

		console.log('Wikidata Link Reflector: gadget loaded');
	});
})();
