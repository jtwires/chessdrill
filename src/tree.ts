import { Chess, ChessInstance, ShortMove, PieceType } from 'chess.js';

import * as types from './types';

type PromotedRole = Exclude<types.Role, 'pawn'> | undefined;

type PromotedPieceType = Exclude<PieceType, 'p'> | undefined;

const toPromotedRole = (piece: PromotedPieceType): PromotedRole => {
  switch (piece) {
    case 'k':
      return 'king';
    case 'q':
      return 'queen';
    case 'r':
      return 'rook';
    case 'b':
      return 'bishop';
    case 'n':
      return 'knight';
    case undefined:
      return undefined;
  }
}

const toPromotedPieceType = (role: PromotedRole): PromotedPieceType => {
  switch (role) {
    case 'king':
      return 'k';
    case 'queen':
      return 'q';
    case 'rook':
      return 'r';
    case 'bishop':
      return 'b';
    case 'knight':
      return 'n';
    case undefined:
      return undefined;
  }
}

const toMove = (m: ShortMove) => {
  return { orig: m.from, dest: m.to, promotion: toPromotedRole(m.promotion) };
}

const toShortMove = (m: types.Move) => {
  return { from: m.orig, to: m.dest, promotion: toPromotedPieceType(m.promotion) };
};

class Node {
  readonly fen: types.FEN;
  readonly annotation: string | undefined;
  readonly children: Map<string, Node>;

  constructor(fen: types.FEN, annotation?: string) {
    this.fen = fen;
    this.annotation = annotation;
    // Map preserves insertion order
    this.children = new Map<string, Node>();
  }

  key(move: types.Move): string {
    return JSON.stringify(move);
  }

  find(move: types.Move): Node | undefined {
    return this.children.get(this.key(move));
  }

  push(move: types.Move, fen: types.FEN, annotation?: string): Node {
    const node = new Node(fen, annotation);
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

        const moves: ShortMove[] = [];
        while (true) {
          const move = line.undo();
          if (!move) {
            break;
          }
          moves.push(move);
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
          line.move(move);
          let child = node.find(toMove(move));
          if (!child) {
            child = node.push(toMove(move), line.fen(), line.annotation());
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
    this.line.move(toShortMove(this.link.move!));
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
      this.line.move(toShortMove(this.link.move!));
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
    this.line.move(toShortMove(move));
  }

  public fen(): types.FEN {
    return this.link.node.fen;
  }

  public annotation(): string | undefined {
    return this.link.node.annotation;
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
