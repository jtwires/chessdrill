import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

import * as types from './types';
import { Tree, TreeIterator } from './tree';

export default class Control {
  public redraw: () => void;
  public readonly options: types.Options;

  private status: types.Status;
  private result: types.Result;

  private tree: Tree;
  private line: TreeIterator;

  private _api: Api;

  constructor(options: types.Options, redraw: () => void) {
    this.options = options;
    this.status = 'new';
    this.result = 'incomplete';

    this.tree = new Tree(this.options.lines);
    this.line = this.tree.iterator();

    if (this.options.mode === 'review') {
      // preload line
      while (true) {
        let moves = this.line.peek();
        if (moves.length === 0) {
          break;
        }
        this.line.push(moves[0]);
      }
      this.line.first();
    }

    this.redraw = redraw;
  }

  get api(): Api {
    return this._api;
  }

  set api(api: Api) {
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

  private update() {
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
            events: { after: (orig: Key, dest: Key) => this.validate(orig, dest) }
          }
        }
      )
    );
  }

  private validate(orig: Key, dest: Key) {
    console.log(`orig ${orig} dest ${dest}`);
    // TODO: promotions

    const [mainline, ...variations] = this.line.peek();
    if (mainline !== undefined &&
      orig === mainline.orig && dest === mainline.dest) {
      this.status = 'mainline';

      // apply user move
      this.line.push(mainline);

      const continuations = this.line.peek();
      if (continuations.length > 0) {
        // apply continuation
        this.line.push(continuations[0]);
      }

      if (this.line.peek().length === 0) {
        // puzzle completed
        this.setResult('success');
      }
    } else if (variations !== undefined &&
      variations.some((m: types.Move) => orig === m.orig && dest === m.dest)) {
      this.status = 'variation';
    } else {
      this.setResult('failure');
      this.status = 'mistake';
    }

    // update board
    setTimeout(
      () => {
        this.update();
        this.redraw();
      },
      500
    );
  }
}
