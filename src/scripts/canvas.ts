import * as jQuery from 'jquery';
import * as _ from 'lodash';
import * as $ from 'backbone';
import * as joint from 'jointjs/dist/joint.js';

import { Surrounding } from 'model';

export class JointComponent {
  private graph: joint.dia.Graph = new joint.dia.Graph();
  private paper: joint.dia.Paper;

  constructor(private id: String, private surr: Surrounding) {
    this.paper =  new joint.dia.Paper({
        el: document.getElementById(id),
        model: graph,
        width: 600,
        height: 100,
        gridSize: 1
    });

    surr.subscribeOperatorAdded(this.addOperator);
  }

  private addOperator(op: Operator) {
    const rect = new joint.shapes.standard.Rectangle();
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



/*
const rect2 = rect.clone();
rect2.translate(300, 0);
rect2.attr('label/text', 'World!');
rect2.addTo(graph);

const link = new joint.shapes.standard.Link();
link.source(rect);
link.target(rect2);
link.addTo(graph);
*/
