import { h } from 'snabbdom';
import { VNode } from 'snabbdom/vnode';

import { Chessground } from 'chessground';

import Control from './control';
import * as types from './types';

export default class View {
  private ctrl: Control;

  constructor(ctrl: Control) {
    this.ctrl = ctrl;
  }

  public render(): VNode {
    return h('div#chessdrill', [
      this.renderBoard(),
      this.renderControl(),
    ]);
  }

  private renderBoard(): VNode {
    return h('section.blue.merida', [
      h('div.cg-wrap', {
        hook: {
          insert: (vnode: VNode) => this.mkBoard(vnode),
        }
      })
    ]);
  }

  private renderControl(): VNode {
    return h('div.cd-ctrl', [
      this.renderNavigation(),
      this.renderStatus()
    ]);
  }

  private renderStatus(): VNode {
    let icon: string;
    let message: string;
    switch (this.ctrl.getStatus()) {
      case 'new':
        icon = '?';
        message = 'choose the best move for white';
        break;
      case 'mainline':
        icon = '✓';
        message = 'mainline';
        break;
      case 'variation':
        icon = '!';
        message = 'variation';
        break;
      case 'mistake':
        icon = '✗';
        message = 'mistake';
        break;
    };
    if (this.ctrl.getResult() !== 'incomplete') {
      message = this.ctrl.getResult();
    }
    return h('div.status', [
      h('div.icon', icon),
      h('div.message', [
        h('strong', message)
      ])
    ]);
  }

  private renderNavigation(): VNode {
    return h('div.nav', {
      hook: {
        insert: (vnode: VNode) => this.bindNavigationButton(vnode)
      }
    }, [
      h('div.navbuttons', [
        this.renderNavigationButton('<<', 'first'),
        this.renderNavigationButton('<', 'prev'),
        this.renderNavigationButton('>', 'next'),
        this.renderNavigationButton('>>', 'last')
      ])
    ]);
  }

  private renderNavigationButton(icon: string, position: types.Position): VNode {
    return h('button.nav', {
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
