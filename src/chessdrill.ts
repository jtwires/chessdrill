import * as types from './types';
import Control from './control';
import View from './view';

export default class Chessdrill {
  private ctrl: Control;
  private view: View;

  constructor(element: Element, opts: types.Options) {
    this.ctrl = new Control(opts, () => this.redraw());
    this.view = new View(this.ctrl, element);
  }

  public redraw() {
    this.view.redraw();
  }
}
