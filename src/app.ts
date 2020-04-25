import { init } from 'snabbdom';
import { VNode } from 'snabbdom/vnode';
import klass from 'snabbdom/modules/class';
import attributes from 'snabbdom/modules/attributes';
import listeners from 'snabbdom/modules/eventlisteners';
import page from 'page';

import Chessdrill from './chessdrill';
import * as types from './types';

export function run(element: Element, opts: types.Options) {
  const patch = init([klass, attributes, listeners]);
  let drill: Chessdrill, vnode: VNode;

  function redraw() {
    vnode = patch(vnode || element, drill.render());
  }

  drill = new Chessdrill(opts, redraw);

  page('/', redraw);
  page({ click: false, popstate: false, hashbang: true });
}
