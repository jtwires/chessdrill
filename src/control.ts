import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

import * as types from './types';
import { Tree, TreeIterator } from './tree';

export default class Control {
  public readonly options: types.Options;
  private readonly redraw: () => void;

  private status: types.Status;
  private result: types.Result;
  private promotion: types.Move | undefined;

  private tree: Tree;
  private line: TreeIterator;

  private _api: Api;

  constructor(options: types.Options, redraw: () => void) {
    this.options = options;
    this.redraw = redraw;
    this.status = 'new';
    this.result = 'incomplete';

    this.tree = new Tree(this.options.lines);
    this.line = this.tree.iterator();

    if (this.options.mode === 'review') {
      for (let move of this.line.mainline()) {
        this.line.push(move);
      }
      this.line.first();
    }
  }

  get api(): Api {
    return this._api;
  }

  set api(api: Api) {
    this.destroy();
    this._api = api;
    this.update();
  }

  public getStatus(): types.Status {
    return this.status;
  }

  public getResult(): types.Result {
    return this.result;
  }

  public getColor(): types.Color {
    return this.line.color();
  }

  public getComment(): string | undefined {
    return this.line.comment();
  }

  public navigate(position: types.Position) {
    switch (position) {
      case 'first':
        this.line.first();
        break;
      case 'next':
        this.line.next();
        break;
      case 'prev':
        this.line.prev();
        break;
      case 'last':
        this.line.last();
        break;
    }
    this.update();
    this.redraw();
  }

  public update() {
    this.withApi(
      api => api.set(
        {
          fen: this.line.fen(),
          lastMove: this.lastmove(),
          turnColor: this.line.color(),
          check: this.line.check(),
          viewOnly: this.options.mode === 'review' || this.result !== 'incomplete',
          movable: {
            free: false,
            color: this.line.color(),
            dests: this.line.destinations(),
            events: { after: (orig: Key, dest: Key) => this.checkMove(orig, dest) }
          }
        }
      )
    );
  }

  public destroy() {
    this.withApi(api => api.destroy());
  }

  private withApi<T>(f: (api: Api) => T): T | undefined {
    if (this._api === undefined) {
      return undefined;
    }
    return f(this._api);
  }

  private setResult(result: types.Result) {
    if (this.result === 'incomplete') {
      this.result = result;
    }
  }

  private lastmove(): Key[] | undefined {
    const move = this.line.lastmove();
    if (!move) {
      return undefined;
    }
    return [move.orig, move.dest];
  }

  private checkMove(orig: Key, dest: Key) {
    if (this.promotionStart(orig, dest)) {
      this.redraw();
      return;
    }
    this.updateStatus(orig, dest);
    this.makeResponse();
  }

  private makeResponse() {
    if (this.status !== 'mainline') {
      return;
    }
    if (this.result !== 'incomplete') {
      return;
    }
    setTimeout(
      () => {
        let continuations = this.line.peek();
        if (continuations.length > 0) {
          this.line.push(continuations[0]);
          continuations = this.line.peek();
        }
        if (continuations.length === 0) {
          this.setResult('success');
        }
        this.update();
        this.redraw();
      },
      500
    );
  }

  private updateStatus(orig: Key, dest: Key, promotion?: types.Role) {
    console.log(`orig ${orig} dest ${dest} role ${promotion}`);

    const isMatch = (m: types.Move) => {
      return orig === m.orig && dest === m.dest && promotion === m.promotion;
    };

    const [mainline, ...variations] = this.line.peek();
    if (mainline !== undefined && isMatch(mainline)) {
      this.status = 'mainline';
      this.line.push(mainline);
    } else if (variations !== undefined
      && variations.some((m: types.Move) => isMatch(m))) {
      this.status = 'variation';
    } else {
      this.setResult('failure');
      this.status = 'mistake';
    }

    this.update();
    this.redraw();
  }

  public getPromotion(): types.Move | undefined {
    return this.promotion;
  }

  private promotionStart(orig: Key, dest: Key): boolean {
    const piece = this.api.state.pieces[dest];
    if (piece === undefined || piece.role !== 'pawn') {
      return false;
    }
    if (this.api.state.turnColor === 'black' && dest[1] !== '8') {
      return false;
    }
    if (this.api.state.turnColor === 'white' && dest[1] !== '1') {
      return false;
    }
    this.promotion = { orig: orig as types.Square, dest: dest as types.Square };
    return true;
  }

  public promotionFinish(role: types.Role) {
    const promotion = this.promotion;
    this.promotion = undefined;
    if (promotion === undefined) {
      return;
    }
    const piece = this.api.state.pieces[promotion.dest];
    if (piece === undefined || piece.role !== 'pawn') {
      return;
    }
    this.updateStatus(promotion.orig, promotion.dest, role);
    this.makeResponse();
  }

  public promotionCancel() {
    this.promotion = undefined;
    this.redraw();
  }
}
