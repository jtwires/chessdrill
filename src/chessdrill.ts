import { VNode } from 'snabbdom/vnode';

import Control from './control';
import View from './view';

export default class Chessdrill {
  private ctrl: Control;
  private view: View;

  constructor(opts, redraw: () => void) {
    this.ctrl = new Control(opts, redraw);
    this.view = new View(this.ctrl);
  }

  public render(): VNode {
    return this.view.render();
  }
}
