import page from 'page';

import Chessdrill from './chessdrill';
import * as types from './types';

export function run(element: Element, opts: types.Options) {
  const drill = new Chessdrill(element, opts);
  page('/', () => drill.redraw());
  page({ click: false, popstate: false, hashbang: true });
}
