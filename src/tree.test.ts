import { Chess } from 'chess.js';

import * as types from './types';
import { Tree } from './tree';

const giuoco_piano = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *';

const italian = [
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 *',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. e5 *',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 *'
];

const scandi = '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 *';

test('empty', () => {
  expect(Array.from(new Tree([]))).toHaveLength(0);
});

test('invalid', () => {
  expect(() => {
    new Tree(['1. Ke2']);
  }).toThrow('invalid pgn');

  const e1 = '1. e4 e5';
  const d1 = `[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1"]

1... d5 *`;
  expect(() => {
    new Tree([e1, d1]);
  }).toThrow('invalid variation');

  const tree = new Tree([giuoco_piano]);
  const line = tree.iterator();

  expect(() => {
    line.push({ orig: 'd2', dest: 'd4' });
  }).toThrow();
});

test('single', () => {
  const tree = new Tree([giuoco_piano]);
  const line = tree.iterator();
  expect(Array.from(line)).toHaveLength(0);

  const chess = new Chess();
  const moves: types.Move[] = [
    { orig: 'e2', dest: 'e4' },
    { orig: 'e7', dest: 'e5' },
    { orig: 'g1', dest: 'f3' },
    { orig: 'b8', dest: 'c6' },
    { orig: 'f1', dest: 'c4' },
    { orig: 'f8', dest: 'c5' }
  ];
  moves.forEach(move => {
    expect(line.peek()).toEqual([move]);

    line.push(move);
    chess.move({ from: move.orig, to: move.dest });

    expect(line.lastmove()).toEqual(move);

    const history = chess
      .history({ verbose: true })
      .map(m => ({ orig: m.from, dest: m.to }));
    expect(line.history()).toEqual(history);
    expect(line.color()).toBe(chess.turn() == 'w' ? 'white' : 'black');
    expect(line.fen()).toEqual(chess.fen());
  });
});

test('multiple', () => {
  const tree = new Tree(italian);
  const line = tree.iterator();

  const chess = new Chess();
  const moves = {
    'e2-e4': {
      'e7-e5': {
        'g1-f3': {
          'b8-c6': {
            'f1-c4': {
              'f8-c5': {
                'c2-c3': {
                  'g8-f6': {
                    'd2-d4': {
                      'e5-d4': {
                        'c3-d4': true,
                        'e4-e5': true
                      }
                    },
                    'd2-d3': true,
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const mkmove = (move: string): types.Move => {
    const tokens = move.split('-');
    return {
      orig: (tokens[0] as types.Square),
      dest: (tokens[1] as types.Square)
    };
  };

  const validate = branch => {
    const moves = Object.keys(branch).map(mkmove);
    expect(line.peek()).toEqual(moves);

    moves.forEach(move => {
      line.push(move);
      chess.move({ from: move.orig, to: move.dest });

      expect(line.lastmove()).toEqual(move);

      const history = chess
        .history({ verbose: true })
        .map(m => ({ orig: m.from, dest: m.to }));
      expect(line.history()).toEqual(history);
      expect(line.color()).toBe(chess.turn() == 'w' ? 'white' : 'black');
      expect(line.fen()).toEqual(chess.fen());

      const path = branch[`${move.orig}-${move.dest}`];
      if (path !== true) {
        validate(path);
      }

      line.prev();
      chess.undo();
    });
  };

  validate(moves);
});

test('navigation', () => {
  const tree = new Tree([scandi]);
  const line = tree.iterator();
  const moves: types.Move[] = [
    { orig: 'e2', dest: 'e4' },
    { orig: 'd7', dest: 'd5' },
    { orig: 'e4', dest: 'd5' },
    { orig: 'd8', dest: 'd5' },
    { orig: 'b1', dest: 'c3' },
    { orig: 'd5', dest: 'd8' }
  ];
  expect(line.mainline()).toEqual(moves);

  while (true) {
    const continuations = line.peek();
    if (continuations.length === 0) {
      break;
    }
    line.push(continuations[0]);
  }

  expect(line.lastmove()).toEqual(moves[moves.length - 1]);

  line.first();
  expect(line.lastmove()).toBeUndefined();

  const chess = new Chess();
  for (let move of moves) {
    line.next();
    expect(line.lastmove()).toEqual(move);
    chess.move({ from: move.orig, to: move.dest });
    expect(line.fen()).toEqual(chess.fen());
  }

  const history = chess
    .history({ verbose: true })
    .map(m => ({ orig: m.from, dest: m.to }));
  expect(line.history()).toEqual(history);

  while (true) {
    let move = chess.undo();
    line.prev();
    expect(line.fen()).toBe(chess.fen());
    if (!move) {
      break;
    }
  }
});
