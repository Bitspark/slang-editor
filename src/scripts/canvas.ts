import {dia, shapes} from 'jointjs';

import {Operator, Surrounding} from './model';

export class JointComponent {
  private graph: dia.Graph = new dia.Graph();
  private paper: dia.Paper;

  constructor(private id: string, private surr: Surrounding) {
    this.paper =  new dia.Paper({
        el: document.getElementById(id),
        model: this.graph,
        width: 600,
        height: 100,
        gridSize: 1
    });

    surr.subscribeOperatorAdded(this.addOperator);
  }

  private addOperator(op: Operator) {
    const rect = new shapes.standard.Rectangle();
    rect.position(100, 30);
    rect.resize(100, 40);
    rect.attr({
        body: {
            fill: 'blue'
        },
        label: {
            text: 'Hello',
            fill: 'white'
        }
    });
    rect.addTo(this.graph);
  }

}
