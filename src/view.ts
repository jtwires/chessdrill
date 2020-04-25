import { h } from 'snabbdom';
import { VNode } from 'snabbdom/vnode';

import { Chessground } from 'chessground';

import Control from './control';
import * as types from './types';

export default class View {
  private ctrl: Control;
  private color: types.Color;

  constructor(ctrl: Control) {
    this.ctrl = ctrl;
    this.color = this.ctrl.getColor();
  }

  public render(): VNode {
    return h('div#chessdrill', [
      this.renderBoard(),
      this.renderControl(),
    ]);
  }

  private renderBoard(): VNode {
    return h('section.brown.merida', [
      h('div.cg-wrap', {
        hook: {
          insert: (vnode: VNode) => this.mkBoard(vnode),
        }
      })
    ]);
  }

  private renderControl(): VNode {
    return h('div.cd-control', [
      this.renderNavigation(),
      this.renderDescription()
    ]);
  }

  private renderNavigation(): VNode {
    return h('div.cd-navigate', {
      hook: {
        insert: (vnode: VNode) => this.bindNavigationButton(vnode)
      }
    }, [
      h('div.cd-navigate-menu', [
        this.renderNavigationButton('<<', 'first'),
        this.renderNavigationButton('<', 'prev'),
        this.renderNavigationButton('>', 'next'),
        this.renderNavigationButton('>>', 'last')
      ])
    ]);
  }

  private renderNavigationButton(icon: string, position: types.Position): VNode {
    return h('button.cd-navigate-button', {
      attrs: {
        'data-position': position,
        'data-icon': icon
      }
    });
  }

  private bindNavigationButton(vnode: VNode) {
    const element = (vnode.elm as HTMLElement);
    for (const eventType of ['touchstart', 'mousedown']) {
      element.addEventListener(
        eventType,
        event => this.handleNavigationEvent(event)
      );
    }
  }

  private handleNavigationEvent(event: Event) {
    const position = this.getNavigationPosition(event);
    if (position) {
      event.preventDefault();
      this.ctrl.navigate(position);
      this.ctrl.redraw();
    }
  }

  private getNavigationPosition(event: Event): types.Position | undefined {
    const target = event.target as Element;
    const position = target.getAttribute('data-position') ||
      (target.parentNode as Element).getAttribute('data-position');
    return position as types.Position;
  }

  private renderDescription(): VNode {
    let description: VNode;
    switch (this.ctrl.options.mode) {
      case 'play':
        description = this.renderInstructions();
        break;
      case 'review':
        description = this.renderAnnotations();
        break;
    }
    return h('div.cd-description', description);
  }

  private renderInstructions(): VNode {
    let icon: VNode;
    let message: string;
    let instructions: string;
    switch (this.ctrl.getStatus()) {
      case 'new':
        icon = h('div.cd-piece', [h(`piece.king.${this.color}`)]);
        message = 'Your turn';
        instructions = `Find the best move for ${this.color}`;
        break;
      case 'mainline':
        icon = h('div.cd-icon.correct', '✓');
        message = 'Best move!';
        instructions = 'Keep going...';
        break;
      case 'variation':
        icon = h('div.cd-icon.correct', '?');
        message = 'Good move';
        instructions = 'What other moves are good?';
        break;
      case 'mistake':
        icon = h('div.cd-icon.incorrect', '✗');
        message = 'Puzzle failed';
        instructions = 'But you can keep trying';
        break;
    };
    switch (this.ctrl.getResult()) {
      case 'incomplete':
        break;
      case 'success':
        message = 'Puzzle completed!';
        instructions = '';
        break;
      case 'failure':
        message = 'Puzzle failed';
        instructions = '';
        break;
    }
    return h('div.cd-instructions', [
      icon,
      h('div.cd-message', [
        h('strong', message),
        h('em', instructions)
      ])
    ]);
  }

  private renderAnnotations(): VNode {
    return h('div.cd-annotations', [
      h('div.cd-piece', [h(`piece.king.${this.color}`)]),
      h('div.cd-message', [
        h('strong', 'Giuoco Piano'),
      ])
    ]);
  }

  private mkBoard(vnode: VNode) {
    const element = vnode.elm as HTMLElement;
    element.className = 'cg-wrap';
    this.ctrl.api = Chessground(
      element,
      {
        autoCastle: true,
        draggable: {
          showGhost: true
        },
        animation: {
          enabled: true,
          duration: 500,
        },
        highlight: {
          lastMove: true,
          check: true
        }
      }
    );
  }
}
