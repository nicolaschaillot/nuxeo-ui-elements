/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-list/iron-list.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '@polymer/iron-scroll-threshold/iron-scroll-threshold.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import '../nuxeo-aggregation/nuxeo-aggregation-navigation.js';
import { DraggableListBehavior } from '../nuxeo-draggable-list-behavior.js';
import { PageProviderDisplayBehavior } from '../nuxeo-page-provider-display-behavior.js';

{
  /**
   * An element to display page provider results as a grid with infinite scrolling.
   *
   *     <nuxeo-page-provider id="cvProvider" auto
   *                          provider="default_search"
   *                          page-size="40"
   *                          enrichers="thumbnail"
   *                          params='{"ecm_path": ["/default-domain/workspaces"]}'>
   *     </nuxeo-page-provider>
   *
   *     <nuxeo-data-grid nx-provider="nxProvider" selection-enabled>
   *       <template>
   *         <div class="list-item-box vertical layout">
   *           <div class="list-item-info horizontal layout center">
   *             <div class="vertical layout center">
   *               <img class="nxicon" src="[[_thumbnail(item)]]">
   *             </div>
   *             <span class="list-item-title">[[item.title]]</span>
   *           </div>
   *           <div class="list-item-detail">
   *             <div class="layout center">
   *               <span class="list-item-property">
   *                 [[item.type]]
   *               </span>
   *             </div>
   *           </div>
   *         </div>
   *       </template>
   *     </nuxeo-data-grid>
   *
   * @appliesMixin Polymer.IronResizableBehavior
   * @appliesMixin Nuxeo.PageProviderDisplayBehavior
   * @appliesMixin Nuxeo.DraggableListBehavior
   * @memberof Nuxeo
   * @demo demo/nuxeo-data-grid/index.html
   */
  class DataGrid
    extends mixinBehaviors([IronResizableBehavior, PageProviderDisplayBehavior,
      DraggableListBehavior], Nuxeo.Element) {
    static get template() {
      return html`
    <style>
      :host {
        display: block;
        min-height: 500px;
        position: relative;
      }

      /* scrollbars */
      :host ::-webkit-scrollbar-track {
        width: 12px !important;
        height: 3px;
      }
      :host ::-webkit-scrollbar {
        background-color: rgba(0, 0, 0, 0.03);
        width: 12px !important;
        height: 3px;
      }
      :host ::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.15);
        border-radius: 1px !important;
      }

      #container {
        @apply --layout-vertical;
        @apply --layout-fit;
      }

      .header {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .emptyResult {
        opacity: .5;
        display: block;
        font-weight: 300;
        padding: 1.5em .7em;
        text-align: center;
        font-size: 1.1rem;
      }

      .filters > * {
        margin: 1em 0 0 2.3em;
      }

      .filter {
        display: inline-block;
        background-color: var(--nuxeo-tag-background);
        padding: .2rem .4rem;
        margin: 0 .3em .1em 0;
        font-size: .8rem;
        border-radius: 2.5em;
        line-height: initial;
      }

      .filter .remove:hover {
        cursor: pointer;
      }

      iron-list {
        height: 100%;
      }

      nuxeo-aggregation-navigation {
        position: absolute;
        top: 82px;
        bottom: 0;
        right: 12px;
      }

      :host([draggable]) ::slotted([selected]) {
        cursor: -webkit-grab;
        cursor: grab;
      }
    </style>

    <div id="container">

      <slot name="nuxeo-selection-toolbar"></slot>

      <div class="header">

        <div id="filters" class="filters">
          <dom-repeat items="[[filters]]" as="filter">
            <template>
              <span class="tag filter">
                [[filter.name]]: [[filter.value]]
                <iron-icon icon="nuxeo:remove" class="remove" on-click="_removeFilter"></iron-icon>
              </span>
            </template>
          </dom-repeat>
        </div>
      </div>

      <dom-if if="[[_isEmpty]]">
        <template>
          <div class="emptyResult">[[_computedEmptyLabel]]</div>
        </template>
      </dom-if>

      <iron-list
        id="list"
        items="[[items]]"
        as="[[as]]"
        grid=""
        selection-enabled=""
        selected-item="{{selectedItem}}"
        selected-items="{{selectedItems}}"
        on-scroll="_scrollChanged">
        <slot></slot>
      </iron-list>

      <dom-if if="[[displayNavigation]]">
        <template>
          <nuxeo-aggregation-navigation buckets="[[buckets]]" on-scroll-to="_onScrollTo"></nuxeo-aggregation-navigation>
        </template>
      </dom-if>

    </div>
`;
    }

    static get is() {
      return 'nuxeo-data-grid';
    }

    static get properties() {
      return {
        /**
         * If enabled, it allows to select multiple documents and apply an action on them,
         * like moving them to trash, to favorites or to a collection.
         */
        multiSelection: {
          type: Boolean,
          value: true,
        },
        /**
         * If enabled, it allows the aggregation navigation on the right side of the search results view.
         * For instance, if you use grid view you can filter using a timeline.
         * This parameter only works when list sorted by histogram aggregations.
         */
        displayNavigation: {
          type: Boolean,
          value: false,
        },
      };
    }

    _removeFilter(e) {
      this.dispatchEvent(new CustomEvent('column-filter-changed', {
        composed: true,
        bubbles: true,
        detail: { value: '', filterBy: e.model.filter.path },
      }));
    }

    _onScrollTo(e) {
      this.scrollToIndex(e.detail.index);
    }

    draggableFilter(el) {
      return el.selected;
    }

    get visible() {
      return Boolean(this.offsetWidth || this.offsetHeight);
    }
  }

  customElements.define(DataGrid.is, DataGrid);
  Nuxeo.DataGrid = DataGrid;
}
