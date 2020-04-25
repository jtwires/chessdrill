import { Chess, ChessInstance } from 'chess.js';

import * as types from './types';

class Node {
  fen: types.FEN;
  parent: Node | undefined;
  children: Map<string, Node>;

  constructor(fen: types.FEN) {
    this.fen = fen;
    this.parent = undefined;
    this.children = new Map<string, Node>();
  }

  key(move: types.Move): string {
    return JSON.stringify(move);
  }

  find(move: types.Move): Node | undefined {
    return this.children.get(this.key(move));
  }

  push(move: types.Move, fen: types.FEN): Node {
    const node = new Node(fen);
    this.children.set(this.key(move), node);
    return node;
  }

  moves(): types.Move[] {
    return Array.from(this.children.keys()).map(m => JSON.parse(m));
  }
}

export class Tree implements Iterable<types.Move> {
  private root: Node;

  constructor(variations: string[]) {
    variations.forEach(
      variation => {
        const line = new Chess();
        const res = line.load_pgn(variation);
        if (!res) {
          throw new Error('invalid pgn');
        }

        const moves: types.Move[] = [];
        while (true) {
          const move = line.undo();
          if (!move) {
            break;
          }
          moves.push({ orig: move.from, dest: move.to });
        }
        moves.reverse();

        if (this.root === undefined) {
          this.root = new Node(line.fen());
        }
        if (this.root.fen != line.fen()) {
          throw new Error('invalid variation');
        }

        let node = this.root;
        for (let move of moves) {
          line.move({ from: move.orig, to: move.dest });
          let child = node.find(move);
          if (!child) {
            child = node.push(move, line.fen());
          }
          node = child;
        }
      }
    );
    if (this.root === undefined) {
      this.root = new Node(new Chess().fen());
    }
  }

  public [Symbol.iterator](): IterableIterator<types.Move> {
    return this.iterator();
  }

  public iterator(): TreeIterator {
    return new TreeIterator(this.root);
  }
}

class Link {
  node: Node;
  prev: Link | undefined;
  next: Link | undefined;
  move: types.Move | undefined;

  constructor(node: Node, move?: types.Move) {
    this.node = node;
    this.move = move;
  }
}

export class TreeIterator implements IterableIterator<types.Move> {
  private root: Node;
  private link: Link;
  private line: ChessInstance;

  constructor(root: Node) {
    this.root = root;
    this.link = new Link(this.root);
    this.line = new Chess(this.root.fen);
  }

  public [Symbol.iterator](): TreeIterator {
    return this;
  }

  public next(): IteratorResult<types.Move> {
    if (!this.link.next) {
      return {
        value: undefined,
        done: true
      }
    }
    this.link = this.link.next;
    this.line.move({ from: this.link.move!.orig, to: this.link.move!.dest });
    return {
      value: this.link.move!,
      done: false
    };
  }

  public first() {
    while (this.link.prev) {
      this.link = this.link.prev;
      this.line.undo();
    }
  }

  public last() {
    while (this.link.next) {
      this.link = this.link.next;
      this.line.move({ from: this.link.move!.orig, to: this.link.move!.dest });
    }
  }

  public prev() {
    if (this.link.prev) {
      this.link = this.link.prev;
      this.line.undo();
    }
  }

  public peek(): types.Move[] {
    return this.link.node.moves();
  }

  public push(move: types.Move) {
    const node = this.link.node.find(move);
    if (!node) {
      throw new Error('invalid move');
    }
    const link = new Link(node, move);
    this.link.next = link;
    link.prev = this.link;
    this.link = link;
    this.line.move({ from: move.orig, to: move.dest });
  }

  public fen(): types.FEN {
    return this.link.node.fen;
  }

  public color(): types.Color {
    return this.line.turn() == 'w' ? 'white' : 'black';
  }

  public check(): boolean {
    return this.line.in_check();
  }

  public destinations(): { [orig: string]: [types.Square] } {
    const dsts = {};
    this.line.SQUARES.forEach(
      (s: string) => {
        const ms = this.line.moves({ square: s, verbose: true });
        if (ms.length) {
          dsts[s] = ms.map(m => m.to);
        }
      }
    );
    return dsts;
  }

  public lastmove(): types.Move | undefined {
    return this.link.move;
  }

  public history(): types.Move[] {
    return this.line
      .history({ verbose: true })
      .map(h => ({ orig: h.from, dest: h.to }));
  }

  public mainline(): types.Move[] {
    const line: types.Move[] = [];
    let node: Node | undefined = this.root;
    while (node !== undefined) {
      const moves = node.moves();
      if (moves.length === 0) {
        break;
      }
      const move = moves[0];
      line.push(move);
      node = node.find(move);
    }
    return line;
  }
}
